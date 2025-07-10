import React, { useState, useEffect } from 'react';
import { Link, Navigate } from 'react-router-dom';
import { useGlobalState } from '../context/GlobalState';
import PlayerCard from '../components/PlayerCard';
import ExerciseLogForm from '../components/ExerciseLogForm';
import ExerciseHistory from '../components/ExerciseHistory';
import guildBg from '../../assets/guild-bg.png';

const GuildPage = () => {
  const { currentUser, error: globalError, clearError } = useGlobalState();
  // currentView now manages states within the logged-in Guild experience
  const [currentView, setCurrentView] = useState('loggedInMain');

  useEffect(() => {
    // If currentUser is available, ensure errors are cleared and view is main.
    // This effect might be redundant if App.jsx handles redirection correctly,
    // but serves as a local reset if the component is somehow rendered while logged in.
    if (currentUser) {
      clearError();
      // If not already on a specific sub-view, default to loggedInMain
      if (currentView !== 'playerCard' && currentView !== 'logExercise' && currentView !== 'exerciseHistory') {
        setCurrentView('loggedInMain');
      }
    }
    // No 'else' needed here as redirection for non-logged-in users will be handled by App.jsx's ProtectedRoute
  }, [currentUser, clearError, currentView]);

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
  // primaryButtonStyle is no longer needed for login/register
  const secondaryButtonStyle = `${baseButtonStyle} bg-gray-600 hover:bg-gray-700 text-white focus:ring-gray-500`;
  const backButtonStyle = `${baseButtonStyle} bg-gray-700 hover:bg-gray-800 text-yellow-400 focus:ring-gray-600`;

  // If currentUser is not available, App.jsx should redirect.
  // As a fallback, or if direct access is attempted and somehow bypasses App.jsx logic (unlikely with proper setup),
  // this ensures nothing is rendered or navigates away.
  if (!currentUser) {
    // This Navigate component will ideally be handled by ProtectedRoute in App.jsx,
    // but it's a safeguard. In a strict setup, you might return null or a loading spinner
    // expecting App.jsx to handle the redirection.
    // For this step, we assume App.jsx will handle it, so this component focuses on the logged-in state.
    // However, returning <Navigate to="/" /> here would be a more robust direct protection.
    // Let's return a minimal message, assuming ProtectedRoute handles the redirect.
    return (
        <div style={pageDynamicStyle} className="relative flex flex-col items-center justify-center p-5 text-white">
            <p>Loading Guild... If you are not redirected, please <Link to="/" className="text-yellow-400 hover:text-yellow-300">return to Town</Link> to log in.</p>
        </div>
    );
  }

  const renderLoggedInContent = () => {
    switch (currentView) {
      case 'loggedInMain':
        return (
          <div>
            <h1 className="text-3xl font-bold mb-4 text-yellow-400">Adventurer's Guild</h1>
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
        // This case should ideally not be reached if currentView is managed properly.
        // Reset to 'loggedInMain' as a fallback.
        setCurrentView('loggedInMain');
        return null;
    }
  };

  return (
    <div style={pageDynamicStyle} className="relative flex flex-col items-center justify-center p-5 text-white overflow-hidden">
      <div className="absolute inset-0 bg-black bg-opacity-50 z-0" />
      <div className="relative z-10 bg-gray-900 bg-opacity-80 p-6 sm:p-8 rounded-xl shadow-2xl w-full max-w-2xl lg:max-w-3xl backdrop-blur-sm">
        {/* Global errors can still be relevant for actions within the guild for a logged-in user */}
        {globalError && (
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
        {renderLoggedInContent()}
        <div className="mt-8 text-center">
          <Link to="/" className={backButtonStyle}>Back to Town</Link>
        </div>
      </div>
    </div>
  );
};

export default GuildPage;
