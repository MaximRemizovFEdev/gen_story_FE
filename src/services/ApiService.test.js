import { beforeEach, describe, expect, it, vi } from 'vitest';
import { ApiService } from './ApiService';

const jsonResponse = (body, status = 200) => ({
  ok: status >= 200 && status < 300,
  status,
  headers: { get: () => 'application/json' },
  json: vi.fn().mockResolvedValue(body),
  text: vi.fn().mockResolvedValue(''),
});

describe('ApiService', () => {
  let service;
  beforeEach(() => {
    service = new ApiService();
    service.baseUrl = '/api';
    vi.stubGlobal('fetch', vi.fn());
  });

  it('includes credentials and reports protected 401 responses', async () => {
    const handler = vi.fn();
    service.setUnauthorizedHandler(handler);
    fetch.mockResolvedValue(jsonResponse({ error: 'AUTH_REQUIRED' }, 401));
    await expect(service.getUserBooks()).rejects.toMatchObject({ status: 401, endpoint: '/books' });
    expect(fetch).toHaveBeenCalledWith('/api/books', expect.objectContaining({ credentials: 'include' }));
    expect(handler).toHaveBeenCalledTimes(1);
  });

  it('suppresses global 401 handling for bootstrap and logout', async () => {
    const handler = vi.fn();
    service.setUnauthorizedHandler(handler);
    fetch.mockResolvedValue(jsonResponse({ error: 'AUTH_REQUIRED' }, 401));
    await expect(service.getCurrentUser()).rejects.toMatchObject({ status: 401 });
    await expect(service.logout()).rejects.toMatchObject({ status: 401 });
    expect(handler).not.toHaveBeenCalled();
  });

  it('sends questionnaire JSON without ownership identifiers', async () => {
    fetch.mockResolvedValue(jsonResponse({ status: 'success', storyId: '12-34_28-08-2026' }));
    await service.generateStory({ childName: 'Миша', interests: ['Космос'] });
    const [, options] = fetch.mock.calls[0];
    expect(JSON.parse(options.body)).toEqual({ childName: 'Миша', interests: ['Космос'] });
    expect(options.credentials).toBe('include');
  });

  it('sends multipart questionnaire and photo without ownership identifiers', async () => {
    fetch.mockResolvedValue(jsonResponse({ status: 'success', storyId: '12-34_28-08-2026' }));
    const photo = new File(['image'], 'child.png', { type: 'image/png' });
    await service.generateStory({ childName: 'Миша' }, photo);
    const [, options] = fetch.mock.calls[0];
    expect(options.body).toBeInstanceOf(FormData);
    expect(JSON.parse(options.body.get('formData'))).toEqual({ childName: 'Миша' });
    expect(options.body.get('childPhoto')).toBe(photo);
    expect(options.headers).toBeUndefined();
  });

  it('uses storyId for generation and resources', async () => {
    fetch.mockResolvedValue(jsonResponse({ success: true }));
    await service.generateCover('12-34_28-08-2026');
    expect(fetch).toHaveBeenCalledWith('/api/generate-cover', expect.objectContaining({
      body: JSON.stringify({ storyId: '12-34_28-08-2026' }), credentials: 'include',
    }));
    expect(service.getBookDownloadUrl('12-34_28-08-2026')).toBe('/api/books/12-34_28-08-2026/download');
  });

  it('uses authenticated library and scene paths', async () => {
    fetch.mockResolvedValue(jsonResponse([]));
    await service.getUserBooks();
    await service.getStoryScenes('12-34_28-08-2026');
    expect(fetch.mock.calls.map(([url]) => url)).toEqual(['/api/books', '/api/stories/12-34_28-08-2026/scenes']);
  });
});
