/**
 * Mock data layer for the Voucher Models / Batches / Codes module.
 * Persists to localStorage so state survives page reloads during dev.
 */
import {
    VoucherModel,
    VoucherModelItem,
    VoucherBatch,
    VoucherModelSnapshot,
    VoucherPackageType,
    VoucherModelStatus,
    VoucherBatchStatus,
    VoucherDurationMonths,
    Voucher,
    AuditLogEntry,
    Collection,
} from '../types';
import { normalizeVoucherCode } from './access';
import { getMockCollectionsLive } from './mockData';

// ── Storage keys ─────────────────────────────────────────
const MODELS_KEY = 'kaboo_mock_voucher_models';
const ITEMS_KEY = 'kaboo_mock_voucher_model_items';
const BATCHES_KEY = 'kaboo_mock_voucher_batches';
const BATCH_VOUCHERS_KEY = 'kaboo_mock_batch_vouchers';
const AUDIT_KEY = 'kaboo_mock_audit_log';
const SHARED_MOCK_VOUCHERS_KEY = 'kaboo_mock_vouchers';

export const MIN_VOUCHER_BATCH_QUANTITY = 1;
export const MAX_VOUCHER_BATCH_QUANTITY = 10000;

type StoredBatchVoucher = Voucher & { model_id?: string; batch_id?: string };

// ── Helpers ──────────────────────────────────────────────
const uid = () => crypto.randomUUID();
const now = () => new Date().toISOString();
const clone = <T,>(v: T): T => JSON.parse(JSON.stringify(v));

const load = <T,>(key: string, fallback: T): T => {
    try {
        const raw = localStorage.getItem(key);
        return raw ? JSON.parse(raw) : fallback;
    } catch { return fallback; }
};
const save = <T,>(key: string, value: T) => localStorage.setItem(key, JSON.stringify(value));

export const isValidVoucherBatchQuantity = (quantity: number): boolean => {
    return Number.isInteger(quantity)
        && quantity >= MIN_VOUCHER_BATCH_QUANTITY
        && quantity <= MAX_VOUCHER_BATCH_QUANTITY;
};

const getReservedVoucherCodes = (): Set<string> => {
    const batchVouchers = load<StoredBatchVoucher[]>(BATCH_VOUCHERS_KEY, []);
    const sharedVouchers = load<Voucher[]>(SHARED_MOCK_VOUCHERS_KEY, []);

    return new Set(
        [...batchVouchers, ...sharedVouchers].map((voucher) => normalizeVoucherCode(voucher.code))
    );
};

const generateUniqueBatchCodes = (modelName: string, quantity: number): string[] => {
    const prefix = modelName.replace(/[^A-Z0-9]/gi, '').substring(0, 4).toUpperCase() || 'VKAB';
    const reservedCodes = getReservedVoucherCodes();
    const codes: string[] = [];

    let sequence = 1;
    while (codes.length < quantity) {
        const candidate = `KABOO-${prefix}-${String(sequence).padStart(4, '0')}`;
        const normalizedCandidate = normalizeVoucherCode(candidate);

        if (!reservedCodes.has(normalizedCandidate)) {
            codes.push(candidate);
            reservedCodes.add(normalizedCandidate);
        }

        sequence += 1;
    }

    return codes;
};

// ── Seed data ────────────────────────────────────────────
const ensureSeed = () => {
    if (localStorage.getItem(MODELS_KEY)) return;

    const collections = getMockCollectionsLive();
    if (collections.length < 3) return;

    const modelId1 = uid();
    const modelId2 = uid();
    const batchId1 = uid();

    const models: VoucherModel[] = [
        {
            id: modelId1,
            name: 'Kit Aventura Kaboo',
            description: 'Kit com 3 livros de aventura para Fund. I',
            package_type: 'kit',
            duration_months: 6,
            redeem_by: null,
            status: 'active',
            created_by: null,
            created_at: '2026-03-27T16:00:00Z',
            updated_at: '2026-03-28T11:00:00Z',
        },
        {
            id: modelId2,
            name: 'Livro Avulso — Ed. Infantil',
            description: null,
            package_type: 'book',
            duration_months: 3,
            redeem_by: '2026-12-31T23:59:59Z',
            status: 'draft',
            created_by: null,
            created_at: '2026-04-05T09:00:00Z',
            updated_at: '2026-04-05T09:00:00Z',
        },
    ];

    const items: VoucherModelItem[] = [
        { id: uid(), model_id: modelId1, collection_id: collections[0].id, created_at: now() },
        { id: uid(), model_id: modelId1, collection_id: collections[1].id, created_at: now() },
        { id: uid(), model_id: modelId1, collection_id: collections[2].id, created_at: now() },
        { id: uid(), model_id: modelId2, collection_id: collections[0].id, created_at: now() },
    ];

    const snapshot: VoucherModelSnapshot = {
        name: models[0].name,
        package_type: models[0].package_type,
        duration_months: models[0].duration_months,
        redeem_by: models[0].redeem_by,
        items: items.filter(i => i.model_id === modelId1).map(i => {
            const col = collections.find(c => c.id === i.collection_id);
            return { collection_id: i.collection_id, title: col?.title || '?', cover_image: col?.cover_image };
        }),
    };

    const batches: VoucherBatch[] = [
        {
            id: batchId1,
            model_id: modelId1,
            label: 'Campanha abril/2026',
            quantity: 50,
            status: 'generated',
            model_snapshot: snapshot,
            exported_at: null,
            exported_by: null,
            sent_at: null,
            sent_by: null,
            sent_to: null,
            confirmed_at: null,
            cancelled_at: null,
            cancelled_by: null,
            cancel_reason: null,
            created_by: null,
            created_at: '2026-04-05T14:30:00Z',
            updated_at: '2026-04-05T14:30:00Z',
        },
    ];

    // Generate 50 voucher codes for the batch
    const batchVouchers: Voucher[] = Array.from({ length: 50 }, (_, i) => ({
        id: uid(),
        code: `KABOO-AV${String(i + 1).padStart(3, '0')}`,
        duration_months: 6 as VoucherDurationMonths,
        status: i < 3 ? 'redeemed' as const : 'active' as const,
        expires_at: null,
        consumed_at: i < 3 ? '2026-04-06T10:15:00Z' : null,
        consumed_by_user_id: i < 3 ? 'mock-user-redeemer' : null,
        consumed_by_name: i < 3 ? ['Maria Silva', 'João Santos', 'Ana Oliveira'][i] : null,
        consumed_by_email: i < 3 ? ['maria@exemplo.com', 'joao@exemplo.com', 'ana@exemplo.com'][i] : null,
        model_id: modelId1,
        batch_id: batchId1,
    }));

    save(MODELS_KEY, models);
    save(ITEMS_KEY, items);
    save(BATCHES_KEY, batches);
    save(BATCH_VOUCHERS_KEY, batchVouchers);
    save(AUDIT_KEY, []);
};

// ── Public API ───────────────────────────────────────────

export const initVoucherMock = () => ensureSeed();

// Models
export const getVoucherModels = (): VoucherModel[] => {
    ensureSeed();
    const models = load<VoucherModel[]>(MODELS_KEY, []);
    const items = load<VoucherModelItem[]>(ITEMS_KEY, []);
    const collections = getMockCollectionsLive();
    return models.map(m => ({
        ...m,
        items: items
            .filter(i => i.model_id === m.id)
            .map(i => ({ ...i, collection: collections.find(c => c.id === i.collection_id) })),
    }));
};

export const getVoucherModelById = (id: string): VoucherModel | null => {
    return getVoucherModels().find(m => m.id === id) || null;
};

export const createVoucherModel = (data: {
    name: string;
    description?: string;
    package_type: VoucherPackageType;
    duration_months: VoucherDurationMonths;
    redeem_by?: string | null;
    status: VoucherModelStatus;
    collection_ids: string[];
}): VoucherModel => {
    ensureSeed();
    const models = load<VoucherModel[]>(MODELS_KEY, []);
    const items = load<VoucherModelItem[]>(ITEMS_KEY, []);

    const model: VoucherModel = {
        id: uid(),
        name: data.name,
        description: data.description || null,
        package_type: data.package_type,
        duration_months: data.duration_months,
        redeem_by: data.redeem_by || null,
        status: data.status,
        created_by: null,
        created_at: now(),
        updated_at: now(),
    };

    const newItems: VoucherModelItem[] = data.collection_ids.map(cid => ({
        id: uid(),
        model_id: model.id,
        collection_id: cid,
        created_at: now(),
    }));

    models.push(model);
    items.push(...newItems);
    save(MODELS_KEY, models);
    save(ITEMS_KEY, items);

    addAuditEntry('create', 'voucher_model', model.id, { name: model.name });

    return { ...model, items: newItems };
};

export const updateVoucherModel = (id: string, data: Partial<{
    name: string;
    description: string | null;
    package_type: VoucherPackageType;
    duration_months: VoucherDurationMonths;
    redeem_by: string | null;
    status: VoucherModelStatus;
    collection_ids: string[];
}>): VoucherModel | null => {
    ensureSeed();
    const models = load<VoucherModel[]>(MODELS_KEY, []);
    const idx = models.findIndex(m => m.id === id);
    if (idx < 0) return null;

    const model = models[idx];
    if (data.name !== undefined) model.name = data.name;
    if (data.description !== undefined) model.description = data.description;
    if (data.package_type !== undefined) model.package_type = data.package_type;
    if (data.duration_months !== undefined) model.duration_months = data.duration_months;
    if (data.redeem_by !== undefined) model.redeem_by = data.redeem_by;
    if (data.status !== undefined) model.status = data.status;
    model.updated_at = now();

    if (data.collection_ids) {
        const items = load<VoucherModelItem[]>(ITEMS_KEY, []);
        const filtered = items.filter(i => i.model_id !== id);
        const newItems: VoucherModelItem[] = data.collection_ids.map(cid => ({
            id: uid(),
            model_id: id,
            collection_id: cid,
            created_at: now(),
        }));
        save(ITEMS_KEY, [...filtered, ...newItems]);
    }

    models[idx] = model;
    save(MODELS_KEY, models);

    addAuditEntry('update', 'voucher_model', id, { name: model.name });
    return getVoucherModelById(id);
};

// Batches
export const getVoucherBatches = (modelId?: string): VoucherBatch[] => {
    ensureSeed();
    const batches = load<VoucherBatch[]>(BATCHES_KEY, []);
    const vouchers = load<StoredBatchVoucher[]>(BATCH_VOUCHERS_KEY, []);

    const enriched = batches.map(b => {
        const batchVouchers = vouchers.filter(v => v.batch_id === b.id);
        const redeemed = batchVouchers.filter(v => v.status === 'redeemed').length;
        const disabled = batchVouchers.filter(v => v.status === 'disabled').length;
        return { ...b, redeemed_count: redeemed, available_count: b.quantity - redeemed - disabled };
    });

    return modelId ? enriched.filter(b => b.model_id === modelId) : enriched;
};

export const getVoucherBatchById = (id: string): VoucherBatch | null => {
    return getVoucherBatches().find(b => b.id === id) || null;
};

export const createVoucherBatch = (modelId: string, quantity: number, label?: string): VoucherBatch | null => {
    ensureSeed();
    const model = getVoucherModelById(modelId);
    if (!model || model.status !== 'active' || !isValidVoucherBatchQuantity(quantity)) return null;

    const collections = getMockCollectionsLive();
    const snapshot: VoucherModelSnapshot = {
        name: model.name,
        package_type: model.package_type,
        duration_months: model.duration_months,
        redeem_by: model.redeem_by,
        items: (model.items || []).map(i => {
            const col = collections.find(c => c.id === i.collection_id);
            return { collection_id: i.collection_id, title: col?.title || '?', cover_image: col?.cover_image };
        }),
    };

    const batch: VoucherBatch = {
        id: uid(),
        model_id: modelId,
        label: label || null,
        quantity,
        status: 'generated',
        model_snapshot: snapshot,
        exported_at: null,
        exported_by: null,
        sent_at: null,
        sent_by: null,
        sent_to: null,
        confirmed_at: null,
        cancelled_at: null,
        cancelled_by: null,
        cancel_reason: null,
        created_by: null,
        created_at: now(),
        updated_at: now(),
    };

    const codes = generateUniqueBatchCodes(model.name, quantity);
    const newVouchers: StoredBatchVoucher[] = codes.map((code) => ({
        id: uid(),
        code,
        duration_months: model.duration_months,
        status: 'active' as const,
        expires_at: model.redeem_by || null,
        consumed_at: null,
        consumed_by_user_id: null,
        consumed_by_name: null,
        consumed_by_email: null,
        model_id: modelId,
        batch_id: batch.id,
    }));

    const batches = load<VoucherBatch[]>(BATCHES_KEY, []);
    batches.push(batch);
    save(BATCHES_KEY, batches);

    const existing = load<(Voucher & { batch_id?: string })[]>(BATCH_VOUCHERS_KEY, []);
    existing.push(...newVouchers);
    save(BATCH_VOUCHERS_KEY, existing);

    addAuditEntry('create', 'voucher_batch', batch.id, { model: model.name, quantity });

    return { ...batch, redeemed_count: 0, available_count: quantity };
};

export const updateBatchStatus = (batchId: string, status: VoucherBatchStatus, extra?: Record<string, string | null>): VoucherBatch | null => {
    ensureSeed();
    const batches = load<VoucherBatch[]>(BATCHES_KEY, []);
    const idx = batches.findIndex(b => b.id === batchId);
    if (idx < 0) return null;

    batches[idx].status = status;
    batches[idx].updated_at = now();
    if (extra) Object.assign(batches[idx], extra);
    save(BATCHES_KEY, batches);

    if (status === 'cancelled') {
        const vouchers = load<StoredBatchVoucher[]>(BATCH_VOUCHERS_KEY, []);
        const nextVouchers = vouchers.map((voucher) => {
            if (voucher.batch_id !== batchId || voucher.status !== 'active') {
                return voucher;
            }

            return {
                ...voucher,
                status: 'disabled' as const,
            };
        });

        save(BATCH_VOUCHERS_KEY, nextVouchers);
    }

    addAuditEntry('update_status', 'voucher_batch', batchId, { status, ...extra });
    return getVoucherBatchById(batchId);
};

// Voucher codes
export const getBatchVouchers = (batchId: string): Voucher[] => {
    ensureSeed();
    const all = load<(Voucher & { batch_id?: string })[]>(BATCH_VOUCHERS_KEY, []);
    return all.filter(v => v.batch_id === batchId);
};

export const getAllMockVoucherCodes = (): (Voucher & { batch_id?: string; model_id?: string })[] => {
    ensureSeed();
    return load(BATCH_VOUCHERS_KEY, []);
};

// Audit
const addAuditEntry = (action: string, entityType: string, entityId: string, details?: Record<string, unknown>) => {
    const log = load<AuditLogEntry[]>(AUDIT_KEY, []);
    log.unshift({
        id: uid(),
        actor_id: null,
        action,
        entity_type: entityType,
        entity_id: entityId,
        details: details || {},
        created_at: now(),
    });
    save(AUDIT_KEY, log);
};

export const getAuditLog = (entityType?: string, entityId?: string): AuditLogEntry[] => {
    ensureSeed();
    const log = load<AuditLogEntry[]>(AUDIT_KEY, []);
    if (entityType && entityId) return log.filter(e => e.entity_type === entityType && e.entity_id === entityId);
    if (entityType) return log.filter(e => e.entity_type === entityType);
    return log;
};

// CSV export helper
export const generateBatchCsv = (batchId: string): string => {
    const batch = getVoucherBatchById(batchId);
    if (!batch) return '';
    const vouchers = getBatchVouchers(batchId);
    const snap = batch.model_snapshot;

    const headers = [
        'batch_id', 'batch_name', 'export_version', 'row_number',
        'voucher_code', 'model_name', 'package_type',
        'content_summary', 'content_count', 'duration_months',
        'redeem_by_date', 'generated_at', 'status',
        'consumed_by_name', 'consumed_by_email',
    ];

    const contentSummary = snap.items.map(i => i.title).join('; ');
    const rows = vouchers.map((v, i) => [
        batch.id,
        batch.label || '',
        '01',
        String(i + 1),
        v.code,
        snap.name,
        snap.package_type,
        contentSummary,
        String(snap.items.length),
        String(snap.duration_months),
        snap.redeem_by || '',
        v.expires_at || batch.created_at,
        v.status,
        v.consumed_by_name || '',
        v.consumed_by_email || '',
    ].join(','));

    return [headers.join(','), ...rows].join('\n');
};

// XLSX export helper
import * as XLSX from 'xlsx';

export const generateBatchXlsx = (batchId: string): Blob | null => {
    const batch = getVoucherBatchById(batchId);
    if (!batch) return null;
    const vouchers = getBatchVouchers(batchId);
    const snap = batch.model_snapshot;
    const contentSummary = snap.items.map(i => i.title).join('; ');

    const rows = vouchers.map((v, i) => ({
        'Lote': batch.id,
        'Nome Lote': batch.label || '',
        'Nº': i + 1,
        'Código': v.code,
        'Modelo': snap.name,
        'Tipo Pacote': snap.package_type,
        'Conteúdos': contentSummary,
        'Qtd Conteúdos': snap.items.length,
        'Duração (meses)': snap.duration_months,
        'Validade': snap.redeem_by || '',
        'Gerado em': v.expires_at || batch.created_at,
        'Status': v.status,
        'Resgatado por': v.consumed_by_name || '',
        'E-mail': v.consumed_by_email || '',
    }));

    const ws = XLSX.utils.json_to_sheet(rows);
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, 'Códigos');
    const buffer = XLSX.write(wb, { bookType: 'xlsx', type: 'array' });
    return new Blob([buffer], { type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' });
};

/** Generate CSV from already-loaded batch + voucher data (works with both mock and Supabase). */
export const generateCsvFromData = (batch: VoucherBatch, vouchers: Voucher[]): string => {
    const snap = batch.model_snapshot;
    const headers = [
        'batch_id', 'batch_name', 'export_version', 'row_number',
        'voucher_code', 'model_name', 'package_type',
        'content_summary', 'content_count', 'duration_months',
        'redeem_by_date', 'generated_at', 'status',
        'consumed_by_name', 'consumed_by_email',
    ];
    const contentSummary = snap.items.map((i: { title: string }) => i.title).join('; ');
    const rows = vouchers.map((v, i) => [
        batch.id,
        batch.label || '',
        '01',
        String(i + 1),
        v.code,
        snap.name,
        snap.package_type,
        contentSummary,
        String(snap.items.length),
        String(snap.duration_months),
        snap.redeem_by || '',
        v.expires_at || batch.created_at,
        v.status,
        v.consumed_by_name || '',
        v.consumed_by_email || '',
    ].join(','));
    return [headers.join(','), ...rows].join('\n');
};

/** Generate XLSX from already-loaded batch + voucher data (works with both mock and Supabase). */
export const generateXlsxFromData = (batch: VoucherBatch, vouchers: Voucher[]): Blob | null => {
    const snap = batch.model_snapshot;
    const contentSummary = snap.items.map((i: { title: string }) => i.title).join('; ');
    const rows = vouchers.map((v, i) => ({
        'Lote': batch.id,
        'Nome Lote': batch.label || '',
        'Nº': i + 1,
        'Código': v.code,
        'Modelo': snap.name,
        'Tipo Pacote': snap.package_type,
        'Conteúdos': contentSummary,
        'Qtd Conteúdos': snap.items.length,
        'Duração (meses)': snap.duration_months,
        'Validade': snap.redeem_by || '',
        'Gerado em': v.expires_at || batch.created_at,
        'Status': v.status,
        'Resgatado por': v.consumed_by_name || '',
        'E-mail': v.consumed_by_email || '',
    }));
    const ws = XLSX.utils.json_to_sheet(rows);
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, 'Códigos');
    const buffer = XLSX.write(wb, { bookType: 'xlsx', type: 'array' });
    return new Blob([buffer], { type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' });
};

// ── User Content Grants (T01 + T04) ─────────────────────
const GRANTS_KEY = 'kaboo_mock_user_content_grants';

export interface CreateGrantsInput {
    user_id: string;
    voucher_id: string;
    collection_ids: string[];
    expires_at: string | null;
}

export const createUserContentGrants = (input: CreateGrantsInput): import('../types').UserContentGrant[] => {
    const grants = load<import('../types').UserContentGrant[]>(GRANTS_KEY, []);
    const created: import('../types').UserContentGrant[] = [];

    for (const cid of input.collection_ids) {
        // Avoid duplicates for same user+collection+voucher
        const exists = grants.find(g => g.user_id === input.user_id && g.collection_id === cid && g.voucher_id === input.voucher_id);
        if (exists) { created.push(exists); continue; }

        const grant: import('../types').UserContentGrant = {
            id: uid(),
            user_id: input.user_id,
            collection_id: cid,
            voucher_id: input.voucher_id,
            granted_at: now(),
            expires_at: input.expires_at,
        };
        grants.push(grant);
        created.push(grant);
    }

    save(GRANTS_KEY, grants);
    return created;
};

export const getActiveGrantsForUser = (userId: string): import('../types').UserContentGrant[] => {
    const grants = load<import('../types').UserContentGrant[]>(GRANTS_KEY, []);
    const today = new Date().toISOString();
    return grants.filter(g =>
        g.user_id === userId &&
        (!g.expires_at || g.expires_at > today)
    );
};

export const hasGrantForCollection = (userId: string, collectionId: string): boolean => {
    return getActiveGrantsForUser(userId).some(g => g.collection_id === collectionId);
};

export const getAllGrantsForUser = (userId: string): import('../types').UserContentGrant[] => {
    return load<import('../types').UserContentGrant[]>(GRANTS_KEY, []).filter(g => g.user_id === userId);
};

export const deleteUserContentGrants = (userId: string): void => {
    const grants = load<import('../types').UserContentGrant[]>(GRANTS_KEY, []);
    const nextGrants = grants.filter((grant) => grant.user_id !== userId);
    save(GRANTS_KEY, nextGrants);
};

// ── Disable voucher (T09) ────────────────────────────────
export const disableVoucherCode = (voucherId: string, reason: string): (Voucher & { batch_id?: string; model_id?: string }) | null => {
    const vouchers = load<(Voucher & { batch_id?: string; model_id?: string })[]>(BATCH_VOUCHERS_KEY, []);
    const idx = vouchers.findIndex(v => v.id === voucherId);
    if (idx < 0) return null;
    if (vouchers[idx].status !== 'active') return null; // only active can be disabled

    vouchers[idx].status = 'disabled';
    save(BATCH_VOUCHERS_KEY, vouchers);

    addAuditEntry('disable', 'voucher', voucherId, { reason, code: vouchers[idx].code });
    return clone(vouchers[idx]);
};

// ── Redeem with grants (T02) ─────────────────────────────
/**
 * Given a redeemed voucher that has a batch_id, create content grants
 * for the user based on the batch snapshot. Returns the collection_ids granted.
 */
export const createGrantsFromRedemption = (voucherId: string, userId: string, expiresAt: string | null): string[] => {
    // Find the voucher in batch vouchers to get batch_id
    const allBatchVouchers = load<(Voucher & { batch_id?: string; model_id?: string })[]>(BATCH_VOUCHERS_KEY, []);
    const batchVoucher = allBatchVouchers.find(v => v.id === voucherId);
    if (!batchVoucher?.batch_id) return [];

    const batch = getVoucherBatchById(batchVoucher.batch_id);
    if (!batch) return [];

    const collectionIds = batch.model_snapshot.items.map(i => i.collection_id);
    if (collectionIds.length === 0) return [];

    createUserContentGrants({
        user_id: userId,
        voucher_id: voucherId,
        collection_ids: collectionIds,
        expires_at: expiresAt,
    });

    addAuditEntry('redeem_grants', 'voucher', voucherId, {
        user_id: userId,
        granted_collections: collectionIds.length,
        model: batch.model_snapshot.name,
    });

    return collectionIds;
};
