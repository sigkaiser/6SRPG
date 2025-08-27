import React, { useState, useEffect } from 'react';
import { createPortal } from 'react-dom';
import { useGlobalState } from '../context/GlobalState';
import { generateDailyQuests, acceptQuest, abandonQuest, completeQuest } from '../services/api';
import noticeboardBg from '../../assets/noticeboard.png';
import posting1 from '../../assets/posting1.png';
import posting2 from '../../assets/posting2.png';
import QuestLog from './QuestLog';
import QuestCompletionForm from './QuestCompletionForm';


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
    color: rankColorMap[rankLetter] || '#000000',
    fontWeight: 'bold',
    textShadow: '1px 1px 2px #fff',
  };
};

const QuestModal = ({ quest, onClose, onAccept, onAbandon, onComplete }) => {
  const rankLetter = quest.rank.charAt(0).toUpperCase();
  return createPortal(
    <div
      className="fixed inset-0 bg-black bg-opacity-70 flex items-center z-50"
      onClick={onClose}
    >
      <div
        className="relative text-center ml-auto mr-20"
        style={{
          backgroundImage: `url(${posting1})`,
          backgroundSize: '100% 100%',
          backgroundRepeat: 'no-repeat',
          backgroundPosition: 'center',
          width: '600px',
          height: '800px',
          fontFamily: '"Crimson Pro", serif',
          color: 'white',
        }}
        onClick={(e) => e.stopPropagation()}
      >
        {/* Close button */}
        <button
          onClick={onClose}
          className="absolute top-10 right-12 text-4xl font-bold text-white hover:text-red-700"
        >
          &times;
        </button>

        {/* Inner content wrapper positioned lower on the poster */}
        <div
          className="absolute left-1/2 -translate-x-1/2 text-center px-12"
          style={{ top: '220px', width: '90%' }} // lowered further down
        >
          <h3 className="text-8xl font-bold mb-6">
            {quest.title} [<span style={getRankStyle(quest.rank)}>{rankLetter}</span>]
          </h3>
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
           <div className="absolute bottom-[-150px] left-1/2 -translate-x-1/2 w-full px-4">
                {quest.status === 'available' && (
                    <button onClick={() => onAccept(quest.questId)} className="bg-green-600 hover:bg-green-700 text-white font-bold py-2 px-4 rounded w-full">Accept Quest</button>
                )}
                {quest.status === 'accepted' && (
                    <div className="flex gap-4">
                        <button onClick={() => onComplete(quest)} className="bg-blue-600 hover:bg-blue-700 text-white font-bold py-2 px-4 rounded w-1/2">Complete Quest</button>
                        <button onClick={() => onAbandon(quest.questId)} className="bg-red-600 hover:bg-red-700 text-white font-bold py-2 px-4 rounded w-1/2">Abandon Quest</button>
                    </div>
                )}
            </div>
        </div>
      </div>
    </div>,
    document.body
  );
};

const QuestBoard = () => {
  const { currentUser, getDailyQuests, updateUser, error, isLoading, setError, clearError } = useGlobalState();
  const [quests, setQuests] = useState([]);
  const [selectedQuest, setSelectedQuest] = useState(null);
  const [completingQuest, setCompletingQuest] = useState(null);


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

  const handleAcceptQuest = async (questId) => {
    const response = await acceptQuest(currentUser.id, questId);
    if (response.success) {
        updateUser(response.user);
        setSelectedQuest(null); // Close modal on success
    } else {
        setError(response.message);
    }
  };

  const handleAbandonQuest = async (questId) => {
    const response = await abandonQuest(currentUser.id, questId);
     if (response.success) {
        updateUser(response.user);
        setSelectedQuest(null); // Close modal on success
    } else {
        setError(response.message);
    }
  };

  const handleCompleteQuest = async (questId, loggedExercises) => {
    const response = await completeQuest(currentUser.id, questId, loggedExercises);
     if (response.success) {
        updateUser(response.user);
        setCompletingQuest(null); // Close completion form
    } else {
        setError(response.message);
    }
  };

  const availableQuests = quests.filter(q => q.status === 'available');

  return (
    <div className="flex w-full h-full">
      <div
        className="flex-grow h-full p-8"
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

        {availableQuests.length > 0 ? (
          <div className="relative w-full h-[600px]">
            {availableQuests.map((quest, index) => {
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
            No available quests. Generate new ones or check your Quest Log.
          </p>
        )}

        {selectedQuest && (
          <QuestModal
            quest={selectedQuest}
            onClose={() => setSelectedQuest(null)}
            onAccept={handleAcceptQuest}
            onAbandon={handleAbandonQuest}
            onComplete={(quest) => {
              setSelectedQuest(null);
              setCompletingQuest(quest);
            }}
          />
        )}
        {completingQuest && (
          <QuestCompletionForm
            quest={completingQuest}
            onSubmit={handleCompleteQuest}
            onClose={() => setCompletingQuest(null)}
          />
        )}
      </div>
      <div className="w-1/3 max-w-sm p-4 bg-black bg-opacity-50">
        {currentUser && <QuestLog quests={quests} />}
      </div>
    </div>
  );
};

export default QuestBoard;
