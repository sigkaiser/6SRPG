import React, { useState } from 'react';
import { Link } from 'react-router-dom';
import { useGlobalState } from '../context/GlobalState';
import LoginForm from '../components/LoginForm';
import RegistrationForm from '../components/RegistrationForm';
import townMap3 from '../../assets/town-map3.png';

const TownPage = () => {
  const { currentUser, error: globalError, clearError, setError } = useGlobalState();
  const [authView, setAuthView] = useState(null); // 'login', 'register', or null
  const [registrationSuccessMessage, setRegistrationSuccessMessage] = useState('');

  const pageStyle = {
    backgroundImage: `url(${townMap3})`,
    backgroundSize: 'cover',
    backgroundPosition: 'center center',
    backgroundRepeat: 'no-repeat',
    height: '100vh',
    width: '100vw',
  };

  const baseButtonStyle =
    'py-2 px-5 mx-2 my-2 text-base font-semibold rounded-lg shadow-md focus:outline-none focus:ring-2 focus:ring-opacity-75 transition-transform transform hover:scale-105';
  const primaryButtonStyle = `${baseButtonStyle} bg-yellow-500 hover:bg-yellow-600 text-black focus:ring-yellow-400`;
  const secondaryButtonStyle = `${baseButtonStyle} bg-gray-600 hover:bg-gray-700 text-white focus:ring-gray-500`;


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

  const renderAuthForms = () => {
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
    return null;
  };

  return (
    <div style={pageStyle} className="relative overflow-hidden">
      <div className="absolute inset-0 bg-black bg-opacity-50 z-0" />

      <div className="relative z-10 flex flex-col items-center justify-center h-full p-5 text-center">
        <div className="mb-8">
          <h1 className="text-4xl lg:text-5xl font-bold text-white bg-black bg-opacity-60 px-6 py-3 rounded-lg shadow-xl mb-4">
            Welcome to 6SRPG!
          </h1>
          {!currentUser && !authView && (
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

        {globalError && authView && (
          <div className="bg-red-600 bg-opacity-90 border border-red-700 text-white p-3 mb-5 rounded-md shadow-lg w-full max-w-md">
            <p className="font-semibold">Error: {globalError}</p>
            <button
              onClick={() => { clearError(); setRegistrationSuccessMessage('');}}
              className={`${secondaryButtonStyle} bg-red-500 hover:bg-red-400 text-xs mt-2 py-1 px-2`}
            >
              Dismiss
            </button>
          </div>
        )}
        {registrationSuccessMessage && authView === 'login' && (
           <div className="bg-green-600 bg-opacity-90 border border-green-700 text-white p-3 mb-5 rounded-md shadow-lg w-full max-w-md">
            <p className="font-semibold">{registrationSuccessMessage}</p>
          </div>
        )}


        {!currentUser ? (
          authView ? (
            <div className="relative z-10 bg-gray-900 bg-opacity-80 p-6 sm:p-8 rounded-xl shadow-2xl w-full max-w-md backdrop-blur-sm">
              {renderAuthForms()}
              <button
                onClick={() => { setAuthView(null); clearError(); setRegistrationSuccessMessage(''); }}
                className={`${secondaryButtonStyle} mt-4 w-full`}
              >
                Back to Town Options
              </button>
            </div>
          ) : (
            <div className="flex flex-col items-center">
              <button className={primaryButtonStyle + " w-48 sm:w-60 mb-4"} onClick={handleShowLogin}>
                Login
              </button>
              <button className={primaryButtonStyle + " w-48 sm:w-60"} onClick={handleShowRegister}>
                Register
              </button>
            </div>
          )
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <Link
              to="/guild"
              className="bg-black bg-opacity-0 text-yellow-400 border-2 border-yellow-500 rounded-xl p-6 text-2xl font-bold shadow-lg hover:bg-yellow-400 hover:text-black hover:border-yellow-700 transition-all duration-200 transform hover:scale-105 flex items-center justify-center w-48 sm:w-60"
            >
              Guild
            </Link>
            <Link
              to="/dungeon"
              className="bg-black bg-opacity-0 text-yellow-400 border-2 border-yellow-500 rounded-xl p-6 text-2xl font-bold shadow-lg hover:bg-yellow-400 hover:text-black hover:border-yellow-700 transition-all duration-200 transform hover:scale-105 flex items-center justify-center w-48 sm:w-60"
            >
              Dungeon
            </Link>
          </div>
        )}
      </div>
    </div>
  );
};

export default TownPage;
