import { act, renderHook } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import apiService from '../services/ApiService';
import { FLOW_STATUS, PAYMENT_POLL_INTERVAL_MS, PAYMENT_STATE, POLL_INTERVAL_MS, useGenerationProcess } from './useGenerationProcess';

let sessionVersion = 0;
vi.mock('../auth/AuthContext', () => ({ useAuth: () => ({ sessionVersion }) }));
vi.mock('../services/ApiService', () => ({ default: {
  getGenerationPaymentStatus: vi.fn(),
  createGenerationPayment: vi.fn(),
  startGenerationFlow: vi.fn(),
  getGenerationFlowStatus: vi.fn(),
} }));

const form = {
  childName: 'Миша', ageGroup: '5', heroType: 'Дракон', heroCustom: '',
  adventureGoal: 'Космос', adventureCustom: '', storyMood: 'Добрая',
  interests: ['Роботы'], childPhoto: null,
};

const accepted = (storyId = 'flow-1') => ({ status: 'pending', storyId });
const flowStatus = (stage, status = 'pending', storyId = 'flow-1') => ({ storyId, stage, status });

describe('useGenerationProcess', () => {
  beforeEach(() => {
    vi.useFakeTimers();
    sessionVersion = 0;
    vi.stubGlobal('open', vi.fn(() => ({})));
    apiService.getGenerationPaymentStatus.mockReset().mockResolvedValue({ paid: true, purchaseId: 'paid-1' });
    apiService.createGenerationPayment.mockReset().mockResolvedValue({
      purchaseId: 'purchase-1',
      providerPaymentId: 'provider-1',
      confirmationUrl: 'https://yoomoney.ru/checkout/payments/1',
    });
    apiService.startGenerationFlow.mockReset().mockResolvedValue(accepted());
    apiService.getGenerationFlowStatus.mockReset().mockResolvedValue(flowStatus('story'));
  });

  afterEach(() => {
    vi.unstubAllGlobals();
    vi.useRealTimers();
  });

  it('accepts one flow, retains its submission, and rejects a duplicate start', async () => {
    const { result } = renderHook(() => useGenerationProcess());
    await act(async () => { await result.current.startGeneration(form); });
    expect(result.current.activeFlow).toMatchObject({ storyId: 'flow-1', stage: 'story', status: 'pending' });
    expect(result.current.activeFlow.submission.questionnaire).not.toHaveProperty('phone');
    await act(async () => { await result.current.startGeneration({ ...form, childName: 'Другой' }); });
    expect(apiService.startGenerationFlow).toHaveBeenCalledTimes(1);
  });

  it('keeps the form outside the hook when initial submission fails', async () => {
    apiService.startGenerationFlow.mockRejectedValueOnce(new Error('flow failed'));
    const { result } = renderHook(() => useGenerationProcess());
    await act(async () => { await expect(result.current.startGeneration(form)).rejects.toThrow('flow failed'); });
    expect(result.current.activeFlow).toBeNull();
    expect(result.current.submitError).toBe('flow failed');
  });

  it('uses an existing paid entitlement without creating a payment', async () => {
    const { result } = renderHook(() => useGenerationProcess());
    await act(async () => { await result.current.startGeneration(form); });
    expect(apiService.getGenerationPaymentStatus).toHaveBeenCalledTimes(1);
    expect(apiService.createGenerationPayment).not.toHaveBeenCalled();
    expect(apiService.startGenerationFlow).toHaveBeenCalledTimes(1);
  });

  it('keeps the selected photo while waiting for payment confirmation', async () => {
    const photo = new File(['image'], 'child.png', { type: 'image/png' });
    apiService.getGenerationPaymentStatus
      .mockResolvedValueOnce({ paid: false })
      .mockResolvedValueOnce({ paid: false })
      .mockResolvedValueOnce({ paid: true, purchaseId: 'purchase-1' });
    const { result } = renderHook(() => useGenerationProcess());

    let submission;
    await act(async () => {
      submission = result.current.startGeneration({ ...form, childPhoto: photo });
      await Promise.resolve();
    });

    expect(result.current.paymentState).toBe(PAYMENT_STATE.WAITING);
    expect(result.current.paymentConfirmationUrl).toBe('https://yoomoney.ru/checkout/payments/1');
    expect(apiService.startGenerationFlow).not.toHaveBeenCalled();
    expect(window.open).toHaveBeenCalledWith('https://yoomoney.ru/checkout/payments/1', '_blank', 'noopener,noreferrer');

    await act(async () => { await vi.advanceTimersByTimeAsync(PAYMENT_POLL_INTERVAL_MS); });
    expect(apiService.startGenerationFlow).not.toHaveBeenCalled();
    await act(async () => { await vi.advanceTimersByTimeAsync(PAYMENT_POLL_INTERVAL_MS); });
    await act(async () => { await submission; });

    expect(apiService.startGenerationFlow).toHaveBeenCalledWith(expect.any(Object), photo);
    expect(result.current.activeFlow).toMatchObject({ storyId: 'flow-1', status: 'pending' });
  });

  it('exposes a blocked payment window for a manual reopen without losing submission', async () => {
    window.open.mockReturnValueOnce(null).mockReturnValueOnce({});
    apiService.getGenerationPaymentStatus
      .mockResolvedValueOnce({ paid: false })
      .mockResolvedValueOnce({ paid: true, purchaseId: 'purchase-1' });
    const { result } = renderHook(() => useGenerationProcess());

    let submission;
    await act(async () => {
      submission = result.current.startGeneration(form);
      await Promise.resolve();
    });

    expect(result.current.paymentState).toBe(PAYMENT_STATE.OPEN_BLOCKED);
    expect(result.current.reopenPayment()).toBe(true);
    expect(window.open).toHaveBeenCalledTimes(2);
    await act(async () => { await vi.advanceTimersByTimeAsync(PAYMENT_POLL_INTERVAL_MS); });
    await act(async () => { await submission; });
    expect(apiService.startGenerationFlow).toHaveBeenCalledTimes(1);
  });

  it('returns to payment preflight after a 402 without clearing the submission', async () => {
    apiService.startGenerationFlow
      .mockRejectedValueOnce(Object.assign(new Error('Payment required'), { status: 402 }))
      .mockResolvedValueOnce(accepted('flow-after-payment'));
    apiService.getGenerationPaymentStatus
      .mockResolvedValueOnce({ paid: true, purchaseId: 'old-paid' })
      .mockResolvedValueOnce({ paid: true, purchaseId: 'new-paid' });
    const { result } = renderHook(() => useGenerationProcess());

    await act(async () => { await result.current.startGeneration(form); });

    expect(apiService.getGenerationPaymentStatus).toHaveBeenCalledTimes(2);
    expect(apiService.startGenerationFlow).toHaveBeenCalledTimes(2);
    expect(result.current.activeFlow).toMatchObject({ storyId: 'flow-after-payment', status: 'pending' });
  });

  it('polls immediately, then ten seconds after each settled nonterminal response', async () => {
    apiService.getGenerationFlowStatus
      .mockResolvedValueOnce(flowStatus('story', 'pending'))
      .mockResolvedValueOnce(flowStatus('cover', 'success'))
      .mockResolvedValueOnce(flowStatus('scenes', 'pending'));
    const { result } = renderHook(() => useGenerationProcess());
    await act(async () => { await result.current.startGeneration(form); });
    await act(async () => { await Promise.resolve(); });
    expect(apiService.getGenerationFlowStatus).toHaveBeenCalledTimes(1);
    await act(async () => { await vi.advanceTimersByTimeAsync(POLL_INTERVAL_MS); });
    expect(apiService.getGenerationFlowStatus).toHaveBeenCalledTimes(2);
    expect(result.current.activeFlow).toMatchObject({ stage: 'cover', status: 'success' });
    await act(async () => { await vi.advanceTimersByTimeAsync(POLL_INTERVAL_MS); });
    expect(apiService.getGenerationFlowStatus).toHaveBeenCalledTimes(3);
  });

  it('does not overlap a slow status request and aborts polling on unmount', async () => {
    let resolveStatus;
    apiService.getGenerationFlowStatus.mockImplementation((_id, signal) => new Promise((resolve) => {
      resolveStatus = resolve;
      expect(signal).toBeInstanceOf(AbortSignal);
    }));
    const { result, unmount } = renderHook(() => useGenerationProcess());
    await act(async () => { await result.current.startGeneration(form); });
    await act(async () => { await vi.advanceTimersByTimeAsync(POLL_INTERVAL_MS * 2); });
    expect(apiService.getGenerationFlowStatus).toHaveBeenCalledTimes(1);
    const signal = apiService.getGenerationFlowStatus.mock.calls[0][1];
    unmount();
    expect(signal.aborted).toBe(true);
    resolveStatus(flowStatus('story'));
  });

  it('continues after a transient failure and stops only at book success', async () => {
    apiService.getGenerationFlowStatus
      .mockRejectedValueOnce(new Error('temporary'))
      .mockResolvedValueOnce(flowStatus('book', 'success'));
    const { result } = renderHook(() => useGenerationProcess());
    await act(async () => { await result.current.startGeneration(form); await Promise.resolve(); });
    expect(result.current.activeFlow.status).toBe(FLOW_STATUS.PENDING);
    await act(async () => { await vi.advanceTimersByTimeAsync(POLL_INTERVAL_MS); });
    expect(result.current.activeFlow).toMatchObject({ stage: 'book', status: 'success' });
    await act(async () => { await vi.advanceTimersByTimeAsync(POLL_INTERVAL_MS * 2); });
    expect(apiService.getGenerationFlowStatus).toHaveBeenCalledTimes(2);
  });

  it('stops on explicit error and retries the whole flow with a new storyId', async () => {
    apiService.getGenerationFlowStatus.mockResolvedValueOnce(flowStatus('scenes', 'error'));
    const { result } = renderHook(() => useGenerationProcess());
    await act(async () => { await result.current.startGeneration(form); await Promise.resolve(); });
    expect(result.current.activeFlow).toMatchObject({ stage: 'scenes', status: 'error' });
    apiService.startGenerationFlow.mockResolvedValueOnce(accepted('flow-2'));
    await act(async () => { await result.current.retryGeneration(); });
    expect(result.current.activeFlow).toMatchObject({ storyId: 'flow-2', status: 'pending' });
    expect(apiService.startGenerationFlow).toHaveBeenCalledTimes(2);
  });

  it('clears tracked data on a 401 and on a session change', async () => {
    apiService.getGenerationFlowStatus.mockRejectedValueOnce(Object.assign(new Error('expired'), { status: 401 }));
    const { result, rerender } = renderHook(() => useGenerationProcess());
    await act(async () => { await result.current.startGeneration(form); await Promise.resolve(); });
    expect(result.current.activeFlow).toBeNull();

    apiService.getGenerationFlowStatus.mockResolvedValue(flowStatus('story'));
    await act(async () => { await result.current.startGeneration(form); });
    sessionVersion = 1;
    rerender();
    await act(async () => { await Promise.resolve(); });
    expect(result.current.activeFlow).toBeNull();
  });

  it('clears payment waiting on a 401 and on a session change', async () => {
    apiService.getGenerationPaymentStatus.mockRejectedValueOnce(Object.assign(new Error('expired'), { status: 401 }));
    const { result, rerender } = renderHook(() => useGenerationProcess());
    await act(async () => { await expect(result.current.startGeneration(form)).rejects.toMatchObject({ status: 401 }); });
    expect(result.current.paymentState).toBe(PAYMENT_STATE.IDLE);

    apiService.getGenerationPaymentStatus
      .mockResolvedValueOnce({ paid: false })
      .mockResolvedValue({ paid: false });
    let submission;
    await act(async () => {
      submission = result.current.startGeneration(form).catch(() => null);
      await Promise.resolve();
    });
    expect(result.current.paymentState).toBe(PAYMENT_STATE.WAITING);
    sessionVersion = 1;
    rerender();
    await act(async () => { await Promise.resolve(); });
    expect(result.current.paymentState).toBe(PAYMENT_STATE.IDLE);
    await act(async () => { await vi.advanceTimersByTimeAsync(PAYMENT_POLL_INTERVAL_MS); });
    await act(async () => { await submission; });
  });
});
