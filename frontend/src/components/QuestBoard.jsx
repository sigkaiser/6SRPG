import React, { useState, useEffect } from 'react';
import { useGlobalState } from '../context/GlobalState';
import { generateDailyQuests } from '../services/api';
import noticeboardBg from '../../assets/noticeboard.png';
import posting1 from '../../assets/posting1.png';
import posting2 from '../../assets/posting2.png';

const QuestModal = ({ quest, onClose }) => {
  if (!quest) return null;

  return (
    <div className="fixed inset-0 bg-black bg-opacity-75 flex items-center justify-center z-50" onClick={onClose}>
      <div
        className="w-[600px] h-[800px] p-12 text-gray-800 font-serif relative bg-no-repeat bg-center bg-contain"
        style={{ backgroundImage: `url(${posting1})`, backgroundSize: '100% 100%' }}
        onClick={(e) => e.stopPropagation()}
      >
        <button onClick={onClose} className="absolute top-10 right-12 text-3xl font-bold text-gray-800 hover:text-black">&times;</button>
        <h2 className="text-3xl font-bold text-center mb-6">{quest.title}</h2>
        <p className="text-xl font-semibold mb-4">Rank: {quest.rank}</p>
        <p className="text-lg mb-4">{quest.description}</p>
        <p className="text-lg font-semibold">Primary Stat: {quest.primaryStat}</p>
        <h4 className="text-2xl font-bold mt-6 mb-2">Exercises:</h4>
        <ul className="list-disc list-inside text-lg">
          {quest.exercises.map((ex, index) => (
            <li key={index}>
              {ex.name}: {ex.sets} sets of {ex.reps ? `${ex.reps} reps` : `${ex.duration}s`}
              {ex.weightPercent && ` at ${ex.weightPercent}% of 1RM`}
            </li>
          ))}
        </ul>
      </div>
    </div>
  );
};

const QuestBoard = () => {
  const { currentUser, error, isLoading, getDailyQuests, setError, clearError, updateUser } = useGlobalState();
  const [selectedQuest, setSelectedQuest] = useState(null);

  useEffect(() => {
    if (currentUser && currentUser._id) {
      if (!currentUser.dailyQuests || currentUser.dailyQuests.length === 0) {
        getDailyQuests(currentUser._id);
      }
    }
  }, [currentUser?._id, getDailyQuests]);

  const handleGenerateQuests = async () => {
    if (!currentUser || !currentUser._id) {
      console.error('CRITICAL: No current user or user ID found. Aborting quest generation.');
      return;
    }
    clearError();
    // This API call should return the updated user object with new quests
    const updatedUser = await generateDailyQuests(currentUser._id);
    if (updatedUser.success) {
      updateUser(updatedUser.user); // Update global state with the new user object
    } else {
      setError(updatedUser.message);
    }
  };

  if (isLoading) {
    return <div className="text-center p-4">Loading quests...</div>;
  }

  if (error) {
    return <div className="text-center p-4 text-red-500">{error}</div>;
  }

  const postings = [posting1, posting2];
  const quests = currentUser?.dailyQuests || [];

  return (
    <>
      <QuestModal quest={selectedQuest} onClose={() => setSelectedQuest(null)} />
      <div
        className="w-full h-full p-8 relative flex flex-col items-center"
        style={{
          backgroundImage: `url(${noticeboardBg})`,
          backgroundSize: 'cover',
          backgroundPosition: 'center',
          backgroundRepeat: 'no-repeat',
        }}
      >
        <h2 className="text-4xl font-bold text-white mb-4" style={{ fontFamily: "'Cinzel', serif" }}>Quest Board</h2>

        <button
          onClick={handleGenerateQuests}
          className="bg-yellow-600 hover:bg-yellow-700 text-white font-bold py-2 px-4 rounded-lg shadow-lg mb-4"
        >
          Generate New Quests
        </button>

        {quests.length > 0 ? (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
            {quests.map((quest, index) => (
              <div
                key={quest.questId}
                className="w-[300px] h-[400px] p-8 text-gray-800 font-serif cursor-pointer hover:scale-105 transition-transform duration-200"
                style={{
                  backgroundImage: `url(${postings[index % postings.length]})`,
                  backgroundSize: '100% 100%',
                }}
                onClick={() => {
                  console.log('Quest clicked:', quest.title);
                  setSelectedQuest(quest);
                }}
              >
                <h3 className="text-2xl font-bold text-center mt-8">{quest.title}</h3>
                <p className="text-xl font-bold text-center mt-4">[{quest.rank}]</p>
              </div>
            ))}
          </div>
        ) : (
          <div className="text-center">
            <p className="text-white text-2xl">No quests available. Try generating new ones!</p>
          </div>
        )}
      </div>
    </>
  );
};

export default QuestBoard;
