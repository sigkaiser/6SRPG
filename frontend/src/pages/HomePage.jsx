import React, { useState, useEffect } from 'react';
import { useGlobalState } from '../context/GlobalState';
import SidebarLayout from '../components/SidebarLayout';
import homeBg from '../../assets/home.png';

const HomePage = () => {
  const { currentUser, error: globalError, clearError } = useGlobalState();
  const [currentView, setCurrentView] = useState(null);

  useEffect(() => {
    if (currentUser) {
      clearError();
    }
  }, [currentUser, clearError]);

  const renderContentArea = () => {
    // Placeholder for content based on button clicks
    return (
      <div className="p-6 bg-gray-100 text-gray-900 rounded-lg shadow-xl">
        <h2 className="text-2xl font-bold mb-4 text-yellow-400">Welcome Home!</h2>
        <p>Select an option from the sidebar.</p>
      </div>
    );
  };

  const buttons = [
    { label: 'Status', onClick: () => setCurrentView('status') },
    { label: 'Skills', onClick: () => setCurrentView('skills') },
    { label: 'Inventory', onClick: () => setCurrentView('inventory') },
    { label: 'Equipment', onClick: () => setCurrentView('equipment') },
    { label: 'Preferences', to: '/preferences' },
    { label: 'Return to Town', to: '/' },
  ];

  return (
    <SidebarLayout
      bgImage={homeBg}
      pageTitle="House"
      buttons={buttons}
      renderContent={renderContentArea}
      error={globalError}
      clearError={clearError}
      currentUser={currentUser}
      buttonJustify="center"
      isAuthRequired={true}
    />
  );
};

export default HomePage;
