// tests/fixtures/auth.ts
import { Page } from '@playwright/test';

export const TEST_USERS = {
    admin: {
        email: 'demo@mundodekaboo.local',
        password: '123456',
    },
};

const MOCK_USERS_STORAGE_KEY = 'kaboo_mock_users';

function buildMockUsers(now: string, futureDate: string) {
    return [
        {
            id: 'mock-admin',
            email: 'demo@mundodekaboo.local',
            password: '123456',
            role: 'admin',
            created_at: now,
            profile: {
                id: 'mock-admin',
                full_name: 'Demo Admin',
                email: 'demo@mundodekaboo.local',
                avatar_id: 'Kaboo',
                role: 'admin',
                voucher_id: null,
                access_starts_at: now,
                access_expires_at: futureDate,
                access_status: 'active',
            },
        },
    ];
}

export async function setupAdminSession(page: Page): Promise<void> {
    const now = new Date().toISOString();
    const futureDate = new Date(Date.now() + 90 * 24 * 60 * 60 * 1000).toISOString();
    const users = buildMockUsers(now, futureDate);

    await page.goto('/');
    await page.locator('#field-email').waitFor({ state: 'visible', timeout: 15_000 });
    await page.evaluate(
        ({ key, usersJson }) => { localStorage.setItem(key, usersJson); },
        { key: MOCK_USERS_STORAGE_KEY, usersJson: JSON.stringify(users) },
    );
    await page.reload();
    await page.locator('#field-email').waitFor({ state: 'visible', timeout: 15_000 });
    await page.locator('#field-email').fill(TEST_USERS.admin.email);
    await page.locator('#field-password').fill(TEST_USERS.admin.password);
    await page.getByRole('button', { name: 'Entrar' }).click();
}
