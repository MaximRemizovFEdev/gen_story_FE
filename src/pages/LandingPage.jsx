import React from "react";
import { Link } from "react-router-dom";
import PublicHeader from "../components/PublicHeader";
import { AUTH_STATUS, useAuth } from "../auth/AuthContext";
import { service } from "../config/service";
import artwork from "../assets/storybook-hero.jpg";

export default function LandingPage() {
  const { status } = useAuth();
  const authenticated = status === AUTH_STATUS.AUTHENTICATED;
  return (
    <div className="landing-page">
      <PublicHeader />
      <main className="container">
        <section className="landing-hero" aria-labelledby="landing-title">
          <div>
            <span className="eyebrow">
              ✦ Маленький герой. Большое приключение.
            </span>
            <h1 id="landing-title">Сказка, где ваш ребёнок — главный герой</h1>
            <p className="hero__lead">
              Детки-сказки — сервис генерации персональных сказок с
              иллюстрациями. Любимые герои, интересы и мечты вашего малыша
              оживают на страницах его собственной книги.
            </p>
            <Link
              className="button button--primary"
              to={authenticated ? "/app" : "/auth"}
            >
              {authenticated
                ? "Перейти в личный кабинет"
                : "Войти и создать сказку"}
            </Link>
            <p className="landing-caption">
              Одна персональная сказка — {service.price} ₽
            </p>
          </div>
          <img
            className="landing-artwork"
            src={artwork}
            alt="Ребёнок на добром драконе вылетает из волшебной книги"
          />
        </section>
        <section className="landing-section" aria-labelledby="how-title">
          <span className="eyebrow">От идеи до любимой книги</span>
          <h2 id="how-title">Как это работает</h2>
          <div className="landing-steps">
            <article>
              <span className="step-number">01</span>
              <h3>Расскажите о ребёнке</h3>
              <p>
                Заполните 7 вопросов: от имени и возраста до любимых
                приключений. Фото можно добавить по желанию.
              </p>
            </article>
            <article>
              <span className="step-number">02</span>
              <h3>Дайте истории ожить</h3>
              <p>
                Сервис создаст персональную сказку и нарисует иллюстрации к
                вашему приключению.
              </p>
            </article>
            <article>
              <span className="step-number">03</span>
              <h3>Читайте вместе</h3>
              <p>
                Получите PDF-сказку с картинками — для уютного вечера и новых
                семейных воспоминаний.
              </p>
            </article>
          </div>
        </section>
        <section
          className="landing-offer landing-section"
          aria-labelledby="price-title"
        >
          <div>
            <span className="eyebrow">Одна книга — целый волшебный мир</span>
            <h2 id="price-title">Персональная сказка с иллюстрациями</h2>
            <p>
              Уникальная история по вашим ответам, иллюстрации и готовая
              электронная книга.
            </p>
            <p className="landing-price">
              {service.price} ₽ <span>за одну сказку</span>
            </p>
          </div>
          <div className="landing-delivery">
            <h3>Как получить результат</h3>
            <p>
              После оплаты сказка появится в вашем личном кабинете. Её можно
              скачать в PDF или читать онлайн.
            </p>
            <Link
              to={authenticated ? "/app" : "/auth"}
              className="button button--primary"
            >
              {authenticated ? "В личный кабинет" : "Войти и создать сказку"}
            </Link>
            <Link className="offer-link" to="/oferta">
              Условия оказания услуги
            </Link>
          </div>
        </section>
      </main>
    </div>
  );
}
