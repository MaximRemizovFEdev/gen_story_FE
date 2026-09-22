import React, { useState } from "react";
import { useAuth } from "../auth/AuthContext";
import horizontalLogo from "../assets/horizont-logo.png";

const isDevLoginVisible =
  import.meta.env.DEV && import.meta.env.VITE_DEV_AUTH_ENABLED === "true";

export default function LoginPage({
  showDevLogin = isDevLoginVisible,
  navigateToYandex = () => window.location.assign("/api/auth/yandex"),
}) {
  const { devLogin } = useAuth();
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState("");
  const handleDevLogin = async () => {
    setIsLoading(true);
    setError("");
    try {
      await devLogin();
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

  return (
    <main className="auth-page">
      <section className="auth-card" aria-labelledby="login-title">
        <img
          className="auth-card__logo"
          src={horizontalLogo}
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
          onClick={navigateToYandex}
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
