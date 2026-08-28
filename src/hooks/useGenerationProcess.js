import { useCallback, useEffect, useRef, useState } from 'react';
import { useAuth } from '../auth/AuthContext';
import apiService from '../services/ApiService';

export const GENERATION_STATUS = Object.freeze({ IDLE: 'idle', RUNNING: 'running', FAILED: 'failed', COMPLETED: 'completed' });
export const GENERATION_STEP = Object.freeze({ STORY: 0, COVER: 1, SCENES: 2, BOOK: 3 });

export const prepareStoryPayload = (form) => ({
  childName: form.childName,
  ageGroup: form.ageGroup,
  heroType: form.heroType === 'Свой вариант' ? form.heroCustom.trim() : form.heroType,
  adventureGoal: form.adventureGoal === 'Свой вариант' ? form.adventureCustom.trim() : form.adventureGoal,
  storyMood: form.storyMood,
  interests: form.interests,
});

const getErrorMessage = (error) => error?.message || 'Произошла ошибка при генерации книги';

export const useGenerationProcess = () => {
  const { sessionVersion } = useAuth();
  const [status, setStatus] = useState(GENERATION_STATUS.IDLE);
  const [currentGenStep, setCurrentGenStep] = useState(GENERATION_STEP.STORY);
  const [coverUrl, setCoverUrl] = useState(null);
  const [pdfPath, setPdfPath] = useState(null);
  const [error, setError] = useState(null);
  const [failedStep, setFailedStep] = useState(null);
  const [generationContext, setGenerationContext] = useState(null);
  const statusRef = useRef(GENERATION_STATUS.IDLE);
  const contextRef = useRef(null);
  const runRef = useRef(0);
  const initialSessionVersion = useRef(sessionVersion);

  const genSteps = ['Создаём сценарий', 'Рисуем обложку', 'Генерируем иллюстрации', 'Собираем книгу'];
  const updateStatus = useCallback((next) => { statusRef.current = next; setStatus(next); }, []);
  const updateContext = useCallback((next) => { contextRef.current = next; setGenerationContext(next); }, []);

  const clearGeneration = useCallback(() => {
    runRef.current += 1;
    updateStatus(GENERATION_STATUS.IDLE);
    setCurrentGenStep(GENERATION_STEP.STORY);
    setCoverUrl(null); setPdfPath(null); setError(null); setFailedStep(null); updateContext(null);
  }, [updateContext, updateStatus]);

  useEffect(() => {
    if (sessionVersion !== initialSessionVersion.current) {
      initialSessionVersion.current = sessionVersion;
      clearGeneration();
    }
  }, [sessionVersion, clearGeneration]);

  const assertActive = (runId) => {
    if (runRef.current !== runId) throw Object.assign(new Error('Generation cancelled'), { name: 'AbortError' });
  };

  const runStoryStep = useCallback(async (form, runId) => {
    setCurrentGenStep(GENERATION_STEP.STORY);
    const response = await apiService.generateStory(prepareStoryPayload(form), form.childPhoto);
    assertActive(runId);
    const context = { storyId: response.storyId };
    updateContext(context);
    return context;
  }, [updateContext]);

  const runCoverStep = useCallback(async ({ storyId }, runId) => {
    setCurrentGenStep(GENERATION_STEP.COVER);
    await apiService.generateCover(storyId); assertActive(runId);
    setCoverUrl(apiService.getCoverUrl(storyId));
  }, []);
  const runScenesStep = useCallback(async ({ storyId }, runId) => {
    setCurrentGenStep(GENERATION_STEP.SCENES);
    await apiService.generateScenes(storyId); assertActive(runId);
  }, []);
  const runBookStep = useCallback(async ({ storyId }, runId) => {
    setCurrentGenStep(GENERATION_STEP.BOOK);
    await apiService.generateBook(storyId); assertActive(runId);
    setPdfPath(apiService.getBookDownloadUrl(storyId));
  }, []);

  const complete = useCallback(() => {
    setCurrentGenStep(genSteps.length); setFailedStep(null); setError(null); updateStatus(GENERATION_STATUS.COMPLETED);
  }, [genSteps.length, updateStatus]);

  const handleFailure = useCallback((failure, step) => {
    if (failure.name === 'AbortError') return;
    if (failure.status === 401) { clearGeneration(); return; }
    setError(getErrorMessage(failure)); setFailedStep(step); setCurrentGenStep(step); updateStatus(GENERATION_STATUS.FAILED);
  }, [clearGeneration, updateStatus]);

  const executeFrom = useCallback(async (form, firstStep, context) => {
    const runId = ++runRef.current;
    let activeStep = firstStep;
    try {
      if (firstStep <= GENERATION_STEP.STORY) { activeStep = GENERATION_STEP.STORY; context = await runStoryStep(form, runId); }
      if (firstStep <= GENERATION_STEP.COVER) { activeStep = GENERATION_STEP.COVER; await runCoverStep(context, runId); }
      if (firstStep <= GENERATION_STEP.SCENES) { activeStep = GENERATION_STEP.SCENES; await runScenesStep(context, runId); }
      if (firstStep <= GENERATION_STEP.BOOK) { activeStep = GENERATION_STEP.BOOK; await runBookStep(context, runId); }
      assertActive(runId); complete();
    } catch (failure) { handleFailure(failure, activeStep); }
  }, [complete, handleFailure, runBookStep, runCoverStep, runScenesStep, runStoryStep]);

  const startGeneration = useCallback((form) => {
    if (statusRef.current === GENERATION_STATUS.RUNNING) return;
    updateStatus(GENERATION_STATUS.RUNNING); setError(null); setFailedStep(null); setCoverUrl(null); setPdfPath(null); updateContext(null);
    return executeFrom(form, GENERATION_STEP.STORY, null);
  }, [executeFrom, updateContext, updateStatus]);

  const retryFailedStep = useCallback((form) => {
    if (statusRef.current === GENERATION_STATUS.RUNNING || failedStep == null) return;
    updateStatus(GENERATION_STATUS.RUNNING); setError(null);
    return executeFrom(form, failedStep, contextRef.current);
  }, [executeFrom, failedStep, updateStatus]);

  const resetGeneration = useCallback(() => {
    if (statusRef.current !== GENERATION_STATUS.RUNNING) clearGeneration();
  }, [clearGeneration]);

  return { status, isGenerating: status === GENERATION_STATUS.RUNNING, showGenerationScreen: status !== GENERATION_STATUS.IDLE,
    currentGenStep, coverUrl, pdfPath, error, failedStep, generationContext, genSteps,
    startGeneration, retryFailedStep, resetGeneration };
};
