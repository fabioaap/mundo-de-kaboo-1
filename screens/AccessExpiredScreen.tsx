import React, { useEffect, useMemo, useState } from 'react';
import { Button } from '../design-system';
import { Icons } from '../components/Icons';
import { Collection, ScreenName, UserProfile, Voucher } from '../types';
import { PENDING_SIGNUP_VOUCHER_STORAGE_KEY, formatSegmentLabel } from '../constants';
import { api } from '../lib/api';
import { formatAccessDate, getProfileAccessStatus } from '../lib/access';
import { isSupabaseConfigured } from '../lib/supabase';

const getPendingSignupVoucher = (): string => {
    if (typeof window === 'undefined') {
        return '';
    }

    return localStorage.getItem(PENDING_SIGNUP_VOUCHER_STORAGE_KEY) || '';
};

const clearPendingSignupVoucher = () => {
    if (typeof window === 'undefined') {
        return;
    }

    localStorage.removeItem(PENDING_SIGNUP_VOUCHER_STORAGE_KEY);
};

interface AccessExpiredScreenProps {
    profile: UserProfile | null;
    onNavigate: (screen: ScreenName, params?: any) => void;
    onAccessRecovered?: (profile: UserProfile | null) => void | Promise<void>;
}

export const AccessExpiredScreen: React.FC<AccessExpiredScreenProps> = ({
    profile,
    onNavigate,
    onAccessRecovered,
}) => {
    const [voucherCode, setVoucherCode] = useState(() => getPendingSignupVoucher());
    const [loading, setLoading] = useState(false);
    const [errorMsg, setErrorMsg] = useState<string | null>(null);
    const [successMsg, setSuccessMsg] = useState<string | null>(null);
    const [demoVouchers, setDemoVouchers] = useState<Voucher[]>([]);
    const [autoRedeemAttempted, setAutoRedeemAttempted] = useState(false);
    const [grantedCollections, setGrantedCollections] = useState<Collection[]>([]);

    const status = getProfileAccessStatus(profile);

    const activeDemoVouchers = demoVouchers.filter((voucher) => {
        if (voucher.status !== 'active') {
            return false;
        }

        if (voucher.expires_at && new Date(voucher.expires_at).getTime() < Date.now()) {
            return false;
        }

        return true;
    });

    const blockedDemoVouchers = demoVouchers.filter((voucher) => !activeDemoVouchers.some((activeVoucher) => activeVoucher.id === voucher.id));

    useEffect(() => {
        if (isSupabaseConfigured) {
            return;
        }

        api.getVoucherSamples()
            .then((vouchers) => setDemoVouchers(vouchers))
            .catch(() => setDemoVouchers([]));
    }, []);

    useEffect(() => {
        const pendingVoucher = getPendingSignupVoucher();

        if (status !== 'pending_voucher' || !pendingVoucher || autoRedeemAttempted) {
            return;
        }

        setVoucherCode(pendingVoucher);
        setAutoRedeemAttempted(true);
        setLoading(true);
        setErrorMsg(null);
        setSuccessMsg(null);

        let cancelled = false;

        api.redeemVoucher(pendingVoucher)
            .then(async (result) => {
                if (cancelled) {
                    return;
                }

                if (!result.success) {
                    setErrorMsg('Seu cadastro foi criado, mas nao conseguimos aplicar o codigo automaticamente. Confira o codigo abaixo e tente novamente.');
                    setLoading(false);
                    return;
                }

                clearPendingSignupVoucher();

                if (onAccessRecovered) {
                    await onAccessRecovered(result.profile || null);
                }

                setSuccessMsg('Acesso liberado com sucesso. Redirecionando...');
                setTimeout(() => {
                    onNavigate('home', { accessRenewed: true });
                }, 400);
            })
            .catch(() => {
                if (cancelled) {
                    return;
                }

                setErrorMsg('Seu cadastro foi criado, mas nao conseguimos aplicar o codigo automaticamente. Confira o codigo abaixo e tente novamente.');
                setLoading(false);
            });

        return () => {
            cancelled = true;
        };
    }, [autoRedeemAttempted, onAccessRecovered, onNavigate, status]);

    useEffect(() => {
        if (status !== 'active') {
            return;
        }

        clearPendingSignupVoucher();
        setLoading(false);
        setErrorMsg(null);

        const timeoutId = window.setTimeout(() => {
            onNavigate('home', { accessRenewed: true });
        }, 0);

        return () => {
            window.clearTimeout(timeoutId);
        };
    }, [onNavigate, status]);

    const description = useMemo(() => {
        if (status === 'pending_voucher') {
            return 'Sua conta foi criada, mas ainda precisa de um codigo de acesso para liberar a plataforma.';
        }

        if (profile?.access_expires_at) {
            return `Seu acesso expirou em ${formatAccessDate(profile.access_expires_at)}. Informe um novo codigo para continuar usando a plataforma.`;
        }

        return 'Seu acesso nao esta liberado no momento. Informe um novo codigo para continuar.';
    }, [profile?.access_expires_at, status]);

    const handleRedeem = async (e: React.FormEvent) => {
        e.preventDefault();
        if (loading) {
            return;
        }

        setLoading(true);
        setErrorMsg(null);
        setSuccessMsg(null);

        const result = await api.redeemVoucher(voucherCode);
        if (!result.success) {
            setErrorMsg(result.message || 'Nao foi possivel ativar o codigo informado.');
            setLoading(false);
            return;
        }

        clearPendingSignupVoucher();

        if (onAccessRecovered) {
            await onAccessRecovered(result.profile || null);
        }

        // If content-based voucher, show granted collections before redirecting
        if (result.grantedCollectionIds && result.grantedCollectionIds.length > 0) {
            const allCols = await api.getCollections();
            const granted = allCols.filter(c => result.grantedCollectionIds!.includes(c.id));
            setGrantedCollections(granted);
            setSuccessMsg('Acesso liberado com sucesso!');
            setLoading(false);
            return;
        }

        setSuccessMsg('Acesso liberado com sucesso. Redirecionando...');
        setTimeout(() => {
            onNavigate('home', { accessRenewed: true });
        }, 400);
    };

    const handleBackToLogin = async () => {
        await api.signOut();
        onNavigate('login');
    };

    return (
        <div className="min-h-screen bg-[radial-gradient(circle_at_top,_rgba(93,31,88,0.18),_transparent_45%),linear-gradient(180deg,_#fff7ed_0%,_#ffffff_55%)] flex items-center justify-center px-6 py-10">
            {/* Granted collections success view (T07) */}
            {grantedCollections.length > 0 ? (
                <div className="w-full max-w-lg bg-white rounded-[32px] shadow-[0_30px_120px_rgba(93,31,88,0.16)] border border-green-100 overflow-hidden">
                    <div className="px-8 pt-10 pb-6 text-center border-b border-green-50">
                        <div className="w-16 h-16 mx-auto rounded-full bg-green-100 text-green-600 flex items-center justify-center mb-5">
                            <Icons.Check size={30} />
                        </div>
                        <p className="text-xs font-black uppercase tracking-[0.24em] text-green-600 mb-3">
                            Acesso liberado
                        </p>
                        <h1 className="text-2xl font-black text-gray-900 leading-tight">
                            {grantedCollections.length === 1 ? '1 conteudo liberado!' : `${grantedCollections.length} conteudos liberados!`}
                        </h1>
                        <p className="mt-3 text-sm leading-relaxed text-gray-600">
                            Seu codigo foi ativado com sucesso. Confira os conteudos disponiveis:
                        </p>
                    </div>
                    <div className="px-8 py-6 space-y-3 max-h-60 overflow-y-auto">
                        {grantedCollections.map(col => (
                            <div key={col.id} className="flex items-center gap-3 p-3 bg-gray-50 rounded-2xl">
                                <img src={col.cover_image} alt="" className="w-12 h-12 rounded-xl object-cover flex-shrink-0" />
                                <div className="flex-1 min-w-0">
                                    <p className="text-sm font-bold text-gray-800 truncate">{col.title}</p>
                                    {col.level && <p className="text-xs text-gray-400">{formatSegmentLabel(col.level)}</p>}
                                </div>
                            </div>
                        ))}
                    </div>
                    <div className="px-8 pb-8 pt-2">
                        <Button
                            fullWidth
                            onClick={() => onNavigate('home', { accessRenewed: true })}
                        >
                            Comecar a explorar
                        </Button>
                    </div>
                </div>
            ) : (
                <div className="w-full max-w-lg bg-white rounded-[32px] shadow-[0_30px_120px_rgba(93,31,88,0.16)] border border-orange-100 overflow-hidden">
                    <div className="px-8 pt-10 pb-6 text-center border-b border-orange-50">
                        <div className="w-16 h-16 mx-auto rounded-full bg-orange-100 text-orange-600 flex items-center justify-center mb-5">
                            <Icons.AlertCircle size={30} />
                        </div>
                        <p className="text-xs font-black uppercase tracking-[0.24em] text-orange-500 mb-3">
                            {status === 'pending_voucher' ? 'Ativacao pendente' : 'Acesso expirado'}
                        </p>
                        <h1 className="text-3xl font-black text-gray-900 leading-tight">
                            Informe um novo codigo para continuar.
                        </h1>
                        <p className="mt-4 text-sm leading-relaxed text-gray-600">
                            {description}
                        </p>
                    </div>

                    <form onSubmit={handleRedeem} className="px-8 py-8 space-y-4">
                        <div className="space-y-2">
                            <label className="text-sm font-bold text-gray-700">Codigo de Acesso</label>
                            <div className="relative">
                                <input
                                    type="text"
                                    value={voucherCode}
                                    onChange={(e) => {
                                        setVoucherCode(e.target.value.toUpperCase());
                                        if (errorMsg) setErrorMsg(null);
                                    }}
                                    className="w-full bg-gray-50 border-none rounded-2xl p-4 pl-12 text-gray-800 placeholder-gray-400 focus:ring-2 focus:ring-kaboo-primary outline-none transition-all"
                                    placeholder="Ex.: KABOO-6MESES-2026"
                                    required
                                />
                                <Icons.RotateCw className="absolute left-4 top-4 text-gray-400" size={20} />
                            </div>
                        </div>

                        {!isSupabaseConfigured && demoVouchers.length > 0 && (
                            <div className="rounded-2xl border border-orange-100 bg-orange-50 px-4 py-3 text-xs text-orange-800 leading-relaxed space-y-2">
                                <p className="font-black uppercase tracking-[0.14em] text-orange-700">Teste rápido</p>
                                {activeDemoVouchers.length > 0 && (
                                    <p>
                                        <strong>Renovar com:</strong> {activeDemoVouchers.map((voucher) => voucher.code).join(', ')}.
                                    </p>
                                )}
                                {blockedDemoVouchers.length > 0 && (
                                    <p>
                                        <strong>Retornos de erro:</strong> {blockedDemoVouchers.map((voucher) => voucher.code).join(', ')}.
                                    </p>
                                )}
                            </div>
                        )}

                        {successMsg && (
                            <div className="bg-green-50 text-green-700 text-sm p-3 rounded-2xl font-medium">
                                {successMsg}
                            </div>
                        )}

                        {errorMsg && (
                            <div className="bg-red-50 text-red-600 text-sm p-3 rounded-2xl font-medium">
                                {errorMsg}
                            </div>
                        )}

                        <div className="pt-2 flex flex-col gap-3">
                            <Button type="submit" fullWidth disabled={loading}>
                                {loading ? 'Ativando...' : 'Ativar acesso'}
                            </Button>
                            <Button type="button" variant="ghost" fullWidth onClick={handleBackToLogin} disabled={loading}>
                                Voltar para o login
                            </Button>
                        </div>
                    </form>
                </div>
            )}
        </div>
    );
};