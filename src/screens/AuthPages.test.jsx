import React from 'react';
import { render, screen, waitFor } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';
import { useAuth } from '../auth/AuthContext';
import AuthErrorPage from './AuthErrorPage';
import AuthSuccessPage from './AuthSuccessPage';

vi.mock('../auth/AuthContext', () => ({ useAuth: vi.fn() }));

describe('authentication result pages', () => {
  it('rechecks session and replaces success route with application', async () => {
    const refreshSession = vi.fn().mockResolvedValue({ phone: null });
    const replace = vi.fn();
    globalThis.__NEXT_ROUTER_MOCK__ = { replace };
    useAuth.mockReturnValue({ refreshSession });
    render(<AuthSuccessPage />);
    await waitFor(() => expect(refreshSession).toHaveBeenCalled());
    expect(replace).toHaveBeenCalledWith('/app');
  });

  it('shows a generic auth error and retry link', () => {
    render(<AuthErrorPage />);
    expect(screen.getByRole('heading', { name: /авторизация не завершена/i })).toBeInTheDocument();
    expect(screen.getByRole('link', { name: /повторить/i })).toHaveAttribute('href', '/auth');
  });
});
