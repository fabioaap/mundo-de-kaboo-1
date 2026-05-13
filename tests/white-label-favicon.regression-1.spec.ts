import { test, expect, Page } from '@playwright/test';
import { setupAdminSession } from './fixtures/auth';
import { navigateToWhiteLabel, waitForAuthenticatedScreen } from './helpers/navigation';

// Regression: ISSUE-001 — favicon e apple touch icon não acompanhavam a troca de marca
// Found by /qa on 2026-05-13
// Report: .gstack/qa-reports/qa-report-127-0-0-1-2026-05-13.md

async function openWhiteLabel(page: Page): Promise<void> {
    await setupAdminSession(page);
    await waitForAuthenticatedScreen(page);
    await navigateToWhiteLabel(page);
}

async function expectShellIconsToMatchBrandLogo(
    page: Page,
    brandName: 'Mundo de Kaboo' | 'Central Coruja',
): Promise<void> {
    await expect(page.getByRole('button', { name: brandName })).toBeVisible({ timeout: 10_000 });

    const shellAssets = await page.evaluate(() => ({
        logoSrc: document.querySelector('button[aria-label="Ir para o Início"] img')?.getAttribute('src') ?? null,
        faviconHref: document.querySelector('link[rel="icon"]')?.getAttribute('href') ?? null,
        appleTouchHref: document.querySelector('link[rel="apple-touch-icon"]')?.getAttribute('href') ?? null,
    }));

    expect(shellAssets.logoSrc).toBeTruthy();
    expect(shellAssets.faviconHref).toBe(shellAssets.logoSrc);
    expect(shellAssets.appleTouchHref).toBe(shellAssets.logoSrc);
}

test.describe('REG-WL-FAVICON-001 — Ícones do shell acompanham a marca ativa', () => {
    test('trocar entre Kaboo e Central Coruja sincroniza favicon com o logo atual', async ({ page }) => {
        await openWhiteLabel(page);

        await expectShellIconsToMatchBrandLogo(page, 'Mundo de Kaboo');

        await page.getByRole('button', { name: 'Central Coruja' }).click();
        await expect(page.getByText(/Contexto alterado.*Central Coruja/i)).toBeVisible({ timeout: 5_000 });
        await expectShellIconsToMatchBrandLogo(page, 'Central Coruja');

        await page.getByRole('button', { name: 'Mundo de Kaboo' }).click();
        await expect(page.getByText(/Contexto alterado.*Mundo de Kaboo/i)).toBeVisible({ timeout: 5_000 });
        await expectShellIconsToMatchBrandLogo(page, 'Mundo de Kaboo');
    });
});
