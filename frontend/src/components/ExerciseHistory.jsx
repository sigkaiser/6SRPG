import { useState } from 'react';
import { useGlobalState } from '../context/GlobalState';
import pageBg from '../../assets/page.png';

const ExerciseHistory = () => {
  const { currentUser, updateUser } = useGlobalState();
  const [currentPage, setCurrentPage] = useState(0);
  const [selectedEntryId, setSelectedEntryId] = useState(null);
  const itemsPerPage = 5;

  if (!currentUser) return <p className="text-center text-gray-400">Please login to view history.</p>;

  const { exerciseHistory } = currentUser;

  if (!exerciseHistory || exerciseHistory.length === 0) {
    return (
      <div style={{ backgroundImage: `url(${pageBg})`, width: '1024px', height: '1024px' }} className="p-10">
        <h3 className="text-2xl font-bold text-center text-black mb-4">Exercise History</h3>
        <p className="text-center text-gray-700">No exercises logged yet. Time to get to work!</p>
      </div>
    );
  }

  const sortedHistory = [...exerciseHistory].sort((a, b) => (b.date ? new Date(b.date) : 0) - (a.date ? new Date(a.date) : 0));

  const pageCount = Math.ceil(sortedHistory.length / itemsPerPage);
  const paginatedHistory = sortedHistory.slice(currentPage * itemsPerPage, (currentPage + 1) * itemsPerPage);

  const handleNextPage = () => {
    setCurrentPage((prev) => Math.min(prev + 1, pageCount - 1));
  };

  const handlePrevPage = () => {
    setCurrentPage((prev) => Math.max(prev - 1, 0));
  };

  const handleDelete = (entryId) => {
    const updatedHistory = exerciseHistory.filter(entry => entry._id !== entryId);
    const updatedUser = { ...currentUser, exerciseHistory: updatedHistory };
    updateUser(updatedUser);
    setSelectedEntryId(null); // Deselect after deletion
  };

  return (
    <div
      className="w-[1024px] h-[1024px] p-20 text-gray-800 font-serif"
      style={{ backgroundImage: `url(${pageBg})`, backgroundSize: '100% 100%' }}
    >
      <h3 className="text-4xl font-bold text-center text-black mb-12">Your Exercise History</h3>
      <div className="space-y-4 h-[600px]">
        {paginatedHistory.map((entry) => (
          <div
            key={entry._id}
            className={`p-3 rounded-md cursor-pointer relative ${selectedEntryId === entry._id ? 'bg-yellow-100 bg-opacity-50 shadow-lg' : 'hover:bg-gray-200 bg-opacity-50'}`}
            onClick={() => setSelectedEntryId(entry._id)}
          >
            {selectedEntryId === entry._id && (
              <button
                onClick={(e) => {
                  e.stopPropagation(); // prevent re-selecting the entry
                  handleDelete(entry._id);
                }}
                className="absolute top-2 right-2 text-red-700 font-bold text-xl hover:text-red-900"
              >
                X
              </button>
            )}
            <p className="font-semibold text-xl text-gray-900">
              {entry.type || 'N/A'} - {entry.date ? new Date(entry.date).toLocaleDateString() : 'N/A'}
            </p>
            <div className="pl-4 text-lg">
              {entry.category === 'Lift' && entry.sets && entry.sets.map((set, sIndex) => (
                <p key={sIndex}>Set {sIndex + 1}: {set.reps} reps at {set.weight} lbs</p>
              ))}
              {entry.category === 'Stretch' && entry.sets && entry.sets.map((set, sIndex) => (
                <p key={sIndex}>Set {sIndex + 1}: {set.duration} seconds</p>
              ))}
              {entry.category === 'Cardio' && (
                <p>Duration: {entry.duration} minutes {entry.intensity ? `at intensity ${entry.intensity}` : ''}</p>
              )}
            </div>
          </div>
        ))}
      </div>
      <div className="flex justify-center items-center mt-8">
        <button onClick={handlePrevPage} disabled={currentPage === 0} className="px-4 py-2 text-2xl disabled:opacity-50">
          &larr;
        </button>
        <span className="px-4 text-xl">Page {currentPage + 1} of {pageCount}</span>
        <button onClick={handleNextPage} disabled={currentPage >= pageCount - 1} className="px-4 py-2 text-2xl disabled:opacity-50">
          &rarr;
        </button>
      </div>
    </div>
  );
};

export default ExerciseHistory;
