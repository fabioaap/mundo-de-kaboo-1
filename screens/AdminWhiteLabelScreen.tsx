import React, { useCallback, useEffect, useMemo, useState } from 'react';
import { ColorPicker } from '../components/ColorPicker';
import { FileUpload } from '../components/FileUpload';
import { Button } from '../design-system';
import { Icons } from '../components/Icons';
import { Toast } from '../components/Toast';
import { useToast } from '../hooks/useToast';
import { LOGO_URL } from '../constants';
import { invalidateBrandBootstrapCache, useBrandConfig } from '../hooks/useBrandConfig';
import { getWhiteLabelPreviewSettings, setActiveWhiteLabelBrand } from '../lib/whiteLabelPreview';
import { isAdmin } from '../lib/auth';
import {
    AI_PROVIDERS,
    defaultModelFor,
    getWhiteLabelAIConfig,
    setWhiteLabelAIConfig,
    testWhiteLabelAIConnection,
    type AIProviderId,
    type WhiteLabelAIConfig,
} from '../lib/aiIntegrationApi';
import {
    getWhiteLabelBrandIdentity,
    canUseRemoteWhiteLabel,
    getWhiteLabelPublicationState,
    getWhiteLabelFeatures,
    HeroParallaxMode,
    listWhiteLabelAudit,
    listWhiteLabelBrands,
    publishWhiteLabelBrand,
    resolveHeroParallaxMode,
    setWhiteLabelBrandIdentity,
    setWhiteLabelFeature,
    WhiteLabelAuditEntry,
    WhiteLabelBrandRow,
    WhiteLabelPublicationState,
    WhiteLabelBrandIdentity,
} from '../lib/whiteLabelAdminApi';

const MODE_OPTIONS: Array<{ value: HeroParallaxMode; label: string; description: string }> = [
    { value: 'off', label: 'Desligado', description: 'Desliga completamente o movimento do hero.' },
    { value: 'subtle', label: 'Suave', description: 'Profundidade leve para validação visual inicial.' },
    { value: 'standard', label: 'Padrão', description: 'Profundidade mais rica para a marca.' },
];

const DEFAULT_BRAND_IDENTITY: WhiteLabelBrandIdentity = {
    display_name: '',
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
    store_url: '',
    lead_capture_url: '',
    support_contact_url: '',
};

const serializeBrandIdentity = (identity: WhiteLabelBrandIdentity) => JSON.stringify({
    display_name: identity.display_name,
    logo_url: identity.logo_url,
    primary_color: identity.primary_color,
    light_color: identity.light_color,
    bg_color: identity.bg_color,
    accent_color: identity.accent_color,
    font_family: identity.font_family,
    green_color: identity.green_color,
    radius_xl: identity.radius_xl,
    radius_2xl: identity.radius_2xl,
    radius_3xl: identity.radius_3xl,
    login_background_url: identity.login_background_url,
    home_hero_image_url: identity.home_hero_image_url,
    store_url: identity.store_url,
    lead_capture_url: identity.lead_capture_url,
    support_contact_url: identity.support_contact_url,
});

export const AdminWhiteLabelScreen: React.FC = () => {
    // Marca desta instância (resolvida pelo app — single-brand). As Configurações
    // sempre editam essa marca, sem seletor.
    const { slug: appBrandSlug, bootstrap: brandBootstrap } = useBrandConfig();
    const [brands, setBrands] = useState<WhiteLabelBrandRow[]>([]);
    const [selectedBrandId, setSelectedBrandId] = useState<string>('');
    const [menuMusicEnabled, setMenuMusicEnabled] = useState<boolean>(true);
    const [menuFlags, setMenuFlags] = useState<Record<string, boolean>>({});
    const [heroParallaxEnabled, setHeroParallaxEnabled] = useState<boolean>(false);
    const [heroParallaxMode, setHeroParallaxMode] = useState<HeroParallaxMode>('off');
    const [contentOfflineEnabled, setContentOfflineEnabled] = useState<boolean>(false);
    const [auditEntries, setAuditEntries] = useState<WhiteLabelAuditEntry[]>([]);
    const [publicationState, setPublicationState] = useState<WhiteLabelPublicationState>({ version: 1, published_at: null });
    const [brandIdentity, setBrandIdentity] = useState<WhiteLabelBrandIdentity>(DEFAULT_BRAND_IDENTITY);
    const [brandIdentityBaseline, setBrandIdentityBaseline] = useState(() => serializeBrandIdentity(DEFAULT_BRAND_IDENTITY));
    const [activeTab, setActiveTab] = useState<'identidade' | 'operacoes' | 'menus' | 'auditoria' | 'ia'>('identidade');
    const [featureReason, setFeatureReason] = useState('');
    const [loading, setLoading] = useState(true);
    const [saving, setSaving] = useState(false);
    const [error, setError] = useState<string | null>(null);
    const [isAdminUser, setIsAdminUser] = useState(false);

    // --- Integração de IA (aba "IA") ---
    const [aiConfig, setAiConfig] = useState<WhiteLabelAIConfig | null>(null);
    const [aiProvider, setAiProvider] = useState<AIProviderId>('anthropic');
    const [aiModel, setAiModel] = useState<string>(defaultModelFor('anthropic'));
    const [aiEnabled, setAiEnabled] = useState(false);
    const [aiKeyInput, setAiKeyInput] = useState('');
    const [aiReason, setAiReason] = useState('');
    const [aiSaving, setAiSaving] = useState(false);
    const [aiTesting, setAiTesting] = useState(false);
    const [aiTestResult, setAiTestResult] = useState<{ ok: boolean; error?: string } | null>(null);

    useEffect(() => {
        isAdmin().then(setIsAdminUser);
    }, []);

    // Carrega a config de IA (mascarada) quando troca a marca.
    useEffect(() => {
        if (!selectedBrandId) {
            setAiConfig(null);
            return;
        }
        let cancelled = false;
        getWhiteLabelAIConfig(selectedBrandId)
            .then((cfg) => {
                if (cancelled) return;
                setAiConfig(cfg);
                setAiProvider(cfg.provider);
                setAiModel(cfg.model);
                setAiEnabled(cfg.enabled);
                setAiKeyInput('');
                setAiTestResult(null);
            })
            .catch(() => {
                if (!cancelled) setAiConfig(null);
            });
        return () => {
            cancelled = true;
        };
    }, [selectedBrandId]);

    const { toast, showToast, hideToast } = useToast();
    const remoteEnabled = canUseRemoteWhiteLabel();

    const selectedBrand = useMemo(
        () => brands.find((brand) => brand.id === selectedBrandId) ?? null,
        [brands, selectedBrandId],
    );

    const handleSaveAIConfig = useCallback(async () => {
        if (!selectedBrandId || aiSaving) return;
        // Exige a chave ao ativar pela primeira vez (sem chave ainda configurada).
        if (aiEnabled && !aiConfig?.key_configured && !aiKeyInput.trim()) {
            showToast('Informe a chave de API para ativar a IA.', 'error');
            return;
        }
        setAiSaving(true);
        try {
            const next = await setWhiteLabelAIConfig({
                brandId: selectedBrandId,
                provider: aiProvider,
                model: aiModel.trim() || defaultModelFor(aiProvider),
                enabled: aiEnabled,
                apiKey: aiKeyInput.trim() || undefined,
                reason: aiReason.trim() || undefined,
            });
            setAiConfig(next);
            setAiModel(next.model);
            setAiKeyInput('');
            setAiReason('');
            setAiTestResult(null);
            showToast('Configuração de IA salva com segurança.', 'success');
        } catch (e) {
            showToast(e instanceof Error ? e.message : 'Falha ao salvar a configuração de IA.', 'error');
        } finally {
            setAiSaving(false);
        }
    }, [selectedBrandId, aiSaving, aiEnabled, aiConfig, aiKeyInput, aiProvider, aiModel, aiReason, showToast]);

    const handleTestAIConnection = useCallback(async () => {
        if (!selectedBrandId || aiTesting) return;
        if (!aiConfig?.key_configured && !aiKeyInput.trim()) {
            showToast('Informe a chave para testar a conexão.', 'error');
            return;
        }
        setAiTesting(true);
        setAiTestResult(null);
        try {
            const result = await testWhiteLabelAIConnection({
                brandId: selectedBrandId,
                provider: aiProvider,
                model: aiModel.trim() || defaultModelFor(aiProvider),
                apiKey: aiKeyInput.trim() || undefined,
            });
            setAiTestResult(result);
            showToast(result.ok ? 'Conexão com o provedor OK!' : `Falha no teste: ${result.error ?? 'erro'}`, result.ok ? 'success' : 'error');
        } catch (e) {
            const error = e instanceof Error ? e.message : 'erro';
            setAiTestResult({ ok: false, error });
            showToast(`Falha no teste: ${error}`, 'error');
        } finally {
            setAiTesting(false);
        }
    }, [selectedBrandId, aiTesting, aiConfig, aiKeyInput, aiProvider, aiModel, showToast]);

    const activeFeatureCount = useMemo(
        () => Number(menuMusicEnabled) + Number(heroParallaxEnabled) + Number(contentOfflineEnabled),
        [contentOfflineEnabled, heroParallaxEnabled, menuMusicEnabled],
    );
    const isBrandIdentityDirty = useMemo(
        () => serializeBrandIdentity(brandIdentity) !== brandIdentityBaseline,
        [brandIdentity, brandIdentityBaseline],
    );
    const selectedBrandLabel = selectedBrand?.display_name || selectedBrand?.name || 'Nenhuma marca';
    const brandPreviewLogo = brandIdentity.logo_url || LOGO_URL;

    const heroParallaxModeLabel = heroParallaxMode === 'standard'
        ? 'Padrão'
        : heroParallaxMode === 'subtle'
            ? 'Suave'
            : 'Desligado';

    const updateBrandIdentityField = useCallback(<T extends keyof WhiteLabelBrandIdentity>(field: T, value: WhiteLabelBrandIdentity[T]) => {
        setBrandIdentity((current) => ({
            ...current,
            [field]: value,
        }));
    }, []);

    const hydrateBrandFeatures = useCallback(async (brandId: string) => {
        let loadedIdentity = DEFAULT_BRAND_IDENTITY;

        try {
            const identity = await getWhiteLabelBrandIdentity(brandId);
            loadedIdentity = identity;
            setBrandIdentity(identity);
        } catch (err) {
            console.error('[AdminWhiteLabelScreen] brand identity load error:', err);
            setBrandIdentity(DEFAULT_BRAND_IDENTITY);
        }

        setBrandIdentityBaseline(serializeBrandIdentity(loadedIdentity));

        const allMenuKeys = brandBootstrap.menu.map((item) => `menu.${item.key}`);
        const featureKeys = [...allMenuKeys, 'hero.parallax', 'content.offline'];
        const features = await getWhiteLabelFeatures(brandId, featureKeys);
        setHeroParallaxEnabled(features['hero.parallax']?.enabled ?? false);
        setHeroParallaxMode(resolveHeroParallaxMode(features['hero.parallax']));
        setContentOfflineEnabled(features['content.offline']?.enabled ?? false);

        const nextMenuFlags: Record<string, boolean> = {};
        for (const item of brandBootstrap.menu) {
            nextMenuFlags[item.key] = features[`menu.${item.key}`]?.enabled ?? item.enabled;
        }
        setMenuFlags(nextMenuFlags);
        setMenuMusicEnabled(features['menu.music']?.enabled ?? true);

        try {
            const publication = await getWhiteLabelPublicationState(brandId);
            setPublicationState(publication);
        } catch (err) {
            console.error('[AdminWhiteLabelScreen] publication state load error:', err);
            setPublicationState({ version: 1, published_at: null });
        }

        // Rollout, métricas, alerting, health check e timeline operacional foram
        // removidos da UI single-brand.

        try {
            const audit = await listWhiteLabelAudit(brandId, 12);
            setAuditEntries(audit);
        } catch (err) {
            console.error('[AdminWhiteLabelScreen] audit load error:', err);
            setAuditEntries([]);
        }
    }, [brandBootstrap.menu]);

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
                // Single-brand: a tela edita a marca DESTA instância (resolvida pelo app
                // via VITE_BRAND_SLUG), não a primeira da lista. Fallback: primeira disponível.
                const appBrand = loadedBrands.find((brand) => brand.slug === appBrandSlug);
                const initialBrandId = appBrand?.id ?? loadedBrands[0]?.id ?? '';

                setSelectedBrandId((current) => current || initialBrandId);

                if (initialBrandId) {
                    await hydrateBrandFeatures(initialBrandId);
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
    }, [hydrateBrandFeatures, appBrandSlug]);


    useEffect(() => {
        if (activeTab !== 'identidade' || !isBrandIdentityDirty) {
            return;
        }

        const handleBeforeUnload = (event: BeforeUnloadEvent) => {
            event.preventDefault();
            event.returnValue = '';
        };

        window.addEventListener('beforeunload', handleBeforeUnload);
        return () => {
            window.removeEventListener('beforeunload', handleBeforeUnload);
        };
    }, [activeTab, isBrandIdentityDirty]);

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
                reason: featureReason.trim() || undefined,
            });
            const targetSlug = selectedBrand?.slug;
            if (targetSlug) {
                invalidateBrandBootstrapCache(targetSlug);
            }
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
            setBrandIdentityBaseline(serializeBrandIdentity(updatedIdentity));

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

    const applyDefaultBaseline = async () => {
        if (!selectedBrandId) {
            return;
        }

        try {
            for (const item of brandBootstrap.menu) {
                if (!['admin', 'gestao'].includes(item.key)) {
                    await persistFeature(`menu.${item.key}`, true, {});
                }
            }
            await persistFeature('hero.parallax', false, { mode: 'off' });
            await persistFeature('content.offline', false, {});
            showToast('Baseline padrão aplicado com sucesso!', 'success');
        } catch (err) {
            showToast('Erro ao aplicar baseline padrão.', 'error');
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
                reason: featureReason.trim() || `Rollback da auditoria ${entry.id}`,
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


    return (
        <div className="min-h-full bg-[linear-gradient(180deg,#f8fafc_0%,#ffffff_24%)] p-4 md:p-6">
            <div className="mx-auto max-w-6xl space-y-5">
                {/* ─── Page Header ─── */}
                <header className="flex flex-col gap-3 rounded-[28px] border border-gray-200 bg-white p-5 shadow-sm md:flex-row md:items-center md:justify-between md:p-6">
                    <div>
                        <h1 className="text-2xl font-black tracking-tight text-gray-900">Configurações</h1>
                        <p className="mt-1 text-sm text-gray-500">Identidade visual, feature flags e integrações desta aplicação.</p>
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

                {/* ─── Tabs + Content ─── */}
                {selectedBrand && (
                    <>
                        <nav className="flex gap-1 border-b border-gray-200" aria-label="Seções do White Label">
                            {([
                                { key: 'identidade' as const, label: 'Identidade Visual', icon: <Icons.Palette size={16} /> },
                                { key: 'operacoes' as const, label: 'Operações', icon: <Icons.Settings size={16} /> },
                                { key: 'menus' as const, label: 'Menus', icon: <Icons.Grid size={16} /> },
                                { key: 'ia' as const, label: 'Integrações de IA', icon: <Icons.Link size={16} /> },
                                { key: 'auditoria' as const, label: 'Auditoria', icon: <Icons.History size={16} /> },
                            ]).map((tab) => (
                                <button
                                    key={tab.key}
                                    type="button"
                                    onClick={() => setActiveTab(tab.key)}
                                    className={`flex items-center gap-2 border-b-2 px-4 py-3 text-sm font-bold transition-colors ${activeTab === tab.key
                                        ? 'border-brand-primary text-brand-primary'
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
                                                    placeholder="Ex.: nome da marca"
                                                    className="w-full rounded-2xl border border-gray-200 bg-white px-3 py-3 text-sm text-gray-700 outline-none transition-colors focus:border-brand-primary/40"
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
                                                    className="w-full rounded-2xl border border-gray-200 bg-white px-3 py-3 text-sm text-gray-700 outline-none transition-colors focus:border-brand-primary/40"
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

                                    {/* Links da marca (white-label) */}
                                    <div className="rounded-[24px] border border-gray-200 bg-white p-5 shadow-sm">
                                        <div className="flex items-center gap-2">
                                            <Icons.ExternalLink size={16} className="text-gray-400" />
                                            <h3 className="text-lg font-bold text-gray-900">Links da marca</h3>
                                        </div>
                                        <p className="mt-1 text-xs text-gray-500">
                                            Lojas e contato usados nos CTAs (upsell de voucher, primeiro acesso e suporte). Deixe em branco para usar o padrão.
                                        </p>
                                        <div className="mt-4 grid gap-4">
                                            {([
                                                ['store_url', 'Loja (upsell de voucher)', 'https://loja.exemplo.com.br/'],
                                                ['lead_capture_url', 'Captação de lead / comprar acesso', 'https://loja.exemplo.com.br/'],
                                                ['support_contact_url', 'Contato de suporte', 'mailto:suporte@exemplo.com'],
                                            ] as const).map(([field, label, placeholder]) => (
                                                <label key={field} className="block">
                                                    <span className="text-sm font-semibold text-gray-700">{label}</span>
                                                    <input
                                                        type="text"
                                                        value={brandIdentity[field]}
                                                        onChange={(event) => updateBrandIdentityField(field, event.target.value)}
                                                        placeholder={placeholder}
                                                        disabled={loading || saving}
                                                        className="mt-1 w-full rounded-xl border border-gray-200 bg-gray-50 px-3 py-2 text-sm text-gray-800 focus:border-brand-primary focus:outline-none focus:ring-1 focus:ring-brand-primary"
                                                    />
                                                </label>
                                            ))}
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
                                                    className="w-full rounded-2xl border border-gray-200 bg-white px-3 py-3 text-sm text-gray-700 outline-none transition-colors focus:border-brand-primary/40"
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
                                                    className="w-full rounded-2xl border border-gray-200 bg-white px-3 py-3 text-sm text-gray-700 outline-none transition-colors focus:border-brand-primary/40"
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
                                                    className="w-full rounded-2xl border border-gray-200 bg-white px-3 py-3 text-sm text-gray-700 outline-none transition-colors focus:border-brand-primary/40"
                                                    disabled={loading || saving}
                                                />
                                            </div>
                                        </div>
                                    </div>

                                    {/* Salvar identidade */}
                                    {isBrandIdentityDirty && (
                                        <p className="text-sm font-semibold text-amber-700">
                                            Você tem alterações não salvas na identidade visual.
                                        </p>
                                    )}
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
                            <div className="grid gap-5 lg:grid-cols-[1.08fr_0.92fr]">
                                <div className="rounded-[24px] border border-gray-200 bg-white p-5 shadow-sm space-y-5">
                                    <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
                                        <div>
                                            <h3 className="text-lg font-bold text-gray-900">Feature Flags</h3>
                                            <p className="mt-1 text-sm text-gray-500">Ative capacidades da marca e aplique presets sem duplicar controles.</p>
                                        </div>
                                        <span className="rounded-full border border-gray-200 bg-gray-50 px-3 py-1.5 text-xs font-semibold text-gray-600">
                                            {activeFeatureCount} ativa(s)
                                        </span>
                                    </div>

                                    <div className="space-y-3">
                                        <div className="rounded-2xl border border-gray-100 bg-gray-50 p-4">
                                            <div className="flex items-start justify-between gap-4">
                                                <div>
                                                    <p className="text-sm font-bold text-gray-900">Menu: Músicas</p>
                                                    <p className="mt-1 text-sm text-gray-500">Liga ou desliga o item de menu de músicas para a marca.</p>
                                                </div>
                                                <button
                                                    type="button"
                                                    role="switch"
                                                    aria-checked={menuMusicEnabled}
                                                    onClick={() => persistFeature('menu.music', !menuMusicEnabled, {})}
                                                    className={`relative inline-flex h-8 w-14 shrink-0 items-center rounded-full transition-colors ${menuMusicEnabled ? 'bg-brand-primary' : 'bg-gray-300'}`}
                                                    disabled={loading || saving || !selectedBrand}
                                                >
                                                    <span className={`inline-block h-6 w-6 transform rounded-full bg-white shadow-sm transition-transform ${menuMusicEnabled ? 'translate-x-7' : 'translate-x-1'}`} />
                                                </button>
                                            </div>
                                        </div>

                                        <div className="rounded-2xl border border-gray-100 bg-gray-50 p-4">
                                            <div className="flex flex-col gap-3 md:flex-row md:items-start md:justify-between">
                                                <div>
                                                    <p className="text-sm font-bold text-gray-900">Hero Parallax</p>
                                                    <p className="mt-1 text-sm text-gray-500">Escolha a intensidade do movimento do hero para esta marca.</p>
                                                </div>
                                                <span className="rounded-full border border-gray-200 bg-white px-3 py-1.5 text-xs font-semibold text-gray-600">
                                                    {heroParallaxModeLabel}
                                                </span>
                                            </div>
                                            <div className="mt-3 grid gap-2 md:grid-cols-3">
                                                {MODE_OPTIONS.map((option) => {
                                                    const isSelected = heroParallaxMode === option.value;
                                                    return (
                                                        <button
                                                            key={option.value}
                                                            type="button"
                                                            onClick={() => persistFeature('hero.parallax', option.value !== 'off', { mode: option.value })}
                                                            className={`rounded-2xl border px-4 py-3 text-left transition-all ${isSelected
                                                                ? 'border-brand-primary bg-brand-primary/[0.05] text-brand-primary'
                                                                : 'border-gray-200 bg-white text-gray-700 hover:border-brand-primary/25'
                                                                }`}
                                                            disabled={loading || saving || !selectedBrand}
                                                        >
                                                            <div className="flex items-start justify-between gap-3">
                                                                <div>
                                                                    <p className="text-sm font-bold">{option.label}</p>
                                                                    <p className="mt-1 text-xs text-gray-500">{option.description}</p>
                                                                </div>
                                                                {isSelected && <Icons.Check size={16} className="mt-0.5 shrink-0" />}
                                                            </div>
                                                        </button>
                                                    );
                                                })}
                                            </div>
                                        </div>

                                        <div className="rounded-2xl border border-gray-100 bg-gray-50 p-4">
                                            <div className="flex items-start justify-between gap-4">
                                                <div>
                                                    <p className="text-sm font-bold text-gray-900">Download Offline</p>
                                                    <p className="mt-1 text-sm text-gray-500">Permite que usuários baixem conteúdos para uso sem internet.</p>
                                                </div>
                                                <button
                                                    type="button"
                                                    role="switch"
                                                    aria-checked={contentOfflineEnabled}
                                                    onClick={() => persistFeature('content.offline', !contentOfflineEnabled, {})}
                                                    className={`relative inline-flex h-8 w-14 shrink-0 items-center rounded-full transition-colors ${contentOfflineEnabled ? 'bg-brand-primary' : 'bg-gray-300'}`}
                                                    disabled={loading || saving || !selectedBrand}
                                                >
                                                    <span className={`inline-block h-6 w-6 transform rounded-full bg-white shadow-sm transition-transform ${contentOfflineEnabled ? 'translate-x-7' : 'translate-x-1'}`} />
                                                </button>
                                            </div>
                                        </div>
                                    </div>

                                    <div>
                                        <label className="mb-1.5 block text-xs font-semibold text-gray-500" htmlFor="feature-reason">
                                            Contexto da alteração
                                        </label>
                                        <textarea
                                            id="feature-reason"
                                            value={featureReason}
                                            onChange={(event) => setFeatureReason(event.target.value)}
                                            placeholder="Opcional. Ex.: piloto sem catálogo de música."
                                            className="min-h-[88px] w-full rounded-2xl border border-gray-200 bg-white px-3 py-2 text-sm text-gray-700 outline-none transition-colors focus:border-brand-primary/40"
                                        />
                                        <p className="mt-1 text-xs text-gray-400">Quando informado, o contexto acompanha mudanças de feature e presets.</p>
                                    </div>

                                    <div className="rounded-2xl border border-gray-100 bg-gray-50 p-4">
                                        <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
                                            <div>
                                                <p className="text-sm font-bold text-gray-900">Preset rápido</p>
                                                <p className="mt-1 text-xs text-gray-500">Atalho para voltar ao baseline esperado da aplicação.</p>
                                            </div>
                                            <div className="flex flex-wrap gap-2">
                                                <Button
                                                    variant="ghost"
                                                    onClick={applyDefaultBaseline}
                                                    disabled={loading || saving || !selectedBrand}
                                                >
                                                    Baseline padrão
                                                </Button>
                                            </div>
                                        </div>
                                    </div>
                                </div>

                                <div className="space-y-5">
                                    <div className="rounded-[24px] border border-gray-200 bg-white p-5 shadow-sm">
                                        <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
                                            <div>
                                                <p className="text-[11px] font-semibold uppercase tracking-[0.2em] text-gray-400">Publicação</p>
                                                <h3 className="mt-1 text-lg font-bold text-gray-900">
                                                    {publicationState.published_at ? `Versão v${publicationState.version} publicada` : 'Versão pronta para publicar'}
                                                </h3>
                                                <p className="mt-1 text-sm text-gray-500">
                                                    {publicationState.published_at
                                                        ? `Publicada em ${new Date(publicationState.published_at).toLocaleString('pt-BR')}`
                                                        : 'A publicação registra data e versão automaticamente nesta integração.'}
                                                </p>
                                            </div>
                                            <Button
                                                variant="primary"
                                                onClick={publishCurrentVersion}
                                                disabled={loading || saving || !selectedBrand || !isAdminUser}
                                                title={!isAdminUser ? 'Apenas administradores podem publicar' : undefined}
                                                className="min-w-[160px]"
                                            >
                                                {publicationState.published_at ? 'Publicar nova versão' : 'Publicar agora'}
                                            </Button>
                                        </div>
                                    </div>
                                </div>
                            </div>
                        )}

                        {/* ═══ Tab: Menus ═══ */}
                        {activeTab === 'menus' && (
                            <div className="space-y-5">
                                <div className="rounded-[24px] border border-gray-200 bg-white p-5 shadow-sm space-y-4">
                                    <div>
                                        <h3 className="text-lg font-bold text-gray-900">Menus da navegação</h3>
                                        <p className="mt-1 text-sm text-gray-500">Ative ou desative itens de navegação desta marca. As alterações refletem imediatamente para novos acessos.</p>
                                    </div>
                                    <div className="space-y-3">
                                        {brandBootstrap.menu
                                            .filter((item) => !['admin', 'gestao'].includes(item.key))
                                            .sort((a, b) => a.order - b.order)
                                            .map((item) => {
                                                const isEnabled = menuFlags[item.key] ?? item.enabled;
                                                const isCollections = item.key === 'collections';
                                                return (
                                                    <div key={item.key} className="rounded-2xl border border-gray-100 bg-gray-50 p-4">
                                                        <div className="flex items-start justify-between gap-4">
                                                            <div>
                                                                <p className="text-sm font-bold text-gray-900">{item.label}</p>
                                                                {isCollections && (
                                                                    <p className="mt-1 text-xs text-amber-600">Ao desligar, o app redirecionará para o primeiro menu disponível.</p>
                                                                )}
                                                            </div>
                                                            <button
                                                                type="button"
                                                                role="switch"
                                                                aria-checked={isEnabled}
                                                                onClick={() => persistFeature(`menu.${item.key}`, !isEnabled, {})}
                                                                className={`relative inline-flex h-8 w-14 shrink-0 items-center rounded-full transition-colors ${isEnabled ? 'bg-brand-primary' : 'bg-gray-300'}`}
                                                                disabled={loading || saving || !selectedBrand}
                                                            >
                                                                <span className={`inline-block h-6 w-6 transform rounded-full bg-white shadow-sm transition-transform ${isEnabled ? 'translate-x-7' : 'translate-x-1'}`} />
                                                            </button>
                                                        </div>
                                                    </div>
                                                );
                                            })}
                                    </div>
                                    <div>
                                        <label className="mb-1.5 block text-xs font-semibold text-gray-500" htmlFor="menu-feature-reason">
                                            Contexto da alteração
                                        </label>
                                        <textarea
                                            id="menu-feature-reason"
                                            value={featureReason}
                                            onChange={(event) => setFeatureReason(event.target.value)}
                                            placeholder="Opcional. Ex.: desativando músicas por ausência de catálogo."
                                            className="min-h-[72px] w-full rounded-2xl border border-gray-200 bg-white px-3 py-2 text-sm text-gray-700 outline-none transition-colors focus:border-brand-primary/40"
                                        />
                                        <p className="mt-1 text-xs text-gray-400">O contexto acompanha cada alteração no log de auditoria.</p>
                                    </div>
                                </div>
                            </div>
                        )}

                        {/* ═══ Tab: Integrações de IA ═══ */}
                        {activeTab === 'ia' && (
                            <div className="space-y-5">
                                <div className="space-y-5">
                                    <div className="rounded-[24px] border border-gray-200 bg-white p-5 shadow-sm space-y-4">
                                        <div>
                                            <h3 className="text-lg font-bold text-gray-900">Provedor de IA</h3>
                                            <p className="text-sm text-gray-500">
                                                Conecte um provedor de LLM para sugestões de conteúdo (ex.: sinopse). A chave é
                                                guardada cifrada no servidor e nunca aparece aqui — só os últimos 4 dígitos.
                                            </p>
                                        </div>

                                        {!isAdminUser && (
                                            <div className="rounded-xl bg-amber-50 border border-amber-200 p-3 text-sm text-amber-700">
                                                Apenas administradores podem alterar a configuração de IA.
                                            </div>
                                        )}
                                        {!remoteEnabled && (
                                            <div className="rounded-xl bg-blue-50 border border-blue-200 p-3 text-sm text-blue-700">
                                                Modo local/mock: salvar e testar a IA exige o ambiente real (edge functions).
                                            </div>
                                        )}

                                        {/* Ativar */}
                                        <label className="flex items-center justify-between gap-3 cursor-pointer">
                                            <span className="text-sm font-bold text-gray-800">Ativar IA para esta marca</span>
                                            <input
                                                type="checkbox"
                                                checked={aiEnabled}
                                                onChange={(e) => setAiEnabled(e.target.checked)}
                                                disabled={!isAdminUser || aiSaving}
                                                className="h-5 w-5 accent-brand-primary"
                                            />
                                        </label>

                                        {/* Provedor */}
                                        <div>
                                            <label className="block text-sm font-bold text-gray-700 mb-2">Provedor</label>
                                            <select
                                                value={aiProvider}
                                                onChange={(e) => {
                                                    const next = e.target.value as AIProviderId;
                                                    setAiProvider(next);
                                                    setAiModel(defaultModelFor(next));
                                                    setAiTestResult(null);
                                                }}
                                                disabled={!isAdminUser || aiSaving}
                                                className="w-full bg-gray-50 border-none rounded-2xl p-4 text-gray-800 focus:ring-2 focus:ring-brand-primary outline-none"
                                            >
                                                {AI_PROVIDERS.map((p) => (
                                                    <option key={p.id} value={p.id}>{p.label}</option>
                                                ))}
                                            </select>
                                        </div>

                                        {/* Modelo */}
                                        <div>
                                            <label className="block text-sm font-bold text-gray-700 mb-2">Modelo</label>
                                            <input
                                                type="text"
                                                value={aiModel}
                                                onChange={(e) => setAiModel(e.target.value)}
                                                placeholder={defaultModelFor(aiProvider)}
                                                disabled={!isAdminUser || aiSaving}
                                                className="w-full bg-gray-50 border-none rounded-2xl p-4 text-gray-800 focus:ring-2 focus:ring-brand-primary outline-none"
                                            />
                                        </div>

                                        {/* Chave */}
                                        <div>
                                            <label className="block text-sm font-bold text-gray-700 mb-2">Chave de API</label>
                                            <input
                                                type="password"
                                                value={aiKeyInput}
                                                onChange={(e) => { setAiKeyInput(e.target.value); setAiTestResult(null); }}
                                                placeholder={
                                                    aiConfig?.key_configured
                                                        ? `Chave configurada ••••${aiConfig.key_last4 ?? ''} — deixe em branco para manter`
                                                        : 'Cole a chave do provedor'
                                                }
                                                autoComplete="off"
                                                disabled={!isAdminUser || aiSaving}
                                                className="w-full bg-gray-50 border-none rounded-2xl p-4 text-gray-800 focus:ring-2 focus:ring-brand-primary outline-none"
                                            />
                                            <p className="mt-1 text-xs text-gray-500">
                                                A chave é enviada com segurança e cifrada no servidor (Vault). Não é exibida depois.
                                            </p>
                                        </div>

                                        {/* Motivo (auditoria) */}
                                        <div>
                                            <label className="block text-sm font-bold text-gray-700 mb-2">Motivo (auditoria)</label>
                                            <input
                                                type="text"
                                                value={aiReason}
                                                onChange={(e) => setAiReason(e.target.value)}
                                                placeholder="Ex.: habilitando sugestões de sinopse"
                                                disabled={!isAdminUser || aiSaving}
                                                className="w-full bg-gray-50 border-none rounded-2xl p-4 text-gray-800 focus:ring-2 focus:ring-brand-primary outline-none"
                                            />
                                        </div>

                                        <div className="flex flex-wrap gap-3 pt-1">
                                            <Button onClick={handleSaveAIConfig} disabled={!isAdminUser || aiSaving || !remoteEnabled}>
                                                {aiSaving ? 'Salvando...' : 'Salvar configuração'}
                                            </Button>
                                            <Button
                                                variant="secondary"
                                                onClick={handleTestAIConnection}
                                                disabled={!isAdminUser || aiTesting || !remoteEnabled}
                                            >
                                                {aiTesting ? 'Testando...' : 'Testar conexão'}
                                            </Button>
                                        </div>

                                        {aiTestResult && (
                                            <div className={`rounded-xl p-3 text-sm border ${aiTestResult.ok ? 'bg-green-50 border-green-200 text-green-700' : 'bg-red-50 border-red-200 text-red-700'}`}>
                                                {aiTestResult.ok ? 'Conexão validada com sucesso.' : `Falha: ${aiTestResult.error ?? 'erro'}`}
                                            </div>
                                        )}
                                    </div>
                                </div>
                            </div>
                        )}

                        {/* ═══ Tab: Auditoria ═══ */}
                        {activeTab === 'auditoria' && (
                            <div className="space-y-5">
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
                                                                className="inline-flex items-center gap-1.5 rounded-full border border-brand-primary/25 px-3 py-1 text-[11px] font-bold text-brand-primary transition-colors hover:bg-brand-primary/5 disabled:cursor-not-allowed disabled:opacity-50"
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
