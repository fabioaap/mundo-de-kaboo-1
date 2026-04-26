import { AccessStatus, UserContentGrant, UserProfile, VoucherDurationMonths, VoucherErrorCode } from '../types';

const voucherMessages: Record<VoucherErrorCode, string> = {
    invalid_code: 'Código de acesso inválido.',
    already_redeemed: 'Este código já foi utilizado.',
    voucher_expired: 'Este código de acesso expirou.',
    voucher_disabled: 'Este código de acesso não está mais disponível.',
    not_authenticated: 'Faça login para ativar um novo código de acesso.',
    unknown: 'Não foi possível validar o código de acesso.'
};

export const normalizeVoucherCode = (value: string): string => value.trim().toUpperCase();

export const addMonths = (value: Date, months: VoucherDurationMonths): Date => {
    const nextDate = new Date(value);
    nextDate.setMonth(nextDate.getMonth() + months);
    return nextDate;
};

export const getProfileAccessStatus = (profile: UserProfile | null | undefined): AccessStatus => {
    if (!profile) {
        return 'pending_voucher';
    }

    // Admin e editor tem acesso irrestrito, nao dependem de voucher
    if (profile.role === 'admin' || profile.role === 'editor') {
        return 'active';
    }

    if (profile.access_status === 'pending_voucher') {
        return 'pending_voucher';
    }

    if (profile.access_status === 'expired') {
        return 'expired';
    }

    if (profile.access_expires_at) {
        return new Date(profile.access_expires_at).getTime() >= Date.now() ? 'active' : 'expired';
    }

    return 'active';
};

export const hasActiveAccess = (profile: UserProfile | null | undefined): boolean => {
    return getProfileAccessStatus(profile) === 'active';
};

export const isAccessBlocked = (profile: UserProfile | null | undefined): boolean => {
    return !hasActiveAccess(profile);
};

export const calculateRenewedAccessExpiry = (
    profile: UserProfile | null | undefined,
    durationMonths: VoucherDurationMonths,
    referenceDate: Date = new Date()
): string => {
    const currentExpiry = profile?.access_expires_at ? new Date(profile.access_expires_at) : null;
    const baseDate = currentExpiry && currentExpiry.getTime() > referenceDate.getTime()
        ? currentExpiry
        : referenceDate;

    return addMonths(baseDate, durationMonths).toISOString();
};

export const formatAccessDate = (value: string | null | undefined): string => {
    if (!value) {
        return 'Sem data definida';
    }

    return new Intl.DateTimeFormat('pt-BR', {
        day: '2-digit',
        month: '2-digit',
        year: 'numeric'
    }).format(new Date(value));
};

export const getDaysUntilAccessExpiry = (
    value: string | null | undefined,
    referenceDate: Date = new Date()
): number | null => {
    if (!value) {
        return null;
    }

    const diffMs = new Date(value).getTime() - referenceDate.getTime();
    return Math.ceil(diffMs / (1000 * 60 * 60 * 24));
};

export const getVoucherErrorMessage = (code: VoucherErrorCode | undefined, fallback?: string): string => {
    if (!code) {
        return fallback || voucherMessages.unknown;
    }

    return voucherMessages[code] || fallback || voucherMessages.unknown;
};

export const getAccessStatusLabel = (status: AccessStatus): string => {
    if (status === 'active') {
        return 'Acesso ativo';
    }

    if (status === 'expired') {
        return 'Acesso expirado';
    }

    return 'Aguardando codigo de acesso';
};

/**
 * Check if a user can access a specific collection.
 * 
 * Access model:
 * - User must have active temporal access first (access_status = 'active')
 * - If user has zero content grants → full access to all (legacy temporal-only)
 * - If user has content grants → only granted collections are accessible
 */
export const canAccessCollection = (
    grants: UserContentGrant[],
    collectionId: string
): boolean => {
    // No grants at all = legacy temporal access, everything unlocked
    if (grants.length === 0) return true;
    // Has grants = only granted collections
    return grants.some(g => g.collection_id === collectionId);
};