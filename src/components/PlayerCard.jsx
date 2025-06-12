import React from 'react';
import { useGlobalState } from '../context/GlobalState';

const PlayerCard = () => {
  const { currentUser } = useGlobalState();

  if (!currentUser) {
    return <p>Please login to view your Player Card.</p>;
  }

  // Ensure stats object exists and provide defaults if not, similar to old frontend
  const stats = currentUser.stats || {
    upperBodyStrength: 0,
    lowerBodyStrength: 0,
    coreStrength: 0,
    powerExplosiveness: 0,
    flexibilityMobility: 0,
    cardioEndurance: 0
  };

  const cardStyle = {
    padding: '20px',
    border: '1px solid gold',
    borderRadius: '8px',
    backgroundColor: 'rgba(20,20,20,0.8)', // Darker background for the card itself
    color: 'white',
    textAlign: 'left', // Align text to left for readability
  };

  const statItemStyle = {
    padding: '5px 0',
    borderBottom: '1px solid #444', // Separator for stats
  };

  const lastStatItemStyle = { ...statItemStyle, borderBottom: 'none' };

  return (
    <div style={cardStyle}>
      <h3>{currentUser.username}'s Player Card</h3>
      <div style={{ marginBottom: '15px' }}>
        <p><strong>Email:</strong> {currentUser.email}</p>
        <p><strong>Level:</strong> {currentUser.level || 1}</p>
        <p><strong>Experience:</strong> {currentUser.experience || 0} XP</p>
        {currentUser.createdAt &&
          <p><strong>Member Since:</strong> {new Date(currentUser.createdAt).toLocaleDateString()}</p>
        }
      </div>
      <h4>Stats:</h4>
      <ul style={{ listStyleType: 'none', padding: 0 }}>
        <li style={statItemStyle}>Upper Body Strength: {stats.upperBodyStrength}</li>
        <li style={statItemStyle}>Lower Body Strength: {stats.lowerBodyStrength}</li>
        <li style={statItemStyle}>Core Strength: {stats.coreStrength}</li>
        <li style={statItemStyle}>Power Explosiveness: {stats.powerExplosiveness}</li>
        <li style={statItemStyle}>Flexibility/Mobility: {stats.flexibilityMobility}</li>
        <li style={lastStatItemStyle}>Cardio/Endurance: {stats.cardioEndurance}</li>
      </ul>
    </div>
  );
};

export default PlayerCard;
