import { Link } from 'react-router-dom';
import townMap3 from '../../assets/town-map3.png'; // Keep image import

const TownPage = () => {
  // Inline style for background image is often simplest with imported images in React/Vite
  const pageStyle = {
    backgroundImage: `url(${townMap3})`,
  };

  return (
    <div
      style={pageStyle}
      className="bg-cover bg-center min-h-[calc(100vh-64px)] flex flex-col items-center justify-center p-5 text-center" // Adjust 64px if navbar height is different
    >
      <div className="mb-12">
        <h1 className="text-4xl lg:text-5xl font-bold text-white bg-black bg-opacity-60 px-6 py-3 rounded-lg shadow-xl mb-4">
           Welcome to the Adventuring Town
        </h1>
        <p className="text-lg lg:text-xl text-gray-200 italic bg-black bg-opacity-60 px-4 py-2 rounded-md shadow-lg">
          This is your base of operations. Choose your destination!
        </p>
      </div>
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        <Link
          to="/guild"
          className="bg-black bg-opacity-75 text-yellow-400 border-2 border-yellow-500 rounded-xl p-6 text-2xl font-bold shadow-lg hover:bg-yellow-400 hover:text-black hover:border-yellow-700 transition-all duration-200 transform hover:scale-105 flex items-center justify-center min-w-[200px]"
        >
           Guild
        </Link>
        <Link
          to="/dungeon"
          className="bg-black bg-opacity-75 text-yellow-400 border-2 border-yellow-500 rounded-xl p-6 text-2xl font-bold shadow-lg hover:bg-yellow-400 hover:text-black hover:border-yellow-700 transition-all duration-200 transform hover:scale-105 flex items-center justify-center min-w-[200px]"
        >
           Dungeon
        </Link>
      </div>
    </div>
  );
};

export default TownPage;
