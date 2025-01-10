import React from 'react';

interface RecordingModalProps {
  recordingName: string;
  onNameChange: (name: string) => void;
  onSave: () => void;
}

const RecordingModal: React.FC<RecordingModalProps> = ({
  recordingName,
  onNameChange,
  onSave,
}) => {
  return (
    <div className="modal-overlay">
      <div className="modal-content">
        <h3>Name Your Recording</h3>
        <input
          type="text"
          value={recordingName}
          onChange={(e) => onNameChange(e.target.value)}
          placeholder="Enter recording name"
          className="recording-name-input"
        />
        <div className="modal-buttons">
          <button onClick={onSave} className="save-button">
            Save
          </button>
        </div>
      </div>
    </div>
  );
};

export default RecordingModal; 