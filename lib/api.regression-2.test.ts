import { beforeEach, describe, expect, it, vi } from 'vitest';

import { MediaHubResponse, MediaItemCard } from '../types';

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

  vi.stubGlobal('sessionStorage', sessionStorage);
  vi.stubGlobal('localStorage', localStorage);
  vi.stubGlobal('window', {
    sessionStorage,
    localStorage,
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
    stubBrowserStorage();
    const { api } = await import('./api');

    const initialCollections = await api.getCollections();
    const targetCollection = initialCollections[0];

    if (!targetCollection) {
      throw new Error('Expected a seeded collection to validate the media hub bridge');
    }

    const updatedCollection = await api.updateCollection(targetCollection.id, {
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
          id: 'bug-007-storytelling',
          category: 'storytelling',
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
          id: 'bug-007-reading',
          category: 'reading',
          media_type: 'document',
          title: 'BUG-007 Leitura',
          url: 'https://cdn.example.com/bug-007-leitura.pdf',
          scope: 'primary',
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
    const readingCard = findHubCard(materialsHub, 'BUG-007 Leitura');
    const extraCard = findHubCard(materialsHub, 'BUG-007 Extra');

    expect(videoCard?.collectionTitle).toBe(targetCollection.title);
    expect(audioCard?.collectionTitle).toBe(targetCollection.title);
    expect(guideCard?.collectionTitle).toBe(targetCollection.title);
    expect(videoLessonCard?.collectionTitle).toBe(targetCollection.title);
    expect(readingCard?.collectionTitle).toBe(targetCollection.title);
    expect(extraCard?.collectionTitle).toBe(targetCollection.title);

    const audioPlayback = await api.resolveMediaPlayback(audioCard!.id);
    const guidePlayback = await api.resolveMediaPlayback(guideCard!.id);
    const videoLessonPlayback = await api.resolveMediaPlayback(videoLessonCard!.id);

    expect(audioPlayback?.source.url).toBe('https://cdn.example.com/bug-007-audio.mp3');
    expect(guidePlayback?.source.url).toBe('https://cdn.example.com/bug-007-guia.pdf');
    expect(videoLessonPlayback?.source.url).toBe('https://cdn.example.com/bug-007-videoaula.mp4');

    const guideItem = await api.getMediaItem(guideCard!.id);
    const readingItem = await api.getMediaItem(readingCard!.id);

    expect(guideItem?.kind).toBe('training');
    expect(readingItem?.kind).toBe('document');
  });

  it('keeps asset titles and prefers the collection primary cover for collection-backed thumbnails', async () => {
    stubBrowserStorage();
    const { api } = await import('./api');

    const initialCollections = await api.getCollections();
    const targetCollection = initialCollections[0];

    if (!targetCollection) {
      throw new Error('Expected a seeded collection to validate hub thumbnails');
    }

    await api.updateCollection(targetCollection.id, {
      collection_type: 'kit',
      cover_image: 'https://cdn.example.com/primary-cover.jpg',
      kit_cover_image: 'https://cdn.example.com/secondary-kit-cover.jpg',
      collection_assets: [
        {
          id: 'bug-thumb-priority-video',
          category: 'animation',
          media_type: 'video',
          title: 'BUG-THUMB Video Principal',
          url: 'https://cdn.example.com/bug-thumb-video.mp4',
          scope: 'primary',
        },
      ],
    });

    const videosHub = await api.getMediaHub('videos');
    const videoCard = findHubCard(videosHub, 'BUG-THUMB Video Principal');

    expect(videoCard?.title).toBe('BUG-THUMB Video Principal');
    expect(videoCard?.collectionTitle).toBe(targetCollection.title);
    expect(videoCard?.thumbnailUrl).toBe('https://cdn.example.com/primary-cover.jpg');
  });
});
