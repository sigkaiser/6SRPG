import React, { useState, useEffect } from 'react';
import { useGlobalState } from '../context/GlobalState';
import { PieChart, Pie, Cell, Tooltip, Legend, ResponsiveContainer } from 'recharts'; // Import Recharts components

// Helper function to format stat keys for display
const formatStatKey = (key) => {
  return key.replace(/([A-Z])/g, ' $1').trim().split(' ').map(word => word.charAt(0).toUpperCase() + word.slice(1)).join(' ');
};

const COLORS = ['#FFBB28', '#FF8042', '#00C49F', '#0088FE', '#AF19FF', '#FF42A0', '#CCCCCC']; // Colors for pie chart slices

const StatDetailModal = ({ statName, contributions, onClose }) => {
  if (!contributions || contributions.length === 0) {
    return (
      <div className="fixed inset-0 bg-black bg-opacity-75 flex justify-center items-center p-4 z-50">
        <div className="bg-gray-800 p-6 rounded-lg shadow-xl max-w-lg w-full text-gray-200">
          <h4 className="text-xl font-semibold text-yellow-400 mb-4">Details for {formatStatKey(statName)}</h4>
          <p className="text-gray-400">No specific exercises contributed to this stat with the current calculation method, or no 1RM-eligible exercises logged.</p>
          <button
            onClick={onClose}
            className="mt-4 w-full bg-yellow-500 hover:bg-yellow-600 text-black font-semibold py-2 px-4 rounded transition-colors"
          >
            Close
          </button>
        </div>
      </div>
    );
  }

  const totalPointsForStat = contributions.reduce((sum, contrib) => sum + contrib.pointsContribution, 0);

  const chartData = contributions.map(contrib => ({
    name: contrib.exerciseName,
    value: contrib.pointsContribution, // Recharts Pie uses raw values for segments
    percentage: totalPointsForStat > 0 ? (contrib.pointsContribution / totalPointsForStat) * 100 : 0,
  }));

  return (
    <div className="fixed inset-0 bg-black bg-opacity-75 flex justify-center items-center p-4 z-50">
      <div className="bg-gray-800 p-6 rounded-lg shadow-xl max-w-lg w-full text-gray-200">
        <h4 className="text-xl font-semibold text-yellow-400 mb-4 text-center">Contributing Exercises for {formatStatKey(statName)}</h4>

        <div className="my-4" style={{ width: '100%', height: 250 }}>
          <ResponsiveContainer>
            <PieChart>
              <Pie
                data={chartData}
                cx="50%"
                cy="50%"
                labelLine={false}
                // label={({ name, percentage }) => `${name}: ${percentage.toFixed(0)}%`} // Example for label on slice
                outerRadius={80}
                fill="#8884d8"
                dataKey="value" // This is what Recharts uses to determine slice size
              >
                {chartData.map((entry, index) => (
                  <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                ))}
              </Pie>
              <Tooltip formatter={(value, name, props) => [`${props.payload.percentage.toFixed(1)}% (${value.toFixed(1)} pts)`, name]} />
              <Legend
                formatter={(value, entry) => {
                  const { color } = entry;
                  const percentage = entry.payload.percentage;
                  return <span style={{ color }}>{value} ({percentage.toFixed(1)}%)</span>;
                }}
              />
            </PieChart>
          </ResponsiveContainer>
        </div>

        <h5 className="text-lg font-semibold text-yellow-300 mt-6 mb-2">Contribution Breakdown:</h5>
        <ul className="list-none p-0 space-y-1 text-gray-300 max-h-40 overflow-y-auto">
          {chartData.map((contrib, index) => (
            <li key={index} className="flex justify-between">
              <span>{contrib.name}:</span>
              <span className="text-yellow-300">{contrib.percentage.toFixed(1)}% ({contrib.value.toFixed(1)} pts)</span>
            </li>
          ))}
        </ul>
        <button
          onClick={onClose}
          className="mt-6 w-full bg-yellow-500 hover:bg-yellow-600 text-black font-semibold py-2 px-4 rounded transition-colors"
        >
          Close
        </button>
      </div>
    </div>
  );
};

const PlayerCard = () => {
  const {
    currentUser,
    recalculateStats,
    currentUserDetailedContributions,
    isLoadingStats,
    error // Assuming error state is available for display
  } = useGlobalState();

  const [selectedStatForDetails, setSelectedStatForDetails] = useState(null);

  useEffect(() => {
    // Recalculate stats if user is loaded and detailed contributions aren't, or if exercise history changes.
    // A more sophisticated check might involve timestamps or specific user actions.
    if (currentUser && currentUser.id && !currentUserDetailedContributions && !isLoadingStats) {
      recalculateStats(currentUser.id);
    }
  }, [currentUser, currentUserDetailedContributions, recalculateStats, isLoadingStats]);

  if (!currentUser) return <p className="text-center text-gray-400">Please login to view your Player Card.</p>;

  // Use calculated stats from currentUser.stats, provide defaults if not present
  const stats = currentUser.stats || {
    upperBodyStrength: 0, lowerBodyStrength: 0, coreStrength: 0,
    powerExplosiveness: 0, flexibilityMobility: 0, cardioEndurance: 0
  };

  const handleStatClick = (statKey) => {
    setSelectedStatForDetails(statKey);
  };

  const handleCloseModal = () => {
    setSelectedStatForDetails(null);
  };

  // Define a style object for backdrop filter if needed, as Tailwind might not have it enabled by default
  // Or, if backdrop-filter is enabled in tailwind.config.js, can use classes like `backdrop-blur-sm`
  const cardStyle = {
    // backgroundColor: 'rgba(31, 41, 55, 0.95)', // Equivalent to bg-gray-800 bg-opacity-95
    backdropFilter: 'blur(4px)',
    WebkitBackdropFilter: 'blur(4px)', // For Safari support
  };

  return (
    <div
      className="p-5 border border-yellow-500 rounded-lg bg-gray-800 bg-opacity-95 shadow-xl text-gray-200" // Increased bg-opacity from 90 to 95
      style={cardStyle} // Apply backdrop blur
    >
      <h3 className="text-2xl font-semibold text-yellow-400 mb-4 text-center">{currentUser.username}'s Player Card</h3>
      <div className="mb-4 space-y-1">
        <p><strong className="text-yellow-500">Email:</strong> {currentUser.email}</p>
        <p><strong className="text-yellow-500">Level:</strong> {currentUser.level || 1}</p>
        <p><strong className="text-yellow-500">Experience:</strong> {currentUser.experience || 0} XP</p>
        {currentUser.createdAt && <p><strong className="text-yellow-500">Member Since:</strong> {new Date(currentUser.createdAt).toLocaleDateString()}</p>}
      </div>

      {isLoadingStats && <p className="text-center text-yellow-300 my-3">Recalculating stats...</p>}
      {error && !isLoadingStats && <p className="text-center text-red-400 my-3">Error calculating stats: {error}</p>}

      <h4 className="text-xl font-semibold text-yellow-400 mb-2 text-center">Stats:</h4>
      <ul className="list-none p-0 space-y-1">
        {Object.entries(stats)
          .filter(([key]) => key !== 'id' && key !== '_id' && key !== '__v') // Filter out non-stat fields if any creep in
          .map(([key, value], index, arr) => (
          <li
            key={key}
            className={`py-2 px-3 bg-gray-700 rounded-md cursor-pointer hover:bg-gray-600 transition-colors ${index === arr.length - 1 ? '' : 'border-b border-gray-600'}`}
            onClick={() => handleStatClick(key)}
            title={`Click to see details for ${formatStatKey(key)}`}
          >
            <span className="capitalize text-gray-300">{formatStatKey(key)}: </span>
            <span className="font-semibold text-yellow-300">{value || 0}</span>
          </li>
        ))}
      </ul>

      {selectedStatForDetails && currentUserDetailedContributions && (
        <StatDetailModal
          statName={selectedStatForDetails}
          contributions={currentUserDetailedContributions[selectedStatForDetails]}
          onClose={handleCloseModal}
        />
      )}
    </div>
  );
};
export default PlayerCard;
