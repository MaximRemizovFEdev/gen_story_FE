import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { useAuth } from '../auth/AuthContext';
import apiService from '../services/ApiService';

export const FLOW_STAGE = Object.freeze({ STORY: 'story', COVER: 'cover', SCENES: 'scenes', BOOK: 'book' });
export const FLOW_STATUS = Object.freeze({ PENDING: 'pending', SUCCESS: 'success', ERROR: 'error' });
export const PAYMENT_STATE = Object.freeze({
  IDLE: 'idle',
  CHECKING: 'checking',
  CREATING: 'creating',
  WAITING: 'waiting',
  OPEN_BLOCKED: 'open_blocked',
  GENERATING: 'generating',
});
export const POLL_INTERVAL_MS = 10_000;
export const PAYMENT_POLL_INTERVAL_MS = 3_000;

export const prepareStoryPayload = (form) => ({
  childName: form.childName,
  ageGroup: form.ageGroup,
  heroType: form.heroType === 'Свой вариант' ? form.heroCustom.trim() : form.heroType,
  adventureGoal: form.adventureGoal === 'Свой вариант' ? form.adventureCustom.trim() : form.adventureGoal,
  storyMood: form.storyMood,
  interests: form.interests,
});

const getErrorMessage = (error) => error?.message || 'Не удалось запустить создание книги';
const delay = (ms) => new Promise((resolve) => {
  window.setTimeout(resolve, ms);
});

const openPaymentWindow = (url) => {
  if (!url || typeof window.open !== 'function') return false;
  return Boolean(window.open(url, '_blank', 'noopener,noreferrer'));
};

export const useGenerationProcess = () => {
  const { sessionVersion } = useAuth();
  const [activeFlow, setActiveFlow] = useState(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [submitError, setSubmitError] = useState(null);
  const [paymentState, setPaymentState] = useState(PAYMENT_STATE.IDLE);
  const [paymentConfirmationUrl, setPaymentConfirmationUrl] = useState('');
  const flowRef = useRef(null);
  const paymentRef = useRef({ state: PAYMENT_STATE.IDLE, confirmationUrl: '', submission: null });
  const operationRef = useRef(0);
  const initialSessionVersion = useRef(sessionVersion);

  const updatePayment = useCallback((next) => {
    paymentRef.current = { ...paymentRef.current, ...next };
    setPaymentState(paymentRef.current.state);
    setPaymentConfirmationUrl(paymentRef.current.confirmationUrl || '');
  }, []);

  const updateFlow = useCallback((next) => {
    flowRef.current = typeof next === 'function' ? next(flowRef.current) : next;
    setActiveFlow(flowRef.current);
  }, []);

  const clearFlow = useCallback(() => {
    operationRef.current += 1;
    updateFlow(null);
    updatePayment({ state: PAYMENT_STATE.IDLE, confirmationUrl: '', submission: null });
    setIsSubmitting(false);
    setSubmitError(null);
  }, [updateFlow, updatePayment]);

  useEffect(() => {
    if (sessionVersion !== initialSessionVersion.current) {
      initialSessionVersion.current = sessionVersion;
      clearFlow();
    }
  }, [sessionVersion, clearFlow]);

  const ensurePaid = useCallback(async (submission, operationId) => {
    const ensureCurrent = () => {
      if (operationRef.current !== operationId) {
        const error = new Error('Generation payment flow was cancelled');
        error.name = 'AbortError';
        throw error;
      }
    };

    updatePayment({ state: PAYMENT_STATE.CHECKING, submission });
    let status = await apiService.getGenerationPaymentStatus();
    ensureCurrent();
    if (status?.paid) {
      updatePayment({ state: PAYMENT_STATE.GENERATING, submission });
      return true;
    }

    updatePayment({ state: PAYMENT_STATE.CREATING, submission });
    const payment = await apiService.createGenerationPayment();
    ensureCurrent();
    const confirmationUrl = payment?.confirmationUrl || '';
    const opened = openPaymentWindow(confirmationUrl);
    updatePayment({
      state: opened ? PAYMENT_STATE.WAITING : PAYMENT_STATE.OPEN_BLOCKED,
      confirmationUrl,
      submission,
    });

    while (true) {
      await delay(PAYMENT_POLL_INTERVAL_MS);
      ensureCurrent();
      updatePayment({ state: PAYMENT_STATE.WAITING, confirmationUrl, submission });
      status = await apiService.getGenerationPaymentStatus();
      ensureCurrent();
      if (status?.paid) {
        updatePayment({ state: PAYMENT_STATE.GENERATING, confirmationUrl, submission });
        return true;
      }
    }
  }, [updatePayment]);

  const submit = useCallback(async (submission, replaceFailed = false) => {
    const current = flowRef.current;
    if (current && !(replaceFailed && current.status === FLOW_STATUS.ERROR)) return null;

    const operationId = operationRef.current + 1;
    operationRef.current = operationId;
    setIsSubmitting(true);
    setSubmitError(null);
    try {
      await ensurePaid(submission, operationId);
      let response;
      try {
        response = await apiService.startGenerationFlow(submission.questionnaire, submission.childPhoto);
      } catch (error) {
        if (error?.status !== 402) throw error;
        await ensurePaid(submission, operationId);
        response = await apiService.startGenerationFlow(submission.questionnaire, submission.childPhoto);
      }
      if (response?.status !== FLOW_STATUS.PENDING || !response?.storyId) {
        throw new Error('Сервер вернул некорректный ответ при запуске генерации');
      }
      updateFlow({ storyId: response.storyId, stage: FLOW_STAGE.STORY, status: FLOW_STATUS.PENDING, submission });
      updatePayment({ state: PAYMENT_STATE.IDLE, confirmationUrl: '', submission: null });
      return response;
    } catch (error) {
      if (error?.name !== 'AbortError' && error?.status !== 401) setSubmitError(getErrorMessage(error));
      if (error?.status === 401) updatePayment({ state: PAYMENT_STATE.IDLE, confirmationUrl: '', submission: null });
      throw error;
    } finally {
      if (operationRef.current === operationId) setIsSubmitting(false);
    }
  }, [ensurePaid, updateFlow, updatePayment]);

  const startGeneration = useCallback((form) => submit({
    questionnaire: prepareStoryPayload(form),
    childPhoto: form.childPhoto || null,
  }), [submit]);

  const retryGeneration = useCallback(() => {
    const current = flowRef.current;
    if (!current?.submission || current.status !== FLOW_STATUS.ERROR) return Promise.resolve(null);
    return submit(current.submission, true);
  }, [submit]);

  const reopenPayment = useCallback(() => {
    const url = paymentRef.current.confirmationUrl;
    if (!url) return false;
    const opened = openPaymentWindow(url);
    updatePayment({ state: opened ? PAYMENT_STATE.WAITING : PAYMENT_STATE.OPEN_BLOCKED });
    return opened;
  }, [updatePayment]);

  const checkPaymentStatus = useCallback(async () => {
    const current = paymentRef.current;
    if (!current.submission) return null;
    updatePayment({ state: PAYMENT_STATE.CHECKING });
    const status = await apiService.getGenerationPaymentStatus();
    updatePayment({ state: status?.paid ? PAYMENT_STATE.GENERATING : PAYMENT_STATE.WAITING });
    return status;
  }, [updatePayment]);

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
    paymentState,
    paymentConfirmationUrl,
    isAwaitingPayment: paymentState === PAYMENT_STATE.WAITING || paymentState === PAYMENT_STATE.OPEN_BLOCKED,
    reopenPayment,
    checkPaymentStatus,
  }), [
    activeFlow,
    isSubmitting,
    submitError,
    startGeneration,
    retryGeneration,
    clearCompletedFlow,
    paymentState,
    paymentConfirmationUrl,
    reopenPayment,
    checkPaymentStatus,
  ]);
};
