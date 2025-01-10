import React from 'react';

interface RecordingControlsProps {
  isRecording: boolean;
  onRecordingToggle: () => void;
}

const RecordingControls: React.FC<RecordingControlsProps> = ({
  isRecording,
  onRecordingToggle,
}) => {
  return (
    <div className="recording-controls">
      <button 
        onClick={onRecordingToggle}
        className={`record-button ${isRecording ? 'recording' : ''}`}
      >
        {isRecording ? 'Stop Recording' : 'Start Recording'}
      </button>
    </div>
  );
};

export default RecordingControls; 