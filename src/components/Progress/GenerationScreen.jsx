import React from "react";
import { GENERATION_STATUS } from "../../hooks/useGenerationProcess";
import apiService from "../../services/ApiService";

export const GenerationScreen = ({
  status,
  error,
  failedStep,
  retryFailedStep,
  resetGeneration,
  currentGenStep,
  genSteps,
  coverUrl,
  pdfPath,
}) => {
  const isRunning = status === GENERATION_STATUS.RUNNING;
  const isFailed = status === GENERATION_STATUS.FAILED;
  const isCompleted = status === GENERATION_STATUS.COMPLETED;
  const failedStepLabel = failedStep == null ? null : genSteps[failedStep];

  const getStepBackground = (idx) => {
    if (isFailed && idx === failedStep) return "#ffcc80";
    if (idx < currentGenStep) return "#8BC34A";
    if (isRunning && idx === currentGenStep) return "#4CAF50";
    return "#f0f0f0";
  };

  return (
    <div className="progress-screen">
      <h2>{isCompleted ? "Книга готова" : "Генерация книги"}</h2>
      <div className="progress-steps">
        {genSteps.map((label, idx) => {
          const isActive = isRunning && idx === currentGenStep;
          const hasFailed = isFailed && idx === failedStep;
          const isDone = idx < currentGenStep;

          return (
            <div
              key={label}
              className={`progress-step ${isActive ? "active" : ""} ${isDone ? "completed" : ""} ${hasFailed ? "failed" : ""}`}
              style={{
                padding: "10px",
                margin: "5px 0",
                backgroundColor: getStepBackground(idx),
                borderRadius: "4px",
              }}
            >
              <div style={{ display: "flex", justifyContent: "space-between" }}>
                <span>
                  Шаг {idx + 1}/{genSteps.length} — {label}
                </span>
                {isActive ? <div className="gen-loader" /> : null}
                {hasFailed ? <span aria-label="Ошибка">⚠️</span> : null}
              </div>
            </div>
          );
        })}
      </div>

      {isFailed && (
        <div
          className="generation-error"
          style={{ color: "#b45309", textAlign: "center", marginTop: "16px" }}
        >
          <p>
            Не удалось выполнить шаг {failedStep + 1} из {genSteps.length}
            {failedStepLabel ? `: «${failedStepLabel}»` : ""}.
          </p>
          {error && <p>{error}</p>}
          <button
            type="button"
            onClick={retryFailedStep}
            style={{
              marginTop: "10px",
              padding: "8px 12px",
              backgroundColor: "#ffeb3b",
              border: "none",
              borderRadius: "4px",
              cursor: "pointer",
            }}
          >
            Повторить шаг
          </button>
        </div>
      )}

      {coverUrl && !pdfPath && (
        <div className="cover-preview">
          <img
            src={apiService.getFileUrl(coverUrl)}
            alt="Обложка"
            style={{ maxWidth: "150px", marginTop: "20px" }}
          />
        </div>
      )}

      {isCompleted && pdfPath && (
        <div className="download-link">
          <a
            href={apiService.getFileUrl(pdfPath)}
            target="_blank"
            rel="noopener noreferrer"
          >
            {coverUrl && (
              <img
                src={apiService.getFileUrl(coverUrl)}
                alt="Скачать книгу"
                style={{ maxWidth: "150px" }}
              />
            )}
            <p style={{ textAlign: "center", marginTop: "10px" }}>
              Скачать книгу
            </p>
          </a>
          <button type="button" onClick={resetGeneration}>
            Вернуться к анкете
          </button>
        </div>
      )}
    </div>
  );
};
