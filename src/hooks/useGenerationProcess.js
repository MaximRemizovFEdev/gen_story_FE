import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { AUTH_STATUS, useAuth } from "../auth/AuthContext";
import apiService from "../services/ApiService";

export const FLOW_STAGE = Object.freeze({
  STORY: "story",
  COVER: "cover",
  SCENES: "scenes",
  BOOK: "book",
});
export const FLOW_STATUS = Object.freeze({
  PENDING: "pending",
  SUCCESS: "success",
  ERROR: "error",
});
export const PAYMENT_STATE = Object.freeze({
  IDLE: "idle",
  CHECKING: "checking",
  CREATING: "creating",
  WAITING: "waiting",
  GENERATING: "generating",
});
export const OPERATION_UI_STATE = Object.freeze({
  IDLE: "idle",
  RECOVERING: "recovering",
  CHECKING_PAYMENT: "checking_payment",
  PAYMENT_CONFIRMED: "payment_confirmed",
  GENERATING: "generating",
  READY: "ready",
  ERROR: "error",
});
export const POLL_INTERVAL_MS = 10_000;
export const OPERATION_POLL_INTERVAL_MS = 3_000;
export const PAYMENT_POLL_INTERVAL_MS = OPERATION_POLL_INTERVAL_MS;

export const prepareStoryPayload = (form) => ({
  childName: form.childName,
  ageGroup: form.ageGroup,
  heroType:
    form.heroType === "Свой вариант" ? form.heroCustom.trim() : form.heroType,
  adventureGoal:
    form.adventureGoal === "Свой вариант"
      ? form.adventureCustom.trim()
      : form.adventureGoal,
  storyMood: form.storyMood,
  interests: form.interests,
});

const TERMINAL_PAYMENT_ERRORS = new Set(["canceled", "failed", "generation_failed"]);
const GENERATION_ACTIVE = new Set(["queued", "running"]);
const FINISHED_PURCHASES = new Set([
  "consumed", "generation_failed", "canceled", "failed",
]);

export const allowsNewGeneration = (operation) =>
  operation === null || FINISHED_PURCHASES.has(operation?.paymentStatus) ||
  (operation?.paymentStatus === "pending" && operation?.generationStatus === "not_started");

const getErrorMessage = (error) =>
  error?.message || "Не удалось запустить создание книги";

const navigateToCheckout = (url) => {
  if (typeof window.__GEN_STORY_NAVIGATE__ === "function") {
    window.__GEN_STORY_NAVIGATE__(url);
    return;
  }
  window.location.assign(url);
};

const isReadyOperation = (operation) =>
  operation?.paymentStatus === "consumed" &&
  operation?.generationStatus === "success" &&
  Boolean(operation?.storyId);

const isTerminalOperationError = (operation) =>
  operation?.generationStatus === "error" ||
  TERMINAL_PAYMENT_ERRORS.has(operation?.paymentStatus);

export const deriveOperationUiState = (operation) => {
  if (!operation) return OPERATION_UI_STATE.IDLE;
  if (isTerminalOperationError(operation)) return OPERATION_UI_STATE.ERROR;
  if (isReadyOperation(operation)) return OPERATION_UI_STATE.READY;
  if (
    operation.storyId ||
    GENERATION_ACTIVE.has(operation.generationStatus) ||
    operation.paymentStatus === "reserved"
  )
    return OPERATION_UI_STATE.GENERATING;
  if (operation.paymentStatus === "paid")
    return OPERATION_UI_STATE.PAYMENT_CONFIRMED;
  return OPERATION_UI_STATE.CHECKING_PAYMENT;
};

export const useGenerationProcess = () => {
  const { status, sessionVersion } = useAuth();
  const isAuthenticated = status === AUTH_STATUS.AUTHENTICATED;
  const [activeOperation, setActiveOperation] = useState(null);
  const [operationUiState, setOperationUiState] = useState(OPERATION_UI_STATE.IDLE);
  const [activeFlow, setActiveFlow] = useState(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isRecovering, setIsRecovering] = useState(false);
  const [submitError, setSubmitError] = useState(null);
  const [statusError, setStatusError] = useState(null);
  const [paymentState, setPaymentState] = useState(PAYMENT_STATE.IDLE);
  const [paymentConfirmationUrl, setPaymentConfirmationUrl] = useState("");
  const [acceptedDraftId, setAcceptedDraftId] = useState(null);
  const operationRef = useRef(null);
  const flowRef = useRef(null);
  const submittingRef = useRef(false);
  const permissionCheckRef = useRef(null);
  const revisionRef = useRef(0);
  const operationRequestRef = useRef(0);
  const explicitRef = useRef(false);
  const completedRefreshRef = useRef(null);
  const [trackingVersion, setTrackingVersion] = useState(0);
  const [isCheckingPermission, setIsCheckingPermission] = useState(false);
  const stopOperationPollRef = useRef(null);
  const stopStoryPollRef = useRef(null);
  // Non-null after a new attempt: refresh must never fall back to its predecessor.
  const attemptRef = useRef(null);
  const invalidateTracking = useCallback(() => {
    operationRequestRef.current += 1;
    stopOperationPollRef.current?.();
    stopStoryPollRef.current?.();
    setTrackingVersion(operationRequestRef.current);
    return operationRequestRef.current;
  }, []);

  const setOperation = useCallback((operation) => {
    operationRef.current = operation;
    setActiveOperation(operation);
    setOperationUiState(deriveOperationUiState(operation));
    if (operation?.storyId) {
      const terminal = isReadyOperation(operation);
      const failed = isTerminalOperationError(operation);
      const nextFlow = {
        storyId: operation.storyId,
        stage: terminal ? FLOW_STAGE.BOOK : FLOW_STAGE.STORY,
        status: failed
          ? FLOW_STATUS.ERROR
          : terminal
            ? FLOW_STATUS.SUCCESS
            : FLOW_STATUS.PENDING,
      };
      flowRef.current = nextFlow;
      setActiveFlow(nextFlow);
    } else {
      flowRef.current = null;
      setActiveFlow(null);
    }
  }, []);

  const clearSessionBoundState = useCallback(() => {
    revisionRef.current += 1;
    invalidateTracking();
    attemptRef.current = null;
    setIsCheckingPermission(false);
    explicitRef.current = false;
    operationRef.current = null;
    flowRef.current = null;
    setActiveOperation(null);
    setActiveFlow(null);
    setOperationUiState(OPERATION_UI_STATE.IDLE);
    setIsSubmitting(false);
    submittingRef.current = false;
    permissionCheckRef.current = null;
    setIsRecovering(false);
    setSubmitError(null);
    setStatusError(null);
    setPaymentState(PAYMENT_STATE.IDLE);
    setPaymentConfirmationUrl("");
    setAcceptedDraftId(null);
    completedRefreshRef.current = null;
  }, [invalidateTracking]);

  useEffect(() => {
    clearSessionBoundState();
  }, [sessionVersion, clearSessionBoundState]);

  const readOperation = useCallback(
    async (draftId, { explicit = false, signal, requestId } = {}) => {
      const operation = explicit
        ? await apiService.getGenerationOperationStatus(draftId, signal)
        : await apiService.getCurrentGenerationOperation(signal);
      if (signal?.aborted || requestId !== operationRequestRef.current) return null;
      if (operation) {
        explicitRef.current = explicit;
        setOperation(operation);
        setAcceptedDraftId(operation.draftId);
      } else if (!explicit) {
        setOperation(null);
      }
      setStatusError(null);
      return operation;
    },
    [setOperation],
  );

  const recoverOperation = useCallback(
    async (draftId = null, { explicit = Boolean(draftId), signal } = {}) => {
      if (!isAuthenticated) return null;
      if (attemptRef.current && (!explicit || draftId !== attemptRef.current.draftId)) return null;
      const revision = revisionRef.current;
      const requestId = invalidateTracking();
      setIsRecovering(true);
      setStatusError(null);
      setOperationUiState((current) =>
        operationRef.current ? current : OPERATION_UI_STATE.RECOVERING,
      );
      try {
        const operation = await readOperation(draftId, {
          explicit,
          signal,
          requestId,
        });
        if (
          revision !== revisionRef.current ||
          requestId !== operationRequestRef.current
        )
          return null;
        return operation;
      } catch (error) {
        if (error?.name === "AbortError") throw error;
        if (
          revision !== revisionRef.current ||
          requestId !== operationRequestRef.current
        )
          return null;
        if (error?.status === 401) {
          clearSessionBoundState();
          throw error;
        }
        if (explicit && error?.status === 404) {
          setOperation(null);
          setOperationUiState(OPERATION_UI_STATE.ERROR);
          setStatusError("Операция не найдена или недоступна");
          return null;
        }
        setStatusError(getErrorMessage(error));
        if (!operationRef.current) setOperationUiState(OPERATION_UI_STATE.ERROR);
        throw error;
      } finally {
        if (
          revision === revisionRef.current &&
          requestId === operationRequestRef.current
        )
          setIsRecovering(false);
      }
    },
    [clearSessionBoundState, invalidateTracking, isAuthenticated, readOperation, setOperation],
  );

  const checkNewSubmissionPermission = useCallback(
    async ({ signal } = {}) => {
      if (!isAuthenticated || submittingRef.current) return undefined;
      const revision = revisionRef.current;
      const requestId = invalidateTracking();
      setIsCheckingPermission(true);
      permissionCheckRef.current = requestId;
      setIsRecovering(false);
      setStatusError(null);
      try {
        const uncertainDraftId = attemptRef.current?.draftId;
        const operation = uncertainDraftId
          ? await apiService.getGenerationOperationStatus(uncertainDraftId, signal)
          : await apiService.getCurrentGenerationOperation(signal);
        if (
          signal?.aborted ||
          revision !== revisionRef.current ||
          requestId !== operationRequestRef.current
        )
          return undefined;
        explicitRef.current = Boolean(uncertainDraftId);
        setOperation(operation);
        if (operation) setAcceptedDraftId(operation.draftId);
        else {
          setAcceptedDraftId(null);
          setPaymentConfirmationUrl("");
          setPaymentState(PAYMENT_STATE.IDLE);
          completedRefreshRef.current = null;
        }
        setStatusError(null);
        return operation;
      } catch (error) {
        if (error?.name === "AbortError") throw error;
        if (
          signal?.aborted ||
          revision !== revisionRef.current ||
          requestId !== operationRequestRef.current
        )
          return undefined;
        if (error?.status === 401) {
          clearSessionBoundState();
          throw error;
        }
        setStatusError(getErrorMessage(error));
        if (!operationRef.current) setOperationUiState(OPERATION_UI_STATE.ERROR);
        throw error;
      } finally {
        if (permissionCheckRef.current === requestId) {
          permissionCheckRef.current = null;
          setIsCheckingPermission(false);
        }
      }
    },
    [clearSessionBoundState, invalidateTracking, isAuthenticated, setOperation],
  );

  useEffect(() => {
    if (status === AUTH_STATUS.CHECKING) return undefined;
    if (!isAuthenticated) {
      clearSessionBoundState();
      return undefined;
    }
    const controller = new AbortController();
    recoverOperation(null, { explicit: false, signal: controller.signal }).catch(
      (error) => {
        if (error?.name !== "AbortError") undefined;
      },
    );
    return () => controller.abort();
  }, [status, isAuthenticated, recoverOperation, clearSessionBoundState]);

  const refreshStatus = useCallback(async () => {
    if (submittingRef.current) return null;
    if (attemptRef.current) {
      const draftId = attemptRef.current.draftId;
      return draftId ? recoverOperation(draftId, { explicit: true }).catch(() => null) : null;
    }
    const current = operationRef.current;
    if (current?.draftId) {
      return recoverOperation(current.draftId, {
        explicit: explicitRef.current,
      }).catch(() => null);
    }
    return recoverOperation(null, { explicit: false }).catch(() => null);
  }, [recoverOperation]);

  const submit = useCallback(
    async (submission) => {
      if (
        submittingRef.current || permissionCheckRef.current !== null ||
        isSubmitting || isRecovering || !isAuthenticated || statusError ||
        !allowsNewGeneration(operationRef.current)
      ) return null;

      const revision = revisionRef.current + 1;
      revisionRef.current = revision;
      invalidateTracking();
      attemptRef.current = { draftId: null };
      setOperation(null);
      setAcceptedDraftId(null);
      setPaymentConfirmationUrl("");
      explicitRef.current = true;
      submittingRef.current = true;
      setIsSubmitting(true);
      setSubmitError(null);
      setStatusError(null);
      setPaymentState(PAYMENT_STATE.CHECKING);
      let newDraftId = null;
      try {
        const draft = await apiService.createGenerationDraft(
          submission.questionnaire,
          submission.childPhoto,
        );
        if (revision !== revisionRef.current) return null;
        newDraftId = draft.draftId;
        attemptRef.current = { draftId: newDraftId };
        setAcceptedDraftId(newDraftId);
        setPaymentState(PAYMENT_STATE.CREATING);
        const payment = await apiService.createGenerationPayment(draft.draftId);
        if (revision !== revisionRef.current) return null;
        setPaymentConfirmationUrl(payment.confirmationUrl);
        setPaymentState(PAYMENT_STATE.WAITING);
        navigateToCheckout(payment.confirmationUrl);
        return { draftId: draft.draftId, payment };
      } catch (error) {
        if (revision !== revisionRef.current) return null;
        if (error?.name !== "AbortError" && error?.status !== 401)
          setSubmitError(getErrorMessage(error));
        if (newDraftId && error?.status !== 401) {
          await recoverOperation(newDraftId, { explicit: true }).catch(() => null);
        }
        if (error?.status === 401) clearSessionBoundState();
        throw error;
      } finally {
        if (revision === revisionRef.current) {
          submittingRef.current = false;
          setIsSubmitting(false);
        }
      }
    },
    [
      clearSessionBoundState,
      invalidateTracking,
      setOperation,
      isAuthenticated,
      statusError,
      isRecovering,
      isSubmitting,
      recoverOperation,
    ],
  );

  const startGeneration = useCallback(
    (form) =>
      submit({
        questionnaire: prepareStoryPayload(form),
        childPhoto: form.childPhoto || null,
      }),
    [submit],
  );

  const retryGeneration = useCallback(() => refreshStatus(), [refreshStatus]);
  const reopenPayment = useCallback(() => false, []);
  const checkPaymentStatus = useCallback(() => refreshStatus(), [refreshStatus]);

  const storyId = activeFlow?.storyId;
  const isTerminalFlow =
    activeFlow?.status === FLOW_STATUS.ERROR ||
    (activeFlow?.stage === FLOW_STAGE.BOOK &&
      activeFlow?.status === FLOW_STATUS.SUCCESS);
  const operationDraftId = activeOperation?.draftId;
  const trackingPaused = isSubmitting || isCheckingPermission || isRecovering;
  const shouldPollOperation =
    Boolean(activeOperation?.draftId) &&
    !isReadyOperation(activeOperation) &&
    !isTerminalOperationError(activeOperation) &&
    !activeOperation.storyId;

  useEffect(() => {
    if (!isAuthenticated || trackingPaused || !shouldPollOperation) return undefined;
    const controller = new AbortController();
    let timerId;
    let disposed = false;
    const draftId = operationDraftId;
    const explicit = explicitRef.current;
    const requestId = operationRequestRef.current;

    const poll = async () => {
      try {
        const operation = await apiService.getGenerationOperationStatus(
          draftId,
          controller.signal,
        );
        if (
          disposed ||
          requestId !== operationRequestRef.current ||
          operation?.draftId !== draftId
        )
          return;
        setOperation(operation);
        setStatusError(null);
        if (isReadyOperation(operation) || isTerminalOperationError(operation))
          return;
      } catch (error) {
        if (
          disposed ||
          requestId !== operationRequestRef.current ||
          error?.name === "AbortError"
        )
          return;
        if (error?.status === 401) {
          clearSessionBoundState();
          return;
        }
        if (explicit && error?.status === 404) {
          setOperationUiState(OPERATION_UI_STATE.ERROR);
          setStatusError("Операция не найдена или недоступна");
          return;
        }
        setStatusError(getErrorMessage(error));
      }
      if (!disposed) timerId = window.setTimeout(poll, OPERATION_POLL_INTERVAL_MS);
    };

    const stop = () => {
      disposed = true;
      controller.abort();
      if (timerId) window.clearTimeout(timerId);
    };
    stopOperationPollRef.current = stop;
    poll();
    return stop;
  }, [
    operationDraftId,
    trackingVersion,
    trackingPaused,
    clearSessionBoundState,
    isAuthenticated,
    setOperation,
    shouldPollOperation,
  ]);

  useEffect(() => {
    if (!isAuthenticated || trackingPaused || !storyId || isTerminalFlow) return undefined;

    const controller = new AbortController();
    let timerId;
    let disposed = false;
    const requestId = operationRequestRef.current;

    const poll = async () => {
      try {
        const result = await apiService.getGenerationFlowStatus(
          storyId,
          controller.signal,
        );
        if (
          disposed ||
          requestId !== operationRequestRef.current ||
          result?.storyId !== storyId
        )
          return;
        const nextFlow = {
          storyId,
          stage: result.stage,
          status: result.status,
        };
        flowRef.current = nextFlow;
        setActiveFlow(nextFlow);
        if (result.status === FLOW_STATUS.ERROR) {
          setOperationUiState(OPERATION_UI_STATE.ERROR);
          return;
        }
        if (
          result.stage === FLOW_STAGE.BOOK &&
          result.status === FLOW_STATUS.SUCCESS
        ) {
          setOperationUiState(OPERATION_UI_STATE.READY);
          return;
        }
      } catch (error) {
        if (
          disposed ||
          requestId !== operationRequestRef.current ||
          error?.name === "AbortError"
        )
          return;
        if (error?.status === 401) {
          clearSessionBoundState();
          return;
        }
        setStatusError(getErrorMessage(error));
      }
      if (!disposed) timerId = window.setTimeout(poll, POLL_INTERVAL_MS);
    };

    const stop = () => {
      disposed = true;
      controller.abort();
      if (timerId) window.clearTimeout(timerId);
    };
    stopStoryPollRef.current = stop;
    poll();
    return stop;
  }, [clearSessionBoundState, isAuthenticated, isTerminalFlow, storyId, trackingVersion, trackingPaused]);

  const clearCompletedFlow = useCallback((completedStoryId) => {
    const current = flowRef.current;
    if (
      current?.storyId === completedStoryId &&
      current.stage === FLOW_STAGE.BOOK &&
      current.status === FLOW_STATUS.SUCCESS
    ) {
      flowRef.current = null;
      setActiveFlow(null);
    }
  }, []);

  return useMemo(
    () => ({
      activeFlow,
      activeOperation,
      operationUiState,
      isRecovering,
      isRecoveryPending:
        status === AUTH_STATUS.CHECKING ||
        (isAuthenticated && isRecovering && !activeOperation),
      isSubmitting,
      submitError,
      statusError,
      hasTrackedFlow: Boolean(activeFlow || activeOperation),
      startGeneration,
      retryGeneration,
      refreshStatus,
      recoverOperation,
      checkNewSubmissionPermission,
      clearCompletedFlow,
      paymentState,
      paymentConfirmationUrl,
      acceptedDraftId,
      isAwaitingPayment: false,
      reopenPayment,
      checkPaymentStatus,
    }),
    [
      acceptedDraftId,
      activeFlow,
      activeOperation,
      checkPaymentStatus,
      checkNewSubmissionPermission,
      clearCompletedFlow,
      isAuthenticated,
      isRecovering,
      isSubmitting,
      operationUiState,
      paymentConfirmationUrl,
      paymentState,
      recoverOperation,
      refreshStatus,
      reopenPayment,
      retryGeneration,
      startGeneration,
      status,
      statusError,
      submitError,
    ],
  );
};
