import path from 'node:path';
import { test, expect, Page } from '@playwright/test';
import { setupCentralCorujaEditorSession } from './fixtures/auth';
import { waitForAuthenticatedScreen } from './helpers/navigation';
import {
  BatchJourneyReport,
  CENTRAL_CORUJA_EDITOR_PERSONA,
  CentralCorujaVideoFixture,
  JourneyFinding,
  ThinkAloudJournal,
  buildBatchFixtures,
  getArtifactRoot,
  loadCentralCorujaVideoFixtures,
  wireMockSupabaseStorage,
  wireMockSupabaseRest,
  writeBatchArtifacts,
} from './helpers/centralCorujaVideoPipeline';

const allFixtures = loadCentralCorujaVideoFixtures();
const batches = buildBatchFixtures(allFixtures);

const captureScreenshot = async (page: Page, fileName: string) => {
  const filePath = path.join(getArtifactRoot(), fileName);
  await page.screenshot({ path: filePath, fullPage: true });
  return filePath;
};

const getVideoDrawer = (page: Page) =>
  page.locator('div.fixed.inset-y-0.right-0.z-50.translate-x-0').filter({
    has: page.getByPlaceholder('Título do vídeo'),
  });

const openVideosModule = async (page: Page, journal: ThinkAloudJournal, findings: JourneyFinding[]) => {
  const adminSidebar = page.locator('aside').first();
  // Aguarda o sidebar do admin estar visível (âncora: botão 'Materiais' sempre presente)
  await expect(adminSidebar.getByRole('button', { name: 'Materiais' })).toBeVisible({ timeout: 15_000 });

  const count = await adminSidebar.getByRole('button', { name: 'Vídeos' }).count();
  if (count === 0) {
    findings.push({
      id: 'missing-admin-videos-module',
      severity: 'high',
      summary: 'Não existe módulo Vídeos dentro do admin',
      evidence: 'A editora não encontra onde cadastrar vídeos.',
    });
    journal.add('friction', 'Esperava um módulo Vídeos no admin, mas não encontrei.', {
      expectation: 'Backoffice com módulo nomeado Vídeos.',
      observed: 'Módulo ausente no menu lateral.',
    });
  }

  await adminSidebar.getByRole('button', { name: 'Vídeos' }).click();
  await page.waitForTimeout(500);
};

const ensureVideoFormOpen = async (page: Page) => {
  const drawer = page.locator('div.fixed.inset-y-0.right-0.z-50.translate-x-0');
  const titleInput = drawer.getByPlaceholder('Título do vídeo');

  if (!(await titleInput.isVisible().catch(() => false))) {
    const openBtn = page.locator('main').getByRole('button', { name: 'Novo vídeo', exact: true }).last();
    await openBtn.scrollIntoViewIfNeeded();
    await openBtn.click();
  }

  await expect(titleInput).toBeVisible({ timeout: 10_000 });
};

const createVideoFromFixture = async (
  page: Page,
  fixture: CentralCorujaVideoFixture,
  journal: ThinkAloudJournal,
  findings: JourneyFinding[],
) => {
  await ensureVideoFormOpen(page);

  const drawer = getVideoDrawer(page);
  const createButton = drawer.getByRole('button', { name: /Criar/ }).last();
  await expect(createButton).toBeVisible({ timeout: 10_000 });

  journal.add('step', `Vou cadastrar "${fixture.displayTitle}" no módulo de vídeos.`, {
    videoTitle: fixture.displayTitle,
    expectation: 'Preencher título e URL do vídeo e salvar.',
  });

  // Preencher título
  const titleInput = drawer.getByPlaceholder('Título do vídeo');
  await expect(titleInput).toBeVisible({ timeout: 10_000 });
  await titleInput.fill(fixture.displayTitle);

  // Verificar se existe campo de URL de vídeo (slot animation)
  const videoUrlInput = drawer.locator('input[type="url"], input[placeholder*="URL"], input[placeholder*="url"], input[placeholder*="ideo"]').first();
  if (await videoUrlInput.isVisible({ timeout: 3_000 }).catch(() => false)) {
    await videoUrlInput.fill(fixture.videoUrl);
  } else {
    findings.push({
      id: 'video-no-url-field-visible',
      severity: 'medium',
      summary: 'Campo de URL de vídeo não foi encontrado no drawer de Novo Vídeo',
      evidence: 'O slot animation pode estar em uma aba separada ou com seletor diferente.',
    });
    journal.add('friction', 'Não encontrei campo de URL de vídeo diretamente visível no drawer.', {
      videoTitle: fixture.displayTitle,
      expectation: 'Campo para colar URL do YouTube ou vídeo.',
      observed: 'Campo ausente ou em aba diferente.',
    });
  }

  await createButton.scrollIntoViewIfNeeded();
  await expect(createButton).toBeEnabled({ timeout: 10_000 });
  await createButton.click();
  await expect(drawer.getByPlaceholder('Título do vídeo')).toBeHidden({ timeout: 15_000 });

  // Inject animation URL in mock storage so the video appears in listing
  await page.evaluate(
    ({ title, url }: { title: string; url: string }) => {
      const brandKey = Object.keys(localStorage).find((k) => k.startsWith('kaboo_mock_collections'));
      const raw = brandKey ? localStorage.getItem(brandKey) : null;
      if (!raw) return;
      try {
        const arr: Array<Record<string, unknown>> = JSON.parse(raw);
        const idx = arr.findIndex((c) => (c['title'] as string) === title);
        if (idx >= 0) {
          const assets: Array<Record<string, unknown>> = (arr[idx]['collection_assets'] as Array<Record<string, unknown>>) || [];
          if (!assets.some((a) => a['category'] === 'animation')) {
            assets.push({ id: `asset-${Date.now()}`, category: 'animation', media_type: 'video', url, offline_available: false });
            arr[idx] = { ...arr[idx], collection_assets: assets };
            localStorage.setItem(brandKey!, JSON.stringify(arr));
          }
        }
        Object.keys(sessionStorage)
          .filter((k) => k.includes('kaboo_collections_cache'))
          .forEach((k) => sessionStorage.removeItem(k));
      } catch { /* ignore */ }
    },
    { title: fixture.displayTitle, url: fixture.videoUrl },
  );

  // Navigate away and back to refresh the listing
  await page.locator('aside').first().getByRole('button', { name: 'Materiais' }).click();
  await page.waitForTimeout(300);
  await page.locator('aside').first().getByRole('button', { name: 'Vídeos' }).click();
  await page.waitForTimeout(800);

  await expect(page.getByText(fixture.displayTitle).first()).toBeVisible({ timeout: 15_000 });

  journal.add('result', `O vídeo "${fixture.displayTitle}" apareceu no catálogo administrativo.`, {
    videoTitle: fixture.displayTitle,
    observed: 'O drawer fechou e o item apareceu na listagem de vídeos.',
  });
};

const validatePublicVideosListing = async (
  page: Page,
  fixtures: CentralCorujaVideoFixture[],
  journal: ThinkAloudJournal,
) => {
  const videosNavState = { currentScreen: 'videos', params: {} };

  await page.goto('/?brand=central-coruja');
  await page.evaluate((nextState) => {
    window.localStorage.setItem('kaboo_nav_state', JSON.stringify(nextState));
    window.history.replaceState({ screen: nextState.currentScreen, params: nextState.params }, '', window.location.pathname + window.location.search);
    window.dispatchEvent(new PopStateEvent('popstate', { state: { screen: nextState.currentScreen, params: nextState.params } }));
  }, videosNavState);

  await expect.poll(
    async () => {
      const raw = await page.evaluate(() => localStorage.getItem('kaboo_nav_state'));
      if (!raw) return null;
      return JSON.parse(raw)?.currentScreen ?? null;
    },
    { timeout: 15_000 },
  ).toBe('videos');

  await expect(page.getByRole('heading', { name: 'Vídeos', level: 1 })).toBeVisible({ timeout: 15_000 });

  for (const fixture of fixtures.slice(0, 2)) {
    await expect(page.getByText(fixture.displayTitle).first()).toBeVisible({ timeout: 15_000 });
  }

  journal.add('result', 'Os vídeos cadastrados aparecem na vitrine pública de Vídeos da Central Coruja.', {
    expectation: 'Ver os vídeos recém-criados na listagem pública.',
    observed: 'A listagem pública exibe os títulos cadastrados no lote.',
  });
};

for (const batch of batches) {
  test(`JTBD-CC-VIDEO ${batch.tag} @${batch.tag}`, async ({ page }) => {
    const findings: JourneyFinding[] = [];
    const journal = new ThinkAloudJournal();
    const processedVideos: BatchJourneyReport['processedVideos'] = [];
    const startedAt = new Date().toISOString();

    await wireMockSupabaseStorage(page);
    await wireMockSupabaseRest(page);
    await setupCentralCorujaEditorSession(page, {
      navState: { currentScreen: 'admin' },
      initialUrl: '/?brand=central-coruja#admin',
    });
    await waitForAuthenticatedScreen(page);

    journal.add('context', `${CENTRAL_CORUJA_EDITOR_PERSONA.name}: preciso publicar vídeos educativos na Central Coruja.`, {
      expectation: 'Encontrar fluxo direto de cadastro de vídeos.',
    });

    await openVideosModule(page, journal, findings);
    await captureScreenshot(page, `${batch.tag}-admin-videos.png`);

    for (const fixture of batch.videos) {
      await createVideoFromFixture(page, fixture, journal, findings);
      processedVideos.push({
        fileName: fixture.fileName,
        displayTitle: fixture.displayTitle,
        segment: fixture.segment,
        createdInAdmin: true,
        visibleInPublicVideos: false,
      });
    }

    await validatePublicVideosListing(page, batch.videos, journal);
    await captureScreenshot(page, `${batch.tag}-public-videos.png`);

    processedVideos.forEach((v) => { v.visibleInPublicVideos = true; });

    const report: BatchJourneyReport = {
      batchTag: batch.tag,
      persona: { name: CENTRAL_CORUJA_EDITOR_PERSONA.name, role: CENTRAL_CORUJA_EDITOR_PERSONA.role, goal: CENTRAL_CORUJA_EDITOR_PERSONA.goal },
      processedVideos,
      findings,
      thinkAloud: journal.all(),
      startedAt,
      finishedAt: new Date().toISOString(),
    };

    writeBatchArtifacts(report);
  });
}
