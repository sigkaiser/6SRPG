import React, { useState } from 'react';
import { registerUser } from '../services/api';
import { useGlobalState } from '../context/GlobalState';

const RegistrationForm = ({ onRegistrationSuccess, onSwitchToLogin }) => {
  const [username, setUsername] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [message, setMessage] = useState(''); // For success message
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
        setMessage(response.message || 'Registration successful! Please login.'); // Keep this message for user
        if (onRegistrationSuccess) onRegistrationSuccess(); // This will trigger alert and view switch in GuildPage
      } else {
        setError(response.message || 'Registration failed.');
      }
    } catch (err) {
      setError(err.message || 'An error occurred during registration.');
    }
  };

  return (
    <div className="w-full max-w-md p-4">
      <h2 className="text-2xl font-bold text-center text-yellow-400 mb-6">Register Account</h2>
      <form onSubmit={handleSubmit} className="space-y-6">
        <div>
          <label htmlFor="reg-username" className="block text-sm font-medium text-gray-300">Username:</label>
          <input type="text" id="reg-username" value={username} onChange={(e) => setUsername(e.target.value)} placeholder="Enter username"
            className="mt-1 block w-full px-3 py-2 bg-gray-700 border border-gray-600 rounded-md shadow-sm text-white placeholder-gray-400 focus:outline-none focus:ring-yellow-500 focus:border-yellow-500 sm:text-sm" required />
        </div>
        <div>
          <label htmlFor="reg-email" className="block text-sm font-medium text-gray-300">Email:</label>
          <input type="email" id="reg-email" value={email} onChange={(e) => setEmail(e.target.value)} placeholder="Enter email"
            className="mt-1 block w-full px-3 py-2 bg-gray-700 border border-gray-600 rounded-md shadow-sm text-white placeholder-gray-400 focus:outline-none focus:ring-yellow-500 focus:border-yellow-500 sm:text-sm" required />
        </div>
        <div>
          <label htmlFor="reg-password" className="block text-sm font-medium text-gray-300">Password:</label>
          <input type="password" id="reg-password" value={password} onChange={(e) => setPassword(e.target.value)} placeholder="Enter password"
            className="mt-1 block w-full px-3 py-2 bg-gray-700 border border-gray-600 rounded-md shadow-sm text-white placeholder-gray-400 focus:outline-none focus:ring-yellow-500 focus:border-yellow-500 sm:text-sm" required />
        </div>
        <button type="submit"
          className="w-full flex justify-center py-2 px-4 border border-transparent rounded-md shadow-sm text-sm font-medium text-black bg-yellow-500 hover:bg-yellow-600 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-offset-gray-800 focus:ring-yellow-500 transition-transform transform hover:scale-105">
          Register
        </button>
      </form>
      {message && <p className="mt-4 text-center text-green-400">{message}</p>}
      {onSwitchToLogin && (
        <button type="button" onClick={onSwitchToLogin} className="mt-4 w-full text-sm text-yellow-400 hover:text-yellow-300 text-center">
          Already have an account? Login
        </button>
      )}
    </div>
  );
};
export default RegistrationForm;
