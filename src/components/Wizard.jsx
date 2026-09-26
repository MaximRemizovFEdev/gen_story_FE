import React, { useEffect, useRef } from "react";
import { createPortal } from "react-dom";
import { useWizardForm } from "../hooks/useWizardForm";
import { PAYMENT_STATE } from "../hooks/useGenerationProcess";
import { useGenerationProcessContext } from "../hooks/GenerationProcessContext";
import { StepContent } from "./steps/StepContent";
import { UserBooks } from "./books/UserBooks";
import { steps } from "../config/steps";
import { useUserBooks } from "../hooks/useUserBooks";
import { useAuth } from "../auth/AuthContext";

const getSubmitButtonText = (paymentState, isSubmitting) => {
  if (!isSubmitting) return "Создать мою сказку";
  if (paymentState === PAYMENT_STATE.CHECKING) return "Сохраняем анкету...";
  if (paymentState === PAYMENT_STATE.CREATING) return "Готовим оплату...";
  if (paymentState === PAYMENT_STATE.WAITING) return "Переходим к оплате...";
  return "Готовим создание...";
};

function Wizard({ booksPortalTarget }) {
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
    hasTrackedFlow,
    paymentState,
    startGeneration,
    retryGeneration,
    clearCompletedFlow,
  } = useGenerationProcessContext();
  const {
    books,
    isLoading,
    error: booksError,
    reload: reloadBooks,
  } = useUserBooks(isAuthenticated);
  const completionRefreshRef = useRef(null);

  useEffect(() => {
    if (activeFlow?.stage !== "book" || activeFlow?.status !== "success")
      return;
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
  }, [activeFlow, reloadBooks, clearCompletedFlow]);

  const handleSubmit = async () => {
    try {
      const response = await startGeneration(form);
      if (response) reset();
    } catch {
      // Submission errors are exposed by the hook; the completed form stays intact.
    }
  };

  const handleRetry = () => retryGeneration().catch(() => undefined);

  return (
    <div className="wizard">
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
        {isRecoveryPending && (
          <p className="generation-submit-error" role="status">
            Восстанавливаем текущую операцию...
          </p>
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
            disabled={!isStepValid() || isSubmitting || isRecoveryPending || hasTrackedFlow}
          >
            {getSubmitButtonText(paymentState, isSubmitting)}{" "}
            <span aria-hidden="true">✦</span>
          </button>
        )}
      </div>

      {booksPortalTarget &&
        step === 1 &&
        createPortal(
          <UserBooks
            books={books}
            isLoading={isLoading}
            error={booksError}
            activeFlow={activeFlow}
            isRetrying={isSubmitting}
            onRetry={handleRetry}
          />,
          booksPortalTarget,
        )}
    </div>
  );
}

export default Wizard;
