import React from 'react';
import Button from './Button';

const CenteredLayout = ({
  bgImage,
  pageTitle,
  buttons,
  renderContent,
  error,
  clearError,
  currentUser,
  panel,
  fontColor,
}) => {
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

  return (
    <div style={pageDynamicStyle} className="text-white overflow-hidden">
      <div className="flex flex-col w-full h-full max-w-6xl bg-gray-900 bg-opacity-80 rounded-xl shadow-2xl backdrop-blur-sm overflow-hidden p-6 items-center justify-center" style={{ maxHeight: '90vh' }}>
        <h1 className="text-3xl font-bold mb-6 text-yellow-400 text-center">{pageTitle}</h1>
        <div className="flex flex-col space-y-4 overflow-y-hidden overflow-x-hidden">
        {buttons.map((button, index) => (
          <Button
            key={index}
            label={button.label}
            onClick={button.onClick}
            to={button.to}
            panel={panel}
            fontColor={fontColor}
            justify="center"
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

export default CenteredLayout;
