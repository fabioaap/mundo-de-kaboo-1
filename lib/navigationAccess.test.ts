import { describe, expect, it } from 'vitest';

import { getAccessibleNavState, isProtectedScreen } from './navigationAccess';

describe('navigation access guard', () => {
  it('marks home as a protected screen', () => {
    expect(isProtectedScreen('home')).toBe(true);
  });

  it('redirects unauthenticated protected screens to login', () => {
    expect(
      getAccessibleNavState(
        { currentScreen: 'home', params: { inlineSearch: true } },
        false,
        'login',
      ),
    ).toEqual({ currentScreen: 'login' });
  });

  it('preserves public screens without an authenticated profile', () => {
    const state = { currentScreen: 'forgot_password' };

    expect(getAccessibleNavState(state, false, 'login')).toBe(state);
  });

  it('preserves protected screens for authenticated profiles', () => {
    const state = { currentScreen: 'materials' };

    expect(getAccessibleNavState(state, true, 'login')).toBe(state);
  });
});