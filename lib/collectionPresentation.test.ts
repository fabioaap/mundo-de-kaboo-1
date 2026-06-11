import { describe, expect, it } from 'vitest';

import {
  getCollectionDisplayCover,
  getCollectionFormatKinds,
  getCollectionTypeMeta,
  getKitLinkedBookCount,
  getLibraryAssetCoverImage,
  getYoutubeThumbnail,
  extractSourceCollectionId,
  isStandaloneReadableBook,
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

describe('isStandaloneReadableBook', () => {
  it('accepts standalone books that expose a reading surface', () => {
    expect(isStandaloneReadableBook({
      collection_type: 'book',
      collection_assets: [
        { id: 'reading', category: 'reading', media_type: 'document', title: 'Leitura', url: '/reading.pdf', scope: 'primary' },
      ],
    } as any)).toBe(true);
  });

  it('rejects standalone books that only expose audio or video assets', () => {
    expect(isStandaloneReadableBook({
      collection_type: 'book',
      collection_assets: [
        { id: 'audio', category: 'storytelling', media_type: 'audio', title: 'Áudio', url: '/audio.mp3', scope: 'primary' },
      ],
    } as any)).toBe(false);

    expect(isStandaloneReadableBook({
      collection_type: 'book',
      collection_assets: [
        { id: 'video', category: 'animation', media_type: 'video', title: 'Desenho Animado', url: '/video.mp4', scope: 'primary' },
      ],
    } as any)).toBe(false);
  });
});

describe('getCollectionDisplayCover', () => {
  it('prefers cover_image over kit_cover_image when both are present', () => {
    expect(getCollectionDisplayCover({
      collection_type: 'kit',
      cover_image: 'https://cdn.example.com/cover.jpg',
      kit_cover_image: 'https://cdn.example.com/kit-cover.jpg',
    } as any)).toBe('https://cdn.example.com/cover.jpg');
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

describe('getYoutubeThumbnail', () => {
  it('derives the thumbnail from a youtu.be short link', () => {
    expect(getYoutubeThumbnail('https://youtu.be/bl4FwD0IGQc'))
      .toBe('https://img.youtube.com/vi/bl4FwD0IGQc/hqdefault.jpg');
  });

  it('derives the thumbnail from a watch?v= link', () => {
    expect(getYoutubeThumbnail('https://www.youtube.com/watch?v=bl4FwD0IGQc&t=10'))
      .toBe('https://img.youtube.com/vi/bl4FwD0IGQc/hqdefault.jpg');
  });

  it('returns empty string for non-youtube and empty urls', () => {
    expect(getYoutubeThumbnail('https://cdn.example.com/video.mp4')).toBe('');
    expect(getYoutubeThumbnail('')).toBe('');
    expect(getYoutubeThumbnail(null)).toBe('');
  });
});

describe('extractSourceCollectionId', () => {
  it('extracts the owner collection id from a storage asset url', () => {
    expect(extractSourceCollectionId(
      'https://x.supabase.co/storage/v1/object/public/collections/audio/11b18c7e-4e13-40c3-bb72-965a0713e2d2/sons.wav',
    )).toBe('11b18c7e-4e13-40c3-bb72-965a0713e2d2');
  });

  it('returns empty string for temp paths and youtube urls', () => {
    expect(extractSourceCollectionId(
      'https://x.supabase.co/storage/v1/object/public/collections/audio/temp/sons.wav',
    )).toBe('');
    expect(extractSourceCollectionId('https://youtu.be/bl4FwD0IGQc')).toBe('');
  });
});

describe('getLibraryAssetCoverImage', () => {
  const KIT = {
    id: 'kit-asas',
    collection_type: 'kit',
    cover_image: 'https://cdn.example.com/kit-asas.png',
  } as any;

  const SOURCE_BOOK = {
    id: '11b18c7e-4e13-40c3-bb72-965a0713e2d2',
    collection_type: 'book',
    cover_image: 'https://cdn.example.com/blado-own.png',
  } as any;

  it('prefers the YouTube thumbnail for a youtube video linked in a kit (not the kit cover)', () => {
    const asset = { url: 'https://youtu.be/bl4FwD0IGQc', media_type: 'video' };
    expect(getLibraryAssetCoverImage(asset, KIT)).toBe(
      'https://img.youtube.com/vi/bl4FwD0IGQc/hqdefault.jpg',
    );
  });

  it('uses the source collection cover for an audio reused in a kit (not the kit cover)', () => {
    const byId = new Map([[SOURCE_BOOK.id, SOURCE_BOOK]]);
    const asset = {
      url: 'https://x.supabase.co/storage/v1/object/public/collections/audio/11b18c7e-4e13-40c3-bb72-965a0713e2d2/sons.wav',
      media_type: 'audio',
    };
    expect(getLibraryAssetCoverImage(asset, KIT, byId)).toBe('https://cdn.example.com/blado-own.png');
  });

  it('falls back to the owner collection cover when the source cannot be resolved', () => {
    const asset = {
      url: 'https://x.supabase.co/storage/v1/object/public/collections/audio/temp/sons.wav',
      media_type: 'audio',
    };
    expect(getLibraryAssetCoverImage(asset, KIT)).toBe('https://cdn.example.com/kit-asas.png');
  });

  it('returns empty string when nothing resolves (lets caller apply its own placeholder)', () => {
    const asset = {
      url: 'https://x.supabase.co/storage/v1/object/public/collections/audio/temp/sons.wav',
      media_type: 'audio',
    };
    expect(getLibraryAssetCoverImage(asset, null)).toBe('');
  });
});

describe('getCollectionTypeMeta', () => {
  it('uses Kit as short label for multimodal collections', () => {
    expect(getCollectionTypeMeta({ collection_type: 'kit' } as any).shortLabel).toBe('Kit');
  });
});
