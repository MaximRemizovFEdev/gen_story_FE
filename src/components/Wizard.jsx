import React from 'react';
import { createPortal } from 'react-dom';
import { useWizardForm } from '../hooks/useWizardForm';
import { useGenerationProcess } from '../hooks/useGenerationProcess';
import { StepContent } from './steps/StepContent';
import { GenerationScreen } from './Progress/GenerationScreen';
import { UserBooks } from './books/UserBooks';
import { steps } from '../config/steps';
import { useUserBooks } from '../hooks/useUserBooks';

function Wizard({ booksPortalTarget }) {
  const {
    step,
    form,
    current,
    handleChange,
    isStepValid,
    goBack,
    goNext
  } = useWizardForm();

  const {
    status,
    showGenerationScreen,
    currentGenStep,
    coverUrl,
    pdfPath,
    error,
    failedStep,
    genSteps,
    startGeneration,
    retryFailedStep,
    resetGeneration
  } = useGenerationProcess();

  const {
    books,
    isLoading: areBooksLoading,
    error: booksError
  } = useUserBooks(form.phone, step === 1 && !showGenerationScreen);

  const handleSubmit = () => {
    startGeneration(form);
  };

  const handleRetry = () => {
    retryFailedStep(form);
  };

  return (
    <div className="wizard">
      {!showGenerationScreen && (
        <div className="wizard__header">
          <div>
            <span className="wizard__kicker">Шаг {step} из {steps.length}</span>
            <h2>{current?.label}</h2>
          </div>
          <div className="step-indicator" aria-label={`Шаг ${step} из ${steps.length}`}>
            {steps.map((item, index) => (
              <span key={item.field} className={index < step ? 'is-active' : ''} aria-hidden="true" />
            ))}
          </div>
        </div>
      )}
      <div className="step-content">
        {showGenerationScreen ? (
          <GenerationScreen
            status={status}
            error={error}
            failedStep={failedStep}
            retryFailedStep={handleRetry}
            currentGenStep={currentGenStep}
            genSteps={genSteps}
            coverUrl={coverUrl}
            pdfPath={pdfPath}
            resetGeneration={resetGeneration}
          />
        ) : (
          <StepContent
            currentField={current?.field}
            form={form}
            handleChange={handleChange}
          />
        )}
      </div>
      <div className="buttons">
        {step > 1 && !showGenerationScreen && (
          <button className="button button--secondary" onClick={goBack}>
            <span aria-hidden="true">←</span> Назад
          </button>
        )}
        {step < steps.length && !showGenerationScreen && (
          <button className="button button--primary" onClick={goNext} disabled={!isStepValid()}>
            Далее <span aria-hidden="true">→</span>
          </button>
        )}
        {step === steps.length && !showGenerationScreen && (
          <button className="button button--primary" onClick={handleSubmit} disabled={!isStepValid()}>
            Создать мою сказку <span aria-hidden="true">✦</span>
          </button>
        )}
      </div>
      {booksPortalTarget && step === 1 && !showGenerationScreen && createPortal(
        <UserBooks
          books={books}
          isLoading={areBooksLoading}
          error={booksError}
        />,
        booksPortalTarget,
      )}
    </div>
  );
}

export default Wizard;
