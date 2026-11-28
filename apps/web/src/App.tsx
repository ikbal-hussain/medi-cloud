import { useEffect, useState } from 'react';
import { getCurrentAuth, logout as authLogout } from './utils/auth';
import LandingPage from './components/LandingPage';
import Dashboard from './components/Dashboard';

function App() {
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [authData, setAuthData] = useState<Awaited<ReturnType<typeof getCurrentAuth>>>(null);
  const [loading, setLoading] = useState(true);
  // The server couldn't be reached to check a saved session: offer a retry instead of acting logged out.
  const [unreachable, setUnreachable] = useState(false);

  useEffect(() => {
    checkAuth();
  }, []);

  const checkAuth = async () => {
    setLoading(true);
    setUnreachable(false);
    try {
      const auth = await getCurrentAuth();
      if (auth) {
        setAuthData(auth);
        setIsAuthenticated(true);
      } else {
        setIsAuthenticated(false);
        setAuthData(null);
      }
    } catch {
      setIsAuthenticated(false);
      setAuthData(null);
      setUnreachable(true);
    } finally {
      setLoading(false);
    }
  };

  const handleLogout = () => {
    authLogout();
    setIsAuthenticated(false);
    setAuthData(null);
  };

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-gray-600">Loading...</div>
      </div>
    );
  }

  if (unreachable) {
    return (
      <div className="min-h-screen flex items-center justify-center p-4">
        <div className="text-center">
          <p className="text-gray-900 font-medium">Can't reach Medi Cloud right now</p>
          <p className="text-gray-600 mt-1">Your session is still saved. Try again in a moment.</p>
          <button
            onClick={checkAuth}
            className="mt-4 px-4 py-2 bg-primary-600 text-white rounded-lg hover:bg-primary-700 transition-colors"
          >
            Try again
          </button>
        </div>
      </div>
    );
  }

  if (!isAuthenticated || !authData) {
    return <LandingPage onAuthSuccess={checkAuth} />;
  }

  return <Dashboard user={authData.user} tenant={authData.tenant} onLogout={handleLogout} />;
}

export default App;
