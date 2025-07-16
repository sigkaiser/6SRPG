import React, { useState, useMemo } from 'react';
import { useGlobalState } from '../context/GlobalState';
import { logExercise as apiLogExercise } from '../services/api';

const ExerciseLogForm = ({ onLogSuccess }) => {
  const { currentUser, exercises, setError, clearError, updateUser } = useGlobalState();
  const [exerciseCategory, setExerciseCategory] = useState('');
  const [selectedExercise, setSelectedExercise] = useState('');
  const [sets, setSets] = useState([{}]);
  const [duration, setDuration] = useState('');
  const [message, setMessage] = useState('');

  const resetForm = () => {
    setExerciseCategory('');
    setSelectedExercise('');
    setSets([{}]);
    setDuration('');
    setMessage('');
  };

  const handleAddSet = () => {
    if (sets.length < 6) {
      setSets([...sets, {}]);
    }
  };

  const handleSetChange = (index, field, value) => {
    const newSets = [...sets];
    newSets[index][field] = value;
    setSets(newSets);
  };

  const filteredExercises = useMemo(() => {
    if (!exerciseCategory) return [];
    const liftTypes = ['powerlifting', 'strength', 'olympic weightlifting', 'strongman', 'plyometrics'];
    return exercises.filter(ex => {
      if (exerciseCategory === 'Lift') return liftTypes.includes(ex.category);
      if (exerciseCategory === 'Stretch') return ex.category === 'stretching';
      if (exerciseCategory === 'Cardio') return ex.category === 'cardio';
      return false;
    });
  }, [exerciseCategory, exercises]);

  if (!currentUser) return <p className="text-center text-gray-400">Please login to log exercises.</p>;
  if (!exercises || exercises.length === 0) return <p className="text-center text-gray-400">Exercise list not available.</p>;

  const handleSubmit = async (e) => {
    e.preventDefault();
    clearError();
    setMessage('');

    if (!selectedExercise) {
      setError("Please select an exercise.");
      return;
    }

    let exerciseData;
    if (exerciseCategory === 'Lift') {
      exerciseData = {
        type: selectedExercise,
        category: 'Lift',
        sets: sets.map(s => ({ reps: parseInt(s.reps, 10), weight: parseFloat(s.weight) }))
      };
    } else if (exerciseCategory === 'Stretch') {
      exerciseData = {
        type: selectedExercise,
        category: 'Stretch',
        sets: sets.map(s => ({ duration: parseInt(s.duration, 10) }))
      };
    } else if (exerciseCategory === 'Cardio') {
      exerciseData = {
        type: selectedExercise,
        category: 'Cardio',
        duration: parseInt(duration, 10)
      };
    }

    try {
      const response = await apiLogExercise(currentUser.id, exerciseData);
      if (response.success && response.user) {
        updateUser(response.user);
        setMessage('Exercise logged successfully!');
        if (onLogSuccess) onLogSuccess();
        resetForm();
      } else {
        setError(response.message || 'Error logging exercise.');
      }
    } catch (err) {
      setError(err.message || 'Error logging exercise.');
    }
  };

  return (
    <div className="w-full max-w-lg p-4">
      <h3 className="text-2xl font-bold text-center text-yellow-400 mb-6">Log New Exercise</h3>
      <form onSubmit={handleSubmit} className="space-y-5">
        <div>
          <label htmlFor="categorySelect" className="block text-sm font-medium text-gray-300 mb-1">Exercise Category:</label>
          <select id="categorySelect" value={exerciseCategory} onChange={(e) => setExerciseCategory(e.target.value)}
            className="block w-full px-3 py-2 bg-gray-700 border border-gray-600 rounded-md shadow-sm text-white focus:outline-none focus:ring-yellow-500 focus:border-yellow-500 sm:text-sm">
            <option value="">-- Select Category --</option>
            <option value="Lift">Lift</option>
            <option value="Stretch">Stretch</option>
            <option value="Cardio">Cardio</option>
          </select>
        </div>

        {exerciseCategory && (
          <div>
            <label htmlFor="exerciseSelect" className="block text-sm font-medium text-gray-300 mb-1">Exercise:</label>
            <select id="exerciseSelect" value={selectedExercise} onChange={(e) => setSelectedExercise(e.target.value)}
              className="block w-full px-3 py-2 bg-gray-700 border border-gray-600 rounded-md shadow-sm text-white focus:outline-none focus:ring-yellow-500 focus:border-yellow-500 sm:text-sm">
              <option value="">-- Select Exercise --</option>
              {filteredExercises.map((ex) => <option key={ex.name} value={ex.name}>{ex.name}</option>)}
            </select>
          </div>
        )}

        {exerciseCategory === 'Lift' && sets.map((set, index) => (
          <div key={index} className="p-2 border border-gray-600 rounded">
            <label className="block text-sm font-medium text-gray-300 mb-1">Set {index + 1}</label>
            <div className="flex space-x-2">
              <input type="number" placeholder="Reps" value={set.reps || ''} onChange={(e) => handleSetChange(index, 'reps', e.target.value)}
                className="block w-full px-3 py-2 bg-gray-700 border border-gray-600 rounded-md text-white" />
              <input type="number" placeholder="Weight (lbs)" value={set.weight || ''} onChange={(e) => handleSetChange(index, 'weight', e.target.value)}
                className="block w-full px-3 py-2 bg-gray-700 border border-gray-600 rounded-md text-white" />
            </div>
          </div>
        ))}

        {exerciseCategory === 'Stretch' && sets.map((set, index) => (
          <div key={index} className="p-2 border border-gray-600 rounded">
            <label className="block text-sm font-medium text-gray-300 mb-1">Set {index + 1}</label>
            <input type="number" placeholder="Duration (seconds)" value={set.duration || ''} onChange={(e) => handleSetChange(index, 'duration', e.target.value)}
              className="block w-full px-3 py-2 bg-gray-700 border border-gray-600 rounded-md text-white" />
          </div>
        ))}

        {(exerciseCategory === 'Lift' || exerciseCategory === 'Stretch') && sets.length < 6 && (
          <button type="button" onClick={handleAddSet}
            className="w-full flex justify-center py-2 px-4 border border-dashed border-gray-500 rounded-md text-sm font-medium text-gray-300 hover:bg-gray-700">
            Add Set
          </button>
        )}

        {exerciseCategory === 'Cardio' && (
          <div>
            <label className="block text-sm font-medium text-gray-300 mb-1">Duration (minutes)</label>
            <input type="number" value={duration} onChange={(e) => setDuration(e.target.value)}
              className="block w-full px-3 py-2 bg-gray-700 border border-gray-600 rounded-md text-white" />
          </div>
        )}

        <button type="submit"
          className="w-full flex justify-center py-2.5 px-4 border border-transparent rounded-md shadow-sm text-sm font-medium text-black bg-yellow-500 hover:bg-yellow-600 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-offset-gray-800 focus:ring-yellow-500 transition-transform transform hover:scale-105">
          Log Exercise
        </button>
      </form>
      {message && <p className="mt-4 text-center text-green-400">{message}</p>}
    </div>
  );
};
export default ExerciseLogForm;
