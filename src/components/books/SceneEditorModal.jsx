import React, { useEffect, useRef, useState } from 'react';
import { createPortal } from 'react-dom';
import apiService from '../../services/ApiService';

const countWords = (text) => text.trim().split(/\s+/u).filter(Boolean).length;

export const SceneEditorModal = ({ book, onClose }) => {
  const [title, setTitle] = useState(book.title);
  const [scenes, setScenes] = useState([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);
  const [saveStage, setSaveStage] = useState('idle');
  const [error, setError] = useState('');
  const [isSaved, setIsSaved] = useState(false);
  const closeButtonRef = useRef(null);

  useEffect(() => {
    const controller = new AbortController();
    const previousOverflow = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    closeButtonRef.current?.focus();

    const handleKeyDown = (event) => {
      if (event.key === 'Escape') onClose();
    };
    document.addEventListener('keydown', handleKeyDown);

    apiService.getStoryScenes(book.storyId, controller.signal)
      .then((result) => {
        setTitle(result?.title || book.title);
        setScenes(Array.isArray(result?.scenes) ? result.scenes : []);
      })
      .catch((requestError) => {
        if (requestError.name !== 'AbortError') setError(requestError.message);
      })
      .finally(() => {
        if (!controller.signal.aborted) setIsLoading(false);
      });

    return () => {
      controller.abort();
      document.body.style.overflow = previousOverflow;
      document.removeEventListener('keydown', handleKeyDown);
    };
  }, [book.storyId, book.title, onClose]);

  const handleSceneChange = (sceneId, text) => {
    setScenes((currentScenes) => currentScenes.map((scene) => (
      scene.sceneId === sceneId ? { ...scene, text } : scene
    )));
    setError('');
    setIsSaved(false);
  };

  const handleSave = async () => {
    setIsSaving(true);
    setSaveStage('saving');
    setError('');
    setIsSaved(false);

    try {
      const updateResult = await apiService.updateStoryScenes(
        book.storyId,
        scenes.map(({ sceneId, text }) => ({ sceneId, text: text.trim() })),
      );

      if (updateResult?.requiresBookRegeneration) {
        setSaveStage('rebuilding');
        try {
          await apiService.regenerateBook(book.storyId);
        } catch (rebuildError) {
          const errorWithContext = new Error(
            `Тексты сцен сохранены, но книгу не удалось пересобрать. ${rebuildError.message}`,
          );
          errorWithContext.cause = rebuildError;
          throw errorWithContext;
        }
      }

      setScenes((currentScenes) => currentScenes.map((scene) => ({
        ...scene,
        text: scene.text.trim(),
      })));
      setIsSaved(true);
    } catch (requestError) {
      setError(requestError.message);
    } finally {
      setIsSaving(false);
      setSaveStage('idle');
    }
  };

  const hasInvalidScenes = scenes.some((scene) => !scene.text.trim() || scene.text.trim().length > 1500);

  return createPortal(
    <div className="scene-modal" role="presentation" onMouseDown={(event) => {
      if (event.target === event.currentTarget) onClose();
    }}>
      <section className="scene-modal__dialog" role="dialog" aria-modal="true" aria-labelledby="scene-editor-title">
        <header className="scene-modal__header">
          <div>
            <span className="scene-modal__kicker">Редактор сказки</span>
            <h2 id="scene-editor-title">{title}</h2>
            <p>Немного скорректируйте текст каждой сцены. Рекомендуемый объём — 65–80 слов.</p>
          </div>
          <button ref={closeButtonRef} type="button" className="scene-modal__close" onClick={onClose} aria-label="Закрыть редактор">×</button>
        </header>

        <div className="scene-modal__body">
          {isLoading && <div className="scene-modal__status"><span className="gen-loader" /> Загружаем сцены…</div>}
          {!isLoading && error && !scenes.length && <p className="scene-modal__error">{error}</p>}
          {!isLoading && !error && !scenes.length && <p className="scene-modal__empty">В этой сказке пока нет сцен для редактирования.</p>}

          {scenes.map((scene, index) => {
            const words = countWords(scene.text);
            const isRecommendedLength = words >= 65 && words <= 80;

            return (
              <div className="scene-editor" key={scene.sceneId}>
                <div className="scene-editor__label">
                  <label htmlFor={`scene-${scene.sceneId}`}>Сцена {index + 1}</label>
                  <span className={isRecommendedLength ? 'is-ok' : ''}>{words} слов</span>
                </div>
                <textarea
                  id={`scene-${scene.sceneId}`}
                  value={scene.text}
                  onChange={(event) => handleSceneChange(scene.sceneId, event.target.value)}
                  rows={7}
                  maxLength={1500}
                />
                <small className={scene.text.trim().length > 1500 ? 'scene-editor__limit is-invalid' : 'scene-editor__limit'}>
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
              {isSaved && <span className="scene-modal__success">Изменения сохранены, книга пересобрана</span>}
            </div>
            <div className="scene-modal__actions">
              <button type="button" className="button button--secondary" onClick={onClose}>Закрыть</button>
              <button type="button" className="button button--primary" onClick={handleSave} disabled={isSaving || hasInvalidScenes}>
                {saveStage === 'saving' && 'Сохраняем тексты…'}
                {saveStage === 'rebuilding' && 'Пересобираем книгу…'}
                {saveStage === 'idle' && 'Сохранить и пересобрать'}
              </button>
            </div>
          </footer>
        )}
      </section>
    </div>,
    document.body,
  );
};
