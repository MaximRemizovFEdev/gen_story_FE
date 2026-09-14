import React from 'react';
import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import Wizard from './Wizard';
import { useWizardForm } from '../hooks/useWizardForm';
import { useGenerationProcess } from '../hooks/useGenerationProcess';
import { useUserBooks } from '../hooks/useUserBooks';

vi.mock('../auth/AuthContext', () => ({ useAuth: () => ({ isAuthenticated: true }) }));
vi.mock('../hooks/useWizardForm', () => ({ useWizardForm: vi.fn() }));
vi.mock('../hooks/useGenerationProcess', () => ({ useGenerationProcess: vi.fn() }));
vi.mock('../hooks/useUserBooks', () => ({ useUserBooks: vi.fn() }));
vi.mock('./steps/StepContent', () => ({ StepContent: () => <div>Последний шаг анкеты</div> }));
vi.mock('./books/UserBooks', () => ({ UserBooks: () => null }));

const form = { childName: 'Миша', childPhoto: null };

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
    useGenerationProcess.mockReturnValue({
      activeFlow: null, isSubmitting: false, submitError: null, hasTrackedFlow: false,
      startGeneration, retryGeneration: vi.fn(), clearCompletedFlow: vi.fn(),
    });
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
    useGenerationProcess.mockReturnValue({
      activeFlow: null, isSubmitting: false, submitError: 'Не удалось запустить flow', hasTrackedFlow: false,
      startGeneration, retryGeneration: vi.fn(), clearCompletedFlow: vi.fn(),
    });
    render(<Wizard />);
    fireEvent.click(screen.getByRole('button', { name: /создать мою сказку/i }));
    await waitFor(() => expect(startGeneration).toHaveBeenCalled());
    expect(reset).not.toHaveBeenCalled();
    expect(screen.getByRole('alert')).toHaveTextContent('Не удалось запустить flow');
  });

  it('refreshes completed books and clears the placeholder only when its storyId is returned', async () => {
    const clearCompletedFlow = vi.fn();
    reload.mockResolvedValue([{ storyId: 'flow-1', title: 'Готовая книга' }]);
    useGenerationProcess.mockReturnValue({
      activeFlow: { storyId: 'flow-1', stage: 'book', status: 'success' },
      isSubmitting: false, submitError: null, hasTrackedFlow: true,
      startGeneration, retryGeneration: vi.fn(), clearCompletedFlow,
    });
    render(<Wizard />);
    await waitFor(() => expect(clearCompletedFlow).toHaveBeenCalledWith('flow-1'));
    expect(reload).toHaveBeenCalledTimes(1);
  });

  it('keeps the completed placeholder when the authoritative refresh fails', async () => {
    const clearCompletedFlow = vi.fn();
    reload.mockRejectedValue(new Error('library unavailable'));
    useGenerationProcess.mockReturnValue({
      activeFlow: { storyId: 'flow-1', stage: 'book', status: 'success' },
      isSubmitting: false, submitError: null, hasTrackedFlow: true,
      startGeneration, retryGeneration: vi.fn(), clearCompletedFlow,
    });
    render(<Wizard />);
    await waitFor(() => expect(reload).toHaveBeenCalledTimes(1));
    expect(clearCompletedFlow).not.toHaveBeenCalled();
    expect(startGeneration).not.toHaveBeenCalled();
  });
});
