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

describe('training video category — companion of the work, never in the public Videos hub', () => {
  beforeEach(() => {
    vi.resetModules();
    vi.unstubAllGlobals();
  });

  it('keeps a training asset out of the Vídeos hub while it stays attached to the collection', async () => {
    stubBrowserStorage();
    const { api } = await import('./api');

    const initialCollections = await api.getCollections();
    const targetCollection = initialCollections[0];

    if (!targetCollection) {
      throw new Error('Expected a seeded collection to validate the training companion scope');
    }

    const updatedCollection = await api.updateCollection(targetCollection.id, {
      collection_type: 'book',
      pdf_url: '',
      audio_url: '',
      video_url: '',
      collection_assets: [
        {
          id: 'story-1-1-animation',
          category: 'animation',
          media_type: 'video',
          title: 'STORY-1.1 Vídeo Avulso',
          url: 'https://cdn.example.com/story-1-1-video.mp4',
          scope: 'primary',
        },
        {
          id: 'story-1-1-training',
          category: 'training',
          media_type: 'video',
          title: 'STORY-1.1 Treinamento',
          url: 'https://cdn.example.com/story-1-1-treinamento.mp4',
          scope: 'library',
        },
      ],
    });

    expect(updatedCollection?.collection_assets?.some((asset) => asset.id === 'story-1-1-training')).toBe(true);

    const videosHub = await api.getMediaHub('videos');
    const trainingCardInHub = findHubCard(videosHub, 'STORY-1.1 Treinamento');
    const looseVideoCard = findHubCard(videosHub, 'STORY-1.1 Vídeo Avulso');

    // Companion (training) never leaks into the public catalog hub — mirrors how_to_play.
    expect(trainingCardInHub).toBeUndefined();
    // Catalog video from the same collection still shows up normally.
    expect(looseVideoCard?.collectionTitle).toBe(targetCollection.title);
  });

  it('US1.4 — no regression: Desenho Animado (animation) and Contação (story_video) still surface in the Vídeos hub', async () => {
    stubBrowserStorage();
    const { api } = await import('./api');

    const initialCollections = await api.getCollections();
    const targetCollection = initialCollections[0];

    if (!targetCollection) {
      throw new Error('Expected a seeded collection to validate the catalog video categories');
    }

    await api.updateCollection(targetCollection.id, {
      collection_type: 'book',
      pdf_url: '',
      audio_url: '',
      video_url: '',
      collection_assets: [
        {
          id: 'us1-4-animation',
          category: 'animation',
          media_type: 'video',
          title: 'US1.4 Desenho Animado',
          url: 'https://cdn.example.com/us1-4-animation.mp4',
          scope: 'primary',
        },
        {
          id: 'us1-4-story-video',
          category: 'story_video',
          media_type: 'video',
          title: 'US1.4 Contação em Vídeo',
          url: 'https://cdn.example.com/us1-4-story-video.mp4',
          scope: 'primary',
        },
        {
          id: 'us1-4-training',
          category: 'training',
          media_type: 'video',
          title: 'US1.4 Treinamento',
          url: 'https://cdn.example.com/us1-4-treinamento.mp4',
          scope: 'library',
        },
      ],
    });

    const videosHub = await api.getMediaHub('videos');

    const animationCard = findHubCard(videosHub, 'US1.4 Desenho Animado');
    const storyVideoCard = findHubCard(videosHub, 'US1.4 Contação em Vídeo');
    const trainingCard = findHubCard(videosHub, 'US1.4 Treinamento');

    // Catalog categories stay in the public Vídeos hub...
    expect(animationCard?.collectionTitle).toBe(targetCollection.title);
    expect(storyVideoCard?.collectionTitle).toBe(targetCollection.title);
    // ...while the training companion never appears there (contrast).
    expect(trainingCard).toBeUndefined();
  });
});
