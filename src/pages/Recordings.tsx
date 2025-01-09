import { useState, useEffect, useRef } from 'react';
import { getAuth } from 'firebase/auth';
import { getFirestore, collection, addDoc, query, where, orderBy, getDocs, updateDoc, doc } from 'firebase/firestore';
import { getStorage, ref, uploadBytes, getDownloadURL, getBytes } from 'firebase/storage';
import { app } from '../firebase/config';
import OpenAI from 'openai';
import { IMediaRecorder, MediaRecorder, register } from 'extendable-media-recorder';
import { connect } from 'extendable-media-recorder-wav-encoder';
import '../styles/Recordings.css';

const Recordings = () => {
  const [isRecording, setIsRecording] = useState(false);
  const [recordings, setRecordings] = useState<any[]>([]);
  const [currentRecording, setCurrentRecording] = useState<string | null>(null);
  const [showNameModal, setShowNameModal] = useState(false);
  const [recordingName, setRecordingName] = useState('');
  const [pendingRecording, setPendingRecording] = useState<{ blob: Blob, url: string } | null>(null);
  const [isAnalyzing, setIsAnalyzing] = useState<{ [key: string]: boolean }>({});
  const [audioUrls, setAudioUrls] = useState<{ [key: string]: string }>({});
  const mediaRecorderRef = useRef<IMediaRecorder | null>(null);
  const auth = getAuth(app);
  const db = getFirestore(app);
  const storage = getStorage(app);

  const openai = new OpenAI({
    apiKey: import.meta.env.VITE_OPENAI_API_KEY || '',
    dangerouslyAllowBrowser: true
  });

  useEffect(() => {
    if (!import.meta.env.VITE_OPENAI_API_KEY) {
      console.error('OpenAI API key is not configured');
    }
  }, []);

  useEffect(() => {
    // Initialize the WAV encoder
    const initializeRecorder = async () => {
      await register(await connect());
    };
    initializeRecorder().catch(console.error);
    loadRecordings();
  }, []);

  useEffect(() => {
    // Load audio URLs for all recordings
    const loadAudioUrls = async () => {
      const urls: { [key: string]: string } = {};
      for (const recording of recordings) {
        if (!audioUrls[recording.id]) {
          try {
            const url = await createAudioUrl(recording.storagePath);
            urls[recording.id] = url;
          } catch (error) {
            console.error('Error loading audio URL:', error);
          }
        }
      }
      setAudioUrls(prev => ({ ...prev, ...urls }));
    };

    loadAudioUrls();

    // Cleanup function to revoke object URLs
    return () => {
      Object.values(audioUrls).forEach(url => {
        if (url) URL.revokeObjectURL(url);
      });
    };
  }, [recordings]);

  const loadRecordings = async () => {
    if (!auth.currentUser) return;

    try {
      const recordingsRef = collection(db, 'recordings');
      const q = query(
        recordingsRef,
        where('userId', '==', auth.currentUser.uid),
        orderBy('timestamp', 'desc')
      );

      const querySnapshot = await getDocs(q);
      const recordingsList = querySnapshot.docs.map(doc => {
        const data = doc.data();
        console.log('Recording data:', { id: doc.id, ...data }); // Debug log
        return {
          id: doc.id,
          ...data
        };
      });
      
      setRecordings(recordingsList);
    } catch (error) {
      console.error('Error loading recordings:', error);
    }
  };

  const analyzeRecording = async (recordingId: string, storagePath: string) => {
    if (!storagePath) {
      console.error('Invalid storage path');
      return;
    }

    setIsAnalyzing(prev => ({ ...prev, [recordingId]: true }));

    try {
      // Get the audio bytes directly from Firebase Storage
      const audioRef = ref(storage, storagePath);
      const audioBytes = await getBytes(audioRef);
      
      // Convert audio bytes to base64 string
      const base64str = btoa(
        new Uint8Array(audioBytes).reduce((data, byte) => data + String.fromCharCode(byte), '')
      );
      
      // Then, get feedback using GPT-4
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
                    {type: "input_audio", input_audio: {data: base64str, format: "wav"}}
                ]
            }
        ]
    });

      console.log('GPT-4 feedback received:', completion);

      // Update the recording in Firestore with the feedback
      const recordingRef = doc(db, 'recordings', recordingId);
      await updateDoc(recordingRef, {
        feedback: completion.choices[0].message.content
      });

      // Reload recordings to show the feedback
      loadRecordings();
    } catch (error: any) {
      console.error('Error analyzing recording:', error, error?.stack);
      alert('Failed to analyze recording. Please try again.');
    } finally {
      setIsAnalyzing(prev => ({ ...prev, [recordingId]: false }));
    }
  };

  const saveRecording = async (audioBlob: Blob, audioUrl: string) => {
    setCurrentRecording(audioUrl);
    setPendingRecording({ blob: audioBlob, url: audioUrl });
    setShowNameModal(true);
  };

  const handleSaveWithName = async () => {
    if (!pendingRecording || !auth.currentUser) return;

    const finalName = recordingName.trim() || `Recording ${new Date().toLocaleString()}`;
    const sanitizedName = finalName.replace(/[^a-zA-Z0-9]/g, '_'); // Sanitize the filename
    
    try {
      // Upload to Firebase Storage with sanitized name
      const storagePath = `recordings/${auth.currentUser.uid}/${Date.now()}_${sanitizedName}.wav`;
      console.log('Saving recording with path:', storagePath); // Debug log
      const storageRef = ref(storage, storagePath);
      await uploadBytes(storageRef, pendingRecording.blob);

      // Save metadata to Firestore
      const recordingsRef = collection(db, 'recordings');
      const recordingData = {
        userId: auth.currentUser.uid,
        storagePath: storagePath,
        timestamp: new Date().toISOString(),
        name: finalName
      };

      await addDoc(recordingsRef, recordingData);
      console.log('Recording saved successfully with data:', recordingData); // Debug log

      // Reset states
      setShowNameModal(false);
      setRecordingName('');
      setPendingRecording(null);
      loadRecordings();
    } catch (error) {
      console.error('Error saving recording:', error);
    }
  };

  const createAudioUrl = async (storagePath: string): Promise<string> => {
    if (!storagePath || typeof storagePath !== 'string') {
      console.error('Invalid storage path:', storagePath);
      return '';
    }

    try {
      console.log('Creating audio URL for path:', storagePath); // Debug log
      const audioRef = ref(storage, storagePath);
      console.log('Storage reference created:', audioRef); // Debug log
      const downloadUrl = await getDownloadURL(audioRef);
      console.log('Download URL obtained:', downloadUrl); // Debug log
      return downloadUrl;
    } catch (error) {
      console.error('Error creating audio URL:', error);
      return '';
    }
  };

  const startRecording = async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      const mediaRecorder = new MediaRecorder(stream, {
        mimeType: 'audio/wav'
      });
      const audioChunks: BlobPart[] = [];

      mediaRecorder.ondataavailable = (event) => {
        audioChunks.push(event.data);
      };

      mediaRecorder.onstop = async () => {
        const audioBlob = new Blob(audioChunks, { type: 'audio/wav' });
        const audioUrl = URL.createObjectURL(audioBlob);
        await saveRecording(audioBlob, audioUrl);
      };

      mediaRecorderRef.current = mediaRecorder;
      mediaRecorder.start();
      setIsRecording(true);
    } catch (error) {
      console.error('Error accessing microphone:', error);
    }
  };

  const stopRecording = () => {
    if (mediaRecorderRef.current && isRecording) {
      mediaRecorderRef.current.stop();
      setIsRecording(false);
      // Get the stream from the MediaRecorder instance
      const tracks = (mediaRecorderRef.current as any).stream?.getTracks();
      if (tracks) {
        tracks.forEach((track: MediaStreamTrack) => track.stop());
      }
    }
  };

  if (!auth.currentUser) {
    return <div>Please log in to access recordings.</div>;
  }

  return (
    <div className="recordings-container">
      <div className="recordings-content">
        <h2>Your Recordings</h2>
        
        <div className="recording-controls">
          <button 
            onClick={isRecording ? stopRecording : startRecording}
            className={`record-button ${isRecording ? 'recording' : ''}`}
          >
            {isRecording ? 'Stop Recording' : 'Start Recording'}
          </button>
        </div>

        {showNameModal && (
          <div className="modal-overlay">
            <div className="modal-content">
              <h3>Name Your Recording</h3>
              <input
                type="text"
                value={recordingName}
                onChange={(e) => setRecordingName(e.target.value)}
                placeholder="Enter recording name"
                className="recording-name-input"
              />
              <div className="modal-buttons">
                <button onClick={handleSaveWithName} className="save-button">
                  Save
                </button>
              </div>
            </div>
          </div>
        )}

        {currentRecording && !showNameModal && (
          <div className="current-recording">
            <h3>Current Recording</h3>
            <audio controls src={currentRecording} />
          </div>
        )}

        <div className="recordings-list">
          <h3>Previous Recordings</h3>
          {recordings.map((recording) => (
            <div key={recording.id} className="recording-item">
              <div className="recording-info">
                <span className="recording-name">{recording.name}</span>
                <span className="recording-date">
                  {new Date(recording.timestamp).toLocaleString()}
                </span>
              </div>
              {audioUrls[recording.id] && <audio controls src={audioUrls[recording.id]} />}
              <div className="recording-actions">
                <button
                  onClick={() => analyzeRecording(recording.id, recording.storagePath)}
                  className={`analyze-button ${isAnalyzing[recording.id] ? 'analyzing' : ''}`}
                  disabled={isAnalyzing[recording.id]}
                >
                  {isAnalyzing[recording.id] ? 'Analyzing...' : 'Get Feedback'}
                </button>
              </div>
              {recording.feedback && (
                <div className="feedback-container">
                  <h4>AI Feedback:</h4>
                  <p>{recording.feedback}</p>
                </div>
              )}
            </div>
          ))}
        </div>
      </div>
    </div>
  );
};

export default Recordings; 