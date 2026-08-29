import React from 'react';
import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { useAuth } from '../auth/AuthContext';
import LoginPage from './LoginPage';

vi.mock('../auth/AuthContext', () => ({ useAuth: vi.fn() }));

describe('LoginPage', () => {
  const devLogin = vi.fn();
  beforeEach(() => useAuth.mockReturnValue({ devLogin }));

  it('starts Yandex using full-page navigation callback', () => {
    const navigate = vi.fn();
    render(<LoginPage showDevLogin={false} navigateToYandex={navigate} />);
    fireEvent.click(screen.getByRole('button', { name: /яндекс/i }));
    expect(navigate).toHaveBeenCalledOnce();
  });

  it('omits dev login when the build gate is disabled', () => {
    render(<LoginPage showDevLogin={false} />);
    expect(screen.queryByRole('button', { name: /тестовый/i })).not.toBeInTheDocument();
  });

  it('refreshes auth through devLogin and reports backend 404', async () => {
    devLogin.mockRejectedValue(Object.assign(new Error('missing'), { status: 404 }));
    render(<LoginPage showDevLogin />);
    fireEvent.click(screen.getByRole('button', { name: /тестовый/i }));
    await waitFor(() => expect(devLogin).toHaveBeenCalled());
    expect(await screen.findByRole('alert')).toHaveTextContent('отключён');
  });

  it('completes development login successfully', async () => {
    devLogin.mockResolvedValue({ phone: null });
    render(<LoginPage showDevLogin />);
    fireEvent.click(screen.getByRole('button', { name: /тестовый/i }));
    await waitFor(() => expect(devLogin).toHaveBeenCalled());
    expect(screen.queryByRole('alert')).not.toBeInTheDocument();
  });
});
