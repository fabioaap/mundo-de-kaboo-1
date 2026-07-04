// tests/admin-vouchers-management.spec.ts
// ──────────────────────────────────────────────────────────
// Testes E2E: gestão administrativa de Vouchers
// (Mundo de Kaboo — módulo Vouchers)
// ──────────────────────────────────────────────────────────
//
// Persona: "Demo Admin" — administrador que cria modelos de
// voucher, emite lotes de códigos e acompanha o ciclo de vida
// de cada lote (exportar → enviar → confirmar) e de cada
// código individual (ativo → desativado).
//
// JTBD principal: "Quando eu preciso liberar acesso via voucher
// para uma campanha, quero criar um modelo, emitir um lote de
// códigos e controlar a exportação/envio/confirmação desse lote
// sem perder rastreabilidade de cada código individual."
//
// Cobertura pré-existente: zero E2E (apenas lib/mockVoucherData.ts,
// testado indiretamente por tests/voucher-upsell.spec.ts do lado do
// consumidor). Este arquivo cobre o lado administrativo.
// ──────────────────────────────────────────────────────────

import { test, expect, Page } from '@playwright/test';
import { setupOperationalSession } from './fixtures/auth';
import { waitForAuthenticatedScreen } from './helpers/navigation';

// ─── Constantes ────────────────────────────────────────────

const BASE_URL = '/?brand=central-coruja';

// Modelo pré-semeado (lib/mockVoucherData.ts → ensureSeed()): ativo, com lote
// já gerado. Usar este modelo evita depender do fluxo de criação (cenário 1)
// para os cenários de emissão/lote/código, reduzindo flakiness.
const SEEDED_ACTIVE_MODEL_NAME = 'Kit Aventura Kaboo';
// Lote pré-semeado para o modelo acima: quantity 50, status 'generated',
// 50 códigos KABOO-AV001..AV050, os 3 primeiros já 'redeemed'.
const SEEDED_BATCH_LABEL = 'Campanha abril/2026';

// MAX_VOUCHER_BATCH_QUANTITY (lib/mockVoucherData.ts) = 10000.
// Duplicado aqui como literal (não importamos lib do app nos testes) para
// não depender de um require cross-bundle; mantido em sincronia com o
// grep de verificação feito antes de escrever este arquivo.
const MAX_VOUCHER_BATCH_QUANTITY = 10000;

// ─── Helpers ────────────────────────────────────────────────

async function setupAdminAtVouchers(page: Page) {
  await setupOperationalSession(page, {
    role: 'admin',
    brandSlug: 'central-coruja',
    navState: { currentScreen: 'admin' },
    initialUrl: `${BASE_URL}#admin?module=vouchers`,
  });
  await waitForAuthenticatedScreen(page);
}

/** Localiza o dialog modal (Emitir lote / confirmação crítica). */
function dialog(page: Page) {
  return page.getByRole('dialog').first();
}

async function goToModelsTab(page: Page) {
  await page.getByRole('tab', { name: 'Modelos' }).click();
}

async function goToBatchesTab(page: Page) {
  await page.getByRole('tab', { name: 'Lotes' }).click();
}

/** Abre o detalhe do modelo pré-semeado "Kit Aventura Kaboo" a partir da lista. */
async function openSeededModel(page: Page) {
  await goToModelsTab(page);
  await page.getByText(SEEDED_ACTIVE_MODEL_NAME, { exact: false }).first().click();
}

/** Abre o detalhe do lote pré-semeado (label "Campanha abril/2026") a partir da lista de lotes. */
async function openSeededBatch(page: Page) {
  await goToBatchesTab(page);
  await page.getByText(SEEDED_BATCH_LABEL, { exact: false }).first().click();
}

// ═══════════════════════════════════════════════════════════
// JTBD-VOU-ADMIN-001 · Criar modelo via wizard de 3 etapas
// ═══════════════════════════════════════════════════════════

test.describe('JTBD-VOU-ADMIN-001 · Criar modelo de voucher (wizard 3 etapas)', () => {
  test('completar as 3 etapas cria o modelo e ele aparece na lista', async ({ page }) => {
    const modelName = `Modelo E2E ${Date.now()}`;

    await setupAdminAtVouchers(page);
    await goToModelsTab(page);

    await page.getByRole('button', { name: /Novo modelo/i }).click();
    await expect(page.getByText('Etapa 1 de 3')).toBeVisible({ timeout: 10_000 });

    // Etapa 1: nome + tipo de pacote + duração (preset default já válido)
    await page.getByPlaceholder('Ex.: Kit de Acesso Premium').fill(modelName);
    await page.getByRole('button', { name: '📖 Livro' }).click();
    await page.getByRole('button', { name: 'Próximo →' }).click();

    // Etapa 2: seleção de conteúdo — seleciona o primeiro item disponível
    // (grid de coleções: screens/VouchersModule.tsx, cada item é um <button> com <img> de capa)
    await expect(page.getByText('Etapa 2 de 3')).toBeVisible({ timeout: 10_000 });
    const collectionGrid = page.locator('.grid.grid-cols-1.sm\\:grid-cols-2.max-h-\\[360px\\]');
    const firstCollectionCard = collectionGrid.locator('button').first();
    await expect(firstCollectionCard).toBeVisible({ timeout: 10_000 });
    await firstCollectionCard.click();
    await page.getByRole('button', { name: 'Próximo →' }).click();

    // Etapa 3: revisão + salvar e ativar
    await expect(page.getByText('Etapa 3 de 3')).toBeVisible({ timeout: 10_000 });
    await expect(page.getByText('Revisão do modelo')).toBeVisible();
    await page.getByRole('button', { name: 'Salvar e ativar' }).click();

    // Volta para o detalhe do modelo recém-criado, então navega para a lista.
    await goToModelsTab(page);
    await expect(page.getByText(modelName, { exact: false })).toBeVisible({ timeout: 10_000 });
  });
});

// ═══════════════════════════════════════════════════════════
// JTBD-VOU-ADMIN-002 · Emitir lote com quantidade válida
// ═══════════════════════════════════════════════════════════

test.describe('JTBD-VOU-ADMIN-002 · Emitir lote (quantidade válida)', () => {
  test('emitir 25 vouchers cria um novo lote com essa quantidade', async ({ page }) => {
    await setupAdminAtVouchers(page);
    await openSeededModel(page);

    await page.getByRole('button', { name: /Emitir lote/i }).click();
    await expect(dialog(page)).toBeVisible({ timeout: 10_000 });
    await expect(dialog(page).getByText('Emitir lote de vouchers')).toBeVisible();

    const quantityInput = dialog(page).locator('input[inputmode="numeric"]').first();
    await quantityInput.fill('25');

    await dialog(page).getByRole('button', { name: 'Confirmar emissão' }).click();

    // Ao confirmar, o app navega para o detalhe do novo lote.
    // Contador "Total" (grid Total/Disponíveis/Resgatados/Desativados) reflete a quantidade emitida.
    await expect(page.getByText('Vouchers (primeiros 20)')).toBeVisible({ timeout: 10_000 });
    const totalCard = page.locator('.grid > div', { hasText: 'Total' });
    await expect(totalCard.locator('div').first()).toHaveText('25', { timeout: 10_000 });

    // Confirma na lista de lotes que o novo lote (25 vouchers) está presente.
    await goToBatchesTab(page);
    await expect(page.getByText(/25 vouchers/)).toBeVisible({ timeout: 10_000 });
  });
});

// ═══════════════════════════════════════════════════════════
// JTBD-VOU-ADMIN-003 · Validação de quantidade no Emitir lote
// ═══════════════════════════════════════════════════════════

test.describe('JTBD-VOU-ADMIN-003 · Validação de quantidade (Emitir lote)', () => {
  const errorText = new RegExp(`Informe um número inteiro entre 1 e ${MAX_VOUCHER_BATCH_QUANTITY}`);

  test('quantidade 0 mostra erro e mantém confirmação desabilitada', async ({ page }) => {
    await setupAdminAtVouchers(page);
    await openSeededModel(page);
    await page.getByRole('button', { name: /Emitir lote/i }).click();
    await expect(dialog(page)).toBeVisible({ timeout: 10_000 });

    const quantityInput = dialog(page).locator('input[inputmode="numeric"]').first();
    await quantityInput.fill('0');

    await expect(dialog(page).getByText(errorText)).toBeVisible();
    await expect(dialog(page).getByRole('button', { name: 'Confirmar emissão' })).toBeDisabled();
  });

  test('quantidade não numérica mostra erro e mantém confirmação desabilitada', async ({ page }) => {
    await setupAdminAtVouchers(page);
    await openSeededModel(page);
    await page.getByRole('button', { name: /Emitir lote/i }).click();
    await expect(dialog(page)).toBeVisible({ timeout: 10_000 });

    const quantityInput = dialog(page).locator('input[inputmode="numeric"]').first();
    await quantityInput.fill('abc');

    await expect(dialog(page).getByText(errorText)).toBeVisible();
    await expect(dialog(page).getByRole('button', { name: 'Confirmar emissão' })).toBeDisabled();
  });

  test('quantidade acima do máximo mostra erro e mantém confirmação desabilitada', async ({ page }) => {
    await setupAdminAtVouchers(page);
    await openSeededModel(page);
    await page.getByRole('button', { name: /Emitir lote/i }).click();
    await expect(dialog(page)).toBeVisible({ timeout: 10_000 });

    const quantityInput = dialog(page).locator('input[inputmode="numeric"]').first();
    await quantityInput.fill(String(MAX_VOUCHER_BATCH_QUANTITY + 1));

    await expect(dialog(page).getByText(errorText)).toBeVisible();
    await expect(dialog(page).getByRole('button', { name: 'Confirmar emissão' })).toBeDisabled();
  });

  test('quantidade exatamente no máximo é aceita (limite válido)', async ({ page }) => {
    await setupAdminAtVouchers(page);
    await openSeededModel(page);
    await page.getByRole('button', { name: /Emitir lote/i }).click();
    await expect(dialog(page)).toBeVisible({ timeout: 10_000 });

    const quantityInput = dialog(page).locator('input[inputmode="numeric"]').first();
    await quantityInput.fill(String(MAX_VOUCHER_BATCH_QUANTITY));

    // Sem erro de validação, confirmação habilitada.
    await expect(dialog(page).getByText(errorText)).not.toBeVisible();
    const confirmBtn = dialog(page).getByRole('button', { name: 'Confirmar emissão' });
    await expect(confirmBtn).toBeEnabled();

    await confirmBtn.click();

    // Não aguardamos os 10.000 códigos individuais renderizarem — apenas o
    // estado de sucesso: navegação para o detalhe do lote recém-criado.
    await expect(page.getByText('Vouchers (primeiros 20)')).toBeVisible({ timeout: 30_000 });
  });
});

// ═══════════════════════════════════════════════════════════
// JTBD-VOU-ADMIN-004 · Exportar CSV marca o lote como exportado
// ═══════════════════════════════════════════════════════════

test.describe('JTBD-VOU-ADMIN-004 · Exportar CSV do lote', () => {
  test('Exportar CSV dispara download e marca o lote como Exportado', async ({ page }) => {
    await setupAdminAtVouchers(page);
    await openSeededBatch(page);

    const exportBtn = page.getByRole('button', { name: 'Exportar CSV' });
    await expect(exportBtn).toBeVisible({ timeout: 10_000 });

    const [download] = await Promise.all([
      page.waitForEvent('download'),
      exportBtn.click(),
    ]);
    expect(download.suggestedFilename()).toMatch(/\.csv$/);

    // Toast copy exato (screens/VouchersModule.tsx → handleExport)
    await expect(page.getByText('CSV exportado e lote marcado como exportado.')).toBeVisible({ timeout: 10_000 });

    // Status badge do lote atualiza para "Exportado"
    await expect(page.getByText('Exportado', { exact: true })).toBeVisible({ timeout: 10_000 });
  });
});

// ═══════════════════════════════════════════════════════════
// JTBD-VOU-ADMIN-005 · Exportar Excel (XLSX) do lote
// ═══════════════════════════════════════════════════════════

test.describe('JTBD-VOU-ADMIN-005 · Exportar Excel (XLSX) do lote', () => {
  test('Exportar Excel dispara download e marca o lote como Exportado', async ({ page }) => {
    await setupAdminAtVouchers(page);
    await openSeededBatch(page);

    const exportXlsxBtn = page.getByRole('button', { name: 'Exportar Excel' });
    await expect(exportXlsxBtn).toBeVisible({ timeout: 10_000 });

    const [download] = await Promise.all([
      page.waitForEvent('download'),
      exportXlsxBtn.click(),
    ]);
    expect(download.suggestedFilename()).toMatch(/\.xlsx$/);

    // Toast copy exato (screens/VouchersModule.tsx → handleExportXlsx)
    await expect(page.getByText('Excel exportado e lote marcado como exportado.')).toBeVisible({ timeout: 10_000 });

    // Status badge do lote atualiza para "Exportado"
    await expect(page.getByText('Exportado', { exact: true })).toBeVisible({ timeout: 10_000 });
  });
});

// ═══════════════════════════════════════════════════════════
// JTBD-VOU-ADMIN-006 · Desativar código individual dentro de um lote
// ═══════════════════════════════════════════════════════════

test.describe('JTBD-VOU-ADMIN-006 · Desativar código individual', () => {
  test('desativar um código ativo reduz disponíveis e marca a linha como Desativado', async ({ page }) => {
    await setupAdminAtVouchers(page);
    await openSeededBatch(page);

    // Lê o valor diretamente do card de contadores (grid Total/Disponíveis/Resgatados/Desativados).
    const availableCardBefore = page.locator('.grid > div', { hasText: 'Disponíveis' });
    const availableTextBefore = await availableCardBefore.locator('div').first().textContent();
    const availableBefore = Number((availableTextBefore || '0').trim());

    // Primeira linha da tabela com botão "Desativar" (código status=active)
    const firstDesativarBtn = page.getByRole('button', { name: 'Desativar', exact: true }).first();
    await expect(firstDesativarBtn).toBeVisible({ timeout: 10_000 });
    const row = page.locator('tbody tr').filter({ has: firstDesativarBtn });
    const codeText = (await row.locator('td').nth(1).textContent())?.trim() || '';

    await firstDesativarBtn.click();

    // Modal crítico exige motivo com >= 3 caracteres antes de habilitar "Desativar".
    await expect(dialog(page)).toBeVisible({ timeout: 10_000 });
    await expect(dialog(page).getByText('Desativar voucher')).toBeVisible();
    const confirmBtn = dialog(page).getByRole('button', { name: 'Desativar', exact: true });
    await expect(confirmBtn).toBeDisabled();
    await dialog(page).getByPlaceholder('Descreva o motivo desta ação...').fill('Motivo de teste E2E');
    await expect(confirmBtn).toBeEnabled();
    await confirmBtn.click();

    // Toast de sucesso
    await expect(page.getByText('Voucher desativado.')).toBeVisible({ timeout: 10_000 });

    // Contador "Disponíveis" decresce em 1
    const availableCardAfter = page.locator('.grid > div', { hasText: 'Disponíveis' });
    await expect(availableCardAfter.locator('div').first()).toHaveText(String(availableBefore - 1), { timeout: 10_000 });

    // A linha do código desativado mostra o badge "Desativado" e não tem mais o botão "Desativar"
    const disabledRow = page.locator('tbody tr').filter({ hasText: codeText });
    await expect(disabledRow.getByText('Desativado', { exact: true })).toBeVisible({ timeout: 10_000 });
    await expect(disabledRow.getByRole('button', { name: 'Desativar', exact: true })).toHaveCount(0);
  });
});

// ═══════════════════════════════════════════════════════════
// JTBD-VOU-ADMIN-007 · Registrar envio e confirmação do lote
// ═══════════════════════════════════════════════════════════
//
// NOTA: o plano original supunha "marcar como sent/confirmed" como uma
// possível ação única — na leitura do componente (screens/VouchersModule.tsx,
// handleMarkSent / handleMarkConfirmed) confirma-se que são DUAS ações
// distintas e sequenciais, cada uma condicionada ao status atual do lote:
//   - "📤 Registrar envio"      → visível apenas quando status === 'exported'; muda para 'sent'
//   - "✅ Registrar confirmação" → visível apenas quando status === 'sent'; muda para 'confirmed'
// Portanto o cenário abaixo exercita a sequência completa: exportar → enviar → confirmar.
// ═══════════════════════════════════════════════════════════

test.describe('JTBD-VOU-ADMIN-007 · Registrar envio e confirmação do lote', () => {
  test('após exportar, "Registrar envio" muda o status para Enviado', async ({ page }) => {
    await setupAdminAtVouchers(page);
    await openSeededBatch(page);

    // Lote pré-semeado começa em 'generated' — precisa ser exportado antes de poder
    // ser marcado como enviado (handleMarkSent só aparece com status === 'exported').
    const exportBtn = page.getByRole('button', { name: 'Exportar CSV' });
    await expect(exportBtn).toBeVisible({ timeout: 10_000 });
    await Promise.all([
      page.waitForEvent('download'),
      exportBtn.click(),
    ]);
    await expect(page.getByText('CSV exportado e lote marcado como exportado.')).toBeVisible({ timeout: 10_000 });

    const markSentBtn = page.getByRole('button', { name: /Registrar envio/i });
    await expect(markSentBtn).toBeVisible({ timeout: 10_000 });
    await markSentBtn.click();

    await expect(page.getByText('Lote marcado como enviado.')).toBeVisible({ timeout: 10_000 });
    await expect(page.getByText('Enviado', { exact: true })).toBeVisible({ timeout: 10_000 });
  });

  test('após enviar, "Registrar confirmação" muda o status para Confirmado', async ({ page }) => {
    await setupAdminAtVouchers(page);
    await openSeededBatch(page);

    // Percorre a sequência completa: generated → exported → sent → confirmed.
    const exportBtn = page.getByRole('button', { name: 'Exportar CSV' });
    await expect(exportBtn).toBeVisible({ timeout: 10_000 });
    await Promise.all([
      page.waitForEvent('download'),
      exportBtn.click(),
    ]);
    await expect(page.getByText('CSV exportado e lote marcado como exportado.')).toBeVisible({ timeout: 10_000 });

    const markSentBtn = page.getByRole('button', { name: /Registrar envio/i });
    await expect(markSentBtn).toBeVisible({ timeout: 10_000 });
    await markSentBtn.click();
    await expect(page.getByText('Lote marcado como enviado.')).toBeVisible({ timeout: 10_000 });

    const markConfirmedBtn = page.getByRole('button', { name: /Registrar confirmação/i });
    await expect(markConfirmedBtn).toBeVisible({ timeout: 10_000 });
    await markConfirmedBtn.click();

    await expect(page.getByText('Lote marcado como confirmado.')).toBeVisible({ timeout: 10_000 });
    await expect(page.getByText('Confirmado', { exact: true })).toBeVisible({ timeout: 10_000 });
  });
});
