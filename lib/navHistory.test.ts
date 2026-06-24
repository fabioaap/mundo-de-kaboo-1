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

  it('parses legacy Livros hashes with slash paths back into nav params', () => {
    expect(getHashScreen('#home/livros')).toBe('home');
    expect(getNavStateFromHashString('#home/livros')).toEqual({
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

  it('round-trips the drill-down modal stack through the home hash', () => {
    const url = getHashUrlForScreen('home', { collectionId: 'kit-1', modalStackIds: ['kit-1', 'book-1'] });
    expect(url).toBe('#home?collectionId=kit-1&modalStack=kit-1%2Cbook-1');
    expect(getNavStateFromHashString(url)).toEqual({
      currentScreen: 'home',
      params: { collectionId: 'kit-1', modalStackIds: ['kit-1', 'book-1'] },
    });
  });

  it('ignores a single-entry modal stack (no drill-down to restore)', () => {
    expect(getHashUrlForScreen('home', { collectionId: 'kit-1', modalStackIds: ['kit-1'] }))
      .toBe('#home?collectionId=kit-1');
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
