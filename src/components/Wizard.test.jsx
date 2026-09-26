import React from 'react';
import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import Wizard from './Wizard';
import { useWizardForm } from '../hooks/useWizardForm';
import { useGenerationProcess } from '../hooks/useGenerationProcess';
import { useUserBooks } from '../hooks/useUserBooks';

vi.mock('../auth/AuthContext', () => ({ useAuth: () => ({ isAuthenticated: true }) }));
vi.mock('../hooks/useWizardForm', () => ({ useWizardForm: vi.fn() }));
vi.mock('../hooks/useGenerationProcess', () => ({
  PAYMENT_STATE: {
    IDLE: 'idle',
    CHECKING: 'checking',
    CREATING: 'creating',
    WAITING: 'waiting',
    OPEN_BLOCKED: 'open_blocked',
    GENERATING: 'generating',
  },
  useGenerationProcess: vi.fn(),
}));
vi.mock('../hooks/useUserBooks', () => ({ useUserBooks: vi.fn() }));
vi.mock('./steps/StepContent', () => ({ StepContent: () => <div>Последний шаг анкеты</div> }));
vi.mock('./books/UserBooks', () => ({ UserBooks: () => null }));

const form = { childName: 'Миша', childPhoto: null };

const generationState = (overrides = {}) => ({
  activeFlow: null,
  isSubmitting: false,
  submitError: null,
  hasTrackedFlow: false,
  paymentState: 'idle',
  paymentConfirmationUrl: '',
  isAwaitingPayment: false,
  startGeneration: vi.fn(),
  retryGeneration: vi.fn(),
  clearCompletedFlow: vi.fn(),
  reopenPayment: vi.fn(),
  checkPaymentStatus: vi.fn(),
  ...overrides,
});

describe('Wizard flow submission', () => {
  let reset;
  let startGeneration;
  let reload;

  beforeEach(() => {
    reset = vi.fn();
    reload = vi.fn().mockResolvedValue([]);
    startGeneration = vi.fn().mockResolvedValue({ status: 'pending', storyId: 'flow-1' });
    useWizardForm.mockReturnValue({
      step: 7, form, current: { field: 'childPhoto' }, handleChange: vi.fn(),
      isStepValid: () => true, goBack: vi.fn(), goNext: vi.fn(), reset,
    });
    useGenerationProcess.mockReturnValue(generationState({ startGeneration }));
    useUserBooks.mockReturnValue({ books: [], isLoading: false, error: null, reload });
  });

  it('resets the questionnaire only after the flow is accepted', async () => {
    render(<Wizard />);
    fireEvent.click(screen.getByRole('button', { name: /создать мою сказку/i }));
    await waitFor(() => expect(startGeneration).toHaveBeenCalledWith(form));
    expect(reset).toHaveBeenCalledTimes(1);
  });

  it('preserves the completed questionnaire and shows the submission error on failure', async () => {
    startGeneration.mockRejectedValue(new Error('Не удалось запустить flow'));
    useGenerationProcess.mockReturnValue(generationState({
      submitError: 'Не удалось запустить flow',
      startGeneration,
    }));
    render(<Wizard />);
    fireEvent.click(screen.getByRole('button', { name: /создать мою сказку/i }));
    await waitFor(() => expect(startGeneration).toHaveBeenCalled());
    expect(reset).not.toHaveBeenCalled();
    expect(screen.getByRole('alert')).toHaveTextContent('Не удалось запустить flow');
  });

  it('refreshes completed books and clears the placeholder only when its storyId is returned', async () => {
    const clearCompletedFlow = vi.fn();
    reload.mockResolvedValue([{ storyId: 'flow-1', title: 'Готовая книга' }]);
    useGenerationProcess.mockReturnValue(generationState({
      activeFlow: { storyId: 'flow-1', stage: 'book', status: 'success' },
      hasTrackedFlow: true,
      startGeneration,
      clearCompletedFlow,
    }));
    render(<Wizard />);
    await waitFor(() => expect(clearCompletedFlow).toHaveBeenCalledWith('flow-1'));
    expect(reload).toHaveBeenCalledTimes(1);
  });

  it('keeps the completed placeholder when the authoritative refresh fails', async () => {
    const clearCompletedFlow = vi.fn();
    reload.mockRejectedValue(new Error('library unavailable'));
    useGenerationProcess.mockReturnValue(generationState({
      activeFlow: { storyId: 'flow-1', stage: 'book', status: 'success' },
      hasTrackedFlow: true,
      startGeneration,
      clearCompletedFlow,
    }));
    render(<Wizard />);
    await waitFor(() => expect(reload).toHaveBeenCalledTimes(1));
    expect(clearCompletedFlow).not.toHaveBeenCalled();
    expect(startGeneration).not.toHaveBeenCalled();
  });

  it('shows payment waiting controls without resetting the questionnaire', () => {
    const reopenPayment = vi.fn();
    const checkPaymentStatus = vi.fn().mockResolvedValue({ paid: false });
    useGenerationProcess.mockReturnValue(generationState({
      isSubmitting: true,
      paymentState: 'waiting',
      paymentConfirmationUrl: 'https://yoomoney.ru/checkout/payments/1',
      isAwaitingPayment: true,
      startGeneration,
      reopenPayment,
      checkPaymentStatus,
    }));

    render(<Wizard />);

    expect(screen.getByRole('status')).toHaveTextContent(/Создание сказки начнётся автоматически/i);
    expect(screen.getByRole('button', { name: /Ждём оплату/i })).toBeDisabled();
    fireEvent.click(screen.getByRole('button', { name: /Открыть оплату/i }));
    fireEvent.click(screen.getByRole('button', { name: /Проверить оплату/i }));
    expect(reopenPayment).toHaveBeenCalledTimes(1);
    expect(checkPaymentStatus).toHaveBeenCalledTimes(1);
    expect(reset).not.toHaveBeenCalled();
  });
});
