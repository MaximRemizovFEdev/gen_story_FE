import React from "react";
import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";
import Wizard from "./Wizard";
import { useWizardForm } from "../hooks/useWizardForm";
import { useGenerationProcessContext } from "../hooks/GenerationProcessContext";
import { useUserBooks } from "../hooks/useUserBooks";

vi.mock("../auth/AuthContext", () => ({ useAuth: () => ({ isAuthenticated: true }) }));
vi.mock("../hooks/useWizardForm", () => ({ useWizardForm: vi.fn() }));
vi.mock("../hooks/GenerationProcessContext", () => ({
  useGenerationProcessContext: vi.fn(),
}));
vi.mock("../hooks/useUserBooks", () => ({ useUserBooks: vi.fn() }));
vi.mock("./steps/StepContent", () => ({
  StepContent: () => <div>Последний шаг анкеты</div>,
}));
vi.mock("./books/UserBooks", () => ({ UserBooks: () => null }));

const form = { childName: "Миша", childPhoto: null };

const generationState = (overrides = {}) => ({
  activeFlow: null,
  activeOperation: null,
  isSubmitting: false,
  isRecoveryPending: false,
  submitError: null,
  hasTrackedFlow: false,
  paymentState: "idle",
  startGeneration: vi.fn(),
  retryGeneration: vi.fn(),
  checkNewSubmissionPermission: vi.fn().mockResolvedValue(null),
  clearCompletedFlow: vi.fn(),
  ...overrides,
});

describe("Wizard flow submission", () => {
  let reset;
  let startGeneration;
  let checkNewSubmissionPermission;
  let reload;

  beforeEach(() => {
    reset = vi.fn();
    reload = vi.fn().mockResolvedValue([]);
    startGeneration = vi.fn().mockResolvedValue({ draftId: "draft-1" });
    checkNewSubmissionPermission = vi.fn().mockResolvedValue(null);
    useWizardForm.mockReturnValue({
      step: 7,
      form,
      current: { field: "childPhoto" },
      handleChange: vi.fn(),
      isStepValid: () => true,
      goBack: vi.fn(),
      goNext: vi.fn(),
      reset,
    });
    useGenerationProcessContext.mockReturnValue(
      generationState({ startGeneration, checkNewSubmissionPermission }),
    );
    useUserBooks.mockReturnValue({
      books: [],
      isLoading: false,
      error: null,
      reload,
    });
  });

  it("resets the questionnaire only after checkout preparation is accepted", async () => {
    render(<Wizard />);
    await waitFor(() =>
      expect(screen.getByRole("button", { name: /создать мою сказку/i })).toBeEnabled(),
    );
    fireEvent.click(screen.getByRole("button", { name: /создать мою сказку/i }));
    await waitFor(() => expect(startGeneration).toHaveBeenCalledWith(form));
    expect(reset).toHaveBeenCalledTimes(1);
  });

  it("preserves the completed questionnaire and shows the submission error on failure", async () => {
    startGeneration.mockRejectedValue(new Error("flow failed"));
    useGenerationProcessContext.mockReturnValue(
      generationState({
        submitError: "flow failed",
        startGeneration,
      }),
    );
    render(<Wizard />);
    await waitFor(() =>
      expect(screen.getByRole("button", { name: /создать мою сказку/i })).toBeEnabled(),
    );
    fireEvent.click(screen.getByRole("button", { name: /создать мою сказку/i }));
    await waitFor(() => expect(startGeneration).toHaveBeenCalled());
    expect(reset).not.toHaveBeenCalled();
    expect(screen.getByRole("alert")).toHaveTextContent("flow failed");
  });

  it("refreshes completed books and clears the placeholder only when its storyId is returned", async () => {
    const clearCompletedFlow = vi.fn();
    reload.mockResolvedValue([{ storyId: "flow-1", title: "Готовая книга" }]);
    useGenerationProcessContext.mockReturnValue(
      generationState({
        activeFlow: { storyId: "flow-1", stage: "book", status: "success" },
        hasTrackedFlow: true,
        startGeneration,
        clearCompletedFlow,
      }),
    );
    render(<Wizard />);
    await waitFor(() => expect(clearCompletedFlow).toHaveBeenCalledWith("flow-1"));
    expect(reload).toHaveBeenCalledTimes(1);
  });

  it("keeps the completed placeholder when the authoritative refresh fails", async () => {
    const clearCompletedFlow = vi.fn();
    reload.mockRejectedValue(new Error("library unavailable"));
    useGenerationProcessContext.mockReturnValue(
      generationState({
        activeFlow: { storyId: "flow-1", stage: "book", status: "success" },
        hasTrackedFlow: true,
        startGeneration,
        clearCompletedFlow,
      }),
    );
    render(<Wizard />);
    await waitFor(() => expect(reload).toHaveBeenCalledTimes(1));
    expect(clearCompletedFlow).not.toHaveBeenCalled();
    expect(startGeneration).not.toHaveBeenCalled();
  });

  it("blocks duplicate submit while recovery is unresolved", () => {
    useGenerationProcessContext.mockReturnValue(
      generationState({
        isRecoveryPending: true,
        startGeneration,
      }),
    );
    render(<Wizard />);
    expect(screen.getByText(/восстанавливаем текущую операцию/i)).toBeInTheDocument();
    expect(screen.getByRole("button", { name: /создать мою сказку/i })).toBeDisabled();
  });

  it("shows checkout preparation without old payment controls", () => {
    useGenerationProcessContext.mockReturnValue(
      generationState({
        isSubmitting: true,
        paymentState: "waiting",
        startGeneration,
      }),
    );

    render(<Wizard />);

    expect(screen.getByRole("button", { name: /переходим к оплате/i })).toBeDisabled();
    expect(screen.queryByRole("button", { name: /открыть оплату/i })).not.toBeInTheDocument();
    expect(screen.queryByRole("button", { name: /проверить оплату/i })).not.toBeInTheDocument();
    expect(reset).not.toHaveBeenCalled();
  });

  it("checks current operation on every photo step entry and blocks while pending", async () => {
    let resolveFirst;
    checkNewSubmissionPermission.mockReturnValueOnce(
      new Promise((resolve) => {
        resolveFirst = resolve;
      }),
    );
    const goBack = vi.fn();
    const goNext = vi.fn();
    useWizardForm.mockReturnValue({
      step: 7,
      form,
      current: { field: "childPhoto" },
      handleChange: vi.fn(),
      isStepValid: () => true,
      goBack,
      goNext,
      reset,
    });

    const { rerender } = render(<Wizard />);

    expect(checkNewSubmissionPermission).toHaveBeenCalledTimes(1);
    expect(screen.getByRole("status")).toHaveTextContent(
      /проверяем возможность создания/i,
    );
    expect(screen.getByRole("button", { name: /создать мою сказку/i })).toBeDisabled();

    await waitFor(() => expect(resolveFirst).toBeDefined());
    resolveFirst(null);
    await waitFor(() =>
      expect(screen.getByRole("button", { name: /создать мою сказку/i })).toBeEnabled(),
    );

    useWizardForm.mockReturnValue({
      step: 6,
      form,
      current: { field: "interests" },
      handleChange: vi.fn(),
      isStepValid: () => true,
      goBack,
      goNext,
      reset,
    });
    rerender(<Wizard />);

    useWizardForm.mockReturnValue({
      step: 7,
      form,
      current: { field: "childPhoto" },
      handleChange: vi.fn(),
      isStepValid: () => true,
      goBack,
      goNext,
      reset,
    });
    rerender(<Wizard />);

    expect(checkNewSubmissionPermission).toHaveBeenCalledTimes(2);
    expect(screen.getByRole("button", { name: /создать мою сказку/i })).toBeDisabled();
  });

  it("keeps create blocked on check error and unlocks after retry returns null", async () => {
    checkNewSubmissionPermission
      .mockRejectedValueOnce(new Error("network"))
      .mockResolvedValueOnce(null);

    render(<Wizard />);

    await waitFor(() =>
      expect(screen.getByRole("alert")).toHaveTextContent(
        /не удалось проверить возможность создания/i,
      ),
    );
    expect(screen.getByRole("button", { name: /создать мою сказку/i })).toBeDisabled();

    fireEvent.click(screen.getByRole("button", { name: /повторить проверку/i }));

    await waitFor(() =>
      expect(screen.getByRole("button", { name: /создать мою сказку/i })).toBeEnabled(),
    );
    expect(checkNewSubmissionPermission).toHaveBeenCalledTimes(2);
    expect(startGeneration).not.toHaveBeenCalled();
  });

  it("does not submit on an allowed check and submits once after the user clicks", async () => {
    render(<Wizard />);

    await waitFor(() =>
      expect(screen.getByRole("button", { name: /создать мою сказку/i })).toBeEnabled(),
    );
    expect(startGeneration).not.toHaveBeenCalled();

    fireEvent.click(screen.getByRole("button", { name: /создать мою сказку/i }));

    await waitFor(() => expect(startGeneration).toHaveBeenCalledTimes(1));
    expect(startGeneration).toHaveBeenCalledWith(form);
  });
});
