import { useEffect, useState } from 'react';
import { initializeDemoData } from './utils/storage';
import { getCurrentAuth, logout as authLogout } from './utils/auth';
import LandingPage from './components/LandingPage';
import Dashboard from './components/Dashboard';

function App() {
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [authData, setAuthData] = useState<ReturnType<typeof getCurrentAuth>>(null);

  useEffect(() => {
    initializeDemoData();
    checkAuth();
  }, []);

  const checkAuth = () => {
    const auth = getCurrentAuth();
    if (auth) {
      setAuthData(auth);
      setIsAuthenticated(true);
    } else {
      setIsAuthenticated(false);
      setAuthData(null);
    }
  };

  const handleLogout = () => {
    authLogout();
    checkAuth();
  };

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
