import React, { useEffect, useMemo } from "react";
import { Link, useLocation } from "react-router-dom";
import { AUTH_STATUS, useAuth } from "../auth/AuthContext";
import {
  OPERATION_UI_STATE,
} from "../hooks/useGenerationProcess";
import { useGenerationProcessContext } from "../hooks/GenerationProcessContext";

const STATUS_TEXT = {
  [OPERATION_UI_STATE.RECOVERING]: {
    kicker: "Проверка оплаты",
    title: "Проверяем оплату",
    text: "Запрашиваем состояние операции у сервера.",
  },
  [OPERATION_UI_STATE.CHECKING_PAYMENT]: {
    kicker: "Проверка оплаты",
    title: "Проверяем оплату",
    text: "Ждем подтверждение платежа от ЮKassa.",
  },
  [OPERATION_UI_STATE.PAYMENT_CONFIRMED]: {
    kicker: "Оплата подтверждена",
    title: "Оплата подтверждена",
    text: "Сервер готовит запуск генерации.",
  },
  [OPERATION_UI_STATE.GENERATING]: {
    kicker: "Генерация выполняется",
    title: "Книга создается",
    text: "Сказка уже в работе. Статус обновится автоматически.",
  },
  [OPERATION_UI_STATE.READY]: {
    kicker: "Книга готова",
    title: "Книга готова",
    text: "Готовую книгу можно открыть в библиотеке.",
  },
  [OPERATION_UI_STATE.ERROR]: {
    kicker: "Ошибка",
    title: "Не удалось получить состояние операции",
    text: "Попробуйте обновить статус или вернуться в приложение.",
  },
  [OPERATION_UI_STATE.IDLE]: {
    kicker: "Проверка оплаты",
    title: "Ищем операцию",
    text: "Если оплата уже прошла, сервер вернет текущую операцию.",
  },
};

const getReturnDraftId = (search) => {
  const params = new URLSearchParams(search);
  return (
    params.get("draftId") ||
    params.get("draft_id") ||
    params.get("operationId") ||
    params.get("operation_id") ||
    ""
  );
};

const stageText = (flow) => {
  if (!flow?.storyId) return "";
  const labels = {
    story: "Создаем историю",
    cover: "Рисуем обложку",
    scenes: "Готовим иллюстрации",
    book: "Собираем книгу",
  };
  return labels[flow.stage] || flow.stage;
};

export default function PaymentReturnPage() {
  const { status } = useAuth();
  const location = useLocation();
  const draftId = useMemo(() => getReturnDraftId(location.search), [location.search]);
  const {
    activeOperation,
    activeFlow,
    operationUiState,
    statusError,
    isRecovering,
    recoverOperation,
    refreshStatus,
  } = useGenerationProcessContext();

  useEffect(() => {
    if (status !== AUTH_STATUS.AUTHENTICATED || !draftId) return undefined;
    const controller = new AbortController();
    recoverOperation(draftId, {
      explicit: true,
      signal: controller.signal,
    }).catch((error) => {
      if (error?.name !== "AbortError") undefined;
    });
    return () => controller.abort();
  }, [draftId, recoverOperation, status]);

  const state =
    status === AUTH_STATUS.CHECKING || isRecovering
      ? OPERATION_UI_STATE.RECOVERING
      : operationUiState;
  const copy = STATUS_TEXT[state] || STATUS_TEXT[OPERATION_UI_STATE.ERROR];
  const detail = stageText(activeFlow);

  return (
    <main className="auth-page">
      <section className="auth-card" aria-labelledby="payment-return-title">
        <span className="auth-card__kicker">{copy.kicker}</span>
        <h1 id="payment-return-title">{copy.title}</h1>
        <p>{copy.text}</p>
        {detail && <p>{detail}</p>}
        {activeOperation?.draftId && <p>Операция: {activeOperation.draftId}</p>}
        {statusError && (
          <p className="auth-inline-error" role="alert">
            {statusError}
          </p>
        )}
        <div className="payment-wait__actions">
          <button
            type="button"
            className="button button--secondary"
            onClick={() => refreshStatus()}
            disabled={status !== AUTH_STATUS.AUTHENTICATED || isRecovering}
          >
            Обновить статус
          </button>
          <Link className="button button--primary" to="/app">
            В библиотеку
          </Link>
        </div>
      </section>
    </main>
  );
}
