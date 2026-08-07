import React from 'react';
import Wizard from '../components/Wizard';
import heroArtwork from '../assets/storybook-hero.jpg';

function HomePage() {
  return (
    <div className="home-page">
      <header className="site-header container">
        <a className="brand" href="#top" aria-label="Сказка рядом — на главную">
          <span className="brand__mark" aria-hidden="true">
            <span className="brand__star">★</span>
            <span className="brand__book">⌄</span>
          </span>
          <span>Сказка рядом</span>
        </a>
        <nav className="site-nav" aria-label="Основная навигация">
          <a href="#how-it-works">Как это работает</a>
          <a href="#story-builder">Создать сказку</a>
        </nav>
        <a className="header-cta" href="#story-builder">Начать</a>
      </header>

      <main id="top" className="hero container">
        <section className="hero__content" aria-labelledby="hero-title">
          <div className="eyebrow"><span aria-hidden="true">✦</span> Персональная сказка за несколько минут</div>
          <h1 id="hero-title">Сказка, где ваш ребёнок — главный герой</h1>
          <p className="hero__lead">
            Ответьте на несколько простых вопросов — и получите добрую историю
            с любимыми героями, интересами и приключением вашего малыша.
          </p>

          <div id="story-builder">
            <Wizard />
          </div>

          <div className="trust-row" aria-label="Преимущества">
            <span><b aria-hidden="true">✓</b> Данные в безопасности</span>
            <span><b aria-hidden="true">✦</b> Уникальная история</span>
          </div>
        </section>

        <aside className="hero__visual" aria-label="Сказочное приключение">
          <div className="hero__halo" />
          <img src={heroArtwork} alt="Ребёнок летит на добром драконе из волшебной книги" />
          <div className="story-note story-note--top"><span>★</span> Герой — ваш ребёнок</div>
          <div className="story-note story-note--bottom"><span>☾</span> Добрая история перед сном</div>
        </aside>
      </main>

      <section id="how-it-works" className="how-it-works container" aria-label="Как это работает">
        <article><span>1</span><div><h2>Расскажите о ребёнке</h2><p>Имя, возраст и любимые темы.</p></div></article>
        <article><span>2</span><div><h2>Выберите приключение</h2><p>Герои, настроение и волшебный мир.</p></div></article>
        <article><span>3</span><div><h2>Получите книгу</h2><p>Готовая иллюстрированная сказка в PDF.</p></div></article>
      </section>
    </div>
  );
}

export default HomePage;
