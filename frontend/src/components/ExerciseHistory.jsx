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

  return (
    <div className="w-full max-w-xl p-1">
      <h3 className="text-2xl font-bold text-center text-yellow-400 mb-6">Your Exercise History</h3>
      <div className="max-h-[400px] overflow-y-auto space-y-3 pr-2
                      scrollbar-thin scrollbar-thumb-yellow-500 scrollbar-track-gray-700
                      border border-gray-700 rounded-lg bg-gray-800 bg-opacity-70 p-3">
        {sortedHistory.map((entry, index) => (
          <div key={entry.id || index} className="bg-gray-700 p-3 rounded-md shadow text-sm">
            <p className="font-semibold text-yellow-300">
              {entry.date ? new Date(entry.date).toLocaleDateString() : 'N/A'} - {entry.date ? new Date(entry.date).toLocaleTimeString() : ''}
            </p>
            <p><strong className="text-gray-300">Type:</strong> {entry.type || 'N/A'}</p>
            <p><strong className="text-gray-300">Sets:</strong> {entry.sets !== undefined ? entry.sets : 'N/A'}</p>
            <p><strong className="text-gray-300">Reps:</strong> {entry.reps !== undefined ? entry.reps : 'N/A'}</p>
            <p><strong className="text-gray-300">Weight:</strong> {entry.weight !== undefined ? entry.weight : 'N/A'} {entry.weightUnit || 'kg'}</p>
          </div>
        ))}
      </div>
    </div>
  );
};
export default ExerciseHistory;
