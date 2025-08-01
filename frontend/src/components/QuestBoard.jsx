import React, { useState, useEffect } from 'react';
import { useGlobalState } from '../context/GlobalState';
import { getDailyQuests, generateDailyQuests } from '../services/api';

const QuestBoard = () => {
  const { currentUser, error, setError, clearError } = useGlobalState();
  const [quests, setQuests] = useState([]);
  const [isLoading, setIsLoading] = useState(false);

  useEffect(() => {
    if (currentUser) {
      fetchQuests();
    }
  }, [currentUser]);

  const fetchQuests = async () => {
    setIsLoading(true);
    clearError();
    const response = await getDailyQuests(currentUser._id);
    if (response.success) {
      setQuests(response.quests);
    } else {
      setError(response.message);
    }
    setIsLoading(false);
  };

  const handleGenerateQuests = async () => {
    setIsLoading(true);
    clearError();
    const response = await generateDailyQuests(currentUser._id);
    if (response.success) {
      fetchQuests(); // Refetch quests after generating new ones
    } else {
      setError(response.message);
    }
    setIsLoading(false);
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
