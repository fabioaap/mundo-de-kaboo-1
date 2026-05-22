// tests/fixtures/auth.ts
import { Page } from '@playwright/test';

export const TEST_USERS = {
    admin: {
        email: 'demo@mundodekaboo.local',
        password: '123456',
    },
    editor: {
        email: 'editor@mundodekaboo.local',
        password: 'editor123',
    },
};

const MOCK_USERS_STORAGE_KEY = 'kaboo_mock_users';
const MOCK_SESSION_STORAGE_KEY = 'kaboo_mock_session_user_id';
const DEV_MOCK_SESSION_KEY = 'kaboo_dev_mock_session';
const PROFILE_CACHE_KEY = 'kaboo_profile_cache';
const SESSION_STORAGE_KEY = 'kaboo_session_id';
const ADMIN_SESSION_ID = 'session_e2e_shared_admin';
const ADMIN_USER_ID = 'mock-admin';

type OperationalRole = 'admin' | 'editor';

type SetupOperationalSessionOptions = {
    role: OperationalRole;
    brandSlug?: 'kaboo' | 'central-coruja';
    sessionId?: string;
    userId?: string;
    fullName?: string;
    email?: string;
    password?: string;
    navState?: Record<string, unknown>;
    initialUrl?: string;
};

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

function buildOperationalUser(now: string, futureDate: string, options: SetupOperationalSessionOptions) {
    const userId = options.userId || (options.role === 'admin' ? ADMIN_USER_ID : 'mock-editor');
    const email = options.email || TEST_USERS[options.role].email;
    const password = options.password || TEST_USERS[options.role].password;
    const fullName = options.fullName || (options.role === 'admin' ? 'Demo Admin' : 'Lia Editora');

    return {
        id: userId,
        email,
        password,
        role: options.role,
        created_at: now,
        profile: {
            id: userId,
            full_name: fullName,
            email,
            avatar_id: 'Kaboo',
            role: options.role,
            voucher_id: null,
            access_starts_at: now,
            access_expires_at: futureDate,
            access_status: 'active',
        },
    };
}

export async function setupOperationalSession(
    page: Page,
    options: SetupOperationalSessionOptions,
): Promise<void> {
    const now = new Date().toISOString();
    const futureDate = new Date(Date.now() + 90 * 24 * 60 * 60 * 1000).toISOString();
    const user = buildOperationalUser(now, futureDate, options);
    const users = options.role === 'admin' && !options.userId && !options.fullName && !options.email && !options.password
        ? buildMockUsers(now, futureDate)
        : [user];
    const profile = users[0].profile;
    const sessionId = options.sessionId || (options.role === 'admin' ? ADMIN_SESSION_ID : 'session_e2e_shared_editor');
    const brandSlug = options.brandSlug || 'kaboo';
    const navState = options.navState || { currentScreen: 'home' };
    const initialUrl = options.initialUrl
        || (brandSlug === 'central-coruja'
            ? `/?brand=central-coruja#${String(navState.currentScreen || 'home')}`
            : '/#home');

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
            brandSlug,
            navStateJson,
        }) => {
            window.sessionStorage.setItem(sessionStorageKey, sessionId);
            window.sessionStorage.setItem(devMockSessionKey, '1');
            window.sessionStorage.setItem(mockSessionStorageKey, userId);
            window.localStorage.setItem(mockSessionStorageKey, userId);
            window.localStorage.setItem(mockUsersStorageKey, usersJson);
            window.sessionStorage.setItem(profileCacheKey, profileCacheJson);
            window.localStorage.setItem(
                'kaboo:white-label-preview-settings',
                JSON.stringify({
                    activeBrandId: brandSlug,
                    previewEnabled: brandSlug !== 'kaboo',
                }),
            );
            window.localStorage.setItem('kaboo_nav_state', navStateJson);
        },
        {
            sessionId,
            sessionStorageKey: SESSION_STORAGE_KEY,
            devMockSessionKey: DEV_MOCK_SESSION_KEY,
            mockSessionStorageKey: MOCK_SESSION_STORAGE_KEY,
            mockUsersStorageKey: MOCK_USERS_STORAGE_KEY,
            profileCacheKey: PROFILE_CACHE_KEY,
            userId: user.id,
            usersJson: JSON.stringify(users),
            profileCacheJson: JSON.stringify({
                profile,
                userId: user.id,
                sessionId,
                timestamp: Date.now(),
            }),
            brandSlug,
            navStateJson: JSON.stringify(navState),
        },
    );

    await page.goto(initialUrl);
}

export async function setupAdminSession(page: Page): Promise<void> {
    await setupOperationalSession(page, {
        role: 'admin',
        brandSlug: 'kaboo',
        navState: { currentScreen: 'home' },
        initialUrl: '/#home',
    });
}

export async function setupCentralCorujaEditorSession(
    page: Page,
    options?: {
        navState?: Record<string, unknown>;
        initialUrl?: string;
        fullName?: string;
        email?: string;
    },
): Promise<void> {
    const navState = options?.navState || { currentScreen: 'admin' };

    await setupOperationalSession(page, {
        role: 'editor',
        brandSlug: 'central-coruja',
        fullName: options?.fullName || 'Lia Editora',
        email: options?.email || TEST_USERS.editor.email,
        navState,
        initialUrl: options?.initialUrl
            || `/?brand=central-coruja#${String(navState.currentScreen || 'admin')}`,
    });
}
