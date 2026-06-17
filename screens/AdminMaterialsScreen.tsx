import React, { useState, useEffect, useCallback } from 'react';
import { Icons } from '../components/Icons';
import { ConfirmationModal } from '../components/ConfirmationModal';
import { Toast } from '../components/Toast';
import { FileUpload } from '../components/FileUpload';
import { useToast } from '../hooks/useToast';
import { api } from '../lib/api';
import { Material, MaterialAssetType, ScreenName } from '../types';

const normalizeText = (v: string) => (v ?? '').normalize('NFD').replace(/[̀-ͯ]/g, '').toLowerCase().trim();

interface AdminMaterialsScreenProps {
  onNavigate: (screen: ScreenName, params?: any) => void;
  onBack: () => void;
}

const ASSET_TYPES: { value: MaterialAssetType; label: string }[] = [
  { value: 'pdf', label: 'PDF' },
  { value: 'video', label: 'Vídeo' },
  { value: 'audio', label: 'Áudio' },
];

const EMPTY_FORM: Omit<Material, 'id' | 'created_at' | 'updated_at'> = {
  title: '',
  description: '',
  cover_image: '',
  asset_url: '',
  asset_type: 'pdf',
  tags: [],
  related_collection_ids: [],
  is_published: false,
  published_at: null,
  brand_id: null,
};

export const AdminMaterialsScreen: React.FC<AdminMaterialsScreenProps> = () => {
  const [materials, setMaterials] = useState<Material[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');

  const [editingId, setEditingId] = useState<string | null>(null);
  const [showCreateForm, setShowCreateForm] = useState(false);
  const [saving, setSaving] = useState(false);
  const [showDeleteModal, setShowDeleteModal] = useState(false);
  const [deletingId, setDeletingId] = useState<string | null>(null);
  const [showUnsavedModal, setShowUnsavedModal] = useState(false);
  const [pendingCloseAction, setPendingCloseAction] = useState<(() => void) | null>(null);

  const [formData, setFormData] = useState<typeof EMPTY_FORM>({ ...EMPTY_FORM });
  const [originalFormData, setOriginalFormData] = useState<typeof EMPTY_FORM>({ ...EMPTY_FORM });

  const [tagInput, setTagInput] = useState('');

  const { toast, showToast, hideToast } = useToast();

  const loadMaterials = useCallback(async () => {
    setLoading(true);
    const data = await api.getMaterials(true);
    setMaterials(data);
    setLoading(false);
  }, []);

  useEffect(() => { loadMaterials(); }, [loadMaterials]);

  const isDrawerOpen = !!(editingId || showCreateForm);

  const hasUnsavedChanges = () => JSON.stringify(formData) !== JSON.stringify(originalFormData);

  const openCreate = () => {
    const fresh = { ...EMPTY_FORM };
    setFormData(fresh);
    setOriginalFormData(fresh);
    setEditingId(null);
    setShowCreateForm(true);
    setTagInput('');
  };

  const openEdit = (material: Material) => {
    const data: typeof EMPTY_FORM = {
      title: material.title,
      description: material.description ?? '',
      cover_image: material.cover_image ?? '',
      asset_url: material.asset_url ?? '',
      asset_type: material.asset_type ?? 'pdf',
      tags: material.tags ?? [],
      related_collection_ids: material.related_collection_ids ?? [],
      is_published: material.is_published ?? false,
      published_at: material.published_at ?? null,
      brand_id: material.brand_id ?? null,
    };
    setFormData(data);
    setOriginalFormData(data);
    setEditingId(material.id);
    setShowCreateForm(false);
    setTagInput('');
  };

  const requestClose = (action: () => void) => {
    if (hasUnsavedChanges()) {
      setPendingCloseAction(() => action);
      setShowUnsavedModal(true);
    } else {
      action();
    }
  };

  const closeDrawer = () => {
    setEditingId(null);
    setShowCreateForm(false);
  };

  const handleSave = async () => {
    if (!formData.title.trim()) { showToast('Título é obrigatório', 'error'); return; }
    setSaving(true);
    try {
      if (editingId) {
        const result = await api.updateMaterial(editingId, formData);
        if (result) {
          showToast('Material atualizado!', 'success');
          setOriginalFormData({ ...formData });
          await loadMaterials();
        } else {
          showToast('Erro ao atualizar material', 'error');
        }
      } else {
        const result = await api.createMaterial(formData);
        if (result) {
          showToast('Material criado!', 'success');
          closeDrawer();
          await loadMaterials();
        } else {
          showToast('Erro ao criar material', 'error');
        }
      }
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async () => {
    if (!deletingId) return;
    const ok = await api.deleteMaterial(deletingId);
    if (ok) {
      showToast('Material excluído', 'success');
      if (editingId === deletingId) closeDrawer();
      await loadMaterials();
    } else {
      showToast('Erro ao excluir material', 'error');
    }
    setDeletingId(null);
    setShowDeleteModal(false);
  };

  const handleTogglePublish = async (material: Material) => {
    const fn = material.is_published ? api.unpublishMaterial.bind(api) : api.publishMaterial.bind(api);
    const result = await fn(material.id);
    if (result) {
      showToast(material.is_published ? 'Despublicado' : 'Publicado!', 'success');
      await loadMaterials();
      if (editingId === material.id) {
        setFormData(prev => ({ ...prev, is_published: !material.is_published }));
        setOriginalFormData(prev => ({ ...prev, is_published: !material.is_published }));
      }
    }
  };

  const addTag = () => {
    const tag = tagInput.trim();
    if (tag && !formData.tags?.includes(tag)) {
      setFormData(prev => ({ ...prev, tags: [...(prev.tags ?? []), tag] }));
      setTagInput('');
    }
  };

  const removeTag = (tag: string) => {
    setFormData(prev => ({ ...prev, tags: (prev.tags ?? []).filter(t => t !== tag) }));
  };

  const assetFolderForType = (type: MaterialAssetType): 'pdfs' | 'audio' | 'video' => {
    if (type === 'pdf') return 'pdfs';
    if (type === 'audio') return 'audio';
    return 'video';
  };

  const [statusFilter, setStatusFilter] = React.useState<'all' | 'published' | 'draft'>('all');

  const countAll = materials.length;
  const countPublished = materials.filter(m => m.is_published).length;
  const countDraft = materials.filter(m => !m.is_published).length;

  const filtered = materials.filter(m => {
    const matchesSearch = normalizeText(m.title).includes(normalizeText(searchQuery));
    const matchesStatus = statusFilter === 'all'
      || (statusFilter === 'published' && m.is_published)
      || (statusFilter === 'draft' && !m.is_published);
    return matchesSearch && matchesStatus;
  });

  const ASSET_ICONS: Record<MaterialAssetType, React.FC<any>> = {
    pdf: Icons.FileText,
    video: Icons.Video,
    audio: Icons.Headphones,
  };

  return (
    <div className="flex flex-col h-full bg-white relative overflow-hidden">

      {/* Header */}
      <div className="flex items-center justify-between px-6 py-4 border-b border-gray-100">
        <h1 className="text-xl font-black text-gray-800">Materiais</h1>
        <button
          onClick={openCreate}
          className="flex items-center gap-2 px-4 py-2 bg-brand-primary text-white rounded-2xl font-bold text-sm hover:bg-brand-light transition-colors"
        >
          <Icons.Plus size={16} />
          Novo Material
        </button>
      </div>

      {/* Search + Status tabs */}
      <div className="px-6 pt-3 pb-0 border-b border-gray-100">
        <div className="relative mb-3">
          <Icons.Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
          <input
            type="text"
            value={searchQuery}
            onChange={e => setSearchQuery(e.target.value)}
            placeholder="Buscar materiais..."
            className="w-full pl-9 pr-4 py-2.5 bg-gray-50 rounded-2xl text-sm outline-none focus:ring-2 focus:ring-brand-primary/30"
          />
        </div>
        <div className="flex gap-1">
          {(['all', 'published', 'draft'] as const).map(key => {
            const label = key === 'all' ? 'Todos' : key === 'published' ? 'Publicado' : 'Rascunho';
            const count = key === 'all' ? countAll : key === 'published' ? countPublished : countDraft;
            const active = statusFilter === key;
            return (
              <button
                key={key}
                onClick={() => setStatusFilter(key)}
                className={`flex items-center gap-1.5 px-3 py-2 text-xs font-bold border-b-2 transition-colors ${active ? 'border-brand-primary text-brand-primary' : 'border-transparent text-gray-400 hover:text-gray-600'}`}
              >
                {label}
                <span className={`text-[10px] px-1.5 py-0.5 rounded-full font-black ${active ? 'bg-brand-primary/10 text-brand-primary' : 'bg-gray-100 text-gray-400'}`}>
                  {count}
                </span>
              </button>
            );
          })}
        </div>
      </div>

      {/* List */}
      <div className="flex-1 overflow-y-auto px-6 py-4 no-scrollbar">
        {loading ? (
          <div className="flex justify-center py-16">
            <div className="w-8 h-8 border-2 border-brand-primary border-t-transparent rounded-full animate-spin" />
          </div>
        ) : filtered.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-16 text-center">
            <div className="w-16 h-16 bg-gray-100 rounded-full flex items-center justify-center mb-4">
              <Icons.FileText size={28} className="text-gray-400" />
            </div>
            <p className="text-gray-500 font-bold mb-1">Nenhum material encontrado</p>
            <p className="text-gray-400 text-sm">Crie o primeiro material usando o botão acima</p>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-4 gap-3">
            {filtered.map(material => {
              const AssetIcon = ASSET_ICONS[material.asset_type ?? 'pdf'] ?? Icons.FileText;
              return (
                <div
                  key={material.id}
                  className={`flex gap-3 p-3 rounded-2xl border transition-all cursor-pointer group ${editingId === material.id ? 'border-brand-primary bg-brand-primary/5' : 'border-gray-100 hover:border-gray-200 bg-white hover:shadow-sm'}`}
                  onClick={() => openEdit(material)}
                >
                  {/* Cover — mesmo tamanho da vitrine */}
                  <div className="w-[72px] h-[72px] rounded-xl bg-gray-100 flex-shrink-0 overflow-hidden">
                    {material.cover_image ? (
                      <img src={material.cover_image} alt="" className="w-full h-full object-cover" />
                    ) : (
                      <div className="w-full h-full flex items-center justify-center">
                        <AssetIcon size={22} className="text-gray-300" />
                      </div>
                    )}
                  </div>

                  {/* Content */}
                  <div className="flex flex-col flex-1 min-w-0">
                    {/* Top row: type badge + publish toggle */}
                    <div className="flex items-center justify-between gap-1 mb-1">
                      <span className="text-[10px] bg-gray-100 text-gray-500 px-2 py-0.5 rounded-full font-black uppercase tracking-wide">
                        {material.asset_type ?? 'pdf'}
                      </span>
                      <div onClick={e => e.stopPropagation()}>
                        <button
                          onClick={() => handleTogglePublish(material)}
                          className={`text-[10px] px-2 py-0.5 rounded-full font-black transition-colors ${material.is_published ? 'bg-green-100 text-green-700 hover:bg-green-200' : 'bg-gray-100 text-gray-400 hover:bg-gray-200'}`}
                        >
                          {material.is_published ? 'Publicado' : 'Rascunho'}
                        </button>
                      </div>
                    </div>

                    {/* Title */}
                    <p className="font-black text-gray-800 text-sm line-clamp-2 leading-snug">{material.title}</p>

                    {/* Description */}
                    <p className="text-gray-400 text-xs line-clamp-2 mt-0.5 leading-relaxed">{material.description || 'Sem descrição'}</p>

                    {/* Bottom row: "Documento" label + editar CTA */}
                    <div className="flex items-center justify-between mt-auto pt-1.5">
                      <span className="text-[11px] text-gray-400 font-medium">Documento</span>
                      <span className="text-[11px] text-brand-primary font-bold flex items-center gap-0.5">
                        Editar <Icons.ChevronRight size={12} />
                      </span>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>

      {/* Backdrop */}
      <div
        onClick={() => requestClose(closeDrawer)}
        className={`fixed inset-0 z-40 transition-all duration-300 ${isDrawerOpen ? 'bg-black/40 pointer-events-auto' : 'bg-transparent pointer-events-none'}`}
      />

      {/* Sliding Drawer */}
      <div
        className={`fixed inset-y-0 right-0 w-full md:w-[480px] bg-white shadow-2xl z-50 flex flex-col transition-transform duration-300 ease-[cubic-bezier(0.32,0.72,0,1)] ${isDrawerOpen ? 'translate-x-0' : 'translate-x-full'}`}
      >

        {/* Drawer Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-gray-100">
          <div>
            <p className="text-xs text-gray-400 font-bold uppercase tracking-wide">Materiais</p>
            <h2 className="text-lg font-black text-gray-800">{editingId ? 'Editar Material' : 'Novo Material'}</h2>
          </div>
          <div className="flex items-center gap-2">
            {editingId && (
              <button
                onClick={() => { setDeletingId(editingId); setShowDeleteModal(true); }}
                className="w-9 h-9 rounded-full hover:bg-red-50 flex items-center justify-center text-gray-400 hover:text-red-500 transition-colors"
              >
                <Icons.Trash2 size={18} />
              </button>
            )}
            <button
              onClick={() => requestClose(closeDrawer)}
              className="w-9 h-9 rounded-full hover:bg-gray-100 flex items-center justify-center text-gray-400 transition-colors"
            >
              <Icons.X size={18} />
            </button>
          </div>
        </div>

        {/* Drawer Body */}
        <div className="flex-1 overflow-y-auto px-6 py-6 space-y-6 no-scrollbar">

          {/* Cover image */}
          <FileUpload
            label="Imagem de Capa"
            value={formData.cover_image ?? ''}
            onChange={url => setFormData(prev => ({ ...prev, cover_image: url }))}
            folder="covers"
            accept="image/*"
            hideUrlInput
            inputId="material-cover"
          />

          {/* Title */}
          <div>
            <label className="block text-sm font-bold text-gray-700 mb-2">Título *</label>
            <input
              type="text"
              value={formData.title}
              onChange={e => setFormData(prev => ({ ...prev, title: e.target.value }))}
              placeholder="Nome do material"
              className="w-full bg-gray-50 rounded-2xl p-4 text-gray-800 outline-none focus:ring-2 focus:ring-brand-primary/30"
            />
          </div>

          {/* Status de publicação */}
          <div className="flex items-center justify-between p-3 rounded-xl bg-gray-50 border border-gray-200">
            <div>
              <p className="text-sm font-medium text-gray-900">Status de publicação</p>
              <p className="text-xs text-gray-500">
                {formData.is_published ? 'Visível na vitrine pública' : 'Rascunho — apenas no admin'}
              </p>
            </div>
            <button
              type="button"
              onClick={() => setFormData(prev => ({ ...prev, is_published: !prev.is_published }))}
              className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors ${formData.is_published ? 'bg-green-500' : 'bg-gray-300'}`}
            >
              <span className={`inline-block h-4 w-4 transform rounded-full bg-white shadow transition-transform ${formData.is_published ? 'translate-x-6' : 'translate-x-1'}`} />
            </button>
          </div>

          {/* Description */}
          <div>
            <label className="block text-sm font-bold text-gray-700 mb-2">Descrição</label>
            <textarea
              value={formData.description ?? ''}
              onChange={e => setFormData(prev => ({ ...prev, description: e.target.value }))}
              placeholder="Descreva este material..."
              rows={3}
              className="w-full bg-gray-50 rounded-2xl p-4 text-gray-800 outline-none focus:ring-2 focus:ring-brand-primary/30 resize-none"
            />
          </div>

          {/* Asset type + URL */}
          <div>
            <label className="block text-sm font-bold text-gray-700 mb-2">Arquivo</label>
            <div className="flex gap-2 mb-3">
              {ASSET_TYPES.map(at => (
                <button
                  key={at.value}
                  onClick={() => setFormData(prev => ({ ...prev, asset_type: at.value }))}
                  className={`flex-1 py-2 rounded-xl text-sm font-bold transition-colors ${formData.asset_type === at.value ? 'bg-brand-primary text-white' : 'bg-gray-100 text-gray-500 hover:bg-gray-200'}`}
                >
                  {at.label}
                </button>
              ))}
            </div>
            <FileUpload
              label=""
              value={formData.asset_url ?? ''}
              onChange={url => setFormData(prev => ({ ...prev, asset_url: url }))}
              folder={assetFolderForType(formData.asset_type ?? 'pdf')}
              accept={formData.asset_type === 'pdf' ? 'application/pdf' : formData.asset_type === 'audio' ? 'audio/*' : 'video/*'}
              showAsIcon
              inputId="material-asset"
            />
          </div>

          {/* Tags */}
          <div>
            <label className="block text-sm font-bold text-gray-700 mb-2">Tags</label>
            <div className="flex gap-2 mb-3">
              <input
                type="text"
                value={tagInput}
                onChange={e => setTagInput(e.target.value)}
                onKeyDown={e => { if (e.key === 'Enter') { e.preventDefault(); addTag(); } }}
                placeholder="Adicionar tag..."
                className="flex-1 bg-gray-50 rounded-2xl p-3 text-sm text-gray-800 outline-none focus:ring-2 focus:ring-brand-primary/30"
              />
              <button
                onClick={addTag}
                className="px-4 py-2 bg-brand-primary/10 text-brand-primary rounded-2xl font-bold text-sm hover:bg-brand-primary/20 transition-colors"
              >
                Adicionar
              </button>
            </div>
            {(formData.tags ?? []).length > 0 && (
              <div className="flex flex-wrap gap-2">
                {(formData.tags ?? []).map(tag => (
                  <span key={tag} className="flex items-center gap-1.5 px-3 py-1 bg-brand-primary/10 text-brand-primary rounded-full text-sm font-bold">
                    {tag}
                    <button onClick={() => removeTag(tag)} className="hover:text-red-500 transition-colors">
                      <Icons.X size={12} />
                    </button>
                  </span>
                ))}
              </div>
            )}
          </div>

        </div>

        {/* Drawer Footer */}
        <div className="flex items-center gap-3 px-6 py-4 border-t border-gray-100">
          <button
            onClick={() => requestClose(closeDrawer)}
            className="flex-1 py-3 border border-gray-200 text-gray-600 rounded-2xl font-bold hover:bg-gray-50 transition-colors"
          >
            Cancelar
          </button>
          <button
            onClick={handleSave}
            disabled={saving}
            className="flex-1 py-3 bg-brand-primary text-white rounded-2xl font-bold hover:bg-brand-light transition-colors disabled:opacity-60 flex items-center justify-center gap-2"
          >
            {saving ? <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" /> : null}
            {saving ? 'Salvando...' : editingId ? 'Salvar Alterações' : 'Criar Material'}
          </button>
        </div>
      </div>

      {/* Modals */}
      <ConfirmationModal
        isOpen={showDeleteModal}
        title="Excluir Material"
        message="Tem certeza que deseja excluir este material? Esta ação não pode ser desfeita."
        confirmText="Excluir"
        cancelText="Cancelar"
        onConfirm={handleDelete}
        onCancel={() => { setShowDeleteModal(false); setDeletingId(null); }}
      />

      <ConfirmationModal
        isOpen={showUnsavedModal}
        title="Alterações não salvas"
        message="Você tem alterações não salvas. Deseja descartar e sair?"
        confirmText="Descartar"
        cancelText="Continuar editando"
        onConfirm={() => {
          setShowUnsavedModal(false);
          pendingCloseAction?.();
          setPendingCloseAction(null);
        }}
        onCancel={() => { setShowUnsavedModal(false); setPendingCloseAction(null); }}
      />

      <Toast
        message={toast.message}
        type={toast.type}
        isVisible={toast.isVisible}
        onClose={hideToast}
      />
    </div>
  );
};
