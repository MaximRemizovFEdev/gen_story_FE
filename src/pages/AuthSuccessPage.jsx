import React, { useEffect, useState } from "react";
import { Navigate } from "react-router-dom";
import { useAuth } from "../auth/AuthContext";

export default function AuthSuccessPage() {
  const { refreshSession } = useAuth();
  const [destination, setDestination] = useState(null);
  useEffect(() => {
    let active = true;
    refreshSession()
      .then((user) => {
        if (active) setDestination(user ? "/app" : "/auth");
      })
      .catch(() => {
        if (active) setDestination("/auth/error");
      });
    return () => {
      active = false;
    };
  }, [refreshSession]);
  return destination ? (
    <Navigate to={destination} replace />
  ) : (
    <main className="auth-page">
      <p className="auth-status">Проверяем сессию…</p>
    </main>
  );
}
