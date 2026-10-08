import React, {
  useCallback,
  useEffect,
  useLayoutEffect,
  useMemo,
  useRef,
  useState,
} from "react";
import { createPortal } from "react-dom";
import apiService from "../../services/ApiService";
import { downloadBookPdf } from "../../utils/downloadBook";

const PAGE_WIDTH = 840;
const PAGE_HEIGHT = 1188;
const BASE_FONT_SIZE = 24;
const LINE_HEIGHT = 1.15;
const PANEL_X = PAGE_WIDTH * 0.065;
const PANEL_PADDING = 24;
const PANEL_MAX_HEIGHT = PAGE_HEIGHT * 0.35;
const PANEL_WIDTH = PAGE_WIDTH - PANEL_X * 2;
const TEXT_WIDTH = PANEL_WIDTH - PANEL_PADDING * 2;
const TEXT_MAX_HEIGHT = PANEL_MAX_HEIGHT - PANEL_PADDING * 2;
const PAGE_STYLE = {
  "--book-page-width": `${PAGE_WIDTH}px`,
  "--book-page-height": `${PAGE_HEIGHT}px`,
  "--book-panel-x": `${PANEL_X}px`,
  "--book-panel-bottom": `${PAGE_HEIGHT * 0.055}px`,
  "--book-panel-width": `${PANEL_WIDTH}px`,
  "--book-panel-padding": `${PANEL_PADDING}px`,
  "--book-text-width": `${TEXT_WIDTH}px`,
};

const buildPages = (book) => {
  if (!book) return [];
  return [
    {
      id: "cover",
      kind: "cover",
      title: book.title,
      imageUrl: book.cover.imageUrl,
      text: "",
    },
    ...book.scenes.map((scene) => ({
      id: `scene-${scene.sceneId}`,
      kind: "scene",
      imageUrl: scene.imageUrl,
      text: scene.text,
    })),
  ];
};

const waitForFonts = () => {
  if (!document.fonts?.ready) return Promise.resolve();
  return document.fonts.ready.catch(() => undefined);
};

const findFittingFontSize = (measureNode) => {
  let high = BASE_FONT_SIZE;
  let low = BASE_FONT_SIZE;
  const fits = (size) => {
    measureNode.style.fontSize = `${size}px`;
    measureNode.style.lineHeight = String(LINE_HEIGHT);
    return (
      measureNode.scrollWidth <= measureNode.clientWidth &&
      measureNode.scrollHeight <= Math.floor(TEXT_MAX_HEIGHT) - 2
    );
  };

  if (fits(high)) return high;
  // Find a fitting lower bound without imposing a minimum that clips long text.
  while (!fits(low)) low /= 2;

  for (let index = 0; index < 14; index += 1) {
    const middle = (low + high) / 2;
    if (fits(middle)) low = middle;
    else high = middle;
  }
  fits(low);
  return low;
};

const FittedSceneText = ({ text, panelRef, isTitle }) => {
  const [fit, setFit] = useState(null);
  const measureRef = useRef(null);

  useLayoutEffect(() => {
    let cancelled = false;
    setFit(null);

    const measure = () => {
      if (cancelled || !measureRef.current) return;
      measureRef.current.textContent = text;
      const fontSize = findFittingFontSize(measureRef.current);
      setFit((previous) =>
        previous?.fontSize === fontSize && previous?.text === text
          ? previous
          : { fontSize, text },
      );
    };
    let observer;
    waitForFonts().then(() => {
      if (cancelled) return;
      measure();
      // Observe logical text metrics; a transform-only viewport resize doesn't
      // change this box and therefore doesn't recompose the page.
      if (typeof ResizeObserver !== "undefined") {
        observer = new ResizeObserver(measure);
        observer.observe(measureRef.current);
      }
    });
    document.fonts?.addEventListener("loadingdone", measure);

    return () => {
      cancelled = true;
      observer?.disconnect();
      document.fonts?.removeEventListener("loadingdone", measure);
    };
  }, [text, isTitle]);

  return (
    <>
      <div
        ref={measureRef}
        className={`book-viewer__text-content book-viewer__text-measure${isTitle ? " title" : ""}`}
        aria-hidden="true"
      />
      {!fit && (
        <div className="book-viewer__text-preparing">Готовим текст…</div>
      )}
      {fit && (
        <div
          ref={panelRef}
          className="book-viewer__text-panel"
          style={{
            fontSize: fit.fontSize,
            lineHeight: LINE_HEIGHT,
          }}
        >
          <div className={`book-viewer__text-content${isTitle ? " title" : ""}`}>{text}</div>
        </div>
      )}
    </>
  );
};

const Chevron = ({ expanded }) => (
  <svg viewBox="0 0 24 24" aria-hidden="true"><path d={expanded ? "m6 9 6 6 6-6" : "m6 15 6-6 6 6"} /></svg>
);

const BookPage = ({ page, onImageError, scale }) => {
  const [imageFailedFor, setImageFailedFor] = useState("");
  const [textExpanded, setTextExpanded] = useState(true);
  const [panelHeight, setPanelHeight] = useState(86);
  const panelRef = useCallback((node) => {
    if (node) setPanelHeight(node.offsetHeight);
  }, []);

  useEffect(() => {
    setImageFailedFor("");
    setTextExpanded(true);
  }, [page.id]);

  return (
    <div className="book-viewer__page" data-testid="book-viewer-page">
      {imageFailedFor === page.id ? (
        <div className="book-viewer__image-error" role="note">
          Изображение страницы недоступно
        </div>
      ) : (
        <img
          className="book-viewer__page-image"
          src={page.imageUrl}
          alt={page.kind === "cover" ? `Обложка книги «${page.title}»` : ""}
          onError={() => {
            setImageFailedFor(page.id);
            onImageError();
          }}
        />
      )}
      {(page.kind === "cover" || textExpanded) && (
        <FittedSceneText text={page.kind === "cover" ? page.title : page.text} panelRef={panelRef} isTitle={page.kind === "cover"} />
      )}
      {page.kind === "scene" && (
        <button
          type="button"
          className={`book-viewer__text-toggle ${textExpanded ? "" : "is-collapsed"}`}
          style={{
            bottom: PAGE_HEIGHT * 0.055 + (textExpanded ? panelHeight : 0),
            transform: `translateX(-50%) scale(${scale > 0 ? 1 / scale : 1})`,
          }}
          onClick={() => setTextExpanded((value) => !value)}
          aria-expanded={textExpanded}
          aria-label={textExpanded ? "Свернуть текст" : "Показать текст"}
          title={textExpanded ? "Свернуть текст" : "Показать текст"}
        ><Chevron expanded={textExpanded} /></button>
      )}
    </div>
  );
};

export const BookViewer = ({ storyId, title, onClose }) => {
  const [book, setBook] = useState(null);
  const [pageIndex, setPageIndex] = useState(0);
  const [status, setStatus] = useState("loading");
  const [error, setError] = useState("");
  const [reloadToken, setReloadToken] = useState(0);
  const [availableSize, setAvailableSize] = useState({ width: 0, height: 0 });
  const [backgroundFailed, setBackgroundFailed] = useState(false);
  const [downloadBusy, setDownloadBusy] = useState(false);
  const [downloadError, setDownloadError] = useState("");
  const closeButtonRef = useRef(null);
  const dialogRef = useRef(null);
  const stageRef = useRef(null);
  const openerRef = useRef(null);
  const touchStartRef = useRef(null);
  const dismissStartRef = useRef(null);
  const mountedRef = useRef(true);

  const pages = useMemo(() => buildPages(book), [book]);
  const currentPage = pages[pageIndex] || null;
  const scale = Math.min(
    availableSize.width / PAGE_WIDTH,
    availableSize.height / PAGE_HEIGHT,
  );
  const canGoBack = pageIndex > 0;
  const canGoForward = pageIndex < pages.length - 1;

  useEffect(() => {
    setBackgroundFailed(false);
  }, [pageIndex, storyId]);

  useEffect(() => () => {
    mountedRef.current = false;
  }, []);

  const goBack = useCallback(() => {
    setPageIndex((current) => Math.max(0, current - 1));
  }, []);

  const goForward = useCallback(() => {
    setPageIndex((current) =>
      Math.max(0, Math.min(pages.length - 1, current + 1)),
    );
  }, [pages.length]);

  useEffect(() => {
    const controller = new AbortController();
    let active = true;
    setStatus("loading");
    setError("");
    setBook(null);
    setPageIndex(0);

    apiService
      .getStoryBook(storyId, controller.signal)
      .then((result) => {
        if (!active || controller.signal.aborted) return;
        setBook(result);
        setStatus("ready");
      })
      .catch((requestError) => {
        if (!active || requestError.name === "AbortError") return;
        if (requestError.status !== 401) {
          setError(
            requestError.status === 404
              ? "Книга недоступна для чтения."
              : requestError.message,
          );
          setStatus("error");
        }
      });

    return () => {
      active = false;
      controller.abort();
    };
  }, [storyId, reloadToken]);

  useEffect(() => {
    openerRef.current = document.activeElement;
    const previousOverflow = document.body.style.overflow;
    const previousRootOverflow = document.documentElement.style.overflow;
    const appRoot = document.getElementById("root");
    const previousHidden = appRoot?.getAttribute("aria-hidden");
    const previousInert = appRoot?.hasAttribute("inert");
    const opener = openerRef.current;
    document.body.style.overflow = "hidden";
    document.documentElement.style.overflow = "hidden";
    closeButtonRef.current?.focus();
    appRoot?.setAttribute("aria-hidden", "true");
    appRoot?.setAttribute("inert", "");
    const containFocus = (event) => {
      if (!dialogRef.current?.contains(event.target))
        closeButtonRef.current?.focus();
    };
    document.addEventListener("focusin", containFocus);

    return () => {
      document.removeEventListener("focusin", containFocus);
      document.body.style.overflow = previousOverflow;
      document.documentElement.style.overflow = previousRootOverflow;
      if (previousHidden == null) appRoot?.removeAttribute("aria-hidden");
      else appRoot?.setAttribute("aria-hidden", previousHidden);
      if (!previousInert) appRoot?.removeAttribute("inert");
      if (opener instanceof HTMLElement && opener.isConnected)
        opener.focus({ preventScroll: true });
    };
  }, []);

  useEffect(() => {
    if (!stageRef.current) return undefined;
    const updateSize = () => {
      const stage = stageRef.current;
      const style = getComputedStyle(stage);
      setAvailableSize({
        width: Math.max(
          0,
          stage.clientWidth -
            (parseFloat(style.paddingLeft) || 0) -
            (parseFloat(style.paddingRight) || 0),
        ),
        height: Math.max(
          0,
          stage.clientHeight -
            (parseFloat(style.paddingTop) || 0) -
            (parseFloat(style.paddingBottom) || 0),
        ),
      });
    };
    updateSize();
    if (typeof ResizeObserver === "undefined") {
      window.addEventListener("resize", updateSize);
      return () => window.removeEventListener("resize", updateSize);
    }
    const observer = new ResizeObserver(updateSize);
    observer.observe(stageRef.current);
    return () => observer.disconnect();
  }, []);

  useEffect(() => {
    const handleKeyDown = (event) => {
      if (event.key === "Escape") {
        event.preventDefault();
        onClose();
        return;
      }
      if (
        (event.key === "ArrowLeft" || event.key === "ArrowRight") &&
        event.target?.tagName !== "INPUT" &&
        !event.shiftKey &&
        !event.ctrlKey &&
        !event.metaKey &&
        !event.altKey &&
        !window.getSelection()?.toString()
      ) {
        event.preventDefault();
        if (event.key === "ArrowLeft") goBack();
        else goForward();
      }
      if (event.key !== "Tab" || !dialogRef.current) return;

      const focusable = Array.from(
        dialogRef.current.querySelectorAll(
          'button:not(:disabled), [href], input:not(:disabled), textarea:not(:disabled), select:not(:disabled), [tabindex]:not([tabindex="-1"])',
        ),
      );
      if (!focusable.length) return;
      const first = focusable[0];
      const last = focusable[focusable.length - 1];
      if (!dialogRef.current.contains(document.activeElement)) {
        event.preventDefault();
        first.focus();
      } else if (event.shiftKey && document.activeElement === first) {
        event.preventDefault();
        last.focus();
      } else if (!event.shiftKey && document.activeElement === last) {
        event.preventDefault();
        first.focus();
      }
    };
    document.addEventListener("keydown", handleKeyDown);
    return () => document.removeEventListener("keydown", handleKeyDown);
  }, [goBack, goForward, onClose]);

  const handlePointerDown = (event) => {
    if (
      event.pointerType === "mouse" ||
      event.isPrimary === false ||
      event.target.closest("button, input, a, select, textarea") ||
      window.getSelection()?.toString()
    ) {
      touchStartRef.current = null;
      return;
    }
    touchStartRef.current = {
      x: event.clientX,
      y: event.clientY,
      pointerId: event.pointerId,
    };
  };

  const handlePointerUp = (event) => {
    const start = touchStartRef.current;
    touchStartRef.current = null;
    if (
      !start ||
      event.pointerId !== start.pointerId ||
      event.isPrimary === false ||
      window.getSelection()?.toString()
    )
      return;
    const deltaX = event.clientX - start.x;
    const deltaY = event.clientY - start.y;
    if (Math.abs(deltaX) < 45 || Math.abs(deltaX) < Math.abs(deltaY) * 1.4)
      return;
    if (deltaX < 0) goForward();
    else goBack();
  };

  const handleDownload = async () => {
    if (downloadBusy) return;
    setDownloadBusy(true);
    setDownloadError("");
    try {
      await downloadBookPdf(storyId, book?.title || title);
    } catch (requestError) {
      if (mountedRef.current && requestError.status !== 401)
        setDownloadError(requestError.status === 404 ? "PDF этой книги недоступен." : requestError.message);
    } finally {
      if (mountedRef.current) setDownloadBusy(false);
    }
  };

  const isFreeArea = (target) =>
    target instanceof Element && Boolean(target.closest("[data-viewer-free-area]")) &&
    !target.closest("[data-viewer-protected], button, input, a, select, textarea");

  const handleDismissDown = (event) => {
    dismissStartRef.current = isFreeArea(event.target)
      ? { x: event.clientX, y: event.clientY, pointerId: event.pointerId }
      : null;
  };

  const handleDismissUp = (event) => {
    const start = dismissStartRef.current;
    dismissStartRef.current = null;
    if (start && start.pointerId === event.pointerId && isFreeArea(event.target) &&
        Math.hypot(event.clientX - start.x, event.clientY - start.y) <= 8) onClose();
  };

  return createPortal(
    <div
      className={`book-viewer ${backgroundFailed ? "has-neutral-background" : ""}`}
      role="presentation"
      data-viewer-free-area
      onPointerDown={handleDismissDown}
      onPointerUp={handleDismissUp}
    >
      {currentPage?.imageUrl && !backgroundFailed && (
        <div className="book-viewer__background" style={{ backgroundImage: `url("${currentPage.imageUrl}")` }} aria-hidden="true" />
      )}
      <section
        ref={dialogRef}
        className="book-viewer__dialog"
        role="dialog"
        aria-modal="true"
        aria-labelledby="book-viewer-title"
      >
        <h2 id="book-viewer-title" className="visually-hidden">{book?.title || title || "Книга"}</h2>
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
          <span className="book-viewer__counter" aria-live="polite">{pages.length ? pageIndex + 1 : 0} / {pages.length || 0}</span>
          <button type="button" className="book-viewer__download" onClick={handleDownload} disabled={downloadBusy || status !== "ready"} aria-busy={downloadBusy}>
            {downloadBusy ? "Скачиваем…" : "Скачать PDF"}
          </button>
        </header>

        <div
          ref={stageRef}
          className="book-viewer__stage"
          data-viewer-free-area
          onPointerDown={handlePointerDown}
          onPointerUp={handlePointerUp}
          onPointerCancel={() => {
            touchStartRef.current = null;
          }}
          onLostPointerCapture={() => {
            touchStartRef.current = null;
          }}
        >
          {status === "loading" && (
            <div className="book-viewer__status" data-viewer-protected>
              <span className="gen-loader" /> Загружаем книгу…
            </div>
          )}
          {status === "error" && (
            <div className="book-viewer__error" role="alert" data-viewer-protected>
              <p>{error}</p>
              <button
                type="button"
                className="button button--primary"
                onClick={() => setReloadToken((current) => current + 1)}
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
                <BookPage key={`${storyId}-${pageIndex}`} page={currentPage} scale={scale} onImageError={() => setBackgroundFailed(true)} />
              </div>
            </div>
          )}
        </div>

        <footer className="book-viewer__controls" data-viewer-protected>
          <label className="visually-hidden" htmlFor="book-viewer-page-range">Выбрать страницу</label>
          <input id="book-viewer-page-range" className="book-viewer__range" type="range" min="1" max={Math.max(1, pages.length)} step="1" value={pages.length ? pageIndex + 1 : 1} disabled={status !== "ready" || pages.length <= 1} aria-valuetext={pages.length ? `Страница ${pageIndex + 1} из ${pages.length}` : "Книга загружается"} onChange={(event) => setPageIndex(Number(event.target.value) - 1)} />
          {downloadError && <div className="book-viewer__download-error" role="alert">{downloadError}</div>}
        </footer>
        <button type="button" className="book-viewer__arrow book-viewer__arrow--back" onClick={goBack} disabled={!canGoBack} aria-label="Назад">‹</button>
        <button type="button" className="book-viewer__arrow book-viewer__arrow--forward" onClick={goForward} disabled={!canGoForward} aria-label="Вперёд">›</button>
      </section>
    </div>,
    document.body,
  );
};
