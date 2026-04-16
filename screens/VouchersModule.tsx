import React, { useState, useEffect, useMemo } from 'react';
import { Icons } from '../components/Icons';
import { Button } from '../design-system';
import { Toast } from '../components/Toast';
import { CriticalConfirmationModal } from '../components/CriticalConfirmationModal';
import { VouchersOnboardingBanner } from '../components/VouchersOnboardingBanner';
import { useToast } from '../hooks/useToast';
import {
    VoucherModel,
    VoucherBatch,
    VoucherBatchStatus,
    VoucherModelStatus,
    VoucherPackageType,
    VoucherDurationMonths,
    Voucher,
    AuditLogEntry,
} from '../types';
import {
    getVoucherModels,
    getVoucherModelById,
    createVoucherModel,
    updateVoucherModel,
    getVoucherBatches,
    createVoucherBatch,
    updateBatchStatus,
    getBatchVouchers,
    getAllMockVoucherCodes,
    getAuditLog,
    generateBatchCsv,
    disableVoucherCode,
    isValidVoucherBatchQuantity,
    MIN_VOUCHER_BATCH_QUANTITY,
    MAX_VOUCHER_BATCH_QUANTITY,
} from '../lib/mockVoucherData';
import { getMockCollectionsLive } from '../lib/mockData';

/* ── Constants ────────────────────────────────────────── */

const PACKAGE_LABELS: Record<VoucherPackageType, { icon: string; label: string }> = {
    book: { icon: '📖', label: 'Livro' },
    collection: { icon: '📚', label: 'Coleção' },
    kit: { icon: '📦', label: 'Kit' },
    curated_set: { icon: '🎁', label: 'Conjunto curado' },
};

const MODEL_STATUS_CLASSES: Record<VoucherModelStatus, string> = {
    draft: 'bg-amber-100 text-amber-700',
    active: 'bg-emerald-100 text-emerald-700',
    archived: 'bg-gray-200 text-gray-500',
};

const MODEL_STATUS_LABELS: Record<VoucherModelStatus, string> = {
    draft: 'Rascunho',
    active: 'Ativo',
    archived: 'Arquivado',
};

const BATCH_STATUS_LABELS: Record<string, string> = {
    generated: 'Gerado',
    exported: 'Exportado',
    sent: 'Enviado',
    confirmed: 'Confirmado',
    cancelled: 'Cancelado',
};

const BATCH_STATUS_CLASSES: Record<string, string> = {
    generated: 'bg-blue-100 text-blue-700',
    exported: 'bg-emerald-100 text-emerald-700',
    sent: 'bg-purple-100 text-purple-700',
    confirmed: 'bg-gray-200 text-gray-600',
    cancelled: 'bg-red-100 text-red-700',
};

const DURATION_OPTIONS: VoucherDurationMonths[] = [1, 3, 6, 9, 12];
const MIN_CUSTOM_DURATION_MONTHS = 1;
const MAX_CUSTOM_DURATION_MONTHS = 120;
const VOUCHERS_ONBOARDING_STORAGE_KEY = 'kaboo_vouchers_onboarding_v1';

const WIZARD_STEP_COPY: Record<1 | 2 | 3, { title: string; description: string }> = {
    1: {
        title: 'Configurar modelo',
        description: 'Defina a identificação do voucher e as regras básicas de acesso antes de escolher os conteúdos.',
    },
    2: {
        title: 'Selecionar conteúdos',
        description: 'Selecione exatamente os conteúdos que este voucher vai liberar para o usuário.',
    },
    3: {
        title: 'Revisar e salvar',
        description: 'Confira o resumo final e decida se o modelo fica em rascunho ou pronto para emissão.',
    },
};

type VoucherSubView = 'models' | 'batches' | 'codes' | 'audit';

/* ── StatusBadge ──────────────────────────────────────── */

const StatusBadge: React.FC<{ label: string; className: string }> = ({ label, className }) => (
    <span className={`inline-flex items-center px-2 py-0.5 rounded-full text-xs font-semibold ${className}`}>
        {label}
    </span>
);

/* ── ModelPreview ─────────────────────────────────────── */

const ModelPreview: React.FC<{ model: VoucherModel }> = ({ model }) => {
    const items = model.items || [];
    const pkg = PACKAGE_LABELS[model.package_type];
    return (
        <div className="bg-gray-50 border border-gray-200 rounded-xl p-4">
            <div className="flex items-center gap-2 mb-3">
                <span className="text-xl">{pkg.icon}</span>
                <span className="font-bold text-gray-800">{model.name}</span>
                <StatusBadge label={MODEL_STATUS_LABELS[model.status]} className={MODEL_STATUS_CLASSES[model.status]} />
            </div>
            <div className="grid grid-cols-2 gap-2 text-sm text-gray-600 mb-3">
                <div>Tipo: <span className="font-medium text-gray-800">{pkg.label}</span></div>
                <div>Itens: <span className="font-medium text-gray-800">{items.length}</span></div>
                <div>Duração: <span className="font-medium text-gray-800">{model.duration_months} meses</span></div>
                <div>Validade código: <span className="font-medium text-gray-800">{model.redeem_by ? new Date(model.redeem_by).toLocaleDateString('pt-BR') : 'Sem limite'}</span></div>
            </div>
            {items.length > 0 && (
                <div className="flex flex-wrap gap-2">
                    {items.map((item) => (
                        <div key={item.id} className="flex items-center gap-1.5 bg-white border border-gray-200 rounded-lg px-2 py-1">
                            {item.collection?.cover_image && (
                                <img src={item.collection.cover_image} alt="" className="w-6 h-6 rounded object-cover" />
                            )}
                            <span className="text-xs text-gray-700 truncate max-w-[120px]">{item.collection?.title || item.collection_id}</span>
                        </div>
                    ))}
                </div>
            )}
        </div>
    );
};

/* ════════════════════════════════════════════════════════
   SUB-VIEW: Models List
   ════════════════════════════════════════════════════════ */

const ModelsListView: React.FC<{
    onCreateNew: () => void;
    onSelectModel: (id: string) => void;
}> = ({ onCreateNew, onSelectModel }) => {
    const [models, setModels] = useState<VoucherModel[]>([]);
    const [search, setSearch] = useState('');
    const [statusFilter, setStatusFilter] = useState<VoucherModelStatus | 'all'>('all');
    const [showOnboarding, setShowOnboarding] = useState(() => {
        try {
            return localStorage.getItem(VOUCHERS_ONBOARDING_STORAGE_KEY) === null;
        } catch {
            return true;
        }
    });

    useEffect(() => { setModels(getVoucherModels()); }, []);

    const dismissOnboarding = () => {
        try {
            localStorage.setItem(VOUCHERS_ONBOARDING_STORAGE_KEY, JSON.stringify({ dismissedAt: new Date().toISOString() }));
        } catch {
            // noop: localStorage may be unavailable in some environments
        }

        setShowOnboarding(false);
    };

    const handleCreateNew = () => {
        if (showOnboarding) {
            dismissOnboarding();
        }

        onCreateNew();
    };

    const filtered = useMemo(() => {
        return models.filter(m => {
            if (statusFilter !== 'all' && m.status !== statusFilter) return false;
            if (search && !m.name.toLowerCase().includes(search.toLowerCase())) return false;
            return true;
        });
    }, [models, search, statusFilter]);

    return (
        <div className="p-4 md:p-6 max-w-5xl mx-auto">
            {/* Header */}
            <div className="flex items-center justify-between mb-6">
                <h1 className="text-xl font-bold text-gray-800">Modelos de Voucher</h1>
                <Button onClick={handleCreateNew}>
                    <Icons.Plus className="w-4 h-4 mr-1" /> Novo modelo
                </Button>
            </div>

            {showOnboarding && (
                <VouchersOnboardingBanner
                    onDismiss={dismissOnboarding}
                    onCreateFirstModel={models.length === 0 ? handleCreateNew : undefined}
                />
            )}

            {/* Filters */}
            <div className="flex flex-col sm:flex-row gap-3 mb-5">
                <div className="relative flex-1">
                    <Icons.Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
                    <input
                        type="text"
                        placeholder="Buscar modelo..."
                        value={search}
                        onChange={(e) => setSearch(e.target.value)}
                        className="w-full pl-9 pr-3 py-2 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-kaboo-primary/30"
                    />
                </div>
                <select
                    value={statusFilter}
                    onChange={(e) => setStatusFilter(e.target.value as VoucherModelStatus | 'all')}
                    className="border border-gray-200 rounded-lg px-3 py-2 text-sm bg-white focus:outline-none focus:ring-2 focus:ring-kaboo-primary/30"
                >
                    <option value="all">Todos os status</option>
                    <option value="draft">Rascunho</option>
                    <option value="active">Ativo</option>
                    <option value="archived">Arquivado</option>
                </select>
            </div>

            {/* List */}
            {filtered.length === 0 ? (
                <div className="text-center py-16 text-gray-400">
                    <Icons.Ticket className="w-12 h-12 mx-auto mb-3 opacity-40" />
                    <p className="text-sm">{models.length === 0 ? (showOnboarding ? 'Quando você criar seu primeiro modelo, ele aparecerá aqui.' : 'Nenhum modelo criado.') : 'Nenhum resultado encontrado.'}</p>
                    {models.length === 0 && !showOnboarding && (
                        <button onClick={handleCreateNew} className="mt-3 text-kaboo-primary text-sm font-medium hover:underline">
                            Criar o primeiro modelo
                        </button>
                    )}
                </div>
            ) : (
                <div className="space-y-3">
                    {filtered.map((model) => {
                        const pkg = PACKAGE_LABELS[model.package_type];
                        const itemCount = model.items?.length || 0;
                        return (
                            <button
                                key={model.id}
                                onClick={() => onSelectModel(model.id)}
                                className="w-full text-left bg-white border border-gray-200 rounded-xl p-4 hover:border-kaboo-primary/40 hover:shadow-sm transition-all"
                            >
                                <div className="flex items-start justify-between gap-3">
                                    <div className="flex-1 min-w-0">
                                        <div className="flex items-center gap-2 mb-1">
                                            <span className="text-lg">{pkg.icon}</span>
                                            <span className="font-bold text-gray-800 truncate">{model.name}</span>
                                            <StatusBadge label={MODEL_STATUS_LABELS[model.status]} className={MODEL_STATUS_CLASSES[model.status]} />
                                        </div>
                                        <p className="text-sm text-gray-500">
                                            {pkg.label} · {itemCount} {itemCount === 1 ? 'item' : 'itens'} · {model.duration_months} meses
                                            {model.redeem_by ? ` · validade até ${new Date(model.redeem_by).toLocaleDateString('pt-BR')}` : ''}
                                        </p>
                                    </div>
                                    <Icons.ChevronRight className="w-5 h-5 text-gray-300 flex-shrink-0 mt-1" />
                                </div>
                            </button>
                        );
                    })}
                </div>
            )}
        </div>
    );
};

/* ════════════════════════════════════════════════════════
   SUB-VIEW: Model Detail
   ════════════════════════════════════════════════════════ */

const ModelDetailView: React.FC<{
    modelId: string;
    onBack: () => void;
    onEdit: (id: string) => void;
    onEmitBatch: (id: string) => void;
    onViewBatch: (batchId: string) => void;
}> = ({ modelId, onBack, onEdit, onEmitBatch, onViewBatch }) => {
    const [model, setModel] = useState<VoucherModel | null>(null);
    const [batches, setBatches] = useState<VoucherBatch[]>([]);
    const [audit, setAudit] = useState<AuditLogEntry[]>([]);
    const { toast, showToast, hideToast } = useToast();

    const reload = () => {
        const m = getVoucherModelById(modelId);
        setModel(m);
        setBatches(getVoucherBatches(modelId));
        setAudit(getAuditLog('voucher_model', modelId));
    };

    useEffect(reload, [modelId]);

    if (!model) return <div className="p-6 text-center text-gray-400">Modelo não encontrado.</div>;

    const handleArchive = () => {
        updateVoucherModel(model.id, { status: 'archived' });
        showToast('Modelo arquivado.', 'success');
        reload();
    };

    const handleActivate = () => {
        if (!model.items || model.items.length === 0) {
            showToast('Adicione ao menos um item para ativar.', 'error');
            return;
        }
        updateVoucherModel(model.id, { status: 'active' });
        showToast('Modelo ativado.', 'success');
        reload();
    };

    const handleDuplicate = () => {
        const items = model.items || [];
        createVoucherModel({
            name: `${model.name} (cópia)`,
            description: model.description || undefined,
            package_type: model.package_type,
            duration_months: model.duration_months,
            redeem_by: model.redeem_by,
            status: 'draft',
            collection_ids: items.map(i => i.collection_id),
        });
        showToast('Modelo duplicado como rascunho.', 'success');
    };

    return (
        <div className="p-4 md:p-6 max-w-5xl mx-auto">
            {toast && <Toast message={toast.message} type={toast.type} onClose={hideToast} />}

            {/* Breadcrumb */}
            <button onClick={onBack} className="flex items-center gap-1 text-sm text-gray-500 hover:text-kaboo-primary mb-4">
                <Icons.ChevronLeft className="w-4 h-4" /> Modelos
            </button>

            {/* Preview */}
            <ModelPreview model={model} />

            {model.description && (
                <p className="mt-3 text-sm text-gray-500">{model.description}</p>
            )}

            {/* Actions */}
            <div className="flex flex-wrap gap-2 mt-4">
                {model.status === 'active' && (
                    <Button onClick={() => onEmitBatch(model.id)}>
                        <Icons.Plus className="w-4 h-4 mr-1" /> Emitir lote
                    </Button>
                )}
                {model.status === 'draft' && (
                    <>
                        <Button onClick={() => onEdit(model.id)}>
                            <Icons.Edit className="w-4 h-4 mr-1" /> Editar
                        </Button>
                        <Button onClick={handleActivate} variant="secondary">Ativar</Button>
                    </>
                )}
                <Button onClick={handleDuplicate} variant="secondary">Duplicar</Button>
                {model.status !== 'archived' && (
                    <Button onClick={handleArchive} variant="secondary">Arquivar</Button>
                )}
            </div>

            {/* Batches */}
            <div className="mt-8">
                <h2 className="text-lg font-bold text-gray-800 mb-3">Lotes emitidos</h2>
                {batches.length === 0 ? (
                    <p className="text-sm text-gray-400">Nenhum lote emitido para este modelo.</p>
                ) : (
                    <div className="space-y-2">
                        {batches.map((batch) => (
                            <button
                                key={batch.id}
                                onClick={() => onViewBatch(batch.id)}
                                className="w-full text-left bg-white border border-gray-200 rounded-lg p-3 hover:border-kaboo-primary/40 transition-all"
                            >
                                <div className="flex items-center justify-between">
                                    <div>
                                        <span className="font-medium text-gray-800">Lote #{batch.id.substring(0, 8)}</span>
                                        {batch.label && <span className="ml-2 text-xs text-gray-400">{batch.label}</span>}
                                        <StatusBadge label={BATCH_STATUS_LABELS[batch.status] || batch.status} className={BATCH_STATUS_CLASSES[batch.status] || 'bg-gray-100 text-gray-600'} />
                                    </div>
                                    <div className="text-sm text-gray-500">
                                        {batch.quantity} vouchers · {batch.redeemed_count || 0} resgatados
                                    </div>
                                </div>
                            </button>
                        ))}
                    </div>
                )}
            </div>

            {/* Audit */}
            {audit.length > 0 && (
                <div className="mt-8">
                    <h2 className="text-lg font-bold text-gray-800 mb-3">Histórico</h2>
                    <div className="space-y-1 text-sm text-gray-500">
                        {audit.slice(0, 10).map((e) => (
                            <div key={e.id}>
                                <span className="text-gray-400">{new Date(e.created_at).toLocaleString('pt-BR')}</span>
                                {' — '}
                                <span>{e.action}</span>
                            </div>
                        ))}
                    </div>
                </div>
            )}
        </div>
    );
};

/* ════════════════════════════════════════════════════════
   SUB-VIEW: Create / Edit Model (Wizard)
   ════════════════════════════════════════════════════════ */

const ModelWizard: React.FC<{
    editId?: string | null;
    onDone: (id: string) => void;
    onCancel: () => void;
}> = ({ editId, onDone, onCancel }) => {
    const collections = useMemo(() => getMockCollectionsLive(), []);
    const existing = editId ? getVoucherModelById(editId) : null;
    const hasCustomExistingDuration = existing ? !DURATION_OPTIONS.includes(existing.duration_months) : false;

    const [step, setStep] = useState(1);
    const [name, setName] = useState(existing?.name || '');
    const [description, setDescription] = useState(existing?.description || '');
    const [packageType, setPackageType] = useState<VoucherPackageType>(existing?.package_type || 'kit');
    const [durationMonths, setDurationMonths] = useState<VoucherDurationMonths>(existing?.duration_months || 6);
    const [durationMode, setDurationMode] = useState<'preset' | 'custom'>(hasCustomExistingDuration ? 'custom' : 'preset');
    const [customDurationInput, setCustomDurationInput] = useState(hasCustomExistingDuration ? String(existing?.duration_months ?? '') : '');
    const [redeemBy, setRedeemBy] = useState(existing?.redeem_by ? existing.redeem_by.substring(0, 10) : '');
    const [selectedIds, setSelectedIds] = useState<Set<string>>(
        new Set(existing?.items?.map(i => i.collection_id) || [])
    );
    const [contentSearch, setContentSearch] = useState('');
    const [levelFilter, setLevelFilter] = useState<string>('all');

    const filteredCollections = useMemo(() => {
        return collections.filter(c => {
            if (levelFilter !== 'all' && c.level !== levelFilter) return false;
            if (contentSearch && !c.title.toLowerCase().includes(contentSearch.toLowerCase())) return false;
            return true;
        });
    }, [collections, contentSearch, levelFilter]);

    const toggleItem = (id: string) => {
        setSelectedIds(prev => {
            const next = new Set(prev);
            if (next.has(id)) next.delete(id); else next.add(id);
            return next;
        });
    };

    const canFinish = name.trim().length >= 3 && selectedIds.size > 0;
    const normalizedCustomDuration = customDurationInput.trim();
    const parsedCustomDuration = /^\d+$/.test(normalizedCustomDuration) ? Number(normalizedCustomDuration) : Number.NaN;
    const resolvedDurationMonths = durationMode === 'custom' ? parsedCustomDuration : durationMonths;
    const durationError = Number.isInteger(resolvedDurationMonths)
        && resolvedDurationMonths >= MIN_CUSTOM_DURATION_MONTHS
        && resolvedDurationMonths <= MAX_CUSTOM_DURATION_MONTHS
        ? null
        : `Informe uma duração inteira entre ${MIN_CUSTOM_DURATION_MONTHS} e ${MAX_CUSTOM_DURATION_MONTHS} meses.`;
    const canProceedStep1 = name.trim().length >= 3 && durationError === null;
    const canSubmitModel = canFinish && durationError === null;

    const handleSave = (status: VoucherModelStatus) => {
        const data: {
            name: string;
            description?: string;
            package_type: VoucherPackageType;
            duration_months: VoucherDurationMonths;
            redeem_by: string | null;
            status: VoucherModelStatus;
            collection_ids: string[];
        } = {
            name: name.trim(),
            description: description.trim() || undefined,
            package_type: packageType,
            duration_months: resolvedDurationMonths,
            redeem_by: redeemBy ? new Date(redeemBy + 'T23:59:59Z').toISOString() : null,
            status,
            collection_ids: Array.from(selectedIds),
        };

        let model: VoucherModel | null;
        if (editId) {
            model = updateVoucherModel(editId, data);
        } else {
            model = createVoucherModel(data);
        }
        if (model) onDone(model.id);
    };

    return (
        <div className="p-4 md:p-6 max-w-3xl mx-auto">
            {/* Breadcrumb */}
            <button onClick={onCancel} className="flex items-center gap-1 text-sm text-gray-500 hover:text-kaboo-primary mb-4">
                <Icons.ChevronLeft className="w-4 h-4" /> Cancelar
            </button>

            <h1 className="text-xl font-bold text-gray-800 mb-1">{editId ? 'Editar modelo' : 'Novo modelo'}</h1>
            <p className="text-sm text-gray-400 mb-6">Etapa {step} de 3</p>

            {/* Step progress */}
            <div className="flex gap-1 mb-6" role="progressbar" aria-valuenow={step} aria-valuemin={1} aria-valuemax={3} aria-label={`Etapa ${step} de 3`}>
                {[1, 2, 3].map(s => (
                    <div key={s} className={`flex-1 h-1 rounded-full ${s <= step ? 'bg-kaboo-primary' : 'bg-gray-200'}`} />
                ))}
            </div>

            <div className="mb-6">
                <h2 className="text-base font-semibold text-gray-800">{WIZARD_STEP_COPY[step as 1 | 2 | 3].title}</h2>
                <p className="text-sm text-gray-500 mt-1">{WIZARD_STEP_COPY[step as 1 | 2 | 3].description}</p>
            </div>

            {/* Step 1: Basic data */}
            {step === 1 && (
                <div className="space-y-4">
                    <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1">Nome interno *</label>
                        <input
                            type="text" value={name} onChange={(e) => setName(e.target.value)}
                            placeholder="Ex: Kit Aventura Kaboo"
                            className="w-full border border-gray-200 rounded-lg px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-kaboo-primary/30"
                        />
                    </div>
                    <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1">Descrição</label>
                        <textarea
                            value={description} onChange={(e) => setDescription(e.target.value)}
                            rows={2}
                            className="w-full border border-gray-200 rounded-lg px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-kaboo-primary/30 resize-none"
                        />
                    </div>
                    <div>
                        <label className="block text-sm font-medium text-gray-700 mb-2">Tipo de pacote *</label>
                        <div className="grid grid-cols-2 gap-2">
                            {(Object.keys(PACKAGE_LABELS) as VoucherPackageType[]).map(pt => (
                                <button
                                    key={pt}
                                    onClick={() => setPackageType(pt)}
                                    className={`flex items-center gap-2 px-3 py-2.5 border rounded-lg text-sm font-medium transition-colors
                    ${packageType === pt ? 'border-kaboo-primary bg-kaboo-primary/5 text-kaboo-primary' : 'border-gray-200 text-gray-600 hover:border-gray-300'}`}
                                >
                                    <span>{PACKAGE_LABELS[pt].icon}</span> {PACKAGE_LABELS[pt].label}
                                </button>
                            ))}
                        </div>
                    </div>
                    <div className="grid grid-cols-2 gap-4">
                        <div>
                            <label className="block text-sm font-medium text-gray-700 mb-1">Duração do acesso *</label>
                            <select
                                value={durationMode === 'custom' ? 'custom' : String(durationMonths)}
                                onChange={(e) => {
                                    if (e.target.value === 'custom') {
                                        setDurationMode('custom');
                                        return;
                                    }

                                    setDurationMode('preset');
                                    setDurationMonths(Number(e.target.value));
                                }}
                                className="w-full border border-gray-200 rounded-lg px-3 py-2.5 text-sm bg-white focus:outline-none focus:ring-2 focus:ring-kaboo-primary/30"
                            >
                                {DURATION_OPTIONS.map(d => <option key={d} value={d}>{d} {d === 1 ? 'mês' : 'meses'}</option>)}
                                <option value="custom">Personalizada</option>
                            </select>
                            {durationMode === 'custom' && (
                                <div className="mt-2">
                                    <input
                                        type="text"
                                        inputMode="numeric"
                                        pattern="[0-9]*"
                                        value={customDurationInput}
                                        onChange={(e) => setCustomDurationInput(e.target.value)}
                                        placeholder="Ex: 18"
                                        className="w-full border border-gray-200 rounded-lg px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-kaboo-primary/30"
                                    />
                                    <p className={`mt-1 text-xs ${durationError ? 'text-red-500' : 'text-gray-400'}`}>
                                        {durationError || `Duração configurada: ${resolvedDurationMonths} meses.`}
                                    </p>
                                </div>
                            )}
                        </div>
                        <div>
                            <label className="block text-sm font-medium text-gray-700 mb-1">Validade do código</label>
                            <input
                                type="date" value={redeemBy} onChange={(e) => setRedeemBy(e.target.value)}
                                className="w-full border border-gray-200 rounded-lg px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-kaboo-primary/30"
                            />
                            <p className="text-xs text-gray-400 mt-1">Data limite para resgate. Opcional.</p>
                        </div>
                    </div>
                    <p className="text-xs text-gray-500">
                        Validade do código é até quando ele pode ser resgatado; duração do acesso é o tempo liberado depois do resgate.
                    </p>
                    <div className="flex justify-end pt-2">
                        <Button onClick={() => setStep(2)} disabled={!canProceedStep1}>Próximo →</Button>
                    </div>
                </div>
            )}

            {/* Step 2: Content selection */}
            {step === 2 && (
                <div className="space-y-4">
                    <div className="flex flex-col sm:flex-row gap-3">
                        <div className="relative flex-1">
                            <Icons.Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
                            <input
                                type="text" placeholder="Buscar conteúdo..." value={contentSearch}
                                onChange={(e) => setContentSearch(e.target.value)}
                                className="w-full pl-9 pr-3 py-2 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-kaboo-primary/30"
                            />
                        </div>
                        <select
                            value={levelFilter}
                            onChange={(e) => setLevelFilter(e.target.value)}
                            className="border border-gray-200 rounded-lg px-3 py-2 text-sm bg-white focus:outline-none focus:ring-2 focus:ring-kaboo-primary/30"
                        >
                            <option value="all">Todos os níveis</option>
                            <option value="Educação Infantil">Educação Infantil</option>
                            <option value="Fundamental I">Fundamental I</option>
                        </select>
                    </div>

                    <p className="text-xs text-gray-500">
                        O tipo de pacote organiza a oferta, mas os conteúdos liberados são definidos apenas pelas seleções abaixo.
                    </p>

                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 max-h-[360px] overflow-y-auto">
                        {filteredCollections.map(col => {
                            const selected = selectedIds.has(col.id);
                            return (
                                <button
                                    key={col.id}
                                    onClick={() => toggleItem(col.id)}
                                    className={`flex items-center gap-3 p-2.5 border rounded-lg text-left transition-colors
                    ${selected ? 'border-kaboo-primary bg-kaboo-primary/5' : 'border-gray-200 hover:border-gray-300'}`}
                                >
                                    <img src={col.cover_image} alt="" className="w-10 h-10 rounded-lg object-cover flex-shrink-0" />
                                    <div className="flex-1 min-w-0">
                                        <p className="text-sm font-medium text-gray-800 truncate">{col.title}</p>
                                        <p className="text-xs text-gray-400">{col.level}</p>
                                    </div>
                                    {selected && <Icons.Check className="w-5 h-5 text-kaboo-primary flex-shrink-0" />}
                                </button>
                            );
                        })}
                    </div>

                    {/* Summary bar */}
                    <div className="bg-gray-50 border border-gray-200 rounded-lg p-3 flex items-center justify-between">
                        <span className="text-sm text-gray-600">
                            {PACKAGE_LABELS[packageType].icon} {PACKAGE_LABELS[packageType].label} · <strong>{selectedIds.size}</strong> {selectedIds.size === 1 ? 'item' : 'itens'} · {resolvedDurationMonths} meses
                        </span>
                    </div>

                    <div className="flex justify-between pt-2">
                        <Button onClick={() => setStep(1)} variant="secondary">← Voltar</Button>
                        <Button onClick={() => setStep(3)} disabled={selectedIds.size === 0}>Próximo →</Button>
                    </div>
                </div>
            )}

            {/* Step 3: Review */}
            {step === 3 && (
                <div className="space-y-4">
                    <div className="bg-gray-50 border border-gray-200 rounded-xl p-5">
                        <h2 className="font-bold text-gray-800 mb-3">Revisão do modelo</h2>
                        <div className="grid grid-cols-2 gap-2 text-sm text-gray-600 mb-4">
                            <div>Nome: <span className="font-medium text-gray-800">{name}</span></div>
                            <div>Tipo: <span className="font-medium text-gray-800">{PACKAGE_LABELS[packageType].icon} {PACKAGE_LABELS[packageType].label}</span></div>
                            <div>Itens: <span className="font-medium text-gray-800">{selectedIds.size}</span></div>
                            <div>Duração: <span className="font-medium text-gray-800">{resolvedDurationMonths} meses</span></div>
                            <div>Validade: <span className="font-medium text-gray-800">{redeemBy ? new Date(redeemBy).toLocaleDateString('pt-BR') : 'Sem limite'}</span></div>
                        </div>
                        <div className="flex flex-wrap gap-2">
                            {Array.from(selectedIds).map(cid => {
                                const col = collections.find(c => c.id === cid);
                                return col ? (
                                    <div key={cid} className="flex items-center gap-1.5 bg-white border border-gray-200 rounded-lg px-2 py-1">
                                        <img src={col.cover_image} alt="" className="w-6 h-6 rounded object-cover" />
                                        <span className="text-xs text-gray-700 truncate max-w-[120px]">{col.title}</span>
                                    </div>
                                ) : null;
                            })}
                        </div>
                    </div>

                    <div className="bg-amber-50 border border-amber-200 rounded-lg p-3 text-sm text-amber-700">
                        ⚠️ Se ainda houver dúvida, salve como rascunho. Depois da emissão, os dados críticos ficam congelados para os lotes gerados.
                    </div>

                    <div className="flex flex-wrap justify-between gap-2 pt-2">
                        <Button onClick={() => setStep(2)} variant="secondary">← Voltar</Button>
                        <div className="flex gap-2">
                            <Button onClick={() => handleSave('draft')} variant="secondary" disabled={!canSubmitModel}>Salvar rascunho</Button>
                            <Button onClick={() => handleSave('active')} disabled={!canSubmitModel}>Salvar e ativar</Button>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
};

/* ════════════════════════════════════════════════════════
   MODAL: Emit Batch
   ════════════════════════════════════════════════════════ */

const EmitBatchModal: React.FC<{
    modelId: string;
    onClose: () => void;
    onDone: (batchId: string) => void;
}> = ({ modelId, onClose, onDone }) => {
    const model = getVoucherModelById(modelId);
    const [quantityInput, setQuantityInput] = useState('100');
    const [label, setLabel] = useState('');
    const [loading, setLoading] = useState(false);

    if (!model) return null;
    const pkg = PACKAGE_LABELS[model.package_type];
    const normalizedQuantityInput = quantityInput.trim();
    const quantity = /^\d+$/.test(normalizedQuantityInput) ? Number(normalizedQuantityInput) : Number.NaN;
    const quantityError = isValidVoucherBatchQuantity(quantity)
        ? null
        : `Informe um número inteiro entre ${MIN_VOUCHER_BATCH_QUANTITY} e ${MAX_VOUCHER_BATCH_QUANTITY}.`;

    const handleConfirm = () => {
        if (quantityError) return;
        setLoading(true);
        const batch = createVoucherBatch(model.id, quantity, label || undefined);
        setLoading(false);
        if (batch) onDone(batch.id);
    };

    return (
        <div className="fixed inset-0 bg-black/40 z-50 flex items-center justify-center p-4" onClick={onClose}>
            <div role="dialog" aria-modal="true" className="bg-white rounded-2xl max-w-lg w-full p-6 shadow-xl" onClick={(e) => e.stopPropagation()}>
                <h2 className="text-lg font-bold text-gray-800 mb-4">Emitir lote de vouchers</h2>

                <div className="text-sm text-gray-600 space-y-1 mb-4">
                    <div>Modelo: <strong>{model.name}</strong></div>
                    <div>Tipo: {pkg.icon} {pkg.label} · {model.items?.length || 0} itens</div>
                    <div>Duração: {model.duration_months} meses</div>
                    <div>Validade: {model.redeem_by ? new Date(model.redeem_by).toLocaleDateString('pt-BR') : 'Sem limite'}</div>
                </div>

                <div className="space-y-3 mb-4">
                    <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1">Quantidade de vouchers *</label>
                        <input
                            type="text" inputMode="numeric" pattern="[0-9]*" value={quantityInput}
                            onChange={(e) => setQuantityInput(e.target.value)}
                            className="w-full border border-gray-200 rounded-lg px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-kaboo-primary/30"
                        />
                        <p className={`mt-1 text-xs ${quantityError ? 'text-red-500' : 'text-gray-400'}`}>
                            {quantityError || `Informe um número inteiro entre ${MIN_VOUCHER_BATCH_QUANTITY} e ${MAX_VOUCHER_BATCH_QUANTITY}.`}
                        </p>
                    </div>
                    <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1">Finalidade (nota interna)</label>
                        <input
                            type="text" value={label} onChange={(e) => setLabel(e.target.value)}
                            placeholder="Ex: campanha abril/2026"
                            className="w-full border border-gray-200 rounded-lg px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-kaboo-primary/30"
                        />
                    </div>
                </div>

                <div className="bg-amber-50 border border-amber-200 rounded-lg p-3 text-sm text-amber-700 mb-5">
                    {quantityError
                        ? '⚠️ Informe uma quantidade válida antes de confirmar a emissão.'
                        : `⚠️ Ao confirmar, o sistema irá gerar ${quantity} códigos únicos e congelar o snapshot deste modelo para o lote. Esta ação não pode ser desfeita.`}
                </div>

                <div className="flex justify-end gap-2">
                    <Button onClick={onClose} variant="secondary">Cancelar</Button>
                    <Button onClick={handleConfirm} disabled={loading || quantityError !== null}>
                        {loading ? 'Gerando...' : 'Confirmar emissão'}
                    </Button>
                </div>
            </div>
        </div>
    );
};

/* ════════════════════════════════════════════════════════
   SUB-VIEW: Batches List
   ════════════════════════════════════════════════════════ */

const BatchesListView: React.FC<{
    onSelectBatch: (id: string) => void;
}> = ({ onSelectBatch }) => {
    const [batches, setBatches] = useState<VoucherBatch[]>([]);
    const [search, setSearch] = useState('');
    const [statusFilter, setStatusFilter] = useState<VoucherBatchStatus | 'all'>('all');

    useEffect(() => { setBatches(getVoucherBatches()); }, []);

    const filtered = useMemo(() => {
        return batches.filter(b => {
            if (statusFilter !== 'all' && b.status !== statusFilter) return false;
            if (search) {
                const q = search.toLowerCase();
                if (
                    !b.id.toLowerCase().includes(q) &&
                    !b.model_snapshot.name.toLowerCase().includes(q) &&
                    !(b.label || '').toLowerCase().includes(q)
                ) return false;
            }
            return true;
        });
    }, [batches, search, statusFilter]);

    return (
        <div className="p-4 md:p-6 max-w-5xl mx-auto">
            <h1 className="text-xl font-bold text-gray-800 mb-6">Lotes</h1>

            <div className="flex flex-col sm:flex-row gap-3 mb-5">
                <div className="relative flex-1">
                    <Icons.Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
                    <input
                        type="text" placeholder="Buscar lote ou modelo..." value={search}
                        onChange={(e) => setSearch(e.target.value)}
                        className="w-full pl-9 pr-3 py-2 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-kaboo-primary/30"
                    />
                </div>
                <select
                    value={statusFilter}
                    onChange={(e) => setStatusFilter(e.target.value as VoucherBatchStatus | 'all')}
                    className="border border-gray-200 rounded-lg px-3 py-2 text-sm bg-white focus:outline-none focus:ring-2 focus:ring-kaboo-primary/30"
                >
                    <option value="all">Todos os status</option>
                    <option value="generated">Gerado</option>
                    <option value="exported">Exportado</option>
                    <option value="sent">Enviado</option>
                    <option value="confirmed">Confirmado</option>
                    <option value="cancelled">Cancelado</option>
                </select>
            </div>

            {filtered.length === 0 ? (
                <div className="text-center py-16 text-gray-400">
                    <p className="text-sm">{batches.length === 0 ? 'Nenhum lote emitido.' : 'Nenhum lote corresponde aos filtros.'}</p>
                    {batches.length > 0 && (search || statusFilter !== 'all') && (
                        <button onClick={() => { setSearch(''); setStatusFilter('all'); }} className="mt-2 text-xs font-bold text-kaboo-primary hover:underline">Limpar filtros</button>
                    )}
                </div>
            ) : (
                <div className="space-y-2">
                    {filtered.map(batch => (
                        <button
                            key={batch.id}
                            onClick={() => onSelectBatch(batch.id)}
                            className="w-full text-left bg-white border border-gray-200 rounded-xl p-4 hover:border-kaboo-primary/40 transition-all"
                        >
                            <div className="flex items-center justify-between mb-1">
                                <div className="flex items-center gap-2">
                                    <span className="font-medium text-gray-800">Lote #{batch.id.substring(0, 8)}</span>
                                    <StatusBadge label={BATCH_STATUS_LABELS[batch.status] || batch.status} className={BATCH_STATUS_CLASSES[batch.status] || ''} />
                                </div>
                                <span className="text-xs text-gray-400">{new Date(batch.created_at).toLocaleDateString('pt-BR')}</span>
                            </div>
                            <p className="text-sm text-gray-500">
                                {batch.model_snapshot.name} · {batch.quantity} vouchers · {batch.redeemed_count || 0} resgatados
                                {batch.label && <span className="ml-1 text-gray-400">· {batch.label}</span>}
                            </p>
                        </button>
                    ))}
                </div>
            )}
        </div>
    );
};

/* ════════════════════════════════════════════════════════
   SUB-VIEW: Batch Detail
   ════════════════════════════════════════════════════════ */

const VOUCHER_STATUS_LABELS: Record<string, string> = {
    active: 'Ativo',
    redeemed: 'Resgatado',
    disabled: 'Desativado',
    expired: 'Expirado',
};

const VOUCHER_STATUS_CLASSES: Record<string, string> = {
    active: 'bg-blue-100 text-blue-700',
    redeemed: 'bg-emerald-100 text-emerald-700',
    disabled: 'bg-red-100 text-red-700',
    expired: 'bg-gray-200 text-gray-600',
};

const BatchDetailView: React.FC<{
    batchId: string;
    onBack: () => void;
}> = ({ batchId, onBack }) => {
    const [batch, setBatch] = useState<VoucherBatch | null>(null);
    const [vouchers, setVouchers] = useState<Voucher[]>([]);
    const [disablingVoucherId, setDisablingVoucherId] = useState<string | null>(null);
    const [cancellingBatch, setCancellingBatch] = useState(false);
    const { toast, showToast, hideToast } = useToast();

    const reload = () => {
        setBatch(getVoucherBatches().find(b => b.id === batchId) || null);
        setVouchers(getBatchVouchers(batchId));
    };

    useEffect(reload, [batchId]);

    if (!batch) return <div className="p-6 text-center text-gray-400">Lote não encontrado.</div>;

    const snap = batch.model_snapshot;
    const redeemed = vouchers.filter(v => v.status === 'redeemed').length;
    const disabled = vouchers.filter(v => v.status === 'disabled').length;
    const available = batch.quantity - redeemed - disabled;

    const handleExport = () => {
        const csv = generateBatchCsv(batchId);
        const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = `KABOO_VOUCHERS_${batch.id.substring(0, 8)}_${snap.name.replace(/[^a-zA-Z0-9]/g, '_')}_${new Date().toISOString().substring(0, 10)}_v01.csv`;
        a.click();
        URL.revokeObjectURL(url);

        updateBatchStatus(batchId, 'exported', { exported_at: new Date().toISOString() });
        showToast('CSV exportado e lote marcado como exportado.', 'success');
        reload();
    };

    const handleMarkSent = () => {
        updateBatchStatus(batchId, 'sent', { sent_at: new Date().toISOString() });
        showToast('Lote marcado como enviado.', 'success');
        reload();
    };

    const handleMarkConfirmed = () => {
        updateBatchStatus(batchId, 'confirmed', { confirmed_at: new Date().toISOString() });
        showToast('Lote marcado como confirmado.', 'success');
        reload();
    };

    const handleCancelBatch = (reason: string) => {
        updateBatchStatus(batchId, 'cancelled', { cancelled_at: new Date().toISOString(), cancel_reason: reason });
        setCancellingBatch(false);
        showToast('Lote cancelado.', 'success');
        reload();
    };

    const handleDisableVoucher = (reason: string) => {
        if (disablingVoucherId) {
            disableVoucherCode(disablingVoucherId, reason);
            setDisablingVoucherId(null);
            showToast('Voucher desativado.', 'success');
            reload();
        }
    };

    return (
        <div className="p-4 md:p-6 max-w-5xl mx-auto">
            {toast && <Toast message={toast.message} type={toast.type} onClose={hideToast} />}

            <button onClick={onBack} className="flex items-center gap-1 text-sm text-gray-500 hover:text-kaboo-primary mb-4">
                <Icons.ChevronLeft className="w-4 h-4" /> Lotes
            </button>

            <div className="flex items-center gap-3 mb-4">
                <h1 className="text-xl font-bold text-gray-800">Lote #{batch.id.substring(0, 8)}</h1>
                <StatusBadge label={BATCH_STATUS_LABELS[batch.status] || batch.status} className={BATCH_STATUS_CLASSES[batch.status] || ''} />
            </div>

            {/* Snapshot info */}
            <div className="bg-gray-50 border border-gray-200 rounded-xl p-4 mb-4">
                <div className="grid grid-cols-2 gap-2 text-sm text-gray-600 mb-3">
                    <div>Modelo: <strong>{snap.name}</strong></div>
                    <div>Tipo: {PACKAGE_LABELS[snap.package_type]?.icon} {PACKAGE_LABELS[snap.package_type]?.label}</div>
                    <div>Duração: {snap.duration_months} meses</div>
                    <div>Validade: {snap.redeem_by ? new Date(snap.redeem_by).toLocaleDateString('pt-BR') : 'Sem limite'}</div>
                </div>
                <div className="flex flex-wrap gap-2">
                    {snap.items.map((item, i) => (
                        <div key={i} className="flex items-center gap-1.5 bg-white border border-gray-200 rounded-lg px-2 py-1">
                            {item.cover_image && <img src={item.cover_image} alt="" className="w-6 h-6 rounded object-cover" />}
                            <span className="text-xs text-gray-700">{item.title}</span>
                        </div>
                    ))}
                </div>
            </div>

            {/* Counters */}
            <div className="grid grid-cols-4 gap-3 mb-4">
                {[
                    { label: 'Total', value: batch.quantity, cls: 'bg-gray-50' },
                    { label: 'Disponíveis', value: available, cls: 'bg-blue-50' },
                    { label: 'Resgatados', value: redeemed, cls: 'bg-emerald-50' },
                    { label: 'Desativados', value: disabled, cls: 'bg-red-50' },
                ].map(c => (
                    <div key={c.label} className={`${c.cls} rounded-xl p-3 text-center`}>
                        <div className="text-2xl font-bold text-gray-800">{c.value}</div>
                        <div className="text-xs text-gray-500">{c.label}</div>
                    </div>
                ))}
            </div>

            {/* Lifecycle actions — contextual by batch status */}
            <div className="flex flex-wrap gap-2 mb-6">
                {(batch.status === 'generated' || batch.status === 'exported') && (
                    <Button onClick={handleExport}>
                        <Icons.Download className="w-4 h-4 mr-1" /> {batch.status === 'exported' ? 'Re-exportar CSV' : 'Exportar CSV'}
                    </Button>
                )}
                {batch.status === 'exported' && (
                    <Button onClick={handleMarkSent} variant="secondary">
                        📤 Registrar envio
                    </Button>
                )}
                {batch.status === 'sent' && (
                    <Button onClick={handleMarkConfirmed} variant="secondary">
                        ✅ Registrar confirmação
                    </Button>
                )}
                {batch.status !== 'cancelled' && batch.status !== 'confirmed' && (
                    <Button onClick={() => setCancellingBatch(true)} variant="danger">
                        Cancelar lote
                    </Button>
                )}
            </div>

            {/* Voucher sample */}
            <h2 className="text-lg font-bold text-gray-800 mb-3">Vouchers (primeiros 20)</h2>
            <div className="overflow-x-auto border border-gray-200 rounded-xl">
                <table className="w-full text-sm">
                    <thead className="bg-gray-50">
                        <tr>
                            <th className="text-left px-3 py-2 font-medium text-gray-500">#</th>
                            <th className="text-left px-3 py-2 font-medium text-gray-500">Código</th>
                            <th className="text-left px-3 py-2 font-medium text-gray-500">Status</th>
                            <th className="text-right px-3 py-2 font-medium text-gray-500">Ações</th>
                        </tr>
                    </thead>
                    <tbody>
                        {vouchers.slice(0, 20).map((v, i) => (
                            <tr key={v.id} className="border-t border-gray-100">
                                <td className="px-3 py-2 text-gray-400">{i + 1}</td>
                                <td className="px-3 py-2 font-mono text-gray-800">{v.code}</td>
                                <td className="px-3 py-2">
                                    <StatusBadge
                                        label={VOUCHER_STATUS_LABELS[v.status] || v.status}
                                        className={VOUCHER_STATUS_CLASSES[v.status] || 'bg-gray-200 text-gray-600'}
                                    />
                                </td>
                                <td className="px-3 py-2 text-right">
                                    {v.status === 'active' && (
                                        <button
                                            onClick={() => setDisablingVoucherId(v.id)}
                                            className="text-xs text-red-500 hover:text-red-700 font-medium"
                                        >
                                            Desativar
                                        </button>
                                    )}
                                </td>
                            </tr>
                        ))}
                    </tbody>
                </table>
            </div>

            {/* Cancel batch modal */}
            {cancellingBatch && (
                <CriticalConfirmationModal
                    title="Cancelar lote"
                    description={`Tem certeza que deseja cancelar o lote #${batch.id.substring(0, 8)}?`}
                    consequences={[
                        'Os vouchers ativos deste lote não poderão mais ser resgatados.',
                        'Vouchers já resgatados não serão afetados.',
                        'Esta ação não pode ser desfeita.',
                    ]}
                    confirmLabel="Cancelar lote"
                    onConfirm={handleCancelBatch}
                    onCancel={() => setCancellingBatch(false)}
                />
            )}

            {/* Disable voucher modal */}
            {disablingVoucherId && (
                <CriticalConfirmationModal
                    title="Desativar voucher"
                    description={`Tem certeza que deseja desativar o voucher ${vouchers.find(v => v.id === disablingVoucherId)?.code || ''}?`}
                    consequences={[
                        'O código não poderá mais ser resgatado.',
                        'Esta ação não pode ser desfeita.',
                    ]}
                    confirmLabel="Desativar"
                    onConfirm={handleDisableVoucher}
                    onCancel={() => setDisablingVoucherId(null)}
                />
            )}
        </div>
    );
};

/* ════════════════════════════════════════════════════════
   SUB-VIEW: Codes List
   ════════════════════════════════════════════════════════ */

const CodesListView: React.FC = () => {
    const [codes, setCodes] = useState<(Voucher & { batch_id?: string; model_id?: string })[]>([]);
    const [search, setSearch] = useState('');
    const [statusFilter, setStatusFilter] = useState<string>('all');
    const [selectedCodeId, setSelectedCodeId] = useState<string | null>(null);
    const [disablingCodeId, setDisablingCodeId] = useState<string | null>(null);
    const [page, setPage] = useState(0);
    const PAGE_SIZE = 50;
    const { toast, showToast, hideToast } = useToast();

    const reloadCodes = () => { setCodes(getAllMockVoucherCodes()); };
    useEffect(reloadCodes, []);
    useEffect(() => { setPage(0); }, [search, statusFilter]);

    const filtered = useMemo(() => {
        return codes.filter(v => {
            if (statusFilter !== 'all' && v.status !== statusFilter) return false;
            if (search) {
                const q = search.toUpperCase();
                if (!v.code.includes(q)) return false;
            }
            return true;
        });
    }, [codes, search, statusFilter]);

    const selectedCode = selectedCodeId ? codes.find(v => v.id === selectedCodeId) || null : null;
    const selectedBatchInfo = selectedCode?.batch_id
        ? getVoucherBatches().find(b => b.id === selectedCode.batch_id) || null
        : null;
    const selectedCodeAudit = selectedCodeId ? getAuditLog('voucher', selectedCodeId) : [];

    const totalPages = Math.max(1, Math.ceil(filtered.length / PAGE_SIZE));
    const paged = filtered.slice(page * PAGE_SIZE, (page + 1) * PAGE_SIZE);

    const handleDisableCode = (reason: string) => {
        if (disablingCodeId) {
            disableVoucherCode(disablingCodeId, reason);
            setDisablingCodeId(null);
            setSelectedCodeId(null);
            showToast('Voucher desativado.', 'success');
            reloadCodes();
        }
    };

    return (
        <div className="p-4 md:p-6 max-w-5xl mx-auto">
            {toast && <Toast message={toast.message} type={toast.type} onClose={hideToast} />}

            <h1 className="text-xl font-bold text-gray-800 mb-6">Códigos</h1>

            <div className="flex flex-col sm:flex-row gap-3 mb-5">
                <div className="relative flex-1">
                    <Icons.Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
                    <input
                        type="text" placeholder="Buscar código..." value={search}
                        onChange={(e) => setSearch(e.target.value)}
                        className="w-full pl-9 pr-3 py-2 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-kaboo-primary/30"
                    />
                </div>
                <select
                    value={statusFilter}
                    onChange={(e) => setStatusFilter(e.target.value)}
                    className="border border-gray-200 rounded-lg px-3 py-2 text-sm bg-white focus:outline-none focus:ring-2 focus:ring-kaboo-primary/30"
                >
                    <option value="all">Todos os status</option>
                    <option value="active">Ativo</option>
                    <option value="redeemed">Resgatado</option>
                    <option value="disabled">Desativado</option>
                    <option value="expired">Expirado</option>
                </select>
            </div>

            <div className="text-xs text-gray-400 mb-3">
                {filtered.length} códigos · Página {page + 1} de {totalPages}
            </div>

            <div className="overflow-x-auto border border-gray-200 rounded-xl">
                <table className="w-full text-sm">
                    <thead className="bg-gray-50">
                        <tr>
                            <th className="text-left px-3 py-2 font-medium text-gray-500">Código</th>
                            <th className="text-left px-3 py-2 font-medium text-gray-500">Status</th>
                            <th className="text-left px-3 py-2 font-medium text-gray-500">Lote</th>
                        </tr>
                    </thead>
                    <tbody>
                        {paged.map(v => (
                            <tr
                                key={v.id}
                                onClick={() => setSelectedCodeId(v.id)}
                                className="border-t border-gray-100 cursor-pointer hover:bg-gray-50"
                            >
                                <td className="px-3 py-2 font-mono text-gray-800">{v.code}</td>
                                <td className="px-3 py-2">
                                    <StatusBadge
                                        label={VOUCHER_STATUS_LABELS[v.status] || v.status}
                                        className={VOUCHER_STATUS_CLASSES[v.status] || 'bg-gray-200 text-gray-600'}
                                    />
                                </td>
                                <td className="px-3 py-2 text-gray-400 text-xs">{v.batch_id ? `#${v.batch_id.substring(0, 8)}` : '—'}</td>
                            </tr>
                        ))}
                    </tbody>
                </table>
            </div>

            {/* Pagination */}
            {totalPages > 1 && (
                <div className="flex items-center justify-center gap-2 mt-4">
                    <button
                        onClick={() => setPage(p => Math.max(0, p - 1))}
                        disabled={page === 0}
                        className="px-3 py-1.5 text-sm border border-gray-200 rounded-lg disabled:opacity-40 hover:bg-gray-50"
                    >
                        ← Anterior
                    </button>
                    <span className="text-sm text-gray-500">{page + 1} / {totalPages}</span>
                    <button
                        onClick={() => setPage(p => Math.min(totalPages - 1, p + 1))}
                        disabled={page >= totalPages - 1}
                        className="px-3 py-1.5 text-sm border border-gray-200 rounded-lg disabled:opacity-40 hover:bg-gray-50"
                    >
                        Próxima →
                    </button>
                </div>
            )}

            {/* Code detail drawer */}
            {selectedCode && (
                <div className="fixed inset-0 z-50 flex justify-end" onClick={() => setSelectedCodeId(null)}>
                    <div className="absolute inset-0 bg-black/30" />
                    <div
                        className="relative w-full max-w-md bg-white h-full shadow-xl overflow-y-auto"
                        onClick={(e) => e.stopPropagation()}
                    >
                        <div className="p-5">
                            {/* Header */}
                            <div className="flex items-center justify-between mb-5">
                                <h2 className="text-lg font-bold text-gray-800">Detalhes do código</h2>
                                <button onClick={() => setSelectedCodeId(null)} className="text-gray-400 hover:text-gray-600">
                                    <Icons.X className="w-5 h-5" />
                                </button>
                            </div>

                            {/* Code */}
                            <div className="bg-gray-50 border border-gray-200 rounded-xl p-4 text-center mb-4">
                                <div className="font-mono text-xl font-bold text-gray-800 tracking-wider">{selectedCode.code}</div>
                                <div className="mt-2">
                                    <StatusBadge
                                        label={VOUCHER_STATUS_LABELS[selectedCode.status] || selectedCode.status}
                                        className={VOUCHER_STATUS_CLASSES[selectedCode.status] || 'bg-gray-200 text-gray-600'}
                                    />
                                </div>
                            </div>

                            {/* Info */}
                            <div className="space-y-3 text-sm mb-5">
                                <div className="flex justify-between">
                                    <span className="text-gray-500">ID</span>
                                    <span className="text-gray-800 font-mono text-xs">{selectedCode.id.substring(0, 16)}</span>
                                </div>
                                <div className="flex justify-between">
                                    <span className="text-gray-500">Duração</span>
                                    <span className="text-gray-800">{selectedCode.duration_months} meses</span>
                                </div>
                                {selectedCode.batch_id && (
                                    <div className="flex justify-between">
                                        <span className="text-gray-500">Lote</span>
                                        <span className="text-gray-800">#{selectedCode.batch_id.substring(0, 8)}</span>
                                    </div>
                                )}
                                {selectedCode.consumed_at && (
                                    <div className="flex justify-between">
                                        <span className="text-gray-500">Resgatado em</span>
                                        <span className="text-gray-800">{new Date(selectedCode.consumed_at).toLocaleString('pt-BR')}</span>
                                    </div>
                                )}
                                {selectedCode.expires_at && (
                                    <div className="flex justify-between">
                                        <span className="text-gray-500">Expira em</span>
                                        <span className="text-gray-800">{new Date(selectedCode.expires_at).toLocaleDateString('pt-BR')}</span>
                                    </div>
                                )}
                            </div>

                            {/* Batch snapshot */}
                            {selectedBatchInfo && (
                                <div className="mb-5">
                                    <h3 className="text-sm font-bold text-gray-700 mb-2">Snapshot do modelo</h3>
                                    <div className="bg-gray-50 border border-gray-200 rounded-lg p-3 text-sm">
                                        <div className="text-gray-800 font-medium mb-1">{selectedBatchInfo.model_snapshot.name}</div>
                                        <div className="text-xs text-gray-500 mb-2">
                                            {PACKAGE_LABELS[selectedBatchInfo.model_snapshot.package_type]?.icon}{' '}
                                            {PACKAGE_LABELS[selectedBatchInfo.model_snapshot.package_type]?.label} · {selectedBatchInfo.model_snapshot.duration_months} meses
                                        </div>
                                        <div className="flex flex-wrap gap-1.5">
                                            {selectedBatchInfo.model_snapshot.items.map((item, i) => (
                                                <div key={i} className="flex items-center gap-1 bg-white border border-gray-200 rounded px-1.5 py-0.5">
                                                    {item.cover_image && <img src={item.cover_image} alt="" className="w-5 h-5 rounded object-cover" />}
                                                    <span className="text-xs text-gray-700">{item.title}</span>
                                                </div>
                                            ))}
                                        </div>
                                    </div>
                                </div>
                            )}

                            {/* Actions */}
                            {selectedCode.status === 'active' && (
                                <div className="mb-5">
                                    <Button onClick={() => setDisablingCodeId(selectedCode.id)} variant="danger" className="w-full">
                                        Desativar voucher
                                    </Button>
                                </div>
                            )}

                            {/* Audit history */}
                            {selectedCodeAudit.length > 0 && (
                                <div>
                                    <h3 className="text-sm font-bold text-gray-700 mb-2">Histórico</h3>
                                    <div className="space-y-1 text-sm text-gray-500">
                                        {selectedCodeAudit.slice(0, 10).map(e => (
                                            <div key={e.id}>
                                                <span className="text-gray-400">{new Date(e.created_at).toLocaleString('pt-BR')}</span>
                                                {' — '}
                                                <span>{e.action}</span>
                                            </div>
                                        ))}
                                    </div>
                                </div>
                            )}
                        </div>
                    </div>
                </div>
            )}

            {/* Disable code modal */}
            {disablingCodeId && (
                <CriticalConfirmationModal
                    title="Desativar voucher"
                    description={`Tem certeza que deseja desativar o voucher ${codes.find(v => v.id === disablingCodeId)?.code || ''}?`}
                    consequences={[
                        'O código não poderá mais ser resgatado.',
                        'Esta ação não pode ser desfeita.',
                    ]}
                    confirmLabel="Desativar"
                    onConfirm={handleDisableCode}
                    onCancel={() => setDisablingCodeId(null)}
                />
            )}
        </div>
    );
};

/* ════════════════════════════════════════════════════════
   SUB-VIEW: Global Audit Log (T20)
   ════════════════════════════════════════════════════════ */

const ENTITY_TYPE_LABELS: Record<string, string> = {
    voucher_model: 'Modelo',
    voucher_batch: 'Lote',
    voucher: 'Voucher',
};

const ACTION_LABELS: Record<string, string> = {
    create: 'Criação',
    update: 'Atualização',
    update_status: 'Mudança de status',
    disable: 'Desativação',
    redeem_grants: 'Resgate + grants',
};

const AuditListView: React.FC = () => {
    const [entries, setEntries] = useState<AuditLogEntry[]>([]);
    const [entityFilter, setEntityFilter] = useState<string>('all');
    const [page, setPage] = useState(0);
    const PAGE_SIZE = 25;

    useEffect(() => { setEntries(getAuditLog()); }, []);

    const filtered = useMemo(() => {
        if (entityFilter === 'all') return entries;
        return entries.filter(e => e.entity_type === entityFilter);
    }, [entries, entityFilter]);

    const totalPages = Math.max(1, Math.ceil(filtered.length / PAGE_SIZE));
    const paged = filtered.slice(page * PAGE_SIZE, (page + 1) * PAGE_SIZE);

    return (
        <div className="p-4 md:p-6 max-w-5xl mx-auto">
            <h1 className="text-xl font-bold text-gray-800 mb-6">Auditoria</h1>

            <div className="flex flex-col sm:flex-row gap-3 mb-5">
                <select
                    value={entityFilter}
                    onChange={(e) => { setEntityFilter(e.target.value); setPage(0); }}
                    className="border border-gray-200 rounded-lg px-3 py-2 text-sm bg-white focus:outline-none focus:ring-2 focus:ring-kaboo-primary/30"
                >
                    <option value="all">Todas as entidades</option>
                    <option value="voucher_model">Modelos</option>
                    <option value="voucher_batch">Lotes</option>
                    <option value="voucher">Vouchers</option>
                </select>
            </div>

            {filtered.length === 0 ? (
                <div className="text-center py-16 text-gray-400">
                    <p className="text-sm">{entries.length === 0 ? 'Nenhum registro de auditoria.' : 'Nenhum registro corresponde ao filtro.'}</p>
                    {entries.length > 0 && entityFilter !== 'all' && (
                        <button onClick={() => { setEntityFilter('all'); setPage(0); }} className="mt-2 text-xs font-bold text-kaboo-primary hover:underline">Limpar filtro</button>
                    )}
                </div>
            ) : (
                <>
                    <div className="text-xs text-gray-400 mb-3">
                        {filtered.length} registros · Página {page + 1} de {totalPages}
                    </div>

                    <div className="border border-gray-200 rounded-xl overflow-hidden">
                        <table className="w-full text-sm">
                            <thead className="bg-gray-50">
                                <tr>
                                    <th className="text-left px-3 py-2 font-medium text-gray-500">Data</th>
                                    <th className="text-left px-3 py-2 font-medium text-gray-500">Ação</th>
                                    <th className="text-left px-3 py-2 font-medium text-gray-500">Entidade</th>
                                    <th className="text-left px-3 py-2 font-medium text-gray-500">ID</th>
                                    <th className="text-left px-3 py-2 font-medium text-gray-500">Detalhes</th>
                                </tr>
                            </thead>
                            <tbody>
                                {paged.map(e => (
                                    <tr key={e.id} className="border-t border-gray-100">
                                        <td className="px-3 py-2 text-gray-500 text-xs whitespace-nowrap">
                                            {new Date(e.created_at).toLocaleString('pt-BR')}
                                        </td>
                                        <td className="px-3 py-2 text-gray-800">
                                            {ACTION_LABELS[e.action] || e.action}
                                        </td>
                                        <td className="px-3 py-2">
                                            <StatusBadge
                                                label={ENTITY_TYPE_LABELS[e.entity_type] || e.entity_type}
                                                className="bg-gray-100 text-gray-600"
                                            />
                                        </td>
                                        <td className="px-3 py-2 font-mono text-xs text-gray-400">
                                            #{e.entity_id.substring(0, 8)}
                                        </td>
                                        <td className="px-3 py-2 text-xs text-gray-500 max-w-[200px] truncate">
                                            {e.details ? Object.entries(e.details).map(([k, v]) => `${k}: ${v}`).join(', ') : '—'}
                                        </td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    </div>

                    {/* Pagination */}
                    {totalPages > 1 && (
                        <div className="flex items-center justify-center gap-2 mt-4">
                            <button
                                onClick={() => setPage(p => Math.max(0, p - 1))}
                                disabled={page === 0}
                                className="px-3 py-1.5 text-sm border border-gray-200 rounded-lg disabled:opacity-40 hover:bg-gray-50"
                            >
                                ← Anterior
                            </button>
                            <span className="text-sm text-gray-500">
                                {page + 1} / {totalPages}
                            </span>
                            <button
                                onClick={() => setPage(p => Math.min(totalPages - 1, p + 1))}
                                disabled={page >= totalPages - 1}
                                className="px-3 py-1.5 text-sm border border-gray-200 rounded-lg disabled:opacity-40 hover:bg-gray-50"
                            >
                                Próxima →
                            </button>
                        </div>
                    )}
                </>
            )}
        </div>
    );
};

/* ════════════════════════════════════════════════════════
   MAIN: Vouchers Module
   ════════════════════════════════════════════════════════ */

export const VouchersModule: React.FC = () => {
    const [subView, setSubView] = useState<VoucherSubView>('models');
    const [selectedModelId, setSelectedModelId] = useState<string | null>(null);
    const [selectedBatchId, setSelectedBatchId] = useState<string | null>(null);
    const [editingModelId, setEditingModelId] = useState<string | null>(null);
    const [showWizard, setShowWizard] = useState(false);
    const [emitModelId, setEmitModelId] = useState<string | null>(null);

    // Models flow
    if (showWizard) {
        return (
            <ModelWizard
                editId={editingModelId}
                onDone={(id) => {
                    setShowWizard(false);
                    setEditingModelId(null);
                    setSelectedModelId(id);
                }}
                onCancel={() => {
                    setShowWizard(false);
                    setEditingModelId(null);
                }}
            />
        );
    }

    if (selectedModelId && subView === 'models') {
        return (
            <>
                <ModelDetailView
                    modelId={selectedModelId}
                    onBack={() => setSelectedModelId(null)}
                    onEdit={(id) => { setEditingModelId(id); setShowWizard(true); }}
                    onEmitBatch={(id) => setEmitModelId(id)}
                    onViewBatch={(batchId) => { setSubView('batches'); setSelectedBatchId(batchId); }}
                />
                {emitModelId && (
                    <EmitBatchModal
                        modelId={emitModelId}
                        onClose={() => setEmitModelId(null)}
                        onDone={(batchId) => {
                            setEmitModelId(null);
                            setSubView('batches');
                            setSelectedBatchId(batchId);
                        }}
                    />
                )}
            </>
        );
    }

    if (selectedBatchId && subView === 'batches') {
        return <BatchDetailView batchId={selectedBatchId} onBack={() => setSelectedBatchId(null)} />;
    }

    return (
        <div className="flex flex-col h-full">
            {/* Sub-tabs */}
            <div className="flex border-b border-gray-200 bg-white px-4">
                {(['models', 'batches', 'codes', 'audit'] as VoucherSubView[]).map(tab => (
                    <button
                        key={tab}
                        onClick={() => { setSubView(tab); setSelectedModelId(null); setSelectedBatchId(null); }}
                        className={`px-4 py-3 text-sm font-medium border-b-2 transition-colors
              ${subView === tab ? 'text-kaboo-primary border-kaboo-primary' : 'text-gray-500 border-transparent hover:text-gray-700'}`}
                    >
                        {tab === 'models' ? 'Modelos' : tab === 'batches' ? 'Lotes' : tab === 'codes' ? 'Códigos' : 'Auditoria'}
                    </button>
                ))}
            </div>

            {/* Content */}
            <div className="flex-1 overflow-y-auto">
                {subView === 'models' && (
                    <ModelsListView
                        onCreateNew={() => { setEditingModelId(null); setShowWizard(true); }}
                        onSelectModel={(id) => setSelectedModelId(id)}
                    />
                )}
                {subView === 'batches' && <BatchesListView onSelectBatch={(id) => setSelectedBatchId(id)} />}
                {subView === 'codes' && <CodesListView />}
                {subView === 'audit' && <AuditListView />}
            </div>
        </div>
    );
};
