import { Routes, Route } from 'react-router-dom';
import Navbar from './components/Navbar';
import TownPage from './pages/TownPage';
import GuildPage from './pages/GuildPage';
import DungeonPage from './pages/DungeonPage';
import './App.css';

function App() {
  return (
    <>
      <Navbar />
      <Routes>
        <Route path="/" element={<TownPage />} />
        <Route path="/guild" element={<GuildPage />} />
        <Route path="/dungeon" element={<DungeonPage />} />
      </Routes>
    </>
  );
}

export default App;
