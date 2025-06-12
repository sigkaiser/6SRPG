import React from 'react';
import { Link } from 'react-router-dom';
// Assuming town-map3.png is in frontend/assets/ and Vite is set up to handle such imports
// The path from frontend/src/pages/TownPage.jsx to frontend/assets/town-map3.png is ../../assets/town-map3.png
import townMap3 from '../../assets/town-map3.png';

const TownPage = () => {
  const pageStyle = {
    backgroundImage: `url(${townMap3})`,
    backgroundSize: 'cover',
    backgroundPosition: 'center',
    minHeight: 'calc(100vh - 64px)', // Approximate height for view under navbar
    display: 'flex',
    flexDirection: 'column',
    alignItems: 'center',
    justifyContent: 'center', // Center content vertically
    padding: '20px',
    textAlign: 'center', // Center text for h1 and p if not overridden
  };

  const navLinkStyle = {
    display: 'inline-block',
    padding: '15px 30px',
    margin: '15px',
    backgroundColor: 'rgba(0, 0, 0, 0.75)', // Slightly more opaque
    color: 'gold',
    border: '2px solid gold',
    borderRadius: '10px',
    textDecoration: 'none',
    fontSize: '1.5em',
    fontWeight: 'bold',
    transition: 'transform 0.2s ease-out, background-color 0.2s ease-out, color 0.2s ease-out', // Added color transition
  };

  // Simulating hover effects with JS event handlers for inline styles
  const handleMouseOver = (e) => {
    e.currentTarget.style.transform = 'scale(1.1)';
    e.currentTarget.style.backgroundColor = 'rgba(255, 215, 0, 0.95)'; // Brighter gold
    e.currentTarget.style.color = 'black';
  };

  const handleMouseOut = (e) => {
    e.currentTarget.style.transform = 'scale(1)';
    e.currentTarget.style.backgroundColor = 'rgba(0, 0, 0, 0.75)';
    e.currentTarget.style.color = 'gold';
  };

  return (
    <div style={pageStyle}>
      <div style={{ marginBottom: '50px' }}> {/* Increased spacing */}
        <h1 style={{
          color: 'white',
          backgroundColor: 'rgba(0,0,0,0.6)',
          padding: '15px 25px',  // Increased padding
          borderRadius: '8px', // Slightly more rounded
          fontSize: '2.5em', // Larger title
          marginBottom: '15px' // Space between title and paragraph
        }}>
          🏘️ Welcome to the Adventuring Town
        </h1>
        <p style={{
          color: '#f0f0f0', // Lighter text color
          fontStyle: 'italic',
          fontSize: '1.2em', // Larger paragraph
          backgroundColor: 'rgba(0,0,0,0.6)',
          padding: '10px 15px',
          borderRadius: '5px'
        }}>
          This is your base of operations. Choose your destination!
        </p>
      </div>
      <div>
        <Link
          to="/guild"
          style={navLinkStyle}
          onMouseOver={handleMouseOver}
          onMouseOut={handleMouseOut}
        >
          🛡️ Guild
        </Link>
        <Link
          to="/dungeon"
          style={navLinkStyle}
          onMouseOver={handleMouseOver}
          onMouseOut={handleMouseOut}
        >
          ⚔️ Dungeon
        </Link>
        {/* Example for a future Market link:
        <Link
          to="/market"
          style={navLinkStyle}
          onMouseOver={handleMouseOver}
          onMouseOut={handleMouseOut}
        >
          💰 Market (TBD)
        </Link>
        */}
      </div>
    </div>
  );
};

export default TownPage;
