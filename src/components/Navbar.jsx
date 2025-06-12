import { Link, useNavigate } from 'react-router-dom'; // Added useNavigate
import { useGlobalState } from '../context/GlobalState'; // Adjust path as needed

const Navbar = () => {
  const { currentUser, logoutUser, error, clearError } = useGlobalState();
  const navigate = useNavigate();

  const handleLogout = () => {
    logoutUser();
    clearError(); // Clear any errors on logout
    navigate('/'); // Redirect to home page or login page after logout
  };

  return (
    <>
      <nav className="p-4 bg-gray-900 text-white flex gap-4 justify-center items-center">
        <Link to="/">🏠 Town</Link>
        <Link to="/guild">🛡️ Guild</Link>
        <Link to="/dungeon">⚔️ Dungeon</Link>
        {currentUser ? (
          <>
            <span className="ml-4">Welcome, {currentUser.username}!</span>
            <button onClick={handleLogout} className="ml-2 p-2 bg-red-500 hover:bg-red-700 rounded">
              Logout
            </button>
          </>
        ) : (
          <>
            {/* Links to login/register pages could be here, or handled by Guild page */}
            {/* For now, let's assume GuildPage will handle showing forms */}
          </>
        )}
      </nav>
      {error && (
        <div style={{ backgroundColor: 'red', color: 'white', padding: '10px', textAlign: 'center' }}>
          Error: {error}
          <button onClick={clearError} style={{ marginLeft: '10px', color: 'white', background: 'transparent', border: '1px solid white' }}>
            Dismiss
          </button>
        </div>
      )}
    </>
  );
};

export default Navbar;
