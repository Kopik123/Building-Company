import React from 'react';
import { sessionApi } from './api';

const AuthContext = React.createContext(null);

export function AuthProvider({ children }) {
  const [user, setUser] = React.useState(null);
  const [loading, setLoading] = React.useState(true);
  const [error, setError] = React.useState('');

  React.useEffect(() => {
    let active = true;
    const bootstrap = async () => {
      setLoading(true);
      try {
        const nextUser = await sessionApi.me();
        if (active) setUser(nextUser);
      } catch (err) {
        if (active) {
          setError(err.message || 'Could not load session');
          sessionApi.clearTokens();
          setUser(null);
        }
      } finally {
        if (active) setLoading(false);
      }
    };
    bootstrap();
    return () => {
      active = false;
    };
  }, []);

  const login = async (email, password) => {
    setError('');
    setLoading(true);
    try {
      const nextUser = await sessionApi.login(email, password);
      setUser(nextUser);
    } catch (err) {
      setError(err.message || 'Login failed');
      setUser(null);
    } finally {
      setLoading(false);
    }
  };

  const logout = () => {
    sessionApi.clearTokens();
    setUser(null);
  };

  const value = React.useMemo(
    () => ({ user, loading, error, login, logout }),
    [user, loading, error]
  );

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth() {
  const context = React.useContext(AuthContext);
  if (!context) throw new Error('useAuth must be used inside AuthProvider');
  return context;
}
