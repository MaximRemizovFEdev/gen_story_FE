import { beforeEach, afterEach, describe, expect, it, vi } from 'vitest';
import { act, renderHook } from '@testing-library/react';
import { useWizardForm } from '../hooks/useWizardForm';
import {
  finishAuthAnalytics,
  reachGoalOnce,
  startAuthAnalytics,
  trackPage,
} from './analytics';

beforeEach(() => {
  localStorage.clear();
  sessionStorage.clear();
  window.ym = vi.fn();
});
afterEach(() => {
  delete window.ym;
  vi.restoreAllMocks();
});

describe('Metrica privacy and deduplication', () => {
  it('counts a confirmed authentication attempt once', () => {
    startAuthAnalytics();
    finishAuthAnalytics();
    finishAuthAnalytics();
    expect(window.ym.mock.calls).toEqual([
      [113444344, 'reachGoal', 'auth_success'],
    ]);
  });

  it('keeps operation IDs local and survives module reload', async () => {
    reachGoalOnce('payment_success', 'private-draft');
    reachGoalOnce('payment_success', 'private-draft');
    vi.resetModules();
    const reloaded = await import('./analytics');
    reloaded.reachGoalOnce('payment_success', 'private-draft');
    expect(window.ym.mock.calls).toEqual([[113444344, 'reachGoal', 'payment_success']]);
    reloaded.reachGoalOnce('payment_success', 'another-draft');
    expect(window.ym).toHaveBeenCalledTimes(2);
  });

  it('counts route changes once and redacts unknown paths and referrers', () => {
    window.history.replaceState({}, '', '/app?token=secret#child');
    trackPage('/app');
    trackPage('/app');
    trackPage('/child/private-name');
    trackPage('/app');
    expect(window.ym).toHaveBeenCalledTimes(3);
    expect(window.ym.mock.calls[1][2]).toBe(window.location.origin + '/404');
    expect(JSON.stringify(window.ym.mock.calls)).not.toMatch(/secret|private-name|child/);
    window.history.replaceState({}, '', '/');
  });

  it('counts first actual form change once across remounts; reset starts a new attempt', () => {
    const first = renderHook(() => useWizardForm());
    expect(window.ym).not.toHaveBeenCalled();
    act(() => first.result.current.handleChange({ target: { name: 'childName', value: 'Private' } }));
    first.unmount();
    const second = renderHook(() => useWizardForm());
    act(() => second.result.current.handleChange({ target: { name: 'childName', value: 'Private again' } }));
    expect(window.ym).toHaveBeenCalledTimes(1);
    act(() => second.result.current.reset());
    act(() => second.result.current.handleChange({ target: { name: 'childName', value: 'New' } }));
    expect(window.ym.mock.calls).toEqual([
      [113444344, 'reachGoal', 'wizard_start'],
      [113444344, 'reachGoal', 'wizard_start'],
    ]);
  });

  it('isolates missing or throwing counter and inaccessible storage', () => {
    delete window.ym;
    expect(() => reachGoalOnce('payment_start', '1')).not.toThrow();
    window.ym = vi.fn(() => { throw Error('blocked'); });
    expect(() => reachGoalOnce('payment_start', '1')).not.toThrow();
    reachGoalOnce('payment_start', '1');
    expect(window.ym).toHaveBeenCalledTimes(1);
    vi.spyOn(Storage.prototype, 'setItem').mockImplementation(() => { throw Error('denied'); });
    expect(() => reachGoalOnce('payment_start', '2')).not.toThrow();
    expect(window.ym).toHaveBeenCalledTimes(1);
  });
});
