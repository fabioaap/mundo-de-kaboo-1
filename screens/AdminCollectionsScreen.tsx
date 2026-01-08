import React, { useState, useEffect } from 'react';
import { Icons } from '../components/Icons';
import { Collection, ScreenName } from '../types';
import { api } from '../lib/api';
import { canEditCollections, isAdmin } from '../lib/auth';
import { PageHeader } from '../components/PageHeader';
import { Button } from '../components/Button';
import { FileUpload } from '../components/FileUpload';
import { TagInput } from '../components/TagInput';
import { Tabs } from '../components/Tabs';
import { MultipleFileUpload } from '../components/MultipleFileUpload';
import { ConfirmationModal } from '../components/ConfirmationModal';
import { Toast } from '../components/Toast';
import { useToast } from '../hooks/useToast';
import { ColorPicker } from '../components/ColorPicker';

interface AdminCollectionsScreenProps {
  onNavigate: (screen: ScreenName, params?: any) => void;
  onBack: () => void;
}

export const AdminCollectionsScreen: React.FC<AdminCollectionsScreenProps> = ({ onNavigate, onBack }) => {
  const [collections, setCollections] = useState<Collection[]>([]);
  const [loading, setLoading] = useState(true);
  const [checkingPermission, setCheckingPermission] = useState(true);
  const [hasPermission, setHasPermission] = useState(false);
  const [isAdminUser, setIsAdminUser] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [showCreateForm, setShowCreateForm] = useState(false);
  const [activeTab, setActiveTab] = useState<'identification' | 'media'>('identification');
  const [originalFormData, setOriginalFormData] = useState<Partial<Collection> | null>(null);
  const [showUnsavedChangesModal, setShowUnsavedChangesModal] = useState(false);
  const [pendingAction, setPendingAction] = useState<(() => void) | null>(null);
  const { toast, showToast, hideToast } = useToast();
  const [formData, setFormData] = useState<Partial<Collection>>({
    title: '',
    description: '',
    level: 'Fundamental I',
    cover_image: '/assets/images/image-placeholder.png',
    pdf_url: '',
    audio_url: '',
    video_url: '',
    color_theme: '#5D1F58',
    theme: '',
    learning_objectives: '',
    characters: [],
    bncc_skills: [],
    casel_competencies: [],
    age_grade: [],
    extra_materials: []
  });

  useEffect(() => {
    checkPermission();
    loadCollections();
  }, []);

  const checkPermission = async () => {
    setCheckingPermission(true);
    const canEdit = await canEditCollections();
    const admin = await isAdmin();
    setHasPermission(canEdit);
    setIsAdminUser(admin);
    setCheckingPermission(false);
    
    if (!canEdit) {
      onBack();
    }
  };

  const loadCollections = async () => {
    setLoading(true);
    const data = await api.getCollections();
    setCollections(data);
    setLoading(false);
  };

  const handleEdit = (collection: Collection) => {
    const initialData = {
      title: collection.title || '',
      description: collection.description || '',
      level: collection.level || 'Fundamental I',
      cover_image: collection.cover_image || '/assets/images/image-placeholder.png',
      pdf_url: collection.pdf_url || '',
      audio_url: collection.audio_url || '',
      video_url: collection.video_url || '',
      color_theme: collection.color_theme || '#5D1F58',
      theme: collection.theme || '',
      learning_objectives: collection.learning_objectives || '',
      characters: collection.characters || [],
      bncc_skills: collection.bncc_skills || [],
      casel_competencies: collection.casel_competencies || [],
      age_grade: collection.age_grade || [],
      extra_materials: collection.extra_materials || []
    };
    setEditingId(collection.id);
    setActiveTab('identification');
    setFormData(initialData);
    setOriginalFormData(initialData);
  };

  const handleDelete = async (id: string) => {
    if (!isAdminUser) {
      alert('Apenas administradores podem excluir coleções.');
      return;
    }

    if (!confirm('Tem certeza que deseja excluir esta coleção?')) {
      return;
    }

    const success = await api.deleteCollection(id);
    if (success) {
      loadCollections();
    } else {
      alert('Erro ao excluir coleção.');
    }
  };

  const handleSave = async () => {
    if (!formData.title || !formData.description) {
      showToast('Título e descrição são obrigatórios.', 'error');
      return;
    }

    let success = false;
    let errorMessage = '';
    
    if (editingId) {
      // Updated collection data
      const updated = await api.updateCollection(editingId, formData);
      success = !!updated;
      if (!success) {
        errorMessage = 'Erro ao atualizar coleção. Verifique suas permissões e tente novamente.';
      }
    } else {
      // Creating new collection
      const created = await api.createCollection(formData);
      success = !!created;
      if (!success) {
        errorMessage = 'Erro ao criar coleção. Verifique suas permissões e tente novamente.';
      }
    }

    if (success) {
      // Update original form data to reflect saved state
      setOriginalFormData({ ...formData });
      showToast(editingId ? 'Coleção atualizada com sucesso!' : 'Coleção criada com sucesso!', 'success');
      setEditingId(null);
      setShowCreateForm(false);
      setActiveTab('identification');
      resetForm();
      loadCollections();
    } else {
      showToast(errorMessage || 'Erro ao salvar coleção. Tente novamente.', 'error');
    }
  };

  const hasUnsavedChanges = (): boolean => {
    if (!originalFormData) return false;
    
    return JSON.stringify(formData) !== JSON.stringify(originalFormData);
  };

  const resetForm = () => {
    setFormData({
      title: '',
      description: '',
      level: 'Fundamental I',
      cover_image: '/assets/images/image-placeholder.png',
      pdf_url: '',
      audio_url: '',
      video_url: '',
      color_theme: '#5D1F58',
      theme: '',
      learning_objectives: '',
      characters: [],
      bncc_skills: [],
      casel_competencies: [],
      age_grade: [],
      extra_materials: []
    });
    setOriginalFormData(null);
  };

  const handleCancel = () => {
    if (hasUnsavedChanges()) {
      setPendingAction(() => () => {
        setEditingId(null);
        setShowCreateForm(false);
        setActiveTab('identification');
        resetForm();
      });
      setShowUnsavedChangesModal(true);
    } else {
      setEditingId(null);
      setShowCreateForm(false);
      setActiveTab('identification');
      resetForm();
    }
  };

  const handleConfirmLeave = () => {
    if (pendingAction) {
      pendingAction();
      setPendingAction(null);
    }
    setShowUnsavedChangesModal(false);
  };

  const handleBackClick = () => {
    // If we're in edit/create mode, go back to the list view
    if (editingId || showCreateForm) {
      if (hasUnsavedChanges()) {
        setPendingAction(() => () => {
          setEditingId(null);
          setShowCreateForm(false);
          setActiveTab('identification');
          resetForm();
        });
        setShowUnsavedChangesModal(true);
      } else {
        setEditingId(null);
        setShowCreateForm(false);
        setActiveTab('identification');
        resetForm();
      }
    } else {
      // If we're already on the list view, go back to previous screen
      onBack();
    }
  };

  // Only show permission error if we've finished checking and user doesn't have permission
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
      <PageHeader 
        title="Gerenciar Coleções" 
        onBack={handleBackClick}
        rightContent={
          !editingId && !showCreateForm && (
            <button
              onClick={() => {
                if (hasUnsavedChanges()) {
                  setPendingAction(() => () => {
                    setShowCreateForm(true);
                    setOriginalFormData({
                      title: '',
                      description: '',
                      level: 'Fundamental I',
                      cover_image: '/assets/images/image-placeholder.png',
                      pdf_url: '',
                      audio_url: '',
                      video_url: '',
                      color_theme: '#5D1F58',
                      theme: '',
                      learning_objectives: '',
                      characters: [],
                      bncc_skills: [],
                      casel_competencies: [],
                      age_grade: [],
                      extra_materials: []
                    });
                  });
                  setShowUnsavedChangesModal(true);
                } else {
                  setShowCreateForm(true);
                  setOriginalFormData({
                    title: '',
                    description: '',
                    level: 'Fundamental I',
                    cover_image: '/assets/images/image-placeholder.png',
                    pdf_url: '',
                    audio_url: '',
                    video_url: '',
                    color_theme: '#5D1F58',
                    theme: '',
                    learning_objectives: '',
                    characters: [],
                    bncc_skills: [],
                    casel_competencies: [],
                    age_grade: [],
                    extra_materials: []
                  });
                }
              }}
              className="w-10 h-10 rounded-full bg-kaboo-primary text-white flex items-center justify-center hover:bg-opacity-90 transition-all active:scale-95"
            >
              <Icons.Plus size={24} />
            </button>
          )
        }
      />

      {loading ? (
        <div className="flex items-center justify-center h-64">
          <div className="w-8 h-8 border-4 border-kaboo-primary border-t-transparent rounded-full animate-spin"></div>
        </div>
      ) : editingId || showCreateForm ? (
        <div className="flex-1 overflow-y-auto px-6 py-6">
          <div className="max-w-2xl mx-auto">
            <Tabs
              tabs={[
                { id: 'identification', label: 'Dados da Coleção' },
                { id: 'media', label: 'Arquivos de Mídia' }
              ]}
              activeTab={activeTab}
              onChange={(tabId) => setActiveTab(tabId as any)}
            />

            <div className="space-y-6">
              {/* Tab: Dados da Coleção */}
              {activeTab === 'identification' && (
                <>
                  {/* Informações de Identificação Title */}
                  <div>
                    <h3 className="text-lg font-bold text-gray-800 mb-4">Informações de Identificação</h3>
                  </div>

                  {/* 1.3. Título */}
                  <div>
                    <label className="block text-sm font-bold text-gray-700 mb-2">Título *</label>
                    <input
                      type="text"
                      value={formData.title}
                      onChange={(e) => setFormData({ ...formData, title: e.target.value })}
                      className="w-full bg-gray-50 border-none rounded-2xl p-4 text-gray-800 focus:ring-2 focus:ring-kaboo-primary outline-none"
                      placeholder="Título da coleção"
                    />
                  </div>

                  {/* 1.5. Descrição */}
                  <div>
                    <label className="block text-sm font-bold text-gray-700 mb-2">Descrição *</label>
                    <textarea
                      value={formData.description}
                      onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                      className="w-full bg-gray-50 border-none rounded-2xl p-4 text-gray-800 focus:ring-2 focus:ring-kaboo-primary outline-none min-h-[120px]"
                      placeholder="Descrição da coleção"
                    />
                  </div>

                  {/* 1.1. Imagem de Capa and 1.2. Cor da Coleção in same row */}
                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <FileUpload
                        label="Imagem de Capa"
                        value={formData.cover_image || '/assets/images/image-placeholder.png'}
                        onChange={(url) => setFormData({ ...formData, cover_image: url })}
                        folder="covers"
                        accept="image/*"
                        collectionId={editingId || undefined}
                        hideUrlInput={true}
                      />
                    </div>

                    <div>
                      <ColorPicker
                        label="Cor da Coleção"
                        value={formData.color_theme || '#5D1F58'}
                        onChange={(color) => setFormData({ ...formData, color_theme: color })}
                      />
                    </div>
                  </div>

                  {/* 1.10. Personagens */}
                  <div>
                    <TagInput
                      label="Personagens"
                      value={formData.characters || []}
                      onChange={(tags) => setFormData({ ...formData, characters: tags })}
                      placeholder="Digite um personagem e pressione Enter"
                    />
                  </div>

                  {/* Separation line */}
                  <div className="border-t border-gray-200 my-6"></div>

                  {/* Informações Pedagógicas Title */}
                  <div>
                    <h3 className="text-lg font-bold text-gray-800 mb-4">Informações Pedagógicas</h3>
                  </div>

                  {/* 1.4. Nível */}
                  <div>
                    <label className="block text-sm font-bold text-gray-700 mb-2">Nível</label>
                    <select
                      value={formData.level}
                      onChange={(e) => setFormData({ ...formData, level: e.target.value as 'Fundamental I' | 'Fundamental II' })}
                      className="w-full bg-gray-50 border-none rounded-2xl p-4 text-gray-800 focus:ring-2 focus:ring-kaboo-primary outline-none"
                    >
                      <option value="Fundamental I">Fundamental I</option>
                      <option value="Fundamental II">Fundamental II</option>
                    </select>
                  </div>

                  {/* Ano Escolar */}
                  <div>
                    <TagInput
                      label="Ano Escolar"
                      value={formData.age_grade || []}
                      onChange={(tags) => setFormData({ ...formData, age_grade: tags })}
                      placeholder="Digite um ano escolar e pressione Enter"
                    />
                  </div>

                  {/* 1.6. Tema */}
                  <div>
                    <label className="block text-sm font-bold text-gray-700 mb-2">Tema</label>
                    <input
                      type="text"
                      value={formData.theme}
                      onChange={(e) => setFormData({ ...formData, theme: e.target.value })}
                      className="w-full bg-gray-50 border-none rounded-2xl p-4 text-gray-800 focus:ring-2 focus:ring-kaboo-primary outline-none"
                      placeholder="Tema da coleção"
                    />
                  </div>

                  {/* 1.7. Objetivos de Aprendizado */}
                  <div>
                    <label className="block text-sm font-bold text-gray-700 mb-2">Objetivos de Aprendizado</label>
                    <textarea
                      value={formData.learning_objectives}
                      onChange={(e) => setFormData({ ...formData, learning_objectives: e.target.value })}
                      className="w-full bg-gray-50 border-none rounded-2xl p-4 text-gray-800 focus:ring-2 focus:ring-kaboo-primary outline-none min-h-[100px]"
                      placeholder="Objetivos de aprendizado..."
                    />
                  </div>

                  {/* 1.8. Habilidades BNCC */}
                  <div>
                    <TagInput
                      label="Habilidades BNCC"
                      value={formData.bncc_skills || []}
                      onChange={(tags) => setFormData({ ...formData, bncc_skills: tags })}
                      placeholder="Digite uma habilidade BNCC e pressione Enter"
                    />
                  </div>

                  {/* 1.9. Competências Casel */}
                  <div>
                    <TagInput
                      label="Competências Casel"
                      value={formData.casel_competencies || []}
                      onChange={(tags) => setFormData({ ...formData, casel_competencies: tags })}
                      placeholder="Digite uma competência Casel e pressione Enter"
                    />
                  </div>
                </>
              )}

              {/* Tab: Arquivos de Mídia */}
              {activeTab === 'media' && (
                <>
                  <div>
                    <h3 className="text-lg font-bold text-gray-800 mb-4">Arquivos de Mídia</h3>
                  </div>

                  <div className="grid grid-cols-2 gap-4">
                    {/* 2.1. PDF do Livro */}
                    <div>
                      <FileUpload
                        label="PDF do Livro"
                        value={formData.pdf_url || ''}
                        onChange={(url) => setFormData({ ...formData, pdf_url: url })}
                        folder="pdfs"
                        accept="application/pdf"
                        collectionId={editingId || undefined}
                        showAsIcon={true}
                      />
                    </div>

                    {/* 2.2. Áudio */}
                    <div>
                      <FileUpload
                        label="Áudio"
                        value={formData.audio_url || ''}
                        onChange={(url) => setFormData({ ...formData, audio_url: url })}
                        folder="audio"
                        accept="audio/*"
                        collectionId={editingId || undefined}
                        showAsIcon={true}
                      />
                    </div>
                  </div>

                  {/* 2.3. Vídeo - Full width with icon card style */}
                  <div>
                    <FileUpload
                      label="Vídeo"
                      value={formData.video_url || ''}
                      onChange={(url) => setFormData({ ...formData, video_url: url })}
                      folder="video"
                      accept="video/*"
                      collectionId={editingId || undefined}
                      showAsIcon={true}
                    />
                  </div>

                  {/* 2.4. Materiais Extras - Full width */}
                  <div>
                    <MultipleFileUpload
                      label="Materiais Extras"
                      value={formData.extra_materials || []}
                      onChange={(urls) => setFormData({ ...formData, extra_materials: urls })}
                      folder="extras"
                      accept="*/*"
                      collectionId={editingId || undefined}
                    />
                  </div>
                </>
              )}

              {/* Action Buttons */}
              <div className="flex gap-4 pt-4 border-t border-gray-200">
                <Button variant="secondary" fullWidth onClick={handleCancel}>
                  Cancelar
                </Button>
                <Button variant="primary" fullWidth onClick={handleSave}>
                  {editingId ? 'Salvar Alterações' : 'Criar Coleção'}
                </Button>
              </div>
            </div>
          </div>
        </div>
      ) : (
        <div className="flex-1 overflow-y-auto px-6 py-6">
          {collections.length === 0 ? (
            <div className="text-center py-12">
              <Icons.BookOpen size={48} className="mx-auto mb-4 text-gray-300" />
              <p className="text-gray-500 font-bold">Nenhuma coleção encontrada.</p>
            </div>
          ) : (
            <div className="space-y-4 max-w-4xl mx-auto">
              {collections.map((collection) => (
                <div
                  key={collection.id}
                  className="bg-white border border-gray-200 rounded-2xl p-6 shadow-sm hover:shadow-md transition-shadow"
                >
                  <div className="flex items-start gap-4">
                    {collection.cover_image && (
                      <img
                        src={collection.cover_image}
                        alt={collection.title}
                        className="w-24 h-24 object-cover rounded-xl"
                      />
                    )}
                    <div className="flex-1">
                      <h3 className="font-bold text-lg text-gray-800 mb-1">{collection.title}</h3>
                      <p className="text-sm text-gray-600 mb-2 line-clamp-2">{collection.description}</p>
                      <div className="flex items-center gap-2 text-xs text-gray-500 mb-3">
                        <span className="bg-gray-100 px-2 py-1 rounded-full">{collection.level}</span>
                        {collection.theme && (
                          <span className="bg-gray-100 px-2 py-1 rounded-full">{collection.theme}</span>
                        )}
                      </div>
                      <div className="flex items-center gap-2">
                        <button
                          onClick={() => {
                            if (hasUnsavedChanges()) {
                              setPendingAction(() => () => {
                                const initialData = {
                                  title: collection.title || '',
                                  description: collection.description || '',
                                  level: collection.level || 'Fundamental I',
                                  cover_image: collection.cover_image || '',
                                  pdf_url: collection.pdf_url || '',
                                  audio_url: collection.audio_url || '',
                                  video_url: collection.video_url || '',
                                  color_theme: collection.color_theme || '#5D1F58',
                                  theme: collection.theme || '',
                                  learning_objectives: collection.learning_objectives || '',
                                  characters: collection.characters || [],
                                  bncc_skills: collection.bncc_skills || [],
                                  casel_competencies: collection.casel_competencies || [],
                                  age_grade: collection.age_grade || [],
                                  extra_materials: collection.extra_materials || []
                                };
                                setEditingId(collection.id);
                                setActiveTab('identification');
                                setFormData(initialData);
                                setOriginalFormData(initialData);
                              });
                              setShowUnsavedChangesModal(true);
                            } else {
                              handleEdit(collection);
                            }
                          }}
                          className="px-4 py-2 bg-kaboo-primary/10 text-kaboo-primary rounded-xl font-bold text-sm hover:bg-kaboo-primary/20 transition-colors"
                        >
                          <Icons.Edit size={16} className="inline mr-1" />
                          Editar
                        </button>
                        {isAdminUser && (
                          <button
                            onClick={() => handleDelete(collection.id)}
                            className="px-4 py-2 bg-red-50 text-red-500 rounded-xl font-bold text-sm hover:bg-red-100 transition-colors"
                          >
                            <Icons.Trash2 size={16} className="inline mr-1" />
                            Excluir
                          </button>
                        )}
                      </div>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {/* Toast Notification */}
      <Toast
        message={toast.message}
        type={toast.type}
        isVisible={toast.isVisible}
        onClose={hideToast}
      />

      {/* Unsaved Changes Modal */}
      <ConfirmationModal
        isOpen={showUnsavedChangesModal}
        title="Alterações não salvas"
        message="Deseja salvar suas alterações antes de sair?"
        confirmText="Salvar e Sair"
        cancelText="Descartar Alterações"
        onConfirm={async () => {
          // Save first, then execute pending action
          if (!formData.title || !formData.description) {
            alert('Título e descrição são obrigatórios para salvar.');
            setShowUnsavedChangesModal(false);
            return;
          }

          let success = false;
          
          if (editingId) {
            const updated = await api.updateCollection(editingId, formData);
            success = !!updated;
          } else {
            const created = await api.createCollection(formData);
            success = !!created;
          }

          if (success) {
            setShowUnsavedChangesModal(false);
            // Update original to reflect saved state
            setOriginalFormData({ ...formData });
            // Execute pending action (navigate away, etc.)
            if (pendingAction) {
              pendingAction();
              setPendingAction(null);
            }
            // Reset form and reload
            resetForm();
            loadCollections();
          } else {
            alert('Erro ao salvar. As alterações não foram salvas.');
            setShowUnsavedChangesModal(false);
          }
        }}
        onCancel={() => {
          setShowUnsavedChangesModal(false);
          // Execute pending action without saving
          if (pendingAction) {
            pendingAction();
            setPendingAction(null);
          }
        }}
      />
    </div>
  );
};
