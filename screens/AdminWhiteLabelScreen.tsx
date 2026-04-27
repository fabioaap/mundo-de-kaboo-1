import React, { useCallback, useEffect, useMemo, useState } from 'react';
import { Button } from '../design-system';
import { Icons } from '../components/Icons';
import { Toast } from '../components/Toast';
import { useToast } from '../hooks/useToast';
import {
    getWhiteLabelAlertingConfig,
    canUseRemoteWhiteLabel,
    dispatchWhiteLabelOperationalAlerts,
    dispatchWhiteLabelAlertTest,
    getWhiteLabelAlertDispatchHistory,
    getWhiteLabelOperationalTimeline,
    getWhiteLabelHealthCheck,
    getWhiteLabelPublicationState,
    getWhiteLabelFeatures,
    getWhiteLabelRolloutConfig,
    getWhiteLabelRolloutMetrics,
    HeroParallaxMode,
    listWhiteLabelAudit,
    listWhiteLabelBrands,
    publishWhiteLabelBrand,
    resolveHeroParallaxMode,
    setWhiteLabelAlertingConfig,
    setWhiteLabelRolloutWave,
    setWhiteLabelFeature,
    WhiteLabelAlertingConfig,
    WhiteLabelAlertDispatchEntry,
    WhiteLabelAuditEntry,
    WhiteLabelBrandRow,
    WhiteLabelHealthCheck,
    WhiteLabelOperationalEvent,
    WhiteLabelPublicationState,
    WhiteLabelRolloutConfig,
    WhiteLabelRolloutMetrics,
    WhiteLabelRolloutWave,
} from '../lib/whiteLabelAdminApi';

const MODE_OPTIONS: Array<{ value: HeroParallaxMode; label: string; description: string }> = [
    { value: 'off', label: 'Off', description: 'Desliga completamente o movimento do hero.' },
    { value: 'subtle', label: 'Subtle', description: 'Profundidade suave para validação visual inicial.' },
    { value: 'standard', label: 'Standard', description: 'Profundidade mais rica para a marca.' },
];

const BRAND_ACCENTS: Record<string, string> = {
    kaboo: 'from-kaboo-primary/10 via-kaboo-primary/[0.04] to-transparent',
    'central-coruja': 'from-emerald-700/15 via-amber-300/10 to-transparent',
};

const ROLLOUT_WAVES: Array<{ value: WhiteLabelRolloutWave; label: string; description: string }> = [
    { value: 'pilot', label: 'Piloto', description: 'Exposição inicial controlada para validação.' },
    { value: 'group', label: 'Grupo', description: 'Expansão para grupo intermediário.' },
    { value: 'general', label: 'Geral', description: 'Rollout completo para toda a marca.' },
];

const DEFAULT_ALERTING_CONFIG: WhiteLabelAlertingConfig = {
    enabled: false,
    webhook_url: '',
    channel: '',
    changes_24h_threshold: 10,
    notify_on_general_without_publish: true,
    updated_at: null,
    last_reason: null,
    last_dispatch_at: null,
    last_dispatch_status: 'idle',
    last_dispatch_http_status: null,
    last_dispatch_error: null,
    last_live_alert_signature: null,
};

export const AdminWhiteLabelScreen: React.FC = () => {
    const [brands, setBrands] = useState<WhiteLabelBrandRow[]>([]);
    const [selectedBrandId, setSelectedBrandId] = useState<string>('');
    const [menuMusicEnabled, setMenuMusicEnabled] = useState<boolean>(true);
    const [heroParallaxEnabled, setHeroParallaxEnabled] = useState<boolean>(false);
    const [heroParallaxMode, setHeroParallaxMode] = useState<HeroParallaxMode>('off');
    const [auditEntries, setAuditEntries] = useState<WhiteLabelAuditEntry[]>([]);
    const [publicationState, setPublicationState] = useState<WhiteLabelPublicationState>({ version: 1, published_at: null });
    const [rolloutConfig, setRolloutConfig] = useState<WhiteLabelRolloutConfig>({ enabled: true, wave: 'pilot', started_at: null, last_changed_at: null, last_reason: null });
    const [rolloutMetrics, setRolloutMetrics] = useState<WhiteLabelRolloutMetrics>({ enabled_flags: 0, total_changes: 0, changes_24h: 0, last_publish_at: null });
    const [alertingConfig, setAlertingConfig] = useState<WhiteLabelAlertingConfig>(DEFAULT_ALERTING_CONFIG);
    const [alertDispatchHistory, setAlertDispatchHistory] = useState<WhiteLabelAlertDispatchEntry[]>([]);
    const [operationalTimeline, setOperationalTimeline] = useState<WhiteLabelOperationalEvent[]>([]);
    const [healthCheck, setHealthCheck] = useState<WhiteLabelHealthCheck | null>(null);
    const [reason, setReason] = useState('');
    const [loading, setLoading] = useState(true);
    const [saving, setSaving] = useState(false);
    const [error, setError] = useState<string | null>(null);

    const { toast, showToast, hideToast } = useToast();
    const remoteEnabled = canUseRemoteWhiteLabel();

    const selectedBrand = useMemo(
        () => brands.find((brand) => brand.id === selectedBrandId) ?? null,
        [brands, selectedBrandId],
    );

    const operationalAlerts = useMemo(() => {
        const alerts: Array<{ level: 'critical' | 'warning'; title: string; description: string }> = [];

        if (alertingConfig.notify_on_general_without_publish && rolloutConfig.wave === 'general' && !rolloutMetrics.last_publish_at) {
            alerts.push({
                level: 'critical',
                title: 'Rollout geral sem publicação',
                description: 'A marca está em rollout geral, mas não há publicação registrada para essa versão.',
            });
        }

        if (rolloutMetrics.changes_24h >= alertingConfig.changes_24h_threshold) {
            alerts.push({
                level: 'warning',
                title: 'Alta taxa de alterações em 24h',
                description: `Foram registradas ${rolloutMetrics.changes_24h} alterações nas últimas 24h.`,
            });
        }

        if (rolloutMetrics.enabled_flags === 0) {
            alerts.push({
                level: 'warning',
                title: 'Nenhuma flag ativa',
                description: 'Não há flags ativas para a marca selecionada; valide o baseline e as dependências.',
            });
        }

        return alerts;
    }, [alertingConfig.changes_24h_threshold, alertingConfig.notify_on_general_without_publish, rolloutConfig.wave, rolloutMetrics.changes_24h, rolloutMetrics.enabled_flags, rolloutMetrics.last_publish_at]);

    const operationalAlertPayload = useMemo(() => {
        return {
            brand: selectedBrand ? { id: selectedBrand.id, slug: selectedBrand.slug, name: selectedBrand.display_name || selectedBrand.name } : null,
            rollout: {
                wave: rolloutConfig.wave,
                last_changed_at: rolloutConfig.last_changed_at,
            },
            metrics: rolloutMetrics,
            active_alerts: operationalAlerts,
            destination: {
                channel: alertingConfig.channel,
                webhook_url: alertingConfig.webhook_url ? '[configured]' : '[missing]',
            },
            generated_at: new Date().toISOString(),
        };
    }, [alertingConfig.channel, alertingConfig.webhook_url, operationalAlerts, rolloutConfig.last_changed_at, rolloutConfig.wave, rolloutMetrics, selectedBrand]);

    const activeAlertSignature = useMemo(() => {
        return JSON.stringify({
            brandId: selectedBrandId,
            wave: rolloutConfig.wave,
            metrics: {
                enabled_flags: rolloutMetrics.enabled_flags,
                changes_24h: rolloutMetrics.changes_24h,
                last_publish_at: rolloutMetrics.last_publish_at,
            },
            alerts: operationalAlerts,
        });
    }, [operationalAlerts, rolloutConfig.wave, rolloutMetrics.changes_24h, rolloutMetrics.enabled_flags, rolloutMetrics.last_publish_at, selectedBrandId]);

    const alertPayloadPreview = useMemo(() => {
        return JSON.stringify(operationalAlertPayload, null, 2);
    }, [operationalAlertPayload]);

    const hydrateBrandFeatures = useCallback(async (brandId: string) => {
        const features = await getWhiteLabelFeatures(brandId, ['menu.music', 'hero.parallax']);
        setMenuMusicEnabled(features['menu.music']?.enabled ?? true);
        setHeroParallaxEnabled(features['hero.parallax']?.enabled ?? false);
        setHeroParallaxMode(resolveHeroParallaxMode(features['hero.parallax']));

        try {
            const publication = await getWhiteLabelPublicationState(brandId);
            setPublicationState(publication);
        } catch (err) {
            console.error('[AdminWhiteLabelScreen] publication state load error:', err);
            setPublicationState({ version: 1, published_at: null });
        }

        try {
            const rollout = await getWhiteLabelRolloutConfig(brandId);
            setRolloutConfig(rollout);
        } catch (err) {
            console.error('[AdminWhiteLabelScreen] rollout config load error:', err);
            setRolloutConfig({ enabled: true, wave: 'pilot', started_at: null, last_changed_at: null, last_reason: null });
        }

        try {
            const metrics = await getWhiteLabelRolloutMetrics(brandId);
            setRolloutMetrics(metrics);
        } catch (err) {
            console.error('[AdminWhiteLabelScreen] rollout metrics load error:', err);
            setRolloutMetrics({ enabled_flags: 0, total_changes: 0, changes_24h: 0, last_publish_at: null });
        }

        try {
            const alerting = await getWhiteLabelAlertingConfig(brandId);
            setAlertingConfig(alerting);
        } catch (err) {
            console.error('[AdminWhiteLabelScreen] alerting config load error:', err);
            setAlertingConfig(DEFAULT_ALERTING_CONFIG);
        }

        try {
            const dispatchHistory = await getWhiteLabelAlertDispatchHistory(brandId);
            setAlertDispatchHistory(dispatchHistory);
        } catch (err) {
            console.error('[AdminWhiteLabelScreen] alert dispatch history load error:', err);
            setAlertDispatchHistory([]);
        }

        try {
            const audit = await listWhiteLabelAudit(brandId, 12);
            setAuditEntries(audit);
        } catch (err) {
            console.error('[AdminWhiteLabelScreen] audit load error:', err);
            setAuditEntries([]);
        }

        try {
            const timeline = await getWhiteLabelOperationalTimeline(brandId, 50);
            setOperationalTimeline(timeline);
        } catch (err) {
            console.error('[AdminWhiteLabelScreen] operational timeline load error:', err);
            setOperationalTimeline([]);
        }

        try {
            const health = await getWhiteLabelHealthCheck(brandId);
            setHealthCheck(health);
        } catch (err) {
            console.error('[AdminWhiteLabelScreen] health check load error:', err);
            setHealthCheck(null);
        }
    }, []);

    useEffect(() => {
        let cancelled = false;

        async function load() {
            try {
                setLoading(true);
                setError(null);
                const loadedBrands = await listWhiteLabelBrands();
                if (cancelled) {
                    return;
                }

                setBrands(loadedBrands);
                const firstBrandId = loadedBrands[0]?.id ?? '';
                setSelectedBrandId((current) => current || firstBrandId);

                if (firstBrandId) {
                    await hydrateBrandFeatures(firstBrandId);
                }
            } catch (err) {
                if (!cancelled) {
                    setError('Não foi possível carregar configurações de White Label.');
                    console.error('[AdminWhiteLabelScreen] load error:', err);
                }
            } finally {
                if (!cancelled) {
                    setLoading(false);
                }
            }
        }

        load();
        return () => {
            cancelled = true;
        };
    }, [hydrateBrandFeatures]);

    useEffect(() => {
        if (!selectedBrandId || loading || saving) {
            return;
        }

        if (!alertingConfig.enabled || !alertingConfig.webhook_url || operationalAlerts.length === 0) {
            return;
        }

        if (alertingConfig.last_live_alert_signature === activeAlertSignature) {
            return;
        }

        let cancelled = false;

        async function dispatchActiveAlerts() {
            try {
                const result = await dispatchWhiteLabelOperationalAlerts({
                    brandId: selectedBrandId,
                    payload: operationalAlertPayload as Record<string, unknown>,
                    alertSignature: activeAlertSignature,
                    reason: `Auto-dispatch operacional: ${operationalAlerts.map((alert) => alert.title).join(' | ')}`,
                });

                if (cancelled) {
                    return;
                }

                setAlertingConfig(result.config);
                setAlertDispatchHistory(result.history);
            } catch (err) {
                if (!cancelled) {
                    console.error('[AdminWhiteLabelScreen] auto dispatch active alerts error:', err);
                }
            }
        }

        void dispatchActiveAlerts();

        return () => {
            cancelled = true;
        };
    }, [activeAlertSignature, alertingConfig.enabled, alertingConfig.last_live_alert_signature, alertingConfig.webhook_url, loading, operationalAlertPayload, operationalAlerts, saving, selectedBrandId]);

    const selectBrand = async (brandId: string) => {
        if (brandId === selectedBrandId || saving) {
            return;
        }

        setSelectedBrandId(brandId);
        try {
            setError(null);
            await hydrateBrandFeatures(brandId);
        } catch (err) {
            setError('Falha ao carregar flags da marca selecionada.');
            console.error('[AdminWhiteLabelScreen] selectBrand error:', err);
        }
    };

    const persistFeature = async (featureKey: string, enabled: boolean, config: Record<string, unknown>) => {
        if (!selectedBrandId || saving) {
            return;
        }

        try {
            setSaving(true);
            setError(null);
            await setWhiteLabelFeature({
                brandId: selectedBrandId,
                featureKey,
                enabled,
                config,
                reason: reason.trim() || undefined,
            });
            await hydrateBrandFeatures(selectedBrandId);
        } catch (err) {
            setError('Falha ao salvar alteração de feature flag.');
            console.error('[AdminWhiteLabelScreen] persistFeature error:', err);
        } finally {
            setSaving(false);
        }
    };

    const applyCorujaPreset = async () => {
        if (!selectedBrandId) {
            return;
        }

        try {
            await persistFeature('menu.music', false, {});
            await persistFeature('hero.parallax', true, { mode: 'subtle' });
            showToast('Preset Central Coruja aplicado com sucesso!', 'success');
        } catch (err) {
            showToast('Erro ao aplicar preset Central Coruja.', 'error');
        }
    };

    const applyKabooBaseline = async () => {
        if (!selectedBrandId) {
            return;
        }

        try {
            await persistFeature('menu.music', true, {});
            await persistFeature('hero.parallax', false, { mode: 'off' });
            showToast('Baseline Kaboo aplicado com sucesso!', 'success');
        } catch (err) {
            showToast('Erro ao aplicar baseline Kaboo.', 'error');
        }
    };

    const rollbackAuditEntry = async (entry: WhiteLabelAuditEntry) => {
        if (!selectedBrandId || entry.enabled_before === null || saving) {
            return;
        }

        try {
            setSaving(true);
            setError(null);
            await setWhiteLabelFeature({
                brandId: selectedBrandId,
                featureKey: entry.feature_key,
                enabled: entry.enabled_before,
                config: entry.config_before ?? {},
                reason: reason.trim() || `Rollback da auditoria ${entry.id}`,
            });
            await hydrateBrandFeatures(selectedBrandId);
        } catch (err) {
            setError('Falha ao reverter alteração de feature flag.');
            console.error('[AdminWhiteLabelScreen] rollbackAuditEntry error:', err);
        } finally {
            setSaving(false);
        }
    };

    const publishCurrentVersion = async () => {
        if (!selectedBrandId || saving) {
            return;
        }

        if (!reason.trim()) {
            setError('Informe o motivo da publicação para auditoria operacional.');
            return;
        }

        try {
            setSaving(true);
            setError(null);
            const updated = await publishWhiteLabelBrand(selectedBrandId);
            setPublicationState(updated);
            await hydrateBrandFeatures(selectedBrandId);
            showToast(`Marca publicada com sucesso! Versão ${updated.version} ativa.`, 'success');
        } catch (err) {
            setError('Falha ao publicar a versão atual da marca.');
            showToast('Erro ao publicar marca.', 'error');
            console.error('[AdminWhiteLabelScreen] publishCurrentVersion error:', err);
        } finally {
            setSaving(false);
        }
    };

    const changeRolloutWave = async (wave: WhiteLabelRolloutWave) => {
        if (!selectedBrandId || saving || rolloutConfig.wave === wave) {
            return;
        }

        if (!reason.trim()) {
            setError('Informe o motivo da mudança de onda para governança.');
            return;
        }

        if (wave === 'general' && !publicationState.published_at) {
            setError('Para usar rollout geral, publique a versão atual da marca antes.');
            return;
        }

        try {
            setSaving(true);
            setError(null);
            const nextConfig = await setWhiteLabelRolloutWave({
                brandId: selectedBrandId,
                wave,
                reason: reason.trim(),
            });
            setRolloutConfig(nextConfig);
            const metrics = await getWhiteLabelRolloutMetrics(selectedBrandId);
            setRolloutMetrics(metrics);
            const waveLabel = wave === 'pilot' ? 'Piloto' : wave === 'group' ? 'Grupo' : 'Geral';
            showToast(`Rollout alterado para ${waveLabel}!`, 'success');
        } catch (err) {
            setError('Falha ao atualizar a onda de rollout.');
            showToast('Erro ao mudar rollout.', 'error');
            console.error('[AdminWhiteLabelScreen] changeRolloutWave error:', err);
        } finally {
            setSaving(false);
        }
    };

    const saveAlertingConfig = async () => {
        if (!selectedBrandId || saving) {
            return;
        }

        if (!reason.trim()) {
            setError('Informe o motivo da mudança de alertas externos.');
            return;
        }

        try {
            setSaving(true);
            setError(null);
            const nextConfig = await setWhiteLabelAlertingConfig({
                brandId: selectedBrandId,
                enabled: alertingConfig.enabled,
                webhook_url: alertingConfig.webhook_url,
                channel: alertingConfig.channel,
                changes_24h_threshold: alertingConfig.changes_24h_threshold,
                notify_on_general_without_publish: alertingConfig.notify_on_general_without_publish,
                reason: reason.trim(),
            });
            setAlertingConfig(nextConfig);
            const dispatchHistory = await getWhiteLabelAlertDispatchHistory(selectedBrandId);
            setAlertDispatchHistory(dispatchHistory);
        } catch (err) {
            setError('Falha ao salvar configuração de alertas externos.');
            console.error('[AdminWhiteLabelScreen] saveAlertingConfig error:', err);
        } finally {
            setSaving(false);
        }
    };

    const sendAlertTest = async () => {
        if (!selectedBrandId || saving) {
            return;
        }

        if (!reason.trim()) {
            setError('Informe o motivo para enviar o teste de alerta.');
            return;
        }

        try {
            setSaving(true);
            setError(null);
            const result = await dispatchWhiteLabelAlertTest({
                brandId: selectedBrandId,
                payload: operationalAlertPayload as Record<string, unknown>,
                reason: reason.trim(),
            });
            setAlertingConfig(result.config);
            setAlertDispatchHistory(result.history);
        } catch (err) {
            setError('Falha ao enviar alerta de teste.');
            console.error('[AdminWhiteLabelScreen] sendAlertTest error:', err);
        } finally {
            setSaving(false);
        }
    };

    const sendOperationalAlerts = async () => {
        if (!selectedBrandId || saving) {
            return;
        }

        if (!reason.trim()) {
            setError('Informe o motivo para disparar alertas operacionais.');
            return;
        }

        if (operationalAlerts.length === 0) {
            setError('Não há alertas operacionais ativos para disparar.');
            return;
        }

        try {
            setSaving(true);
            setError(null);
            const result = await dispatchWhiteLabelOperationalAlerts({
                brandId: selectedBrandId,
                payload: operationalAlertPayload as Record<string, unknown>,
                alertSignature: activeAlertSignature,
                reason: reason.trim(),
            });
            setAlertingConfig(result.config);
            setAlertDispatchHistory(result.history);
        } catch (err) {
            setError('Falha ao disparar alertas operacionais.');
            console.error('[AdminWhiteLabelScreen] sendOperationalAlerts error:', err);
        } finally {
            setSaving(false);
        }
    };

    return (
        <div className="min-h-full bg-[linear-gradient(180deg,#f8fafc_0%,#ffffff_24%)] p-4 md:p-6">
            <div className="mx-auto max-w-5xl space-y-6">
                {healthCheck && (
                    <section className={`rounded-[28px] border-2 p-5 md:p-6 ${healthCheck.status === 'critical' ? 'border-red-200 bg-red-50' :
                        healthCheck.status === 'warning' ? 'border-yellow-200 bg-yellow-50' :
                            'border-green-200 bg-green-50'
                        }`}>
                        <div className="flex flex-col gap-4">
                            <div className="flex items-center justify-between">
                                <div className="flex items-center gap-2">
                                    <div className={`rounded-full p-2 ${healthCheck.status === 'critical' ? 'bg-red-100' :
                                        healthCheck.status === 'warning' ? 'bg-yellow-100' :
                                            'bg-green-100'
                                        }`}>
                                        {healthCheck.status === 'critical' ? (
                                            <Icons.AlertTriangle size={18} className="text-red-600" />
                                        ) : healthCheck.status === 'warning' ? (
                                            <Icons.AlertCircle size={18} className="text-yellow-600" />
                                        ) : (
                                            <Icons.CheckCircle size={18} className="text-green-600" />
                                        )}
                                    </div>
                                    <div>
                                        <p className="text-[11px] font-black uppercase tracking-[0.18em] text-gray-600">Status de Saúde</p>
                                        <h3 className="text-lg font-black tracking-tight text-gray-900">
                                            {healthCheck.status === 'critical' ? 'Crítico' :
                                                healthCheck.status === 'warning' ? 'Aviso' :
                                                    'Saudável'}
                                        </h3>
                                    </div>
                                </div>
                                <span className="text-xs text-gray-500">
                                    {new Date(healthCheck.timestamp).toLocaleTimeString('pt-BR')}
                                </span>
                            </div>
                            <div className="space-y-2">
                                {healthCheck.checks.map((check) => (
                                    <div key={check.name} className="flex items-center gap-3 rounded-lg bg-white/60 p-3 text-sm">
                                        <div>
                                            {check.status === 'pass' ? (
                                                <Icons.Check size={16} className="text-green-600" />
                                            ) : check.status === 'warn' ? (
                                                <Icons.AlertCircle size={16} className="text-yellow-600" />
                                            ) : (
                                                <Icons.X size={16} className="text-red-600" />
                                            )}
                                        </div>
                                        <div className="flex flex-col gap-1">
                                            <span className="font-bold text-gray-900">{check.name}</span>
                                            <span className="text-xs text-gray-600">{check.message}</span>
                                        </div>
                                    </div>
                                ))}
                            </div>
                        </div>
                    </section>
                )}

                <section className="rounded-[28px] border border-gray-200 bg-white p-5 shadow-sm md:p-6">
                    <div className="flex flex-col gap-3 md:flex-row md:items-end md:justify-between">
                        <div>
                            <p className="text-[11px] font-black uppercase tracking-[0.18em] text-kaboo-primary">White Label</p>
                            <h1 className="mt-2 text-2xl font-black tracking-tight text-gray-900">Flags de Marca e Parallax</h1>
                            <p className="mt-2 max-w-3xl text-sm leading-relaxed text-gray-500">
                                Sprint 2: este painel já persiste flags por marca no backend quando o Supabase está ativo.
                            </p>
                        </div>

                        <div className="inline-flex items-center gap-2 rounded-full border border-gray-200 bg-gray-50 px-3 py-2 text-xs font-bold uppercase tracking-[0.14em] text-gray-500">
                            <Icons.Database size={14} />
                            {remoteEnabled ? 'Fonte: Supabase' : 'Fonte: Mock local'}
                        </div>
                    </div>
                </section>

                {error && (
                    <section className="rounded-[20px] border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
                        {error}
                    </section>
                )}

                <section className="grid gap-4 lg:grid-cols-[1.2fr_0.8fr]">
                    <div className="rounded-[28px] border border-gray-200 bg-white p-5 shadow-sm md:p-6">
                        <div className="flex items-center gap-2 text-sm font-black uppercase tracking-[0.16em] text-gray-400">
                            <Icons.Type size={16} />
                            Marcas
                        </div>

                        <div className="mt-4 grid gap-3 md:grid-cols-2">
                            {brands.map((brand) => {
                                const active = brand.id === selectedBrandId;
                                const accent = BRAND_ACCENTS[brand.slug] ?? BRAND_ACCENTS.kaboo;

                                return (
                                    <button
                                        key={brand.id}
                                        type="button"
                                        onClick={() => selectBrand(brand.id)}
                                        className={`rounded-[24px] border p-4 text-left transition-all duration-200 ${active
                                            ? 'border-kaboo-primary bg-kaboo-primary/[0.04] shadow-[0_20px_35px_rgba(111,37,108,0.12)]'
                                            : 'border-gray-200 bg-white hover:border-kaboo-primary/30 hover:bg-gray-50'
                                            }`}
                                        disabled={loading || saving}
                                    >
                                        <div className={`rounded-[20px] bg-gradient-to-br ${accent} p-4`}>
                                            <div className="flex items-start justify-between gap-3">
                                                <div>
                                                    <p className="text-sm font-black text-gray-900">{brand.display_name || brand.name}</p>
                                                    <p className="mt-2 text-xs leading-relaxed text-gray-600">slug: {brand.slug}</p>
                                                </div>
                                                {active && (
                                                    <span className="inline-flex h-8 w-8 items-center justify-center rounded-full bg-kaboo-primary text-white shadow-sm">
                                                        <Icons.Check size={16} />
                                                    </span>
                                                )}
                                            </div>
                                        </div>
                                    </button>
                                );
                            })}
                        </div>
                    </div>

                    <div className="rounded-[28px] border border-gray-200 bg-white p-5 shadow-sm md:p-6">
                        <div className="flex items-center gap-2 text-sm font-black uppercase tracking-[0.16em] text-gray-400">
                            <Icons.Settings size={16} />
                            Feature Flags
                        </div>

                        <div className="mt-4 space-y-5">
                            <div className="rounded-[22px] border border-gray-200 bg-gray-50 p-4">
                                <div className="flex items-start justify-between gap-4">
                                    <div>
                                        <p className="text-sm font-bold text-gray-900">Menu: Músicas</p>
                                        <p className="mt-1 text-sm leading-relaxed text-gray-500">
                                            Liga ou desliga o item de menu músicas para a marca selecionada.
                                        </p>
                                    </div>

                                    <button
                                        type="button"
                                        role="switch"
                                        aria-checked={menuMusicEnabled}
                                        onClick={() => persistFeature('menu.music', !menuMusicEnabled, {})}
                                        className={`relative inline-flex h-8 w-14 shrink-0 items-center rounded-full transition-colors ${menuMusicEnabled ? 'bg-kaboo-primary' : 'bg-gray-300'}`}
                                        disabled={loading || saving || !selectedBrand}
                                    >
                                        <span
                                            className={`inline-block h-6 w-6 transform rounded-full bg-white shadow-sm transition-transform ${menuMusicEnabled ? 'translate-x-7' : 'translate-x-1'}`}
                                        />
                                    </button>
                                </div>
                            </div>

                            <div className="rounded-[22px] border border-gray-200 bg-gray-50 p-4">
                                <div className="flex items-start justify-between gap-4">
                                    <div>
                                        <p className="text-sm font-bold text-gray-900">Hero Parallax</p>
                                        <p className="mt-1 text-sm leading-relaxed text-gray-500">
                                            Controla o efeito de parallax do hero para a marca selecionada.
                                        </p>
                                    </div>

                                    <button
                                        type="button"
                                        role="switch"
                                        aria-checked={heroParallaxEnabled}
                                        onClick={() => {
                                            const nextEnabled = !heroParallaxEnabled;
                                            const nextMode: HeroParallaxMode = nextEnabled ? (heroParallaxMode === 'off' ? 'subtle' : heroParallaxMode) : 'off';
                                            persistFeature('hero.parallax', nextEnabled, { mode: nextMode });
                                        }}
                                        className={`relative inline-flex h-8 w-14 shrink-0 items-center rounded-full transition-colors ${heroParallaxEnabled ? 'bg-kaboo-primary' : 'bg-gray-300'}`}
                                        disabled={loading || saving || !selectedBrand}
                                    >
                                        <span
                                            className={`inline-block h-6 w-6 transform rounded-full bg-white shadow-sm transition-transform ${heroParallaxEnabled ? 'translate-x-7' : 'translate-x-1'}`}
                                        />
                                    </button>
                                </div>
                            </div>

                            <div>
                                <p className="text-sm font-bold text-gray-900">Modo do Parallax</p>
                                <div className="mt-3 space-y-2">
                                    {MODE_OPTIONS.map((option) => {
                                        const isSelected = heroParallaxMode === option.value;

                                        return (
                                            <button
                                                key={option.value}
                                                type="button"
                                                onClick={() => persistFeature('hero.parallax', option.value !== 'off', { mode: option.value })}
                                                className={`w-full rounded-[18px] border px-4 py-3 text-left transition-all ${isSelected
                                                    ? 'border-kaboo-primary bg-kaboo-primary/[0.05] text-kaboo-primary'
                                                    : 'border-gray-200 bg-white text-gray-700 hover:border-kaboo-primary/25 hover:bg-gray-50'
                                                    }`}
                                                disabled={loading || saving || !selectedBrand}
                                            >
                                                <div className="flex items-start justify-between gap-4">
                                                    <div>
                                                        <p className="text-sm font-bold">{option.label}</p>
                                                        <p className="mt-1 text-xs leading-relaxed text-gray-500">{option.description}</p>
                                                    </div>
                                                    {isSelected && <Icons.Check size={16} className="mt-1 shrink-0" />}
                                                </div>
                                            </button>
                                        );
                                    })}
                                </div>
                            </div>

                            <div>
                                <label className="mb-2 block text-xs font-black uppercase tracking-[0.12em] text-gray-400" htmlFor="flag-reason">
                                    Motivo da mudança (auditoria)
                                </label>
                                <textarea
                                    id="flag-reason"
                                    value={reason}
                                    onChange={(event) => setReason(event.target.value)}
                                    placeholder="Ex.: Desligar música para piloto da Central Coruja"
                                    className="min-h-[88px] w-full rounded-[16px] border border-gray-200 bg-white px-3 py-2 text-sm text-gray-700 outline-none transition-colors focus:border-kaboo-primary/40"
                                />
                            </div>

                            <Button
                                variant="secondary"
                                onClick={applyCorujaPreset}
                                fullWidth
                                disabled={loading || saving || selectedBrand?.slug !== 'central-coruja'}
                            >
                                Aplicar preset Central Coruja
                            </Button>

                            <Button
                                variant="ghost"
                                onClick={applyKabooBaseline}
                                fullWidth
                                disabled={loading || saving || selectedBrand?.slug !== 'kaboo'}
                            >
                                Aplicar baseline Kaboo
                            </Button>

                            <div className="rounded-[20px] border border-gray-200 bg-gray-50 p-4">
                                <div className="flex items-start justify-between gap-3">
                                    <div>
                                        <p className="text-sm font-bold text-gray-900">Publicação da Marca</p>
                                        <p className="mt-1 text-xs text-gray-500">
                                            Versão atual: <span className="font-black text-gray-700">v{publicationState.version}</span>
                                        </p>
                                        <p className="mt-1 text-xs text-gray-500">
                                            Última publicação:{' '}
                                            {publicationState.published_at
                                                ? new Date(publicationState.published_at).toLocaleString('pt-BR')
                                                : 'não publicada'}
                                        </p>
                                    </div>

                                    <Button
                                        variant="secondary"
                                        onClick={publishCurrentVersion}
                                        disabled={loading || saving || !selectedBrand}
                                    >
                                        Publicar agora
                                    </Button>
                                </div>
                            </div>

                            <div className="rounded-[20px] border border-gray-200 bg-gray-50 p-4 space-y-4">
                                <div>
                                    <p className="text-sm font-bold text-gray-900">Rollout por Ondas</p>
                                    <p className="mt-1 text-xs text-gray-500">
                                        Onda atual: <span className="font-black uppercase text-gray-700">{rolloutConfig.wave}</span>
                                        {rolloutConfig.last_changed_at && (
                                            <span> · atualizado em {new Date(rolloutConfig.last_changed_at).toLocaleString('pt-BR')}</span>
                                        )}
                                    </p>
                                    {rolloutConfig.last_reason && (
                                        <p className="mt-1 text-xs text-gray-500">Último motivo: {rolloutConfig.last_reason}</p>
                                    )}
                                </div>

                                <div className="grid gap-2">
                                    {ROLLOUT_WAVES.map((wave) => {
                                        const active = rolloutConfig.wave === wave.value;
                                        return (
                                            <button
                                                key={wave.value}
                                                type="button"
                                                onClick={() => changeRolloutWave(wave.value)}
                                                disabled={loading || saving || !selectedBrand}
                                                className={`w-full rounded-[16px] border px-3 py-2 text-left transition-colors ${active
                                                    ? 'border-kaboo-primary bg-kaboo-primary/[0.06]'
                                                    : 'border-gray-200 bg-white hover:border-kaboo-primary/25'
                                                    }`}
                                            >
                                                <div className="flex items-center justify-between gap-3">
                                                    <p className="text-sm font-bold text-gray-800">{wave.label}</p>
                                                    {active && <Icons.Check size={14} className="text-kaboo-primary" />}
                                                </div>
                                                <p className="mt-1 text-xs text-gray-500">{wave.description}</p>
                                            </button>
                                        );
                                    })}
                                </div>
                            </div>

                            <div className="rounded-[20px] border border-gray-200 bg-gray-50 p-4">
                                <div className="mb-3 flex items-center gap-2 text-xs font-black uppercase tracking-[0.12em] text-gray-400">
                                    <Icons.BarChart3 size={14} />
                                    Métricas de rollout
                                </div>

                                <div className="grid grid-cols-2 gap-2">
                                    <div className="rounded-[12px] border border-gray-200 bg-white p-3">
                                        <p className="text-[10px] font-black uppercase tracking-[0.1em] text-gray-400">Flags ativas</p>
                                        <p className="mt-1 text-lg font-black text-gray-800">{rolloutMetrics.enabled_flags}</p>
                                    </div>
                                    <div className="rounded-[12px] border border-gray-200 bg-white p-3">
                                        <p className="text-[10px] font-black uppercase tracking-[0.1em] text-gray-400">Mudanças 24h</p>
                                        <p className="mt-1 text-lg font-black text-gray-800">{rolloutMetrics.changes_24h}</p>
                                    </div>
                                    <div className="rounded-[12px] border border-gray-200 bg-white p-3 col-span-2">
                                        <p className="text-[10px] font-black uppercase tracking-[0.1em] text-gray-400">Mudanças totais</p>
                                        <p className="mt-1 text-lg font-black text-gray-800">{rolloutMetrics.total_changes}</p>
                                        <p className="mt-1 text-xs text-gray-500">
                                            Última publicação: {rolloutMetrics.last_publish_at
                                                ? new Date(rolloutMetrics.last_publish_at).toLocaleString('pt-BR')
                                                : 'não publicada'}
                                        </p>
                                    </div>
                                </div>
                            </div>

                            <div className="rounded-[20px] border border-gray-200 bg-gray-50 p-4">
                                <div className="mb-3 flex items-center gap-2 text-xs font-black uppercase tracking-[0.12em] text-gray-400">
                                    <Icons.AlertCircle size={14} />
                                    Alertas operacionais
                                </div>

                                {operationalAlerts.length === 0 ? (
                                    <div className="rounded-[12px] border border-emerald-200 bg-emerald-50 px-3 py-2 text-sm text-emerald-700">
                                        Nenhum alerta ativo no momento.
                                    </div>
                                ) : (
                                    <div className="space-y-2">
                                        {operationalAlerts.map((alert) => (
                                            <div
                                                key={`${alert.level}-${alert.title}`}
                                                className={`rounded-[12px] border px-3 py-2 ${alert.level === 'critical'
                                                    ? 'border-red-200 bg-red-50'
                                                    : 'border-amber-200 bg-amber-50'
                                                    }`}
                                            >
                                                <p className={`text-xs font-black uppercase tracking-[0.08em] ${alert.level === 'critical' ? 'text-red-700' : 'text-amber-700'}`}>
                                                    {alert.level === 'critical' ? 'Crítico' : 'Atenção'}
                                                </p>
                                                <p className="mt-1 text-sm font-bold text-gray-800">{alert.title}</p>
                                                <p className="mt-1 text-xs text-gray-600">{alert.description}</p>
                                            </div>
                                        ))}
                                    </div>
                                )}
                            </div>

                            <div className="rounded-[20px] border border-gray-200 bg-gray-50 p-4 space-y-4">
                                <div>
                                    <p className="text-sm font-bold text-gray-900">Alertas externos</p>
                                    <p className="mt-1 text-xs text-gray-500">
                                        Persistência da configuração para webhook/canal operacional por marca.
                                    </p>
                                    {alertingConfig.last_reason && (
                                        <p className="mt-1 text-xs text-gray-500">Último motivo: {alertingConfig.last_reason}</p>
                                    )}
                                </div>

                                <label className="flex items-center justify-between gap-3 rounded-[16px] border border-gray-200 bg-white px-3 py-3">
                                    <div>
                                        <p className="text-sm font-bold text-gray-800">Habilitar alertas externos</p>
                                        <p className="text-xs text-gray-500">Ativa destino operacional para incidentes e limites.</p>
                                    </div>
                                    <input
                                        type="checkbox"
                                        checked={alertingConfig.enabled}
                                        onChange={(event) => setAlertingConfig((current) => ({ ...current, enabled: event.target.checked }))}
                                        className="h-4 w-4 accent-kaboo-primary"
                                        disabled={loading || saving || !selectedBrand}
                                    />
                                </label>

                                <div className="grid gap-3">
                                    <div>
                                        <label className="mb-1 block text-xs font-black uppercase tracking-[0.1em] text-gray-400">Webhook URL</label>
                                        <input
                                            type="url"
                                            value={alertingConfig.webhook_url}
                                            onChange={(event) => setAlertingConfig((current) => ({ ...current, webhook_url: event.target.value }))}
                                            placeholder="https://hooks.exemplo.com/white-label"
                                            className="w-full rounded-[14px] border border-gray-200 bg-white px-3 py-2 text-sm text-gray-700 outline-none focus:border-kaboo-primary/40"
                                            disabled={loading || saving || !selectedBrand}
                                        />
                                    </div>

                                    <div className="grid gap-3 md:grid-cols-2">
                                        <div>
                                            <label className="mb-1 block text-xs font-black uppercase tracking-[0.1em] text-gray-400">Canal</label>
                                            <input
                                                type="text"
                                                value={alertingConfig.channel}
                                                onChange={(event) => setAlertingConfig((current) => ({ ...current, channel: event.target.value }))}
                                                placeholder="ops-central-coruja"
                                                className="w-full rounded-[14px] border border-gray-200 bg-white px-3 py-2 text-sm text-gray-700 outline-none focus:border-kaboo-primary/40"
                                                disabled={loading || saving || !selectedBrand}
                                            />
                                        </div>

                                        <div>
                                            <label className="mb-1 block text-xs font-black uppercase tracking-[0.1em] text-gray-400">Limite mudanças 24h</label>
                                            <input
                                                type="number"
                                                min={1}
                                                value={alertingConfig.changes_24h_threshold}
                                                onChange={(event) => setAlertingConfig((current) => ({ ...current, changes_24h_threshold: Number(event.target.value || 1) }))}
                                                className="w-full rounded-[14px] border border-gray-200 bg-white px-3 py-2 text-sm text-gray-700 outline-none focus:border-kaboo-primary/40"
                                                disabled={loading || saving || !selectedBrand}
                                            />
                                        </div>
                                    </div>
                                </div>

                                <label className="flex items-center gap-2 text-sm text-gray-700">
                                    <input
                                        type="checkbox"
                                        checked={alertingConfig.notify_on_general_without_publish}
                                        onChange={(event) => setAlertingConfig((current) => ({ ...current, notify_on_general_without_publish: event.target.checked }))}
                                        className="h-4 w-4 accent-kaboo-primary"
                                        disabled={loading || saving || !selectedBrand}
                                    />
                                    Notificar rollout geral sem publicação
                                </label>

                                <Button
                                    variant="secondary"
                                    onClick={saveAlertingConfig}
                                    fullWidth
                                    disabled={loading || saving || !selectedBrand}
                                >
                                    Salvar alertas externos
                                </Button>

                                <Button
                                    variant="ghost"
                                    onClick={sendAlertTest}
                                    fullWidth
                                    disabled={loading || saving || !selectedBrand || !alertingConfig.enabled || !alertingConfig.webhook_url}
                                >
                                    Enviar teste de alerta
                                </Button>

                                <Button
                                    variant="secondary"
                                    onClick={sendOperationalAlerts}
                                    fullWidth
                                    disabled={loading || saving || !selectedBrand || !alertingConfig.enabled || !alertingConfig.webhook_url || operationalAlerts.length === 0}
                                >
                                    Disparar alertas ativos
                                </Button>

                                <div className="rounded-[14px] border border-gray-200 bg-white p-3 text-xs text-gray-600">
                                    <p>
                                        Último dispatch: {alertingConfig.last_dispatch_at
                                            ? new Date(alertingConfig.last_dispatch_at).toLocaleString('pt-BR')
                                            : 'nenhum envio ainda'}
                                    </p>
                                    <p className="mt-1">
                                        Status: <span className={`font-bold ${alertingConfig.last_dispatch_status === 'success'
                                            ? 'text-emerald-700'
                                            : alertingConfig.last_dispatch_status === 'error'
                                                ? 'text-red-700'
                                                : 'text-gray-700'
                                            }`}>{alertingConfig.last_dispatch_status}</span>
                                        {alertingConfig.last_dispatch_http_status !== null && (
                                            <span> · HTTP {alertingConfig.last_dispatch_http_status}</span>
                                        )}
                                    </p>
                                    {alertingConfig.last_dispatch_error && (
                                        <p className="mt-1 text-red-600">Erro: {alertingConfig.last_dispatch_error}</p>
                                    )}
                                </div>

                                <div className="rounded-[14px] border border-gray-200 bg-white p-3">
                                    <p className="text-[10px] font-black uppercase tracking-[0.1em] text-gray-400">Histórico de entregas</p>
                                    {alertDispatchHistory.length === 0 ? (
                                        <p className="mt-2 text-xs text-gray-500">Sem entregas registradas ainda.</p>
                                    ) : (
                                        <div className="mt-2 space-y-2">
                                            {alertDispatchHistory.map((entry) => (
                                                <div key={entry.id} className="rounded-[10px] border border-gray-200 px-3 py-2 text-xs text-gray-600">
                                                    <div className="flex items-center justify-between gap-2">
                                                        <span className="font-bold text-gray-800">{new Date(entry.sent_at).toLocaleString('pt-BR')}</span>
                                                        <span className="flex items-center gap-2">
                                                            <span className="rounded-full border border-gray-200 px-2 py-0.5 text-[10px] font-black uppercase tracking-[0.08em] text-gray-500">{entry.mode}</span>
                                                            <span className={`font-bold ${entry.status === 'success' ? 'text-emerald-700' : 'text-red-700'}`}>{entry.status}</span>
                                                        </span>
                                                    </div>
                                                    <p className="mt-1">Canal: {entry.channel || 'n/a'} · Tentativas: {entry.attempts}</p>
                                                    {entry.http_status !== null && <p className="mt-1">HTTP: {entry.http_status}</p>}
                                                    {entry.error && <p className="mt-1 text-red-600">Erro: {entry.error}</p>}
                                                </div>
                                            ))}
                                        </div>
                                    )}
                                </div>

                                <div className="rounded-[14px] border border-gray-200 bg-white p-3">
                                    <p className="text-[10px] font-black uppercase tracking-[0.1em] text-gray-400">Preview do payload</p>
                                    <pre className="mt-2 overflow-x-auto whitespace-pre-wrap break-words text-[11px] leading-relaxed text-gray-600">{alertPayloadPreview}</pre>
                                </div>
                            </div>

                            <div className="rounded-[20px] border border-gray-200 bg-gray-50 p-4">
                                <div className="mb-3 flex items-center gap-2 text-xs font-black uppercase tracking-[0.12em] text-gray-400">
                                    <Icons.History size={14} />
                                    Auditoria recente
                                </div>

                                {auditEntries.length === 0 ? (
                                    <p className="text-sm text-gray-500">Sem eventos recentes para esta marca.</p>
                                ) : (
                                    <div className="space-y-2">
                                        {auditEntries.map((entry) => (
                                            <div key={entry.id} className="rounded-[14px] border border-gray-200 bg-white px-3 py-2">
                                                <div className="flex items-center justify-between gap-2 text-xs text-gray-500">
                                                    <span className="font-bold text-gray-700">{entry.feature_key}</span>
                                                    <span>{new Date(entry.changed_at).toLocaleString('pt-BR')}</span>
                                                </div>
                                                <div className="mt-1 text-xs text-gray-600">
                                                    {entry.enabled_before === null ? 'init' : entry.enabled_before ? 'on' : 'off'}
                                                    {' -> '}
                                                    {entry.enabled_after ? 'on' : 'off'}
                                                </div>
                                                {entry.reason && (
                                                    <p className="mt-1 text-xs text-gray-500">Motivo: {entry.reason}</p>
                                                )}

                                                <div className="mt-2 flex justify-end">
                                                    <button
                                                        type="button"
                                                        onClick={() => rollbackAuditEntry(entry)}
                                                        disabled={saving || loading || entry.enabled_before === null}
                                                        className="inline-flex items-center gap-1.5 rounded-full border border-kaboo-primary/25 px-3 py-1 text-[11px] font-black uppercase tracking-[0.1em] text-kaboo-primary transition-colors hover:bg-kaboo-primary/5 disabled:cursor-not-allowed disabled:opacity-50"
                                                    >
                                                        <Icons.RotateCcw size={12} />
                                                        Reverter
                                                    </button>
                                                </div>
                                            </div>
                                        ))}
                                    </div>
                                )}
                            </div>

                            <div className="rounded-[20px] border border-gray-200 bg-gray-50 p-4">
                                <div className="mb-3 flex items-center gap-2 text-xs font-black uppercase tracking-[0.12em] text-gray-400">
                                    <Icons.LineChart size={14} />
                                    Timeline de eventos operacionais
                                </div>

                                {operationalTimeline.length === 0 ? (
                                    <p className="text-sm text-gray-500">Sem eventos operacionais registrados para esta marca.</p>
                                ) : (
                                    <div className="space-y-2 max-h-96 overflow-y-auto">
                                        {operationalTimeline.map((event) => {
                                            let icon: React.ReactNode = null;
                                            let label: string = '';
                                            let details: string = '';

                                            if (event.type === 'alert_dispatch') {
                                                icon = <Icons.Send size={12} />;
                                                label = `Alerta ${event.data.dispatch?.mode === 'live' ? 'live' : 'teste'}`;
                                                details = `Canal: ${event.data.dispatch?.channel} · ${event.data.dispatch?.status}`;
                                            } else if (event.type === 'flag_change') {
                                                icon = <Icons.Settings size={12} />;
                                                label = `Flag: ${event.data.flag?.feature_key}`;
                                                details = `${event.data.flag?.enabled_before === null ? 'init' : event.data.flag?.enabled_before ? 'on' : 'off'} → ${event.data.flag?.enabled_after ? 'on' : 'off'}`;
                                            } else if (event.type === 'rollout_wave') {
                                                icon = <Icons.TrendingUp size={12} />;
                                                label = `Rollout: ${event.data.rollout?.wave_after}`;
                                                details = `Wave anterior: ${event.data.rollout?.wave_before}`;
                                            } else if (event.type === 'publication') {
                                                icon = <Icons.CheckCircle size={12} />;
                                                label = `Publicação`;
                                                details = `Versão: ${event.data.publication?.version}`;
                                            }

                                            return (
                                                <div key={event.id} className="rounded-[12px] border border-gray-200 bg-white px-3 py-2">
                                                    <div className="flex items-center justify-between gap-2 text-xs text-gray-500">
                                                        <div className="flex items-center gap-2 text-gray-700 font-bold">
                                                            {icon}
                                                            <span>{label}</span>
                                                        </div>
                                                        <span className="text-gray-400">{new Date(event.occurred_at).toLocaleString('pt-BR')}</span>
                                                    </div>
                                                    <div className="mt-1 text-xs text-gray-600">{details}</div>
                                                    {event.reason && (
                                                        <p className="mt-1 text-xs text-gray-500">Motivo: {event.reason}</p>
                                                    )}
                                                </div>
                                            );
                                        })}
                                    </div>
                                )}
                            </div>
                        </div>
                    </div>
                </section>
            </div>
            {toast && (
                <Toast
                    message={toast.message}
                    type={toast.type}
                    isVisible={toast.isVisible}
                    onClose={hideToast}
                    progress={toast.progress}
                />
            )}
        </div>
    );
};
