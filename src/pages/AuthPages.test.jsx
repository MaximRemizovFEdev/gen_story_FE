import React from 'react';
import { render, screen, waitFor } from '@testing-library/react';
import { MemoryRouter, Route, Routes } from 'react-router-dom';
import { describe, expect, it, vi } from 'vitest';
import { useAuth } from '../auth/AuthContext';
import AuthErrorPage from './AuthErrorPage';
import AuthSuccessPage from './AuthSuccessPage';

vi.mock('../auth/AuthContext', () => ({ useAuth: vi.fn() }));

describe('authentication result pages', () => {
  it('rechecks session and replaces success route with application', async () => {
    const refreshSession = vi.fn().mockResolvedValue({ phone: null });
    useAuth.mockReturnValue({ refreshSession });
    render(<MemoryRouter initialEntries={['/auth/success']}><Routes>
      <Route path="/auth/success" element={<AuthSuccessPage />} />
      <Route path="/app" element={<p>root page</p>} />
    </Routes></MemoryRouter>);
    await waitFor(() => expect(refreshSession).toHaveBeenCalled());
    expect(await screen.findByText('root page')).toBeInTheDocument();
  });

  it('shows a generic auth error and retry link', () => {
    render(<MemoryRouter><AuthErrorPage /></MemoryRouter>);
    expect(screen.getByRole('heading', { name: /авторизация не завершена/i })).toBeInTheDocument();
    expect(screen.getByRole('link', { name: /повторить/i })).toHaveAttribute('href', '/auth');
  });
});
