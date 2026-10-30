import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import apiService from "../../services/ApiService";
import { downloadBookPdf } from "../../utils/downloadBook";
import { PAGE_WIDTH, PAGE_HEIGHT } from "./constants";

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

export const useBookViewer = ({ storyId, title, onClose }) => {
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
        setDownloadError(
          requestError.status === 404
            ? "PDF этой книги недоступен."
            : requestError.message,
        );
    } finally {
      if (mountedRef.current) setDownloadBusy(false);
    }
  };

  const isFreeArea = (target) =>
    target instanceof Element &&
    Boolean(target.closest("[data-viewer-free-area]")) &&
    !target.closest(
      "[data-viewer-protected], button, input, a, select, textarea",
    );

  const handleDismissDown = (event) => {
    dismissStartRef.current = isFreeArea(event.target)
      ? { x: event.clientX, y: event.clientY, pointerId: event.pointerId }
      : null;
  };

  const handleDismissUp = (event) => {
    const start = dismissStartRef.current;
    dismissStartRef.current = null;
    if (
      start &&
      start.pointerId === event.pointerId &&
      isFreeArea(event.target) &&
      Math.hypot(event.clientX - start.x, event.clientY - start.y) <= 8
    )
      onClose();
  };

  const handlePointerCancel = () => {
    touchStartRef.current = null;
  };

  const handleLostPointerCapture = () => {
    touchStartRef.current = null;
  };

  const handleRetry = () => setReloadToken((current) => current + 1);

  const handleImageError = () => setBackgroundFailed(true);

  const handlePageChange = (event) =>
    setPageIndex(Number(event.target.value) - 1);

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

  useEffect(
    () => () => {
      mountedRef.current = false;
    },
    [],
  );

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

  return {
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
  };
};
