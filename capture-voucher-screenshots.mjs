/**
 * One-off capture script for the Voucher journey wiki tutorial.
 *
 * Runs a DEDICATED vite dev server in MOCK mode (empty Supabase env) on port 4399
 * so it never touches the live dev/preview server on 4100. Seeds an admin session
 * and a viewer-with-grants session (same approach as tests/fixtures/auth.ts), drives
 * the UI, and writes PNGs to docs/static/screenshots/ at 1440x900 to match the
 * existing journey screenshots.
 *
 * Usage: node capture-voucher-screenshots.mjs
 */
import { spawn } from 'node:child_process';
import { setTimeout as sleep } from 'node:timers/promises';
import { chromium } from '@playwright/test';

const PORT = 4399;
const BASE = `http://127.0.0.1:${PORT}`;
const OUT = 'docs/static/screenshots';
const VIEWPORT = { width: 1440, height: 900 };

// Mock collections that render on the Home grid (from data/catalog.seed.json),
// reused from tests/voucher-upsell.spec.ts.
const COLLECTION_A = { id: '784b3238-0916-4922-af3c-8627d74cc16c', title: 'Kaboo e a Carta Misteriosa' }; // granted
const COLLECTION_B = { id: 'c6334710-6117-426f-995c-07be8d87d872', title: 'Mensageiro e a Canção Certa' }; // locked

const now = new Date().toISOString();
const future = new Date(Date.now() + 90 * 864e5).toISOString();

function adminSeed() {
    const profile = {
        id: 'mock-admin', full_name: 'Demo Admin', email: 'demo@mundodekaboo.local',
        avatar_id: 'Kaboo', role: 'admin', voucher_id: null,
        access_starts_at: now, access_expires_at: future, access_status: 'active',
    };
    const users = [{ id: 'mock-admin', email: profile.email, password: '123456', role: 'admin', created_at: now, profile }];
    return { sessionId: 'session_e2e_shared_admin', userId: 'mock-admin', users, profile };
}

function viewerSeed(grantedIds) {
    const profile = {
        id: 'mock-viewer-e2e', full_name: 'Viewer Degustacao', email: 'viewer-e2e@mundodekaboo.local',
        avatar_id: 'Kaboo', role: 'viewer', voucher_id: 'voucher-e2e-grant',
        access_starts_at: now, access_expires_at: future, access_status: 'active', created_by: null,
    };
    const users = [{ id: profile.id, email: profile.email, password: 'viewer123', role: 'viewer', created_at: now, confirmed_at: now, last_sign_in_at: now, profile }];
    const grants = grantedIds.map((collection_id, i) => ({ id: `grant-e2e-${i}`, user_id: profile.id, collection_id, voucher_id: profile.voucher_id, granted_at: now, expires_at: null }));
    return { sessionId: 'session_e2e_viewer_grants', userId: profile.id, users, profile, grants };
}

async function applySeed(page, seed, { grants } = {}) {
    await page.addInitScript((s) => {
        sessionStorage.setItem('kaboo_session_id', s.sessionId);
        sessionStorage.setItem('kaboo_dev_mock_session', '1');
        sessionStorage.setItem('kaboo_mock_session_user_id', s.userId);
        localStorage.setItem('kaboo_mock_session_user_id', s.userId);
        localStorage.setItem('kaboo_mock_users', JSON.stringify(s.users));
        sessionStorage.setItem('kaboo_profile_cache', JSON.stringify({ profile: s.profile, userId: s.userId, sessionId: s.sessionId, timestamp: Date.now() }));
        localStorage.setItem('kaboo:white-label-preview-settings', JSON.stringify({ activeBrandId: 'kaboo', previewEnabled: false }));
        localStorage.setItem('kaboo_nav_state', JSON.stringify({ currentScreen: 'home' }));
        localStorage.setItem('kaboo_vouchers_onboarding_v1', JSON.stringify({ dismissedAt: new Date().toISOString() }));
        if (s.grants) localStorage.setItem('kaboo_mock_user_content_grants', JSON.stringify(s.grants));
    }, seed);
}

async function waitForServer(url, timeoutMs = 90_000) {
    const start = Date.now();
    while (Date.now() - start < timeoutMs) {
        try { const r = await fetch(url); if (r.ok || r.status === 200) return true; } catch { /* not up yet */ }
        await sleep(800);
    }
    throw new Error(`Server not ready at ${url}`);
}

async function shot(page, name) {
    await sleep(700);
    await page.screenshot({ path: `${OUT}/${name}.png` });
    console.log('  captured', name);
}

// The admin SPA reads the module from in-app nav, not just the hash — clicking the
// "Vouchers" sidebar item is what actually switches the module.
async function gotoVouchersModule(page) {
    await page.goto('/#admin?module=vouchers');
    await sleep(1200);
    const nav = page.getByText('Vouchers', { exact: true }).first();
    if (await nav.isVisible().catch(() => false)) { await nav.click().catch(() => {}); }
    await sleep(1500);
}

async function main() {
    console.log('Starting mock-mode vite on', PORT);
    const server = spawn('npm', ['run', 'dev', '--', '--port', String(PORT), '--strictPort'], {
        env: { ...process.env, VITE_SUPABASE_URL: '', VITE_SUPABASE_ANON_KEY: '', VITE_BRAND_SLUG: 'kaboo' },
        stdio: 'inherit', shell: true,
    });

    try {
        await waitForServer(BASE);
        const browser = await chromium.launch();

        // ---------- ADMIN: create + emit voucher ----------
        {
            const ctx = await browser.newContext({ baseURL: BASE, viewport: VIEWPORT });
            const page = await ctx.newPage();
            await applySeed(page, adminSeed());
            await gotoVouchersModule(page);
            await shot(page, 'voucher-admin-01-lista');

            // Open "Novo modelo" wizard — Etapa 1 (onboarding já dispensado via seed)
            await page.getByRole('button', { name: 'Novo modelo' }).first().click().catch(() => {});
            await sleep(1000);
            await shot(page, 'voucher-admin-02-wizard-config');

            // Fill name + pick package + next
            const nameInput = page.locator('input[placeholder*="Kit"]').first();
            if (await nameInput.isVisible().catch(() => false)) await nameInput.fill('Degustação — 1 conteúdo');
            const pkg = page.getByRole('button', { name: /Coleção/ }).first();
            if (await pkg.isVisible().catch(() => false)) await pkg.click().catch(() => {});
            await page.getByRole('button', { name: /Próximo/ }).first().click().catch(() => {});
            await sleep(900);
            await shot(page, 'voucher-admin-03-wizard-conteudo');

            // Select the first content card, then go to review
            const firstCard = page.locator('button', { hasText: COLLECTION_A.title }).first();
            if (await firstCard.isVisible().catch(() => false)) await firstCard.click().catch(() => {});
            else {
                // fallback: click first selectable row in the content step
                const anyCard = page.locator('button').filter({ hasText: /Educação Infantil|Fundamental/ }).first();
                await anyCard.click().catch(() => {});
            }
            await sleep(500);
            await page.getByRole('button', { name: /Próximo/ }).first().click().catch(() => {});
            await sleep(900);
            await shot(page, 'voucher-admin-04-wizard-revisao');

            await ctx.close();
        }

        // ---------- ADMIN: emit batch from an existing mock model ----------
        {
            const ctx = await browser.newContext({ baseURL: BASE, viewport: VIEWPORT });
            const page = await ctx.newPage();
            await applySeed(page, adminSeed());
            await gotoVouchersModule(page);
            // open first model card in the list
            const modelCard = page.locator('button').filter({ hasText: /meses|item|itens/ }).first();
            if (await modelCard.isVisible().catch(() => false)) {
                await modelCard.click().catch(() => {});
                await sleep(1000);
                const emit = page.getByRole('button', { name: 'Emitir lote' }).first();
                if (await emit.isVisible().catch(() => false)) {
                    await emit.click().catch(() => {});
                    await sleep(800);
                    await shot(page, 'voucher-admin-05-emitir-lote');
                }
            }
            await ctx.close();
        }

        // ---------- END USER: locked home + upsell + granted content ----------
        {
            const ctx = await browser.newContext({ baseURL: BASE, viewport: VIEWPORT });
            const page = await ctx.newPage();
            await applySeed(page, viewerSeed([COLLECTION_A.id]), { grants: true });
            await page.goto('/#home');
            await sleep(2000);
            await shot(page, 'voucher-user-01-home');

            // Click a NOT-covered collection -> upsell modal
            const lockedCard = page.getByText(COLLECTION_B.title, { exact: true }).first();
            if (await lockedCard.isVisible().catch(() => false)) {
                await lockedCard.click().catch(() => {});
                await sleep(1200);
                await shot(page, 'voucher-user-02-upsell');
            }

            // Click the covered collection -> details (no upsell).
            // Force a full reload first: the upsell is React state and goto('/#home')
            // on the same URL is a no-op nav that would keep the previous modal open.
            await page.goto('/#home');
            await page.reload();
            await sleep(2500);
            const grantedCard = page.getByText(COLLECTION_A.title, { exact: true }).first();
            await grantedCard.waitFor({ state: 'visible', timeout: 15_000 }).catch(() => {});
            await grantedCard.click().catch(() => {});
            await page.waitForFunction(() => location.hash.includes('collectionId='), { timeout: 8000 }).catch(() => {});
            await sleep(1200);
            await shot(page, 'voucher-user-03-conteudo-liberado');
            await ctx.close();
        }

        await browser.close();
        console.log('DONE');
    } finally {
        server.kill('SIGTERM');
        await sleep(500);
    }
}

main().then(() => process.exit(0)).catch((e) => { console.error(e); process.exit(1); });
