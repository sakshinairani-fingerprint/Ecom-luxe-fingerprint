import { createContext, useContext, useState, useEffect } from 'react';

const AuthContext = createContext(null);

export function AuthProvider({ children }) {
  const [user, setUser] = useState(null);
  const [token, setToken] = useState(() => localStorage.getItem('luxe_token'));
  const [flags, setFlags] = useState(() => {
    try {
      return JSON.parse(localStorage.getItem('luxe_flags') || '{}');
    } catch {
      return {};
    }
  });

  useEffect(() => {
    if (token) {
      const stored = localStorage.getItem('luxe_user');
      if (stored) {
        try {
          setUser(JSON.parse(stored));
        } catch {
          logout();
        }
      }
    }
  }, []);

  const login = (userData, authToken, authFlags = {}) => {
    setUser(userData);
    setToken(authToken);
    setFlags(authFlags);
    localStorage.setItem('luxe_token', authToken);
    localStorage.setItem('luxe_user', JSON.stringify(userData));
    localStorage.setItem('luxe_flags', JSON.stringify(authFlags));
  };

  const logout = () => {
    setUser(null);
    setToken(null);
    setFlags({});
    localStorage.removeItem('luxe_token');
    localStorage.removeItem('luxe_user');
    localStorage.removeItem('luxe_flags');
  };

  return (
    <AuthContext.Provider value={{
      user, token, flags, login, logout,
      isAuthenticated: !!user,
      isIncognito: flags.incognito === true,
    }}>
      {children}
    </AuthContext.Provider>
  );
}

export const useAuth = () => useContext(AuthContext);
