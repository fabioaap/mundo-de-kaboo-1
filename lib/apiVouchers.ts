/**
 * Supabase-backed data layer for the Voucher Models / Batches / Codes module.
 */
import { supabase } from './supabase';
import {
    AuditLogEntry,
    VoucherBatch,
    VoucherBatchStatus,
    VoucherModel,
    VoucherModelStatus,
    VoucherPackageType,
    VoucherDurationMonths,
    Voucher,
} from '../types';

export async function getVoucherModels(brandId: string): Promise<VoucherModel[]> {
    const { data, error } = await supabase
        .from('voucher_models')
        .select(`
            *,
            items:voucher_model_items(
                id, model_id, collection_id, created_at,
                collection:collections(id, title, cover_image, kit_cover_image, collection_type)
            )
        `)
        .eq('brand_id', brandId)
        .order('created_at', { ascending: false });

    if (error) throw error;
    return (data ?? []) as unknown as VoucherModel[];
}

export async function getVoucherModelById(id: string): Promise<VoucherModel | null> {
    const { data, error } = await supabase
        .from('voucher_models')
        .select(`
            *,
            items:voucher_model_items(
                id, model_id, collection_id, created_at,
                collection:collections(id, title, cover_image, kit_cover_image, collection_type)
            )
        `)
        .eq('id', id)
        .maybeSingle();

    if (error) throw error;
    return data as unknown as VoucherModel | null;
}

export async function getVoucherBatches(
    brandId: string,
    modelId?: string,
): Promise<VoucherBatch[]> {
    let query = supabase
        .from('voucher_batches')
        .select('*')
        .eq('brand_id', brandId)
        .order('created_at', { ascending: false });

    if (modelId) {
        query = query.eq('model_id', modelId);
    }

    const { data: batches, error } = await query;
    if (error) throw error;
    if (!batches || batches.length === 0) return [];

    // Aggregate redeemed/available counts in one extra query
    const batchIds = batches.map((b) => b.id);
    const { data: voucherRows } = await supabase
        .from('vouchers')
        .select('batch_id, status')
        .in('batch_id', batchIds);

    const redeemedByBatch: Record<string, number> = {};
    const availableByBatch: Record<string, number> = {};
    for (const row of voucherRows ?? []) {
        if (!row.batch_id) continue;
        if (row.status === 'redeemed') {
            redeemedByBatch[row.batch_id] = (redeemedByBatch[row.batch_id] ?? 0) + 1;
        } else if (row.status === 'active') {
            availableByBatch[row.batch_id] = (availableByBatch[row.batch_id] ?? 0) + 1;
        }
    }

    return batches.map((b) => ({
        ...(b as unknown as VoucherBatch),
        redeemed_count: redeemedByBatch[b.id] ?? 0,
        available_count: availableByBatch[b.id] ?? 0,
    }));
}

export async function getVoucherCodes(
    brandId: string,
    filters?: { status?: string; batchId?: string; search?: string },
): Promise<Voucher[]> {
    let query = supabase
        .from('vouchers')
        .select('*')
        .eq('brand_id', brandId)
        .not('batch_id', 'is', null)
        .order('created_at', { ascending: false })
        .limit(500);

    if (filters?.batchId) {
        query = query.eq('batch_id', filters.batchId);
    }
    if (filters?.status) {
        query = query.eq('status', filters.status);
    }
    if (filters?.search) {
        query = query.ilike('code', `%${filters.search}%`);
    }

    const { data, error } = await query;
    if (error) throw error;
    return (data ?? []) as unknown as Voucher[];
}

export async function getAuditLog(brandId: string): Promise<AuditLogEntry[]> {
    const { data, error } = await supabase
        .from('audit_log')
        .select('*')
        .eq('brand_id', brandId)
        .order('created_at', { ascending: false })
        .limit(200);

    if (error) throw error;
    return (data ?? []) as unknown as AuditLogEntry[];
}

// ── Write operations ─────────────────────────────────────────

export async function createVoucherModel(
    brandId: string,
    data: {
        name: string;
        description?: string;
        package_type: VoucherPackageType;
        duration_months: VoucherDurationMonths;
        redeem_by?: string | null;
        status: VoucherModelStatus;
        collection_ids: string[];
    },
): Promise<VoucherModel> {
    const { data: model, error } = await supabase
        .from('voucher_models')
        .insert({
            brand_id: brandId,
            name: data.name,
            description: data.description ?? null,
            package_type: data.package_type,
            duration_months: data.duration_months,
            redeem_by: data.redeem_by ?? null,
            status: data.status,
        })
        .select('*')
        .single();

    if (error) throw error;

    if (data.collection_ids.length > 0) {
        const items = data.collection_ids.map((cid) => ({
            model_id: model.id,
            collection_id: cid,
        }));
        const { error: itemsError } = await supabase
            .from('voucher_model_items')
            .insert(items);
        if (itemsError) throw itemsError;
    }

    return await getVoucherModelById(model.id) as VoucherModel;
}

export async function updateVoucherModel(
    id: string,
    data: {
        name?: string;
        description?: string;
        package_type?: VoucherPackageType;
        duration_months?: VoucherDurationMonths;
        redeem_by?: string | null;
        status?: VoucherModelStatus;
        collection_ids?: string[];
    },
): Promise<void> {
    const updateFields: Record<string, unknown> = { updated_at: new Date().toISOString() };
    if (data.name !== undefined) updateFields.name = data.name;
    if (data.description !== undefined) updateFields.description = data.description;
    if (data.package_type !== undefined) updateFields.package_type = data.package_type;
    if (data.duration_months !== undefined) updateFields.duration_months = data.duration_months;
    if ('redeem_by' in data) updateFields.redeem_by = data.redeem_by ?? null;
    if (data.status !== undefined) updateFields.status = data.status;

    const { error } = await supabase
        .from('voucher_models')
        .update(updateFields)
        .eq('id', id);

    if (error) throw error;

    if (data.collection_ids !== undefined) {
        const { error: delError } = await supabase
            .from('voucher_model_items')
            .delete()
            .eq('model_id', id);
        if (delError) throw delError;

        if (data.collection_ids.length > 0) {
            const items = data.collection_ids.map((cid) => ({
                model_id: id,
                collection_id: cid,
            }));
            const { error: insertError } = await supabase
                .from('voucher_model_items')
                .insert(items);
            if (insertError) throw insertError;
        }
    }
}

export async function emitVoucherBatch(
    modelId: string,
    quantity: number,
    label?: string,
): Promise<string> {
    const { data, error } = await supabase.rpc('emit_voucher_batch', {
        p_model_id: modelId,
        p_quantity: quantity,
        p_label: label ?? null,
    });
    if (error) throw error;
    return data as string;
}

export async function disableVoucherCode(voucherId: string): Promise<void> {
    const { error } = await supabase
        .from('vouchers')
        .update({ status: 'disabled', updated_at: new Date().toISOString() })
        .eq('id', voucherId);
    if (error) throw error;
}

export async function getBatchVouchers(batchId: string): Promise<Voucher[]> {
    const { data, error } = await supabase
        .from('vouchers')
        .select('*')
        .eq('batch_id', batchId)
        .order('created_at', { ascending: true });
    if (error) throw error;
    return (data ?? []) as unknown as Voucher[];
}

export async function updateBatchStatus(
    batchId: string,
    status: VoucherBatchStatus,
    extra?: Partial<Pick<VoucherBatch,
        'exported_at' | 'exported_by' |
        'sent_at' | 'sent_by' | 'sent_to' |
        'confirmed_at' |
        'cancelled_at' | 'cancelled_by' | 'cancel_reason'
    >>
): Promise<void> {
    const { error } = await supabase
        .from('voucher_batches')
        .update({ status, updated_at: new Date().toISOString(), ...(extra ?? {}) })
        .eq('id', batchId);
    if (error) throw error;
}

export async function getAuditLogForEntity(entityId: string): Promise<AuditLogEntry[]> {
    const { data, error } = await supabase
        .from('audit_log')
        .select('*')
        .eq('entity_id', entityId)
        .order('created_at', { ascending: false })
        .limit(100);
    if (error) throw error;
    return (data ?? []) as unknown as AuditLogEntry[];
}
