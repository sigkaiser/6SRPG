import { Link } from 'react-router-dom';
import townMap3 from '../../assets/town-map3.png';

const TownPage = () => {
  const pageStyle = {
    backgroundImage: `url(${townMap3})`,
    backgroundSize: 'cover',
    backgroundPosition: 'center center',
    backgroundRepeat: 'no-repeat',
    height: '100vh', // full viewport height
    width: '100vw',  // full viewport width
  };

  return (
    <div style={pageStyle} className="relative overflow-hidden">
      {/* Optional overlay for better contrast */}
      <div className="absolute inset-0 bg-black bg-opacity-50 z-0" />

      {/* Content */}
      <div className="relative z-10 flex flex-col items-center justify-center h-full p-5 text-center">
        <div className="mb-12">
          <h1 className="text-4xl lg:text-5xl font-bold text-white bg-black bg-opacity-60 px-6 py-3 rounded-lg shadow-xl mb-4">
            Welcome to Outpost Tharsis!
          </h1>
          <p className="text-lg lg:text-xl text-gray-200 italic bg-black bg-opacity-60 px-4 py-2 rounded-md shadow-lg">
            This is your base of operations. Register at the guild and take on the Dungeon!
          </p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <Link
            to="/guild"
            className="bg-black bg-opacity-0 text-yellow-400 border-2 border-yellow-500 rounded-xl p-6 text-2xl font-bold shadow-lg hover:bg-yellow-400 hover:text-black hover:border-yellow-700 transition-all duration-200 transform hover:scale-105 flex items-center justify-center w-48 sm:w-60"
          >
            Guild
          </Link>
          <Link
            to="/dungeon"
            className="bg-black bg-opacity-0 text-yellow-400 border-2 border-yellow-500 rounded-xl p-6 text-2xl font-bold shadow-lg hover:bg-yellow-400 hover:text-black hover:border-yellow-700 transition-all duration-200 transform hover:scale-105 flex items-center justify-center w-48 sm:w-60"
          >
            Dungeon
          </Link>
        </div>
      </div>
    </div>
  );
};

export default TownPage;
