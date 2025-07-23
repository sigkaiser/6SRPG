import React, { useState, useEffect } from 'react';
import { useGlobalState } from '../context/GlobalState';
import PlayerCard from '../components/PlayerCard';
import ExerciseLogForm from '../components/ExerciseLogForm';
import ExerciseHistory from '../components/ExerciseHistory';
import SidebarLayout from '../components/SidebarLayout';
import guildBg from '../../assets/guild-bg.png';

const GuildPage = () => {
  const { currentUser, error: globalError, clearError } = useGlobalState();
  const [currentView, setCurrentView] = useState(null);

  useEffect(() => {
    if (currentUser) {
      clearError();
    }
  }, [currentUser, clearError]);

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
        return <PlayerCard />;
      case 'logExercise':
        return <ExerciseLogForm onLogSuccess={() => setCurrentView('questBoard')} />;
      case 'exerciseHistory':
        return <ExerciseHistory />;
      default:
        return null;
    }
  };

  const buttons = [
    { label: 'View Quest Board', onClick: () => setCurrentView('questBoard') },
    { label: 'View Player Card', onClick: () => setCurrentView('playerCard') },
    { label: 'Log Exercise', onClick: () => setCurrentView('logExercise') },
    { label: 'View Exercise History', onClick: () => setCurrentView('exerciseHistory') },
    { label: 'Return to Town', to: '/' },
  ];

  return (
    <SidebarLayout
      bgImage={guildBg}
      pageTitle="Guild"
      buttons={buttons}
      renderContent={renderContentArea}
      error={globalError}
      clearError={clearError}
      currentUser={currentUser}
    />
  );
};

export default GuildPage;
