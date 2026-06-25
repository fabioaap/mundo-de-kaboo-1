import { describe, expect, it } from 'vitest';

import {
  getAccessibleNavState,
  getMenuAccessibleNavState,
  isProtectedScreen,
  MenuGateItem,
} from './navigationAccess';
import { NavState } from '../types';

const ALL_MENU: MenuGateItem[] = [
  { key: 'collections', route: 'home', order: 10 },
  { key: 'books', route: 'home', order: 20 },
  { key: 'videos', route: 'videos', order: 30 },
  { key: 'music', route: 'music', order: 40 },
];

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
    const state: NavState = { currentScreen: 'forgot_password' };

    expect(getAccessibleNavState(state, false, 'login')).toBe(state);
  });

  it('preserves protected screens for authenticated profiles', () => {
    const state: NavState = { currentScreen: 'materials' };

    expect(getAccessibleNavState(state, true, 'login')).toBe(state);
  });
});

describe('menu access guard', () => {
  it('keeps a screen whose menu is enabled', () => {
    const state: NavState = { currentScreen: 'videos' };
    expect(getMenuAccessibleNavState(state, ALL_MENU)).toBe(state);
  });

  it('leaves non-menu screens untouched even when not in the menu', () => {
    const state: NavState = { currentScreen: 'profile' };
    expect(getMenuAccessibleNavState(state, ALL_MENU)).toBe(state);
  });

  it('redirects a disabled menu screen to the first enabled item', () => {
    const menu: MenuGateItem[] = [
      { key: 'videos', route: 'videos', order: 30 },
      { key: 'music', route: 'music', order: 40 },
    ];
    expect(getMenuAccessibleNavState({ currentScreen: 'materials' }, menu)).toEqual({
      currentScreen: 'videos',
    });
  });

  it('redirects to books with collectionGroup when books is first enabled', () => {
    const menu: MenuGateItem[] = [{ key: 'books', route: 'home', order: 20 }];
    expect(getMenuAccessibleNavState({ currentScreen: 'videos' }, menu)).toEqual({
      currentScreen: 'home',
      params: { collectionGroup: 'books' },
    });
  });

  it('redirects Coleções (home/kits) away when only Livros is enabled', () => {
    const menu: MenuGateItem[] = [{ key: 'books', route: 'home', order: 20 }];
    const state: NavState = { currentScreen: 'home', params: { collectionGroup: 'kits' } };
    expect(getMenuAccessibleNavState(state, menu)).toEqual({
      currentScreen: 'home',
      params: { collectionGroup: 'books' },
    });
  });

  it('keeps Livros (home/books) when only Livros is enabled', () => {
    const menu: MenuGateItem[] = [{ key: 'books', route: 'home', order: 20 }];
    const state: NavState = { currentScreen: 'home', params: { collectionGroup: 'books' } };
    expect(getMenuAccessibleNavState(state, menu)).toBe(state);
  });

  it('keeps Coleções (home, default kits) when Coleções is enabled', () => {
    const menu: MenuGateItem[] = [{ key: 'collections', route: 'home', order: 10 }];
    const state: NavState = { currentScreen: 'home' };
    expect(getMenuAccessibleNavState(state, menu)).toBe(state);
  });
});