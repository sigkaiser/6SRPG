import React, { useState, useEffect } from 'react';
import { useGlobalState } from '../context/GlobalState';
import PlayerCard from '../components/PlayerCard';
import ExerciseLogForm from '../components/ExerciseLogForm';
import ExerciseHistory from '../components/ExerciseHistory';
import QuestBoard from '../components/QuestBoard';
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
        return <QuestBoard />;
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
      isAuthRequired={true}
    />
  );
};

export default GuildPage;
