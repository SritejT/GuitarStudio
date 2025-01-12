import { useState, useEffect } from 'react';
import { getAuth } from 'firebase/auth';
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
  const [isLoading, setIsLoading] = useState(true);
  
  const auth = getAuth();

  useEffect(() => {
    document.title = 'GuitarStudio | Recordings';
    return () => {
      document.title = 'GuitarStudio';
    };
  }, []);

  const loadRecordings = async () => {
    if (!auth.currentUser) return;
    try {
      setIsLoading(true);
      const recordingsList = await recordingService.loadRecordings(auth.currentUser.uid);
      setRecordings(recordingsList);
    } catch (error) {
      console.error('Error loading recordings:', error);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    const initializeRecorder = async () => {
      await register(await connect());
    };
    initializeRecorder().catch(console.error);
    
    if (auth.currentUser) {
      loadRecordings();
    }
  }, [auth.currentUser]);

  const handleRecordingComplete = (blob: Blob, url: string) => {
    setCurrentRecording(url);
    setPendingRecording({ blob, url });
    setShowNameModal(true);
  };

  const { isRecording, startRecording, stopRecording } = useRecorder(handleRecordingComplete);

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

    if (recordings.length > 0) {
      loadAudioUrls();
    }

    return () => {
      Object.values(audioUrls).forEach(url => {
        if (url) URL.revokeObjectURL(url);
      });
    };
  }, [recordings]);

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
      const uint8Array = new Uint8Array(audioBytes);
      const base64str = btoa(
        uint8Array.reduce((data, byte) => data + String.fromCharCode(byte), '')
      );
      
      const response = await fetch('https://us-central1-guitarstudio-bbd18.cloudfunctions.net/analyzeAudio', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          audioData: base64str
        })
      });

      if (!response.ok) {
        throw new Error('Failed to analyze recording');
      }

      const { feedback } = await response.json();
      if (!feedback) {
        throw new Error('No feedback received from server');
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
    return <div className="recordings-container">Please log in to access recordings.</div>;
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
          {isLoading ? (
            <div className="loading-message">Loading your recordings...</div>
          ) : recordings.length === 0 ? (
            <div className="no-recordings-message">No recordings yet. Start recording to see them here!</div>
          ) : (
            recordings.map((recording) => (
              <RecordingItem
                key={recording.id}
                recording={recording}
                audioUrl={audioUrls[recording.id]}
                isAnalyzing={!!isAnalyzing[recording.id]}
                onAnalyze={handleAnalyzeRecording}
                onDelete={handleDeleteRecording}
              />
            ))
          )}
        </div>
      </div>
    </div>
  );
};

export default Recordings; 