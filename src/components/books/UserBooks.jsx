import React from 'react';
import apiService from '../../services/ApiService';

const formatGeneratedAt = (generatedAt) => {
  const date = new Date(generatedAt);
  if (Number.isNaN(date.getTime())) return generatedAt;

  return new Intl.DateTimeFormat('ru-RU', {
    day: '2-digit',
    month: '2-digit',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit'
  }).format(date);
};

export const UserBooks = ({ books, isLoading, error }) => {
  if (isLoading) return <p className="user-books-status">Загружаем ваши книги...</p>;
  if (error) return <p className="user-books-error">{error}</p>;
  if (!books.length) return null;

  return (
    <section className="user-books">
      <h2>Ваши книги</h2>
      <div className="user-books-list">
        {books.map((book) => (
          <article
            className="download-link user-book"
            key={`${book.downloadUrl}-${book.generatedAt}`}
          >
            <h3>{book.title}</h3>
            <img
              src={apiService.getFileUrl(book.coverUrl)}
              alt={`Обложка книги «${book.title}»`}
            />
            <time dateTime={book.generatedAt}>
              {formatGeneratedAt(book.generatedAt)}
            </time>
            <a
              href={apiService.getFileUrl(book.downloadUrl)}
              target="_blank"
              rel="noopener noreferrer"
            >
              Скачать
            </a>
          </article>
        ))}
      </div>
    </section>
  );
};
