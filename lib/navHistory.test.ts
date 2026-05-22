import { describe, expect, it } from 'vitest';

import { areNavStatesEqual, getHashScreen, getHashUrlForScreen, getNavStateFromHashString } from './navHistory';

describe('nav history helpers', () => {
  it('serializes the Livros view into the home hash', () => {
    expect(getHashUrlForScreen('home', { collectionGroup: 'books' })).toBe('#home?collectionGroup=books');
  });

  it('serializes modal collection ids alongside the Livros hash params', () => {
    expect(getHashUrlForScreen('home', {
      collectionGroup: 'books',
      collectionId: 'mock-123',
    })).toBe('#home?collectionGroup=books&collectionId=mock-123');
  });

  it('parses the Livros home hash back into nav params', () => {
    expect(getNavStateFromHashString('#home?collectionGroup=books')).toEqual({
      currentScreen: 'home',
      params: { collectionGroup: 'books' },
    });
  });

  it('parses collection modal ids back from the home hash', () => {
    expect(getNavStateFromHashString('#home?collectionGroup=books&collectionId=mock-123')).toEqual({
      currentScreen: 'home',
      params: {
        collectionGroup: 'books',
        collectionId: 'mock-123',
      },
    });
  });

  it('keeps plain home hashes param-free', () => {
    expect(getHashScreen('#home')).toBe('home');
    expect(getNavStateFromHashString('#home')).toEqual({ currentScreen: 'home' });
  });

  it('treats home states with different collection ids as different states', () => {
    expect(areNavStatesEqual(
      { currentScreen: 'home', params: { collectionGroup: 'books' } },
      { currentScreen: 'home', params: { collectionGroup: 'books', collectionId: 'mock-123' } },
    )).toBe(false);
  });

  it('treats home states with different collection groups as different states', () => {
    expect(areNavStatesEqual(
      { currentScreen: 'home' },
      { currentScreen: 'home', params: { collectionGroup: 'books' } },
    )).toBe(false);
  });
});
