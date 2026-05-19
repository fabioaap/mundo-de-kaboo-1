import { describe, expect, it } from 'vitest';

import { inferCollectionAssets, syncCollectionWithAssets } from './collectionAssets';

const storytellingUrl = 'https://example.com/audio/mensageiro.wav';
const lyricsUrl = '/mock/lyrics/mensageiro-e-a-cancao-certa.txt';

describe('collection assets lyrics regression', () => {
  it('keeps lyrics_url when merging custom storytelling assets with the legacy audio shortcut', () => {
    // Regression: ISSUE-002 - lyrics_url was dropped during collection asset normalization/merge
    // Found by /qa on 2026-05-09
    // Report: visual Kaboo QA session on the current branch
    const collectionAssets = inferCollectionAssets({
      audio_url: storytellingUrl,
      collection_assets: [
        {
          id: 'mensageiro-storytelling',
          category: 'storytelling',
          media_type: 'audio',
          title: 'Contação da História',
          url: storytellingUrl,
          lyrics_url: lyricsUrl,
          scope: 'primary',
        },
      ],
    });

    expect(collectionAssets).toHaveLength(1);
    expect(collectionAssets[0]).toMatchObject({
      category: 'storytelling',
      media_type: 'audio',
      url: storytellingUrl,
      lyrics_url: lyricsUrl,
    });
  });

  it('keeps lyrics_url in the synced collection payload that feeds the player flow', () => {
    const syncedCollection = syncCollectionWithAssets({
      audio_url: storytellingUrl,
      collection_assets: [
        {
          id: 'mensageiro-storytelling',
          category: 'storytelling',
          media_type: 'audio',
          title: 'Contação da História',
          url: storytellingUrl,
          lyrics_url: lyricsUrl,
          scope: 'primary',
        },
      ],
    });

    expect(syncedCollection.collection_assets).toHaveLength(1);
    expect(syncedCollection.collection_assets?.[0]?.lyrics_url).toBe(lyricsUrl);
    expect(syncedCollection.audio_url).toBe(storytellingUrl);
  });
});
