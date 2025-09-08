import React from 'react';

const QuestLog = ({ quests, onComplete, onAbandon }) => {
  const activeQuests = quests.filter(q => q.status === 'accepted');

  return (
    <div className="w-full max-w-md p-4 bg-gray-800 rounded-lg shadow-lg">
      <h2 className="text-2xl font-bold text-white mb-4">Active Quests</h2>
      {activeQuests.length > 0 ? (
        <ul>
          {activeQuests.map(quest => (
            <li key={quest.questId} className="mb-4 p-2 bg-gray-700 rounded">
              <h3 className="font-bold text-yellow-400">{quest.title}</h3>
              <p className="text-sm text-gray-300">{quest.description}</p>
              <div className="mt-2 flex gap-2">
                <button
                  onClick={() => onComplete(quest)}
                  className="bg-blue-600 hover:bg-blue-700 text-white font-bold py-1 px-2 rounded text-sm"
                >
                  Complete
                </button>
                <button
                  onClick={() => onAbandon(quest.questId)}
                  className="bg-red-600 hover:bg-red-700 text-white font-bold py-1 px-2 rounded text-sm"
                >
                  Abandon
                </button>
              </div>
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
