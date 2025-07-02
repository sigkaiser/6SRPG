import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { useGlobalState } from '../context/GlobalState';
import LoginForm from '../components/LoginForm';
import RegistrationForm from '../components/RegistrationForm';
import PlayerCard from '../components/PlayerCard';
import ExerciseLogForm from '../components/ExerciseLogForm';
import ExerciseHistory from '../components/ExerciseHistory';
import guildBg from '../../assets/guild-bg.png';

const GuildPage = () => {
  const { currentUser, error: globalError, clearError } = useGlobalState();
  const [currentView, setCurrentView] = useState('options');

  useEffect(() => {
    if (currentUser) {
      setCurrentView('loggedInMain');
      clearError();
    } else {
      setCurrentView('options');
    }
  }, [currentUser]);

  const pageDynamicStyle = {
    backgroundImage: `url(${guildBg})`,
    backgroundSize: 'cover',
    backgroundPosition: 'center center',
    backgroundRepeat: 'no-repeat',
    height: '100vh',
    width: '100vw',
  };

  const baseButtonStyle =
    'inline-block py-2 px-5 mx-2 my-2 text-base font-semibold rounded-lg shadow-md focus:outline-none focus:ring-2 focus:ring-opacity-75 transition-transform transform hover:scale-105';
  const primaryButtonStyle = `${baseButtonStyle} bg-yellow-500 hover:bg-yellow-600 text-black focus:ring-yellow-400`;
  const secondaryButtonStyle = `${baseButtonStyle} bg-gray-600 hover:bg-gray-700 text-white focus:ring-gray-500`;
  const backButtonStyle = `${baseButtonStyle} bg-gray-700 hover:bg-gray-800 text-yellow-400 focus:ring-gray-600`;

  const renderContent = () => {
    if (!currentUser) {
      switch (currentView) {
        case 'login':
          return (
            <LoginForm
              onLoginSuccess={() => {}}
              onSwitchToRegister={() => {
                setCurrentView('register');
                clearError();
              }}
            />
          );
        case 'register':
          return (
            <RegistrationForm
              onRegistrationSuccess={() => {
                alert('Registration successful! Please login.');
                setCurrentView('login');
                clearError();
              }}
              onSwitchToLogin={() => {
                setCurrentView('login');
                clearError();
              }}
            />
          );
        default:
          return (
            <>
              <h1 className="text-3xl font-bold mb-4 text-yellow-400">Adventurer's Guild</h1>
              <p className="text-lg mb-6">Welcome! Please log in or register to access guild services.</p>
              <div>
                <button className={primaryButtonStyle} onClick={() => { setCurrentView('login'); clearError(); }}>Login</button>
                <button className={primaryButtonStyle} onClick={() => { setCurrentView('register'); clearError(); }}>Register</button>
              </div>
            </>
          );
      }
    } else {
      switch (currentView) {
        case 'loggedInMain':
          return (
            <div>
              <h2 className="text-2xl font-semibold mb-3">
                Welcome back, <span className="text-yellow-400">{currentUser.username}</span>!
              </h2>
              <p className="text-md mb-6">What would you like to do?</p>
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
                <button className={secondaryButtonStyle} onClick={() => setCurrentView('playerCard')}>View Player Card</button>
                <button className={secondaryButtonStyle} onClick={() => setCurrentView('logExercise')}>Log Exercise</button>
                <button className={secondaryButtonStyle} onClick={() => setCurrentView('exerciseHistory')}>View Exercise History</button>
              </div>
            </div>
          );
        case 'playerCard':
          return (
            <div>
              <PlayerCard />
              <button className={backButtonStyle + ' mt-4'} onClick={() => setCurrentView('loggedInMain')}>Back to Guild Menu</button>
            </div>
          );
        case 'logExercise':
          return (
            <div>
              <ExerciseLogForm onLogSuccess={() => setCurrentView('loggedInMain')} />
              <button className={backButtonStyle + ' mt-4'} onClick={() => setCurrentView('loggedInMain')}>Back to Guild Menu</button>
            </div>
          );
        case 'exerciseHistory':
          return (
            <div>
              <ExerciseHistory />
              <button className={backButtonStyle + ' mt-4'} onClick={() => setCurrentView('loggedInMain')}>Back to Guild Menu</button>
            </div>
          );
        default:
          setCurrentView('loggedInMain');
          return null;
      }
    }
  };

  return (
    <div style={pageDynamicStyle} className="relative flex flex-col items-center justify-center p-5 text-white overflow-hidden">
      {/* Dimmed overlay for contrast */}
      <div className="absolute inset-0 bg-black bg-opacity-50 z-0" />

      {/* Main content */}
      <div className="relative z-10 bg-gray-900 bg-opacity-80 p-6 sm:p-8 rounded-xl shadow-2xl w-full max-w-2xl lg:max-w-3xl backdrop-blur-sm">
        {globalError && currentView !== 'loggedInMain' && (
          <div className="bg-red-600 bg-opacity-90 border border-red-700 text-white p-3 mb-5 rounded-md shadow-lg">
            <p className="font-semibold">Error: {globalError}</p>
            <button
              onClick={clearError}
              className={`${secondaryButtonStyle} bg-red-500 hover:bg-red-400 text-xs mt-2 py-1 px-2`}
            >
              Dismiss
            </button>
          </div>
        )}
        {renderContent()}
        <div className="mt-8 text-center">
          <Link to="/" className={backButtonStyle}>Back to Town</Link>
        </div>
      </div>
    </div>
  );
};

export default GuildPage;
