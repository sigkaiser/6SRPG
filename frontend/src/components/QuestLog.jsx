import React from 'react';

const QuestLog = ({ quests }) => {
  const activeQuests = quests.filter(q => q.status === 'accepted');

  return (
    <div className="w-full max-w-md p-4 bg-gray-800 rounded-lg shadow-lg">
      <h2 className="text-2xl font-bold text-white mb-4">Active Quests</h2>
      {activeQuests.length > 0 ? (
        <ul>
          {activeQuests.map(quest => (
            <li key={quest.questId} className="mb-2 p-2 bg-gray-700 rounded">
              <h3 className="font-bold text-yellow-400">{quest.title}</h3>
              <p className="text-sm text-gray-300">{quest.description}</p>
            </li>
          ))}
        </ul>
      ) : (
        <p className="text-gray-400">No active quests.</p>
      )}
    </div>
  );
};

export default QuestLog;
