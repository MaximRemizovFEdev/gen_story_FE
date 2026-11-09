import React from "react";
import { createPortal } from "react-dom";
import { useSceneEditorModal } from "./hooks";
import type { SceneEditorModalProps } from "./hooks";

export const SceneEditorModal = ({ book, onClose }: SceneEditorModalProps) => {
  const {
    title,
    scenes,
    isLoading,
    isSaving,
    saveStage,
    error,
    isSaved,
    closeButtonRef,
    handleSceneChange,
    handleSave,
    hasInvalidScenes,
    handleMouseDown,
    countWords,
  } = useSceneEditorModal({ book, onClose });

  return createPortal(
    <div
      className="scene-modal"
      role="presentation"
      onMouseDown={handleMouseDown}
    >
      <section
        className="scene-modal__dialog"
        role="dialog"
        aria-modal="true"
        aria-labelledby="scene-editor-title"
      >
        <header className="scene-modal__header">
          <div>
            <span className="scene-modal__kicker">Редактор сказки</span>
            <h2 id="scene-editor-title">{title}</h2>
            <p>
              Немного скорректируйте текст каждой сцены. Рекомендуемый объём —
              65–80 слов.
            </p>
          </div>
          <button
            ref={closeButtonRef}
            type="button"
            className="scene-modal__close"
            onClick={onClose}
            aria-label="Закрыть редактор"
          >
            ×
          </button>
        </header>

        <div className="scene-modal__body">
          {isLoading && (
            <div className="scene-modal__status">
              <span className="gen-loader" /> Загружаем сцены…
            </div>
          )}
          {!isLoading && error && !scenes.length && (
            <p className="scene-modal__error">{error}</p>
          )}
          {!isLoading && !error && !scenes.length && (
            <p className="scene-modal__empty">
              В этой сказке пока нет сцен для редактирования.
            </p>
          )}

          {scenes.map((scene, index) => {
            const words = countWords(scene.text);
            const isRecommendedLength = words >= 65 && words <= 80;

            return (
              <div className="scene-editor" key={scene.sceneId}>
                <div className="scene-editor__label">
                  <label htmlFor={`scene-${scene.sceneId}`}>
                    Сцена {index + 1}
                  </label>
                  <span className={isRecommendedLength ? "is-ok" : ""}>
                    {words} слов
                  </span>
                </div>
                <textarea
                  id={`scene-${scene.sceneId}`}
                  value={scene.text}
                  onChange={(event) =>
                    handleSceneChange(scene.sceneId, event.target.value)
                  }
                  rows={7}
                  maxLength={1500}
                />
                <small
                  className={
                    scene.text.trim().length > 1500
                      ? "scene-editor__limit is-invalid"
                      : "scene-editor__limit"
                  }
                >
                  {scene.text.trim().length}/1500 символов
                </small>
                {!isRecommendedLength && (
                  <small>Рекомендуемый объём: 65–80 слов</small>
                )}
              </div>
            );
          })}
        </div>

        {!!scenes.length && (
          <footer className="scene-modal__footer">
            <div aria-live="polite">
              {error && <span className="scene-modal__error">{error}</span>}
              {isSaved && (
                <span className="scene-modal__success">
                  Изменения сохранены, книга пересобрана
                </span>
              )}
            </div>
            <div className="scene-modal__actions">
              <button
                type="button"
                className="button button--secondary"
                onClick={onClose}
              >
                Закрыть
              </button>
              <button
                type="button"
                className="button button--primary"
                onClick={handleSave}
                disabled={isSaving || hasInvalidScenes}
              >
                {saveStage === "saving" && "Сохраняем тексты…"}
                {saveStage === "rebuilding" && "Пересобираем книгу…"}
                {saveStage === "idle" && "Сохранить и пересобрать"}
              </button>
            </div>
          </footer>
        )}
      </section>
    </div>,
    document.body,
  );
};
