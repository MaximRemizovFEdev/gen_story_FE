import React from "react";

export default function PaymentReturnPage() {
  return (
    <main className="auth-page">
      <section className="auth-card" aria-labelledby="payment-return-title">
        <span className="auth-card__kicker">Оплата завершена</span>
        <h1 id="payment-return-title">Оплата завершена</h1>
        <p>
          Вернитесь во вкладку создания сказки. Создание начнётся автоматически.
        </p>
      </section>
    </main>
  );
}
