import React from 'react';
import { act, render, screen, waitFor } from '@testing-library/react';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import apiService from '../services/ApiService';
import { AuthProvider, useAuth } from './AuthContext';

vi.mock('../services/ApiService', () => ({ default: {
  getCurrentUser: vi.fn(), devLogin: vi.fn(), logout: vi.fn(), setUnauthorizedHandler: vi.fn(),
} }));

function Probe() {
  const auth = useAuth();
  return <div><span>{auth.status}</span><span>{auth.user?.phone ?? 'no-phone'}</span><span>{auth.sessionVersion}</span><button onClick={() => auth.logout()}>logout</button></div>;
}

describe('AuthProvider', () => {
  let unauthorized;
  beforeEach(() => {
    unauthorized = null;
    apiService.setUnauthorizedHandler.mockImplementation((handler) => { unauthorized = handler; return vi.fn(); });
  });

  it('keeps checking until bootstrap resolves', async () => {
    let resolve;
    apiService.getCurrentUser.mockReturnValue(new Promise((done) => { resolve = done; }));
    render(<AuthProvider><Probe /></AuthProvider>);
    expect(screen.getByText('checking')).toBeInTheDocument();
    await act(() => resolve({ authenticated: true, phone: null }));
    expect(await screen.findByText('authenticated')).toBeInTheDocument();
  });

  it('restores only the safe profile', async () => {
    apiService.getCurrentUser.mockResolvedValue({ authenticated: true, phone: '+79991234567', uuid: 'hidden' });
    render(<AuthProvider><Probe /></AuthProvider>);
    expect(await screen.findByText('+79991234567')).toBeInTheDocument();
  });

  it('treats bootstrap 401 as anonymous', async () => {
    apiService.getCurrentUser.mockRejectedValue(Object.assign(new Error('unauthorized'), { status: 401 }));
    render(<AuthProvider><Probe /></AuthProvider>);
    expect(await screen.findByText('anonymous')).toBeInTheDocument();
  });

  it('invalidates an authenticated session idempotently', async () => {
    apiService.getCurrentUser.mockResolvedValue({ authenticated: true, phone: null });
    render(<AuthProvider><Probe /></AuthProvider>);
    await screen.findByText('authenticated');
    act(() => { unauthorized(); unauthorized(); });
    await waitFor(() => expect(screen.getByText('anonymous')).toBeInTheDocument());
    expect(screen.getByText('1')).toBeInTheDocument();
  });

  it.each([204, 401])('finishes local logout for server status %s', async (serverStatus) => {
    apiService.getCurrentUser.mockResolvedValue({ authenticated: true, phone: null });
    if (serverStatus === 204) apiService.logout.mockResolvedValue(null);
    else apiService.logout.mockRejectedValue(Object.assign(new Error('expired'), { status: 401 }));
    render(<AuthProvider><Probe /></AuthProvider>);
    await screen.findByText('authenticated');
    await act(() => screen.getByRole('button', { name: 'logout' }).click());
    expect(await screen.findByText('anonymous')).toBeInTheDocument();
  });
});
