import { test, expect, Page } from '@playwright/test';
import { setupOperationalSession } from './fixtures/auth';

// Regression: WL-SHELL-001 — browser title e metas do app shell não acompanhavam a troca de marca
// Found by /qa on 2026-05-13
// Report: manual repro em http://127.0.0.1:4100/#admin -> White Label -> Home
//
// Reescrito single-brand (2026-06-15): o seletor de marca foi removido do admin. A
// regressão (título/metas do shell = marca ativa) é validada carregando cada marca
// diretamente na Home, em vez de alternar dentro do painel.

async function loadHomeForBrand(page: Page, brandSlug: 'kaboo' | 'central-coruja'): Promise<void> {
    await setupOperationalSession(page, {
        role: 'admin',
        brandSlug,
        navState: { currentScreen: 'home' },
        initialUrl: brandSlug === 'central-coruja' ? '/?brand=central-coruja#home' : '/#home',
    });
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
    test('shell da Central Coruja tem título e metas próprios', async ({ page }) => {
        await loadHomeForBrand(page, 'central-coruja');
        await expectBrandShell(page, {
            title: 'Central Coruja',
            heading: 'Bem-vindo à Central Coruja!',
            headingLevel: 2,
            themeColor: '#0c1a34',
        });
    });

    test('shell do Mundo de Kaboo tem título e metas próprios', async ({ page }) => {
        await loadHomeForBrand(page, 'kaboo');
        await expectBrandShell(page, {
            title: 'Mundo de Kaboo',
            heading: 'Bem-vindo ao Mundo de Kaboo!',
            headingLevel: 2,
            themeColor: '#5d1f58',
        });
    });
});
