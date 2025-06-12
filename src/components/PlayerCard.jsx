import React from 'react';
import { useGlobalState } from '../context/GlobalState';

const PlayerCard = () => {
  const { currentUser } = useGlobalState();
  if (!currentUser) return <p className="text-center text-gray-400">Please login to view your Player Card.</p>;

  const stats = currentUser.stats || { upperBodyStrength: 0, lowerBodyStrength: 0, coreStrength: 0, powerExplosiveness: 0, flexibilityMobility: 0, cardioEndurance: 0 };

  return (
    <div className="p-5 border border-yellow-500 rounded-lg bg-gray-800 bg-opacity-90 shadow-xl text-gray-200">
      <h3 className="text-2xl font-semibold text-yellow-400 mb-4 text-center">{currentUser.username}'s Player Card</h3>
      <div className="mb-4 space-y-1">
        <p><strong className="text-yellow-500">Email:</strong> {currentUser.email}</p>
        <p><strong className="text-yellow-500">Level:</strong> {currentUser.level || 1}</p>
        <p><strong className="text-yellow-500">Experience:</strong> {currentUser.experience || 0} XP</p>
        {currentUser.createdAt && <p><strong className="text-yellow-500">Member Since:</strong> {new Date(currentUser.createdAt).toLocaleDateString()}</p>}
      </div>
      <h4 className="text-xl font-semibold text-yellow-400 mb-2 text-center">Stats:</h4>
      <ul className="list-none p-0 space-y-1">
        {Object.entries(stats).map(([key, value], index, arr) => (
          <li key={key} className={`py-2 px-3 bg-gray-700 rounded-md ${index === arr.length - 1 ? '' : 'border-b border-gray-600'}`}>
            <span className="capitalize text-gray-300">{key.replace(/([A-Z])/g, ' $1').trim()}: </span>
            <span className="font-semibold text-yellow-300">{value}</span>
          </li>
        ))}
      </ul>
    </div>
  );
};
export default PlayerCard;
