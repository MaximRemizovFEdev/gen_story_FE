import React from 'react';
import { act, fireEvent, render, screen, within } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { useAuth } from './auth/AuthContext';
import { AppRoutes } from './App';
import privacy from './layerDocs/privacy.md?raw';
import policy from './layerDocs/policy.md?raw';
import oferta from './layerDocs/oferta.md?raw';

vi.mock('./auth/AuthContext', () => ({
  AUTH_STATUS: { CHECKING: 'checking', AUTHENTICATED: 'authenticated', ANONYMOUS: 'anonymous' },
  AuthProvider: ({ children }) => children,
  useAuth: vi.fn(),
}));
vi.mock('./pages/HomePage', () => ({ default: () => <p>protected application</p> }));

function open(path) {
  return render(<MemoryRouter initialEntries={[path]}><AppRoutes /></MemoryRouter>);
}
function checkFooter() {
  expect(screen.getAllByRole('contentinfo')).toHaveLength(1);
  const footer = within(screen.getByRole('contentinfo'));
  expect(footer.getByText(/623009423005/)).toBeInTheDocument();
  expect(footer.getByText('Ремизов Максим Сергеевич')).toBeInTheDocument();
  expect(footer.getByRole('link', { name: 'webreznov@mail.ru' })).toHaveAttribute('href', 'mailto:webreznov@mail.ru');
  expect(footer.getByRole('link', { name: '8 910 562-97-08' })).toHaveAttribute('href', 'tel:+79105629708');
  expect(footer.getAllByRole('link').map(link => link.getAttribute('href'))).toEqual(expect.arrayContaining(['/privacy', '/policy', '/oferta']));
}

beforeEach(() => {
  vi.spyOn(window, 'scrollTo').mockImplementation(() => {});
  useAuth.mockReturnValue({ status: 'anonymous' });
});

describe('public and protected routes', () => {
  it.each(['checking', 'anonymous', 'authenticated'])('keeps the storefront public for %s', status => {
    useAuth.mockReturnValue({ status });
    open('/');
    expect(screen.getByRole('heading', { level: 1 })).toHaveTextContent('Сказка');
    expect(screen.getByText(/199 ₽/, { selector: '.landing-price' })).toBeInTheDocument();
    expect(screen.getByText(/Заполните 7 вопросов/)).toBeInTheDocument();
    expect(screen.queryByText('protected application')).not.toBeInTheDocument();
    checkFooter();
  });
  it.each([['privacy', privacy], ['policy', policy], ['oferta', oferta]])('renders the full %s document while session is pending', (path, source) => {
    useAuth.mockReturnValue({ status: 'checking' });
    open('/' + path);
    const article = screen.getByRole('article');
    for (const line of source.split(/\r?\n/).filter(line => line.trim())) expect(article).toHaveTextContent(line);
    checkFooter();
  });
  it('links the policy to its correct route', () => {
    open('/policy');
    expect(within(screen.getByRole('article')).getByRole('link', { name: 'https://aidaskazka.ru/policy' })).toHaveAttribute('href', '/policy');
  });
  it('navigates from the offer to login without exposing protected content', () => {
    open('/');
    fireEvent.click(screen.getAllByRole('link', { name: 'Войти и создать сказку' })[0]);
    expect(screen.getByRole('button', { name: /Яндекс/ })).toBeInTheDocument();
    expect(screen.queryByRole('checkbox')).not.toBeInTheDocument();
    checkFooter();
  });
  it.each(['anonymous', 'authenticated'])('shows 404 for an unknown route as %s', status => {
    useAuth.mockReturnValue({ status });
    open('/missing');
    expect(screen.getByRole('heading', { name: 'Страница не найдена' })).toBeInTheDocument();
    checkFooter();
  });
  it('protects the application while checking and sends guests to login', () => {
    useAuth.mockReturnValue({ status: 'checking' });
    const view = open('/app');
    expect(screen.getByText(/Проверяем сессию/)).toBeInTheDocument();
    checkFooter();
    useAuth.mockReturnValue({ status: 'anonymous' });
    view.rerender(<MemoryRouter initialEntries={['/app']}><AppRoutes /></MemoryRouter>);
    expect(screen.getByRole('button', { name: /Яндекс/ })).toBeInTheDocument();
    expect(screen.queryByText('protected application')).not.toBeInTheDocument();
  });
  it('redirects authenticated login to the application and removes access on session loss', () => {
    useAuth.mockReturnValue({ status: 'authenticated' });
    const view = open('/auth');
    expect(screen.getByText('protected application')).toBeInTheDocument();
    checkFooter();
    useAuth.mockReturnValue({ status: 'anonymous' });
    view.rerender(<MemoryRouter initialEntries={['/auth']}><AppRoutes /></MemoryRouter>);
    expect(screen.queryByText('protected application')).not.toBeInTheDocument();
    expect(screen.getByRole('button', { name: /Яндекс/ })).toBeInTheDocument();
  });
  it('keeps the footer during callback verification and after a missing session', async () => {
    let resolve;
    useAuth.mockReturnValue({ status: 'checking', refreshSession: () => new Promise(done => { resolve = done; }) });
    open('/auth/success');
    checkFooter();
    await act(async () => resolve(null));
    expect(screen.getByRole('button', { name: /Яндекс/ })).toBeInTheDocument();
    checkFooter();
  });
  it('shows footer on authentication errors', () => { open('/auth/error'); checkFooter(); });
  it('shows a read-only payment return page without opening the protected app', () => {
    open('/payment-return');
    expect(screen.getByRole('heading', { name: 'Ищем операцию' })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Обновить статус' })).toBeDisabled();
    expect(screen.getByRole('link', { name: 'В библиотеку' })).toHaveAttribute('href', '/app');
    expect(screen.queryByText('protected application')).not.toBeInTheDocument();
    checkFooter();
  });
});
