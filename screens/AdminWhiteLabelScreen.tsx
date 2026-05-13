import React, { useCallback, useEffect, useMemo, useState } from 'react';
import { ColorPicker } from '../components/ColorPicker';
import { FileUpload } from '../components/FileUpload';
import { Button } from '../design-system';
import { Icons } from '../components/Icons';
import { Toast } from '../components/Toast';
import { useToast } from '../hooks/useToast';
import { LOGO_URL } from '../constants';
import { invalidateBrandBootstrapCache } from '../hooks/useBrandConfig';
import { getWhiteLabelPreviewSettings, setActiveWhiteLabelBrand } from '../lib/whiteLabelPreview';
import { isAdmin } from '../lib/auth';
import {
    getWhiteLabelAlertingConfig,
    getWhiteLabelBrandIdentity,
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
    setWhiteLabelBrandIdentity,
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
    WhiteLabelBrandIdentity,
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
    'central-coruja': 'from-[#0C1A34]/16 via-[#5D1E76]/10 to-[#EA9A3B]/8',
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

const DEFAULT_BRAND_IDENTITY: WhiteLabelBrandIdentity = {
    display_name: 'Mundo de Kaboo',
    logo_url: '',
    primary_color: '#5D1F58',
    light_color: '#883E82',
    bg_color: '#F9F5F9',
    accent_color: '#4EA8DE',
    font_family: '',
    green_color: '#70E000',
    radius_xl: '1rem',
    radius_2xl: '1.5rem',
    radius_3xl: '2rem',
    login_background_url: '',
    home_hero_image_url: '',
};

export const AdminWhiteLabelScreen: React.FC = () => {
    const [brands, setBrands] = useState<WhiteLabelBrandRow[]>([]);
    const [selectedBrandId, setSelectedBrandId] = useState<string>('');
    const [menuMusicEnabled, setMenuMusicEnabled] = useState<boolean>(true);
    const [heroParallaxEnabled, setHeroParallaxEnabled] = useState<boolean>(false);
    const [heroParallaxMode, setHeroParallaxMode] = useState<HeroParallaxMode>('off');
    const [contentOfflineEnabled, setContentOfflineEnabled] = useState<boolean>(false);
    const [auditEntries, setAuditEntries] = useState<WhiteLabelAuditEntry[]>([]);
    const [publicationState, setPublicationState] = useState<WhiteLabelPublicationState>({ version: 1, published_at: null });
    const [rolloutConfig, setRolloutConfig] = useState<WhiteLabelRolloutConfig>({ enabled: true, wave: 'pilot', started_at: null, last_changed_at: null, last_reason: null });
    const [rolloutMetrics, setRolloutMetrics] = useState<WhiteLabelRolloutMetrics>({ enabled_flags: 0, total_changes: 0, changes_24h: 0, last_publish_at: null });
    const [alertingConfig, setAlertingConfig] = useState<WhiteLabelAlertingConfig>(DEFAULT_ALERTING_CONFIG);
    const [brandIdentity, setBrandIdentity] = useState<WhiteLabelBrandIdentity>(DEFAULT_BRAND_IDENTITY);
    const [activeTab, setActiveTab] = useState<'identidade' | 'operacoes' | 'auditoria'>('identidade');
    const [alertDispatchHistory, setAlertDispatchHistory] = useState<WhiteLabelAlertDispatchEntry[]>([]);
    const [operationalTimeline, setOperationalTimeline] = useState<WhiteLabelOperationalEvent[]>([]);
    const [healthCheck, setHealthCheck] = useState<WhiteLabelHealthCheck | null>(null);
    const [reason, setReason] = useState('');
    const [contextChangedAt, setContextChangedAt] = useState<string | null>(null);
    const [loading, setLoading] = useState(true);
    const [saving, setSaving] = useState(false);
    const [error, setError] = useState<string | null>(null);
    const [isAdminUser, setIsAdminUser] = useState(false);

    useEffect(() => {
        isAdmin().then(setIsAdminUser);
    }, []);

    const { toast, showToast, hideToast } = useToast();
    const remoteEnabled = canUseRemoteWhiteLabel();

    const selectedBrand = useMemo(
        () => brands.find((brand) => brand.id === selectedBrandId) ?? null,
        [brands, selectedBrandId],
    );

    const selectedBrandLabel = selectedBrand?.display_name || selectedBrand?.name || 'Nenhuma marca';
    const selectedBrandAccent = BRAND_ACCENTS[selectedBrand?.slug ?? 'kaboo'] ?? BRAND_ACCENTS.kaboo;
    const brandPreviewLogo = brandIdentity.logo_url || LOGO_URL;

    const rolloutLabel = rolloutConfig.wave === 'pilot'
        ? 'Piloto'
        : rolloutConfig.wave === 'group'
            ? 'Grupo'
            : 'Geral';

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

    const updateBrandIdentityField = useCallback(<T extends keyof WhiteLabelBrandIdentity>(field: T, value: WhiteLabelBrandIdentity[T]) => {
        setBrandIdentity((current) => ({
            ...current,
            [field]: value,
        }));
    }, []);

    const hydrateBrandFeatures = useCallback(async (brandId: string) => {
        try {
            const identity = await getWhiteLabelBrandIdentity(brandId);
            setBrandIdentity(identity);
        } catch (err) {
            console.error('[AdminWhiteLabelScreen] brand identity load error:', err);
            setBrandIdentity(DEFAULT_BRAND_IDENTITY);
        }

        const features = await getWhiteLabelFeatures(brandId, ['menu.music', 'hero.parallax', 'content.offline']);
        setMenuMusicEnabled(features['menu.music']?.enabled ?? true);
        setHeroParallaxEnabled(features['hero.parallax']?.enabled ?? false);
        setHeroParallaxMode(resolveHeroParallaxMode(features['hero.parallax']));
        setContentOfflineEnabled(features['content.offline']?.enabled ?? false);

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
                const previewSlug = getWhiteLabelPreviewSettings().previewEnabled
                    ? getWhiteLabelPreviewSettings().activeBrandId
                    : null;
                const previewBrandId = previewSlug
                    ? loadedBrands.find((brand) => brand.slug === previewSlug)?.id ?? ''
                    : '';
                const initialBrandId = previewBrandId || firstBrandId;

                setSelectedBrandId((current) => current || initialBrandId);

                if (initialBrandId) {
                    await hydrateBrandFeatures(initialBrandId);
                    setContextChangedAt(new Date().toISOString());
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

        const previousBrandId = selectedBrandId;
        const nextBrand = brands.find((brand) => brand.id === brandId) ?? null;
        setSelectedBrandId(brandId);

        try {
            setError(null);
            await hydrateBrandFeatures(brandId);
            if (nextBrand?.slug === 'central-coruja' || nextBrand?.slug === 'kaboo') {
                setActiveWhiteLabelBrand(nextBrand.slug);
                invalidateBrandBootstrapCache(nextBrand.slug);
            }
            setContextChangedAt(new Date().toISOString());
            if (nextBrand) {
                showToast(`Contexto alterado: agora você está editando ${nextBrand.display_name || nextBrand.name}.`, 'success');
            }
        } catch (err) {
            setSelectedBrandId(previousBrandId);
            setError('Falha ao carregar flags da marca selecionada.');
            showToast('Não foi possível trocar o contexto da marca.', 'error');
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

    const saveBrandIdentity = async () => {
        if (!selectedBrandId || saving) {
            return;
        }

        if (!brandIdentity.display_name.trim()) {
            setError('Informe o nome exibido da marca para salvar a identidade visual.');
            return;
        }

        if (!brandIdentity.primary_color || !brandIdentity.light_color || !brandIdentity.bg_color || !brandIdentity.accent_color) {
            setError('Preencha as quatro cores principais da identidade visual.');
            return;
        }

        const targetSlug = selectedBrand?.slug;

        try {
            setSaving(true);
            setError(null);

            const updatedIdentity = await setWhiteLabelBrandIdentity({
                brandId: selectedBrandId,
                ...brandIdentity,
            });

            setBrandIdentity(updatedIdentity);

            const loadedBrands = await listWhiteLabelBrands();
            setBrands(loadedBrands);

            await hydrateBrandFeatures(selectedBrandId);

            if (targetSlug) {
                invalidateBrandBootstrapCache(targetSlug);
            }

            showToast(`Identidade visual de ${updatedIdentity.display_name} salva com sucesso!`, 'success');
        } catch (err) {
            setError('Falha ao salvar identidade visual da marca.');
            showToast('Erro ao salvar identidade visual.', 'error');
            console.error('[AdminWhiteLabelScreen] saveBrandIdentity error:', err);
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
            await persistFeature('content.offline', false, {});
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
            await persistFeature('content.offline', false, {});
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
            <div className="mx-auto max-w-6xl space-y-5">
                {/* ─── Health Check ─── */}
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

                {/* ─── Page Header ─── */}
                <header className="flex flex-col gap-3 rounded-[28px] border border-gray-200 bg-white p-5 shadow-sm md:flex-row md:items-center md:justify-between md:p-6">
                    <div>
                        <h1 className="text-2xl font-black tracking-tight text-gray-900">Gestão de Marca</h1>
                        <p className="mt-1 text-sm text-gray-500">Console White Label — identidade visual, feature flags e governança operacional.</p>
                    </div>
                    <div className="inline-flex items-center gap-2 rounded-full border border-gray-200 bg-gray-50 px-3 py-2 text-xs font-semibold text-gray-500">
                        <Icons.Database size={14} />
                        {remoteEnabled ? 'Supabase' : 'Mock local'}
                    </div>
                </header>

                {/* ─── Error ─── */}
                {error && (
                    <section className="rounded-[20px] border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
                        {error}
                    </section>
                )}

                {/* ─── Brand Selector + Context ─── */}
                <section className="rounded-[28px] border border-gray-200 bg-white p-4 shadow-sm md:p-5">
                    <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
                        <div className="flex flex-wrap items-center gap-2">
                            <span className="mr-1 text-xs font-semibold text-gray-400">Marca:</span>
                            {brands.map((brand) => {
                                const active = brand.id === selectedBrandId;
                                return (
                                    <button
                                        key={brand.id}
                                        type="button"
                                        onClick={() => selectBrand(brand.id)}
                                        className={`rounded-full border px-4 py-2 text-sm font-bold transition-all ${active
                                            ? 'border-kaboo-primary bg-kaboo-primary text-white shadow-md'
                                            : 'border-gray-200 bg-gray-50 text-gray-700 hover:border-kaboo-primary/40 hover:bg-gray-100'
                                            }`}
                                        disabled={loading || saving}
                                    >
                                        {brand.display_name || brand.name}
                                        {active && <Icons.Check size={14} className="ml-1.5 inline" />}
                                    </button>
                                );
                            })}
                        </div>

                        {selectedBrand && (
                            <div className="flex flex-wrap items-center gap-2 text-xs">
                                <span className="rounded-full border border-gray-200 bg-gray-50 px-3 py-1.5 font-semibold text-gray-600">
                                    {selectedBrand.slug}
                                </span>
                                <span className="rounded-full border border-gray-200 bg-gray-50 px-3 py-1.5 font-semibold text-gray-600">
                                    Rollout: {rolloutLabel}
                                </span>
                                <span className="rounded-full border border-gray-200 bg-gray-50 px-3 py-1.5 font-semibold text-gray-600">
                                    {publicationState.published_at ? `v${publicationState.version}` : 'Não publicada'}
                                </span>
                                <span className={`rounded-full px-3 py-1.5 font-semibold ${selectedBrand.is_active
                                    ? 'border border-emerald-200 bg-emerald-50 text-emerald-700'
                                    : 'border border-red-200 bg-red-50 text-red-700'
                                    }`}>
                                    {selectedBrand.is_active ? 'Ativa' : 'Inativa'}
                                </span>
                            </div>
                        )}
                    </div>
                </section>

                {/* ─── Tabs + Content ─── */}
                {selectedBrand && (
                    <>
                        <nav className="flex gap-1 border-b border-gray-200" aria-label="Seções do White Label">
                            {([
                                { key: 'identidade' as const, label: 'Identidade Visual', icon: <Icons.Palette size={16} /> },
                                { key: 'operacoes' as const, label: 'Operações', icon: <Icons.Settings size={16} /> },
                                { key: 'auditoria' as const, label: 'Auditoria', icon: <Icons.History size={16} /> },
                            ]).map((tab) => (
                                <button
                                    key={tab.key}
                                    type="button"
                                    onClick={() => setActiveTab(tab.key)}
                                    className={`flex items-center gap-2 border-b-2 px-4 py-3 text-sm font-bold transition-colors ${activeTab === tab.key
                                        ? 'border-kaboo-primary text-kaboo-primary'
                                        : 'border-transparent text-gray-400 hover:text-gray-600'
                                        }`}
                                >
                                    {tab.icon}
                                    {tab.label}
                                </button>
                            ))}
                        </nav>

                        {/* ═══ Tab: Identidade Visual ═══ */}
                        {activeTab === 'identidade' && (
                            <div className="grid gap-5 xl:grid-cols-[1fr_340px]">
                                <div className="space-y-5">
                                    {/* Dados da marca */}
                                    <div className="rounded-[24px] border border-gray-200 bg-white p-5 shadow-sm">
                                        <h3 className="text-lg font-bold text-gray-900">Dados da marca</h3>
                                        <div className="mt-4 grid gap-4 lg:grid-cols-2">
                                            <div>
                                                <label className="mb-1.5 block text-xs font-semibold text-gray-500" htmlFor="brand-display-name">
                                                    Nome exibido
                                                </label>
                                                <input
                                                    id="brand-display-name"
                                                    type="text"
                                                    value={brandIdentity.display_name}
                                                    onChange={(event) => updateBrandIdentityField('display_name', event.target.value)}
                                                    placeholder="Ex.: Central Coruja"
                                                    className="w-full rounded-2xl border border-gray-200 bg-white px-3 py-3 text-sm text-gray-700 outline-none transition-colors focus:border-kaboo-primary/40"
                                                    disabled={loading || saving}
                                                />
                                            </div>
                                            <div>
                                                <label className="mb-1.5 block text-xs font-semibold text-gray-500" htmlFor="brand-font-family">
                                                    Família tipográfica
                                                </label>
                                                <input
                                                    id="brand-font-family"
                                                    type="text"
                                                    value={brandIdentity.font_family}
                                                    onChange={(event) => updateBrandIdentityField('font_family', event.target.value)}
                                                    placeholder="Ex.: Nunito, Poppins"
                                                    className="w-full rounded-2xl border border-gray-200 bg-white px-3 py-3 text-sm text-gray-700 outline-none transition-colors focus:border-kaboo-primary/40"
                                                    disabled={loading || saving}
                                                />
                                            </div>
                                        </div>
                                    </div>

                                    {/* Imagens */}
                                    <div className="rounded-[24px] border border-gray-200 bg-white p-5 shadow-sm">
                                        <h3 className="text-lg font-bold text-gray-900">Imagens</h3>
                                        <div className="mt-4 grid gap-4 lg:grid-cols-2">
                                            <div className="rounded-2xl border border-gray-100 bg-gray-50 p-4">
                                                <FileUpload
                                                    inputId="brand-logo-upload"
                                                    label="Logo da marca"
                                                    value={brandIdentity.logo_url}
                                                    onChange={(url) => updateBrandIdentityField('logo_url', url)}
                                                    folder="extras"
                                                    accept="image/*"
                                                    collectionId={selectedBrandId}
                                                    disabled={loading || saving}
                                                />
                                            </div>
                                            <div className="rounded-2xl border border-gray-100 bg-gray-50 p-4">
                                                <FileUpload
                                                    inputId="brand-login-background-upload"
                                                    label="Fundo do login"
                                                    value={brandIdentity.login_background_url}
                                                    onChange={(url) => updateBrandIdentityField('login_background_url', url)}
                                                    folder="extras"
                                                    accept="image/*"
                                                    collectionId={selectedBrandId}
                                                    disabled={loading || saving}
                                                />
                                            </div>
                                            <div className="rounded-2xl border border-gray-100 bg-gray-50 p-4 lg:col-span-2">
                                                <FileUpload
                                                    inputId="brand-home-hero-upload"
                                                    label="Hero da home"
                                                    value={brandIdentity.home_hero_image_url}
                                                    onChange={(url) => updateBrandIdentityField('home_hero_image_url', url)}
                                                    folder="extras"
                                                    accept="image/*"
                                                    collectionId={selectedBrandId}
                                                    disabled={loading || saving}
                                                />
                                            </div>
                                        </div>
                                    </div>

                                    {/* Paleta de cores */}
                                    <div className="rounded-[24px] border border-gray-200 bg-white p-5 shadow-sm">
                                        <div className="flex items-center gap-2">
                                            <Icons.Droplets size={16} className="text-gray-400" />
                                            <h3 className="text-lg font-bold text-gray-900">Paleta de cores</h3>
                                        </div>
                                        <div className="mt-4 grid gap-4 md:grid-cols-2">
                                            <ColorPicker
                                                inputId="brand-primary-color"
                                                label="Cor principal"
                                                value={brandIdentity.primary_color}
                                                onChange={(value) => updateBrandIdentityField('primary_color', value)}
                                            />
                                            <ColorPicker
                                                inputId="brand-light-color"
                                                label="Cor clara"
                                                value={brandIdentity.light_color}
                                                onChange={(value) => updateBrandIdentityField('light_color', value)}
                                            />
                                            <ColorPicker
                                                inputId="brand-bg-color"
                                                label="Cor de fundo"
                                                value={brandIdentity.bg_color}
                                                onChange={(value) => updateBrandIdentityField('bg_color', value)}
                                            />
                                            <ColorPicker
                                                inputId="brand-accent-color"
                                                label="Cor de destaque"
                                                value={brandIdentity.accent_color}
                                                onChange={(value) => updateBrandIdentityField('accent_color', value)}
                                            />
                                        </div>
                                    </div>

                                    <div className="rounded-[24px] border border-gray-200 bg-white p-5 shadow-sm">
                                        <div className="flex items-center gap-2">
                                            <Icons.Grid size={16} className="text-gray-400" />
                                            <h3 className="text-lg font-bold text-gray-900">Tokens de design</h3>
                                        </div>
                                        <div className="mt-4 grid gap-4 lg:grid-cols-2">
                                            <ColorPicker
                                                inputId="brand-green-color"
                                                label="Cor de sucesso"
                                                value={brandIdentity.green_color}
                                                onChange={(value) => updateBrandIdentityField('green_color', value)}
                                            />
                                            <div className="rounded-2xl border border-gray-100 bg-gray-50 p-4 text-xs leading-relaxed text-gray-500">
                                                Tokens de radius aceitam qualquer valor CSS válido.
                                                Exemplos: 1rem, 24px, 1.75rem.
                                            </div>
                                            <div>
                                                <label className="mb-1.5 block text-xs font-semibold text-gray-500" htmlFor="brand-radius-xl">
                                                    Radius XL
                                                </label>
                                                <input
                                                    id="brand-radius-xl"
                                                    type="text"
                                                    value={brandIdentity.radius_xl}
                                                    onChange={(event) => updateBrandIdentityField('radius_xl', event.target.value)}
                                                    placeholder="1rem"
                                                    className="w-full rounded-2xl border border-gray-200 bg-white px-3 py-3 text-sm text-gray-700 outline-none transition-colors focus:border-kaboo-primary/40"
                                                    disabled={loading || saving}
                                                />
                                            </div>
                                            <div>
                                                <label className="mb-1.5 block text-xs font-semibold text-gray-500" htmlFor="brand-radius-2xl">
                                                    Radius 2XL
                                                </label>
                                                <input
                                                    id="brand-radius-2xl"
                                                    type="text"
                                                    value={brandIdentity.radius_2xl}
                                                    onChange={(event) => updateBrandIdentityField('radius_2xl', event.target.value)}
                                                    placeholder="1.5rem"
                                                    className="w-full rounded-2xl border border-gray-200 bg-white px-3 py-3 text-sm text-gray-700 outline-none transition-colors focus:border-kaboo-primary/40"
                                                    disabled={loading || saving}
                                                />
                                            </div>
                                            <div>
                                                <label className="mb-1.5 block text-xs font-semibold text-gray-500" htmlFor="brand-radius-3xl">
                                                    Radius 3XL
                                                </label>
                                                <input
                                                    id="brand-radius-3xl"
                                                    type="text"
                                                    value={brandIdentity.radius_3xl}
                                                    onChange={(event) => updateBrandIdentityField('radius_3xl', event.target.value)}
                                                    placeholder="2rem"
                                                    className="w-full rounded-2xl border border-gray-200 bg-white px-3 py-3 text-sm text-gray-700 outline-none transition-colors focus:border-kaboo-primary/40"
                                                    disabled={loading || saving}
                                                />
                                            </div>
                                        </div>
                                    </div>

                                    {/* Salvar identidade */}
                                    <Button
                                        variant="secondary"
                                        onClick={saveBrandIdentity}
                                        disabled={loading || saving || !selectedBrand || !isAdminUser}
                                        fullWidth
                                        title={!isAdminUser ? 'Apenas administradores podem salvar' : undefined}
                                    >
                                        Salvar identidade visual
                                    </Button>
                                </div>

                                {/* ── Sticky Preview ── */}
                                <div className="xl:sticky xl:top-4 xl:self-start">
                                    <div className="rounded-[24px] border border-gray-200 bg-gray-50 p-4">
                                        <div className="mb-3 flex items-center gap-2 text-xs font-semibold text-gray-400">
                                            <Icons.Eye size={14} />
                                            Prévia ao vivo
                                        </div>

                                        <div className="overflow-hidden rounded-2xl border border-gray-200 bg-white shadow-sm">
                                            {/* Login atmosphere */}
                                            <div
                                                className="relative min-h-[140px] p-4"
                                                style={{
                                                    backgroundImage: brandIdentity.login_background_url
                                                        ? `linear-gradient(135deg, ${brandIdentity.primary_color}CC, ${brandIdentity.accent_color}99), url(${brandIdentity.login_background_url})`
                                                        : `linear-gradient(135deg, ${brandIdentity.primary_color}, ${brandIdentity.light_color})`,
                                                    backgroundSize: 'cover',
                                                    backgroundPosition: 'center',
                                                    fontFamily: brandIdentity.font_family || undefined,
                                                    borderRadius: brandIdentity.radius_3xl || undefined,
                                                }}
                                            >
                                                <div className="absolute inset-0 bg-black/10" />
                                                <div className="relative z-10 flex flex-col gap-4">
                                                    {brandIdentity.logo_url ? (
                                                        <img src={brandIdentity.logo_url} alt={brandIdentity.display_name} className="h-10 w-auto max-w-[140px] object-contain" />
                                                    ) : (
                                                        <div className="flex h-10 w-28 items-center justify-center rounded-xl bg-white/30 backdrop-blur-sm" style={{ borderRadius: brandIdentity.radius_xl || undefined }}>
                                                            <span className="text-[11px] font-bold text-white/80">Sem logo</span>
                                                        </div>
                                                    )}

                                                    <div className="max-w-[200px] rounded-2xl bg-white/92 p-3 shadow-lg backdrop-blur-sm" style={{ borderRadius: brandIdentity.radius_2xl || undefined }}>
                                                        <p className="text-[10px] font-bold uppercase tracking-wider" style={{ color: brandIdentity.primary_color }}>
                                                            Login
                                                        </p>
                                                        <h3 className="mt-1 text-base font-black text-gray-900">{brandIdentity.display_name}</h3>
                                                    </div>
                                                </div>
                                            </div>

                                            {/* Home preview */}
                                            <div className="space-y-3 p-3" style={{ backgroundColor: brandIdentity.bg_color, fontFamily: brandIdentity.font_family || undefined }}>
                                                <div className="flex items-center justify-between gap-2 rounded-xl bg-white px-3 py-2 shadow-sm" style={{ borderRadius: brandIdentity.radius_xl || undefined }}>
                                                    <p className="text-xs font-bold text-gray-900">{brandIdentity.display_name}</p>
                                                    {brandIdentity.logo_url ? (
                                                        <img src={brandIdentity.logo_url} alt="" className="h-7 w-auto max-w-[80px] object-contain" />
                                                    ) : (
                                                        <div className="h-7 w-14 rounded-lg bg-gray-200" style={{ borderRadius: brandIdentity.radius_xl || undefined }} />
                                                    )}
                                                </div>

                                                {brandIdentity.home_hero_image_url && (
                                                    <div
                                                        className="h-20 rounded-xl border border-white/70 bg-cover bg-center shadow-sm"
                                                        style={{ backgroundImage: `linear-gradient(135deg, ${brandIdentity.primary_color}33, ${brandIdentity.accent_color}22), url(${brandIdentity.home_hero_image_url})`, borderRadius: brandIdentity.radius_xl || undefined }}
                                                    />
                                                )}

                                                <div className="grid grid-cols-3 gap-2">
                                                    <div className="rounded-xl bg-white p-3 shadow-sm" style={{ borderRadius: brandIdentity.radius_xl || undefined }}>
                                                        <p className="text-[10px] font-semibold text-gray-400">Principal</p>
                                                        <div className="mt-2 h-7 rounded-lg" style={{ backgroundColor: brandIdentity.primary_color, borderRadius: brandIdentity.radius_xl || undefined }} />
                                                    </div>
                                                    <div className="rounded-xl bg-white p-3 shadow-sm" style={{ borderRadius: brandIdentity.radius_xl || undefined }}>
                                                        <p className="text-[10px] font-semibold text-gray-400">Destaque</p>
                                                        <div className="mt-2 h-7 rounded-lg" style={{ backgroundColor: brandIdentity.accent_color, borderRadius: brandIdentity.radius_xl || undefined }} />
                                                    </div>
                                                    <div className="rounded-xl bg-white p-3 shadow-sm" style={{ borderRadius: brandIdentity.radius_xl || undefined }}>
                                                        <p className="text-[10px] font-semibold text-gray-400">Sucesso</p>
                                                        <div className="mt-2 h-7 rounded-lg" style={{ backgroundColor: brandIdentity.green_color, borderRadius: brandIdentity.radius_xl || undefined }} />
                                                    </div>
                                                </div>
                                            </div>
                                        </div>

                                        <p className="mt-2 text-[11px] leading-relaxed text-gray-400">
                                            Prévia usa a paleta e ativos em edição. Ao salvar, o cache é invalidado.
                                        </p>
                                    </div>
                                </div>
                            </div>
                        )}

                        {/* ═══ Tab: Operações ═══ */}
                        {activeTab === 'operacoes' && (
                            <div className="grid gap-5 lg:grid-cols-2">
                                {/* Feature Flags */}
                                <div className="rounded-[24px] border border-gray-200 bg-white p-5 shadow-sm space-y-5">
                                    <h3 className="text-lg font-bold text-gray-900">Feature Flags</h3>

                                    {/* Music toggle */}
                                    <div className="rounded-2xl border border-gray-100 bg-gray-50 p-4">
                                        <div className="flex items-start justify-between gap-4">
                                            <div>
                                                <p className="text-sm font-bold text-gray-900">Menu: Músicas</p>
                                                <p className="mt-1 text-sm text-gray-500">
                                                    Liga ou desliga o item de menu músicas para a marca.
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
                                                <span className={`inline-block h-6 w-6 transform rounded-full bg-white shadow-sm transition-transform ${menuMusicEnabled ? 'translate-x-7' : 'translate-x-1'}`} />
                                            </button>
                                        </div>
                                    </div>

                                    {/* Parallax toggle */}
                                    <div className="rounded-2xl border border-gray-100 bg-gray-50 p-4">
                                        <div className="flex items-start justify-between gap-4">
                                            <div>
                                                <p className="text-sm font-bold text-gray-900">Hero Parallax</p>
                                                <p className="mt-1 text-sm text-gray-500">
                                                    Efeito parallax do hero para a marca selecionada.
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
                                                <span className={`inline-block h-6 w-6 transform rounded-full bg-white shadow-sm transition-transform ${heroParallaxEnabled ? 'translate-x-7' : 'translate-x-1'}`} />
                                            </button>
                                        </div>
                                    </div>

                                    {/* Parallax mode */}
                                    <div>
                                        <p className="text-sm font-bold text-gray-900">Modo do Parallax</p>
                                        <div className="mt-2 space-y-2">
                                            {MODE_OPTIONS.map((option) => {
                                                const isSelected = heroParallaxMode === option.value;
                                                return (
                                                    <button
                                                        key={option.value}
                                                        type="button"
                                                        onClick={() => persistFeature('hero.parallax', option.value !== 'off', { mode: option.value })}
                                                        className={`w-full rounded-2xl border px-4 py-3 text-left transition-all ${isSelected
                                                            ? 'border-kaboo-primary bg-kaboo-primary/[0.05] text-kaboo-primary'
                                                            : 'border-gray-200 bg-white text-gray-700 hover:border-kaboo-primary/25'
                                                            }`}
                                                        disabled={loading || saving || !selectedBrand}
                                                    >
                                                        <div className="flex items-start justify-between gap-4">
                                                            <div>
                                                                <p className="text-sm font-bold">{option.label}</p>
                                                                <p className="mt-1 text-xs text-gray-500">{option.description}</p>
                                                            </div>
                                                            {isSelected && <Icons.Check size={16} className="mt-1 shrink-0" />}
                                                        </div>
                                                    </button>
                                                );
                                            })}
                                        </div>
                                    </div>

                                    {/* Offline toggle */}
                                    <div className="rounded-2xl border border-gray-100 bg-gray-50 p-4">
                                        <div className="flex items-start justify-between gap-4">
                                            <div>
                                                <p className="text-sm font-bold text-gray-900">Download Offline</p>
                                                <p className="mt-1 text-sm text-gray-500">
                                                    Permite que usuários baixem conteúdos para uso sem internet.
                                                </p>
                                            </div>
                                            <button
                                                type="button"
                                                role="switch"
                                                aria-checked={contentOfflineEnabled}
                                                onClick={() => persistFeature('content.offline', !contentOfflineEnabled, {})}
                                                className={`relative inline-flex h-8 w-14 shrink-0 items-center rounded-full transition-colors ${contentOfflineEnabled ? 'bg-kaboo-primary' : 'bg-gray-300'}`}
                                                disabled={loading || saving || !selectedBrand}
                                            >
                                                <span className={`inline-block h-6 w-6 transform rounded-full bg-white shadow-sm transition-transform ${contentOfflineEnabled ? 'translate-x-7' : 'translate-x-1'}`} />
                                            </button>
                                        </div>
                                    </div>

                                    {/* Reason */}
                                    <div>
                                        <label className="mb-1.5 block text-xs font-semibold text-gray-500" htmlFor="flag-reason">
                                            Motivo da mudança
                                        </label>
                                        <textarea
                                            id="flag-reason"
                                            value={reason}
                                            onChange={(event) => setReason(event.target.value)}
                                            placeholder="Ex.: Desligar música para piloto da Central Coruja"
                                            className="min-h-[80px] w-full rounded-2xl border border-gray-200 bg-white px-3 py-2 text-sm text-gray-700 outline-none transition-colors focus:border-kaboo-primary/40"
                                        />
                                    </div>

                                    {/* Presets */}
                                    <div className="flex gap-2">
                                        <Button
                                            variant="secondary"
                                            onClick={applyCorujaPreset}
                                            disabled={loading || saving || selectedBrand?.slug !== 'central-coruja'}
                                        >
                                            Preset Coruja
                                        </Button>
                                        <Button
                                            variant="ghost"
                                            onClick={applyKabooBaseline}
                                            disabled={loading || saving || selectedBrand?.slug !== 'kaboo'}
                                        >
                                            Baseline Kaboo
                                        </Button>
                                    </div>
                                </div>

                                {/* Rollout + Publication + Metrics + Alerts */}
                                <div className="space-y-5">
                                    {/* Publication */}
                                    <div className="rounded-[24px] border border-gray-200 bg-white p-5 shadow-sm">
                                        <h3 className="text-lg font-bold text-gray-900">Publicação</h3>
                                        <div className="mt-3 flex items-center justify-between gap-3">
                                            <div className="text-sm text-gray-600">
                                                <p>Versão: <span className="font-bold text-gray-900">v{publicationState.version}</span></p>
                                                <p className="mt-1">
                                                    {publicationState.published_at
                                                        ? `Publicada em ${new Date(publicationState.published_at).toLocaleString('pt-BR')}`
                                                        : 'Não publicada'}
                                                </p>
                                            </div>
                                            <Button
                                                variant="secondary"
                                                onClick={publishCurrentVersion}
                                                disabled={loading || saving || !selectedBrand || !isAdminUser}
                                                title={!isAdminUser ? 'Apenas administradores podem publicar' : undefined}
                                            >
                                                Publicar
                                            </Button>
                                        </div>
                                    </div>

                                    {/* Rollout */}
                                    <div className="rounded-[24px] border border-gray-200 bg-white p-5 shadow-sm space-y-4">
                                        <div>
                                            <h3 className="text-lg font-bold text-gray-900">Rollout por Ondas</h3>
                                            <p className="mt-1 text-sm text-gray-500">
                                                Onda atual: <span className="font-bold uppercase text-gray-900">{rolloutConfig.wave}</span>
                                                {rolloutConfig.last_changed_at && (
                                                    <span> · {new Date(rolloutConfig.last_changed_at).toLocaleString('pt-BR')}</span>
                                                )}
                                            </p>
                                            {rolloutConfig.last_reason && (
                                                <p className="mt-1 text-xs text-gray-400">Motivo: {rolloutConfig.last_reason}</p>
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
                                                        className={`w-full rounded-2xl border px-3 py-2 text-left transition-colors ${active
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

                                    {/* Metrics */}
                                    <div className="rounded-[24px] border border-gray-200 bg-white p-5 shadow-sm">
                                        <div className="flex items-center gap-2">
                                            <Icons.BarChart3 size={16} className="text-gray-400" />
                                            <h3 className="text-lg font-bold text-gray-900">Métricas</h3>
                                        </div>
                                        <div className="mt-3 grid grid-cols-3 gap-2">
                                            <div className="rounded-xl border border-gray-100 bg-gray-50 p-3 text-center">
                                                <p className="text-lg font-black text-gray-800">{rolloutMetrics.enabled_flags}</p>
                                                <p className="text-[11px] text-gray-400">Flags ativas</p>
                                            </div>
                                            <div className="rounded-xl border border-gray-100 bg-gray-50 p-3 text-center">
                                                <p className="text-lg font-black text-gray-800">{rolloutMetrics.changes_24h}</p>
                                                <p className="text-[11px] text-gray-400">Mudanças 24h</p>
                                            </div>
                                            <div className="rounded-xl border border-gray-100 bg-gray-50 p-3 text-center">
                                                <p className="text-lg font-black text-gray-800">{rolloutMetrics.total_changes}</p>
                                                <p className="text-[11px] text-gray-400">Total</p>
                                            </div>
                                        </div>
                                    </div>

                                    {/* Operational Alerts */}
                                    <div className="rounded-[24px] border border-gray-200 bg-white p-5 shadow-sm">
                                        <h3 className="text-lg font-bold text-gray-900">Alertas operacionais</h3>
                                        <div className="mt-3">
                                            {operationalAlerts.length === 0 ? (
                                                <div className="rounded-xl border border-emerald-200 bg-emerald-50 px-3 py-2 text-sm text-emerald-700">
                                                    Nenhum alerta ativo.
                                                </div>
                                            ) : (
                                                <div className="space-y-2">
                                                    {operationalAlerts.map((alert) => (
                                                        <div
                                                            key={`${alert.level}-${alert.title}`}
                                                            className={`rounded-xl border px-3 py-2 ${alert.level === 'critical'
                                                                ? 'border-red-200 bg-red-50'
                                                                : 'border-amber-200 bg-amber-50'
                                                                }`}
                                                        >
                                                            <p className={`text-xs font-bold uppercase ${alert.level === 'critical' ? 'text-red-700' : 'text-amber-700'}`}>
                                                                {alert.level === 'critical' ? 'Crítico' : 'Atenção'}
                                                            </p>
                                                            <p className="mt-1 text-sm font-bold text-gray-800">{alert.title}</p>
                                                            <p className="mt-1 text-xs text-gray-600">{alert.description}</p>
                                                        </div>
                                                    ))}
                                                </div>
                                            )}
                                        </div>
                                    </div>

                                    {/* External Alerting */}
                                    <div className="rounded-[24px] border border-gray-200 bg-white p-5 shadow-sm space-y-4">
                                        <div>
                                            <h3 className="text-lg font-bold text-gray-900">Alertas externos</h3>
                                            <p className="mt-1 text-sm text-gray-500">Webhook e canal operacional por marca.</p>
                                            {alertingConfig.last_reason && (
                                                <p className="mt-1 text-xs text-gray-400">Último motivo: {alertingConfig.last_reason}</p>
                                            )}
                                        </div>

                                        <label className="flex items-center justify-between gap-3 rounded-2xl border border-gray-100 bg-gray-50 px-3 py-3">
                                            <div>
                                                <p className="text-sm font-bold text-gray-800">Habilitar alertas externos</p>
                                                <p className="text-xs text-gray-500">Ativa destino operacional para incidentes.</p>
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
                                                <label className="mb-1 block text-xs font-semibold text-gray-500">Webhook URL</label>
                                                <input
                                                    type="url"
                                                    value={alertingConfig.webhook_url}
                                                    onChange={(event) => setAlertingConfig((current) => ({ ...current, webhook_url: event.target.value }))}
                                                    placeholder="https://hooks.exemplo.com/white-label"
                                                    className="w-full rounded-xl border border-gray-200 bg-white px-3 py-2 text-sm text-gray-700 outline-none focus:border-kaboo-primary/40"
                                                    disabled={loading || saving || !selectedBrand}
                                                />
                                            </div>
                                            <div className="grid gap-3 md:grid-cols-2">
                                                <div>
                                                    <label className="mb-1 block text-xs font-semibold text-gray-500">Canal</label>
                                                    <input
                                                        type="text"
                                                        value={alertingConfig.channel}
                                                        onChange={(event) => setAlertingConfig((current) => ({ ...current, channel: event.target.value }))}
                                                        placeholder="ops-central-coruja"
                                                        className="w-full rounded-xl border border-gray-200 bg-white px-3 py-2 text-sm text-gray-700 outline-none focus:border-kaboo-primary/40"
                                                        disabled={loading || saving || !selectedBrand}
                                                    />
                                                </div>
                                                <div>
                                                    <label className="mb-1 block text-xs font-semibold text-gray-500">Limite mudanças 24h</label>
                                                    <input
                                                        type="number"
                                                        min={1}
                                                        value={alertingConfig.changes_24h_threshold}
                                                        onChange={(event) => setAlertingConfig((current) => ({ ...current, changes_24h_threshold: Number(event.target.value || 1) }))}
                                                        className="w-full rounded-xl border border-gray-200 bg-white px-3 py-2 text-sm text-gray-700 outline-none focus:border-kaboo-primary/40"
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

                                        <div className="flex flex-wrap gap-2">
                                            <Button
                                                variant="secondary"
                                                onClick={saveAlertingConfig}
                                                disabled={loading || saving || !selectedBrand || !isAdminUser}
                                                title={!isAdminUser ? 'Apenas administradores podem salvar' : undefined}
                                            >
                                                Salvar alertas
                                            </Button>
                                            <Button
                                                variant="ghost"
                                                onClick={sendAlertTest}
                                                disabled={loading || saving || !selectedBrand || !alertingConfig.enabled || !alertingConfig.webhook_url}
                                            >
                                                Enviar teste
                                            </Button>
                                            <Button
                                                variant="secondary"
                                                onClick={sendOperationalAlerts}
                                                disabled={loading || saving || !selectedBrand || !alertingConfig.enabled || !alertingConfig.webhook_url || operationalAlerts.length === 0}
                                            >
                                                Disparar ativos
                                            </Button>
                                        </div>

                                        <div className="rounded-xl border border-gray-100 bg-gray-50 p-3 text-xs text-gray-600">
                                            <p>
                                                Último dispatch: {alertingConfig.last_dispatch_at
                                                    ? new Date(alertingConfig.last_dispatch_at).toLocaleString('pt-BR')
                                                    : 'nenhum'}
                                            </p>
                                            <p className="mt-1">
                                                Status:{' '}
                                                <span className={`font-bold ${alertingConfig.last_dispatch_status === 'success'
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
                                    </div>
                                </div>
                            </div>
                        )}

                        {/* ═══ Tab: Auditoria ═══ */}
                        {activeTab === 'auditoria' && (
                            <div className="grid gap-5 lg:grid-cols-2">
                                {/* Audit entries */}
                                <div className="rounded-[24px] border border-gray-200 bg-white p-5 shadow-sm">
                                    <h3 className="text-lg font-bold text-gray-900">Auditoria recente</h3>
                                    <div className="mt-3">
                                        {auditEntries.length === 0 ? (
                                            <p className="text-sm text-gray-500">Sem eventos recentes para esta marca.</p>
                                        ) : (
                                            <div className="max-h-[500px] space-y-2 overflow-y-auto">
                                                {auditEntries.map((entry) => (
                                                    <div key={entry.id} className="rounded-xl border border-gray-100 bg-gray-50 px-3 py-2">
                                                        <div className="flex items-center justify-between gap-2 text-xs text-gray-500">
                                                            <span className="font-bold text-gray-700">{entry.feature_key}</span>
                                                            <span>{new Date(entry.changed_at).toLocaleString('pt-BR')}</span>
                                                        </div>
                                                        <div className="mt-1 text-xs text-gray-600">
                                                            {entry.enabled_before === null ? 'init' : entry.enabled_before ? 'on' : 'off'}
                                                            {' → '}
                                                            {entry.enabled_after ? 'on' : 'off'}
                                                        </div>
                                                        {entry.reason && (
                                                            <p className="mt-1 text-xs text-gray-400">Motivo: {entry.reason}</p>
                                                        )}
                                                        <div className="mt-2 flex justify-end">
                                                            <button
                                                                type="button"
                                                                onClick={() => rollbackAuditEntry(entry)}
                                                                disabled={saving || loading || entry.enabled_before === null}
                                                                className="inline-flex items-center gap-1.5 rounded-full border border-kaboo-primary/25 px-3 py-1 text-[11px] font-bold text-kaboo-primary transition-colors hover:bg-kaboo-primary/5 disabled:cursor-not-allowed disabled:opacity-50"
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
                                </div>

                                {/* Timeline */}
                                <div className="rounded-[24px] border border-gray-200 bg-white p-5 shadow-sm">
                                    <h3 className="text-lg font-bold text-gray-900">Timeline operacional</h3>
                                    <div className="mt-3">
                                        {operationalTimeline.length === 0 ? (
                                            <p className="text-sm text-gray-500">Sem eventos operacionais registrados.</p>
                                        ) : (
                                            <div className="max-h-[500px] space-y-2 overflow-y-auto">
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
                                                        <div key={event.id} className="rounded-xl border border-gray-100 bg-gray-50 px-3 py-2">
                                                            <div className="flex items-center justify-between gap-2 text-xs text-gray-500">
                                                                <div className="flex items-center gap-2 font-bold text-gray-700">
                                                                    {icon}
                                                                    <span>{label}</span>
                                                                </div>
                                                                <span className="text-gray-400">{new Date(event.occurred_at).toLocaleString('pt-BR')}</span>
                                                            </div>
                                                            <div className="mt-1 text-xs text-gray-600">{details}</div>
                                                            {event.reason && (
                                                                <p className="mt-1 text-xs text-gray-400">Motivo: {event.reason}</p>
                                                            )}
                                                        </div>
                                                    );
                                                })}
                                            </div>
                                        )}
                                    </div>
                                </div>

                                {/* Dispatch History */}
                                <div className="rounded-[24px] border border-gray-200 bg-white p-5 shadow-sm lg:col-span-2">
                                    <h3 className="text-lg font-bold text-gray-900">Histórico de entregas</h3>
                                    <div className="mt-3">
                                        {alertDispatchHistory.length === 0 ? (
                                            <p className="text-sm text-gray-500">Sem entregas registradas.</p>
                                        ) : (
                                            <div className="space-y-2">
                                                {alertDispatchHistory.map((entry) => (
                                                    <div key={entry.id} className="rounded-xl border border-gray-100 bg-gray-50 px-3 py-2 text-xs text-gray-600">
                                                        <div className="flex items-center justify-between gap-2">
                                                            <span className="font-bold text-gray-800">{new Date(entry.sent_at).toLocaleString('pt-BR')}</span>
                                                            <span className="flex items-center gap-2">
                                                                <span className="rounded-full border border-gray-200 px-2 py-0.5 text-[10px] font-bold uppercase text-gray-500">{entry.mode}</span>
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
                                </div>

                                {/* Payload Preview */}
                                <div className="rounded-[24px] border border-gray-200 bg-white p-5 shadow-sm lg:col-span-2">
                                    <h3 className="text-lg font-bold text-gray-900">Payload de alertas</h3>
                                    <pre className="mt-3 overflow-x-auto whitespace-pre-wrap break-words rounded-xl bg-gray-50 p-3 text-[11px] leading-relaxed text-gray-600">
                                        {alertPayloadPreview}
                                    </pre>
                                </div>
                            </div>
                        )}
                    </>
                )}
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
