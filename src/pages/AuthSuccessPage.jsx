import React, { useEffect, useState } from 'react';
import { Navigate } from 'react-router-dom';
import { useAuth } from '../auth/AuthContext';

export default function AuthSuccessPage() {
  const { refreshSession } = useAuth();
  const [done, setDone] = useState(false);
  useEffect(() => {
    let active = true;
    refreshSession().finally(() => { if (active) setDone(true); });
    return () => { active = false; };
  }, [refreshSession]);
  return done ? <Navigate to="/" replace /> : <main className="auth-page"><p className="auth-status">Проверяем сессию…</p></main>;
}
