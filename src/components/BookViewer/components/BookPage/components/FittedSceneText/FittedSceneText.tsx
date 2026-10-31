import React from "react";
import type { Ref } from "react";
import { LINE_HEIGHT } from "../../../../constants";
import { useFittedSceneText } from "./hooks";

interface FittedSceneTextProps {
  text: string;
  panelRef: Ref<HTMLDivElement>;
  isTitle: boolean;
}

export const FittedSceneText = ({
  text,
  panelRef,
  isTitle,
}: FittedSceneTextProps) => {
  const { fit, measureRef } = useFittedSceneText({ text, isTitle });

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
          <div
            className={`book-viewer__text-content${isTitle ? " title" : ""}`}
          >
            {text}
          </div>
        </div>
      )}
    </>
  );
};
