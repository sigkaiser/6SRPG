import React, { useState, useEffect } from 'react';
import { useGlobalState } from '../context/GlobalState';
import { generateDailyQuests } from '../services/api';

const QuestBoard = () => {
  const { currentUser, error, isLoading, getDailyQuests, setError, clearError } = useGlobalState();
  const [quests, setQuests] = useState([]);

  useEffect(() => {
    if (currentUser && currentUser.id) {
      getDailyQuests(currentUser.id);
    }
  }, [currentUser, getDailyQuests]);

  useEffect(() => {
    if (currentUser && currentUser.dailyQuests) {
      setQuests(currentUser.dailyQuests);
    }
  }, [currentUser]);

  const handleGenerateQuests = async () => {
    console.log('--- handleGenerateQuests called ---');
    console.log('Current user object:', currentUser);

    if (!currentUser || !currentUser.id) {
      console.error('CRITICAL: No current user or user ID found. Aborting quest generation.');
      return;
    }

    console.log(`Attempting to generate quests for user ID: ${currentUser.id}`);
    clearError();

    console.log('Calling generateDailyQuests from api.js...');
    const response = await generateDailyQuests(currentUser.id);
    console.log('Response received from generateDailyQuests in api.js:', response);

    if (response.success) {
      getDailyQuests(currentUser._id); // Refetch quests after generating new ones
    } else {
      setError(response.message);
    }
  };

  if (isLoading) {
    return <div className="text-center p-4">Loading quests...</div>;
  }

  if (error) {
    return <div className="text-center p-4 text-red-500">{error}</div>;
  }

  return (
    <div className="p-6 bg-gray-800 text-white rounded-lg shadow-xl">
      <div className="flex justify-between items-center mb-4">
        <h2 className="text-2xl font-bold text-yellow-400">Quest Board</h2>
        <button
          onClick={handleGenerateQuests}
          className="bg-blue-500 hover:bg-blue-700 text-white font-bold py-2 px-4 rounded"
        >
          Generate New Quests
        </button>
      </div>
      {quests.length > 0 ? (
        <div className="space-y-4">
          {quests.map((quest) => (
            <div key={quest.questId} className="bg-gray-700 p-4 rounded-lg">
              <h3 className="text-xl font-bold">{quest.title} [{quest.rank}]</h3>
              <p className="text-gray-400">{quest.description}</p>
              <p className="mt-2">Primary Stat: {quest.primaryStat}</p>
              <ul className="list-disc list-inside mt-2">
                {quest.exercises.map((ex, index) => (
                  <li key={index}>
                    {ex.name}: {ex.sets} sets of {ex.reps ? `${ex.reps} reps` : `${ex.duration}s`}
                    {ex.weightPercent && ` at ${ex.weightPercent}% of 1RM`}
                  </li>
                ))}
              </ul>
            </div>
          ))}
        </div>
      ) : (
        <p>No quests available. Try generating new ones!</p>
      )}
    </div>
  );
};

export default QuestBoard;
