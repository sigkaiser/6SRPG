import React, { useState } from 'react';
import { useGlobalState } from '../context/GlobalState';
import { deleteHistory } from '../services/api';
import pageBg from '../../assets/page.png';

const ExerciseHistory = () => {
  const { currentUser, updateUser } = useGlobalState();
  const [selectedEntry, setSelectedEntry] = useState(null);
  const [currentPage, setCurrentPage] = useState(0);
  const entriesPerPage = 5;

  if (!currentUser) {
    return <p className="text-center text-gray-400">Please login to view history.</p>;
  }

  const { exerciseHistory } = currentUser;

  if (!exerciseHistory || exerciseHistory.length === 0) {
    return (
      <div className="text-center p-4">
        <h3 className="text-2xl font-bold text-yellow-400 mb-4">Exercise History</h3>
        <p className="text-gray-300">No exercises logged yet. Time to get to work!</p>
      </div>
    );
  }

  const sortedHistory = [...exerciseHistory].sort((a, b) => new Date(b.date) - new Date(a.date));
  const pageCount = Math.ceil(sortedHistory.length / entriesPerPage);
  const paginatedHistory = sortedHistory.slice(currentPage * entriesPerPage, (currentPage + 1) * entriesPerPage);

  const handleDelete = async (e, entryId) => {
    e.stopPropagation(); // Prevent entry selection when deleting
    try {
      const response = await deleteHistory(currentUser.id, entryId);
      if (response.success) {
        // Optimistically update UI or refetch user data
        const updatedUser = {
          ...currentUser,
          exerciseHistory: currentUser.exerciseHistory.filter(entry => entry._id !== entryId)
        };
        updateUser(updatedUser);
        setSelectedEntry(null); // Deselect after deletion
      } else {
        // Handle error
        console.error(response.message);
      }
    } catch (error) {
      console.error('Failed to delete exercise history entry:', error);
    }
  };

  const handleNextPage = () => {
    setCurrentPage((prev) => (prev + 1) % pageCount);
  };

  const handlePrevPage = () => {
    setCurrentPage((prev) => (prev - 1 + pageCount) % pageCount);
  };

  return (
    <div
      className="w-full max-w-2xl p-8 text-gray-800"
      style={{
        backgroundImage: `url(${pageBg})`,
        backgroundSize: '100% 100%',
        height: '700px', // Adjust as needed
        fontFamily: '"Crimson Pro", serif',
      }}
    >
      <h3 className="text-3xl font-bold text-center text-black mb-6">Your Exercise History</h3>
      <div className="space-y-4">
        {paginatedHistory.map((entry) => (
          <div
            key={entry._id}
            className={`p-3 rounded-md cursor-pointer transition-all duration-200 ${
              selectedEntry === entry._id ? 'bg-yellow-200 bg-opacity-50' : ''
            }`}
            onClick={() => setSelectedEntry(entry._id)}
            onMouseEnter={() => setSelectedEntry(entry._id)}
            onMouseLeave={() => setSelectedEntry(null)}
          >
            <div className="flex justify-between items-center">
              <div>
                <p className="font-semibold">
                  {entry.type} - {new Date(entry.date).toLocaleDateString()}
                </p>
                <div className="pl-4 text-sm">
                  {entry.category === 'Lift' && entry.sets.map((set, sIndex) => (
                    <p key={sIndex}>Set {sIndex + 1}: {set.reps} reps at {set.weight} lbs</p>
                  ))}
                  {entry.category === 'Stretch' && entry.sets.map((set, sIndex) => (
                     <p key={sIndex}>Set {sIndex + 1}: {set.duration} seconds</p>
                  ))}
                  {entry.category === 'Cardio' && (
                    <p>Duration: {entry.duration} minutes, Intensity: {entry.intensity}</p>
                  )}
                </div>
              </div>
              {selectedEntry === entry._id && (
                <button
                  onClick={(e) => handleDelete(e, entry._id)}
                  className="text-red-700 font-bold text-2xl hover:text-red-500"
                >
                  X
                </button>
              )}
            </div>
          </div>
        ))}
      </div>
      {pageCount > 1 && (
        <div className="flex justify-center items-center mt-6 space-x-4">
          <button onClick={handlePrevPage} className="text-2xl font-bold text-black">&larr;</button>
          <span className="text-black">Page {currentPage + 1} of {pageCount}</span>
          <button onClick={handleNextPage} className="text-2xl font-bold text-black">&rarr;</button>
        </div>
      )}
    </div>
  );
};

export default ExerciseHistory;
