import { describe, expect, it } from 'vitest';

import {
  getCollectionDisplayCover,
  getCollectionFormatKinds,
  getCollectionTypeMeta,
  getKitLinkedBookCount,
  getVisiblePrimaryCollectionAssets,
  normalizeSingleKitBookIds,
  shouldShowKitLinkedBooksPanel,
} from './collectionPresentation';

describe('normalizeSingleKitBookIds', () => {
  it('keeps only the first non-empty unique linked book id', () => {
    expect(normalizeSingleKitBookIds([' first-book ', 'second-book', 'first-book'])).toEqual(['first-book']);
  });

  it('returns an empty array when the input is empty or invalid', () => {
    expect(normalizeSingleKitBookIds(['', '   '])).toEqual([]);
    expect(normalizeSingleKitBookIds(undefined)).toEqual([]);
  });
});

describe('kit linked book presentation', () => {
  it('uses the configured ids while linked books are loading', () => {
    expect(getKitLinkedBookCount({
      linkedBookIdsCount: 3,
      linkedBooksCount: 0,
      loadingLinkedBooks: true,
    })).toBe(3);
  });

  it('uses the resolved linked books after loading finishes', () => {
    expect(getKitLinkedBookCount({
      linkedBookIdsCount: 3,
      linkedBooksCount: 1,
      loadingLinkedBooks: false,
    })).toBe(1);
  });

  it('keeps a single linked book embedded in the kit experience', () => {
    expect(shouldShowKitLinkedBooksPanel(1)).toBe(false);
  });

  it('shows the book chooser only when the kit has multiple linked books', () => {
    expect(shouldShowKitLinkedBooksPanel(2)).toBe(true);
  });

  it('keeps the reading shortcut in the kit when the linked books panel stays hidden', () => {
    expect(getVisiblePrimaryCollectionAssets([
      { id: 'reading', category: 'reading', media_type: 'document', title: 'Leitura', url: '/reading.pdf', scope: 'primary' },
      { id: 'audio', category: 'storytelling', media_type: 'audio', title: 'Contação', url: '/audio.mp3', scope: 'primary' },
    ], false).map((asset) => asset.category)).toEqual(['reading', 'storytelling']);
  });

  it('removes the reading shortcut when the kit exposes the linked books panel', () => {
    expect(getVisiblePrimaryCollectionAssets([
      { id: 'reading', category: 'reading', media_type: 'document', title: 'Leitura', url: '/reading.pdf', scope: 'primary' },
      { id: 'video', category: 'animation', media_type: 'video', title: 'Animado', url: '/video.mp4', scope: 'primary' },
    ], true).map((asset) => asset.category)).toEqual(['animation']);
  });
});

describe('getCollectionFormatKinds', () => {
  it('summarizes the multimodal surfaces of a collection in a stable order', () => {
    expect(getCollectionFormatKinds({
      kit_book_ids: ['book-1'],
      audio_url: '/audio.mp3',
      collection_assets: [
        { id: 'video', category: 'animation', media_type: 'video', title: 'Animado', url: '/video.mp4', scope: 'primary' },
      ],
      extra_materials: ['/guia.pdf'],
    } as any)).toEqual(['reading', 'audio', 'video', 'materials']);
  });

  it('detects formats even when they only exist inside collection assets', () => {
    expect(getCollectionFormatKinds({
      collection_assets: [
        { id: 'reading', category: 'reading', media_type: 'document', title: 'Leitura', url: '/reading.pdf', scope: 'primary' },
        { id: 'audio', category: 'storytelling', media_type: 'audio', title: 'Contação', url: '/audio.mp3', scope: 'primary' },
      ],
    } as any)).toEqual(['reading', 'audio']);
  });
});

describe('getCollectionDisplayCover', () => {
  it('prefers kit_cover_image over cover_image when both are present', () => {
    expect(getCollectionDisplayCover({
      collection_type: 'kit',
      cover_image: 'https://cdn.example.com/cover.jpg',
      kit_cover_image: 'https://cdn.example.com/kit-cover.jpg',
    } as any)).toBe('https://cdn.example.com/kit-cover.jpg');
  });

  it('falls back to kit_cover_image for kits without a primary cover', () => {
    expect(getCollectionDisplayCover({
      collection_type: 'kit',
      cover_image: '',
      kit_cover_image: 'https://cdn.example.com/kit-cover.jpg',
    } as any)).toBe('https://cdn.example.com/kit-cover.jpg');
  });

  it('ignores the app placeholder cover when a kit thumbnail is available', () => {
    expect(getCollectionDisplayCover({
      collection_type: 'kit',
      cover_image: '/assets/images/image-placeholder.png',
      kit_cover_image: 'https://cdn.example.com/kit-cover.jpg',
    } as any)).toBe('https://cdn.example.com/kit-cover.jpg');
  });
});

describe('getCollectionTypeMeta', () => {
  it('uses Kit as short label for multimodal collections', () => {
    expect(getCollectionTypeMeta({ collection_type: 'kit' } as any).shortLabel).toBe('Kit');
  });
});
