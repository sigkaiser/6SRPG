import React, { useState } from 'react';
import { useGlobalState } from '../context/GlobalState';
import LoginForm from '../components/LoginForm';
import RegistrationForm from '../components/RegistrationForm';
import CenteredLayout from '../components/CenteredLayout';
import townMap3 from '../../assets/town-map3.png';
import panel2 from '../../assets/panel2.png';

const TownPage = () => {
  const { currentUser, error: globalError, clearError, setError } = useGlobalState();
  const [authView, setAuthView] = useState(null); // 'login', 'register', or null
  const [registrationSuccessMessage, setRegistrationSuccessMessage] = useState('');

  const handleShowLogin = () => {
    clearError();
    setRegistrationSuccessMessage('');
    setAuthView('login');
  };

  const handleShowRegister = () => {
    clearError();
    setRegistrationSuccessMessage('');
    setAuthView('register');
  };

  const handleLoginSuccess = () => {
    setAuthView(null);
    clearError();
    // currentUser will be updated by GlobalState, triggering re-render
  };

  const handleRegistrationSuccess = () => {
    setRegistrationSuccessMessage('Registration successful! Please login.');
    setAuthView('login'); // Switch to login form
    clearError();
  };

  const renderContentArea = () => {
    if (authView === 'login') {
      return (
        <LoginForm
          onLoginSuccess={handleLoginSuccess}
          onSwitchToRegister={() => {
            clearError();
            setRegistrationSuccessMessage('');
            setAuthView('register');
          }}
        />
      );
    }
    if (authView === 'register') {
      return (
        <RegistrationForm
          onRegistrationSuccess={handleRegistrationSuccess}
          onSwitchToLogin={() => {
            clearError();
            setRegistrationSuccessMessage('');
            setAuthView('login');
          }}
        />
      );
    }
    // Default content when no form is shown
    return (
      <div className="text-center">
        <h1 className="text-4xl lg:text-5xl font-bold text-white bg-black bg-opacity-60 px-6 py-3 rounded-lg shadow-xl mb-4">
          Welcome to 6SRPG!
        </h1>
        {!currentUser && (
          <p className="text-lg lg:text-xl text-gray-200 italic bg-black bg-opacity-60 px-4 py-2 rounded-md shadow-lg">
            Please log in or register to begin your adventure.
          </p>
        )}
        {currentUser && (
          <p className="text-lg lg:text-xl text-gray-200 italic bg-black bg-opacity-60 px-4 py-2 rounded-md shadow-lg">
            This is your base of operations. Visit the Guild or brave the Dungeon!
          </p>
        )}
      </div>
    );
  };

  const authButtons = [
    { label: 'Login', onClick: handleShowLogin },
    { label: 'Register', onClick: handleShowRegister },
  ];

  const mainButtons = [
    { label: 'Guild', to: '/guild' },
    { label: 'Dungeon', to: '/dungeon' },
    { label: 'Home', to: '/home' },
  ];

  return (
    <CenteredLayout
      bgImage={townMap3}
      buttons={currentUser ? mainButtons : authButtons}
      renderContent={renderContentArea}
      error={globalError}
      clearError={clearError}
      currentUser={currentUser}
      panel={panel2}
      fontColor="black"
    />
  );
};

export default TownPage;
