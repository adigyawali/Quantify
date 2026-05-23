import { createContext, useContext, useState, useEffect, useCallback } from 'react';
import { authApi } from './api';

const AuthContext = createContext(null);

const readProfile = () => {
  try {
    const raw = localStorage.getItem('profile');
    return raw ? JSON.parse(raw) : null;
  } catch {
    return null;
  }
};

const writeProfile = (profile) => {
  if (profile) localStorage.setItem('profile', JSON.stringify(profile));
  else localStorage.removeItem('profile');
};

const buildDisplayName = (profile) => {
  if (!profile) return '';
  const composed = `${profile.first_name || ''} ${profile.last_name || ''}`.trim();
  return composed || profile.name || profile.username || '';
};

export function AuthProvider({ children }) {
  const [user, setUser] = useState(null);
  const [ready, setReady] = useState(false);

  // Boot: hydrate from localStorage and refresh against /me in the background.
  useEffect(() => {
    const token = localStorage.getItem('token');
    const username = localStorage.getItem('username');
    const profile = readProfile();

    if (token && username) {
      setUser({
        token,
        username,
        ...(profile || {}),
        displayName: buildDisplayName(profile || { username }),
      });

      authApi.me()
        .then((res) => {
          const next = res.data?.user;
          if (!next) return;
          writeProfile(next);
          setUser((prev) => ({
            ...(prev || {}),
            ...next,
            displayName: buildDisplayName(next),
          }));
        })
        .catch(() => {});
    }
    setReady(true);
  }, []);

  const login = useCallback(async (username, password) => {
    const res = await authApi.login(username, password);
    const { token, user: profile } = res.data;
    localStorage.setItem('token', token);
    localStorage.setItem('username', username);
    writeProfile(profile);
    setUser({
      token,
      username,
      ...(profile || {}),
      displayName: buildDisplayName(profile || { username }),
    });
    return res;
  }, []);

  const signup = useCallback(async (payload) => {
    const res = await authApi.signup(payload);
    const { token, user: profile } = res.data || {};
    if (token && profile) {
      localStorage.setItem('token', token);
      localStorage.setItem('username', profile.username);
      writeProfile(profile);
      setUser({
        token,
        username: profile.username,
        ...profile,
        displayName: buildDisplayName(profile),
      });
    }
    return res;
  }, []);

  const logout = useCallback(() => {
    localStorage.removeItem('token');
    localStorage.removeItem('username');
    writeProfile(null);
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
