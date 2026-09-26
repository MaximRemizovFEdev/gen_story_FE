import React from 'react';
import { act, render, screen } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import { beforeEach, expect, it, vi } from 'vitest';
import { AppRoutes } from './App';
import { AuthProvider } from './auth/AuthContext';
import apiService from './services/ApiService';

vi.mock('./services/ApiService', () => ({ default: {
  getCurrentUser: vi.fn(), setUnauthorizedHandler: vi.fn(() => vi.fn()),
} }));

beforeEach(() => vi.spyOn(window, 'scrollTo').mockImplementation(() => {}));

it.each([401, 500])('keeps legal content visible when session bootstrap fails with %s', async status => {
  let reject;
  apiService.getCurrentUser.mockReturnValue(new Promise((_resolve, fail) => { reject = fail; }));
  render(<AuthProvider><MemoryRouter initialEntries={['/policy']}><AppRoutes /></MemoryRouter></AuthProvider>);
  expect(screen.getByRole('heading', { level: 1 })).toHaveTextContent('Политика');
  await act(async () => reject(Object.assign(new Error('session failed'), { status })));
  expect(screen.getByRole('heading', { level: 1 })).toHaveTextContent('Политика');
  expect(screen.getAllByRole('contentinfo')).toHaveLength(1);
  expect(screen.queryByRole('button', { name: /Яндекс/ })).not.toBeInTheDocument();
  expect(apiService.getCurrentUser).toHaveBeenCalled();
});
