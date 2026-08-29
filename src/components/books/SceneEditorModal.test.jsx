import React from 'react';
import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import apiService from '../../services/ApiService';
import { SceneEditorModal } from './SceneEditorModal';

vi.mock('../../services/ApiService', () => ({ default: {
  getStoryScenes: vi.fn(), updateStoryScenes: vi.fn(), generateBook: vi.fn(),
} }));

const book = { storyId: '12-34_28-08-2026', title: 'Старая сказка' };
const scenes = [{ sceneId: 1, text: 'Первый текст' }, { sceneId: 2, text: 'Второй текст' }];

describe('SceneEditorModal', () => {
  beforeEach(() => {
    apiService.getStoryScenes.mockResolvedValue({ title: 'Новая сказка', scenes });
    apiService.updateStoryScenes.mockResolvedValue({ success: true, updatedScenes: 2, requiresBookRegeneration: false });
    apiService.generateBook.mockResolvedValue({});
  });

  it('loads title/scenes by storyId and submits the complete set', async () => {
    render(<SceneEditorModal book={book} onClose={vi.fn()} />);
    expect(await screen.findByText('Новая сказка')).toBeInTheDocument();
    const inputs = screen.getAllByRole('textbox');
    fireEvent.change(inputs[0], { target: { value: 'Изменённый первый текст' } });
    fireEvent.click(screen.getByRole('button', { name: /сохранить и пересобрать/i }));
    await waitFor(() => expect(apiService.updateStoryScenes).toHaveBeenCalledWith(book.storyId, [
      { sceneId: 1, text: 'Изменённый первый текст' }, { sceneId: 2, text: 'Второй текст' },
    ]));
    expect(apiService.generateBook).not.toHaveBeenCalled();
  });

  it('reports a story 404 without opening a usable editor', async () => {
    apiService.getStoryScenes.mockRejectedValue(Object.assign(new Error('Сказка не найдена'), { status: 404 }));
    render(<SceneEditorModal book={book} onClose={vi.fn()} />);
    expect(await screen.findByText('Сказка не найдена')).toBeInTheDocument();
    expect(screen.queryByRole('button', { name: /сохранить и пересобрать/i })).not.toBeInTheDocument();
  });

  it('prevents empty scene submission', async () => {
    render(<SceneEditorModal book={book} onClose={vi.fn()} />);
    const inputs = await screen.findAllByRole('textbox');
    fireEvent.change(inputs[0], { target: { value: '   ' } });
    expect(screen.getByRole('button', { name: /сохранить и пересобрать/i })).toBeDisabled();
  });

  it('prevents scene text longer than 1500 characters', async () => {
    render(<SceneEditorModal book={book} onClose={vi.fn()} />);
    const inputs = await screen.findAllByRole('textbox');
    fireEvent.change(inputs[0], { target: { value: 'а'.repeat(1501) } });
    expect(screen.getByRole('button', { name: /сохранить и пересобрать/i })).toBeDisabled();
  });

  it('regenerates the book only when requested by backend', async () => {
    apiService.updateStoryScenes.mockResolvedValue({ success: true, updatedScenes: 2, requiresBookRegeneration: true });
    render(<SceneEditorModal book={book} onClose={vi.fn()} />);
    await screen.findByText('Новая сказка');
    fireEvent.click(screen.getByRole('button', { name: /сохранить и пересобрать/i }));
    await waitFor(() => expect(apiService.generateBook).toHaveBeenCalledWith(book.storyId));
  });

  it('reports rebuild failure after scenes were saved', async () => {
    apiService.updateStoryScenes.mockResolvedValue({ success: true, updatedScenes: 2, requiresBookRegeneration: true });
    apiService.generateBook.mockRejectedValue(new Error('PDF failed'));
    render(<SceneEditorModal book={book} onClose={vi.fn()} />);
    await screen.findByText('Новая сказка');
    fireEvent.click(screen.getByRole('button', { name: /сохранить и пересобрать/i }));
    expect(await screen.findByText(/тексты сцен сохранены, но книгу не удалось/i)).toBeInTheDocument();
  });
});
