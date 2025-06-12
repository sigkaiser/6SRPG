import React from 'react';
import { useGlobalState } from '../context/GlobalState';

const ExerciseHistory = () => {
  const { currentUser } = useGlobalState();

  if (!currentUser) {
    return <p>Please login to view your exercise history.</p>;
  }

  const { exerciseHistory } = currentUser;

  if (!exerciseHistory || exerciseHistory.length === 0) {
    return (
      <div>
        <h3>Exercise History</h3>
        <p>No exercises logged yet. Time to hit the gym!</p>
      </div>
    );
  }

  // Sort exercises by date, most recent first (as in old frontend)
  const sortedHistory = [...exerciseHistory].sort((a, b) => {
    const dateA = a.date ? new Date(a.date) : 0; // Handle missing dates gracefully
    const dateB = b.date ? new Date(b.date) : 0;
    return dateB - dateA;
  });

  const historyContainerStyle = {
    textAlign: 'left', // Align text to left for list items
    maxHeight: '400px', // Set a max height for scrollability
    overflowY: 'auto',  // Enable vertical scroll if content overflows
    paddingRight: '10px', // Space for scrollbar
    border: '1px solid #555',
    borderRadius: '5px',
    backgroundColor: 'rgba(10,10,10,0.5)',
  };

  const entryStyle = {
    borderBottom: '1px solid #444',
    padding: '10px',
    marginBottom: '5px', // Spacing between entries
    backgroundColor: 'rgba(25,25,25,0.7)',
    borderRadius: '4px',
  };

  const lastEntryStyle = {...entryStyle, borderBottom: 'none'};

  return (
    <div>
      <h3>Your Exercise History</h3>
      <div style={historyContainerStyle}>
        {sortedHistory.map((entry, index) => (
          <div key={entry.id || index} style={index === sortedHistory.length - 1 ? lastEntryStyle : entryStyle}>
            <p><strong>Date:</strong> {entry.date ? new Date(entry.date).toLocaleDateString() : 'N/A'} {entry.date ? new Date(entry.date).toLocaleTimeString() : ''}</p>
            <p><strong>Type:</strong> {entry.type || 'N/A'}</p>
            <p><strong>Sets:</strong> {entry.sets !== undefined ? entry.sets : 'N/A'}</p>
            <p><strong>Reps:</strong> {entry.reps !== undefined ? entry.reps : 'N/A'}</p>
            <p><strong>Weight:</strong> {entry.weight !== undefined ? entry.weight : 'N/A'} {entry.weightUnit || 'kg'}</p>
            {/* Assuming weightUnit might be part of data, defaulting to kg as in old frontend */}
          </div>
        ))}
      </div>
    </div>
  );
};

export default ExerciseHistory;
