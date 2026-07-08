import React from "react";

export const GenerationScreen = ({
  error,
  failedStep,
  retryFailedStep,
  currentGenStep,
  genSteps,
  coverUrl,
  pdfPath,
}) => {
  if (error) {
    return (
      <div
        className="generation-error"
        style={{ color: "orange", textAlign: "center" }}
      >
        <span style={{ fontSize: "2rem", color: "orange" }}>⚠️</span>
        <p style={{ color: "orange" }}>
          Произошла ошибка. Попробуйте повторить шаг {`${failedStep}`}.
        </p>
        <button
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
          Повторить
        </button>
      </div>
    );
  }

  return (
    <div className="progress-screen">
      <h2>Генерация книги</h2>
      <div className="progress-steps">
        {genSteps.map((label, idx) => (
          <div
            key={label}
            className={`progress-step ${idx === currentGenStep ? "active" : ""} ${idx < currentGenStep ? "completed" : ""}`}
            style={{
              padding: "10px",
              margin: "5px 0",
              backgroundColor:
                idx === currentGenStep
                  ? "#4CAF50"
                  : idx < currentGenStep
                    ? "#8BC34A"
                    : "#f0f0f0",
              borderRadius: "4px",
            }}
          >
            <div style={{ display: "flex", justifyContent: "space-between" }}>
              <span>
                Шаг {idx + 1}/4 — {label}
              </span>
              {idx === currentGenStep ? <div className="gen-loader"></div> : null}
            </div>
          </div>
        ))}
      </div>
      {coverUrl && (
        <div className="cover-preview">
          <img
            src={coverUrl}
            alt="Обложка"
            style={{ maxWidth: "100%", marginTop: "20px" }}
          />
        </div>
      )}
      {pdfPath && (
        <div className="download-link">
          <a href={pdfPath} target="_blank" rel="noopener noreferrer">
            <img
              src={coverUrl}
              alt="Скачать книгу"
              style={{ maxWidth: "100%" }}
            />
            <p style={{ textAlign: "center", marginTop: "10px" }}>
              Скачать книгу
            </p>
          </a>
        </div>
      )}
    </div>
  );
};
