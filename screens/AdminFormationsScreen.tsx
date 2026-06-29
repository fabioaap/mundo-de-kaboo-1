import React, { useState, useEffect, useCallback } from 'react';
import { Icons } from '../components/Icons';
import { ConfirmationModal } from '../components/ConfirmationModal';
import { Toast } from '../components/Toast';
import { FileUpload } from '../components/FileUpload';
import { useToast } from '../hooks/useToast';
import { api } from '../lib/api';
import { Formation, FormationLevel, FormationAsset, FormationLesson, MaterialAssetType, ScreenName } from '../types';

const normalizeText = (v: string) => (v ?? '').normalize('NFD').replace(/[̀-ͯ]/g, '').toLowerCase().trim();

const FORMATION_CARD_PALETTES = [
  { bg: 'bg-violet-50', border: 'border-violet-200/60', badge: 'bg-violet-100 text-violet-700', gradient: 'from-violet-50' },
  { bg: 'bg-rose-50', border: 'border-rose-200/60', badge: 'bg-rose-100 text-rose-700', gradient: 'from-rose-50' },
  { bg: 'bg-amber-50', border: 'border-amber-200/60', badge: 'bg-amber-100 text-amber-700', gradient: 'from-amber-50' },
  { bg: 'bg-sky-50', border: 'border-sky-200/60', badge: 'bg-sky-100 text-sky-700', gradient: 'from-sky-50' },
  { bg: 'bg-emerald-50', border: 'border-emerald-200/60', badge: 'bg-emerald-100 text-emerald-700', gradient: 'from-emerald-50' },
  { bg: 'bg-orange-50', border: 'border-orange-200/60', badge: 'bg-orange-100 text-orange-700', gradient: 'from-orange-50' },
] as const;

interface AdminFormationsScreenProps {
  onNavigate: (screen: ScreenName, params?: any) => void;
  onBack: () => void;
}

const LEVELS: FormationLevel[] = ['Iniciante', 'Intermediário', 'Avançado'];

const EMPTY_FORM: Omit<Formation, 'id' | 'created_at' | 'updated_at'> = {
  title: '',
  description: '',
  cover_image: '',
  level: null,
  tags: [],
  steps_count: 1,
  duration_label: '',
  related_collection_ids: [],
  assets: [],
  lessons: [],
  is_published: false,
  published_at: null,
  brand_id: null,
};

export const AdminFormationsScreen: React.FC<AdminFormationsScreenProps> = () => {
  const [formations, setFormations] = useState<Formation[]>([]);
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

  const [newAsset, setNewAsset] = useState<FormationAsset>({ type: 'pdf', url: '', title: '' });

  const { toast, showToast, hideToast } = useToast();

  const loadFormations = useCallback(async () => {
    setLoading(true);
    const data = await api.getFormations(true);
    setFormations(data);
    setLoading(false);
  }, []);

  useEffect(() => { loadFormations(); }, [loadFormations]);

  const isDrawerOpen = !!(editingId || showCreateForm);

  const hasUnsavedChanges = () => JSON.stringify(formData) !== JSON.stringify(originalFormData);

  const openCreate = () => {
    const fresh = { ...EMPTY_FORM };
    setFormData(fresh);
    setOriginalFormData(fresh);
    setEditingId(null);
    setShowCreateForm(true);
    setNewAsset({ type: 'pdf', url: '', title: '' });
  };

  const openEdit = (formation: Formation) => {
    const data: typeof EMPTY_FORM = {
      title: formation.title,
      description: formation.description ?? '',
      cover_image: formation.cover_image ?? '',
      level: formation.level ?? null,
      tags: formation.tags ?? [],
      steps_count: formation.steps_count ?? 1,
      duration_label: formation.duration_label ?? '',
      related_collection_ids: formation.related_collection_ids ?? [],
      assets: formation.assets ?? [],
      lessons: formation.lessons ?? [],
      is_published: formation.is_published ?? false,
      published_at: formation.published_at ?? null,
      brand_id: formation.brand_id ?? null,
    };
    setFormData(data);
    setOriginalFormData(data);
    setEditingId(formation.id);
    setShowCreateForm(false);
    setNewAsset({ type: 'pdf', url: '', title: '' });
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
    const payload = { ...formData, steps_count: formData.lessons?.length ?? 0 };
    try {
      if (editingId) {
        const result = await api.updateFormation(editingId, payload);
        if (result) {
          showToast('Formação atualizada!', 'success');
          setOriginalFormData({ ...formData });
          await loadFormations();
        } else {
          showToast('Erro ao atualizar formação', 'error');
        }
      } else {
        const result = await api.createFormation(payload);
        if (result) {
          showToast('Formação criada!', 'success');
          closeDrawer();
          await loadFormations();
        } else {
          showToast('Erro ao criar formação', 'error');
        }
      }
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async () => {
    if (!deletingId) return;
    const ok = await api.deleteFormation(deletingId);
    if (ok) {
      showToast('Formação excluída', 'success');
      if (editingId === deletingId) closeDrawer();
      await loadFormations();
    } else {
      showToast('Erro ao excluir formação', 'error');
    }
    setDeletingId(null);
    setShowDeleteModal(false);
  };

  const handleTogglePublish = async (formation: Formation) => {
    const fn = formation.is_published ? api.unpublishFormation.bind(api) : api.publishFormation.bind(api);
    const result = await fn(formation.id);
    if (result) {
      showToast(formation.is_published ? 'Despublicada' : 'Publicada!', 'success');
      await loadFormations();
      if (editingId === formation.id) {
        setFormData(prev => ({ ...prev, is_published: !formation.is_published }));
        setOriginalFormData(prev => ({ ...prev, is_published: !formation.is_published }));
      }
    }
  };

  const toggleTag = (tag: string) => {
    setFormData(prev => ({
      ...prev,
      tags: (prev.tags ?? []).includes(tag)
        ? (prev.tags ?? []).filter(t => t !== tag)
        : [...(prev.tags ?? []), tag],
    }));
  };

  const addAsset = () => {
    if (!newAsset.url.trim() || !newAsset.title.trim()) return;
    setFormData(prev => ({ ...prev, assets: [...(prev.assets ?? []), { ...newAsset }] }));
    setNewAsset({ type: 'pdf', url: '', title: '' });
  };

  const removeAsset = (idx: number) => {
    setFormData(prev => ({ ...prev, assets: (prev.assets ?? []).filter((_, i) => i !== idx) }));
  };

  const addLesson = () => {
    const newLesson: FormationLesson = {
      id: crypto.randomUUID(),
      title: '',
      video_url: null,
      pdf_url: null,
    };
    setFormData(prev => ({ ...prev, lessons: [...(prev.lessons ?? []), newLesson] }));
  };

  const removeLesson = (index: number) => {
    setFormData(prev => ({
      ...prev,
      lessons: (prev.lessons ?? []).filter((_, i) => i !== index),
    }));
  };

  const updateLesson = (index: number, field: keyof FormationLesson, value: string | null) => {
    setFormData(prev => {
      const lessons = [...(prev.lessons ?? [])];
      lessons[index] = { ...lessons[index], [field]: value };
      return { ...prev, lessons };
    });
  };

  const moveLesson = (index: number, direction: -1 | 1) => {
    setFormData(prev => {
      const lessons = [...(prev.lessons ?? [])];
      const newIndex = index + direction;
      if (newIndex < 0 || newIndex >= lessons.length) return prev;
      [lessons[index], lessons[newIndex]] = [lessons[newIndex], lessons[index]];
      return { ...prev, lessons };
    });
  };

  const filtered = formations.filter(f =>
    normalizeText(f.title).includes(normalizeText(searchQuery))
  );

  const ASSET_TYPE_ICONS: Record<MaterialAssetType, React.FC<any>> = {
    pdf: Icons.FileText,
    video: Icons.Video,
    audio: Icons.Headphones,
  };

  return (
    <div className="flex flex-col h-full bg-white relative overflow-hidden">

      {/* Header */}
      <div className="flex items-center justify-between px-6 py-4 border-b border-gray-100">
        <h1 className="text-xl font-black text-gray-800">Formações</h1>
        <button
          onClick={openCreate}
          className="flex items-center gap-2 px-4 py-2 bg-brand-primary text-white rounded-2xl font-bold text-sm hover:bg-brand-light transition-colors"
        >
          <Icons.Plus size={16} />
          Nova Formação
        </button>
      </div>

      {/* Search */}
      <div className="px-6 py-3 border-b border-gray-100">
        <div className="relative">
          <Icons.Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
          <input
            type="text"
            value={searchQuery}
            onChange={e => setSearchQuery(e.target.value)}
            placeholder="Buscar formações..."
            className="w-full pl-9 pr-4 py-2.5 bg-gray-50 rounded-2xl text-sm outline-none focus:ring-2 focus:ring-brand-primary/30"
          />
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
              <Icons.BookOpen size={28} className="text-gray-400" />
            </div>
            <p className="text-gray-500 font-bold mb-1">Nenhuma formação encontrada</p>
            <p className="text-gray-400 text-sm">Crie a primeira formação usando o botão acima</p>
          </div>
        ) : (
          <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-4">
            {filtered.map((formation, formationIndex) => {
              const palette = FORMATION_CARD_PALETTES[formationIndex % FORMATION_CARD_PALETTES.length];
              const isEditing = editingId === formation.id;
              const metaLabel = formation.lessons?.length
                ? `${formation.lessons.length} aula${formation.lessons.length !== 1 ? 's' : ''}${formation.duration_label ? ' · ' + formation.duration_label : ''}`
                : formation.duration_label || 'Sem aulas';
              return (
                <div
                  key={formation.id}
                  className={`group rounded-[1.6rem] border overflow-hidden shadow-[0_12px_28px_rgba(93,31,88,0.05)] transition-all duration-200 cursor-pointer md:hover:-translate-y-0.5 hover:shadow-[0_18px_34px_rgba(93,31,88,0.08)] active:scale-[0.995] ${isEditing ? 'border-brand-primary ring-2 ring-brand-primary/20' : palette.border} ${palette.bg}`}
                  onClick={() => openEdit(formation)}
                >
                  <div className="relative flex flex-col min-h-[152px] p-4">
                    {/* Cover/icon — absolute right */}
                    <div className="absolute right-0 top-0 bottom-0 w-[42%] pointer-events-none select-none">
                      {formation.cover_image ? (
                        <img src={formation.cover_image} alt="" className="h-full w-full object-cover" />
                      ) : (
                        <div className="h-full w-full flex items-center justify-center">
                          <Icons.BookOpen size={44} className="opacity-[0.12]" />
                        </div>
                      )}
                      <div className={`absolute inset-0 bg-gradient-to-r ${palette.gradient} to-transparent`} />
                    </div>

                    {/* Left content */}
                    <div className="pr-[44%] flex flex-col flex-1 gap-2">
                      <div className="flex items-center gap-1.5 flex-wrap">
                        <span className={`inline-flex w-fit items-center rounded-full px-2.5 py-1 text-[11px] font-black uppercase tracking-[0.13em] ${palette.badge}`}>
                          Formação
                        </span>
                        <div onClick={e => e.stopPropagation()} className="flex items-center gap-1">
                          <button
                            onClick={() => handleTogglePublish(formation)}
                            className={`text-[10px] px-2 py-0.5 rounded-full font-black transition-colors ${formation.is_published ? 'bg-green-100 text-green-700 hover:bg-green-200' : 'bg-gray-200 text-gray-500 hover:bg-gray-300'}`}
                          >
                            {formation.is_published ? 'Publicada' : 'Rascunho'}
                          </button>
                          <button
                            onClick={() => { setDeletingId(formation.id); setShowDeleteModal(true); }}
                            className="w-5 h-5 rounded-full hover:bg-red-100 flex items-center justify-center text-gray-300 hover:text-red-400 transition-colors"
                          >
                            <Icons.Trash2 size={11} />
                          </button>
                        </div>
                      </div>

                      <h3 className="font-black text-gray-800 text-[1rem] leading-[1.2] tracking-[-0.02em] line-clamp-2">
                        {formation.title}
                      </h3>
                      {formation.description && (
                        <p className="text-xs text-gray-500 line-clamp-2 leading-5">
                          {formation.description}
                        </p>
                      )}
                    </div>

                    {/* Footer */}
                    <div className="flex items-center justify-between mt-3 pt-2.5 border-t border-gray-900/8 pr-[44%]">
                      <span className="text-[11px] font-bold text-gray-500">{metaLabel}</span>
                      <span className="inline-flex items-center gap-1 text-sm font-bold text-brand-primary transition-transform duration-150 group-hover:translate-x-0.5">
                        Editar <Icons.ChevronRight size={14} />
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
            <p className="text-xs text-gray-400 font-bold uppercase tracking-wide">Formações</p>
            <h2 className="text-lg font-black text-gray-800">{editingId ? 'Editar Formação' : 'Nova Formação'}</h2>
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
            inputId="formation-cover"
          />

          {/* Title */}
          <div>
            <label className="block text-sm font-bold text-gray-700 mb-2">Título *</label>
            <input
              type="text"
              value={formData.title}
              onChange={e => setFormData(prev => ({ ...prev, title: e.target.value }))}
              placeholder="Nome da formação"
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
              placeholder="Descreva o objetivo desta formação..."
              rows={3}
              className="w-full bg-gray-50 rounded-2xl p-4 text-gray-800 outline-none focus:ring-2 focus:ring-brand-primary/30 resize-none"
            />
          </div>

          {/* Level */}
          <div>
            <label className="block text-sm font-bold text-gray-700 mb-2">Nível</label>
            <select
              value={formData.level ?? ''}
              onChange={e => setFormData(prev => ({ ...prev, level: (e.target.value as FormationLevel) || null }))}
              className="w-full bg-gray-50 rounded-2xl p-4 text-gray-800 outline-none focus:ring-2 focus:ring-brand-primary/30"
            >
              <option value="">Selecionar nível...</option>
              {LEVELS.map(l => <option key={l} value={l}>{l}</option>)}
            </select>
          </div>

          {/* Steps count (derived) + Duration */}
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-bold text-gray-700 mb-2">Nº de aulas</label>
              <div className="w-full bg-gray-50 rounded-2xl p-4 text-gray-500 flex items-center">
                {(formData.lessons ?? []).length} aula(s)
              </div>
            </div>
            <div>
              <label className="block text-sm font-bold text-gray-700 mb-2">Duração</label>
              <input
                type="text"
                value={formData.duration_label ?? ''}
                onChange={e => setFormData(prev => ({ ...prev, duration_label: e.target.value }))}
                placeholder="Ex: 2 horas"
                className="w-full bg-gray-50 rounded-2xl p-4 text-gray-800 outline-none focus:ring-2 focus:ring-brand-primary/30"
              />
            </div>
          </div>

          {/* Filtros da biblioteca */}
          <div>
            <label className="block text-sm font-bold text-gray-700 mb-2">Filtros da biblioteca</label>
            <div className="flex flex-wrap gap-2">
              {(['Acolhimento', 'Roda', 'Conflitos', 'Percurso curto'] as const).map(tag => {
                const active = (formData.tags ?? []).includes(tag);
                return (
                  <button
                    key={tag}
                    type="button"
                    onClick={() => toggleTag(tag)}
                    className={`px-4 py-2 rounded-full text-sm font-bold transition-all border ${active ? 'bg-brand-primary text-white border-brand-primary' : 'bg-white text-gray-600 border-gray-200 hover:border-brand-primary/30'}`}
                  >
                    {tag}
                  </button>
                );
              })}
            </div>
          </div>

          {/* Assets */}
          <div>
            <label className="block text-sm font-bold text-gray-700 mb-2">Assets (vídeos e PDFs)</label>

            {/* Existing assets */}
            {(formData.assets ?? []).length > 0 && (
              <div className="space-y-2 mb-3">
                {(formData.assets ?? []).map((asset, idx) => {
                  const Icon = ASSET_TYPE_ICONS[asset.type] ?? Icons.FileText;
                  return (
                    <div key={idx} className="flex items-center gap-3 p-3 bg-gray-50 rounded-xl">
                      <Icon size={16} className="text-gray-500 flex-shrink-0" />
                      <div className="flex-1 min-w-0">
                        <p className="text-sm font-bold text-gray-700 truncate">{asset.title}</p>
                        <p className="text-xs text-gray-400 truncate">{asset.url}</p>
                      </div>
                      <button onClick={() => removeAsset(idx)} className="text-gray-400 hover:text-red-500 transition-colors flex-shrink-0">
                        <Icons.X size={14} />
                      </button>
                    </div>
                  );
                })}
              </div>
            )}

            {/* Add new asset */}
            <div className="p-3 border border-dashed border-gray-200 rounded-xl space-y-2">
              <div className="flex gap-2">
                <select
                  value={newAsset.type}
                  onChange={e => setNewAsset(prev => ({ ...prev, type: e.target.value as MaterialAssetType }))}
                  className="w-24 bg-gray-50 rounded-xl p-2 text-sm outline-none"
                >
                  <option value="pdf">PDF</option>
                  <option value="video">Vídeo</option>
                  <option value="audio">Áudio</option>
                </select>
                <input
                  type="text"
                  value={newAsset.title}
                  onChange={e => setNewAsset(prev => ({ ...prev, title: e.target.value }))}
                  placeholder="Título do asset"
                  className="flex-1 bg-gray-50 rounded-xl p-2 text-sm outline-none"
                />
              </div>
              <div className="flex gap-2">
                <input
                  type="url"
                  value={newAsset.url}
                  onChange={e => setNewAsset(prev => ({ ...prev, url: e.target.value }))}
                  placeholder="URL do arquivo"
                  className="flex-1 bg-gray-50 rounded-xl p-2 text-sm outline-none"
                />
                <button
                  onClick={addAsset}
                  disabled={!newAsset.url.trim() || !newAsset.title.trim()}
                  className="px-3 py-2 bg-brand-primary/10 text-brand-primary rounded-xl text-sm font-bold hover:bg-brand-primary/20 disabled:opacity-40 transition-colors"
                >
                  <Icons.Plus size={14} />
                </button>
              </div>
            </div>
          </div>

          {/* Aulas do Curso */}
          <div>
            <label className="block text-sm font-bold text-gray-700 mb-2">Aulas do curso</label>

            {(formData.lessons ?? []).length > 0 && (
              <div className="space-y-3 mb-3">
                {(formData.lessons ?? []).map((lesson, index) => (
                  <div key={lesson.id} className="p-3 bg-gray-50 rounded-xl space-y-2">
                    <div className="flex items-center gap-2">
                      <span className="w-6 h-6 flex-shrink-0 rounded-full bg-brand-primary/10 text-brand-primary text-xs font-bold flex items-center justify-center">
                        {index + 1}
                      </span>
                      <input
                        type="text"
                        value={lesson.title}
                        onChange={e => updateLesson(index, 'title', e.target.value)}
                        placeholder="Título da aula"
                        className="flex-1 bg-white rounded-xl p-2 text-sm outline-none focus:ring-2 focus:ring-brand-primary/30"
                      />
                    </div>
                    <input
                      type="url"
                      value={lesson.video_url ?? ''}
                      onChange={e => updateLesson(index, 'video_url', e.target.value || null)}
                      placeholder="URL do vídeo (YouTube)"
                      className="w-full bg-white rounded-xl p-2 text-sm outline-none focus:ring-2 focus:ring-brand-primary/30"
                    />
                    <input
                      type="url"
                      value={lesson.pdf_url ?? ''}
                      onChange={e => updateLesson(index, 'pdf_url', e.target.value || null)}
                      placeholder="URL do PDF"
                      className="w-full bg-white rounded-xl p-2 text-sm outline-none focus:ring-2 focus:ring-brand-primary/30"
                    />
                    <div className="flex items-center gap-2">
                      <button
                        type="button"
                        onClick={() => moveLesson(index, -1)}
                        disabled={index === 0}
                        className="w-8 h-8 rounded-lg bg-white border border-gray-200 flex items-center justify-center text-gray-500 hover:text-brand-primary disabled:opacity-30 transition-colors"
                      >
                        <Icons.ArrowUp size={14} />
                      </button>
                      <button
                        type="button"
                        onClick={() => moveLesson(index, 1)}
                        disabled={index === (formData.lessons?.length ?? 0) - 1}
                        className="w-8 h-8 rounded-lg bg-white border border-gray-200 flex items-center justify-center text-gray-500 hover:text-brand-primary disabled:opacity-30 transition-colors"
                      >
                        <Icons.ArrowDown size={14} />
                      </button>
                      <button
                        type="button"
                        onClick={() => removeLesson(index)}
                        className="ml-auto px-3 h-8 rounded-lg bg-white border border-gray-200 text-gray-500 hover:text-red-500 hover:border-red-200 text-sm font-bold transition-colors flex items-center gap-1"
                      >
                        <Icons.Trash2 size={14} />
                        Remover
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            )}

            <button
              type="button"
              onClick={addLesson}
              className="w-full py-3 border border-dashed border-gray-200 rounded-xl text-sm font-bold text-brand-primary hover:bg-brand-primary/5 transition-colors flex items-center justify-center gap-2"
            >
              <Icons.Plus size={14} />
              Adicionar aula
            </button>
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
            {saving ? 'Salvando...' : editingId ? 'Salvar Alterações' : 'Criar Formação'}
          </button>
        </div>
      </div>

      {/* Modals */}
      <ConfirmationModal
        isOpen={showDeleteModal}
        title="Excluir Formação"
        message="Tem certeza que deseja excluir esta formação? Esta ação não pode ser desfeita."
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
