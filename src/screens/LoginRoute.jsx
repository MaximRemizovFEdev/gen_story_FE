"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";
import { AUTH_STATUS, useAuth } from "../auth/AuthContext";
import LoginPage from "./LoginPage";

export default function LoginRoute() {
  const { status } = useAuth();
  const router = useRouter();

  useEffect(() => {
    if (status === AUTH_STATUS.AUTHENTICATED) router.replace("/app");
  }, [router, status]);

  if (status === AUTH_STATUS.AUTHENTICATED) {
    return (
      <main className="auth-page">
        <p className="auth-status">Проверяем сессию…</p>
      </main>
    );
  }

  return <LoginPage />;
}
