import React, { useLayoutEffect, useRef, useState } from "react";
import { BASE_FONT_SIZE, LINE_HEIGHT, TEXT_MAX_HEIGHT } from "../../constants";

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

export const FittedSceneText = ({ text, panelRef, isTitle }) => {
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

