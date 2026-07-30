import { useCallback, useRef, useState } from "react";
import apiService from "../services/ApiService";

export const GENERATION_STATUS = Object.freeze({
  IDLE: "idle",
  RUNNING: "running",
  FAILED: "failed",
  COMPLETED: "completed",
});

export const GENERATION_STEP = Object.freeze({
  STORY: 0,
  COVER: 1,
  SCENES: 2,
  BOOK: 3,
});

const prepareStoryPayload = (form) => ({
  phone: form.phone,
  childName: form.childName,
  ageGroup: form.ageGroup,
  heroType:
    form.heroType === "Свой вариант"
      ? form.heroCustom.trim()
      : form.heroType,
  adventureGoal:
    form.adventureGoal === "Свой вариант"
      ? form.adventureCustom.trim()
      : form.adventureGoal,
  storyMood: form.storyMood,
  interests: form.interests,
});

const getErrorMessage = (error) =>
  error?.message || "Произошла ошибка при генерации книги";

export const useGenerationProcess = () => {
  const [status, setStatus] = useState(GENERATION_STATUS.IDLE);
  const [currentGenStep, setCurrentGenStep] = useState(GENERATION_STEP.STORY);
  const [coverUrl, setCoverUrl] = useState(null);
  const [pdfPath, setPdfPath] = useState(null);
  const [error, setError] = useState(null);
  const [failedStep, setFailedStep] = useState(null);
  const [generationContext, setGenerationContext] = useState(null);

  // Refs make the click guard and retry context available immediately, without
  // waiting for React to render state updates.
  const statusRef = useRef(GENERATION_STATUS.IDLE);
  const generationContextRef = useRef(null);

  const genSteps = [
    "Создаём сценарий",
    "Рисуем обложку",
    "Генерируем иллюстрации",
    "Собираем книгу",
  ];

  const updateStatus = useCallback((nextStatus) => {
    statusRef.current = nextStatus;
    setStatus(nextStatus);
  }, []);

  const updateGenerationContext = useCallback((context) => {
    generationContextRef.current = context;
    setGenerationContext(context);
  }, []);

  const failGeneration = useCallback(
    (generationError, step) => {
      console.error("Ошибка генерации:", generationError);
      setError(getErrorMessage(generationError));
      setFailedStep(step);
      setCurrentGenStep(step);
      updateStatus(GENERATION_STATUS.FAILED);
    },
    [updateStatus],
  );

  const runStoryStep = useCallback(
    async (form) => {
      setCurrentGenStep(GENERATION_STEP.STORY);
      const responseStory = await apiService.generateStory(
        prepareStoryPayload(form),
      );
      const context = { ...responseStory, phone: form.phone };
      updateGenerationContext(context);
      return context;
    },
    [updateGenerationContext],
  );

  const runCoverStep = useCallback(async (context) => {
    setCurrentGenStep(GENERATION_STEP.COVER);
    const coverResponse = await apiService.generateCover(context);
    setCoverUrl(coverResponse.coverUrl);
  }, []);

  const runScenesStep = useCallback(async (context) => {
    setCurrentGenStep(GENERATION_STEP.SCENES);
    await apiService.generateScenes(context);
  }, []);

  const runBookStep = useCallback(async (context) => {
    setCurrentGenStep(GENERATION_STEP.BOOK);
    const bookResponse = await apiService.generateBook(context);
    setPdfPath(bookResponse.downloadUrl);
  }, []);

  const completeGeneration = useCallback(() => {
    setCurrentGenStep(genSteps.length);
    setFailedStep(null);
    setError(null);
    updateStatus(GENERATION_STATUS.COMPLETED);
  }, [genSteps.length, updateStatus]);

  const startGeneration = useCallback(
    async (form) => {
      if (statusRef.current === GENERATION_STATUS.RUNNING) return;

      updateStatus(GENERATION_STATUS.RUNNING);
      setError(null);
      setFailedStep(null);
      setCurrentGenStep(GENERATION_STEP.STORY);
      setCoverUrl(null);
      setPdfPath(null);
      updateGenerationContext(null);

      let activeStep = GENERATION_STEP.STORY;

      try {
        const context = await runStoryStep(form);

        activeStep = GENERATION_STEP.COVER;
        await runCoverStep(context);

        activeStep = GENERATION_STEP.SCENES;
        await runScenesStep(context);

        activeStep = GENERATION_STEP.BOOK;
        await runBookStep(context);

        completeGeneration();
      } catch (generationError) {
        failGeneration(generationError, activeStep);
      }
    },
    [
      completeGeneration,
      failGeneration,
      runBookStep,
      runCoverStep,
      runScenesStep,
      runStoryStep,
      updateGenerationContext,
      updateStatus,
    ],
  );

  const retryFailedStep = useCallback(
    async (form) => {
      if (
        statusRef.current === GENERATION_STATUS.RUNNING ||
        failedStep == null
      ) {
        return;
      }

      const retryFromStep = failedStep;
      let activeStep = retryFromStep;
      let context = generationContextRef.current;

      updateStatus(GENERATION_STATUS.RUNNING);
      setError(null);
      setCurrentGenStep(retryFromStep);

      try {
        if (retryFromStep <= GENERATION_STEP.STORY) {
          activeStep = GENERATION_STEP.STORY;
          context = await runStoryStep(form);
        }

        if (retryFromStep <= GENERATION_STEP.COVER) {
          activeStep = GENERATION_STEP.COVER;
          await runCoverStep(context);
        }

        if (retryFromStep <= GENERATION_STEP.SCENES) {
          activeStep = GENERATION_STEP.SCENES;
          await runScenesStep(context);
        }

        if (retryFromStep <= GENERATION_STEP.BOOK) {
          activeStep = GENERATION_STEP.BOOK;
          await runBookStep(context);
        }

        completeGeneration();
      } catch (generationError) {
        failGeneration(generationError, activeStep);
      }
    },
    [
      completeGeneration,
      failedStep,
      failGeneration,
      runBookStep,
      runCoverStep,
      runScenesStep,
      runStoryStep,
      updateStatus,
    ],
  );

  const resetGeneration = useCallback(() => {
    if (statusRef.current === GENERATION_STATUS.RUNNING) return;

    updateStatus(GENERATION_STATUS.IDLE);
    setCurrentGenStep(GENERATION_STEP.STORY);
    setCoverUrl(null);
    setPdfPath(null);
    setError(null);
    setFailedStep(null);
    updateGenerationContext(null);
  }, [updateGenerationContext, updateStatus]);

  return {
    status,
    isGenerating: status === GENERATION_STATUS.RUNNING,
    showGenerationScreen: status !== GENERATION_STATUS.IDLE,
    currentGenStep,
    coverUrl,
    pdfPath,
    error,
    failedStep,
    generationContext,
    genSteps,
    startGeneration,
    retryFailedStep,
    resetGeneration,
  };
};
