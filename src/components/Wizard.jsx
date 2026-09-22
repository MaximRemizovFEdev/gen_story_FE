import React, { useEffect, useRef } from 'react';
import { createPortal } from 'react-dom';
import { useWizardForm } from '../hooks/useWizardForm';
import { PAYMENT_STATE, useGenerationProcess } from '../hooks/useGenerationProcess';
import { StepContent } from './steps/StepContent';
import { UserBooks } from './books/UserBooks';
import { steps } from '../config/steps';
import { useUserBooks } from '../hooks/useUserBooks';
import { useAuth } from '../auth/AuthContext';

const getSubmitButtonText = (paymentState, isSubmitting) => {
  if (!isSubmitting) return 'Создать мою сказку';
  if (paymentState === PAYMENT_STATE.CHECKING) return 'Проверяем оплату…';
  if (paymentState === PAYMENT_STATE.CREATING) return 'Готовим оплату…';
  if (paymentState === PAYMENT_STATE.WAITING || paymentState === PAYMENT_STATE.OPEN_BLOCKED) return 'Ждём оплату…';
  return 'Запускаем создание…';
};

function Wizard({ booksPortalTarget }) {
  const { isAuthenticated } = useAuth();
  const { step, form, current, handleChange, isStepValid, goBack, goNext, reset } = useWizardForm();
  const {
    activeFlow,
    isSubmitting,
    submitError,
    hasTrackedFlow,
    paymentState,
    paymentConfirmationUrl,
    isAwaitingPayment,
    startGeneration,
    retryGeneration,
    clearCompletedFlow,
    reopenPayment,
    checkPaymentStatus,
  } = useGenerationProcess();
  const { books, isLoading, error: booksError, reload: reloadBooks } = useUserBooks(isAuthenticated);
  const completionRefreshRef = useRef(null);

  useEffect(() => {
    if (activeFlow?.stage !== 'book' || activeFlow?.status !== 'success') return;
    if (completionRefreshRef.current === activeFlow.storyId) return;
    completionRefreshRef.current = activeFlow.storyId;
    reloadBooks()
      .then((nextBooks) => {
        if (nextBooks.some((book) => (book.storyId ?? book.id) === activeFlow.storyId)) {
          clearCompletedFlow(activeFlow.storyId);
        }
      })
      .catch(() => undefined);
  }, [activeFlow, reloadBooks, clearCompletedFlow]);

  const handleSubmit = async () => {
    try {
      const response = await startGeneration(form);
      if (response) {
        reset();
        reloadBooks().catch(() => undefined);
      }
    } catch {
      // Submission errors are exposed by the hook; the completed form stays intact.
    }
  };

  const handleRetry = () => retryGeneration().catch(() => undefined);
  const handleOpenPayment = () => reopenPayment();
  const handleCheckPayment = () => checkPaymentStatus().catch(() => undefined);

  return (
    <div className="wizard">
      <div className="wizard__header">
        <div><span className="wizard__kicker">Шаг {step} из {steps.length}</span></div>
        <div className="step-indicator" aria-label={`Шаг ${step} из ${steps.length}`}>
          {steps.map((item, index) => (
            <span key={item.field} className={index < step ? 'is-active' : ''} aria-hidden="true" />
          ))}
        </div>
      </div>

      <div className="step-content">
        <StepContent currentField={current?.field} form={form} handleChange={handleChange} />
        {submitError && <p className="generation-submit-error" role="alert">{submitError}</p>}
        {isAwaitingPayment && (
          <div className="payment-wait" role="status">
            <p>Оплатите заказ в открывшейся вкладке. Создание сказки начнётся автоматически после подтверждения оплаты.</p>
            <div className="payment-wait__actions">
              {paymentConfirmationUrl && (
                <button type="button" className="button button--secondary" onClick={handleOpenPayment}>
                  Открыть оплату
                </button>
              )}
              <button type="button" className="button button--secondary" onClick={handleCheckPayment}>
                Проверить оплату
              </button>
            </div>
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
          <button className="button button--primary" onClick={goNext} disabled={!isStepValid()}>
            Далее <span aria-hidden="true">→</span>
          </button>
        )}
        {step === steps.length && (
          <button className="button button--primary" onClick={handleSubmit} disabled={!isStepValid() || isSubmitting || hasTrackedFlow}>
            {getSubmitButtonText(paymentState, isSubmitting)} <span aria-hidden="true">✦</span>
          </button>
        )}
      </div>

      {booksPortalTarget && step === 1 && createPortal(
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
