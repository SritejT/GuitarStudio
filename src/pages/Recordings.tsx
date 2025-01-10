import { useState, useEffect } from 'react';
import { getAuth } from 'firebase/auth';
import OpenAI from 'openai';
import { register } from 'extendable-media-recorder';
import { connect } from 'extendable-media-recorder-wav-encoder';
import RecordingItem from '../components/recordings/RecordingItem';
import RecordingModal from '../components/recordings/RecordingModal';
import RecordingControls from '../components/recordings/RecordingControls';
import useRecorder from '../hooks/useRecorder';
import { recordingService, Recording } from '../services/recordingService';
import '../styles/Recordings.css';

const Recordings = () => {
  const [recordings, setRecordings] = useState<Recording[]>([]);
  const [currentRecording, setCurrentRecording] = useState<string | null>(null);
  const [showNameModal, setShowNameModal] = useState(false);
  const [recordingName, setRecordingName] = useState('');
  const [pendingRecording, setPendingRecording] = useState<{ blob: Blob, url: string } | null>(null);
  const [isAnalyzing, setIsAnalyzing] = useState<{ [key: string]: boolean }>({});
  const [audioUrls, setAudioUrls] = useState<{ [key: string]: string }>({});
  
  const auth = getAuth();
  const openai = new OpenAI({
    apiKey: import.meta.env.VITE_OPENAI_API_KEY || '',
    dangerouslyAllowBrowser: true
  });

  useEffect(() => {
    document.title = 'GuitarStudio | Recordings';
    return () => {
      document.title = 'GuitarStudio';
    };
  }, []);

  const handleRecordingComplete = (blob: Blob, url: string) => {
    setCurrentRecording(url);
    setPendingRecording({ blob, url });
    setShowNameModal(true);
  };

  const { isRecording, startRecording, stopRecording } = useRecorder(handleRecordingComplete);

  useEffect(() => {
    if (!import.meta.env.VITE_OPENAI_API_KEY) {
      console.error('OpenAI API key is not configured');
    }
  }, []);

  useEffect(() => {
    const initializeRecorder = async () => {
      await register(await connect());
    };
    initializeRecorder().catch(console.error);
    loadRecordings();
  }, []);

  useEffect(() => {
    const loadAudioUrls = async () => {
      const urls: { [key: string]: string } = {};
      for (const recording of recordings) {
        if (!audioUrls[recording.id]) {
          try {
            const url = await recordingService.getAudioUrl(recording.storagePath);
            urls[recording.id] = url;
          } catch (error) {
            console.error('Error loading audio URL:', error);
          }
        }
      }
      setAudioUrls(prev => ({ ...prev, ...urls }));
    };

    loadAudioUrls();

    return () => {
      Object.values(audioUrls).forEach(url => {
        if (url) URL.revokeObjectURL(url);
      });
    };
  }, [recordings]);

  const loadRecordings = async () => {
    if (!auth.currentUser) return;
    try {
      const recordingsList = await recordingService.loadRecordings(auth.currentUser.uid);
      setRecordings(recordingsList);
    } catch (error) {
      console.error('Error loading recordings:', error);
    }
  };

  const handleSaveRecording = async () => {
    if (!pendingRecording || !auth.currentUser) return;

    const finalName = recordingName.trim() || `Recording ${new Date().toLocaleString()}`;
    
    try {
      await recordingService.saveRecording(
        auth.currentUser.uid,
        pendingRecording.blob,
        finalName
      );

      setShowNameModal(false);
      setRecordingName('');
      setPendingRecording(null);
      loadRecordings();
    } catch (error) {
      console.error('Error saving recording:', error);
    }
  };

  const handleAnalyzeRecording = async (recordingId: string, storagePath: string) => {
    setIsAnalyzing(prev => ({ ...prev, [recordingId]: true }));

    try {
      const audioBytes = await recordingService.getAudioBytes(storagePath);
      const base64str = btoa(
        new Uint8Array(audioBytes).reduce((data, byte) => data + String.fromCharCode(byte), '')
      );
      
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

      const feedback = completion.choices[0]?.message?.content;
      if (!feedback) {
        throw new Error('No feedback received from OpenAI');
      }

      await recordingService.updateFeedback(recordingId, feedback);
      loadRecordings();
    } catch (error) {
      console.error('Error analyzing recording:', error);
      alert('Failed to analyze recording. Please try again.');
    } finally {
      setIsAnalyzing(prev => ({ ...prev, [recordingId]: false }));
    }
  };

  const handleDeleteRecording = async (recordingId: string, storagePath: string) => {
    if (!window.confirm('Are you sure you want to delete this recording?')) return;

    try {
      await recordingService.deleteRecording(recordingId, storagePath);
      setAudioUrls(prev => {
        const newUrls = { ...prev };
        delete newUrls[recordingId];
        return newUrls;
      });
      loadRecordings();
    } catch (error) {
      console.error('Error deleting recording:', error);
      alert('Failed to delete recording. Please try again.');
    }
  };

  if (!auth.currentUser) {
    return <div>Please log in to access recordings.</div>;
  }

  return (
    <div className="recordings-container">
      <div className="recordings-content">
        <h2>Your Recordings</h2>
        
        <RecordingControls
          isRecording={isRecording}
          onRecordingToggle={isRecording ? stopRecording : startRecording}
        />

        {showNameModal && (
          <RecordingModal
            recordingName={recordingName}
            onNameChange={setRecordingName}
            onSave={handleSaveRecording}
          />
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
            <RecordingItem
              key={recording.id}
              recording={recording}
              audioUrl={audioUrls[recording.id]}
              isAnalyzing={!!isAnalyzing[recording.id]}
              onAnalyze={handleAnalyzeRecording}
              onDelete={handleDeleteRecording}
            />
          ))}
        </div>
      </div>
    </div>
  );
};

export default Recordings; 