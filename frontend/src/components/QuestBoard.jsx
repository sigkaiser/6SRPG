import React, { useState, useEffect } from 'react';
import { useGlobalState } from '../context/GlobalState';
import { generateDailyQuests } from '../services/api';
import noticeboardBg from '../../assets/noticeboard.png';
import posting1 from '../../assets/posting1.png';
import posting2 from '../../assets/posting2.png';

const QuestBoard = () => {
  const { currentUser, getDailyQuests, updateUser, error, isLoading, setError, clearError } = useGlobalState();
  const [quests, setQuests] = useState([]);
  const [selectedQuest, setSelectedQuest] = useState(null);

  useEffect(() => {
    if (currentUser?.id && !currentUser.dailyQuests) {
      getDailyQuests(currentUser.id);
    }
    if (currentUser?.dailyQuests) {
      setQuests(currentUser.dailyQuests);
    }
  }, [currentUser, getDailyQuests]);

  const handleGenerateQuests = async () => {
    if (!currentUser?.id) return;
    clearError();
    const response = await generateDailyQuests(currentUser.id);
    if (response.success && response.user) {
      updateUser(response.user);
    } else {
      setError(response.message);
    }
  };

  const QuestModal = ({ quest, onClose }) => (
    <div
      className="fixed inset-0 bg-black bg-opacity-70 flex justify-center items-center z-50"
      onClick={onClose}
    >
      <div
        className="relative p-10 pt-16 text-center text-gray-800"
        style={{
          backgroundImage: `url(${posting1})`,
          backgroundSize: '100% 100%',
          width: '500px',
          height: '600px',
          fontFamily: '"Crimson Pro", serif',
        }}
        onClick={(e) => e.stopPropagation()}
      >
        <h3 className="text-3xl font-bold mb-4">{quest.title} [{quest.rank}]</h3>
        <p className="mb-4">{quest.description}</p>
        <p className="font-semibold mb-2">Primary Stat: {quest.primaryStat}</p>
        <ul className="list-none text-left mx-auto max-w-sm">
          {quest.exercises.map((ex, index) => (
            <li key={index} className="mb-1">
              <strong>{ex.name}:</strong> {ex.sets} sets of {ex.reps ? `${ex.reps} reps` : `${ex.duration}s`}
              {ex.weightPercent && ` at ${ex.weightPercent}% of 1RM`}
            </li>
          ))}
        </ul>
        <button
          onClick={onClose}
          className="absolute top-4 right-4 text-3xl font-bold text-gray-800 hover:text-red-700"
        >
          &times;
        </button>
      </div>
    </div>
  );

  return (
    <div
      className="w-full h-full p-8"
      style={{
        backgroundImage: `url(${noticeboardBg})`,
        backgroundSize: 'cover',
        backgroundPosition: 'center',
      }}
    >
      <div className="flex justify-between items-start mb-6">
        <h2 className="text-4xl font-bold text-white" style={{ fontFamily: '"Crimson Pro", serif', textShadow: '2px 2px 4px #000' }}>
          Quest Board
        </h2>
        <button
          onClick={handleGenerateQuests}
          className="bg-yellow-600 hover:bg-yellow-700 text-white font-bold py-2 px-4 rounded-lg border-2 border-yellow-800"
          disabled={isLoading}
        >
          {isLoading ? 'Generating...' : 'Generate New Quests'}
        </button>
      </div>

      {error && <p className="text-red-500 bg-gray-800 p-2 rounded">{error}</p>}

      {quests.length > 0 ? (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {quests.map((quest, index) => (
            <div
              key={quest.questId}
              className="relative text-center text-gray-800 p-4 cursor-pointer h-64"
              style={{
                backgroundImage: `url(${index % 2 === 0 ? posting1 : posting2})`,
                backgroundSize: '100% 100%',
                fontFamily: '"Crimson Pro", serif',
              }}
              onClick={() => setSelectedQuest(quest)}
            >
              <h3 className="text-xl font-bold pt-8">{quest.title}</h3>
              <p className="text-lg font-semibold">[{quest.rank}]</p>
            </div>
          ))}
        </div>
      ) : (
        <p className="text-white text-center text-xl" style={{ textShadow: '1px 1px 2px #000' }}>
          No quests available. Generate new ones!
        </p>
      )}

      {selectedQuest && <QuestModal quest={selectedQuest} onClose={() => setSelectedQuest(null)} />}
    </div>
  );
};

export default QuestBoard;
