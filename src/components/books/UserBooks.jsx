import React, { useCallback, useState } from "react";
import apiService from "../../services/ApiService";
import { BookViewer } from "./BookViewer";
import { SceneEditorModal } from "./SceneEditorModal";

const STAGE_LABELS = {
  story: "Создаем историю",
  cover: "Рисуем обложку",
  scenes: "Готовим иллюстрации",
  book: "Собираем книгу",
};

const formatGeneratedAt = (generatedAt) => {
  const date = new Date(generatedAt);
  if (Number.isNaN(date.getTime())) return generatedAt;
  return new Intl.DateTimeFormat("ru-RU", {
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  }).format(date);
};

const FlowPlaceholder = ({ flow, isRetrying, onRetry }) => {
  const failed = flow.status === "error";
  const complete = flow.stage === "book" && flow.status === "success";
  return (
    <article
      className={`download-link user-book user-book--flow ${failed ? "is-failed" : ""}`}
      data-testid="generation-placeholder"
    >
      <div className="user-book__placeholder-art" aria-hidden="true">
        {failed ? "!" : <span className="gen-loader" />}
      </div>
      <h3>
        {failed
          ? "Не удалось создать книгу"
          : complete
            ? "Книга готова"
            : "Ваша книга создается"}
      </h3>
      <p className="user-book__flow-stage">
        {failed
          ? `Ошибка на этапе: ${STAGE_LABELS[flow.stage] || flow.stage}`
          : complete
            ? "Обновляем библиотеку..."
            : STAGE_LABELS[flow.stage]}
      </p>
      <small>Номер: {flow.storyId}</small>
      {(failed || complete) && (
        <button
          type="button"
          className="button button--primary user-book__retry"
          onClick={onRetry}
          disabled={isRetrying}
        >
          {isRetrying ? "Обновляем..." : complete ? "Обновить библиотеку" : "Обновить статус"}
        </button>
      )}
    </article>
  );
};

export const UserBooks = ({
  books,
  isLoading,
  error,
  activeFlow = null,
  isRetrying = false,
  onRetry = () => undefined,
}) => {
  const [editingBook, setEditingBook] = useState(null);
  const [readingBook, setReadingBook] = useState(null);
  const [resourceError, setResourceError] = useState("");
  const closeViewer = useCallback(() => setReadingBook(null), []);
  const displayedFlow =
    activeFlow?.stage === "book" && activeFlow?.status === "success" &&
    books.some((book) => (book.storyId ?? book.id) === activeFlow.storyId)
      ? null
      : activeFlow;
  const flowStoryId = displayedFlow?.storyId || null;
  const visibleBooks = flowStoryId
    ? books.filter((book) => (book.storyId ?? book.id) !== flowStoryId)
    : books;

  const handleDownload = async (event, storyId, title) => {
    event.preventDefault();
    setResourceError("");
    try {
      const blob = await apiService.downloadBook(storyId);
      const objectUrl = URL.createObjectURL(blob);
      const link = document.createElement("a");
      link.href = objectUrl;
      link.download = `${title || storyId}.pdf`;
      link.click();
      URL.revokeObjectURL(objectUrl);
    } catch (requestError) {
      if (requestError.status !== 401)
        setResourceError(
          requestError.status === 404
            ? "Запрошенная книга недоступна."
            : requestError.message,
        );
    }
  };

  if (isLoading && !activeFlow && !visibleBooks.length)
    return <p className="user-books-status">Загружаем ваши книги...</p>;
  if (error && !activeFlow && !visibleBooks.length)
    return <p className="user-books-error">{error}</p>;
  if (!visibleBooks.length && !activeFlow) return null;

  return (
    <section className="user-books" id="user-books">
      <div className="user-books__heading container">
        <div>
          <span className="user-books__kicker">Личная библиотека</span>
          <h2>Ваши сказки</h2>
        </div>
        <p>Готовые истории и текущий процесс создания книги находятся здесь.</p>
      </div>
      <div className="user-books-list">
        {displayedFlow && (
          <FlowPlaceholder
            flow={displayedFlow}
            isRetrying={isRetrying}
            onRetry={onRetry}
          />
        )}
        {visibleBooks.map((book) => {
          const storyId = book.storyId ?? book.id;
          return (
            <article
              className="download-link user-book"
              key={storyId ?? `${book.downloadUrl}-${book.generatedAt}`}
            >
              <button
                type="button"
                className="user-book__edit"
                onClick={() => setEditingBook({ ...book, storyId })}
                disabled={!storyId}
                aria-label={`Редактировать сцены сказки «${book.title}»`}
                title={
                  storyId
                    ? "Редактировать сцены"
                    : "Для этой книги не найден storyId"
                }
              >
                <span aria-hidden="true">✎</span>
              </button>
              <h3>{book.title}</h3>
              <img
                src={apiService.getCoverUrl(storyId)}
                alt={`Обложка книги «${book.title}»`}
                onError={() =>
                  setResourceError("Обложка одной из книг недоступна.")
                }
              />
              <time dateTime={book.generatedAt}>
                {formatGeneratedAt(book.generatedAt)}
              </time>
              {storyId && <button
                type="button"
                className="user-book__read"
                onClick={() => {
                  setResourceError("");
                  setReadingBook({ ...book, storyId });
                }}
              >
                Читать книгу
              </button>}
              <a
                href={apiService.getBookDownloadUrl(storyId)}
                target="_blank"
                rel="noopener noreferrer"
                onClick={(event) => handleDownload(event, storyId, book.title)}
              >
                Скачать PDF
              </a>
            </article>
          );
        })}
      </div>
      {isLoading && <p className="user-books-status">Обновляем библиотеку...</p>}
      {error && (
        <p className="user-books-error" role="alert">
          {error}
        </p>
      )}
      {resourceError && (
        <p className="user-books-error" role="alert">
          {resourceError}
        </p>
      )}
      {editingBook && (
        <SceneEditorModal
          book={editingBook}
          onClose={() => setEditingBook(null)}
        />
      )}
      {readingBook && (
        <BookViewer
          storyId={readingBook.storyId}
          title={readingBook.title}
          onClose={closeViewer}
        />
      )}
    </section>
  );
};
