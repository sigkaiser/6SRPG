import { Routes, Route, Navigate } from 'react-router-dom';
import Navbar from './components/Navbar';
import TownPage from './pages/TownPage';
import GuildPage from './pages/GuildPage';
import DungeonPage from './pages/DungeonPage';
import { useGlobalState } from './context/GlobalState';
import './App.css';

// Helper component for protected routes
const ProtectedRoute = ({ element }) => {
  const { currentUser } = useGlobalState();
  if (!currentUser) {
    // Redirect to login page (TownPage will show login options)
    return <Navigate to="/" replace />;
  }
  return element;
};

function App() {
  return (
    <>
      <Navbar />
      <Routes>
        <Route path="/" element={<TownPage />} />
        <Route
          path="/guild"
          element={<ProtectedRoute element={<GuildPage />} />}
        />
        <Route
          path="/dungeon"
          element={<ProtectedRoute element={<DungeonPage />} />}
        />
      </Routes>
    </>
  );
}

export default App;
