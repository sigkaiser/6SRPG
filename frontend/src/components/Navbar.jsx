import { Link, useNavigate } from 'react-router-dom';
import { useGlobalState } from '../context/GlobalState';

const Navbar = () => {
  const { currentUser, logoutUser, error, clearError } = useGlobalState();
  const navigate = useNavigate();

  const handleLogout = () => {
    logoutUser();
    clearError();
    navigate('/');
  };

  return (
    <>
      <nav className="p-4 bg-gray-900 text-white flex flex-wrap gap-x-6 gap-y-2 justify-center items-center shadow-lg">
        <Link to="/" className="text-lg hover:text-yellow-400 transition-colors">Town</Link>
        <Link to="/guild" className="text-lg hover:text-yellow-400 transition-colors">Guild</Link>
        <Link to="/dungeon" className="text-lg hover:text-yellow-400 transition-colors">Dungeon</Link>

        {currentUser ? (
          <div className="flex items-center gap-x-4 gap-y-2 flex-wrap justify-center">
            <span className="text-sm">Welcome, {currentUser.username}!</span>
            <button
              onClick={handleLogout}
              className="bg-red-600 hover:bg-red-700 text-white text-sm font-semibold py-1 px-3 rounded-md shadow transition-colors"
            >
              Logout
            </button>
          </div>
        ) : (
          <div className="flex items-center gap-x-4">
            {/* Optional: Add Login/Register links here if desired in navbar */}
          </div>
        )}
      </nav>
      {error && (
        <div className="bg-red-700 bg-opacity-90 text-white p-3 text-center shadow-md relative">
          <span>Error: {error}</span>
          <button
            onClick={clearError}
            className="ml-4 bg-red-500 hover:bg-red-400 text-white text-xs font-semibold py-1 px-2 rounded-md transition-colors"
          >
            Dismiss
          </button>
        </div>
      )}
    </>
  );
};

export default Navbar;
