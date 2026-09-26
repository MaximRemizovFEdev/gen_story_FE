import React from "react";
import {
  BrowserRouter,
  Routes,
  Route,
  Navigate,
  useLocation,
} from "react-router-dom";
import { useEffect } from "react";
import SiteFooter from "./components/SiteFooter";
import LandingPage from "./pages/LandingPage";
import LegalDocumentPage from "./pages/LegalDocumentPage";
import NotFoundPage from "./pages/NotFoundPage";
import HomePage from "./pages/HomePage";
import LoginPage from "./pages/LoginPage";
import AuthSuccessPage from "./pages/AuthSuccessPage";
import AuthErrorPage from "./pages/AuthErrorPage";
import PaymentReturnPage from "./pages/PaymentReturnPage";
import { AUTH_STATUS, AuthProvider, useAuth } from "./auth/AuthContext";
import { GenerationProcessProvider } from "./hooks/GenerationProcessContext";

export function RootRoute() {
  const { status } = useAuth();
  if (status === AUTH_STATUS.CHECKING)
    return (
      <main className="auth-page">
        <p className="auth-status">Проверяем сессию…</p>
      </main>
    );
  return status === AUTH_STATUS.AUTHENTICATED ? (
    <HomePage />
  ) : (
    <Navigate to="/auth" replace />
  );
}

function LoginRoute() {
  const { status } = useAuth();
  return status === AUTH_STATUS.AUTHENTICATED ? (
    <Navigate to="/app" replace />
  ) : (
    <LoginPage />
  );
}

export function AppRoutes() {
  const { pathname } = useLocation();
  useEffect(() => {
    window.scrollTo(0, 0);
  }, [pathname]);
  return (
    <div className="site-layout">
      <div className="site-content">
        <GenerationProcessProvider>
          <Routes>
            <Route path="/" element={<LandingPage />} />
            <Route path="/app" element={<RootRoute />} />
            <Route path="/auth" element={<LoginRoute />} />
            <Route
              path="/privacy"
              element={<LegalDocumentPage document="privacy" />}
            />
            <Route
              path="/policy"
              element={<LegalDocumentPage document="policy" />}
            />
            <Route
              path="/oferta"
              element={<LegalDocumentPage document="oferta" />}
            />
            <Route path="/auth/success" element={<AuthSuccessPage />} />
            <Route path="/auth/error" element={<AuthErrorPage />} />
            <Route path="/payment-return" element={<PaymentReturnPage />} />
            <Route path="*" element={<NotFoundPage />} />
          </Routes>
        </GenerationProcessProvider>
      </div>
      <SiteFooter />
    </div>
  );
}

function App() {
  return (
    <AuthProvider>
      <BrowserRouter>
        <AppRoutes />
      </BrowserRouter>
    </AuthProvider>
  );
}

export default App;
