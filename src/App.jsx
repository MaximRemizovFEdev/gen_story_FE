import React from 'react';
import { BrowserRouter, Routes, Route } from 'react-router-dom';
import HomePage from './pages/HomePage';
import LoginPage from './pages/LoginPage';
import AuthSuccessPage from './pages/AuthSuccessPage';
import AuthErrorPage from './pages/AuthErrorPage';
import { AUTH_STATUS, AuthProvider, useAuth } from './auth/AuthContext';

export function RootRoute() {
  const { status } = useAuth();
  if (status === AUTH_STATUS.CHECKING) return <main className="auth-page"><p className="auth-status">Проверяем сессию…</p></main>;
  return status === AUTH_STATUS.AUTHENTICATED ? <HomePage /> : <LoginPage />;
}

function App() {
  return (
    <AuthProvider>
      <BrowserRouter>
        <Routes>
          <Route path="/" element={<RootRoute />} />
          <Route path="/auth/success" element={<AuthSuccessPage />} />
          <Route path="/auth/error" element={<AuthErrorPage />} />
          <Route path="*" element={<RootRoute />} />
        </Routes>
      </BrowserRouter>
    </AuthProvider>
  );
}

export default App;
