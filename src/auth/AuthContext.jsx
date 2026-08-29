import React, { createContext, useCallback, useContext, useEffect, useMemo, useRef, useState } from 'react';
import apiService from '../services/ApiService';

export const AUTH_STATUS = Object.freeze({ CHECKING: 'checking', AUTHENTICATED: 'authenticated', ANONYMOUS: 'anonymous' });
const AuthContext = createContext(null);

export function AuthProvider({ children }) {
  const [status, setStatus] = useState(AUTH_STATUS.CHECKING);
  const [user, setUser] = useState(null);
  const [sessionVersion, setSessionVersion] = useState(0);
  const statusRef = useRef(AUTH_STATUS.CHECKING);

  const setSession = useCallback((nextStatus, nextUser = null) => {
    statusRef.current = nextStatus;
    setStatus(nextStatus);
    setUser(nextUser);
  }, []);

  const invalidateSession = useCallback(() => {
    if (statusRef.current === AUTH_STATUS.ANONYMOUS) return;
    setSession(AUTH_STATUS.ANONYMOUS);
    setSessionVersion((value) => value + 1);
  }, [setSession]);

  const refreshSession = useCallback(async ({ showChecking = true } = {}) => {
    if (showChecking) setSession(AUTH_STATUS.CHECKING);
    try {
      const profile = await apiService.getCurrentUser();
      if (!profile?.authenticated) { invalidateSession(); return null; }
      const safeUser = { phone: profile.phone ?? null };
      setSession(AUTH_STATUS.AUTHENTICATED, safeUser);
      return safeUser;
    } catch (error) {
      if (error.status === 401) { invalidateSession(); return null; }
      setSession(AUTH_STATUS.ANONYMOUS);
      throw error;
    }
  }, [invalidateSession, setSession]);

  const devLogin = useCallback(async () => { await apiService.devLogin(); return refreshSession(); }, [refreshSession]);
  const logout = useCallback(async () => {
    try { await apiService.logout(); }
    catch (error) { if (error.status !== 401) throw error; }
    finally { invalidateSession(); }
  }, [invalidateSession]);

  useEffect(() => {
    const removeHandler = apiService.setUnauthorizedHandler(invalidateSession);
    refreshSession().catch(() => undefined);
    return removeHandler;
  }, [invalidateSession, refreshSession]);

  const value = useMemo(() => ({
    status, user, sessionVersion, isAuthenticated: status === AUTH_STATUS.AUTHENTICATED,
    refreshSession, invalidateSession, devLogin, logout,
  }), [status, user, sessionVersion, refreshSession, invalidateSession, devLogin, logout]);
  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth() {
  const value = useContext(AuthContext);
  if (!value) throw new Error('useAuth must be used inside AuthProvider');
  return value;
}
