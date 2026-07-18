import { describe, expect, it } from 'vitest';

import { COLLECTION_ASSET_META, VIDEO_TAG_DISPLAY_ORDER, inferCollectionAssets } from './collectionAssets';

describe('US1.1 — video Tag selector shows exactly 5 tags in a fixed order', () => {
  it('maps VIDEO_TAG_DISPLAY_ORDER to the exact labels in the exact order', () => {
    const labels = VIDEO_TAG_DISPLAY_ORDER.map((category) => COLLECTION_ASSET_META[category].label);

    expect(labels).toEqual([
      'Contação de Histórias',
      'Desenho Animado',
      'Treinamento',
      'Com Libras',
      'Como Jogar',
    ]);
  });

  it('excludes the hub-only categories (video_lesson, formation) from the in-work Tag order', () => {
    expect(VIDEO_TAG_DISPLAY_ORDER).not.toContain('video_lesson');
    expect(VIDEO_TAG_DISPLAY_ORDER).not.toContain('formation');
  });
});

describe('training video category (companion, mirrors how_to_play)', () => {
  it('is registered in COLLECTION_ASSET_META as a library-scoped video', () => {
    expect(COLLECTION_ASSET_META.training).toEqual({
      label: 'Treinamento',
      mediaType: 'video',
      scope: 'library',
    });
  });

  it('keeps a custom training asset intact when inferring collection assets', () => {
    const trainingUrl = 'https://example.com/video/treinamento.mp4';

    const collectionAssets = inferCollectionAssets({
      collection_assets: [
        {
          id: 'obra-training',
          category: 'training',
          media_type: 'video',
          title: 'Treinamento para Educadores',
          url: trainingUrl,
          scope: 'library',
        },
      ],
    });

    const trainingAsset = collectionAssets.find((asset) => asset.category === 'training');
    expect(trainingAsset).toMatchObject({
      category: 'training',
      media_type: 'video',
      url: trainingUrl,
      scope: 'library',
    });
  });
});
