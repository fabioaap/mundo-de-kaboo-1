import { beforeEach, describe, expect, it, vi } from 'vitest';

import { MediaHubResponse, MediaItemCard } from '../types';
import { placeholderImageUrl } from './appPaths';
import { getCollectionDisplayCover } from './collectionPresentation';

const createStorageMock = (): Storage => {
  const store = new Map<string, string>();

  return {
    get length() {
      return store.size;
    },
    clear: () => store.clear(),
    getItem: (key: string) => store.get(key) ?? null,
    key: (index: number) => Array.from(store.keys())[index] ?? null,
    removeItem: (key: string) => {
      store.delete(key);
    },
    setItem: (key: string, value: string) => {
      store.set(key, value);
    },
  };
};

const stubBrowserStorage = () => {
  const sessionStorage = createStorageMock();
  const localStorage = createStorageMock();
  sessionStorage.setItem('kaboo_dev_mock_session', '1');

  vi.stubGlobal('sessionStorage', sessionStorage);
  vi.stubGlobal('localStorage', localStorage);
  vi.stubGlobal('window', {
    sessionStorage,
    localStorage,
    location: {
      hash: '',
      href: 'http://localhost:4100/',
      hostname: 'localhost',
      origin: 'http://localhost:4100',
      port: '4100',
      protocol: 'http:',
      search: '',
    },
  });

  return { sessionStorage, localStorage };
};

const getHubCards = (hubResponse: MediaHubResponse): MediaItemCard[] => {
  return [
    ...(hubResponse.hero ? [hubResponse.hero] : []),
    ...hubResponse.shelves.flatMap((shelf) => shelf.items),
  ];
};

const findHubCard = (hubResponse: MediaHubResponse, title: string): MediaItemCard | undefined => {
  return getHubCards(hubResponse).find((item) => item.title === title);
};

describe('api collection-backed media hub bridge', () => {
  beforeEach(() => {
    vi.resetModules();
    vi.unstubAllGlobals();
  });

  it('surfaces admin collection assets across library hubs and resolves playback for shared media shortcuts', async () => {
    // Regression: BUG-007 — admin media shortcuts saved collection assets but the public library hub ignored them
    // Found by /qa on 2026-05-09
    // Report: .gstack/qa-reports/qa-report-sprint2-2026-05-09.md
    //
    // WS-2 note (2026-07-04): isHubEligible (lib/api.ts) now categorically excludes
    // collection_type='kit' from every hub, and collection_type='book' whenever any
    // asset has category='reading' (that content lives inside the book itself, never
    // in a hub — see docs/architecture/modelo-conteudo-e-hubs.md). The seeded
    // targetCollection (initialCollections[0]) is a kit, and this fixture originally
    // included a 'reading' asset — both would make the whole collection hub-ineligible
    // regardless of its other assets. Forced collection_type='book' and dropped the
    // 'reading' asset (reading-in-hub is not a real scenario anymore; it's covered by
    // book-reader tests instead) so the hub-eligible assets can still be verified.
    stubBrowserStorage();
    const { api } = await import('./api');

    const initialCollections = await api.getCollections();
    const targetCollection = initialCollections[0];

    if (!targetCollection) {
      throw new Error('Expected a seeded collection to validate the media hub bridge');
    }

    const updatedCollection = await api.updateCollection(targetCollection.id, {
      collection_type: 'book',
      // O seed desta collection tem pdf_url/audio_url preenchidos — syncCollectionWithAssets
      // (lib/collectionAssets.ts) sempre injeta um asset sintético category='reading' a partir
      // de pdf_url, mesmo que collection_assets não tenha nenhum. Isso tornaria a collection
      // inelegível pra hub de novo (regra book+reading). Limpar os campos legados suprime a
      // injeção sintética.
      pdf_url: '',
      audio_url: '',
      video_url: '',
      collection_assets: [
        {
          id: 'bug-007-animation',
          category: 'animation',
          media_type: 'video',
          title: 'BUG-007 Video',
          url: 'https://cdn.example.com/bug-007-video.mp4',
          scope: 'primary',
        },
        {
          // 'storytelling' (narração de livro) não aparece mais no hub Músicas — vive só
          // dentro do livro (mesma regra de escopo do 'reading'). Só 'music' é hub-elegível.
          id: 'bug-007-music',
          category: 'music',
          media_type: 'audio',
          title: 'BUG-007 Audio',
          url: 'https://cdn.example.com/bug-007-audio.mp3',
          scope: 'primary',
        },
        {
          id: 'bug-007-guide',
          category: 'teacher_guide',
          media_type: 'document',
          title: 'BUG-007 Guia',
          url: 'https://cdn.example.com/bug-007-guia.pdf',
          scope: 'library',
        },
        {
          id: 'bug-007-video-lesson',
          category: 'video_lesson',
          media_type: 'video',
          title: 'BUG-007 Videoaula',
          url: 'https://cdn.example.com/bug-007-videoaula.mp4',
          scope: 'library',
        },
        {
          id: 'bug-007-extra',
          category: 'extra_material',
          media_type: 'document',
          title: 'BUG-007 Extra',
          url: 'https://cdn.example.com/bug-007-extra.pdf',
          scope: 'library',
        },
      ],
    });

    expect(updatedCollection?.collection_assets?.some((asset) => asset.id === 'bug-007-animation')).toBe(true);
    expect(updatedCollection?.collection_assets?.some((asset) => asset.id === 'bug-007-extra')).toBe(true);

    const videosHub = await api.getMediaHub('videos');
    const musicHub = await api.getMediaHub('music');
    const formationsHub = await api.getMediaHub('formations');
    const materialsHub = await api.getMediaHub('materials');

    const videoCard = findHubCard(videosHub, 'BUG-007 Video');
    const audioCard = findHubCard(musicHub, 'BUG-007 Audio');
    const guideCard = findHubCard(formationsHub, 'BUG-007 Guia');
    const videoLessonCard = findHubCard(formationsHub, 'BUG-007 Videoaula');
    const extraCard = findHubCard(materialsHub, 'BUG-007 Extra');

    expect(videoCard?.collectionTitle).toBe(targetCollection.title);
    expect(audioCard?.collectionTitle).toBe(targetCollection.title);
    expect(guideCard?.collectionTitle).toBe(targetCollection.title);
    expect(videoLessonCard?.collectionTitle).toBe(targetCollection.title);
    expect(extraCard?.collectionTitle).toBe(targetCollection.title);

    const audioPlayback = await api.resolveMediaPlayback(audioCard!.id);
    const guidePlayback = await api.resolveMediaPlayback(guideCard!.id);
    const videoLessonPlayback = await api.resolveMediaPlayback(videoLessonCard!.id);

    expect(audioPlayback?.source.url).toBe('https://cdn.example.com/bug-007-audio.mp3');
    expect(guidePlayback?.source.url).toBe('https://cdn.example.com/bug-007-guia.pdf');
    expect(videoLessonPlayback?.source.url).toBe('https://cdn.example.com/bug-007-videoaula.mp4');

    const guideItem = await api.getMediaItem(guideCard!.id);

    expect(guideItem?.kind).toBe('training');
  });

  // BUG-THUMB regressions: originally verified via getMediaHub, but WS-2 (ver
  // docs/architecture/modelo-conteudo-e-hubs.md) tornou collection_type='kit'
  // categoricamente inelegível pra qualquer hub (isHubEligible retorna false)
  // — os assets de um kit vivem só na vitrine da própria coleção, nunca num
  // hub. Testar via getMediaHub ficou estruturalmente impossível (findHubCard
  // sempre retorna undefined pra um kit, não importa a capa). O que essas
  // duas regressões realmente protegem — a lógica de fallback cover_image →
  // kit_cover_image — ainda é código vivo (getCollectionDisplayCover), só que
  // exercitado pela própria coleção, não pelo hub.
  it('keeps the real primary cover for kit-type collections (not the hub)', async () => {
    stubBrowserStorage();
    const { api } = await import('./api');

    const initialCollections = await api.getCollections();
    const targetCollection = initialCollections[0];

    if (!targetCollection) {
      throw new Error('Expected a seeded collection to validate cover fallback');
    }

    const updated = await api.updateCollection(targetCollection.id, {
      collection_type: 'kit',
      cover_image: 'https://cdn.example.com/primary-cover.jpg',
      kit_cover_image: 'https://cdn.example.com/secondary-kit-cover.jpg',
    });

    expect(updated).not.toBeNull();
    expect(getCollectionDisplayCover(updated)).toBe('https://cdn.example.com/primary-cover.jpg');
  });

  it('falls back to the kit real cover when the collection primary cover is a placeholder', async () => {
    stubBrowserStorage();
    const { api } = await import('./api');

    const initialCollections = await api.getCollections();
    const targetCollection = initialCollections[0];

    if (!targetCollection) {
      throw new Error('Expected a seeded collection to validate placeholder cover fallback');
    }

    const updated = await api.updateCollection(targetCollection.id, {
      collection_type: 'kit',
      cover_image: placeholderImageUrl,
      kit_cover_image: 'https://cdn.example.com/real-kit-cover.jpg',
    });

    expect(updated).not.toBeNull();
    expect(getCollectionDisplayCover(updated)).toBe('https://cdn.example.com/real-kit-cover.jpg');
  });
});
