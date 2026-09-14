import { act, renderHook } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import apiService from '../services/ApiService';
import { FLOW_STATUS, POLL_INTERVAL_MS, useGenerationProcess } from './useGenerationProcess';

let sessionVersion = 0;
vi.mock('../auth/AuthContext', () => ({ useAuth: () => ({ sessionVersion }) }));
vi.mock('../services/ApiService', () => ({ default: {
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
    apiService.startGenerationFlow.mockReset().mockResolvedValue(accepted());
    apiService.getGenerationFlowStatus.mockReset().mockResolvedValue(flowStatus('story'));
  });

  afterEach(() => vi.useRealTimers());

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
});
