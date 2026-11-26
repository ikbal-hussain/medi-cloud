import { useEffect, useState } from 'react';
import { getCurrentAuth, logout as authLogout } from './utils/auth';
import LandingPage from './components/LandingPage';
import Dashboard from './components/Dashboard';

function App() {
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [authData, setAuthData] = useState<Awaited<ReturnType<typeof getCurrentAuth>>>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    checkAuth();
  }, []);

  const checkAuth = async () => {
    setLoading(true);
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

  if (!isAuthenticated || !authData) {
    return <LandingPage onAuthSuccess={checkAuth} />;
  }

  return (
    <Dashboard
      user={authData.user}
      tenant={authData.tenant}
      onLogout={handleLogout}
    />
  );
}

export default App;
