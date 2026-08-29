import React from 'react';
import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import apiService from '../../services/ApiService';
import { UserBooks } from './UserBooks';

vi.mock('../../services/ApiService', () => ({ default: {
  getCoverUrl: vi.fn((id) => `/api/stories/${id}/cover`),
  getBookDownloadUrl: vi.fn((id) => `/api/books/${id}/download`),
  downloadBook: vi.fn(),
} }));

const book = { storyId: '12-34_28-08-2026', title: 'Сказка', generatedAt: '2026-08-28T12:34:00' };

describe('UserBooks', () => {
  beforeEach(() => {
    apiService.downloadBook.mockResolvedValue(new Blob(['pdf']));
    URL.createObjectURL = vi.fn(() => 'blob:book');
    URL.revokeObjectURL = vi.fn();
    vi.spyOn(HTMLAnchorElement.prototype, 'click').mockImplementation(() => undefined);
  });

  it('renders canonical story-scoped resources', () => {
    render(<UserBooks books={[book]} isLoading={false} error={null} />);
    expect(screen.getByRole('img')).toHaveAttribute('src', '/api/stories/12-34_28-08-2026/cover');
    expect(screen.getByRole('link', { name: /скачать/i })).toHaveAttribute('href', '/api/books/12-34_28-08-2026/download');
  });

  it('reports a missing book without expiring auth', async () => {
    apiService.downloadBook.mockRejectedValue(Object.assign(new Error('missing'), { status: 404 }));
    render(<UserBooks books={[book]} isLoading={false} error={null} />);
    fireEvent.click(screen.getByRole('link', { name: /скачать/i }));
    expect(await screen.findByRole('alert')).toHaveTextContent('Запрошенная книга недоступна');
  });

  it('does not turn 401 into a local file error', async () => {
    apiService.downloadBook.mockRejectedValue(Object.assign(new Error('expired'), { status: 401 }));
    render(<UserBooks books={[book]} isLoading={false} error={null} />);
    fireEvent.click(screen.getByRole('link', { name: /скачать/i }));
    await waitFor(() => expect(apiService.downloadBook).toHaveBeenCalled());
    expect(screen.queryByRole('alert')).not.toBeInTheDocument();
  });
});
