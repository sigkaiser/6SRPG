import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { useGlobalState } from '../context/GlobalState';
import homeBg from '../../assets/home.png';
import panel2 from '../../assets/panel2.png';

const HomePage = () => {
  const { currentUser, error: globalError, clearError } = useGlobalState();
  const [currentView, setCurrentView] = useState(null);

  useEffect(() => {
    if (currentUser) {
      clearError();
    }
  }, [currentUser, clearError]);

  const pageDynamicStyle = {
    backgroundImage: `url(${homeBg})`,
    backgroundSize: 'cover',
    backgroundPosition: 'center center',
    backgroundRepeat: 'no-repeat',
    height: '100vh',
    width: '100vw',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    overflow: 'hidden',
  };

  const sidebarButtonStyle = {
    backgroundImage: `url(${panel2})`,
    backgroundSize: '100% 100%',
    backgroundPosition: 'center',
    backgroundColor: 'transparent',
    height: '90px',
    color: '#d49942',
    fontFamily: 'Crimson Pro',
    fontWeight: 'bold',
    fontSize: '1.3rem',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    width: '110%',
    transform: 'scale(0.7)',
  };

  if (!currentUser) {
    return (
        <div style={pageDynamicStyle} className="relative flex flex-col items-center justify-center p-5 text-white">
            <p>Loading Home... If you are not redirected, please <Link to="/" className="text-yellow-400 hover:text-yellow-300">return to Town</Link> to log in.</p>
        </div>
    );
  }

  const renderContentArea = () => {
    // Placeholder for content based on button clicks
    return (
        <div className="p-6 bg-gray-100 text-gray-900 rounded-lg shadow-xl">
            <h2 className="text-2xl font-bold mb-4 text-yellow-400">Welcome Home!</h2>
            <p>Select an option from the sidebar.</p>
        </div>
    );
  };

  return (
    <div style={pageDynamicStyle} className="text-white overflow-hidden">
      <div className="flex w-full h-full max-w-6xl bg-gray-900 bg-opacity-80 rounded-xl shadow-2xl backdrop-blur-sm overflow-hidden" style={{maxHeight: '90vh'}}>
        <div className="w-1/3 max-w-xs bg-gray-800 bg-opacity-60 p-6 flex flex-col space-y-4 overflow-y-hidden overflow-x-hidden h-full mr-6">
          <h1 className="text-3xl font-bold mb-6 text-yellow-400 text-center">Home</h1>
          <button style={sidebarButtonStyle} onClick={() => setCurrentView('status')}>Status</button>
          <button style={sidebarButtonStyle} onClick={() => setCurrentView('skills')}>Skills</button>
          <button style={sidebarButtonStyle} onClick={() => setCurrentView('inventory')}>Inventory</button>
          <button style={sidebarButtonStyle} onClick={() => setCurrentView('equipment')}>Equipment</button>
          <button style={sidebarButtonStyle} onClick={() => setCurrentView('activeQuests')}>Active Quests</button>
          <Link to="/">
            <button style={sidebarButtonStyle}>
              Return to Town
            </button>
          </Link>
        </div>
        <div className="flex-1 p-6 sm:p-8 overflow-y-auto">
          {globalError && (
            <div className="bg-red-600 bg-opacity-90 border border-red-700 text-white p-3 mb-5 rounded-md shadow-lg">
              <p className="font-semibold">Error: {globalError}</p>
              <button
                onClick={clearError}
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

export default HomePage;
