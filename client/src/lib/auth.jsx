import { createContext, useContext, useState, useEffect, useCallback } from 'react';
import { authApi } from './api';

const AuthContext = createContext(null);

export function AuthProvider({ children }) {
  const [user, setUser] = useState(null);
  const [ready, setReady] = useState(false);

  useEffect(() => {
    const t = localStorage.getItem('token');
    const u = localStorage.getItem('username');
    if (t && u) setUser({ username: u, token: t });
    setReady(true);
  }, []);

  const login = useCallback(async (username, password) => {
    const res = await authApi.login(username, password);
    const token = res.data.token;
    localStorage.setItem('token', token);
    localStorage.setItem('username', username);
    setUser({ username, token });
    return res;
  }, []);

  const signup = useCallback(async (username, password) => {
    return authApi.signup(username, password);
  }, []);

  const logout = useCallback(() => {
    localStorage.removeItem('token');
    localStorage.removeItem('username');
    setUser(null);
  }, []);

  return (
    <AuthContext.Provider value={{ user, ready, login, signup, logout, isAuthed: !!user }}>
      {children}
    </AuthContext.Provider>
  );
}

export const useAuth = () => {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error('useAuth must be used inside AuthProvider');
  return ctx;
};
