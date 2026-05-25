// tests/admin-collections-usability-kaboo.spec.ts
// ──────────────────────────────────────────────────────────
// Replica a suíte de usabilidade de admin-collections para a
// marca Mundo de Kaboo (brand: kaboo).
//
// Todas as correções aplicadas (Limpar, dedup de URLs,
// thumbnails, radio único) são no código compartilhado
// AdminCollectionsScreen.tsx — este arquivo garante que
// nada de brand-specific quebra o Kaboo.
// ──────────────────────────────────────────────────────────

import { test, expect, Page } from '@playwright/test';
import { setupOperationalSession } from './fixtures/auth';
import { waitForAuthenticatedScreen } from './helpers/navigation';

// ─── Constantes ─────────────────────────────────────────────

const DRAWER_SELECTOR = 'div.fixed.inset-y-0.right-0.z-50';

// ─── Helpers ─────────────────────────────────────────────────

async function setupEditorKaboo(page: Page, module = 'collections') {
  await setupOperationalSession(page, {
    role: 'editor',
    brandSlug: 'kaboo',
    navState: { currentScreen: 'admin' },
    initialUrl: `/#admin?module=${module}`,
  });
  await waitForAuthenticatedScreen(page);
}

async function setupAdminKaboo(page: Page, module = 'collections') {
  await setupOperationalSession(page, {
    role: 'admin',
    brandSlug: 'kaboo',
    navState: { currentScreen: 'admin' },
    initialUrl: `/#admin?module=${module}`,
  });
  await waitForAuthenticatedScreen(page);
}

function drawer(page: Page) {
  return page.locator(DRAWER_SELECTOR).first();
}

async function openNewCollectionDrawer(page: Page) {
  const btn = page.getByRole('button', { name: /Nova Coleção/i });
  if (await btn.isVisible().catch(() => false)) {
    await btn.click();
  } else {
    const emptyBtn = page.getByRole('button', { name: /Criar primeira/i });
    if (await emptyBtn.isVisible().catch(() => false)) {
      await emptyBtn.click();
    }
  }
  await expect(drawer(page)).toBeVisible({ timeout: 10_000 });
}

async function switchToMediaTab(page: Page) {
  const tab = drawer(page).getByRole('button', { name: /Mídias vinculadas/i });
  await tab.click();
}

// ═══════════════════════════════════════════════════════════
// KABOO · JN-COL-001: Criar coleção vazia
// ═══════════════════════════════════════════════════════════

test.describe('[Kaboo] JN-COL-001 · Criar coleção', () => {
  test('drawer abre com título vazio e botão Criar Coleção', async ({ page }) => {
    await setupEditorKaboo(page, 'collections');
    await openNewCollectionDrawer(page);

    const titleInput = drawer(page).getByPlaceholder(/Título/i).first();
    await expect(titleInput).toBeVisible();
    await expect(titleInput).toHaveValue('');

    const saveBtn = drawer(page).getByRole('button', { name: /Criar Coleção/i });
    await expect(saveBtn).toBeVisible();
  });

  test('campo título visível no drawer de criação de coleção', async ({ page }) => {
    await setupEditorKaboo(page, 'collections');
    await openNewCollectionDrawer(page);

    // Title input uses generic placeholder "Título da coleção"
    const titleInput = drawer(page).getByPlaceholder(/Título da cole/i).first();
    await expect(titleInput).toBeVisible({ timeout: 5_000 });
  });
});

// ═══════════════════════════════════════════════════════════
// KABOO · JN-COL-002: Validação de título
// ═══════════════════════════════════════════════════════════

test.describe('[Kaboo] JN-COL-002 · Validação de título', () => {
  test('salvar sem título mostra erro', async ({ page }) => {
    await setupEditorKaboo(page, 'collections');
    await openNewCollectionDrawer(page);

    const titleInput = drawer(page).getByPlaceholder(/Título|Kaboo/i).first();
    await titleInput.fill('');

    const saveBtn = drawer(page).getByRole('button', { name: /Criar Coleção/i });
    await saveBtn.click();

    const errorToast = page.getByText(/Título.*obrigatório/i);
    await expect(errorToast).toBeVisible({ timeout: 5_000 });
  });
});

// ═══════════════════════════════════════════════════════════
// KABOO · JN-COL-003: Abas e persistência
// ═══════════════════════════════════════════════════════════

test.describe('[Kaboo] JN-COL-003 · Navegação entre abas', () => {
  test('aba Mídias vinculadas mostra slot Leitura', async ({ page }) => {
    await setupEditorKaboo(page, 'collections');
    await openNewCollectionDrawer(page);
    await switchToMediaTab(page);

    const leituraLabel = drawer(page).getByText('Leitura', { exact: true });
    await expect(leituraLabel).toBeVisible({ timeout: 10_000 });
  });

  test('título preenchido persiste ao mudar de aba', async ({ page }) => {
    await setupEditorKaboo(page, 'collections');
    await openNewCollectionDrawer(page);

    const titleInput = drawer(page).getByPlaceholder(/Título|Kaboo/i).first();
    await titleInput.fill('Kaboo Usability Test');

    await switchToMediaTab(page);

    // Back to data tab
    const dataTab = drawer(page).getByRole('button', { name: /Dados/i }).first();
    await dataTab.click();

    await expect(titleInput).toHaveValue('Kaboo Usability Test');
  });
});

// ═══════════════════════════════════════════════════════════
// KABOO · FIX-001: Botão Limpar funciona (fix crítico)
// ═══════════════════════════════════════════════════════════

test.describe('[Kaboo] FIX-001 · Limpar remove asset vinculado', () => {
  test('Limpar faz slot voltar ao estado vazio', async ({ page }) => {
    await setupAdminKaboo(page, 'videos');

    const videoCards = page.locator('main button').filter({ hasText: /Editar/i });
    if (!await videoCards.first().isVisible({ timeout: 10_000 }).catch(() => false)) {
      test.skip(true, 'Sem vídeos no Kaboo para testar Limpar');
      return;
    }

    await videoCards.first().click();
    await page.waitForTimeout(1_000);

    // Select a radio if none selected
    const radios = page.locator('[role="radio"]');
    if (await radios.first().isVisible().catch(() => false)) {
      await radios.first().click();
      await page.waitForTimeout(500);
    }

    const limparBtn = page.getByRole('button', { name: 'Limpar', exact: true });
    if (!await limparBtn.isVisible().catch(() => false)) {
      test.skip(true, 'Sem asset vinculado para limpar');
      return;
    }

    await limparBtn.click();
    await page.waitForTimeout(500);

    // After Limpar: no radio checked, Limpar gone
    const checkedAfter = await page.locator('[role="radio"][aria-checked="true"]').count();
    expect(checkedAfter).toBe(0);
    await expect(limparBtn).not.toBeVisible({ timeout: 3_000 });
  });
});

// ═══════════════════════════════════════════════════════════
// KABOO · FIX-002: Radio single-select (no duplicatas)
// ═══════════════════════════════════════════════════════════

test.describe('[Kaboo] FIX-002 · Radio único por slot', () => {
  test('nunca aparece mais de 1 radio selecionado', async ({ page }) => {
    await setupAdminKaboo(page, 'videos');

    const videoCards = page.locator('main button').filter({ hasText: /Editar/i });
    if (!await videoCards.first().isVisible({ timeout: 10_000 }).catch(() => false)) {
      test.skip(true, 'Sem vídeos no Kaboo');
      return;
    }

    await videoCards.first().click();
    await page.waitForTimeout(1_000);

    const radios = page.locator('[role="radio"]');
    const radioCount = await radios.count();

    if (radioCount >= 2) {
      await radios.nth(0).click();
      await page.waitForTimeout(300);
      let checked = await page.locator('[role="radio"][aria-checked="true"]').count();
      expect(checked).toBeLessThanOrEqual(1);

      await radios.nth(1).click();
      await page.waitForTimeout(300);
      checked = await page.locator('[role="radio"][aria-checked="true"]').count();
      expect(checked).toBeLessThanOrEqual(1);
    }
  });

  test('URLs duplicadas não geram dois radio items', async ({ page }) => {
    await setupAdminKaboo(page, 'videos');

    const videoCards = page.locator('main button').filter({ hasText: /Editar/i });
    if (!await videoCards.first().isVisible({ timeout: 10_000 }).catch(() => false)) {
      test.skip(true, 'Sem vídeos no Kaboo');
      return;
    }

    await videoCards.first().click();
    await page.waitForTimeout(1_000);

    const radios = page.locator('[role="radio"]');
    const count = await radios.count();
    const titles: string[] = [];

    for (let i = 0; i < count; i++) {
      const text = await radios.nth(i).textContent();
      titles.push((text ?? '').trim());
    }

    const uniqueTitles = new Set(titles);
    expect(titles.length).toBe(uniqueTitles.size);
  });
});

// ═══════════════════════════════════════════════════════════
// KABOO · FIX-003: Thumbnails proporções (size-16, sem tags)
// ═══════════════════════════════════════════════════════════

test.describe('[Kaboo] FIX-003 · Thumbnails harmônicas', () => {
  test('thumbnails são quadradas (size-16)', async ({ page }) => {
    await setupAdminKaboo(page, 'videos');

    const videoCards = page.locator('main button').filter({ hasText: /Editar/i });
    if (!await videoCards.first().isVisible({ timeout: 10_000 }).catch(() => false)) {
      test.skip(true, 'Sem vídeos no Kaboo');
      return;
    }

    await videoCards.first().click();
    await page.waitForTimeout(1_000);

    const thumbContainers = page.locator('[role="radiogroup"] .size-16');
    const count = await thumbContainers.count();

    if (count > 0) {
      for (let i = 0; i < Math.min(count, 5); i++) {
        const box = await thumbContainers.nth(i).boundingBox();
        if (box) {
          expect(Math.abs(box.width - box.height)).toBeLessThan(4);
        }
      }
    }
  });

  test('sem tags absolutas sobre thumbnails', async ({ page }) => {
    await setupAdminKaboo(page, 'videos');

    const videoCards = page.locator('main button').filter({ hasText: /Editar/i });
    if (!await videoCards.first().isVisible({ timeout: 10_000 }).catch(() => false)) {
      test.skip(true, 'Sem vídeos no Kaboo');
      return;
    }

    await videoCards.first().click();
    await page.waitForTimeout(1_000);

    const radioGroup = page.locator('[role="radiogroup"]');
    const overlayTags = radioGroup.locator('.size-16 span.absolute');
    await expect(overlayTags).toHaveCount(0, { timeout: 3_000 });
  });
});

// ═══════════════════════════════════════════════════════════
// KABOO · JN-COL-004: Módulos de admin acessíveis
// ═══════════════════════════════════════════════════════════

test.describe('[Kaboo] JN-COL-004 · Módulos admin', () => {
  const modules: Array<{ name: string; module: string }> = [
    { name: 'Coleções', module: 'collections' },
    { name: 'Livros', module: 'books' },
    { name: 'Vídeos', module: 'videos' },
    { name: 'Áudios', module: 'music' },
    { name: 'Formações', module: 'formations' },
    { name: 'Materiais', module: 'materials' },
    { name: 'Usuários', module: 'users' },
    { name: 'Vouchers', module: 'vouchers' },
    { name: 'White Label', module: 'white_label' },
  ];

  for (const mod of modules) {
    test(`navega para módulo ${mod.name} (Kaboo admin)`, async ({ page }) => {
      await setupAdminKaboo(page, 'collections');

      const nav = page.getByRole('navigation');
      const btn = nav.getByRole('button', { name: mod.name }).first();

      if (!await btn.isVisible({ timeout: 5_000 }).catch(() => false)) {
        test.skip(true, `Módulo ${mod.name} não visível`);
        return;
      }

      await btn.click();
      const heading = page.getByRole('heading', { level: 1 }).first();
      await expect(heading).toBeVisible({ timeout: 10_000 });
    });
  }
});

// ═══════════════════════════════════════════════════════════
// KABOO · EDGE-001: Sinopse e contador
// ═══════════════════════════════════════════════════════════

test.describe('[Kaboo] EDGE-001 · Sinopse', () => {
  test('contador 0/500 visível no drawer', async ({ page }) => {
    await setupEditorKaboo(page, 'collections');
    await openNewCollectionDrawer(page);

    const counter = drawer(page).getByText(/\d+\/500/);
    await expect(counter).toBeVisible({ timeout: 5_000 });
  });
});

// ═══════════════════════════════════════════════════════════
// KABOO · EDGE-002: Segmentos multi-select
// ═══════════════════════════════════════════════════════════

test.describe('[Kaboo] EDGE-002 · Segmentos', () => {
  test('checkboxes de segmento seleccionáveis', async ({ page }) => {
    await setupEditorKaboo(page, 'collections');
    await openNewCollectionDrawer(page);

    const checkboxes = drawer(page).getByRole('checkbox');
    if (await checkboxes.first().isVisible({ timeout: 5_000 }).catch(() => false)) {
      await checkboxes.first().check({ force: true });
      expect(await checkboxes.first().isChecked()).toBe(true);
    }
  });
});

// ═══════════════════════════════════════════════════════════
// KABOO · EDGE-003: Tag Coleção automática
// ═══════════════════════════════════════════════════════════

test.describe('[Kaboo] EDGE-003 · Tag automática na vitrine', () => {
  test('tag Coleção visível no drawer', async ({ page }) => {
    await setupEditorKaboo(page, 'collections');
    await openNewCollectionDrawer(page);

    const collectionTag = drawer(page).getByText('Coleção', { exact: true });
    await expect(collectionTag).toBeVisible({ timeout: 5_000 });
  });
});

// ═══════════════════════════════════════════════════════════
// KABOO · EDGE-004: Responsividade mobile
// ═══════════════════════════════════════════════════════════

test.describe('[Kaboo] EDGE-004 · Responsividade mobile', () => {
  test('drawer ocupa largura total no mobile', async ({ page }) => {
    await page.setViewportSize({ width: 375, height: 812 });
    await setupEditorKaboo(page, 'collections');
    await openNewCollectionDrawer(page);

    const drawerEl = drawer(page);
    const box = await drawerEl.boundingBox();
    if (box) {
      expect(box.width).toBeGreaterThanOrEqual(350);
    }
  });
});
