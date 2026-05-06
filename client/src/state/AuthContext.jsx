import { createContext, useCallback, useContext, useEffect, useMemo, useState } from 'react';
import { api } from '../lib/api.js';

const AuthContext = createContext(null);
const IDLE_TIMEOUT_MS = 5 * 60 * 1000;
const activityEvents = ['click', 'keydown', 'mousemove', 'scroll', 'touchstart', 'pointerdown'];

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
    return data;
  }

  async function verifyEmail(email, otp) {
    const { data } = await api.post('/auth/verify-email', { email, otp });
    localStorage.setItem('sbp_token', data.token);
    localStorage.setItem('sbp_user', JSON.stringify(data.user));
    setToken(data.token);
    setUser(data.user);
    return data;
  }

  async function resendVerificationOtp(email) {
    const { data } = await api.post('/auth/resend-verification-otp', { email });
    return data;
  }

  async function forgotPassword(email) {
    const { data } = await api.post('/auth/forgot-password', { email });
    return data;
  }

  async function resetPassword(input) {
    const { data } = await api.post('/auth/reset-password', input);
    return data;
  }

  async function updateProfile(input) {
    const { data } = await api.put('/auth/profile', input);
    localStorage.setItem('sbp_user', JSON.stringify(data.user));
    setUser(data.user);
    return data.user;
  }

  async function updatePassword(input) {
    await api.put('/auth/password', input);
  }

  const logout = useCallback(() => {
    localStorage.removeItem('sbp_token');
    localStorage.removeItem('sbp_user');
    setToken(null);
    setUser(null);
  }, []);

  useEffect(() => {
    if (!token) return undefined;

    let timeoutId;

    function expireSession() {
      sessionStorage.setItem('sbp_login_message', 'You were logged out after 5 minutes of inactivity.');
      logout();
      window.location.assign('/login');
    }

    function resetTimer() {
      window.clearTimeout(timeoutId);
      timeoutId = window.setTimeout(expireSession, IDLE_TIMEOUT_MS);
    }

    resetTimer();
    activityEvents.forEach((eventName) => window.addEventListener(eventName, resetTimer, { passive: true }));
    return () => {
      window.clearTimeout(timeoutId);
      activityEvents.forEach((eventName) => window.removeEventListener(eventName, resetTimer));
    };
  }, [logout, token]);

  const value = useMemo(
    () => ({
      token,
      user,
      isAuthenticated: Boolean(token),
      login,
      register,
      verifyEmail,
      resendVerificationOtp,
      forgotPassword,
      resetPassword,
      updateProfile,
      updatePassword,
      logout
    }),
    [logout, token, user]
  );

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth() {
  return useContext(AuthContext);
}
