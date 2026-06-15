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
});
