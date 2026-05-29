import path from 'node:path';
import { test, expect, Page } from '@playwright/test';
import { setupCentralCorujaEditorSession } from './fixtures/auth';
import { waitForAuthenticatedScreen } from './helpers/navigation';
import {
  BatchJourneyReport,
  CENTRAL_CORUJA_EDITOR_PERSONA,
  CentralCorujaAudioFixture,
  JourneyFinding,
  ThinkAloudJournal,
  buildBatchFixtures,
  getArtifactRoot,
  loadCentralCorujaAudioFixtures,
  wireMockSupabaseStorage,
  wireMockSupabaseRest,
  writeBatchArtifacts,
} from './helpers/centralCorujaAudioPipeline';

const allFixtures = loadCentralCorujaAudioFixtures();
const batches = buildBatchFixtures(allFixtures);

const captureScreenshot = async (page: Page, fileName: string) => {
  const filePath = path.join(getArtifactRoot(), fileName);
  await page.screenshot({ path: filePath, fullPage: true });
  return filePath;
};

const getAudioDrawer = (page: Page) =>
  page.locator('div.fixed.inset-y-0.right-0.z-50.translate-x-0').filter({
    has: page.getByPlaceholder('Título da música'),
  });

const openAudiosModule = async (page: Page, journal: ThinkAloudJournal, findings: JourneyFinding[]) => {
  const adminSidebar = page.locator('aside').first();
  await expect(adminSidebar.getByRole('button', { name: 'Materiais' })).toBeVisible({ timeout: 15_000 });

  journal.add('context', 'Estou no admin. Vou navegar para o módulo de Áudios.', {
    expectation: 'Backoffice com módulo nomeado Áudios.',
  });

  const audiosBtn = adminSidebar.getByRole('button', { name: 'Áudios' });
  const count = await audiosBtn.count();
  if (count === 0) {
    findings.push({
      id: 'missing-admin-audios-module',
      severity: 'high',
      summary: 'Não existe módulo Áudios dentro do admin',
      evidence: 'A editora não encontra onde cadastrar áudios.',
    });
    journal.add('friction', 'Esperava um módulo Áudios no admin, mas não encontrei.', {
      expectation: 'Backoffice com módulo nomeado Áudios.',
      observed: 'Módulo ausente no menu lateral.',
    });
    return;
  }

  await audiosBtn.click();
  await page.waitForTimeout(500);
};

const ensureAudioFormOpen = async (page: Page) => {
  const drawer = page.locator('div.fixed.inset-y-0.right-0.z-50.translate-x-0');
  const titleInput = drawer.getByPlaceholder('Título da música');

  if (!(await titleInput.isVisible().catch(() => false))) {
    const openBtn = page.locator('main').getByRole('button', { name: 'Novo áudio', exact: true }).first();
    await openBtn.scrollIntoViewIfNeeded();
    await openBtn.click();
  }

  await expect(titleInput).toBeVisible({ timeout: 10_000 });
};

const createAudioFromFixture = async (
  page: Page,
  fixture: CentralCorujaAudioFixture,
  journal: ThinkAloudJournal,
  findings: JourneyFinding[],
): Promise<boolean> => {
  await ensureAudioFormOpen(page);

  const drawer = getAudioDrawer(page);
  const createButton = drawer.getByRole('button', { name: /Criar|Salvar/i }).last();
  await expect(createButton).toBeVisible({ timeout: 10_000 });

  journal.add('step', `Vou cadastrar "${fixture.displayTitle}" no módulo de áudios.`, {
    audioTitle: fixture.displayTitle,
    expectation: 'Preencher título e URL do áudio e salvar.',
  });

  // Preencher título
  const titleInput = drawer.getByPlaceholder('Título da música');
  await expect(titleInput).toBeVisible({ timeout: 10_000 });
  await titleInput.fill(fixture.displayTitle);

  // Preencher URL do áudio
  const audioUrlInput = drawer.locator('input[type="url"], input[placeholder*="https"]').first();
  if (await audioUrlInput.isVisible({ timeout: 3_000 }).catch(() => false)) {
    await audioUrlInput.fill(fixture.audioUrl);
  } else {
    findings.push({
      id: 'audio-no-url-field-visible',
      severity: 'medium',
      summary: 'Campo de URL de áudio não está visível no drawer',
      evidence: `Ao tentar cadastrar "${fixture.displayTitle}", o campo de URL não apareceu.`,
    });
    journal.add('friction', 'Não encontrei campo de URL de áudio diretamente visível no drawer.', {
      audioTitle: fixture.displayTitle,
      expectation: 'Campo de URL de áudio exibido no drawer.',
      observed: 'Campo ausente ou ocultado após interacão.',
    });
  }

  await createButton.scrollIntoViewIfNeeded();
  await expect(createButton).toBeEnabled({ timeout: 10_000 });
  await createButton.click();

  const drawerClosed = await drawer
    .getByPlaceholder('Título da música')
    .isHidden({ timeout: 15_000 })
    .catch(() => false);

  if (!drawerClosed) {
    findings.push({
      id: `audio-drawer-not-closed-${fixture.fileName}`,
      severity: 'high',
      summary: `Drawer não fechou após salvar "${fixture.displayTitle}"`,
      evidence: 'Esperava que o drawer fechasse automaticamente após o clique em Criar.',
    });
    journal.add('friction', `Drawer não fechou após criar "${fixture.displayTitle}".`, {
      audioTitle: fixture.displayTitle,
      expectation: 'Drawer fecha após salvar.',
      observed: 'Drawer permaneceu aberto.',
    });
    return false;
  }

  journal.add('result', `Áudio "${fixture.displayTitle}" criado com sucesso no admin.`, {
    audioTitle: fixture.displayTitle,
    observed: 'Drawer fechou após salvar.',
  });

  // Reabrir módulo para checar listing
  await page.locator('aside').first().getByRole('button', { name: 'Materiais' }).click();
  await page.waitForTimeout(300);
  await page.locator('aside').first().getByRole('button', { name: 'Áudios' }).click();
  await page.waitForTimeout(800);

  await expect(page.getByText(fixture.displayTitle).first()).toBeVisible({ timeout: 15_000 });
  return true;
};

const validatePublicAudiosListing = async (
  page: Page,
  fixtures: CentralCorujaAudioFixture[],
  journal: ThinkAloudJournal,
) => {
  journal.add('step', 'Vou verificar se os áudios aparecem na vitrine pública.', {
    expectation: 'Listagem de Áudios pública exibe os títulos cadastrados.',
  });

  const audiosNavState = JSON.stringify({
    currentScreen: 'home',
    params: { collectionGroup: 'music' },
  });

  await page.goto('/?brand=central-coruja');
  await page.evaluate((navState) => {
    window.localStorage.setItem('kaboo_nav_state', navState);
  }, audiosNavState);
  await page.reload();

  await expect(
    page.getByRole('heading', { name: /Áudios/i }).first(),
  ).toBeVisible({ timeout: 15_000 });

  for (const fixture of fixtures.slice(0, 2)) {
    const visible = await page.getByText(fixture.displayTitle).first().isVisible({ timeout: 10_000 }).catch(() => false);
    journal.add(
      visible ? 'result' : 'friction',
      visible
        ? `Áudio "${fixture.displayTitle}" visível na vitrine pública.`
        : `Áudio "${fixture.displayTitle}" NÃO encontrado na vitrine pública.`,
      { audioTitle: fixture.displayTitle },
    );
  }
};

for (const batch of batches) {
  test(`JTBD-CC-AUDIO ${batch.tag} @${batch.tag}`, async ({ page }) => {
    const startedAt = new Date().toISOString();
    const findings: JourneyFinding[] = [];
    const journal = new ThinkAloudJournal();
    const processedAudios: BatchJourneyReport['processedAudios'] = [];

    await wireMockSupabaseStorage(page);
    await wireMockSupabaseRest(page);
    await setupCentralCorujaEditorSession(page, {
      navState: { currentScreen: 'admin' },
      initialUrl: '/?brand=central-coruja#admin',
    });
    await waitForAuthenticatedScreen(page);

    await openAudiosModule(page, journal, findings);

    for (const fixture of batch.audios) {
      let createdInAdmin = false;
      let visibleInPublicAudios = false;

      try {
        createdInAdmin = await createAudioFromFixture(page, fixture, journal, findings);
      } catch (err) {
        findings.push({
          id: `audio-create-error-${fixture.fileName}`,
          severity: 'high',
          summary: `Erro ao criar áudio "${fixture.displayTitle}"`,
          evidence: String(err),
        });
        await captureScreenshot(page, `error-${fixture.fileName}.png`);
      }

      processedAudios.push({
        fileName: fixture.fileName,
        displayTitle: fixture.displayTitle,
        segment: fixture.segment,
        createdInAdmin,
        visibleInPublicAudios,
      });
    }

    await validatePublicAudiosListing(page, batch.audios, journal).catch(async (err) => {
      findings.push({
        id: 'public-audios-listing-failed',
        severity: 'medium',
        summary: 'Validação da vitrine pública falhou',
        evidence: String(err),
      });
    });

    // Atualizar visibilidade pública
    for (const processed of processedAudios) {
      const isVisible = await page.getByText(processed.displayTitle).first().isVisible({ timeout: 5_000 }).catch(() => false);
      processed.visibleInPublicAudios = isVisible;
    }

    const report: BatchJourneyReport = {
      batchTag: batch.tag,
      persona: CENTRAL_CORUJA_EDITOR_PERSONA,
      processedAudios,
      findings,
      thinkAloud: journal.all(),
      startedAt,
      finishedAt: new Date().toISOString(),
    };

    writeBatchArtifacts(report);

    const criticalFindings = findings.filter((f) => f.severity === 'high');
    if (criticalFindings.length > 0) {
      console.warn(`[JTBD-CC-AUDIO] ${batch.tag} — ${criticalFindings.length} atrito(s) crítico(s) encontrado(s).`);
    }
  });
}
