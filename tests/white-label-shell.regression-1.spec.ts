import { test, expect, Page } from '@playwright/test';
import { setupAdminSession } from './fixtures/auth';
import { navigateToWhiteLabel, waitForAuthenticatedScreen } from './helpers/navigation';

// Regression: WL-SHELL-001 — browser title e metas do app shell não acompanhavam a troca de marca
// Found by /qa on 2026-05-13
// Report: manual repro em http://127.0.0.1:4100/#admin -> White Label -> Home

async function openWhiteLabelAsAdmin(page: Page): Promise<void> {
    await setupAdminSession(page);
    await waitForAuthenticatedScreen(page);
    await navigateToWhiteLabel(page);
}

async function returnToWhiteLabelFromHome(page: Page): Promise<void> {
    await page.getByRole('button', { name: 'Gerenciar' }).click();
    await page.getByRole('button', { name: 'White Label' }).click();
    await expect(page.getByRole('heading', { name: 'Gestão de Marca' })).toBeVisible({ timeout: 10_000 });
}

async function expectBrandShell(
    page: Page,
    options: {
        title: string;
        heading: string;
        headingLevel: 1 | 2 | 3 | 4 | 5 | 6;
        themeColor: string;
    },
): Promise<void> {
    await page.getByRole('button', { name: 'Ir para o Início' }).click();
    await expect(page.getByRole('heading', { name: options.heading, level: options.headingLevel })).toBeVisible({ timeout: 10_000 });
    await expect.poll(async () => page.title()).toBe(options.title);
    await expect
        .poll(async () => page.evaluate(() => ({
            themeColor: document.querySelector('meta[name="theme-color"]')?.getAttribute('content')?.toLowerCase() ?? null,
            appleTitle: document.querySelector('meta[name="apple-mobile-web-app-title"]')?.getAttribute('content') ?? null,
            msTileColor: document.querySelector('meta[name="msapplication-TileColor"]')?.getAttribute('content')?.toLowerCase() ?? null,
        })))
        .toEqual({
            themeColor: options.themeColor,
            appleTitle: options.title,
            msTileColor: options.themeColor,
        });
}

test.describe('REG-WL-SHELL-001 — Metadados do shell acompanham a marca ativa', () => {
    test('trocar entre Kaboo e Central Coruja atualiza título e metas fora do admin', async ({ page }) => {
        await openWhiteLabelAsAdmin(page);

        await page.getByRole('button', { name: 'Central Coruja' }).click();
        await expect(page.getByText('central-coruja')).toBeVisible({ timeout: 10_000 });
        await expect(page.getByText(/Contexto alterado.*Central Coruja/i)).toBeVisible({ timeout: 5_000 });
        await expectBrandShell(page, {
            title: 'Central Coruja',
            heading: 'Bem-vindo à Central Coruja!',
            headingLevel: 2,
            themeColor: '#0c1a34',
        });

        await returnToWhiteLabelFromHome(page);
        await page.getByRole('button', { name: 'Mundo de Kaboo' }).click();
        await expect(page.getByText('kaboo').first()).toBeVisible({ timeout: 10_000 });
        await expect(page.getByText(/Contexto alterado.*Mundo de Kaboo/i)).toBeVisible({ timeout: 5_000 });
        await expectBrandShell(page, {
            title: 'Mundo de Kaboo',
            heading: 'Bem-vindo ao Mundo de Kaboo!',
            headingLevel: 2,
            themeColor: '#5d1f58',
        });
    });
});
