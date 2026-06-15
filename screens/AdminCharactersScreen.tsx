import React, { forwardRef, useEffect, useImperativeHandle, useMemo, useState } from 'react';
import { FileUpload } from '../components/FileUpload';
import { Icons } from '../components/Icons';
import { PageHeader } from '../components/PageHeader';
import { TagInput } from '../components/TagInput';
import { Toast } from '../components/Toast';
import { CharacterAvatar } from '../components/CharacterAvatar';
import { Button } from '../design-system';
import { useToast } from '../hooks/useToast';
import { getCharacterImageUrl } from '../constants';
import { canEditCollections } from '../lib/auth';
import { api } from '../lib/api';
import { normalizeCharacterLookupKey, syncCollectionCharacters } from '../lib/characters';
import { Character, Collection, ScreenName } from '../types';

interface AdminCharactersScreenProps {
  onNavigate: (screen: ScreenName, params?: any) => void;
  onBack: () => void;
}

export interface AdminCharactersHandle {
  hasUnsavedChanges: () => boolean;
}

type CharacterFormData = Partial<Character> & {
  traits: string[];
  aliases: string[];
  image_url: string;
};

const EMPTY_CHARACTER_FORM: CharacterFormData = {
  name: '',
  description: '',
  traits: [],
  aliases: [],
  image_url: '',
  status: 'active',
};

const buildCharacterFormData = (character?: Character | null): CharacterFormData => ({
  id: character?.id,
  name: character?.name ?? '',
  description: character?.description ?? '',
  traits: [...(character?.traits || [])],
  aliases: [...(character?.aliases || [])],
  image_url: character?.image_url ?? '',
  status: character?.status ?? 'active',
});

const getCharacterUsageCount = (characterId: string, collections: Collection[]): number => {
  return collections.filter((collection) => (syncCollectionCharacters(collection).character_ids || []).includes(characterId)).length;
};

const getCharacterUsageTitles = (characterId: string, collections: Collection[]): string[] => {
  return collections
    .filter((collection) => (syncCollectionCharacters(collection).character_ids || []).includes(characterId))
    .map((collection) => collection.title);
};

export const AdminCharactersScreen = forwardRef<AdminCharactersHandle, AdminCharactersScreenProps>(({ onBack }, ref) => {
  const [characters, setCharacters] = useState<Character[]>([]);
  const [collections, setCollections] = useState<Collection[]>([]);
  const [loading, setLoading] = useState(true);
  const [checkingPermission, setCheckingPermission] = useState(true);
  const [hasPermission, setHasPermission] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [showCreateForm, setShowCreateForm] = useState(false);
  const [formData, setFormData] = useState<CharacterFormData>(EMPTY_CHARACTER_FORM);
  const [originalFormData, setOriginalFormData] = useState<CharacterFormData | null>(null);
  const [isSaving, setIsSaving] = useState(false);
  const [searchFilter, setSearchFilter] = useState('');
  const [statusFilter, setStatusFilter] = useState<'all' | 'active' | 'inactive'>('all');
  const { toast, showToast, hideToast } = useToast();

  const hasUnsavedChanges = (): boolean => {
    if (!originalFormData) {
      return false;
    }

    return JSON.stringify(formData) !== JSON.stringify(originalFormData);
  };

  useImperativeHandle(ref, () => ({
    hasUnsavedChanges,
  }));

  const loadData = async () => {
    setLoading(true);

    try {
      const [characterData, collectionData] = await Promise.all([
        api.getCharacters(),
        api.getCollections(true),
      ]);

      setCharacters(characterData);
      setCollections(collectionData);
    } catch (error) {
      console.error('Error loading characters:', error);
      showToast('Erro ao carregar personagens.', 'error');
    } finally {
      setLoading(false);
    }
  };

  const checkPermission = async () => {
    try {
      const canEdit = await canEditCollections();
      setHasPermission(canEdit);
    } catch (error) {
      console.error('Error checking character permissions:', error);
      setHasPermission(false);
    } finally {
      setCheckingPermission(false);
    }
  };

  useEffect(() => {
    checkPermission();
    loadData();
  }, []);

  const filteredCharacters = useMemo(() => {
    const normalizedSearch = normalizeCharacterLookupKey(searchFilter);

    return characters.filter((character) => {
      if (statusFilter !== 'all' && (character.status || 'active') !== statusFilter) {
        return false;
      }

      if (!normalizedSearch) {
        return true;
      }

      const searchContent = normalizeCharacterLookupKey([
        character.name,
        character.description,
        ...(character.aliases || []),
        ...(character.traits || []),
      ].join(' '));

      return searchContent.includes(normalizedSearch);
    });
  }, [characters, searchFilter, statusFilter]);

  const hasCharacters = characters.length > 0;
  const hasActiveCharacterFilters = Boolean(searchFilter.trim()) || statusFilter !== 'all';

  const resetForm = () => {
    setEditingId(null);
    setShowCreateForm(false);
    setFormData(buildCharacterFormData());
    setOriginalFormData(null);
  };

  const handleStartCreate = () => {
    if (hasUnsavedChanges() && !window.confirm('Você tem alterações não salvas. Deseja descartá-las?')) {
      return;
    }

    const nextFormData = buildCharacterFormData();
    setEditingId(null);
    setShowCreateForm(true);
    setFormData(nextFormData);
    setOriginalFormData(nextFormData);
  };

  const handleEditCharacter = (character: Character) => {
    if (hasUnsavedChanges() && !window.confirm('Você tem alterações não salvas. Deseja descartá-las?')) {
      return;
    }

    const nextFormData = buildCharacterFormData(character);
    setEditingId(character.id);
    setShowCreateForm(false);
    setFormData(nextFormData);
    setOriginalFormData(nextFormData);
  };

  const handleBackClick = () => {
    if (editingId || showCreateForm) {
      if (hasUnsavedChanges() && !window.confirm('Você tem alterações não salvas. Deseja sair sem salvar?')) {
        return;
      }

      resetForm();
      return;
    }

    onBack();
  };

  const handleSave = async () => {
    const trimmedName = formData.name.trim();
    if (!trimmedName) {
      showToast('Nome do personagem é obrigatório.', 'error');
      return;
    }

    const duplicatedCharacter = characters.find((character) => {
      if (character.id === editingId) {
        return false;
      }

      return normalizeCharacterLookupKey(character.name) === normalizeCharacterLookupKey(trimmedName);
    });

    if (duplicatedCharacter) {
      showToast('Já existe um personagem com esse nome.', 'error');
      return;
    }

    setIsSaving(true);

    const payload: Partial<Character> & { name: string } = {
      name: trimmedName,
      description: formData.description.trim(),
      traits: formData.traits,
      aliases: formData.aliases,
      image_url: formData.image_url.trim() || null,
      status: formData.status || 'active',
    };

    const result = editingId
      ? await api.updateCharacter(editingId, payload)
      : await api.createCharacter(payload);

    setIsSaving(false);

    if (!result) {
      showToast('Não foi possível salvar o personagem.', 'error');
      return;
    }

    showToast(editingId ? 'Personagem atualizado com sucesso!' : 'Personagem criado com sucesso!', 'success');
    resetForm();
    await loadData();
  };

  const handleToggleStatus = async (character: Character) => {
    const nextStatus = character.status === 'inactive' ? 'active' : 'inactive';
    const updatedCharacter = await api.updateCharacter(character.id, { status: nextStatus });

    if (!updatedCharacter) {
      showToast('Não foi possível atualizar o status do personagem.', 'error');
      return;
    }

    showToast(nextStatus === 'active' ? 'Personagem reativado.' : 'Personagem desativado.', 'success');
    await loadData();
  };

  const currentUsageCount = editingId ? getCharacterUsageCount(editingId, collections) : 0;
  const currentUsageTitles = editingId ? getCharacterUsageTitles(editingId, collections) : [];
  const previewImageUrl = formData.image_url.trim() || getCharacterImageUrl(formData.name || '');

  if (!checkingPermission && !hasPermission) {
    return (
      <div className="flex items-center justify-center h-screen">
        <div className="text-center p-8">
          <Icons.AlertCircle size={48} className="mx-auto mb-4 text-red-500" />
          <p className="text-gray-600 font-bold">Você não tem permissão para acessar esta página.</p>
        </div>
      </div>
    );
  }

  return (
    <div className="flex flex-col h-full bg-white pb-24 md:pb-0">
      <PageHeader title="Gerenciar" onBack={handleBackClick} />

      {loading ? (
        <div className="flex items-center justify-center h-64">
          <div className="w-8 h-8 border-4 border-brand-primary border-t-transparent rounded-full animate-spin"></div>
        </div>
      ) : editingId || showCreateForm ? (
        <div className="flex-1 overflow-y-auto px-6 md:px-8 pb-6 pt-0">
          <div className="max-w-2xl mx-auto space-y-6">
            <div className="rounded-3xl border border-gray-200 bg-gray-50 p-5 shadow-sm">
              <div className="flex flex-col md:flex-row md:items-center gap-4">
                <CharacterAvatar
                  name={formData.name || ''}
                  alt={formData.name || 'Personagem'}
                  className="h-24 w-24 shrink-0 rounded-3xl border border-white/80 shadow-sm"
                  imageClassName="absolute inset-0 w-full h-full object-cover"
                  initialClassName="absolute inset-0 flex items-center justify-center text-2xl font-black text-white/80"
                />

                <div className="min-w-0 flex-1">
                  <div className="flex flex-wrap items-center gap-2">
                    <h2 className="text-xl font-black text-gray-900">
                      {formData.name || 'Novo personagem'}
                    </h2>
                    <span className={`px-3 py-1 rounded-full text-xs font-bold ${(formData.status || 'active') === 'active' ? 'bg-emerald-100 text-emerald-700' : 'bg-gray-200 text-gray-600'}`}>
                      {(formData.status || 'active') === 'active' ? 'Ativo' : 'Inativo'}
                    </span>
                  </div>
                  <p className="text-sm text-gray-500 mt-2">
                    {formData.description || 'Cadastre a apresentação visual e editorial deste personagem.'}
                  </p>
                  {editingId && (
                    <p className="text-xs font-bold text-gray-500 mt-3">
                      Em uso em {currentUsageCount} {currentUsageCount === 1 ? 'coleção' : 'coleções'}.
                    </p>
                  )}
                </div>
              </div>
            </div>

            <div className="space-y-5 rounded-3xl border border-gray-200 bg-white p-5 shadow-sm">
              <div>
                <label className="block text-sm font-bold text-gray-700 mb-2">Nome</label>
                <input
                  type="text"
                  value={formData.name}
                  onChange={(event) => setFormData({ ...formData, name: event.target.value })}
                  className="w-full bg-gray-50 border-none rounded-2xl p-4 text-gray-800 focus:ring-2 focus:ring-brand-primary outline-none"
                  placeholder="Ex.: Nome do personagem"
                />
              </div>

              <div>
                <FileUpload
                  label="Foto do personagem"
                  value={formData.image_url}
                  onChange={(url) => setFormData({ ...formData, image_url: url })}
                  folder="characters"
                  accept="image/*"
                  collectionId={editingId || undefined}
                  hideUrlInput
                />
              </div>

              <div>
                <label className="block text-sm font-bold text-gray-700 mb-2">Descrição curta</label>
                <textarea
                  value={formData.description}
                  onChange={(event) => setFormData({ ...formData, description: event.target.value })}
                  rows={4}
                  className="w-full bg-gray-50 border-none rounded-2xl p-4 text-gray-800 focus:ring-2 focus:ring-brand-primary outline-none resize-none"
                  placeholder="Explique quem é esse personagem e como ele aparece nas histórias."
                />
              </div>

              <TagInput
                label="Traços"
                value={formData.traits}
                onChange={(traits) => setFormData({ ...formData, traits })}
                placeholder="Digite um traço e pressione Enter"
              />

              <TagInput
                label="Aliases legados"
                value={formData.aliases}
                onChange={(aliases) => setFormData({ ...formData, aliases })}
                placeholder="Ex.: Dr Ratazana"
              />

              <div>
                <label className="block text-sm font-bold text-gray-700 mb-2">Status</label>
                <div className="grid grid-cols-2 gap-3">
                  {(['active', 'inactive'] as const).map((status) => {
                    const isActive = (formData.status || 'active') === status;
                    return (
                      <button
                        key={status}
                        type="button"
                        onClick={() => setFormData({ ...formData, status })}
                        className={`h-14 rounded-2xl border font-bold transition-all active:scale-95 ${isActive
                          ? 'border-brand-primary bg-brand-primary/10 text-brand-primary'
                          : 'border-gray-200 bg-white text-gray-600 hover:bg-gray-50'
                          }`}
                      >
                        {status === 'active' ? 'Ativo' : 'Inativo'}
                      </button>
                    );
                  })}
                </div>
              </div>
            </div>

            {editingId && currentUsageTitles.length > 0 && (
              <div className="rounded-3xl border border-amber-200 bg-amber-50 p-5 shadow-sm">
                <h3 className="text-sm font-black text-amber-900 mb-3">Coleções vinculadas</h3>
                <div className="flex flex-wrap gap-2">
                  {currentUsageTitles.map((title) => (
                    <span key={title} className="px-3 py-1.5 rounded-full bg-white text-amber-800 text-xs font-bold border border-amber-200">
                      {title}
                    </span>
                  ))}
                </div>
              </div>
            )}

            <div className="flex flex-col-reverse md:flex-row gap-3 pb-4">
              <Button variant="ghost" fullWidth onClick={resetForm} disabled={isSaving}>
                Cancelar
              </Button>
              <Button variant="primary" fullWidth onClick={handleSave} disabled={isSaving}>
                {isSaving ? 'Salvando...' : editingId ? 'Salvar Alterações' : 'Criar Personagem'}
              </Button>
            </div>
          </div>
        </div>
      ) : (
        <div className="flex-1 overflow-y-auto px-6 md:px-8 pb-6 pt-0">
          <div className="max-w-5xl mx-auto space-y-4">
            {hasCharacters && (
              <div className="flex flex-col md:flex-row gap-3">
                <div className="flex-1 relative">
                  <Icons.Search size={18} className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-400" />
                  <input
                    type="text"
                    value={searchFilter}
                    onChange={(event) => setSearchFilter(event.target.value)}
                    className="w-full h-14 bg-gray-50 border-none rounded-2xl pl-12 pr-4 text-gray-800 focus:ring-2 focus:ring-brand-primary outline-none"
                    placeholder="Buscar personagem"
                  />
                </div>

                <div className="grid grid-cols-3 gap-2 md:w-[280px]">
                  {([
                    { id: 'all', label: 'Todos' },
                    { id: 'active', label: 'Ativos' },
                    { id: 'inactive', label: 'Inativos' },
                  ] as const).map((option) => {
                    const isActive = statusFilter === option.id;

                    return (
                      <button
                        key={option.id}
                        type="button"
                        onClick={() => setStatusFilter(option.id)}
                        className={`h-14 rounded-2xl border font-bold text-sm transition-all active:scale-95 ${isActive
                          ? 'border-brand-primary bg-brand-primary/10 text-brand-primary'
                          : 'border-gray-200 bg-white text-gray-600 hover:bg-gray-50'
                          }`}
                      >
                        {option.label}
                      </button>
                    );
                  })}
                </div>

                <Button variant="primary" onClick={handleStartCreate}>
                  <span className="inline-flex items-center gap-2">
                    <Icons.Plus size={18} />
                    <span>Novo Personagem</span>
                  </span>
                </Button>
              </div>
            )}

            {filteredCharacters.length === 0 ? (
              hasCharacters ? (
                <div className="rounded-3xl border border-dashed border-gray-200 bg-gray-50 p-10 text-center">
                  <Icons.Users size={40} className="mx-auto mb-4 text-gray-300" />
                  <p className="text-gray-600 font-bold">Nenhum personagem corresponde aos filtros.</p>
                  <p className="text-sm text-gray-500 mt-2">Ajuste ou limpe os filtros para continuar.</p>
                  {hasActiveCharacterFilters && (
                    <button
                      type="button"
                      onClick={() => {
                        setSearchFilter('');
                        setStatusFilter('all');
                      }}
                      className="mt-4 text-sm font-bold text-brand-primary hover:underline"
                    >
                      Limpar filtros
                    </button>
                  )}
                </div>
              ) : (
                <div className="rounded-3xl border border-dashed border-gray-200 bg-gray-50 p-10 text-center">
                  <Icons.Users size={40} className="mx-auto mb-4 text-gray-300" />
                  <p className="text-gray-600 font-bold">Nenhum personagem cadastrado.</p>
                  <p className="text-sm text-gray-500 mt-2">Cadastre o primeiro personagem para começar.</p>
                  <div className="mt-4 flex justify-center">
                    <Button variant="primary" onClick={handleStartCreate}>
                      <span className="inline-flex items-center gap-2">
                        <Icons.Plus size={18} />
                        <span>Novo Personagem</span>
                      </span>
                    </Button>
                  </div>
                </div>
              )
            ) : (
              <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
                {filteredCharacters.map((character) => {
                  const usageCount = getCharacterUsageCount(character.id, collections);
                  return (
                    <article key={character.id} className="rounded-3xl border border-gray-200 bg-white p-5 shadow-sm">
                      <div className="flex items-start gap-4">
                        <CharacterAvatar
                          name={character.name}
                          className="h-16 w-16 shrink-0 rounded-2xl border border-white/80 shadow-sm"
                          imageClassName="absolute inset-0 w-full h-full object-cover"
                          initialClassName="absolute inset-0 flex items-center justify-center text-lg font-black text-white/80"
                        />

                        <div className="min-w-0 flex-1">
                          <div className="flex flex-wrap items-center gap-2">
                            <h3 className="text-lg font-black text-gray-900 truncate">{character.name}</h3>
                            <span className={`px-2.5 py-1 rounded-full text-[11px] font-bold ${(character.status || 'active') === 'active' ? 'bg-emerald-100 text-emerald-700' : 'bg-gray-200 text-gray-600'}`}>
                              {(character.status || 'active') === 'active' ? 'Ativo' : 'Inativo'}
                            </span>
                          </div>
                          <p className="text-sm text-gray-500 mt-2 line-clamp-3">
                            {character.description || 'Sem descrição cadastrada.'}
                          </p>
                          <p className="text-xs font-bold text-gray-500 mt-3">
                            {usageCount} {usageCount === 1 ? 'coleção vinculada' : 'coleções vinculadas'}
                          </p>
                        </div>
                      </div>

                      {character.traits.length > 0 && (
                        <div className="flex flex-wrap gap-2 mt-4">
                          {character.traits.map((trait) => (
                            <span key={trait} className="px-2.5 py-1 rounded-full bg-gray-100 text-gray-600 text-xs font-bold">
                              {trait}
                            </span>
                          ))}
                        </div>
                      )}

                      <div className="flex gap-2 mt-5">
                        <Button variant="secondary" fullWidth onClick={() => handleEditCharacter(character)}>
                          <span className="inline-flex items-center justify-center gap-2">
                            <Icons.Edit size={16} />
                            <span>Editar</span>
                          </span>
                        </Button>
                        <Button variant="ghost" fullWidth onClick={() => handleToggleStatus(character)}>
                          {character.status === 'inactive' ? 'Reativar' : 'Desativar'}
                        </Button>
                      </div>
                    </article>
                  );
                })}
              </div>
            )}
          </div>
        </div>
      )}

      {toast && <Toast message={toast.message} type={toast.type} isVisible={toast.isVisible} onClose={hideToast} progress={toast.progress} />}
    </div>
  );
});