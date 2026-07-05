import React from 'react';
import { useWizardForm } from '../hooks/useWizardForm';
import { useGenerationProcess } from '../hooks/useGenerationProcess';
import { StepContent } from './steps/StepContent';
import { GenerationScreen } from './Progress/GenerationScreen';
import { steps } from '../config/steps';

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
    isGenerating,
    currentGenStep,
    coverUrl,
    pdfUrl,
    error,
    failedStep,
    genSteps,
    startGeneration,
    retryFailedStep
  } = useGenerationProcess();

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
        {isGenerating ? (
          <GenerationScreen
            error={error}
            failedStep={failedStep}
            retryFailedStep={handleRetry}
            currentGenStep={currentGenStep}
            genSteps={genSteps}
            coverUrl={coverUrl}
            pdfUrl={pdfUrl}
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
        {step > 1 && !isGenerating && (
          <button onClick={goBack} disabled={!isStepValid()}>
            Назад
          </button>
        )}
        {step < steps.length && !isGenerating && (
          <button onClick={goNext} disabled={!isStepValid()}>
            Далее
          </button>
        )}
        {step === steps.length && !isGenerating && (
          <button onClick={handleSubmit} disabled={!isStepValid()}>
            Создать книгу
          </button>
        )}
      </div>
    </div>
  );
}

export default Wizard;