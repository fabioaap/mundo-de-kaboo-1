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

const GRANTS_STORAGE_KEY = 'kaboo_mock_user_content_grants';
const VIEWER_USER_ID = 'mock-viewer-e2e';
const VIEWER_SESSION_ID = 'session_e2e_viewer_grants';

type SetupViewerSessionWithGrantsOptions = {
    userId?: string;
    sessionId?: string;
    email?: string;
    fullName?: string;
    grantedCollectionIds: string[];
    voucherId?: string;
    navState?: Record<string, unknown>;
    initialUrl?: string;
};

/**
 * Seeds a MOCK viewer session (role 'viewer', active) plus a content-grants array so
 * the user only has access to the granted collections. Used by the voucher-upsell E2E.
 */
export async function setupViewerSessionWithGrants(
    page: Page,
    options: SetupViewerSessionWithGrantsOptions,
): Promise<void> {
    const now = new Date().toISOString();
    const futureDate = new Date(Date.now() + 90 * 24 * 60 * 60 * 1000).toISOString();
    const userId = options.userId || VIEWER_USER_ID;
    const sessionId = options.sessionId || VIEWER_SESSION_ID;
    const email = options.email || 'viewer-e2e@mundodekaboo.local';
    const fullName = options.fullName || 'Viewer Degustacao';
    const voucherId = options.voucherId || 'voucher-e2e-grant';
    const navState = options.navState || { currentScreen: 'home' };
    const initialUrl = options.initialUrl || '/#home';

    const profile = {
        id: userId,
        full_name: fullName,
        email,
        avatar_id: 'Kaboo',
        role: 'viewer',
        voucher_id: voucherId,
        access_starts_at: now,
        access_expires_at: futureDate,
        access_status: 'active',
        created_by: null,
    };

    const users = [
        {
            id: userId,
            email,
            password: 'viewer123',
            role: 'viewer',
            created_at: now,
            invited_at: null,
            confirmed_at: now,
            last_sign_in_at: now,
            profile,
        },
    ];

    const grants = options.grantedCollectionIds.map((collectionId, index) => ({
        id: `grant-e2e-${index}`,
        user_id: userId,
        collection_id: collectionId,
        voucher_id: voucherId,
        granted_at: now,
        expires_at: null,
    }));

    await page.addInitScript(
        ({
            sessionId,
            userId,
            usersJson,
            profileCacheJson,
            grantsJson,
            navStateJson,
            grantsKey,
        }) => {
            window.sessionStorage.setItem('kaboo_session_id', sessionId);
            window.sessionStorage.setItem('kaboo_dev_mock_session', '1');
            window.sessionStorage.setItem('kaboo_mock_session_user_id', userId);
            window.localStorage.setItem('kaboo_mock_session_user_id', userId);
            window.localStorage.setItem('kaboo_mock_users', usersJson);
            window.sessionStorage.setItem('kaboo_profile_cache', profileCacheJson);
            window.localStorage.setItem(grantsKey, grantsJson);
            window.localStorage.setItem('kaboo_nav_state', navStateJson);
        },
        {
            sessionId,
            userId,
            usersJson: JSON.stringify(users),
            profileCacheJson: JSON.stringify({
                profile,
                userId,
                sessionId,
                timestamp: Date.now(),
            }),
            grantsJson: JSON.stringify(grants),
            navStateJson: JSON.stringify(navState),
            grantsKey: GRANTS_STORAGE_KEY,
        },
    );

    await page.goto(initialUrl);
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
