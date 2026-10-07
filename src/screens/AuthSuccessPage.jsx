"use client";

import React, { useEffect } from "react";
import { useRouter } from "next/navigation";
import { useAuth } from "../auth/AuthContext";

export default function AuthSuccessPage() {
  const { refreshSession } = useAuth();
  const router = useRouter();
  useEffect(() => {
    let active = true;
    refreshSession()
      .then((user) => {
        if (active) router.replace(user ? "/app" : "/auth");
      })
      .catch(() => {
        if (active) router.replace("/auth/error");
      });
    return () => {
      active = false;
    };
  }, [refreshSession, router]);
  return (
    <main className="auth-page">
      <p className="auth-status">Проверяем сессию…</p>
    </main>
  );
}
