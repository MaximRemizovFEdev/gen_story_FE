import React from "react";
import { createPortal } from "react-dom";
import { PAGE_WIDTH, PAGE_HEIGHT, PAGE_STYLE } from "./constants";
import { BookPage } from "./components/BookPage/BookPage";
import { useBookViewer } from "./hooks";

export const BookViewer = ({ storyId, title, onClose }) => {
  const {
    book,
    pageIndex,
    status,
    error,
    backgroundFailed,
    downloadBusy,
    downloadError,
    closeButtonRef,
    dialogRef,
    stageRef,
    pages,
    currentPage,
    scale,
    canGoBack,
    canGoForward,
    goBack,
    goForward,
    handlePointerDown,
    handlePointerUp,
    handleDownload,
    handleDismissDown,
    handleDismissUp,
    handlePointerCancel,
    handleLostPointerCapture,
    handleRetry,
    handleImageError,
    handlePageChange,
  } = useBookViewer({ storyId, title, onClose });

  return createPortal(
    <div
      className={`book-viewer ${backgroundFailed ? "has-neutral-background" : ""}`}
      role="presentation"
      data-viewer-free-area
      onPointerDown={handleDismissDown}
      onPointerUp={handleDismissUp}
    >
      {currentPage?.imageUrl && !backgroundFailed && (
        <div
          className="book-viewer__background"
          style={{ backgroundImage: `url("${currentPage.imageUrl}")` }}
          aria-hidden="true"
        />
      )}
      <section
        ref={dialogRef}
        className="book-viewer__dialog"
        role="dialog"
        aria-modal="true"
        aria-labelledby="book-viewer-title"
      >
        <h2 id="book-viewer-title" className="visually-hidden">
          {book?.title || title || "Книга"}
        </h2>
        <header className="book-viewer__header" data-viewer-protected>
          <button
            ref={closeButtonRef}
            type="button"
            className="book-viewer__close"
            onClick={onClose}
            aria-label="Закрыть просмотр книги"
          >
            ×
          </button>
          <span className="book-viewer__counter" aria-live="polite">
            {pages.length ? pageIndex + 1 : 0} / {pages.length || 0}
          </span>
          <button
            type="button"
            className="book-viewer__download"
            onClick={handleDownload}
            disabled={downloadBusy || status !== "ready"}
            aria-busy={downloadBusy}
          >
            {downloadBusy ? "Скачиваем…" : "Скачать PDF"}
          </button>
        </header>

        <div
          ref={stageRef}
          className="book-viewer__stage"
          data-viewer-free-area
          onPointerDown={handlePointerDown}
          onPointerUp={handlePointerUp}
          onPointerCancel={handlePointerCancel}
          onLostPointerCapture={handleLostPointerCapture}
        >
          {status === "loading" && (
            <div className="book-viewer__status" data-viewer-protected>
              <span className="gen-loader" /> Загружаем книгу…
            </div>
          )}
          {status === "error" && (
            <div
              className="book-viewer__error"
              role="alert"
              data-viewer-protected
            >
              <p>{error}</p>
              <button
                type="button"
                className="button button--primary"
                onClick={handleRetry}
              >
                Повторить
              </button>
            </div>
          )}
          {status === "ready" && currentPage && (
            <div
              className="book-viewer__scaled-page"
              data-viewer-protected
              style={{
                width: PAGE_WIDTH * scale,
                height: PAGE_HEIGHT * scale,
              }}
            >
              <div
                className="book-viewer__sheet"
                style={{ ...PAGE_STYLE, transform: `scale(${scale})` }}
              >
                <BookPage
                  key={`${storyId}-${pageIndex}`}
                  page={currentPage}
                  scale={scale}
                  onImageError={handleImageError}
                />
              </div>
            </div>
          )}
        </div>

        <footer className="book-viewer__controls" data-viewer-protected>
          <label className="visually-hidden" htmlFor="book-viewer-page-range">
            Выбрать страницу
          </label>
          <input
            id="book-viewer-page-range"
            className="book-viewer__range"
            type="range"
            min="1"
            max={Math.max(1, pages.length)}
            step="1"
            value={pages.length ? pageIndex + 1 : 1}
            disabled={status !== "ready" || pages.length <= 1}
            aria-valuetext={
              pages.length
                ? `Страница ${pageIndex + 1} из ${pages.length}`
                : "Книга загружается"
            }
            onChange={handlePageChange}
          />
          {downloadError && (
            <div className="book-viewer__download-error" role="alert">
              {downloadError}
            </div>
          )}
        </footer>
        <button
          type="button"
          className="book-viewer__arrow book-viewer__arrow--back"
          onClick={goBack}
          disabled={!canGoBack}
          aria-label="Назад"
        >
          ‹
        </button>
        <button
          type="button"
          className="book-viewer__arrow book-viewer__arrow--forward"
          onClick={goForward}
          disabled={!canGoForward}
          aria-label="Вперёд"
        >
          ›
        </button>
      </section>
    </div>,
    document.body,
  );
};
