import React, { useCallback, useEffect, useRef, useState } from "react";
import { createPortal } from "react-dom";
import { useRouter } from "next/navigation";
import { useWizardForm } from "../hooks/useWizardForm";
import {
  allowsNewGeneration,
  PAYMENT_STATE,
} from "../hooks/useGenerationProcess";
import { useGenerationProcessContext } from "../hooks/GenerationProcessContext";
import { StepContent } from "./StepContent/StepContent";
import { UserBooks } from "./UserBooks/UserBooks";
import { steps } from "../config/steps";
import { useUserBooks } from "../hooks/useUserBooks";
import { useAuth } from "../auth/AuthContext";

const PHOTO_PERMISSION_STATE = Object.freeze({
  UNCHECKED: "unchecked",
  PENDING: "pending",
  ALLOWED: "allowed",
  BLOCKED: "blocked",
  ERROR: "error",
});

const getSubmitButtonText = (paymentState, isSubmitting) => {
  if (!isSubmitting) return "Создать мою сказку";
  if (paymentState === PAYMENT_STATE.CHECKING) return "Проверяем остаток...";
  if (paymentState === PAYMENT_STATE.SAVING) return "Сохраняем анкету...";
  if (paymentState === PAYMENT_STATE.STARTING) return "Запускаем сказку...";
  if (paymentState === PAYMENT_STATE.CREATING) return "Готовим оплату...";
  if (paymentState === PAYMENT_STATE.WAITING) return "Переходим к оплате...";
  return "Готовим создание...";
};

function Wizard({ booksPortalTarget }) {
  const router = useRouter();
  const { isAuthenticated } = useAuth();
  const {
    step,
    form,
    current,
    handleChange,
    isStepValid,
    goBack,
    goNext,
    reset,
  } = useWizardForm();
  const {
    activeFlow,
    isSubmitting,
    isRecoveryPending,
    submitError,
    activeOperation,
    balance,
    balanceError,
    isBalanceLoading,
    refreshBalance,
    paymentState,
    startGeneration,
    retryGeneration,
    retryFailedGeneration,
    canRetryGeneration,
    checkNewSubmissionPermission,
    clearCompletedFlow,
  } = useGenerationProcessContext();
  const {
    books,
    isLoading,
    error: booksError,
    reload: reloadBooks,
  } = useUserBooks(isAuthenticated);
  const completionRefreshRef = useRef(null);
  const photoCheckVisitRef = useRef(0);
  const [photoPermissionState, setPhotoPermissionState] = useState(
    PHOTO_PERMISSION_STATE.UNCHECKED,
  );

  const runPhotoPermissionCheck = useCallback(
    async (signal) => {
      const visitId = photoCheckVisitRef.current + 1;
      photoCheckVisitRef.current = visitId;
      setPhotoPermissionState(PHOTO_PERMISSION_STATE.PENDING);
      try {
        await checkNewSubmissionPermission({ signal });
        if (signal?.aborted || visitId !== photoCheckVisitRef.current) return;
        setPhotoPermissionState(
          PHOTO_PERMISSION_STATE.ALLOWED,
        );
      } catch (error) {
        if (error?.name === "AbortError") return;
        if (visitId === photoCheckVisitRef.current) {
          setPhotoPermissionState(PHOTO_PERMISSION_STATE.ERROR);
        }
      }
    },
    [checkNewSubmissionPermission],
  );

  useEffect(() => {
    if (current?.field !== "childPhoto") {
      photoCheckVisitRef.current += 1;
      setPhotoPermissionState(PHOTO_PERMISSION_STATE.UNCHECKED);
      return undefined;
    }

    const controller = new AbortController();
    runPhotoPermissionCheck(controller.signal);
    return () => {
      controller.abort();
      photoCheckVisitRef.current += 1;
      setPhotoPermissionState(PHOTO_PERMISSION_STATE.UNCHECKED);
    };
  }, [current?.field, runPhotoPermissionCheck]);

  useEffect(() => {
    if (activeFlow?.stage !== "book" || activeFlow?.status !== "success")
      return;
    if (
      books.some((book) => (book.storyId ?? book.id) === activeFlow.storyId)
    ) {
      clearCompletedFlow(activeFlow.storyId);
      return;
    }
    if (completionRefreshRef.current === activeFlow.storyId) return;
    completionRefreshRef.current = activeFlow.storyId;
    reloadBooks()
      .then((nextBooks) => {
        if (
          nextBooks.some(
            (book) => (book.storyId ?? book.id) === activeFlow.storyId,
          )
        ) {
          clearCompletedFlow(activeFlow.storyId);
        }
      })
      .catch(() => undefined);
  }, [activeFlow, books, reloadBooks, clearCompletedFlow]);

  const handleSubmit = async () => {
    if (
      isPhotoPermissionBlocked ||
      !isStepValid() ||
      isSubmitting ||
      isRecoveryPending ||
      !allowsNewGeneration(activeOperation, balance) || isBalanceLoading || balanceError
    )
      return;
    try {
      const response = await startGeneration(form);
      if (response) {
        reset();
        if (response.operation) router.push(`/payment-return?draftId=${encodeURIComponent(response.draftId)}`);
      }
    } catch {
      // Submission errors are exposed by the hook; the completed form stays intact.
    }
  };

  const handleRetry = () => {
    if (activeFlow?.stage === "book" && activeFlow?.status === "success") {
      reloadBooks().catch(() => undefined);
    } else {
      retryGeneration().catch(() => undefined);
    }
  };
  const handlePhotoPermissionRetry = () => {
    const controller = new AbortController();
    runPhotoPermissionCheck(controller.signal);
  };

  const isPhotoStep = current?.field === "childPhoto";
  const isPhotoPermissionPending =
    isPhotoStep && photoPermissionState === PHOTO_PERMISSION_STATE.PENDING;
  const isPhotoPermissionError =
    isPhotoStep && photoPermissionState === PHOTO_PERMISSION_STATE.ERROR;
  const isPhotoPermissionBlocked =
    isPhotoStep && photoPermissionState !== PHOTO_PERMISSION_STATE.ALLOWED;

  return (
    <div className="wizard ym-disable-clickmap ym-disable-keys ym-hide-content">
      <div className="wizard__header">
        <div>
          <span className="wizard__kicker">
            Шаг {step} из {steps.length}
          </span>
        </div>
        <div
          className="step-indicator"
          aria-label={`Шаг ${step} из ${steps.length}`}
        >
          {steps.map((item, index) => (
            <span
              key={item.field}
              className={index < step ? "is-active" : ""}
              aria-hidden="true"
            />
          ))}
        </div>
      </div>

      <div className="step-content">
        <StepContent
          currentField={current?.field}
          form={form}
          handleChange={handleChange}
        />
        {submitError && (
          <p className="generation-submit-error" role="alert">
            {submitError}
          </p>
        )}
        {canRetryGeneration && (
          <button type="button" className="button button--secondary"
            disabled={isSubmitting || isRecoveryPending || isBalanceLoading}
            onClick={() => Promise.resolve(retryFailedGeneration()).then(response => {
              if (response?.operation) router.push(`/payment-return?draftId=${encodeURIComponent(response.draftId)}`);
            }).catch(() => undefined)}>
            Повторить создание
          </button>
        )}
        {isRecoveryPending && (
          <p className="generation-submit-error" role="status">
            Восстанавливаем текущую операцию...
          </p>
        )}
        {isPhotoPermissionPending && (
          <p className="generation-submit-status" role="status">
            Проверяем возможность создания…
          </p>
        )}
        {isPhotoStep && balance && (
          <p className="generation-submit-status" role="status">
            Доступно генераций: {balance.availableGenerations}.
            {balance.reservedGenerations > 0 && ` В работе: ${balance.reservedGenerations}.`}
          </p>
        )}
        {isPhotoStep && balance && balance.availableGenerations === 0 && balance.reservedGenerations > 0 && (
          <p role="status">Дождитесь завершения текущей операции. Новая покупка пока недоступна.</p>
        )}
        {isPhotoStep && balance && balance.availableGenerations === 0 &&
          balance.reservedGenerations === 0 && !balance.canPurchase && (
          <p role="status">Покупка новых генераций сейчас недоступна.</p>
        )}
        {isPhotoStep && balanceError && !isPhotoPermissionError && (
          <div role="alert">
            <p>{balanceError}</p>
            <button type="button" className="button button--secondary"
              disabled={isBalanceLoading} onClick={() => refreshBalance().catch(() => undefined)}>
              Обновить остаток
            </button>
          </div>
        )}
        {isPhotoPermissionError && (
          <div className="generation-submit-error" role="alert">
            <p>Не удалось проверить возможность создания новой сказки.</p>
            <button
              type="button"
              className="button button--secondary"
              onClick={handlePhotoPermissionRetry}
            >
              Повторить проверку
            </button>
          </div>
        )}
      </div>

      <div className="buttons">
        {step > 1 && (
          <button className="button button--secondary" onClick={goBack}>
            <span aria-hidden="true">←</span> Назад
          </button>
        )}
        {step < steps.length && (
          <button
            className="button button--primary"
            onClick={goNext}
            disabled={!isStepValid()}
          >
            Далее <span aria-hidden="true">→</span>
          </button>
        )}
        {step === steps.length && (
          <button
            className="button button--primary"
            onClick={handleSubmit}
            disabled={
              !isStepValid() ||
              isSubmitting ||
              isRecoveryPending ||
              !allowsNewGeneration(activeOperation, balance) || isBalanceLoading || Boolean(balanceError) ||
              isPhotoPermissionBlocked
            }
          >
            {getSubmitButtonText(paymentState, isSubmitting)}{" "}
            <span aria-hidden="true">✦</span>
          </button>
        )}
      </div>

      {booksPortalTarget &&
        createPortal(
          <UserBooks
            books={books}
            isLoading={isLoading}
            error={booksError}
            activeFlow={activeFlow}
            isRetrying={isSubmitting || isLoading}
            onRetry={handleRetry}
          />,
          booksPortalTarget,
        )}
    </div>
  );
}

export default Wizard;
