import { expect, Page, test } from '@playwright/test';

const PROTECTED_SCREENS = [
    'home',
    'search',
    'videos',
    'music',
    'formations',
    'materials',
    'profile',
    'my_data',
    'player_book',
    'player_audio',
    'player_video',
    'tools',
    'support',
    'admin',
];

const ADMIN_SESSION_ID = 'session_e2e_auth_guard_admin';
const ADMIN_USER_ID = 'mock-admin';

async function seedAdminMockSession(page: Page): Promise<void> {
    const now = new Date().toISOString();
    const futureDate = new Date(Date.now() + 90 * 24 * 60 * 60 * 1000).toISOString();
    const profile = {
        id: ADMIN_USER_ID,
        full_name: 'Demo Admin',
        email: 'demo@mundodekaboo.local',
        avatar_id: 'Kaboo',
        role: 'admin',
        voucher_id: null,
        access_starts_at: now,
        access_expires_at: futureDate,
        access_status: 'active',
        created_by: null,
    };
    const users = [{
        id: ADMIN_USER_ID,
        email: 'demo@mundodekaboo.local',
        password: '123456',
        role: 'admin',
        created_at: now,
        invited_at: null,
        confirmed_at: now,
        last_sign_in_at: now,
        profile,
    }];

    await page.addInitScript(
        ({ sessionId, userId, usersJson, profileCacheJson }) => {
            window.sessionStorage.setItem('kaboo_session_id', sessionId);
            window.sessionStorage.setItem('kaboo_dev_mock_session', '1');
            window.sessionStorage.setItem('kaboo_mock_session_user_id', userId);
            window.localStorage.setItem('kaboo_mock_session_user_id', userId);
            window.localStorage.setItem('kaboo_mock_users', usersJson);
            window.sessionStorage.setItem('kaboo_profile_cache', profileCacheJson);
        },
        {
            sessionId: ADMIN_SESSION_ID,
            userId: ADMIN_USER_ID,
            usersJson: JSON.stringify(users),
            profileCacheJson: JSON.stringify({
                profile,
                userId: ADMIN_USER_ID,
                sessionId: ADMIN_SESSION_ID,
                timestamp: Date.now(),
            }),
        },
    );
}

// Regression: AUTH-GUARD-001 — após logout, acessar #home reabria shell protegida com menus incoerentes
// Found during local main/worktree parity check on 2026-05-20

test.describe('REG-AUTH-GUARD-001 — rotas protegidas sem sessão voltam para entrada pública', () => {
    test('logout seguido de acesso direto a home não reabre shell autenticada', async ({ page }) => {
        await seedAdminMockSession(page);

        await page.goto('/?brand=central-coruja#home');
        await expect(page.getByRole('heading', { name: 'Bem-vindo à Central Coruja!' })).toBeVisible({ timeout: 10_000 });

        await page.getByRole('button', { name: /Abrir perfil/i }).click();
        await page.getByRole('button', { name: 'Sair do App' }).click();
        await page.getByRole('button', { name: 'Sair', exact: true }).click();

        await expect(page.getByRole('heading', { name: 'Bem-vindo de volta!' })).toBeVisible({ timeout: 10_000 });

        await page.goto('/?brand=central-coruja#home');

        await expect
            .poll(async () => {
                const url = await page.url();
                return /#home(?:$|&)/.test(new URL(url).hash);
            })
            .toBe(false);

        await expect
            .poll(async () => page.evaluate((protectedScreens) => {
                const raw = window.localStorage.getItem('kaboo_nav_state');
                if (!raw) {
                    return true;
                }

                try {
                    const state = JSON.parse(raw) as { currentScreen?: string };
                    return !protectedScreens.includes(state.currentScreen ?? '');
                } catch {
                    return false;
                }
            }, PROTECTED_SCREENS))
            .toBe(true);

        const publicHeading = page
            .getByRole('heading', { name: /Escolha qual ambiente do ecossistema|Bem-vindo de volta!/i })
            .first();
        await expect(publicHeading).toBeVisible({ timeout: 10_000 });
        await expect(page.getByRole('button', { name: 'Gerenciar' })).toHaveCount(0);
    });
});