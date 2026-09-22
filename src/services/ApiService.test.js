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

  it('checks and creates generation payments with session credentials', async () => {
    const paidStatus = { paid: true, purchaseId: 'purchase_id', paidAt: '2026-09-22T10:00:00.000Z' };
    const payment = {
      purchaseId: 'purchase_id',
      providerPaymentId: 'yookassa_payment_id',
      confirmationUrl: 'https://yoomoney.ru/checkout/payments/123',
    };
    fetch
      .mockResolvedValueOnce(jsonResponse(paidStatus))
      .mockResolvedValueOnce(jsonResponse(payment, 201));

    await expect(service.getGenerationPaymentStatus()).resolves.toEqual(paidStatus);
    await expect(service.createGenerationPayment()).resolves.toEqual(payment);

    expect(fetch).toHaveBeenNthCalledWith(1, '/api/payments/generation/status', expect.objectContaining({
      credentials: 'include', headers: { Accept: 'application/json' },
    }));
    expect(fetch).toHaveBeenNthCalledWith(2, '/api/payments/generation/create', expect.objectContaining({
      method: 'POST', credentials: 'include', headers: { Accept: 'application/json' },
    }));
    expect(fetch.mock.calls[1][1]).not.toHaveProperty('body');
  });

  it('surfaces generation payment requirements without expiring the session', async () => {
    const handler = vi.fn();
    service.setUnauthorizedHandler(handler);
    fetch.mockResolvedValue(jsonResponse({ error: 'Payment required' }, 402));

    await expect(service.startGenerationFlow({ childName: 'Миша' })).rejects.toMatchObject({
      status: 402,
      endpoint: '/generate-flow',
      message: 'Payment required',
    });
    expect(handler).not.toHaveBeenCalled();
  });

  it('starts a JSON generation flow and accepts HTTP 202', async () => {
    const response = { status: 'pending', storyId: '12-34_19-08-2026' };
    fetch.mockResolvedValue(jsonResponse(response, 202));
    await expect(service.startGenerationFlow({ childName: 'Миша', interests: ['Космос'] })).resolves.toEqual(response);
    expect(fetch).toHaveBeenCalledWith('/api/generate-flow', expect.objectContaining({
      method: 'POST',
      credentials: 'include',
      body: JSON.stringify({ childName: 'Миша', interests: ['Космос'] }),
      headers: { 'Content-Type': 'application/json' },
    }));
  });

  it('starts a multipart generation flow with the original photo', async () => {
    fetch.mockResolvedValue(jsonResponse({ status: 'pending', storyId: 'id' }, 202));
    const photo = new File(['image'], 'child.png', { type: 'image/png' });
    await service.startGenerationFlow({ childName: 'Миша' }, photo);
    const [url, options] = fetch.mock.calls[0];
    expect(url).toBe('/api/generate-flow');
    expect(options.body).toBeInstanceOf(FormData);
    expect(JSON.parse(options.body.get('formData'))).toEqual({ childName: 'Миша' });
    expect(options.body.get('childPhoto')).toBe(photo);
    expect(options.headers).toBeUndefined();
    expect(options.credentials).toBe('include');
  });

  it('loads an abortable flow status from the encoded story path', async () => {
    const response = { storyId: 'story/id', stage: 'scenes', status: 'pending' };
    fetch.mockResolvedValue(jsonResponse(response));
    const controller = new AbortController();
    await expect(service.getGenerationFlowStatus('story/id', controller.signal)).resolves.toEqual(response);
    expect(fetch).toHaveBeenCalledWith('/api/generate-flow/story%2Fid/status', expect.objectContaining({
      credentials: 'include', signal: controller.signal, headers: { Accept: 'application/json' },
    }));
  });

  it('keeps book regeneration for scene editing and canonical resource URLs', async () => {
    fetch.mockResolvedValue(jsonResponse({ success: true }));
    await service.regenerateBook('12-34_28-08-2026');
    expect(fetch).toHaveBeenCalledWith('/api/generate-book', expect.objectContaining({
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
