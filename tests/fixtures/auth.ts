// tests/fixtures/auth.ts
import { Page } from '@playwright/test';

export const TEST_USERS = {
    admin: {
        email: 'demo@mundodekaboo.local',
        password: '123456',
    },
};

const MOCK_USERS_STORAGE_KEY = 'kaboo_mock_users';
const MOCK_SESSION_STORAGE_KEY = 'kaboo_mock_session_user_id';
const DEV_MOCK_SESSION_KEY = 'kaboo_dev_mock_session';
const PROFILE_CACHE_KEY = 'kaboo_profile_cache';
const SESSION_STORAGE_KEY = 'kaboo_session_id';
const ADMIN_SESSION_ID = 'session_e2e_shared_admin';
const ADMIN_USER_ID = 'mock-admin';

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
    const profile = users[0].profile;

    await page.addInitScript(
        ({
            sessionId,
            sessionStorageKey,
            devMockSessionKey,
            mockSessionStorageKey,
            mockUsersStorageKey,
            profileCacheKey,
            userId,
            usersJson,
            profileCacheJson,
        }) => {
            window.sessionStorage.setItem(sessionStorageKey, sessionId);
            window.sessionStorage.setItem(devMockSessionKey, '1');
            window.sessionStorage.setItem(mockSessionStorageKey, userId);
            window.localStorage.setItem(mockSessionStorageKey, userId);
            window.localStorage.setItem(mockUsersStorageKey, usersJson);
            window.sessionStorage.setItem(profileCacheKey, profileCacheJson);
        },
        {
            sessionId: ADMIN_SESSION_ID,
            sessionStorageKey: SESSION_STORAGE_KEY,
            devMockSessionKey: DEV_MOCK_SESSION_KEY,
            mockSessionStorageKey: MOCK_SESSION_STORAGE_KEY,
            mockUsersStorageKey: MOCK_USERS_STORAGE_KEY,
            profileCacheKey: PROFILE_CACHE_KEY,
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

    await page.goto('/#home');
}
