import React, { useState } from 'react';
import { loginUser as apiLoginUser } from '../services/api';
import { useGlobalState } from '../context/GlobalState';

const LoginForm = ({ onLoginSuccess, onSwitchToRegister }) => {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const { loginUser, setError, clearError } = useGlobalState();

  const handleSubmit = async (e) => {
    e.preventDefault();
    clearError();
    try {
      const response = await apiLoginUser({ email, password });
      if (response.success && response.user) {
        loginUser(response.user);
        if (onLoginSuccess) onLoginSuccess();
      } else {
        setError(response.message || 'Login failed.');
      }
    } catch (err) {
      setError(err.message || 'An error occurred during login.');
    }
  };

  return (
    <div className="w-full max-w-md p-4">
      <h2 className="text-2xl font-bold text-center text-yellow-400 mb-6">Login</h2>
      <form onSubmit={handleSubmit} className="space-y-6">
        <div>
          <label htmlFor="login-email" className="block text-sm font-medium text-gray-300">Email:</label>
          <input
            type="email"
            id="login-email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            placeholder="Enter email"
            className="mt-1 block w-full px-3 py-2 bg-gray-700 border border-gray-600 rounded-md shadow-sm text-white placeholder-gray-400 focus:outline-none focus:ring-yellow-500 focus:border-yellow-500 sm:text-sm"
            required
          />
        </div>
        <div>
          <label htmlFor="login-password" className="block text-sm font-medium text-gray-300">Password:</label>
          <input
            type="password"
            id="login-password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            placeholder="Enter password"
            className="mt-1 block w-full px-3 py-2 bg-gray-700 border border-gray-600 rounded-md shadow-sm text-white placeholder-gray-400 focus:outline-none focus:ring-yellow-500 focus:border-yellow-500 sm:text-sm"
            required
          />
        </div>
        <button
          type="submit"
          className="w-full flex justify-center py-2 px-4 border border-transparent rounded-md shadow-sm text-sm font-medium text-black bg-yellow-500 hover:bg-yellow-600 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-offset-gray-800 focus:ring-yellow-500 transition-transform transform hover:scale-105"
        >
          Login
        </button>
      </form>
      {onSwitchToRegister && (
        <button
          type="button"
          onClick={onSwitchToRegister}
          className="mt-4 w-full text-sm text-yellow-400 hover:text-yellow-300 text-center"
        >
          Don't have an account? Register
        </button>
      )}
    </div>
  );
};
export default LoginForm;
