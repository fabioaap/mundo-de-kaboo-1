import { test, expect, Page } from '@playwright/test';
import { setupOperationalSession } from './fixtures/auth';

// Regression: ISSUE-001 — favicon e apple touch icon não acompanhavam a troca de marca
// Found by /qa on 2026-05-13
// Report: .gstack/qa-reports/qa-report-127-0-0-1-2026-05-13.md
//
// Reescrito single-brand (2026-06-15): o seletor de marca foi removido do admin. A
// regressão (ícones do shell = logo da marca ativa) é validada carregando cada marca
// diretamente na Home, em vez de alternar dentro do painel.

async function loadHomeForBrand(page: Page, brandSlug: 'kaboo' | 'central-coruja'): Promise<void> {
    await setupOperationalSession(page, {
        role: 'admin',
        brandSlug,
        navState: { currentScreen: 'home' },
        initialUrl: brandSlug === 'central-coruja' ? '/?brand=central-coruja#home' : '/#home',
    });
}

async function expectShellIconsToMatchBrandLogo(page: Page): Promise<void> {
    await page.locator('button[aria-label="Ir para o Início"] img').first().waitFor({ state: 'visible', timeout: 10_000 });

    await expect
        .poll(async () => page.evaluate(() => {
            const logoSrc = document.querySelector('button[aria-label="Ir para o Início"] img')?.getAttribute('src') ?? null;
            const faviconHref = document.querySelector('link[rel="icon"]')?.getAttribute('href') ?? null;
            const appleTouchHref = document.querySelector('link[rel="apple-touch-icon"]')?.getAttribute('href') ?? null;
            return { logoSrc, faviconHref, appleTouchHref };
        }))
        .toMatchObject({
            logoSrc: expect.stringMatching(/.+/),
        });

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
    test('favicon e apple-touch-icon casam com o logo da marca Kaboo', async ({ page }) => {
        await loadHomeForBrand(page, 'kaboo');
        await expect(page.getByRole('heading', { name: 'Bem-vindo ao Mundo de Kaboo!' })).toBeVisible({ timeout: 10_000 });
        await expectShellIconsToMatchBrandLogo(page);
    });

    test('favicon e apple-touch-icon casam com o logo da Central Coruja', async ({ page }) => {
        await loadHomeForBrand(page, 'central-coruja');
        await expect(page.getByRole('heading', { name: 'Bem-vindo à Central Coruja!' })).toBeVisible({ timeout: 10_000 });
        await expectShellIconsToMatchBrandLogo(page);
    });
});
