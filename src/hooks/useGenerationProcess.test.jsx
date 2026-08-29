import { act, renderHook, waitFor } from '@testing-library/react';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import apiService from '../services/ApiService';
import { GENERATION_STATUS, useGenerationProcess } from './useGenerationProcess';

let sessionVersion = 0;
vi.mock('../auth/AuthContext', () => ({ useAuth: () => ({ sessionVersion }) }));
vi.mock('../services/ApiService', () => ({ default: {
  generateStory: vi.fn(), generateCover: vi.fn(), generateScenes: vi.fn(), generateBook: vi.fn(),
  getCoverUrl: vi.fn((id) => `/api/stories/${id}/cover`),
  getBookDownloadUrl: vi.fn((id) => `/api/books/${id}/download`),
} }));

const form = { childName: 'Миша', ageGroup: '5', heroType: 'Дракон', heroCustom: '', adventureGoal: 'Космос', adventureCustom: '', storyMood: 'Добрая', interests: ['Роботы'], childPhoto: null };

describe('useGenerationProcess', () => {
  beforeEach(() => {
    sessionVersion = 0;
    apiService.generateStory.mockResolvedValue({ status: 'success', storyId: '12-34_28-08-2026', owner: 'ignored' });
    apiService.generateCover.mockResolvedValue({});
    apiService.generateScenes.mockResolvedValue({});
    apiService.generateBook.mockResolvedValue({});
  });

  it('runs the sequence with a normalized storyId context', async () => {
    const { result } = renderHook(() => useGenerationProcess());
    await act(() => result.current.startGeneration(form));
    expect(result.current.status).toBe(GENERATION_STATUS.COMPLETED);
    expect(result.current.generationContext).toEqual({ storyId: '12-34_28-08-2026' });
    expect(apiService.generateCover).toHaveBeenCalledWith('12-34_28-08-2026');
    expect(apiService.generateScenes).toHaveBeenCalledWith('12-34_28-08-2026');
    expect(apiService.generateBook).toHaveBeenCalledWith('12-34_28-08-2026');
    expect(result.current.coverUrl).toBe('/api/stories/12-34_28-08-2026/cover');
    expect(result.current.pdfPath).toBe('/api/books/12-34_28-08-2026/download');
  });

  it('keeps an ordinary failed step for explicit retry', async () => {
    apiService.generateCover.mockRejectedValueOnce(new Error('cover failed'));
    const { result } = renderHook(() => useGenerationProcess());
    await act(() => result.current.startGeneration(form));
    expect(result.current.status).toBe(GENERATION_STATUS.FAILED);
    await act(() => result.current.retryFailedStep(form));
    expect(result.current.status).toBe(GENERATION_STATUS.COMPLETED);
    expect(apiService.generateStory).toHaveBeenCalledTimes(1);
  });

  it('retries story creation before a storyId exists', async () => {
    apiService.generateStory.mockRejectedValueOnce(new Error('story failed'));
    const { result } = renderHook(() => useGenerationProcess());
    await act(() => result.current.startGeneration(form));
    expect(result.current.status).toBe(GENERATION_STATUS.FAILED);
    await act(() => result.current.retryFailedStep(form));
    expect(result.current.status).toBe(GENERATION_STATUS.COMPLETED);
    expect(apiService.generateStory).toHaveBeenCalledTimes(2);
  });

  it('clears retry context on 401 and on session invalidation', async () => {
    apiService.generateCover.mockRejectedValueOnce(Object.assign(new Error('expired'), { status: 401 }));
    const { result, rerender } = renderHook(() => useGenerationProcess());
    await act(() => result.current.startGeneration(form));
    expect(result.current.status).toBe(GENERATION_STATUS.IDLE);
    expect(result.current.generationContext).toBeNull();
    sessionVersion = 1;
    rerender();
    await waitFor(() => expect(result.current.status).toBe(GENERATION_STATUS.IDLE));
  });

  it('ignores late generation responses after session invalidation', async () => {
    let resolveCover;
    apiService.generateCover.mockReturnValue(new Promise((resolve) => { resolveCover = resolve; }));
    const { result, rerender } = renderHook(() => useGenerationProcess());
    let generationPromise;
    act(() => { generationPromise = result.current.startGeneration(form); });
    await waitFor(() => expect(apiService.generateCover).toHaveBeenCalled());
    sessionVersion = 1;
    rerender();
    await act(async () => { resolveCover({}); await generationPromise; });
    expect(result.current.status).toBe(GENERATION_STATUS.IDLE);
    expect(apiService.generateScenes).not.toHaveBeenCalled();
  });
});
