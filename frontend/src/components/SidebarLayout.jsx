import React from 'react';
import Button from './Button';
import defaultPanel from '../../assets/panel.png';

const SidebarLayout = ({
  bgImage,
  pageTitle,
  buttons,
  renderContent,
  error,
  clearError,
  currentUser,
  buttonJustify = 'left',
  panel: customPanel,
  fontColor = '#d49942',
  isAuthRequired = true,
}) => {
  const panel = customPanel || defaultPanel;

  const pageDynamicStyle = {
    backgroundImage: `url(${bgImage})`,
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

  const sidebarButtonStyle = (justify) => ({
    backgroundImage: `url(${panel})`,
    backgroundSize: '100% 100%',
    backgroundPosition: 'center',
    backgroundColor: 'transparent',
    height: '90px',
    color: fontColor,
    fontFamily: 'Crimson Pro',
    fontWeight: 'bold',
    fontSize: '1.3rem',
    display: 'flex',
    alignItems: 'center',
    justifyContent: justify,
    width: '110%',
    transform: 'scale(0.7)',
  });

  if (isAuthRequired && !currentUser) {
    return (
      <div style={pageDynamicStyle} className="relative flex flex-col items-center justify-center p-5 text-white">
        <p>Loading... If you are not redirected, please <Link to="/" className="text-yellow-400 hover:text-yellow-300">return to Town</Link> to log in.</p>
      </div>
    );
  }

  return (
    <div style={pageDynamicStyle} className="text-white overflow-hidden">
      <div className="flex w-full h-full max-w-6xl bg-gray-900 bg-opacity-80 rounded-xl shadow-2xl backdrop-blur-sm overflow-hidden" style={{ maxHeight: '90vh' }}>
        <div className="w-1/3 max-w-xs bg-gray-800 bg-opacity-60 p-6 flex flex-col space-y-4 overflow-y-hidden overflow-x-hidden h-full mr-6">
          <h1 className="text-3xl font-bold mb-6 text-yellow-400 text-center">{pageTitle}</h1>
          {buttons.map((button, index) => (
            <Button
              key={index}
              label={button.label}
              onClick={button.onClick}
              to={button.to}
              panel={panel}
              fontColor={fontColor}
              justify={buttonJustify}
            />
          ))}
        </div>
        <div className="flex-1 p-6 sm:p-8 overflow-y-auto">
          {error && (
            <div className="bg-red-600 bg-opacity-90 border border-red-700 text-white p-3 mb-5 rounded-md shadow-lg">
              <p className="font-semibold">Error: {error}</p>
              <button
                onClick={clearError}
                className={`py-1 px-2 mt-2 text-xs rounded-md bg-red-500 hover:bg-red-400 focus:outline-none focus:ring-2 focus:ring-red-300 focus:ring-opacity-75`}
              >
                Dismiss
              </button>
            </div>
          )}
          {renderContent()}
        </div>
      </div>
    </div>
  );
};

export default SidebarLayout;
