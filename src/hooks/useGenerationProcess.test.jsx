import { act, renderHook } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import apiService from "../services/ApiService";
import {
  OPERATION_POLL_INTERVAL_MS,
  OPERATION_UI_STATE,
  PAYMENT_STATE,
  POLL_INTERVAL_MS,
  useGenerationProcess,
} from "./useGenerationProcess";

let authState = {
  status: "authenticated",
  sessionVersion: 0,
};

vi.mock("../auth/AuthContext", () => ({
  AUTH_STATUS: {
    CHECKING: "checking",
    AUTHENTICATED: "authenticated",
    ANONYMOUS: "anonymous",
  },
  useAuth: () => authState,
}));

vi.mock("../services/ApiService", () => ({
  default: {
    createGenerationDraft: vi.fn(),
    createGenerationPayment: vi.fn(),
    getGenerationOperationStatus: vi.fn(),
    getCurrentGenerationOperation: vi.fn(),
    getGenerationFlowStatus: vi.fn(),
  },
}));

const form = {
  childName: "Миша",
  ageGroup: "5",
  heroType: "Дракон",
  heroCustom: "",
  adventureGoal: "Космос",
  adventureCustom: "",
  storyMood: "Добрая",
  interests: ["Роботы"],
  childPhoto: null,
};

const operation = (overrides = {}) => ({
  draftId: "draft-1",
  paymentStatus: "pending",
  generationStatus: "not_started",
  storyId: null,
  error: null,
  ...overrides,
});

const flowStatus = (stage, status = "pending", storyId = "12-34_25-09-2026") => ({
  storyId,
  stage,
  status,
});

const flush = () =>
  act(async () => {
    await Promise.resolve();
    await Promise.resolve();
  });

describe("useGenerationProcess", () => {
  let assign;

  beforeEach(() => {
    vi.useFakeTimers();
    authState = { status: "authenticated", sessionVersion: 0 };
    assign = vi.fn();
    window.__GEN_STORY_NAVIGATE__ = assign;
    apiService.createGenerationDraft.mockReset().mockResolvedValue({ draftId: "draft-1" });
    apiService.createGenerationPayment.mockReset().mockResolvedValue({
      purchaseId: "purchase-1",
      providerPaymentId: "provider-1",
      confirmationUrl: "https://yoomoney.ru/checkout/payments/1",
    });
    apiService.getCurrentGenerationOperation.mockReset().mockResolvedValue(null);
    apiService.getGenerationOperationStatus.mockReset().mockResolvedValue(operation());
    apiService.getGenerationFlowStatus.mockReset().mockResolvedValue(
      flowStatus("story"),
    );
  });

  afterEach(() => {
    delete window.__GEN_STORY_NAVIGATE__;
    vi.restoreAllMocks();
    vi.useRealTimers();
  });

  it("recovers current operation on authenticated entry without mutations", async () => {
    apiService.getCurrentGenerationOperation.mockResolvedValueOnce(
      operation({ paymentStatus: "reserved", generationStatus: "running" }),
    );
    apiService.getGenerationOperationStatus.mockResolvedValue(
      operation({ paymentStatus: "reserved", generationStatus: "running" }),
    );
    const { result } = renderHook(() => useGenerationProcess());
    await flush();
    expect(result.current.activeOperation).toMatchObject({
      draftId: "draft-1",
      paymentStatus: "reserved",
    });
    expect(apiService.createGenerationDraft).not.toHaveBeenCalled();
    expect(apiService.createGenerationPayment).not.toHaveBeenCalled();
  });

  it("creates a draft before payment and opens YooKassa in the current tab", async () => {
    const { result } = renderHook(() => useGenerationProcess());
    await flush();
    await act(async () => { await result.current.startGeneration(form); });
    expect(apiService.createGenerationDraft).toHaveBeenCalledWith(
      expect.objectContaining({ childName: "Миша" }),
      null,
    );
    expect(apiService.createGenerationPayment).toHaveBeenCalledWith("draft-1");
    expect(assign).toHaveBeenCalledWith("https://yoomoney.ru/checkout/payments/1");
    expect(result.current.paymentState).toBe(PAYMENT_STATE.WAITING);
  });

  it("guards rapid duplicate submits while checkout preparation is pending", async () => {
    let resolveDraft;
    apiService.createGenerationDraft.mockReturnValue(
      new Promise((resolve) => {
        resolveDraft = resolve;
      }),
    );
    const { result } = renderHook(() => useGenerationProcess());
    await flush();
    let first;
    await act(async () => {
      await Promise.resolve();
      first = result.current.startGeneration(form);
      result.current.startGeneration({ ...form, childName: "Другой" });
      await Promise.resolve();
    });
    expect(apiService.createGenerationDraft).toHaveBeenCalledTimes(1);
    await act(async () => {
      resolveDraft({ draftId: "draft-1" });
      await first;
    });
  });

  it("preserves inputs on draft errors and reconciles payment errors through reads only", async () => {
    apiService.createGenerationDraft.mockRejectedValueOnce(new Error("draft failed"));
    const { result } = renderHook(() => useGenerationProcess());
    await flush();
    await act(async () => {
      await expect(result.current.startGeneration(form)).rejects.toThrow("draft failed");
    });
    expect(result.current.submitError).toBe("draft failed");
    expect(apiService.createGenerationPayment).not.toHaveBeenCalled();

    apiService.createGenerationDraft.mockResolvedValueOnce({ draftId: "draft-2" });
    apiService.createGenerationPayment.mockRejectedValueOnce(new Error("pay failed"));
    await act(async () => {
      await expect(result.current.startGeneration(form)).rejects.toThrow("pay failed");
      await Promise.resolve();
    });
    expect(apiService.createGenerationDraft).toHaveBeenCalledTimes(2);
    expect(apiService.createGenerationPayment).toHaveBeenCalledTimes(1);
  });

  it("polls operation states before story allocation and keeps transient errors recoverable", async () => {
    apiService.getCurrentGenerationOperation.mockResolvedValueOnce(
      operation({ paymentStatus: "paid", generationStatus: "not_started" }),
    );
    apiService.getGenerationOperationStatus
      .mockRejectedValueOnce(new Error("temporary"))
      .mockResolvedValueOnce(
        operation({
          paymentStatus: "reserved",
          generationStatus: "running",
          storyId: "12-34_25-09-2026",
        }),
      );
    const { result } = renderHook(() => useGenerationProcess());
    await flush();
    expect(result.current.operationUiState).toBe(OPERATION_UI_STATE.PAYMENT_CONFIRMED);
    expect(result.current.statusError).toBe("temporary");
    await act(async () => {
      await vi.advanceTimersByTimeAsync(OPERATION_POLL_INTERVAL_MS);
    });
    expect(result.current.operationUiState).toBe(OPERATION_UI_STATE.GENERATING);
    expect(result.current.activeFlow).toMatchObject({
      storyId: "12-34_25-09-2026",
    });
  });

  it("transfers to existing story polling and stops at ready", async () => {
    apiService.getCurrentGenerationOperation.mockResolvedValueOnce(
      operation({
        paymentStatus: "reserved",
        generationStatus: "running",
        storyId: "12-34_25-09-2026",
      }),
    );
    apiService.getGenerationFlowStatus
      .mockResolvedValueOnce(flowStatus("cover", "success"))
      .mockResolvedValueOnce(flowStatus("book", "success"));
    apiService.getGenerationOperationStatus.mockResolvedValue(
      operation({
        paymentStatus: "reserved",
        generationStatus: "running",
        storyId: "12-34_25-09-2026",
      }),
    );
    const { result } = renderHook(() => useGenerationProcess());
    await flush();
    await flush();
    expect(apiService.getGenerationFlowStatus).toHaveBeenCalledTimes(1);
    expect(result.current.activeFlow).toMatchObject({
      stage: "cover",
      status: "success",
    });
    await act(async () => {
      await vi.advanceTimersByTimeAsync(POLL_INTERVAL_MS);
    });
    await flush();
    expect(result.current.activeFlow).toMatchObject({
      stage: "book",
      status: "success",
    });
    expect(result.current.operationUiState).toBe(OPERATION_UI_STATE.READY);
    await act(async () => {
      await vi.advanceTimersByTimeAsync(POLL_INTERVAL_MS * 2);
    });
    expect(apiService.getGenerationFlowStatus).toHaveBeenCalledTimes(2);
  });

  it("clears session-bound details on 401 and session changes", async () => {
    apiService.getCurrentGenerationOperation.mockResolvedValueOnce(
      operation({ paymentStatus: "reserved", generationStatus: "running" }),
    );
    apiService.getGenerationOperationStatus.mockRejectedValueOnce(
      Object.assign(new Error("expired"), { status: 401 }),
    );
    const { result, rerender } = renderHook(() => useGenerationProcess());
    await flush();
    await act(async () => { await vi.advanceTimersByTimeAsync(OPERATION_POLL_INTERVAL_MS); });
    expect(result.current.activeOperation).toBeNull();

    apiService.getCurrentGenerationOperation.mockResolvedValueOnce(
      operation({ paymentStatus: "pending" }),
    );
    authState = { status: "authenticated", sessionVersion: 1 };
    rerender();
    await act(async () => {
      await Promise.resolve();
    });
    expect(result.current.activeOperation).toBeNull();
  });

  it("does not discover another operation after an unavailable explicit return", async () => {
    apiService.getGenerationOperationStatus.mockRejectedValueOnce(
      Object.assign(new Error("missing"), { status: 404 }),
    );
    apiService.getCurrentGenerationOperation.mockResolvedValueOnce(
      operation({ draftId: "other-draft", paymentStatus: "reserved" }),
    );
    const { result } = renderHook(() => useGenerationProcess());
    await act(async () => {
      await result.current.recoverOperation("missing-draft", { explicit: true });
    });
    expect(result.current.operationUiState).toBe(OPERATION_UI_STATE.ERROR);
    expect(result.current.activeOperation).toBeNull();
  });
});
