import { Link } from 'react-router-dom';

const Navbar = () => (
  <nav className="p-4 bg-gray-900 text-white flex gap-4 justify-center">
    <Link to="/">🏠 Town</Link>
    <Link to="/guild">🛡️ Guild</Link>
    <Link to="/dungeon">⚔️ Dungeon</Link>
  </nav>
);

export default Navbar;
