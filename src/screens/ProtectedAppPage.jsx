"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";
import { AUTH_STATUS, useAuth } from "../auth/AuthContext";
import HomePage from "./HomePage";

export default function ProtectedAppPage() {
  const { status } = useAuth();
  const router = useRouter();

  useEffect(() => {
    if (status === AUTH_STATUS.ANONYMOUS) router.replace("/auth");
  }, [router, status]);

  if (status === AUTH_STATUS.CHECKING || status === AUTH_STATUS.ANONYMOUS) {
    return (
      <main className="auth-page">
        <p className="auth-status">Проверяем сессию…</p>
      </main>
    );
  }

  return <HomePage />;
}
