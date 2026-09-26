import React from "react";
import { Link } from "react-router-dom";
import PublicHeader from "../components/PublicHeader";

export default function NotFoundPage() {
  return (
    <>
      <PublicHeader />
      <main className="auth-page">
        <section className="auth-card">
          <span className="auth-card__kicker">404 · Потерялись в сказке?</span>
          <h1>Страница не найдена</h1>
          <p>Возможно, адрес изменился или в ссылку закралась опечатка.</p>
          <Link className="button button--primary" to="/">
            На главную
          </Link>
        </section>
      </main>
    </>
  );
}
