import React from "react";
import Link from "next/link";

export default function AuthErrorPage() {
  return (
    <main className="auth-page">
      <section className="auth-card" aria-labelledby="auth-error-title">
        <span className="auth-card__kicker">Не удалось войти</span>
        <h1 id="auth-error-title">Авторизация не завершена</h1>
        <p>
          Попробуйте войти ещё раз. Если ошибка повторяется, вернитесь позже.
        </p>
        <Link className="button button--primary pad auth-card__action" href="/auth">
          Повторить вход
        </Link>
      </section>
    </main>
  );
}
