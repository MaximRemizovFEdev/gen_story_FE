import { useEffect, useRef, useState } from "react";
import type { MouseEvent } from "react";
import apiService from "../../services/ApiService";
import type {
  BookListItem,
  EditableSceneInput,
  SceneId,
} from "../../types/ApiService";

export interface SceneEditorModalProps {
  book: Pick<BookListItem, "storyId" | "title">;
  onClose: () => void;
}

const countWords = (text: string) =>
  text.trim().split(/\s+/u).filter(Boolean).length;

export const useSceneEditorModal = ({
  book,
  onClose,
}: SceneEditorModalProps) => {
  const [title, setTitle] = useState(book.title);
  const [scenes, setScenes] = useState<EditableSceneInput[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);
  const [saveStage, setSaveStage] = useState<"idle" | "saving" | "rebuilding">(
    "idle",
  );
  const [error, setError] = useState("");
  const [isSaved, setIsSaved] = useState(false);
  const closeButtonRef = useRef<HTMLButtonElement | null>(null);

  const handleSceneChange = (sceneId: SceneId, text: string) => {
    setScenes((currentScenes) =>
      currentScenes.map((scene) =>
        scene.sceneId === sceneId ? { ...scene, text } : scene,
      ),
    );
    setError("");
    setIsSaved(false);
  };

  const handleSave = async () => {
    setIsSaving(true);
    setSaveStage("saving");
    setError("");
    setIsSaved(false);

    try {
      const updateResult = await apiService.updateStoryScenes(
        book.storyId,
        scenes.map(({ sceneId, text }) => ({ sceneId, text: text.trim() })),
      );

      if (updateResult?.requiresBookRegeneration) {
        setSaveStage("rebuilding");
        try {
          await apiService.regenerateBook(book.storyId);
        } catch (rebuildError) {
          const errorWithContext = new Error(
            `Тексты сцен сохранены, но книгу не удалось пересобрать. ${(rebuildError as Error).message}`,
          );
          errorWithContext.cause = rebuildError;
          throw errorWithContext;
        }
      }

      setScenes((currentScenes) =>
        currentScenes.map((scene) => ({
          ...scene,
          text: scene.text.trim(),
        })),
      );
      setIsSaved(true);
    } catch (requestError) {
      setError((requestError as Error).message);
    } finally {
      setIsSaving(false);
      setSaveStage("idle");
    }
  };

  const handleMouseDown = (event: MouseEvent<HTMLDivElement>) => {
    if (event.target === event.currentTarget) onClose();
  };

  useEffect(() => {
    const controller = new AbortController();
    const previousOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    closeButtonRef.current?.focus();

    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape") onClose();
    };
    document.addEventListener("keydown", handleKeyDown);

    apiService
      .getStoryScenes(book.storyId, controller.signal)
      .then((result) => {
        setTitle((result?.title || book.title) as string);
        setScenes(
          (Array.isArray(result?.scenes)
            ? result.scenes
            : []) as EditableSceneInput[],
        );
      })
      .catch((requestError) => {
        if (requestError.name !== "AbortError") setError(requestError.message);
      })
      .finally(() => {
        if (!controller.signal.aborted) setIsLoading(false);
      });

    return () => {
      controller.abort();
      document.body.style.overflow = previousOverflow;
      document.removeEventListener("keydown", handleKeyDown);
    };
  }, [book.storyId, book.title, onClose]);

  const hasInvalidScenes = scenes.some(
    (scene) => !scene.text.trim() || scene.text.trim().length > 1500,
  );

  return {
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
  };
};
