import { createContext, useContext, useState } from 'react';

const AuthContext = createContext(null);

export function AuthProvider({ children }) {
  const [token, setToken] = useState(() => localStorage.getItem('devtrack_token'));
  const [user, setUser] = useState(() => {
    const u = localStorage.getItem('devtrack_user');
    return u ? JSON.parse(u) : null;
  });

  const login = (token, user) => {
    localStorage.setItem('devtrack_token', token);
    localStorage.setItem('devtrack_user', JSON.stringify(user));
    setToken(token);
    setUser(user);
  };

  const logout = () => {
    localStorage.removeItem('devtrack_token');
    localStorage.removeItem('devtrack_user');
    setToken(null);
    setUser(null);
  };

  return (
    <AuthContext.Provider value={{ token, user, login, logout }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  return useContext(AuthContext);
}
