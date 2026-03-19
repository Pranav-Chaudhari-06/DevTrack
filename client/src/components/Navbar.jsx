import { useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';

export default function Navbar() {
  const { user, logout } = useAuth();
  const navigate = useNavigate();

  const handleLogout = () => {
    logout();
    navigate('/login');
  };

  return (
    <nav className="bg-white border-b border-gray-200 sticky top-0 z-40">
      <div className="max-w-7xl mx-auto px-4 py-3 flex items-center justify-between">
        <button
          onClick={() => navigate('/')}
          className="text-xl font-bold text-indigo-600 hover:text-indigo-700 transition"
        >
          DevTrack
        </button>

        <div className="flex items-center gap-4">
          {user && (
            <span className="text-sm text-gray-600 hidden sm:block">
              {user.name}
            </span>
          )}
          <button
            onClick={handleLogout}
            className="text-sm text-gray-500 hover:text-red-500 transition font-medium"
          >
            Logout
          </button>
        </div>
      </div>
    </nav>
  );
}
