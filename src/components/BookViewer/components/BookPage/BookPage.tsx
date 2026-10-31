import React, { useCallback, useEffect, useState } from "react";
import { PAGE_HEIGHT } from "../../constants";
import { FittedSceneText } from "./components/FittedSceneText/FittedSceneText";
import { Chevron } from "./components/Chevron/Chevron";

type BookPageData =
  | { id: string; kind: "cover"; imageUrl: string; title: string }
  | { id: string; kind: "scene"; imageUrl: string; text: string };

interface BookPageProps {
  page: BookPageData;
  onImageError: () => void;
  scale: number;
}

export const BookPage = ({ page, onImageError, scale }: BookPageProps) => {
  const [imageFailedFor, setImageFailedFor] = useState("");
  const [textExpanded, setTextExpanded] = useState(true);
  const [panelHeight, setPanelHeight] = useState(86);
  const panelRef = useCallback((node: HTMLDivElement | null) => {
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
        <FittedSceneText
          text={page.kind === "cover" ? page.title : page.text}
          panelRef={panelRef}
          isTitle={page.kind === "cover"}
        />
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
        >
          <Chevron expanded={textExpanded} />
        </button>
      )}
    </div>
  );
};
