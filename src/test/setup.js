import '@testing-library/jest-dom/vitest';
import { afterEach, vi } from 'vitest';
import { cleanup } from '@testing-library/react';

const defaultRouter = {
  back: vi.fn(),
  forward: vi.fn(),
  prefetch: vi.fn(),
  push: vi.fn(),
  refresh: vi.fn(),
  replace: vi.fn(),
};

vi.mock('next/navigation', () => ({
  usePathname: () => window.location.pathname,
  useRouter: () => globalThis.__NEXT_ROUTER_MOCK__ || defaultRouter,
  useSearchParams: () => new URLSearchParams(window.location.search),
}));

afterEach(() => {
  cleanup();
  delete globalThis.__NEXT_ROUTER_MOCK__;
  Object.values(defaultRouter).forEach(mock => mock.mockClear());
});
