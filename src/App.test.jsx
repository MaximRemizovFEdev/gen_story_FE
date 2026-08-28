import React from 'react';
import { render, screen } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';
import { useAuth } from './auth/AuthContext';
import { RootRoute } from './App';

vi.mock('./auth/AuthContext', () => ({
  AUTH_STATUS: { CHECKING: 'checking', AUTHENTICATED: 'authenticated', ANONYMOUS: 'anonymous' },
  AuthProvider: ({ children }) => children,
  useAuth: vi.fn(),
}));
vi.mock('./pages/HomePage', () => ({ default: () => <p>protected application</p> }));
vi.mock('./pages/LoginPage', () => ({ default: () => <p>login page</p> }));

describe('RootRoute', () => {
  it('does not expose protected content while checking', () => {
    useAuth.mockReturnValue({ status: 'checking' });
    render(<RootRoute />);
    expect(screen.getByText(/проверяем сессию/i)).toBeInTheDocument();
    expect(screen.queryByText('protected application')).not.toBeInTheDocument();
  });

  it('shows login to anonymous users', () => {
    useAuth.mockReturnValue({ status: 'anonymous' });
    render(<RootRoute />);
    expect(screen.getByText('login page')).toBeInTheDocument();
  });

  it('shows protected application only to authenticated users', () => {
    useAuth.mockReturnValue({ status: 'authenticated' });
    render(<RootRoute />);
    expect(screen.getByText('protected application')).toBeInTheDocument();
  });
});
