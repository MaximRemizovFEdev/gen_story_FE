import { act, renderHook, waitFor } from '@testing-library/react';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import apiService from '../services/ApiService';
import { useUserBooks } from './useUserBooks';

vi.mock('../services/ApiService', () => ({ default: { getUserBooks: vi.fn() } }));

describe('useUserBooks', () => {
  beforeEach(() => apiService.getUserBooks.mockResolvedValue([]));

  it('loads the authenticated library without an owner argument', async () => {
    const books = [{ storyId: '12-34_28-08-2026' }];
    apiService.getUserBooks.mockResolvedValue(books);
    const { result } = renderHook(() => useUserBooks(true));
    await waitFor(() => expect(result.current.books).toEqual(books));
    expect(apiService.getUserBooks).toHaveBeenCalledWith(expect.any(AbortSignal));
  });

  it('accepts an empty library as a successful result', async () => {
    const { result } = renderHook(() => useUserBooks(true));
    await waitFor(() => expect(result.current.isLoading).toBe(false));
    expect(result.current.books).toEqual([]);
    expect(result.current.error).toBeNull();
  });

  it('clears books and aborts when disabled', async () => {
    let signal;
    apiService.getUserBooks.mockImplementation((value) => { signal = value; return Promise.resolve([{ storyId: 'id' }]); });
    const { result, rerender } = renderHook(({ enabled }) => useUserBooks(enabled), { initialProps: { enabled: true } });
    await waitFor(() => expect(result.current.books).toHaveLength(1));
    act(() => rerender({ enabled: false }));
    expect(signal.aborted).toBe(true);
    expect(result.current.books).toEqual([]);
  });
});
