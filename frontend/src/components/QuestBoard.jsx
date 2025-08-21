import React, { useState, useEffect } from 'react';
import { createPortal } from 'react-dom';
import { useGlobalState } from '../context/GlobalState';
import { generateDailyQuests } from '../services/api';
import noticeboardBg from '../../assets/noticeboard.png';
import posting1 from '../../assets/posting1.png';
import posting2 from '../../assets/posting2.png';

// Function to generate semi-random but deterministic positions for quests
const getQuestPosition = (index) => {
  const positions = [
    { top: '10%', left: '5%' },
    { top: '40%', left: '30%' },
    { top: '5%', left: '60%' },
    { top: '50%', left: '70%' },
    { top: '20%', left: '45%' },
    { top: '60%', left: '15%' },
  ];
  return positions[index % positions.length];
};

const rankColorMap = {
  S: '#8B0000', // Dark Red
  A: '#FF0000', // Red
  B: '#FFA500', // Orange
  C: '#FFFF00', // Yellow
  D: '#008000', // Green
  E: '#0000FF', // Blue
  F: '#EE82EE', // Light Violet
};

const getRankStyle = (rank) => {
  const rankLetter = rank.charAt(0).toUpperCase();
  return {
    color: rankColorMap[rankLetter] || '#000000', // Default to black
    fontWeight: 'bold',
    textShadow: '1px 1px 2px #fff',
  };
};

const QuestModal = ({ quest, onClose }) => {
  const rankLetter = quest.rank.charAt(0).toUpperCase();
  // The modal is now rendered into the body, outside of the main app structure
  return createPortal(
    <div
      className="fixed inset-0 bg-black bg-opacity-70 flex items-center z-50"
      onClick={onClose}
    >
      <div
        className="relative p-12 pt-40 text-center ml-auto mr-20"
        style={{
          backgroundImage: `url(${posting1})`,
          backgroundSize: '100% 100%',
          backgroundRepeat: 'no-repeat',
          backgroundPosition: 'center',
          width: '600px', // Adjusted width
          height: '800px', // Adjusted height
          fontFamily: '"Crimson Pro", serif',
          color: 'white',
        }}
        onClick={(e) => e.stopPropagation()}
      >
        <h3 className="text-3xl font-bold mb-4">{quest.title} [<span style={getRankStyle(quest.rank)}>{rankLetter}</span>]</h3>
        <p className="mb-4">{quest.description}</p>
        <p className="font-semibold mb-2">Primary Stat: {quest.primaryStat}</p>
        <ul className="list-none text-left mx-auto max-w-lg">
          {quest.exercises.map((ex, index) => (
            <li key={index} className="mb-1">
              <strong>{ex.name}:</strong> {ex.sets} sets of {ex.reps ? `${ex.reps} reps` : `${ex.duration}s`}
              {ex.weightPercent && ` at ${ex.weightPercent}% of 1RM`}
            </li>
          ))}
        </ul>
        <button
          onClick={onClose}
          className="absolute top-10 right-12 text-4xl font-bold text-white hover:text-red-700"
        >
          &times;
        </button>
      </div>
    </div>,
    document.body
  );
};

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
        <div className="relative w-full h-[600px]">
          {quests.map((quest, index) => {
            const position = getQuestPosition(index);
            const rankLetter = quest.rank.charAt(0).toUpperCase();
            return (
              <div
                key={quest.questId}
                className="absolute text-center text-gray-800 p-4 cursor-pointer"
                style={{
                  backgroundImage: `url(${index % 2 === 0 ? posting1 : posting2})`,
                  backgroundSize: 'contain',
                  backgroundRepeat: 'no-repeat',
                  backgroundPosition: 'center',
                  width: '200px',
                  height: '240px',
                  top: position.top,
                  left: position.left,
                  fontFamily: '"Crimson Pro", serif',
                  transform: `rotate(${Math.sin(index) * 4}deg)`,
                  zIndex: 10,
                }}
                onClick={() => setSelectedQuest(quest)}
              >
                <h3 className="text-xl font-bold pt-8">{quest.title}</h3>
                <p className="text-lg font-semibold">[<span style={getRankStyle(quest.rank)}>{rankLetter}</span>]</p>
              </div>
            );
          })}
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
