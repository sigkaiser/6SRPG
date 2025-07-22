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
  // Default view is null (nothing selected)
  const [currentView, setCurrentView] = useState(null);

  useEffect(() => {
    if (currentUser) {
      clearError();
      // No need to reset currentView to 'loggedInMain' as the sidebar handles navigation.
      // If currentView is not a recognized one, it defaults to 'questBoard' or you can add specific logic.
    }
    // Redirection for non-logged-in users is handled by App.jsx's ProtectedRoute
  }, [currentUser, clearError]);

  const pageDynamicStyle = {
    backgroundImage: `url(${guildBg})`,
    backgroundSize: 'cover',
    backgroundPosition: 'center center',
    backgroundRepeat: 'no-repeat',
    height: '100vh', // Ensure it covers the full viewport height
    width: '100vw',
    display: 'flex', // Using flex to align children (main content wrapper)
    alignItems: 'center', // Vertically center the main content wrapper
    justifyContent: 'center', // Horizontally center the main content wrapper
    overflow: 'hidden', // Prevent scrolling on the body
  };

  const baseButtonStyle =
    'w-full md:w-1/2 mx-auto text-left py-3 px-5 my-1 text-base font-semibold rounded-lg shadow-md focus:outline-none focus:ring-2 focus:ring-opacity-75 transition-transform transform hover:scale-105';
  const sidebarButtonStyle = `w-full h-[140px] bg-panel bg-cover bg-center text-[#d49942] font-crimson-pro font-bold text-2xl flex items-center justify-center`;
  // active style for sidebar buttons can be added if desired, e.g., based on currentView
  // const activeSidebarButtonStyle = `${sidebarButtonStyle} bg-gray-600 ring-2 ring-yellow-500`;
  // const backToTownButtonStyle = `inline-block py-2 px-5 mx-2 my-2 text-base font-semibold rounded-lg shadow-md focus:outline-none focus:ring-2 focus:ring-opacity-75 transition-transform transform hover:scale-105 bg-gray-700 hover:bg-gray-800 text-yellow-400 focus:ring-gray-600`;


  if (!currentUser) {
    return (
        <div style={pageDynamicStyle} className="relative flex flex-col items-center justify-center p-5 text-white">
            <p>Loading Guild... If you are not redirected, please <Link to="/" className="text-yellow-400 hover:text-yellow-300">return to Town</Link> to log in.</p>
        </div>
    );
  }

  const renderContentArea = () => {
    switch (currentView) {
      case 'questBoard':
        return (
          <div className="p-6 bg-gray-100 text-gray-900 rounded-lg shadow-xl">
            <h2 className="text-2xl font-bold mb-4 text-yellow-400">Quest Board</h2>
            <p>This is the Quest Board. Epic adventures await!</p>
            <p className="mt-2 text-sm text-gray-700">(Placeholder content - full implementation coming soon!)</p>
          </div>
        );
      case 'playerCard':
        return <PlayerCard />; // PlayerCard might need internal styling adjustments for this new layout
      case 'logExercise':
        // onLogSuccess can navigate to 'questBoard' or 'playerCard' or stay, depending on desired UX
        return <ExerciseLogForm onLogSuccess={() => setCurrentView('questBoard')} />;
      case 'exerciseHistory':
        return <ExerciseHistory />; // ExerciseHistory might need internal styling adjustments
      default:
        // If currentView is null or unrecognized, render nothing.
        return null;
    }
  };

  return (
    <div style={pageDynamicStyle} className="text-white overflow-hidden">
      {/* Overall wrapper for sidebar and content, with background opacity and blur */}
      <div className="flex w-full h-full max-w-6xl bg-gray-900 bg-opacity-80 rounded-xl shadow-2xl backdrop-blur-sm overflow-hidden" style={{maxHeight: '90vh'}}>

        {/* Sidebar */}
        <div className="w-1/3 max-w-xs bg-gray-800 bg-opacity-60 p-6 flex flex-col space-y-4 overflow-y-hidden overflow-x-hidden h-full mr-6">
          <h1 className="text-3xl font-bold mb-6 text-yellow-400 text-center">Guild</h1>
          <button className={sidebarButtonStyle} onClick={() => setCurrentView('questBoard')}>View Quest Board</button>
          <button className={sidebarButtonStyle} onClick={() => setCurrentView('playerCard')}>View Player Card</button>
          <button className={sidebarButtonStyle} onClick={() => setCurrentView('logExercise')}>Log Exercise</button>
          <button className={sidebarButtonStyle} onClick={() => setCurrentView('exerciseHistory')}>View Exercise History</button>
          <Link to="/" className="w-full">
            <button className={sidebarButtonStyle}>
              Return to Town
            </button>
          </Link>
        </div>

        {/* Content Area */}
        <div className="flex-1 p-6 sm:p-8 overflow-y-auto">
          {globalError && (
            <div className="bg-red-600 bg-opacity-90 border border-red-700 text-white p-3 mb-5 rounded-md shadow-lg">
              <p className="font-semibold">Error: {globalError}</p>
              <button
                onClick={clearError}
                // Using a more generic button style or define one if secondaryButtonStyle was removed/changed
                className={`py-1 px-2 mt-2 text-xs rounded-md bg-red-500 hover:bg-red-400 focus:outline-none focus:ring-2 focus:ring-red-300 focus:ring-opacity-75`}
              >
                Dismiss
              </button>
            </div>
          )}
          {renderContentArea()}
        </div>
      </div>
    </div>
  );
};

export default GuildPage;
