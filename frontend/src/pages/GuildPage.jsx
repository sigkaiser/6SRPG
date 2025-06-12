import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { useGlobalState } from '../context/GlobalState';
import LoginForm from '../components/LoginForm';
import RegistrationForm from '../components/RegistrationForm';
import PlayerCard from '../components/PlayerCard';
import ExerciseLogForm from '../components/ExerciseLogForm';
import ExerciseHistory from '../components/ExerciseHistory'; // Import ExerciseHistory
// Assuming guild-bg.png is in frontend/assets/
// Path from frontend/src/pages/GuildPage.jsx to frontend/assets/guild-bg.png is ../../assets/guild-bg.png
import guildBg from '../../assets/guild-bg.png';

const GuildPage = () => {
  const { currentUser, error: globalError, clearError, setError } = useGlobalState();
  // View states: 'options', 'login', 'register', 'loggedInMain', 'playerCard', 'logExercise', 'exerciseHistory'
  const [currentView, setCurrentView] = useState('options');

  useEffect(() => {
    // If user logs in or out, adjust the view
    if (currentUser) {
      setCurrentView('loggedInMain'); // Default view for logged-in users
      clearError(); // Clear any previous errors on successful login/state change
    } else {
      setCurrentView('options'); // Default view for logged-out users
    }
  }, [currentUser]); // Re-run when currentUser changes

  const pageStyle = {
    backgroundImage: `url(${guildBg})`,
    backgroundSize: 'cover',
    backgroundPosition: 'center',
    minHeight: 'calc(100vh - 64px)', // Adjust if navbar height is different
    display: 'flex',
    flexDirection: 'column',
    alignItems: 'center',
    padding: '20px',
    color: 'white', // Default text color for the page
  };

  const contentBoxStyle = {
    backgroundColor: 'rgba(0, 0, 0, 0.75)', // Darker, more opaque box for content
    padding: '25px', // Increased padding
    borderRadius: '10px', // More rounded corners
    textAlign: 'center',
    maxWidth: '600px',
    width: '90%', // Responsive width
    boxShadow: '0 0 15px rgba(0,0,0,0.5)', // Added a subtle shadow for depth
  };

  const buttonStyle = {
    display: 'inline-block',
    padding: '12px 25px', // Slightly larger buttons
    margin: '10px',
    backgroundColor: 'gold',
    color: 'black',
    border: 'none',
    borderRadius: '6px', // Consistent border radius
    textDecoration: 'none',
    fontSize: '1.1em', // Slightly larger font
    cursor: 'pointer',
    fontWeight: 'bold',
    transition: 'background-color 0.2s, transform 0.1s',
  };

  const handleLoginSuccess = () => {
    // currentUser state change will trigger useEffect to set view to 'loggedInMain'
  };

  const handleRegistrationSuccess = () => {
    alert('Registration successful! Please login.');
    setCurrentView('login');
    clearError();
  };

  const renderContent = () => {
    if (!currentUser) {
      // Not logged in
      switch (currentView) {
        case 'login':
          return (
            <LoginForm
              onLoginSuccess={handleLoginSuccess}
              onSwitchToRegister={() => { setCurrentView('register'); clearError(); }}
            />
          );
        case 'register':
          return (
            <RegistrationForm
              onRegistrationSuccess={handleRegistrationSuccess}
              onSwitchToLogin={() => { setCurrentView('login'); clearError(); }}
            />
          );
        case 'options':
        default:
          return (
            <>
              <h1>Adventurer's Guild</h1> {/* Emoji removed */}
              <p style={{fontSize: '1.2em', marginBottom: '20px'}}>
                Welcome! Please log in or register to access guild services.
              </p>
              <div>
                <button
                  style={buttonStyle}
                  onClick={() => { setCurrentView('login'); clearError(); }}
                  onMouseOver={e => e.currentTarget.style.backgroundColor = '#ffd700'}
                  onMouseOut={e => e.currentTarget.style.backgroundColor = 'gold'}
                >
                  Login
                </button>
                <button
                  style={buttonStyle}
                  onClick={() => { setCurrentView('register'); clearError(); }}
                  onMouseOver={e => e.currentTarget.style.backgroundColor = '#ffd700'}
                  onMouseOut={e => e.currentTarget.style.backgroundColor = 'gold'}
                >
                  Register
                </button>
              </div>
            </>
          );
      }
    } else {
      // Logged In
      switch (currentView) {
        case 'loggedInMain':
          return (
            <div>
              <h2>Welcome back, {currentUser.username}!</h2>
              <p style={{fontSize: '1.1em', marginBottom: '25px'}}>What would you like to do?</p>
              <button style={buttonStyle} onClick={() => setCurrentView('playerCard')}>View Player Card</button>
              <button style={buttonStyle} onClick={() => setCurrentView('logExercise')}>Log Exercise</button>
              <button style={buttonStyle} onClick={() => setCurrentView('exerciseHistory')}>View Exercise History</button>
            </div>
          );
        case 'playerCard':
          return (
            <div> {/* Retain a div for consistent structure if needed, or PlayerCard can be root */}
              <PlayerCard />
              <button style={buttonStyle} onClick={() => setCurrentView('loggedInMain')}>Back to Guild Menu</button>
            </div>
          );
        case 'logExercise':
          return (
            <div>
              <ExerciseLogForm onLogSuccess={() => setCurrentView('loggedInMain')} />
              <button style={buttonStyle} onClick={() => setCurrentView('loggedInMain')}>
                Back to Guild Menu
              </button>
            </div>
          );
        case 'exerciseHistory':
          return (
            <div>
              <ExerciseHistory />
              <button style={buttonStyle} onClick={() => setCurrentView('loggedInMain')}>
                Back to Guild Menu
              </button>
            </div>
          );
        default:
          setCurrentView('loggedInMain');
          return null;
      }
    }
  };

  return (
    <div style={pageStyle}>
      <div style={contentBoxStyle}>
        {globalError && currentView !== 'loggedInMain' && (
          <div style={{ backgroundColor: 'rgba(200,0,0,0.8)', color: 'white', padding: '10px', marginBottom: '20px', borderRadius: '5px', border: '1px solid red' }}>
            <p style={{margin: 0, fontWeight: 'bold'}}>Error: {globalError}</p>
            <button onClick={clearError} style={{ ...buttonStyle, backgroundColor: '#666', color: 'white', fontSize: '0.9em', padding: '6px 12px', marginTop: '8px'}}>Dismiss</button>
          </div>
        )}
        {renderContent()}
        <div style={{ marginTop: '40px' }}>
          <Link
            to="/"
            style={{...buttonStyle, backgroundColor: '#4A5568', color: 'white'}}
            onMouseOver={e => e.currentTarget.style.backgroundColor = '#2D3748'}
            onMouseOut={e => e.currentTarget.style.backgroundColor = '#4A5568'}
          >
            Back to Town {/* Emoji removed */}
          </Link>
        </div>
      </div>
    </div>
  );
};

export default GuildPage;
