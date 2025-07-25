import React from 'react';
import { Link } from 'react-router-dom';
import defaultPanel from '../../assets/panel.png';

const Button = ({
  label,
  onClick,
  to,
  panel: customPanel,
  fontColor = '#d49942',
  fontColorClass = '',
  justify = 'left',
}) => {
  const panel = customPanel || defaultPanel;

  const buttonStyle = {
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
    width: '220px',
    transform: 'scale(0.7)',
  };

  const buttonWrapperStyle = {
    width: '100%',
    display: 'flex',
    justifyContent: 'center',
  };

  if (to) {
    return (
      <Link to={to} style={buttonWrapperStyle}>
        <button style={buttonStyle} className={fontColorClass}>{label}</button>
      </Link>
    );
  }

  return (
    <div style={buttonWrapperStyle}>
      <button style={buttonStyle} onClick={onClick} className={fontColorClass}>
        {label}
      </button>
    </div>
  );
};

export default Button;
