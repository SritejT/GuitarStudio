/**
 * Import function triggers from their respective submodules:
 *
 * const {onCall} = require("firebase-functions/v2/https");
 * const {onDocumentWritten} = require("firebase-functions/v2/firestore");
 *
 * See a full list of supported triggers at https://firebase.google.com/docs/functions
 */

const { onRequest } = require('firebase-functions/v2/https');
const { defineString } = require('firebase-functions/params');
const OpenAI = require('openai');

const openaiApiKey = defineString('OPENAI_API_KEY');

const openai = new OpenAI({
  apiKey: openaiApiKey.value()
});

exports.analyzeAudio = onRequest({
  cors: [
    "http://localhost:5173",
    "http://localhost:3000",
    "https://guitarstudio-bbd18.web.app",
    "https://guitarstudio-bbd18.firebaseapp.com"
  ],
  maxInstances: 10
}, async (request, response) => {
  try {
    // Set CORS headers
    response.set('Access-Control-Allow-Origin', '*');
    response.set('Access-Control-Allow-Methods', 'POST, OPTIONS');
    response.set('Access-Control-Allow-Headers', 'Content-Type');

    // Handle preflight request
    if (request.method === 'OPTIONS') {
      response.status(204).send('');
      return;
    }

    console.log('Request body:', request.body);
    const audioData = request.body?.audioData;
    
    if (!audioData) {
      console.error('No audio data in request body');
      return response.status(400).json({ error: 'No audio data provided' });
    }

    console.log('Attempting OpenAI API call...');
    const completion = await openai.chat.completions.create({
      model: "gpt-4o-audio-preview-2024-12-17",
      modalities: ["text"],
      messages: [
        {
          role: "system",
          content: "You are an expert guitar teacher. Analyze the transcribed audio of a guitar performance and provide constructive feedback. If you hear clapping or non-guitar sounds, please acknowledge that in your response."
        },
        {
          role: "user",
          content: [
            {type: "input_audio", input_audio: {data: audioData, format: "wav"}}
          ]
        }
      ]
    });

    const feedback = completion.choices[0]?.message?.content;
    
    if (!feedback) {
      console.error('No feedback received from OpenAI');
      return response.status(500).json({ error: 'No feedback received from OpenAI' });
    }

    console.log('Successfully received feedback:', feedback);
    response.json({ feedback });
  } catch (error) {
    console.error('Error analyzing audio:', error);
    response.status(500).json({ error: error.message || 'Failed to analyze audio' });
  }
});
