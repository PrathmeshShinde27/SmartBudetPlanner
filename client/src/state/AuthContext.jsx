import { createContext, useContext, useMemo, useState } from 'react';
import { api } from '../lib/api.js';

const AuthContext = createContext(null);

export function AuthProvider({ children }) {
  const [token, setToken] = useState(() => localStorage.getItem('sbp_token'));
  const [user, setUser] = useState(() => {
    const raw = localStorage.getItem('sbp_user');
    return raw ? JSON.parse(raw) : null;
  });

  async function login(email, password) {
    const { data } = await api.post('/auth/login', { email, password });
    localStorage.setItem('sbp_token', data.token);
    localStorage.setItem('sbp_user', JSON.stringify(data.user));
    setToken(data.token);
    setUser(data.user);
  }

  async function register(input) {
    const { data } = await api.post('/auth/register', input);
    localStorage.setItem('sbp_token', data.token);
    localStorage.setItem('sbp_user', JSON.stringify(data.user));
    setToken(data.token);
    setUser(data.user);
  }

  function logout() {
    localStorage.removeItem('sbp_token');
    localStorage.removeItem('sbp_user');
    setToken(null);
    setUser(null);
  }

  const value = useMemo(
    () => ({ token, user, isAuthenticated: Boolean(token), login, register, logout }),
    [token, user]
  );

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth() {
  return useContext(AuthContext);
}
