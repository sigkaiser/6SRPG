import React, { useState } from 'react';
import { registerUser } from '../services/api'; // Adjust path as needed
import { useGlobalState } from '../context/GlobalState'; // Adjust path as needed

const RegistrationForm = ({ onRegistrationSuccess, onSwitchToLogin }) => {
  const [username, setUsername] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [message, setMessage] = useState('');
  const { setError, clearError } = useGlobalState();

  const handleSubmit = async (e) => {
    e.preventDefault();
    setMessage('');
    clearError();

    if (!username || !email || !password) {
      setError("All fields are required.");
      return;
    }

    try {
      const response = await registerUser({ username, email, password });
      if (response.success) {
        setMessage(response.message || 'Registration successful! Please login.');
        if (onRegistrationSuccess) onRegistrationSuccess();
      } else {
        setError(response.message || 'Registration failed.');
      }
    } catch (err) {
      setError(err.message || 'An error occurred during registration.');
    }
  };

  return (
    <div>
      <h2>Register Account</h2>
      <form onSubmit={handleSubmit}>
        <div>
          <label htmlFor="reg-username">Username:</label>
          <input
            type="text"
            id="reg-username"
            value={username}
            onChange={(e) => setUsername(e.target.value)}
            placeholder="Enter username"
          />
        </div>
        <div>
          <label htmlFor="reg-email">Email:</label>
          <input
            type="email"
            id="reg-email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            placeholder="Enter email"
          />
        </div>
        <div>
          <label htmlFor="reg-password">Password:</label>
          <input
            type="password"
            id="reg-password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            placeholder="Enter password"
          />
        </div>
        <button type="submit">Register</button>
      </form>
      {message && <p style={{ color: 'green' }}>{message}</p>}
      {/* Error messages will be handled by a global error display component or similar, using state.error from context */}
      {onSwitchToLogin && (
        <button type="button" onClick={onSwitchToLogin}>
          Already have an account? Login
        </button>
      )}
    </div>
  );
};

export default RegistrationForm;
