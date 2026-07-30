import React from 'react';
import { useWizardForm } from '../hooks/useWizardForm';
import { useGenerationProcess } from '../hooks/useGenerationProcess';
import { StepContent } from './steps/StepContent';
import { GenerationScreen } from './Progress/GenerationScreen';
import { UserBooks } from './books/UserBooks';
import { steps } from '../config/steps';
import { useUserBooks } from '../hooks/useUserBooks';

function Wizard() {
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
      <h1>Story Generator Wizard</h1>
      <p>Заполните анкету, чтобы создать свою книгу.</p>
      <div className="step-indicator">
        Шаг {step} из {steps.length}
      </div>
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
          <button onClick={goBack} disabled={!isStepValid()}>
            Назад
          </button>
        )}
        {step < steps.length && !showGenerationScreen && (
          <button onClick={goNext} disabled={!isStepValid()}>
            Далее
          </button>
        )}
        {step === steps.length && !showGenerationScreen && (
          <button onClick={handleSubmit} disabled={!isStepValid()}>
            Создать книгу
          </button>
        )}
      </div>
      {step === 1 && !showGenerationScreen && (
        <UserBooks
          books={books}
          isLoading={areBooksLoading}
          error={booksError}
        />
      )}
    </div>
  );
}

export default Wizard;
