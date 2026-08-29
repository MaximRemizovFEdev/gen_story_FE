import React from 'react';
import { Link } from 'react-router-dom';

export default function AuthErrorPage() {
  return <main className="auth-page"><section className="auth-card" aria-labelledby="auth-error-title">
    <span className="auth-card__kicker">Не удалось войти</span>
    <h1 id="auth-error-title">Авторизация не завершена</h1>
    <p>Попробуйте войти ещё раз. Если ошибка повторяется, вернитесь позже.</p>
    <Link className="button button--primary auth-card__action" to="/">Повторить вход</Link>
  </section></main>;
}
