import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { useAuth } from '../auth/AuthContext';
import apiService from '../services/ApiService';

export const FLOW_STAGE = Object.freeze({ STORY: 'story', COVER: 'cover', SCENES: 'scenes', BOOK: 'book' });
export const FLOW_STATUS = Object.freeze({ PENDING: 'pending', SUCCESS: 'success', ERROR: 'error' });
export const POLL_INTERVAL_MS = 10_000;

export const prepareStoryPayload = (form) => ({
  childName: form.childName,
  ageGroup: form.ageGroup,
  heroType: form.heroType === 'Свой вариант' ? form.heroCustom.trim() : form.heroType,
  adventureGoal: form.adventureGoal === 'Свой вариант' ? form.adventureCustom.trim() : form.adventureGoal,
  storyMood: form.storyMood,
  interests: form.interests,
});

const getErrorMessage = (error) => error?.message || 'Не удалось запустить создание книги';

export const useGenerationProcess = () => {
  const { sessionVersion } = useAuth();
  const [activeFlow, setActiveFlow] = useState(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [submitError, setSubmitError] = useState(null);
  const flowRef = useRef(null);
  const initialSessionVersion = useRef(sessionVersion);

  const updateFlow = useCallback((next) => {
    flowRef.current = typeof next === 'function' ? next(flowRef.current) : next;
    setActiveFlow(flowRef.current);
  }, []);

  const clearFlow = useCallback(() => {
    updateFlow(null);
    setIsSubmitting(false);
    setSubmitError(null);
  }, [updateFlow]);

  useEffect(() => {
    if (sessionVersion !== initialSessionVersion.current) {
      initialSessionVersion.current = sessionVersion;
      clearFlow();
    }
  }, [sessionVersion, clearFlow]);

  const submit = useCallback(async (submission, replaceFailed = false) => {
    const current = flowRef.current;
    if (current && !(replaceFailed && current.status === FLOW_STATUS.ERROR)) return null;

    setIsSubmitting(true);
    setSubmitError(null);
    try {
      const response = await apiService.startGenerationFlow(submission.questionnaire, submission.childPhoto);
      if (response?.status !== FLOW_STATUS.PENDING || !response?.storyId) {
        throw new Error('Сервер вернул некорректный ответ при запуске генерации');
      }
      updateFlow({ storyId: response.storyId, stage: FLOW_STAGE.STORY, status: FLOW_STATUS.PENDING, submission });
      return response;
    } catch (error) {
      if (error?.status !== 401) setSubmitError(getErrorMessage(error));
      throw error;
    } finally {
      setIsSubmitting(false);
    }
  }, [updateFlow]);

  const startGeneration = useCallback((form) => submit({
    questionnaire: prepareStoryPayload(form),
    childPhoto: form.childPhoto || null,
  }), [submit]);

  const retryGeneration = useCallback(() => {
    const current = flowRef.current;
    if (!current?.submission || current.status !== FLOW_STATUS.ERROR) return Promise.resolve(null);
    return submit(current.submission, true);
  }, [submit]);

  const storyId = activeFlow?.storyId;
  const isTerminal = activeFlow?.status === FLOW_STATUS.ERROR
    || (activeFlow?.stage === FLOW_STAGE.BOOK && activeFlow?.status === FLOW_STATUS.SUCCESS);

  useEffect(() => {
    if (!storyId || isTerminal) return undefined;

    const controller = new AbortController();
    let timerId;
    let disposed = false;

    const poll = async () => {
      try {
        const result = await apiService.getGenerationFlowStatus(storyId, controller.signal);
        if (disposed || result?.storyId !== storyId) return;
        updateFlow((current) => current?.storyId === storyId ? { ...current, stage: result.stage, status: result.status } : current);
        if (result.status === FLOW_STATUS.ERROR
          || (result.stage === FLOW_STAGE.BOOK && result.status === FLOW_STATUS.SUCCESS)) return;
      } catch (error) {
        if (disposed || error?.name === 'AbortError') return;
        if (error?.status === 401) {
          clearFlow();
          return;
        }
      }
      if (!disposed) timerId = window.setTimeout(poll, POLL_INTERVAL_MS);
    };

    poll();
    return () => {
      disposed = true;
      controller.abort();
      if (timerId) window.clearTimeout(timerId);
    };
  }, [storyId, isTerminal, updateFlow, clearFlow]);

  const clearCompletedFlow = useCallback((completedStoryId) => {
    const current = flowRef.current;
    if (current?.storyId === completedStoryId
      && current.stage === FLOW_STAGE.BOOK
      && current.status === FLOW_STATUS.SUCCESS) clearFlow();
  }, [clearFlow]);

  return useMemo(() => ({
    activeFlow,
    isSubmitting,
    submitError,
    hasTrackedFlow: Boolean(activeFlow),
    startGeneration,
    retryGeneration,
    clearCompletedFlow,
  }), [activeFlow, isSubmitting, submitError, startGeneration, retryGeneration, clearCompletedFlow]);
};
