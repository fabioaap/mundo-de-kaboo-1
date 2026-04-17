import catalogSeed from '../data/catalog.seed.json';
import {
    Collection,
    CollectionResource,
    UserProfile,
    UserRole,
    Voucher,
    VoucherRedemptionResult,
    VoucherValidationResult,
    VoucherDurationMonths
} from '../types';
import {
    calculateRenewedAccessExpiry,
    getProfileAccessStatus,
    getVoucherErrorMessage,
    normalizeVoucherCode
} from './access';
import { isPlaceholderImageUrl, placeholderImageUrl, resolveAppUrl } from './appPaths';
import { createGrantsFromRedemption } from './mockVoucherData';

interface CatalogSeed {
    metadata: {
        version: number;
        source: string;
        notes: string[];
        collections_count: number;
        collection_resources_count: number;
    };
    collections: Collection[];
    collection_resources: CollectionResource[];
}

interface MockUserAccount {
    id: string;
    email: string;
    password: string;
    role: UserRole;
    profile: UserProfile;
    created_at: string;
}

interface MockAuthResult {
    success: boolean;
    profile?: UserProfile;
    error?: string;
}

interface MockCreateUserInput {
    email: string;
    password: string;
    full_name: string;
    role?: UserRole;
    signIn?: boolean;
}

type StoredVoucher = Voucher & { model_id?: string; batch_id?: string };

const MOCK_USERS_STORAGE_KEY = 'kaboo_mock_users';
const MOCK_VOUCHERS_STORAGE_KEY = 'kaboo_mock_vouchers';
const MOCK_BATCH_VOUCHERS_STORAGE_KEY = 'kaboo_mock_batch_vouchers';
const MOCK_SESSION_STORAGE_KEY = 'kaboo_mock_session_user_id';
const MOCK_COLLECTIONS_STORAGE_KEY = 'kaboo_mock_collections';

const clone = <T,>(value: T): T => JSON.parse(JSON.stringify(value));

const seed = catalogSeed as CatalogSeed;

const normalizeCollectionAssetUrls = (collection: Collection): Collection => ({
    ...collection,
    cover_image: isPlaceholderImageUrl(collection.cover_image)
        ? placeholderImageUrl
        : resolveAppUrl(collection.cover_image || placeholderImageUrl),
});

const normalizeCollections = (collections: Collection[]): Collection[] => {
    return collections.map(normalizeCollectionAssetUrls);
};

const buildFutureDate = (months: VoucherDurationMonths): string => {
    const date = new Date();
    date.setMonth(date.getMonth() + months);
    return date.toISOString();
};

const buildProfile = (overrides: Partial<UserProfile>): UserProfile => ({
    id: overrides.id || `mock-user-${Date.now()}`,
    full_name: overrides.full_name ?? 'Professor(a)',
    email: overrides.email ?? null,
    avatar_id: overrides.avatar_id ?? 'Kaboo',
    role: overrides.role ?? 'viewer',
    voucher_id: overrides.voucher_id ?? null,
    access_starts_at: overrides.access_starts_at ?? null,
    access_expires_at: overrides.access_expires_at ?? null,
    access_status: overrides.access_status ?? 'pending_voucher'
});

const buildAdminDemoUser = (): MockUserAccount => {
    const id = 'mock-admin';
    return {
        id,
        email: 'demo@mundodekaboo.local',
        password: '123456',
        role: 'admin',
        created_at: new Date().toISOString(),
        profile: buildProfile({
            id,
            email: 'demo@mundodekaboo.local',
            full_name: 'Demo Admin',
            avatar_id: 'Kaboo',
            role: 'admin',
            voucher_id: null,
            access_starts_at: new Date().toISOString(),
            access_expires_at: buildFutureDate(12),
            access_status: 'active'
        })
    };
};

const DEFAULT_MOCK_USERS: MockUserAccount[] = [buildAdminDemoUser()];

const DEFAULT_MOCK_VOUCHERS: Voucher[] = [
    { id: 'voucher-1', code: 'KABOO-1MES-2026', duration_months: 1, status: 'active' },
    { id: 'voucher-livr-0001', code: 'KABOO-LIVR-0001', duration_months: 3, status: 'active' },
    { id: 'voucher-3', code: 'KABOO-3MESES-2026', duration_months: 3, status: 'active' },
    { id: 'voucher-6', code: 'KABOO-6MESES-2026', duration_months: 6, status: 'active' },
    { id: 'voucher-9', code: 'KABOO-9MESES-2026', duration_months: 9, status: 'active' },
    { id: 'voucher-12', code: 'KABOO-12MESES-2026', duration_months: 12, status: 'active' },
    { id: 'voucher-used', code: 'KABOO-USADO-2026', duration_months: 3, status: 'redeemed', consumed_at: new Date().toISOString(), consumed_by_user_id: 'mock-user-legacy' },
    { id: 'voucher-expired', code: 'KABOO-EXPIRADO-2026', duration_months: 1, status: 'active', expires_at: new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString() },
    { id: 'voucher-disabled', code: 'KABOO-BLOQUEADO-2026', duration_months: 6, status: 'disabled' }
];

const MOCK_COLLECTIONS: Collection[] = normalizeCollections(seed.collections);

const MOCK_COLLECTION_RESOURCES = seed.collection_resources.reduce<Record<string, CollectionResource[]>>((grouped, resource) => {
    const currentResources = grouped[resource.collection_id] || [];
    currentResources.push(resource);
    grouped[resource.collection_id] = currentResources;
    return grouped;
}, {});

const MOCK_USER_PROGRESS: Record<string, number> = {};

const normalizeEmail = (value: string): string => value.trim().toLowerCase();

const normalizeProfile = (profile: UserProfile): UserProfile => ({
    ...clone(profile),
    access_status: getProfileAccessStatus(profile)
});

const readStoredUsers = (): MockUserAccount[] | null => {
    if (typeof window === 'undefined') {
        return null;
    }

    try {
        const stored = localStorage.getItem(MOCK_USERS_STORAGE_KEY);
        return stored ? JSON.parse(stored) as MockUserAccount[] : null;
    } catch {
        return null;
    }
};

const writeStoredUsers = (users: MockUserAccount[]): void => {
    if (typeof window === 'undefined') {
        return;
    }

    localStorage.setItem(MOCK_USERS_STORAGE_KEY, JSON.stringify(users));
};

const getLiveUsers = (): MockUserAccount[] => {
    return readStoredUsers() ?? DEFAULT_MOCK_USERS;
};

const readStoredVouchers = (): Voucher[] | null => {
    if (typeof window === 'undefined') {
        return null;
    }

    try {
        const stored = localStorage.getItem(MOCK_VOUCHERS_STORAGE_KEY);
        return stored ? JSON.parse(stored) as Voucher[] : null;
    } catch {
        return null;
    }
};

const writeStoredVouchers = (vouchers: Voucher[]): void => {
    if (typeof window === 'undefined') {
        return;
    }

    localStorage.setItem(MOCK_VOUCHERS_STORAGE_KEY, JSON.stringify(vouchers));
};

const mergeDefaultVouchers = (storedVouchers: Voucher[] | null): Voucher[] => {
    if (!storedVouchers) {
        return DEFAULT_MOCK_VOUCHERS;
    }

    const knownCodes = new Set(storedVouchers.map((voucher) => normalizeVoucherCode(voucher.code)));
    const missingDefaults = DEFAULT_MOCK_VOUCHERS.filter(
        (voucher) => !knownCodes.has(normalizeVoucherCode(voucher.code))
    );

    if (missingDefaults.length === 0) {
        return storedVouchers;
    }

    const mergedVouchers = [...storedVouchers, ...missingDefaults];
    writeStoredVouchers(mergedVouchers);
    return mergedVouchers;
};

const getLiveVouchers = (): Voucher[] => {
    return mergeDefaultVouchers(readStoredVouchers());
};

const readStoredBatchVouchers = (): StoredVoucher[] | null => {
    if (typeof window === 'undefined') {
        return null;
    }

    try {
        const stored = localStorage.getItem(MOCK_BATCH_VOUCHERS_STORAGE_KEY);
        return stored ? JSON.parse(stored) as StoredVoucher[] : null;
    } catch {
        return null;
    }
};

const writeStoredBatchVouchers = (vouchers: StoredVoucher[]): void => {
    if (typeof window === 'undefined') {
        return;
    }

    localStorage.setItem(MOCK_BATCH_VOUCHERS_STORAGE_KEY, JSON.stringify(vouchers));
};

const getLiveBatchVouchers = (): StoredVoucher[] => {
    return readStoredBatchVouchers() ?? [];
};

const getValidatableVouchers = (): StoredVoucher[] => {
    return [...getLiveBatchVouchers(), ...getLiveVouchers()];
};

const updateStoredVoucherById = (
    voucherId: string,
    updater: (voucher: StoredVoucher) => StoredVoucher
): StoredVoucher | null => {
    const batchVouchers = getLiveBatchVouchers();
    const batchIndex = batchVouchers.findIndex((voucher) => voucher.id === voucherId);

    if (batchIndex !== -1) {
        const nextBatchVouchers = [...batchVouchers];
        nextBatchVouchers[batchIndex] = updater(nextBatchVouchers[batchIndex]);
        writeStoredBatchVouchers(nextBatchVouchers);
        return nextBatchVouchers[batchIndex];
    }

    const vouchers = getLiveVouchers();
    const voucherIndex = vouchers.findIndex((voucher) => voucher.id === voucherId);
    if (voucherIndex === -1) {
        return null;
    }

    const nextVouchers = [...vouchers];
    nextVouchers[voucherIndex] = updater(nextVouchers[voucherIndex]);
    writeStoredVouchers(nextVouchers);
    return nextVouchers[voucherIndex];
};

const readStoredSessionUserId = (): string | null => {
    if (typeof window === 'undefined') {
        return null;
    }

    return sessionStorage.getItem(MOCK_SESSION_STORAGE_KEY) || localStorage.getItem(MOCK_SESSION_STORAGE_KEY);
};

const writeStoredSessionUserId = (userId: string): void => {
    if (typeof window === 'undefined') {
        return;
    }

    sessionStorage.setItem(MOCK_SESSION_STORAGE_KEY, userId);
    localStorage.setItem(MOCK_SESSION_STORAGE_KEY, userId);
};

const clearStoredSessionUserId = (): void => {
    if (typeof window === 'undefined') {
        return;
    }

    sessionStorage.removeItem(MOCK_SESSION_STORAGE_KEY);
    localStorage.removeItem(MOCK_SESSION_STORAGE_KEY);
};

const getCurrentMockUserAccount = (): MockUserAccount | null => {
    const sessionUserId = readStoredSessionUserId();
    if (!sessionUserId) {
        return null;
    }

    return getLiveUsers().find((user) => user.id === sessionUserId) || null;
};

const writeUpdatedUser = (userId: string, updater: (user: MockUserAccount) => MockUserAccount): MockUserAccount | null => {
    const users = getLiveUsers();
    const userIndex = users.findIndex((user) => user.id === userId);
    if (userIndex === -1) {
        return null;
    }

    const nextUsers = [...users];
    nextUsers[userIndex] = updater(nextUsers[userIndex]);
    writeStoredUsers(nextUsers);
    return nextUsers[userIndex];
};

export const hasMockSession = (): boolean => {
    return Boolean(getCurrentMockUserAccount());
};

export const getMockCurrentUserId = (): string | null => {
    return getCurrentMockUserAccount()?.id || null;
};

export const getMockCurrentUserRole = (): UserRole => {
    return getCurrentMockUserAccount()?.role || 'viewer';
};

export const signInMockUser = (email: string, password: string): MockAuthResult => {
    const normalizedEmail = normalizeEmail(email);
    const user = getLiveUsers().find((candidate) => normalizeEmail(candidate.email) === normalizedEmail);

    if (!user || user.password !== password) {
        return {
            success: false,
            error: 'Invalid login credentials'
        };
    }

    writeStoredSessionUserId(user.id);
    return {
        success: true,
        profile: normalizeProfile({
            ...user.profile,
            email: user.email,
            role: user.role
        })
    };
};

export const signOutMockUser = (): void => {
    clearStoredSessionUserId();
};

export const createMockUser = (input: MockCreateUserInput): { success: boolean; error?: string; profile?: UserProfile; userId?: string } => {
    const normalizedEmail = normalizeEmail(input.email);
    if (getLiveUsers().some((user) => normalizeEmail(user.email) === normalizedEmail)) {
        return {
            success: false,
            error: 'User already registered'
        };
    }

    const role = input.role || 'viewer';
    const createdAt = new Date().toISOString();
    const userId = `mock-user-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;
    const profile = buildProfile({
        id: userId,
        email: normalizedEmail,
        full_name: input.full_name,
        avatar_id: 'Kaboo',
        role,
        access_status: role === 'viewer' ? 'pending_voucher' : 'active',
        access_starts_at: role === 'viewer' ? null : createdAt,
        access_expires_at: role === 'viewer' ? null : buildFutureDate(12),
        voucher_id: null
    });

    const nextUser: MockUserAccount = {
        id: userId,
        email: normalizedEmail,
        password: input.password,
        role,
        profile,
        created_at: createdAt
    };

    writeStoredUsers([...getLiveUsers(), nextUser]);

    if (input.signIn) {
        writeStoredSessionUserId(userId);
    }

    return {
        success: true,
        profile: normalizeProfile(profile),
        userId
    };
};

export const getMockCatalogMetadata = () => clone(seed.metadata);

export const getMockCollections = (): Collection[] => clone(MOCK_COLLECTIONS);

export const getMockCollectionById = (id: string): Collection | null => {
    const collection = MOCK_COLLECTIONS.find((item) => item.id === id);
    return collection ? clone(collection) : null;
};

export const getMockCollectionResources = (collectionId: string): CollectionResource[] => {
    return clone(MOCK_COLLECTION_RESOURCES[collectionId] || []);
};

export const getMockUserProgress = (): Record<string, number> => ({ ...MOCK_USER_PROGRESS });

export const getMockVoucherSamples = (): Voucher[] => clone(getLiveVouchers());

export const getMockAllUsers = (): UserProfile[] => {
    return getLiveUsers().map((user) => normalizeProfile({
        ...user.profile,
        email: user.email,
        role: user.role
    }));
};

export const updateMockUserById = (
    userId: string,
    updates: { full_name?: string; role?: UserRole }
): UserProfile | null => {
    const updatedUser = writeUpdatedUser(userId, (user) => ({
        ...user,
        role: updates.role ?? user.role,
        profile: {
            ...user.profile,
            full_name: updates.full_name ?? user.profile.full_name,
            role: updates.role ?? user.role,
        }
    }));

    if (!updatedUser) return null;

    return normalizeProfile({
        ...updatedUser.profile,
        email: updatedUser.email,
        role: updatedUser.role,
    });
};

export const getMockProfile = (): UserProfile | null => {
    const currentUser = getCurrentMockUserAccount();
    if (!currentUser) {
        return null;
    }

    return normalizeProfile({
        ...currentUser.profile,
        email: currentUser.email,
        role: currentUser.role
    });
};

export const initializeMockProfile = (input: {
    email?: string;
    full_name?: string;
    voucher_id?: string | null;
    access_starts_at?: string | null;
    access_expires_at?: string | null;
    access_status?: UserProfile['access_status'];
    role?: UserRole;
}): UserProfile | null => {
    const currentUser = getCurrentMockUserAccount();
    if (!currentUser) {
        return null;
    }

    const updatedUser = writeUpdatedUser(currentUser.id, (user) => ({
        ...user,
        email: input.email ? normalizeEmail(input.email) : user.email,
        role: input.role || user.role,
        profile: {
            ...user.profile,
            email: input.email ? normalizeEmail(input.email) : user.email,
            full_name: input.full_name || user.profile.full_name,
            voucher_id: input.voucher_id ?? user.profile.voucher_id ?? null,
            access_starts_at: input.access_starts_at ?? user.profile.access_starts_at ?? null,
            access_expires_at: input.access_expires_at ?? user.profile.access_expires_at ?? null,
            access_status: input.access_status ?? user.profile.access_status ?? getProfileAccessStatus(user.profile),
            role: input.role || user.role,
            id: user.id
        }
    }));

    if (!updatedUser) {
        return null;
    }

    return normalizeProfile({
        ...updatedUser.profile,
        email: updatedUser.email,
        role: updatedUser.role
    });
};

export const saveMockProfile = (updates: Partial<UserProfile>): UserProfile | null => {
    const currentUser = getCurrentMockUserAccount();
    if (!currentUser) {
        return null;
    }

    const updatedUser = writeUpdatedUser(currentUser.id, (user) => {
        const nextEmail = updates.email ? normalizeEmail(updates.email) : user.email;
        const nextRole = updates.role || user.role;

        return {
            ...user,
            email: nextEmail,
            role: nextRole,
            profile: {
                ...user.profile,
                ...updates,
                id: user.id,
                email: nextEmail,
                role: nextRole
            }
        };
    });

    if (!updatedUser) {
        return null;
    }

    return normalizeProfile({
        ...updatedUser.profile,
        email: updatedUser.email,
        role: updatedUser.role
    });
};

export const validateMockVoucher = (rawCode: string): VoucherValidationResult => {
    const code = normalizeVoucherCode(rawCode);
    const voucher = getValidatableVouchers().find((item) => normalizeVoucherCode(item.code) === code);

    if (!voucher) {
        return {
            success: false,
            code: 'invalid_code',
            message: getVoucherErrorMessage('invalid_code')
        };
    }

    if (voucher.status === 'disabled') {
        return {
            success: false,
            voucher: clone(voucher),
            code: 'voucher_disabled',
            message: getVoucherErrorMessage('voucher_disabled')
        };
    }

    if (voucher.status === 'redeemed' || voucher.consumed_at || voucher.consumed_by_user_id) {
        return {
            success: false,
            voucher: clone(voucher),
            code: 'already_redeemed',
            message: getVoucherErrorMessage('already_redeemed')
        };
    }

    if (voucher.expires_at && new Date(voucher.expires_at).getTime() < Date.now()) {
        return {
            success: false,
            voucher: clone(voucher),
            code: 'voucher_expired',
            message: getVoucherErrorMessage('voucher_expired')
        };
    }

    return {
        success: true,
        voucher: clone(voucher)
    };
};

export const redeemMockVoucher = (rawCode: string): VoucherRedemptionResult => {
    const currentUser = getCurrentMockUserAccount();
    if (!currentUser) {
        return {
            success: false,
            code: 'not_authenticated',
            message: getVoucherErrorMessage('not_authenticated')
        };
    }

    const validation = validateMockVoucher(rawCode);
    if (!validation.success || !validation.voucher) {
        return {
            success: false,
            code: validation.code,
            message: validation.message
        };
    }

    const redeemedAt = new Date().toISOString();
    const updatedVoucher = updateStoredVoucherById(validation.voucher.id, (voucher) => ({
        ...voucher,
        status: 'redeemed',
        consumed_at: redeemedAt,
        consumed_by_user_id: currentUser.id
    }));

    if (!updatedVoucher) {
        return {
            success: false,
            code: 'invalid_code',
            message: getVoucherErrorMessage('invalid_code')
        };
    }

    const currentProfile = getMockProfile();
    const nextExpiresAt = calculateRenewedAccessExpiry(currentProfile, validation.voucher.duration_months);
    const nextProfile = saveMockProfile({
        voucher_id: validation.voucher.id,
        access_starts_at: currentProfile?.access_starts_at || redeemedAt,
        access_expires_at: nextExpiresAt,
        access_status: 'active'
    });

    // Create content grants if voucher is linked to a model/batch (T02)
    const grantedCollectionIds = createGrantsFromRedemption(
        updatedVoucher.id,
        currentUser.id,
        nextExpiresAt
    );

    return {
        success: true,
        profile: nextProfile || undefined,
        voucher: clone(updatedVoucher),
        grantedCollectionIds,
    };
};

// ── Mock CRUD para coleções (persiste em localStorage) ──────────────────────

const readStoredCollections = (): Collection[] | null => {
    if (typeof window === 'undefined') return null;
    try {
        const stored = localStorage.getItem(MOCK_COLLECTIONS_STORAGE_KEY);
        return stored ? normalizeCollections(JSON.parse(stored) as Collection[]) : null;
    } catch {
        return null;
    }
};

const writeStoredCollections = (collections: Collection[]): void => {
    if (typeof window === 'undefined') return;
    localStorage.setItem(MOCK_COLLECTIONS_STORAGE_KEY, JSON.stringify(normalizeCollections(collections)));
};

const getLiveCollections = (): Collection[] => {
    return readStoredCollections() ?? MOCK_COLLECTIONS;
};

export const mockCreateCollection = (data: Partial<Collection>): Collection => {
    const newCollection = normalizeCollectionAssetUrls({
        id: `mock-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`,
        title: data.title || 'Nova Coleção',
        cover_image: data.cover_image || placeholderImageUrl,
        level: data.level || 'Educação Infantil',
        color_theme: data.color_theme || '#5D1F58',
        theme: data.theme || '',
        learning_objectives: data.learning_objectives || '',
        characters: data.characters || [],
        bncc_skills: data.bncc_skills || [],
        casel_competencies: data.casel_competencies || [],
        age_grade: data.age_grade || [],
        pdf_url: data.pdf_url || '',
        audio_url: data.audio_url || '',
        video_url: data.video_url || '',
        extra_materials: data.extra_materials || [],
    });
    const updated = [...getLiveCollections(), newCollection];
    writeStoredCollections(updated);
    return clone(newCollection);
};

export const mockUpdateCollection = (id: string, updates: Partial<Collection>): Collection | null => {
    const collections = getLiveCollections();
    const idx = collections.findIndex(c => c.id === id);
    if (idx === -1) return null;
    const updated = normalizeCollectionAssetUrls({ ...collections[idx], ...updates, id });
    const next = [...collections];
    next[idx] = updated;
    writeStoredCollections(next);
    return clone(updated);
};

export const mockDeleteCollection = (id: string): boolean => {
    const collections = getLiveCollections();
    const next = collections.filter(c => c.id !== id);
    if (next.length === collections.length) return false;
    writeStoredCollections(next);
    return true;
};

export const getMockCollectionsLive = (): Collection[] => clone(getLiveCollections());

export const getMockCollectionByIdLive = (id: string): Collection | null => {
    const c = getLiveCollections().find(item => item.id === id);
    return c ? clone(c) : null;
};