import { useState, useCallback } from "react";
import apiService from "../services/ApiService";

export const useGenerationProcess = () => {
  const [isGenerating, setIsGenerating] = useState(false);
  const [currentGenStep, setCurrentGenStep] = useState(0);
  const [coverUrl, setCoverUrl] = useState(null);
  const [pdfPath, setPdfPath] = useState(null);
  const [error, setError] = useState(null);
  const [failedStep, setFailedStep] = useState(null);
  const [storyId, setStoryId] = useState(null);

  const genSteps = [
    "Создаем сценарий",
    "Рисуем обложку",
    "Генерируем иллюстрации",
    "Собираем книгу",
  ];

  const startGeneration = useCallback(
    async (form) => {
      setIsGenerating(true);
      setError(null);
      setFailedStep(null);
      setCurrentGenStep(0);
      setCoverUrl(null);
      setPdfPath(null);

      try {
        // Шаг 1: Генерация сюжета
        console.log("📝 Шаг 1: Генерация сюжета...");
        const responseStory = await apiService.generateStory(form);
        setCurrentGenStep(1);
        setStoryId(responseStory.storyId);

        // Шаг 2: Генерация обложки
        console.log("🎨 Шаг 2: Генерация обложки...");
        const coverResp = await apiService.generateCover({
          ...responseStory,
        });
        setCoverUrl(coverResp.coverPath);
        setCurrentGenStep(2);

        // Шаг 3: Генерация сцен
        console.log("🖼️ Шаг 3: Генерация сцен...");
        await apiService.generateScenes({
          ...responseStory,
        });
        setCurrentGenStep(3);

        // Шаг 4: Сборка книги
        console.log("📚 Шаг 4: Сборка книги...");
        const bookResp = await apiService.generateBook({
          ...responseStory,
        });
        setPdfPath(bookResp.pdfPath);
        setCurrentGenStep(4);

        console.log("✅ Генерация завершена!");
      } catch (err) {
        console.error("❌ Ошибка:", err);
        setError(err.message || "Произошла ошибка при генерации");
        setFailedStep(currentGenStep);
      } finally {
        // setIsGenerating(false);
      }
    },
    [currentGenStep],
  );

  const retryFailedStep = useCallback(
    async (form) => {
      if (failedStep == null) return;

      const savedStep = failedStep;
      let currentStoryId = storyId;

      setError(null);
      setIsGenerating(true);

      try {
        if (savedStep <= 0) {
          setFailedStep(0);

          const responseStory = await apiService.generateStory(form);

          currentStoryId = responseStory.storyId;
          setStoryId(currentStoryId);
          setCurrentGenStep(1);
        }

        if (savedStep <= 1) {
          setFailedStep(1);

          const coverResp = await apiService.generateCover({
            phone: form.phone,
            storyId: currentStoryId,
          });

          setCoverUrl(coverResp.url);
          setCurrentGenStep(2);
        }

        if (savedStep <= 2) {
          setFailedStep(2);

          await apiService.generateScenes({
            phone: form.phone,
            storyId: currentStoryId,
          });

          setCurrentGenStep(3);
        }

        if (savedStep <= 3) {
          setFailedStep(3);

          const bookResp = await apiService.generateBook({
            phone: form.phone,
            storyId: currentStoryId,
          });

          setPdfPath(bookResp.pdfPath);
          setCurrentGenStep(4);
        }

        setFailedStep(null);
      } catch (err) {
        setError(err.message);
      } finally {
        setIsGenerating(false);
      }
    },
    [failedStep, storyId],
  );

  return {
    isGenerating,
    currentGenStep,
    coverUrl,
    pdfPath,
    error,
    failedStep,
    genSteps,
    startGeneration,
    retryFailedStep,
  };
};
