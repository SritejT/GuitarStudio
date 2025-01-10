import React from 'react';

interface RecordingItemProps {
  recording: {
    id: string;
    name: string;
    timestamp: string;
    storagePath: string;
    feedback?: string;
  };
  audioUrl?: string;
  isAnalyzing: boolean;
  onAnalyze: (recordingId: string, storagePath: string) => void;
  onDelete: (recordingId: string, storagePath: string) => void;
}

const RecordingItem: React.FC<RecordingItemProps> = ({
  recording,
  audioUrl,
  isAnalyzing,
  onAnalyze,
  onDelete,
}) => {
  return (
    <div className="recording-item">
      <div className="recording-info">
        <span className="recording-name">{recording.name}</span>
        <span className="recording-date">
          {new Date(recording.timestamp).toLocaleString()}
        </span>
      </div>
      {audioUrl && <audio controls src={audioUrl} />}
      <div className="recording-actions">
        <button
          onClick={() => onAnalyze(recording.id, recording.storagePath)}
          className={`analyze-button ${isAnalyzing ? 'analyzing' : ''}`}
          disabled={isAnalyzing}
        >
          {isAnalyzing ? 'Analyzing...' : 'Get Feedback'}
        </button>
        <button
          onClick={() => onDelete(recording.id, recording.storagePath)}
          className="delete-button"
          aria-label="Delete recording"
        >
          Delete
        </button>
      </div>
      {recording.feedback && (
        <div className="feedback-container">
          <h4>AI Feedback:</h4>
          <p>{recording.feedback}</p>
        </div>
      )}
    </div>
  );
};

export default RecordingItem; 