import React, { useState } from 'react';
import { useGlobalState } from '../context/GlobalState';
import { logExercise as apiLogExercise } from '../services/api';

const ExerciseLogForm = ({ onLogSuccess }) => {
  const { currentUser, exercises, setError, clearError, loginUser } = useGlobalState();
  const [selectedExercise, setSelectedExercise] = useState('');
  const [sets, setSets] = useState('');
  const [reps, setReps] = useState('');
  const [weight, setWeight] = useState('');
  const [message, setMessage] = useState('');

  if (!currentUser) return <p className="text-center text-gray-400">Please login to log exercises.</p>;
  if (!exercises || exercises.length === 0) return <p className="text-center text-gray-400">Exercise list not available.</p>;

  const handleSubmit = async (e) => {
    e.preventDefault(); clearError(); setMessage('');
    console.log('[XP LOG] Exercise log form submitted.');
    if (!selectedExercise) { setError("Please select an exercise."); return; }
    if (sets === '' || reps === '' || weight === '') { setError("All fields (sets, reps, weight) are required."); return; }
    const numSets = parseInt(sets), numReps = parseInt(reps), numWeight = parseFloat(weight);
    if (isNaN(numSets) || numSets <= 0 || isNaN(numReps) || numReps <= 0 || isNaN(numWeight) || numWeight < 0) {
      setError("Enter valid numbers: sets/reps > 0, weight >= 0."); return;
    }
    const exerciseData = { type: selectedExercise, sets: numSets, reps: numReps, weight: numWeight };
    console.log('[XP LOG] Exercise data to be logged:', exerciseData);
    try {
      const response = await apiLogExercise(currentUser.id, exerciseData);
      if (response.success && response.exercise) {
        setMessage(response.message || 'Exercise logged!');
        const updatedUser = { ...currentUser, exerciseHistory: [...(currentUser.exerciseHistory || []), response.exercise] };
        loginUser(updatedUser); // Update global state
        setSelectedExercise(''); setSets(''); setReps(''); setWeight('');
        if (onLogSuccess) onLogSuccess();
      } else { setError(response.message || 'Failed to log exercise.'); }
    } catch (err) { setError(err.message || 'Error logging exercise.'); }
  };

  return (
    <div className="w-full max-w-lg p-4">
      <h3 className="text-2xl font-bold text-center text-yellow-400 mb-6">Log New Exercise</h3>
      <form onSubmit={handleSubmit} className="space-y-5">
        <div>
          <label htmlFor="exerciseSelect" className="block text-sm font-medium text-gray-300 mb-1">Exercise Type:</label>
          <select id="exerciseSelect" value={selectedExercise} onChange={(e) => setSelectedExercise(e.target.value)}
            className="block w-full px-3 py-2 bg-gray-700 border border-gray-600 rounded-md shadow-sm text-white focus:outline-none focus:ring-yellow-500 focus:border-yellow-500 sm:text-sm">
            <option value="">-- Select Exercise --</option>
            {exercises.map((ex, index) => <option key={ex.id || ex.name || index} value={ex.name}>{ex.name}</option>)}
          </select>
        </div>
        {[ {label: 'Sets', id: 'setsInput', value: sets, setter: setSets, placeholder: 'Enter sets', type: 'number'},
           {label: 'Reps', id: 'repsInput', value: reps, setter: setReps, placeholder: 'Enter reps', type: 'number'},
           {label: 'Weight (kg/lbs)', id: 'weightInput', value: weight, setter: setWeight, placeholder: 'Enter weight', type: 'number', step: '0.1'}
        ].map(f => (
          <div key={f.id}>
            <label htmlFor={f.id} className="block text-sm font-medium text-gray-300 mb-1">{f.label}:</label>
            <input type={f.type} id={f.id} value={f.value} onChange={(e) => f.setter(e.target.value)} placeholder={f.placeholder} step={f.step || null}
                   className="block w-full px-3 py-2 bg-gray-700 border border-gray-600 rounded-md shadow-sm text-white placeholder-gray-400 focus:outline-none focus:ring-yellow-500 focus:border-yellow-500 sm:text-sm" />
          </div>
        ))}
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
