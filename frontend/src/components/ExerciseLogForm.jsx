import React, { useState, useMemo } from 'react';
import { useGlobalState } from '../context/GlobalState';
import { logExercise as apiLogExercise } from '../services/api';

const DURATION_DOSE_TYPES = ['time', 'distance', 'intervals', 'holds'];
const REP_DOSE_TYPES = ['reps', 'contacts'];

const DOSE_LABELS = {
  reps: 'Reps',
  contacts: 'Contacts',
  time: 'Duration (seconds)',
  distance: 'Distance / Duration Value',
  intervals: 'Interval Duration (seconds)',
  holds: 'Hold Duration (seconds)',
};

const ExerciseLogForm = ({ onLogSuccess }) => {
  const { currentUser, exercises, setError, clearError, updateUser } = useGlobalState();
  const [selectedExerciseId, setSelectedExerciseId] = useState('');
  const [sets, setSets] = useState([{ reps: '', weight: '', duration: '' }]);
  const [message, setMessage] = useState('');

  const sortedExercises = useMemo(
    () => [...(exercises || [])].sort((a, b) => a.name.localeCompare(b.name)),
    [exercises]
  );

  const selectedExercise = useMemo(
    () => sortedExercises.find((exercise) => exercise.id === selectedExerciseId) || null,
    [sortedExercises, selectedExerciseId]
  );

  const doseType = (selectedExercise?.doseType || '').toLowerCase();
  const usesDuration = DURATION_DOSE_TYPES.includes(doseType);
  const usesReps = REP_DOSE_TYPES.includes(doseType);

  const resetForm = () => {
    setSelectedExerciseId('');
    setSets([{ reps: '', weight: '', duration: '' }]);
    setMessage('');
  };

  const handleSelectExercise = (exerciseId) => {
    setSelectedExerciseId(exerciseId);
    setSets([{ reps: '', weight: '', duration: '' }]);
    setMessage('');
  };

  const handleAddSet = () => {
    if (sets.length < 6) {
      setSets([...sets, { reps: '', weight: '', duration: '' }]);
    }
  };

  const handleSetChange = (index, field, value) => {
    const newSets = [...sets];
    newSets[index][field] = value;
    setSets(newSets);
  };

  if (!currentUser) return <p className="text-center text-gray-400">Please login to log exercises.</p>;
  if (!exercises || exercises.length === 0) return <p className="text-center text-gray-400">Exercise list not available.</p>;

  const handleSubmit = async (e) => {
    e.preventDefault();
    clearError();
    setMessage('');

    if (!selectedExercise) {
      setError('Please select an exercise.');
      return;
    }

    let payloadSets = [];

    if (usesDuration) {
      payloadSets = sets
        .map((set) => ({ duration: Number.parseInt(set.duration, 10) }))
        .filter((set) => Number.isFinite(set.duration) && set.duration > 0);
      if (!payloadSets.length) {
        setError('Please enter at least one valid duration set.');
        return;
      }
    } else if (usesReps) {
      payloadSets = sets
        .map((set) => ({
          reps: Number.parseInt(set.reps, 10),
          weight: set.weight === '' ? undefined : Number.parseFloat(set.weight),
        }))
        .filter((set) => Number.isFinite(set.reps) && set.reps > 0);
      if (!payloadSets.length) {
        setError('Please enter at least one valid rep/contact set.');
        return;
      }
    } else {
      setError(`Unsupported dose type: ${selectedExercise.doseType}`);
      return;
    }

    const exerciseData = {
      exerciseId: selectedExercise.id,
      sets: payloadSets,
    };

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
          <label htmlFor="exerciseSelect" className="block text-sm font-medium text-gray-300 mb-1">Exercise:</label>
          <select
            id="exerciseSelect"
            value={selectedExerciseId}
            onChange={(e) => handleSelectExercise(e.target.value)}
            className="block w-full px-3 py-2 bg-gray-700 border border-gray-600 rounded-md shadow-sm text-white focus:outline-none focus:ring-yellow-500 focus:border-yellow-500 sm:text-sm"
          >
            <option value="">-- Select Exercise --</option>
            {sortedExercises.map((exercise) => (
              <option key={exercise.id} value={exercise.id}>{exercise.name}</option>
            ))}
          </select>
        </div>

        {selectedExercise && (
          <p className="text-sm text-gray-300">
            Modality: <span className="text-yellow-300">{selectedExercise.modality}</span> | Dose Type: <span className="text-yellow-300">{selectedExercise.doseType}</span>
          </p>
        )}

        {selectedExercise && sets.map((set, index) => (
          <div key={index} className="p-2 border border-gray-600 rounded">
            <label className="block text-sm font-medium text-gray-300 mb-1">Set {index + 1}</label>
            <div className="flex space-x-2">
              {usesReps && (
                <input
                  type="number"
                  placeholder={DOSE_LABELS[doseType] || 'Reps'}
                  value={set.reps}
                  onChange={(e) => handleSetChange(index, 'reps', e.target.value)}
                  className="block w-full px-3 py-2 bg-gray-700 border border-gray-600 rounded-md text-white"
                />
              )}
              {usesReps && doseType === 'reps' && (
                <input
                  type="number"
                  placeholder="Weight"
                  value={set.weight}
                  onChange={(e) => handleSetChange(index, 'weight', e.target.value)}
                  className="block w-full px-3 py-2 bg-gray-700 border border-gray-600 rounded-md text-white"
                />
              )}
              {usesDuration && (
                <input
                  type="number"
                  placeholder={DOSE_LABELS[doseType] || 'Duration (seconds)'}
                  value={set.duration}
                  onChange={(e) => handleSetChange(index, 'duration', e.target.value)}
                  className="block w-full px-3 py-2 bg-gray-700 border border-gray-600 rounded-md text-white"
                />
              )}
            </div>
          </div>
        ))}

        {selectedExercise && sets.length < 6 && (
          <button
            type="button"
            onClick={handleAddSet}
            className="w-full flex justify-center py-2 px-4 border border-dashed border-gray-500 rounded-md text-sm font-medium text-gray-300 hover:bg-gray-700"
          >
            Add Set
          </button>
        )}

        <button
          type="submit"
          className="w-full flex justify-center py-2.5 px-4 border border-transparent rounded-md shadow-sm text-sm font-medium text-black bg-yellow-500 hover:bg-yellow-600 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-offset-gray-800 focus:ring-yellow-500 transition-transform transform hover:scale-105"
        >
          Log Exercise
        </button>
      </form>
      {message && <p className="mt-4 text-center text-green-400">{message}</p>}
    </div>
  );
};

export default ExerciseLogForm;
