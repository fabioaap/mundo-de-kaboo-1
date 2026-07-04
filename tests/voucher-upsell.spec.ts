import { expect, test } from '@playwright/test';
import { setupViewerSessionWithGrants } from './fixtures/auth';

// Real MOCK collections that render on the Home grid (from data/catalog.seed.json).
// A = granted (covered by the viewer's voucher); B = locked (NOT covered → upsell).
const COLLECTION_A = {
    id: '784b3238-0916-4922-af3c-8627d74cc16c',
    title: 'Kaboo e a Carta Misteriosa',
};
const COLLECTION_B = {
    id: 'c6334710-6117-426f-995c-07be8d87d872',
    title: 'Mensageiro e a Canção Certa',
};
// C = a second locked collection (also NOT covered), used to prove the upsell
// modal re-scopes correctly instead of leaking state from a prior trigger.
const COLLECTION_C = {
    id: '6a93b60f-b4e9-4fe6-9fed-7c6f7391745c',
    title: 'Baratinha e Baratão no Labirinto do Eco',
};

const UPSELL_HEADING = 'Material não incluído';
const BUY_BUTTON = 'Comprar na loja';

test.describe('Voucher upsell gate — VIEWER with partial grants', () => {
    test('clicking a NOT-covered collection (B) shows the upsell modal', async ({ page }) => {
        await setupViewerSessionWithGrants(page, {
            grantedCollectionIds: [COLLECTION_A.id],
        });

        // Home grid renders; wait for the locked card (B) to be present.
        const lockedCardTitle = page.getByText(COLLECTION_B.title, { exact: true }).first();
        await expect(lockedCardTitle).toBeVisible({ timeout: 15_000 });

        await lockedCardTitle.click();

        // The upsell modal must replace the content.
        await expect(
            page.getByRole('dialog', { name: 'Material não incluído no seu acesso' }),
        ).toBeVisible({ timeout: 10_000 });
        await expect(page.getByText(UPSELL_HEADING, { exact: true })).toBeVisible();
        await expect(page.getByRole('button', { name: BUY_BUTTON })).toBeVisible();
    });

    test('clicking a covered collection (A) opens details, NOT the upsell modal', async ({ page }) => {
        await setupViewerSessionWithGrants(page, {
            grantedCollectionIds: [COLLECTION_A.id],
        });

        const grantedCardTitle = page.getByText(COLLECTION_A.title, { exact: true }).first();
        await expect(grantedCardTitle).toBeVisible({ timeout: 15_000 });

        await grantedCardTitle.click();

        // The collection details modal opens (collectionId in the hash), and no upsell.
        await expect
            .poll(async () => new URL(await page.url()).hash, { timeout: 10_000 })
            .toContain(`collectionId=${COLLECTION_A.id}`);

        await expect(
            page.getByRole('dialog', { name: 'Material não incluído no seu acesso' }),
        ).toHaveCount(0);
        await expect(page.getByRole('button', { name: BUY_BUTTON })).toHaveCount(0);
    });

    test('clicking "Comprar na loja" opens the store URL in a new tab', async ({ page, context }) => {
        await setupViewerSessionWithGrants(page, {
            grantedCollectionIds: [COLLECTION_A.id],
        });

        const lockedCardTitle = page.getByText(COLLECTION_B.title, { exact: true }).first();
        await expect(lockedCardTitle).toBeVisible({ timeout: 15_000 });

        await lockedCardTitle.click();

        await expect(
            page.getByRole('dialog', { name: 'Material não incluído no seu acesso' }),
        ).toBeVisible({ timeout: 10_000 });

        // storeUrl is brand/config-driven (brandBootstrap.settings.store_url, falling back to
        // a per-brand constant) — not a fixed value the test can assert statically. Assert the
        // new-tab navigation itself, not a specific URL.
        const [newPage] = await Promise.all([
            context.waitForEvent('page'),
            page.getByRole('button', { name: BUY_BUTTON }).click(),
        ]);
        await newPage.waitForLoadState('domcontentloaded').catch(() => {});
        expect(newPage.url()).not.toBe('about:blank');
    });

    test('dismissing the modal and clicking a different locked collection (C) re-opens it scoped to C', async ({ page }) => {
        await setupViewerSessionWithGrants(page, {
            grantedCollectionIds: [COLLECTION_A.id],
        });

        const lockedCardTitleB = page.getByText(COLLECTION_B.title, { exact: true }).first();
        await expect(lockedCardTitleB).toBeVisible({ timeout: 15_000 });
        await lockedCardTitleB.click();

        const upsellDialog = page.getByRole('dialog', { name: 'Material não incluído no seu acesso' });
        await expect(upsellDialog).toBeVisible({ timeout: 10_000 });

        await page.getByRole('button', { name: 'Fechar' }).click();
        await expect(upsellDialog).toHaveCount(0);

        const lockedCardTitleC = page.getByText(COLLECTION_C.title, { exact: true }).first();
        await expect(lockedCardTitleC).toBeVisible({ timeout: 15_000 });
        await lockedCardTitleC.click();

        // The modal reopens — must be scoped to C, not stale content from B.
        await expect(upsellDialog).toBeVisible({ timeout: 10_000 });
        await expect(page.getByText(UPSELL_HEADING, { exact: true })).toBeVisible();
        await expect(page.getByText(COLLECTION_B.title, { exact: true })).toHaveCount(0);
    });
});
