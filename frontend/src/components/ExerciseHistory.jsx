import { useGlobalState } from '../context/GlobalState';

const ExerciseHistory = () => {
  const { currentUser } = useGlobalState();
  if (!currentUser) return <p className="text-center text-gray-400">Please login to view history.</p>;
  const { exerciseHistory } = currentUser;

  if (!exerciseHistory || exerciseHistory.length === 0) {
    return (
      <div>
        <h3 className="text-2xl font-bold text-center text-yellow-400 mb-4">Exercise History</h3>
        <p className="text-center text-gray-300">No exercises logged yet. Time to get to work!</p>
      </div>
    );
  }
  const sortedHistory = [...exerciseHistory].sort((a, b) => (b.date ? new Date(b.date) : 0) - (a.date ? new Date(a.date) : 0));
  const weightUnit = currentUser.preferences?.units === 'metric' ? 'kg' : 'lbs';

  return (
    <div className="w-full max-w-2xl p-1"> {/* Adjusted max-width slightly for more space */}
      <h3 className="text-2xl font-bold text-center text-yellow-400 mb-6">Your Exercise History</h3>
      <div className="max-h-[400px] overflow-y-auto space-y-2 pr-2  {/* Reduced space-y */}
                      scrollbar-thin scrollbar-thumb-yellow-500 scrollbar-track-gray-700
                      border border-gray-700 rounded-lg bg-gray-800 bg-opacity-70 p-3">
        {sortedHistory.map((entry, index) => (
          <div
            key={entry._id || entry.id || index} // Prefer _id from DB if available
            className="bg-gray-700 p-2.5 rounded-md shadow text-sm flex flex-wrap justify-between items-center" // Adjusted padding & flex properties
          >
            <span className="font-semibold text-yellow-300 mr-3 flex-shrink-0 whitespace-nowrap">
              {entry.date ? new Date(entry.date).toLocaleDateString() : 'N/A'}
            </span>
            <span className="text-gray-100 truncate mr-3 flex-grow min-w-[100px]" title={entry.type || 'N/A'}> {/* Allow type to grow and truncate */}
              {entry.type || 'N/A'}
            </span>
            <div className="flex space-x-2 text-gray-300 items-center flex-shrink-0"> {/* Details container */}
              <span>S: {entry.sets !== undefined ? entry.sets : 'N/A'}</span>
              <span>R: {entry.reps !== undefined ? entry.reps : 'N/A'}</span>
              <span className="whitespace-nowrap"> {/* Prevent weight and unit from wrapping */}
                W: {entry.weight !== undefined ? entry.weight : 'N/A'} {entry.weightUnit || weightUnit}
              </span>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
};
export default ExerciseHistory;
