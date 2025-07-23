import React, { useState, useEffect } from 'react';
import { useGlobalState } from '../context/GlobalState';
import SidebarLayout from '../components/SidebarLayout';
import dungeonBg from '../../assets/dungeon-bg.png';
import panel from '../../assets/panel.png';

const DungeonPage = () => {
  const { currentUser, error: globalError, clearError } = useGlobalState();
  const [currentView, setCurrentView] = useState(null);

  useEffect(() => {
    if (currentUser) {
      clearError();
    }
  }, [currentUser, clearError]);

  const renderContentArea = () => {
    return (
      <div className="p-6 bg-gray-100 text-gray-900 rounded-lg shadow-xl">
        <h2 className="text-2xl font-bold mb-4 text-yellow-400">Welcome to the Dungeon!</h2>
        <p>Danger awaits! Explore the dungeon, fight monsters, and find treasure.</p>
      </div>
    );
  };

  const buttons = [
    { label: 'Explore', onClick: () => setCurrentView('explore') },
    { label: 'Bosses', onClick: () => setCurrentView('bosses') },
    { label: 'Return to Town', to: '/' },
  ];

  return (
    <SidebarLayout
      bgImage={dungeonBg}
      pageTitle="Dungeon"
      buttons={buttons}
      renderContent={renderContentArea}
      error={globalError}
      clearError={clearError}
      currentUser={currentUser}
    />
  );
};

export default DungeonPage;
