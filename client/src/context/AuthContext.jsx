import { createContext, useContext, useState, useEffect } from 'react';
import api from '../api/axios';
import { setToken, onUnauthenticated } from '../utils/tokenStore';

const AuthContext = createContext(null);

export function AuthProvider({ children }) {
  const [user,    setUser]    = useState(null);
  const [loading, setLoading] = useState(true); // true while we attempt silent refresh on mount

  // ── On mount: restore session using the httpOnly refresh cookie ──────────
  useEffect(() => {
    api.post('/api/auth/refresh')
      .then(({ data }) => {
        setToken(data.token);
        setUser(data.user);
      })
      .catch(() => {
        // No valid session — that's fine, user will see login page
        setToken(null);
        setUser(null);
      })
      .finally(() => setLoading(false));
  }, []);

  // ── When the access token expires mid-session, clear state ──────────────
  useEffect(() => {
    onUnauthenticated(() => {
      setToken(null);
      setUser(null);
    });
  }, []);

  const login = (token, userData) => {
    setToken(token);
    setUser(userData);
  };

  const logout = async () => {
    try { await api.post('/api/auth/logout'); } catch { /* best effort */ }
    setToken(null);
    setUser(null);
  };

  return (
    <AuthContext.Provider value={{ user, loading, login, logout }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  return useContext(AuthContext);
}
