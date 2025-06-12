import React, { useState } from 'react';
import { useGlobalState } from '../context/GlobalState';
import { logExercise as apiLogExercise } from '../services/api'; // Assuming api.js is in src/services/

const ExerciseLogForm = ({ onLogSuccess }) => {
  const { currentUser, exercises, setError, clearError, loginUser } = useGlobalState(); // loginUser to update user data after logging exercise
  const [selectedExercise, setSelectedExercise] = useState('');
  const [sets, setSets] = useState('');
  const [reps, setReps] = useState('');
  const [weight, setWeight] = useState('');
  const [message, setMessage] = useState('');

  if (!currentUser) {
    return <p>Please login to log exercises.</p>;
  }

  if (!exercises || exercises.length === 0) {
    return <p>Exercise list not loaded or empty. Cannot log exercises.</p>;
  }

  const handleSubmit = async (e) => {
    e.preventDefault();
    clearError();
    setMessage('');

    if (!selectedExercise) {
      setError("Please select an exercise type.");
      return;
    }
    if (sets === '' || reps === '' || weight === '') {
      setError("Please fill in sets, reps, and weight.");
      return;
    }

    const numSets = parseInt(sets);
    const numReps = parseInt(reps);
    const numWeight = parseFloat(weight);

    if (isNaN(numSets) || numSets <= 0 || isNaN(numReps) || numReps <= 0 || isNaN(numWeight) || numWeight < 0) {
      setError("Please enter valid numbers for sets, reps, and weight. Sets and reps must be > 0. Weight >= 0.");
      return;
    }

    const exerciseLogEntry = {
      type: selectedExercise,
      sets: numSets,
      reps: numReps,
      weight: numWeight,
      // date: new Date().toISOString(), // Backend or API service can handle date
    };

    try {
      // The mock apiLogExercise in api.js returns { success, message, exercise (newly logged) }
      // A real backend might return the updated user object or just the new exercise entry.
      const response = await apiLogExercise(currentUser.id, exerciseLogEntry);
      if (response.success && response.exercise) {
        setMessage(response.message || 'Exercise logged successfully!');

        // Update currentUser in global state with the new exercise history if backend doesn't send full user
        // This is a common pattern if the API only returns the created resource.
        // The mock API currently returns the logged exercise.
        // A more robust solution would be for the backend to return the updated user object.
        const updatedUser = {
            ...currentUser,
            exerciseHistory: [...(currentUser.exerciseHistory || []), response.exercise],
            // Potentially update experience/level here or have backend do it and return updated user
        };
        loginUser(updatedUser); // Re-use loginUser to update the user state.

        setSelectedExercise('');
        setSets('');
        setReps('');
        setWeight('');
        if (onLogSuccess) onLogSuccess();
      } else {
        setError(response.message || 'Failed to log exercise.');
      }
    } catch (err) {
      setError(err.message || 'An error occurred while logging exercise.');
    }
  };

  const formStyle = {
    display: 'flex',
    flexDirection: 'column',
    gap: '10px', // Space between form elements
    alignItems: 'center', // Center form elements
  };

  const inputStyle = {
    padding: '8px',
    borderRadius: '4px',
    border: '1px solid #ccc',
    width: '80%', // Responsive width for inputs
    maxWidth: '300px', // Max width
  };

  const labelStyle = {
    fontWeight: 'bold',
    marginBottom: '-5px', // Adjust label position relative to input
  };

  return (
    <div>
      <h3>Log New Exercise</h3>
      <form onSubmit={handleSubmit} style={formStyle}>
        <div>
          <label htmlFor="exerciseSelect" style={labelStyle}>Exercise Type:</label>
          <select
            id="exerciseSelect"
            value={selectedExercise}
            onChange={(e) => setSelectedExercise(e.target.value)}
            style={inputStyle}
          >
            <option value="">-- Select Exercise --</option>
            {exercises.map((ex, index) => (
              // Assuming exercise objects have a 'name' property, like in old script.js
              // and a unique 'id' or use index as key for rendering if names can repeat.
              // The provided exercises.json has 'name'.
              <option key={ex.id || ex.name || index} value={ex.name}>{ex.name}</option>
            ))}
          </select>
        </div>
        <div>
          <label htmlFor="setsInput" style={labelStyle}>Sets:</label>
          <input
            type="number"
            id="setsInput"
            value={sets}
            onChange={(e) => setSets(e.target.value)}
            placeholder="Enter sets"
            style={inputStyle}
          />
        </div>
        <div>
          <label htmlFor="repsInput" style={labelStyle}>Reps:</label>
          <input
            type="number"
            id="repsInput"
            value={reps}
            onChange={(e) => setReps(e.target.value)}
            placeholder="Enter reps"
            style={inputStyle}
          />
        </div>
        <div>
          <label htmlFor="weightInput" style={labelStyle}>Weight (kg/lbs):</label>
          <input
            type="number"
            id="weightInput"
            value={weight}
            onChange={(e) => setWeight(e.target.value)}
            placeholder="Enter weight"
            style={inputStyle}
            step="0.1" // Allow decimal for weight
          />
        </div>
        <button type="submit" style={{...inputStyle, backgroundColor: 'gold', color: 'black', fontWeight: 'bold', cursor: 'pointer', marginTop: '10px' }}>
          Log Exercise
        </button>
      </form>
      {message && <p style={{ color: 'green', marginTop: '10px' }}>{message}</p>}
      {/* Global errors are handled by GuildPage or Navbar */}
    </div>
  );
};

export default ExerciseLogForm;
