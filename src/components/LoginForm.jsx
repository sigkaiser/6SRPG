import React, { useState } from 'react';
import { loginUser as apiLoginUser } from '../services/api'; // Adjust path as needed
import { useGlobalState } from '../context/GlobalState'; // Adjust path as needed

const LoginForm = ({ onLoginSuccess, onSwitchToRegister }) => {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const { loginUser, setError, clearError } = useGlobalState(); // loginUser from context

  const handleSubmit = async (e) => {
    e.preventDefault();
    clearError();
    try {
      const response = await apiLoginUser({ email, password }); // Call API service
      if (response.success && response.user) {
        loginUser(response.user); // Update global state
        if (onLoginSuccess) onLoginSuccess();
      } else {
        setError(response.message || 'Login failed.');
      }
    } catch (err) {
      setError(err.message || 'An error occurred during login.');
    }
  };

  return (
    <div>
      <h2>Login</h2>
      <form onSubmit={handleSubmit}>
        <div>
          <label htmlFor="login-email">Email:</label>
          <input
            type="email"
            id="login-email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            placeholder="Enter email"
          />
        </div>
        <div>
          <label htmlFor="login-password">Password:</label>
          <input
            type="password"
            id="login-password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            placeholder="Enter password"
          />
        </div>
        <button type="submit">Login</button>
      </form>
      {/* Error messages will be handled by a global error display component or similar */}
      {onSwitchToRegister && (
        <button type="button" onClick={onSwitchToRegister}>
          Don't have an account? Register
        </button>
      )}
    </div>
  );
};

export default LoginForm;
