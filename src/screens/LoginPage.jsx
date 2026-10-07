"use client";

import React, { useState } from "react";
import { useAuth } from "../auth/AuthContext";
import { finishAuthAnalytics, startAuthAnalytics } from "../utils/analytics";
import horizontalLogo from "../assets/horizont-logo.png";

const isDevLoginVisible =
  process.env.NODE_ENV === "development" &&
  process.env.NEXT_PUBLIC_DEV_AUTH_ENABLED === "true";

export default function LoginPage({
  showDevLogin = isDevLoginVisible,
  navigateToYandex = () => window.location.assign("/api/auth/yandex"),
}) {
  const { devLogin } = useAuth();
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState("");
  const handleDevLogin = async () => {
    startAuthAnalytics();
    setIsLoading(true);
    setError("");
    try {
      const user = await devLogin();
      if (user) finishAuthAnalytics();
    } catch (requestError) {
      setError(
        requestError.status === 404
          ? "Тестовый вход отключён на backend."
          : requestError.message,
      );
    } finally {
      setIsLoading(false);
    }
  };

  const handleYandexLogin = () => {
    startAuthAnalytics();
    navigateToYandex();
  };

  return (
    <main className="auth-page">
      <section className="auth-card" aria-labelledby="login-title">
        <img
          className="auth-card__logo"
          src={horizontalLogo.src}
          alt="Детки-сказки"
        />
        <span className="auth-card__kicker">Личная библиотека сказок</span>
        <h1 id="login-title">Войдите, чтобы создавать истории</h1>
        <p>
          Авторизация сохранит ваши сказки в личной библиотеке и защитит доступ
          к ним.
        </p>
        <button
          type="button"
          className="button button--primary auth-card__action"
          onClick={handleYandexLogin}
        >
          Войти с Яндекс ID
        </button>
        {showDevLogin && (
          <button
            type="button"
            className="button button--secondary auth-card__action"
            onClick={handleDevLogin}
            disabled={isLoading}
          >
            {isLoading ? "Входим…" : "Тестовый вход"}
          </button>
        )}
        {error && (
          <p className="auth-card__error" role="alert">
            {error}
          </p>
        )}
      </section>
    </main>
  );
}
