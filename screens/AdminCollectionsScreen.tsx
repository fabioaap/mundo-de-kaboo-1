import React, { useState, useEffect, useRef } from 'react';
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
import useIsMobile from '../hooks/useIsMobile';

interface AdminCollectionsScreenProps {
  onNavigate: (screen: ScreenName, params?: any) => void;
  onBack: () => void;
}

// Componente interno para card com efeito 3D
const Card3DCover: React.FC<{ 
  imageUrl: string; 
  alt: string; 
  level?: string;
  actionsButton?: React.ReactNode;
}> = ({ imageUrl, alt, level, actionsButton }) => {
  const [tilt, setTilt] = useState({ x: 0, y: 0 });
  const cardRef = useRef<HTMLDivElement>(null);
  const isMobile = useIsMobile();

  const handleMouseMove = (e: React.MouseEvent<HTMLDivElement>) => {
    if (isMobile || !cardRef.current) return;

    const rect = cardRef.current.getBoundingClientRect();
    const centerX = rect.left + rect.width / 2;
    const centerY = rect.top + rect.height / 2;
    
    const mouseX = e.clientX - centerX;
    const mouseY = e.clientY - centerY;
    
    const rotateX = (mouseY / (rect.height / 2)) * -8;
    const rotateY = (mouseX / (rect.width / 2)) * 8;
    
    setTilt({ x: rotateX, y: rotateY });
  };

  const handleMouseLeave = () => {
    if (!isMobile) {
      setTilt({ x: 0, y: 0 });
    }
  };

  return (
    <div className="aspect-square mb-3 relative">
      <div 
        ref={cardRef}
        className="w-full h-full rounded-lg overflow-hidden relative group shadow-md shadow-gray-100"
        style={{ 
          WebkitMaskImage: '-webkit-radial-gradient(white, black)',
          transform: `perspective(1000px) rotateX(${tilt.x}deg) rotateY(${tilt.y}deg) scale3d(1, 1, 1)`,
          transformStyle: 'preserve-3d',
          transition: isMobile 
            ? 'transform 0.1s ease-out' 
            : (tilt.x === 0 && tilt.y === 0 ? 'transform 0.5s ease-out' : 'transform 0.1s ease-out'),
          touchAction: 'manipulation',
        }}
        onMouseMove={!isMobile ? handleMouseMove : undefined}
        onMouseLeave={!isMobile ? handleMouseLeave : undefined}
      >
        <img 
          src={imageUrl} 
          alt={alt} 
          className="w-full h-full object-cover bg-gray-200" 
          style={{
            transform: 'translateZ(20px)',
          }}
        />
        {/* Light reflection effect */}
        <div 
          className="absolute inset-0 pointer-events-none"
          style={{
            background: `linear-gradient(${
              135 + (tilt.y * 2)
            }deg, 
              transparent 0%, 
              rgba(255, 255, 255, 0.3) ${50 + (tilt.x * 0.5) + (tilt.y * 0.5)}%, 
              transparent 100%
            )`,
            transform: `translateZ(25px) translateX(${tilt.y * 2}px) translateY(${tilt.x * 2}px)`,
            transition: 'background 0.1s ease-out, transform 0.1s ease-out',
            mixBlendMode: 'overlay',
          }}
        />
        {/* Secondary light reflection */}
        <div 
          className="absolute inset-0 pointer-events-none"
          style={{
            background: `radial-gradient(ellipse at ${50 + (tilt.y * 1.5)}% ${50 + (tilt.x * 1.5)}%, 
              rgba(255, 255, 255, 0.4) 0%, 
              transparent 60%
            )`,
            transform: 'translateZ(30px)',
            transition: 'background 0.1s ease-out',
            mixBlendMode: 'soft-light',
          }}
        />
        {level && (
          <div 
            className="absolute bottom-2 right-2 px-2 py-1 bg-white/95 backdrop-blur-sm rounded-lg text-[10px] font-bold text-kaboo-primary shadow-sm border border-white/50"
            style={{
              transform: 'translateZ(30px)',
            }}
          >
            {level.replace('Fundamental ', 'Fund. ')}
          </div>
        )}
      </div>
      {actionsButton && (
        <div 
          className="absolute top-2 right-2 z-10"
          onClick={(e) => e.stopPropagation()}
        >
          {actionsButton}
        </div>
      )}
    </div>
  );
};

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
  const [searchFilter, setSearchFilter] = useState('');
  const [levelFilter, setLevelFilter] = useState<'all' | 'Fundamental I' | 'Fundamental II'>('all');
  const [sortOrder, setSortOrder] = useState<'asc' | 'desc' | null>(null);
  const [showSortDropdown, setShowSortDropdown] = useState(false);
  const [showLevelDropdown, setShowLevelDropdown] = useState(false);
  const [showFormLevelDropdown, setShowFormLevelDropdown] = useState(false);
  const [showDeleteModal, setShowDeleteModal] = useState(false);
  const [collectionToDelete, setCollectionToDelete] = useState<string | null>(null);
  const [openActionsDropdown, setOpenActionsDropdown] = useState<string | null>(null);
  const [showHeaderActionsDropdown, setShowHeaderActionsDropdown] = useState(false);
  const headerActionsRef = useRef<HTMLDivElement>(null);
  const sortDropdownRef = useRef<HTMLDivElement>(null);
  const levelDropdownRef = useRef<HTMLDivElement>(null);
  const formLevelDropdownRef = useRef<HTMLDivElement>(null);
  const actionsDropdownRefs = useRef<{ [key: string]: HTMLDivElement | null }>({});
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

  // Close dropdowns when clicking outside
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (sortDropdownRef.current && !sortDropdownRef.current.contains(event.target as Node)) {
        setShowSortDropdown(false);
      }
      if (levelDropdownRef.current && !levelDropdownRef.current.contains(event.target as Node)) {
        setShowLevelDropdown(false);
      }
      if (formLevelDropdownRef.current && !formLevelDropdownRef.current.contains(event.target as Node)) {
        setShowFormLevelDropdown(false);
      }
      if (headerActionsRef.current && !headerActionsRef.current.contains(event.target as Node)) {
        setShowHeaderActionsDropdown(false);
      }
      
      // Close actions dropdowns
      Object.keys(actionsDropdownRefs.current).forEach(key => {
        const ref = actionsDropdownRefs.current[key];
        if (ref && !ref.contains(event.target as Node)) {
          setOpenActionsDropdown(null);
        }
      });
    };

    if (showSortDropdown || showLevelDropdown || showFormLevelDropdown || openActionsDropdown || showHeaderActionsDropdown) {
      document.addEventListener('mousedown', handleClickOutside);
    }

    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, [showSortDropdown, showLevelDropdown, showFormLevelDropdown, openActionsDropdown, showHeaderActionsDropdown]);

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

  const handleDeleteClick = (id: string) => {
    if (!isAdminUser) {
      showToast('Apenas administradores podem excluir coleções.', 'error');
      return;
    }
    setCollectionToDelete(id);
    setShowDeleteModal(true);
    setOpenActionsDropdown(null);
  };

  const handleDeleteConfirm = async () => {
    if (!collectionToDelete) return;

    const success = await api.deleteCollection(collectionToDelete);
    if (success) {
      showToast('Coleção excluída com sucesso!', 'success');
      loadCollections();
    } else {
      showToast('Erro ao excluir coleção.', 'error');
    }
    setShowDeleteModal(false);
    setCollectionToDelete(null);
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

  const getFilteredAndSortedCollections = (): Collection[] => {
    let filtered = [...collections];

    // Apply search filter
    if (searchFilter.trim()) {
      const searchLower = searchFilter.toLowerCase();
      filtered = filtered.filter(collection => 
        collection.title?.toLowerCase().includes(searchLower) ||
        collection.description?.toLowerCase().includes(searchLower) ||
        collection.theme?.toLowerCase().includes(searchLower)
      );
    }

    // Apply level filter
    if (levelFilter !== 'all') {
      filtered = filtered.filter(collection => collection.level === levelFilter);
    }

    // Apply alphabetical sorting
    if (sortOrder) {
      filtered.sort((a, b) => {
        const titleA = (a.title || '').toLowerCase();
        const titleB = (b.title || '').toLowerCase();
        const comparison = titleA.localeCompare(titleB, 'pt-BR');
        return sortOrder === 'asc' ? comparison : -comparison;
      });
    }

    return filtered;
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
          <div className="flex items-center gap-2">
            {editingId && (
              <div className="relative" ref={headerActionsRef}>
                <button
                  onClick={() => setShowHeaderActionsDropdown(!showHeaderActionsDropdown)}
                  className="w-10 h-10 rounded-full bg-gray-50 hover:bg-gray-100 border border-gray-200 flex items-center justify-center transition-all active:scale-95"
                >
                  <Icons.MoreHorizontal size={20} className="text-gray-600" />
                </button>

                {showHeaderActionsDropdown && (
                  <div className="absolute top-full right-0 mt-2 w-48 bg-white rounded-2xl shadow-xl border border-gray-100 z-50 animate-fade-in-up origin-top-right">
                    {isAdminUser && (
                      <button
                        onClick={() => {
                          if (editingId) {
                            handleDeleteClick(editingId);
                            setShowHeaderActionsDropdown(false);
                          }
                        }}
                        className="w-full px-4 py-3 text-left flex items-center gap-3 transition-colors first:rounded-t-2xl text-red-500 hover:bg-red-50 font-medium"
                      >
                        <Icons.Trash2 size={18} />
                        <span>Excluir Coleção</span>
                      </button>
                    )}
                  </div>
                )}
              </div>
            )}
            {!editingId && !showCreateForm && (
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
            )}
          </div>
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
                    <div className="relative" ref={formLevelDropdownRef}>
                      <button
                        onClick={() => setShowFormLevelDropdown(!showFormLevelDropdown)}
                        className="w-full h-14 bg-white border border-gray-200 rounded-2xl px-4 flex items-center justify-between transition-all active:scale-95 shadow-sm font-bold text-sm text-gray-800 hover:bg-gray-50"
                      >
                        <span>{formData.level}</span>
                        <Icons.ChevronDown size={16} className={`transition-transform flex-shrink-0 ${showFormLevelDropdown ? 'rotate-180' : ''}`} />
                      </button>

                      {showFormLevelDropdown && (
                        <div className="absolute top-full left-0 right-0 mt-2 bg-white rounded-2xl shadow-xl border border-gray-100 z-50 animate-fade-in-up origin-top">
                          <button
                            onClick={() => {
                              setFormData({ ...formData, level: 'Fundamental I' });
                              setShowFormLevelDropdown(false);
                            }}
                            className={`w-full px-4 py-3 text-left flex items-center gap-3 transition-colors first:rounded-t-2xl ${
                              formData.level === 'Fundamental I'
                                ? 'bg-kaboo-primary/10 text-kaboo-primary font-bold'
                                : 'text-gray-700 hover:bg-gray-50 font-medium'
                            }`}
                          >
                            <span>Fundamental I</span>
                            {formData.level === 'Fundamental I' && <Icons.Check size={18} className="ml-auto" />}
                          </button>
                          <button
                            onClick={() => {
                              setFormData({ ...formData, level: 'Fundamental II' });
                              setShowFormLevelDropdown(false);
                            }}
                            className={`w-full px-4 py-3 text-left flex items-center gap-3 transition-colors last:rounded-b-2xl ${
                              formData.level === 'Fundamental II'
                                ? 'bg-kaboo-primary/10 text-kaboo-primary font-bold'
                                : 'text-gray-700 hover:bg-gray-50 font-medium'
                            }`}
                          >
                            <span>Fundamental II</span>
                            {formData.level === 'Fundamental II' && <Icons.Check size={18} className="ml-auto" />}
                          </button>
                        </div>
                      )}
                    </div>
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
              {/* Filtros e Ordenação */}
              <div className="flex flex-col md:flex-row gap-3">
                {/* Campo de Busca */}
                <div className="flex-1">
                  <div className="relative">
                    <Icons.Search size={20} className="absolute left-4 top-1/2 transform -translate-y-1/2 text-gray-400" />
                    <input
                      type="text"
                      value={searchFilter}
                      onChange={(e) => setSearchFilter(e.target.value)}
                      placeholder="Buscar por título, descrição ou tema..."
                      className="w-full bg-gray-100 border-none rounded-2xl pl-12 pr-4 py-3 text-gray-800 placeholder-gray-400 focus:ring-2 focus:ring-kaboo-primary outline-none transition-all font-medium"
                    />
                  </div>
                </div>

                {/* Filtro de Nível com Dropdown */}
                <div className="md:w-48 relative" ref={levelDropdownRef}>
                  <button
                    onClick={() => setShowLevelDropdown(!showLevelDropdown)}
                    className={`h-11 px-4 rounded-2xl flex items-center gap-2 border transition-all active:scale-95 shadow-sm font-bold text-sm w-full justify-between ${
                      levelFilter !== 'all'
                        ? 'bg-kaboo-primary text-white border-kaboo-primary shadow-kaboo-primary/20'
                        : 'bg-white text-gray-600 border-gray-200 hover:bg-gray-50'
                    }`}
                  >
                    <span className="truncate">
                      {levelFilter === 'all' ? 'Todos os níveis' : levelFilter}
                    </span>
                    <Icons.ChevronDown size={16} className={`transition-transform flex-shrink-0 ${showLevelDropdown ? 'rotate-180' : ''}`} />
                  </button>

                  {showLevelDropdown && (
                    <div className="absolute top-full right-0 mt-2 w-full bg-white rounded-2xl shadow-xl border border-gray-100 z-50 animate-fade-in-up origin-top-right">
                      <button
                        onClick={() => {
                          setLevelFilter('all');
                          setShowLevelDropdown(false);
                        }}
                        className={`w-full px-4 py-3 text-left flex items-center gap-3 transition-colors first:rounded-t-2xl ${
                          levelFilter === 'all'
                            ? 'bg-kaboo-primary/10 text-kaboo-primary font-bold'
                            : 'text-gray-700 hover:bg-gray-50 font-medium'
                        }`}
                      >
                        <span>Todos os níveis</span>
                        {levelFilter === 'all' && <Icons.Check size={18} className="ml-auto" />}
                      </button>
                      <button
                        onClick={() => {
                          setLevelFilter('Fundamental I');
                          setShowLevelDropdown(false);
                        }}
                        className={`w-full px-4 py-3 text-left flex items-center gap-3 transition-colors ${
                          levelFilter === 'Fundamental I'
                            ? 'bg-kaboo-primary/10 text-kaboo-primary font-bold'
                            : 'text-gray-700 hover:bg-gray-50 font-medium'
                        }`}
                      >
                        <span>Fundamental I</span>
                        {levelFilter === 'Fundamental I' && <Icons.Check size={18} className="ml-auto" />}
                      </button>
                      <button
                        onClick={() => {
                          setLevelFilter('Fundamental II');
                          setShowLevelDropdown(false);
                        }}
                        className={`w-full px-4 py-3 text-left flex items-center gap-3 transition-colors last:rounded-b-2xl ${
                          levelFilter === 'Fundamental II'
                            ? 'bg-kaboo-primary/10 text-kaboo-primary font-bold'
                            : 'text-gray-700 hover:bg-gray-50 font-medium'
                        }`}
                      >
                        <span>Fundamental II</span>
                        {levelFilter === 'Fundamental II' && <Icons.Check size={18} className="ml-auto" />}
                      </button>
                    </div>
                  )}
                </div>

                {/* Botão de Ordenação com Dropdown */}
                <div className="relative" ref={sortDropdownRef}>
                  <div className="flex items-center gap-2">
                    <button
                      onClick={() => setShowSortDropdown(!showSortDropdown)}
                      className={`h-11 px-4 rounded-2xl flex items-center gap-2 border transition-all active:scale-95 shadow-sm font-bold text-sm ${
                        sortOrder
                          ? 'bg-kaboo-primary text-white border-kaboo-primary shadow-kaboo-primary/20'
                          : 'bg-white text-gray-600 border-gray-200 hover:bg-gray-50'
                      }`}
                    >
                      {sortOrder === 'asc' ? (
                        <>
                          <span className="hidden md:inline-block">A - Z</span>
                        </>
                      ) : sortOrder === 'desc' ? (
                        <>
                          <span className="hidden md:inline-block">Z - A</span>
                        </>
                      ) : (
                        <>
                          <Icons.ArrowUpDown size={18} />
                          <span>Ordenar</span>
                        </>
                      )}
                      <Icons.ChevronDown size={16} className={`transition-transform flex-shrink-0 ${showSortDropdown ? 'rotate-180' : ''}`} />
                    </button>
                    {sortOrder && (
                      <button
                        onClick={() => setSortOrder(null)}
                        className="h-11 w-11 rounded-2xl flex items-center justify-center border border-kaboo-primary bg-kaboo-primary text-white hover:bg-opacity-90 transition-all active:scale-95 shadow-sm shadow-kaboo-primary/20"
                        title="Remover ordenação"
                      >
                        <Icons.X size={18} />
                      </button>
                    )}
                  </div>

                  {showSortDropdown && (
                    <div className="absolute top-full right-0 mt-2 w-56 bg-white rounded-2xl shadow-xl border border-gray-100 z-50 animate-fade-in-up origin-top-right">
                      <button
                        onClick={() => {
                          setSortOrder('asc');
                          setShowSortDropdown(false);
                        }}
                        className={`w-full px-4 py-3 text-left flex items-center gap-3 transition-colors first:rounded-t-2xl ${
                          sortOrder === 'asc'
                            ? 'bg-kaboo-primary/10 text-kaboo-primary font-bold'
                            : 'text-gray-700 hover:bg-gray-50 font-medium'
                        }`}
                      >
                        <Icons.ArrowDown size={18} />
                        <span>Crescente (A - Z)</span>
                        {sortOrder === 'asc' && <Icons.Check size={18} className="ml-auto" />}
                      </button>
                      <button
                        onClick={() => {
                          setSortOrder('desc');
                          setShowSortDropdown(false);
                        }}
                        className={`w-full px-4 py-3 text-left flex items-center gap-3 transition-colors last:rounded-b-2xl ${
                          sortOrder === 'desc'
                            ? 'bg-kaboo-primary/10 text-kaboo-primary font-bold'
                            : 'text-gray-700 hover:bg-gray-50 font-medium'
                        }`}
                      >
                        <Icons.ArrowUp size={18} />
                        <span>Decrescente (Z - A)</span>
                        {sortOrder === 'desc' && <Icons.Check size={18} className="ml-auto" />}
                      </button>
                    </div>
                  )}
                </div>
              </div>

              {/* Lista de Coleções */}
              {getFilteredAndSortedCollections().length === 0 ? (
                <div className="text-center py-12">
                  <Icons.BookOpen size={48} className="mx-auto mb-4 text-gray-300" />
                  <p className="text-gray-500 font-bold">Nenhuma coleção encontrada com os filtros aplicados.</p>
                </div>
              ) : (
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                  {getFilteredAndSortedCollections().map((collection) => {
                    const actionsButton = (
                      <div 
                        className="actions-button"
                        ref={(el) => {
                          actionsDropdownRefs.current[collection.id] = el;
                        }}
                      >
                        <button
                          onClick={(e) => {
                            e.stopPropagation();
                            setOpenActionsDropdown(openActionsDropdown === collection.id ? null : collection.id);
                          }}
                          className="w-8 h-8 rounded-full bg-white/90 hover:bg-white border border-gray-200 flex items-center justify-center transition-all shadow-sm hover:shadow-md"
                        >
                          <Icons.MoreHorizontal size={18} className="text-gray-600" />
                        </button>

                        {openActionsDropdown === collection.id && (
                          <div className="absolute top-full right-0 mt-2 w-48 bg-white rounded-2xl shadow-xl border border-gray-100 z-50 animate-fade-in-up origin-top-right actions-dropdown">
                            {isAdminUser && (
                              <button
                                onClick={() => handleDeleteClick(collection.id)}
                                className="w-full px-4 py-3 text-left flex items-center gap-3 transition-colors first:rounded-t-2xl text-red-500 hover:bg-red-50 font-medium"
                              >
                                <Icons.Trash2 size={18} />
                                <span>Excluir</span>
                              </button>
                            )}
                          </div>
                        )}
                      </div>
                    );

                    return (
                      <div
                        key={collection.id}
                        className="cursor-pointer active:scale-95 transition-transform touch-manipulation"
                        style={{ touchAction: 'manipulation' }}
                        onClick={(e) => {
                          // Não abrir edição se clicar no botão de ações
                          if ((e.target as HTMLElement).closest('.actions-button') || (e.target as HTMLElement).closest('.actions-dropdown')) {
                            return;
                          }
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
                      >
                        {collection.cover_image && (
                          <Card3DCover
                            imageUrl={collection.cover_image}
                            alt={collection.title}
                            level={collection.level}
                            actionsButton={actionsButton}
                          />
                        )}
                        
                        {collection.title && (
                          <h3 className="font-bold text-gray-800 text-sm leading-tight mb-1 line-clamp-2 mt-3">
                            {collection.title}
                          </h3>
                        )}

                        {collection.theme && collection.theme.trim() !== '' && (
                          <p className="text-xs text-gray-500 line-clamp-1 mb-2 font-medium">
                            {collection.theme}
                          </p>
                        )}
                      </div>
                    );
                  })}
                </div>
              )}
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

      {/* Delete Confirmation Modal */}
      <ConfirmationModal
        isOpen={showDeleteModal}
        title="Excluir Coleção"
        message="Tem certeza que deseja excluir esta coleção? Esta ação não pode ser desfeita."
        confirmText="Excluir"
        cancelText="Cancelar"
        onConfirm={handleDeleteConfirm}
        onCancel={() => {
          setShowDeleteModal(false);
          setCollectionToDelete(null);
        }}
        danger={true}
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
