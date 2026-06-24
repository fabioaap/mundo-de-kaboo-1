import { expect, test, Page } from '@playwright/test';
import { setupOperationalSession } from './fixtures/auth';

/**
 * REG-DETAIL-MEDIA-ROUTING-001
 *
 * Regressão dos 4 bugs do detalhe de coleção (kit) com o modelo N-mídia, onde
 * `music` (áudio) e `story_video` (vídeo) podem ser vinculados direto na obra:
 *   - áudio deve abrir a TELA de áudio (player_audio), não o modal de preview;
 *   - vídeo deve abrir a TELA de vídeo (player_video), não o modal de preview;
 *   - material (PDF) deve abrir o preview via PORTAL (filho direto de <body>),
 *     não aninhado dentro do modal de detalhe (modal-sobre-modal).
 *
 * Causa-raiz histórica: roteamento por categoria fixa em vez de `media_type`.
 */

const KIT_ID = 'e2e-detail-regression-kit';
const COLLECTIONS_KEY = 'kaboo_mock_collections';

const KIT = {
  id: KIT_ID,
  title: 'Kit Regressao Detalhe E2E',
  collection_type: 'kit',
  cover_image: '',
  level: 'Educação Infantil',
  synopsis: 'Kit de teste para regressao de roteamento de midia.',
  collection_assets: [
    { id: 'e2e-asset-music', category: 'music', media_type: 'audio', title: 'Audio E2E', url: 'https://example.com/audio-e2e.mp3', scope: 'primary', is_published: true },
    { id: 'e2e-asset-video', category: 'story_video', media_type: 'video', title: 'Video E2E', url: 'https://www.youtube.com/watch?v=dQw4w9WgXcQ', scope: 'primary', is_published: true },
    { id: 'e2e-asset-material', category: 'extra_material', media_type: 'document', title: 'Material E2E PDF', url: 'https://example.com/material-e2e.pdf', scope: 'library', is_published: true },
  ],
};

const openKitDetail = async (page: Page) => {
  await page.addInitScript(
    ({ key, data }) => { window.localStorage.setItem(key, data); },
    { key: COLLECTIONS_KEY, data: JSON.stringify([KIT]) },
  );
  await setupOperationalSession(page, {
    role: 'admin',
    brandSlug: 'kaboo',
    navState: { currentScreen: 'home', params: { collectionId: KIT_ID } },
    initialUrl: `/#home?collectionId=${KIT_ID}`,
  });

  await expect(page.getByText('Kit Regressao Detalhe E2E').first()).toBeVisible({ timeout: 15_000 });
};

// Scoped to the collection-detail modal overlay to avoid matching background-screen buttons.
const modalCard = (page: Page, label: string) =>
  page.locator('[class*="inset-0"][class*="fixed"]').locator('button').filter({ hasText: label }).first();

test.describe('REG-DETAIL-MEDIA-ROUTING-001 — roteamento de mídia no detalhe da coleção', () => {
  test('áudio (music) abre a tela de áudio, não o modal de preview', async ({ page }) => {
    await openKitDetail(page);

    await modalCard(page, 'Audio E2E').click();

    // Hash change to player_audio confirms routing went to the player, not FilePreviewModal.
    await page.waitForFunction(() => window.location.hash.includes('player_audio'), { timeout: 10_000 });
  });

  test('vídeo (story_video) abre a tela de vídeo, não o modal de preview', async ({ page }) => {
    await openKitDetail(page);

    await modalCard(page, 'Video E2E').click();

    // Hash change to player_video confirms routing went to the player, not FilePreviewModal.
    await page.waitForFunction(() => window.location.hash.includes('player_video'), { timeout: 10_000 });
  });

  test('material (PDF) abre o preview via portal (filho direto de <body>)', async ({ page }) => {
    await openKitDetail(page);

    await modalCard(page, 'Materiais').click();

    const previewBtn = page.getByRole('button', { name: 'Visualizar material' });
    await expect(previewBtn).toBeVisible({ timeout: 10_000 });
    await previewBtn.click();

    // O cabeçalho do modal de preview existe e seu container raiz é filho direto de <body>.
    await expect(page.getByText('Material E2E PDF').first()).toBeVisible({ timeout: 10_000 });

    const placement = await page.evaluate((fileName) => {
      const heading = Array.from(document.querySelectorAll('h2')).find((el) => el.textContent?.includes(fileName));
      if (!heading) return 'no-modal';
      let el: HTMLElement = heading as HTMLElement;
      while (el.parentElement && el.parentElement !== document.body) {
        el = el.parentElement;
      }
      return el.parentElement === document.body ? 'portaled' : 'nested';
    }, 'Material E2E PDF');

    expect(placement).toBe('portaled');
  });
});
