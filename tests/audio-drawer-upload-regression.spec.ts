import { test, expect, Page } from '@playwright/test';
import { setupCentralCorujaEditorSession } from './fixtures/auth';
import { waitForAuthenticatedScreen } from './helpers/navigation';
import { wireMockSupabaseStorage } from './helpers/centralCorujaAudioPipeline';

const getAudioDrawer = (page: Page) =>
  page.locator('div.fixed.inset-y-0.right-0.z-50').filter({
    has: page.getByPlaceholder('Título da música'),
  }).first();

const ensureAudioFormOpen = async (page: Page) => {
  const drawer = getAudioDrawer(page);
  const titleInput = drawer.getByPlaceholder('Título da música');

  if (!(await titleInput.isVisible().catch(() => false))) {
    const openBtn = page.locator('main').getByRole('button', { name: 'Novo áudio', exact: true }).first();
    await openBtn.scrollIntoViewIfNeeded();
    await openBtn.click();
  }

  await expect(drawer.getByRole('heading', { level: 2, name: /Novo áudio/i })).toBeVisible({ timeout: 10_000 });
  await expect(titleInput).toBeVisible({ timeout: 10_000 });
  await expect(drawer.getByRole('button', { name: 'Criar áudio', exact: true })).toBeVisible({ timeout: 10_000 });
  await expect(drawer.getByRole('button', { name: 'Salvar Alterações', exact: true })).toHaveCount(0);
};

test('regressão: upload novo de áudio não mostra aviso de mídia já vinculada', async ({ page }) => {
  await wireMockSupabaseStorage(page);
  await setupCentralCorujaEditorSession(page, {
    navState: { currentScreen: 'admin' },
    initialUrl: '/?brand=central-coruja#admin?module=music',
  });
  await waitForAuthenticatedScreen(page);

  await ensureAudioFormOpen(page);

  const drawer = getAudioDrawer(page);
  await drawer
    .locator('input[type="file"][accept="audio/*"]')
    .first()
    .setInputFiles({
      name: 'novo-audio.mp3',
      mimeType: 'audio/mpeg',
      buffer: Buffer.from('ID3'),
    });

  await expect(drawer.getByRole('button', { name: 'Limpar', exact: true })).toBeVisible({ timeout: 10_000 });
  await expect(drawer.getByRole('heading', { level: 2, name: /Novo áudio/i })).toBeVisible();
  await expect(drawer.getByRole('button', { name: 'Criar áudio', exact: true })).toBeVisible();
  await expect(drawer.getByRole('button', { name: 'Salvar Alterações', exact: true })).toHaveCount(0);
  await expect(
    drawer.getByText('Esta mídia já estava vinculada, mas não está disponível na biblioteca para nova seleção.')
  ).toHaveCount(0);
});
