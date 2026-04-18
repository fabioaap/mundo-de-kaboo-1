import React, { useState, useEffect, useRef, useImperativeHandle, forwardRef } from 'react';
import { Icons } from '../components/Icons';
import { Collection, ScreenName, UserAuthStatus, UserProfile, UserRole } from '../types';
import { api } from '../lib/api';
import { canEditCollections, isAdmin } from '../lib/auth';
import { PageHeader } from '../components/PageHeader';
import { Button } from '../design-system';
import { FileUpload } from '../components/FileUpload';
import { TagInput } from '../components/TagInput';
import { Tabs } from '../components/Tabs';
import { MultipleFileUpload } from '../components/MultipleFileUpload';
import { ConfirmationModal } from '../components/ConfirmationModal';
import { Toast } from '../components/Toast';
import { useToast } from '../hooks/useToast';
import { ColorPicker } from '../components/ColorPicker';
import useIsMobile from '../hooks/useIsMobile';
import { placeholderImageUrl } from '../lib/appPaths';
import { supabase, isSupabaseConfigured } from '../lib/supabase';
import { formatAccessDate, getAccessStatusLabel, getProfileAccessStatus } from '../lib/access';

interface AdminCollectionsScreenProps {
  onNavigate: (screen: ScreenName, params?: any) => void;
  onBack: () => void;
  initialTab?: 'collections' | 'users';
}

export interface AdminCollectionsHandle {
  hasUnsavedChanges: () => boolean;
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
            background: `linear-gradient(${135 + (tilt.y * 2)
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
            {level.replace('Educação Infantil', 'Ed. Infantil').replace('Fundamental ', 'Fund. ')}
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

export const AdminCollectionsScreen = forwardRef<AdminCollectionsHandle, AdminCollectionsScreenProps>(({ onNavigate, onBack, initialTab }, ref) => {
  // Main tab — driven by initialTab prop (key remount in AdminScreen)
  const mainTab = initialTab || 'collections';

  // Collections state
  const [collections, setCollections] = useState<Collection[]>([]);
  const [loading, setLoading] = useState(true);
  const [checkingPermission, setCheckingPermission] = useState(true);
  const [hasPermission, setHasPermission] = useState(false);
  const [isAdminUser, setIsAdminUser] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [showCreateForm, setShowCreateForm] = useState(false);
  const [activeTab, setActiveTab] = useState<'identification' | 'media'>('identification');
  const [isSaving, setIsSaving] = useState(false);

  // Users state
  const [users, setUsers] = useState<UserProfile[]>([]);
  const [loadingUsers, setLoadingUsers] = useState(false);
  const [isCreatingUser, setIsCreatingUser] = useState(false);
  const [showUserForm, setShowUserForm] = useState(false);
  const [userFormData, setUserFormData] = useState({
    email: '',
    full_name: '',
    role: 'viewer' as UserRole,
  });
  const [showRoleDropdown, setShowRoleDropdown] = useState(false);
  const [acceptedTerms, setAcceptedTerms] = useState(false);
  const [userErrorMsg, setUserErrorMsg] = useState<string | null>(null);
  const [userSuccessMsg, setUserSuccessMsg] = useState<string | null>(null);
  const roleDropdownRef = useRef<HTMLDivElement>(null);

  // Edit user state
  const [editingUserId, setEditingUserId] = useState<string | null>(null);
  const [editUserFormData, setEditUserFormData] = useState<{ full_name: string; role: UserRole }>({ full_name: '', role: 'viewer' });
  const [editUserRoleDropdownOpen, setEditUserRoleDropdownOpen] = useState(false);
  const [loadingUserEdit, setLoadingUserEdit] = useState(false);
  const [editUserErrorMsg, setEditUserErrorMsg] = useState<string | null>(null);
  const editUserRoleRef = useRef<HTMLDivElement>(null);
  const [originalFormData, setOriginalFormData] = useState<Partial<Collection> | null>(null);
  const [showUnsavedChangesModal, setShowUnsavedChangesModal] = useState(false);
  const [pendingAction, setPendingAction] = useState<(() => void) | null>(null);
  const { toast, showToast, hideToast } = useToast();
  const [searchFilter, setSearchFilter] = useState('');
  const [levelFilter, setLevelFilter] = useState<'all' | 'Educação Infantil' | 'Fundamental I'>('all');
  const [sortOrder, setSortOrder] = useState<'asc' | 'desc' | null>(null);
  const [showSortDropdown, setShowSortDropdown] = useState(false);
  const [showLevelDropdown, setShowLevelDropdown] = useState(false);
  const [showFormLevelDropdown, setShowFormLevelDropdown] = useState(false);
  const [showDeleteModal, setShowDeleteModal] = useState(false);
  const [collectionToDelete, setCollectionToDelete] = useState<string | null>(null);
  const [isDeleting, setIsDeleting] = useState(false);
  const [openActionsDropdown, setOpenActionsDropdown] = useState<string | null>(null);
  const [showHeaderActionsDropdown, setShowHeaderActionsDropdown] = useState(false);
  const headerActionsRef = useRef<HTMLDivElement>(null);
  const sortDropdownRef = useRef<HTMLDivElement>(null);
  const levelDropdownRef = useRef<HTMLDivElement>(null);
  const formLevelDropdownRef = useRef<HTMLDivElement>(null);
  const actionsDropdownRefs = useRef<{ [key: string]: HTMLDivElement | null }>({});
  const [formData, setFormData] = useState<Partial<Collection>>({
    title: '',
    level: 'Educação Infantil',
    cover_image: placeholderImageUrl,
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

  const accessSummary = users.reduce((summary, user) => {
    const status = getProfileAccessStatus(user);
    summary.total += 1;
    summary[status] += 1;
    return summary;
  }, {
    total: 0,
    active: 0,
    expired: 0,
    pending_voucher: 0,
  });

  const getAccessBadgeClasses = (user: UserProfile) => {
    const status = getProfileAccessStatus(user);

    if (status === 'active') {
      return 'bg-emerald-100 text-emerald-700';
    }

    if (status === 'expired') {
      return 'bg-orange-100 text-orange-700';
    }

    return 'bg-amber-100 text-amber-700';
  };

  const getUserAuthStatus = (user: UserProfile): UserAuthStatus => {
    if (user.auth_status) {
      return user.auth_status;
    }

    if (user.last_sign_in_at) {
      return 'authenticated';
    }

    if (user.confirmed_at) {
      return 'confirmed';
    }

    if (user.invited_at) {
      return 'invite_pending';
    }

    return 'created';
  };

  const getAuthBadgeMeta = (user: UserProfile) => {
    const status = getUserAuthStatus(user);

    switch (status) {
      case 'authenticated':
        return {
          label: 'Já acessou',
          classes: 'bg-emerald-100 text-emerald-700',
        };
      case 'confirmed':
        return {
          label: 'Convite confirmado',
          classes: 'bg-sky-100 text-sky-700',
        };
      case 'invite_pending':
        return {
          label: 'Esperando autenticação',
          classes: 'bg-amber-100 text-amber-700',
        };
      default:
        return {
          label: 'Conta criada',
          classes: 'bg-slate-100 text-slate-700',
        };
    }
  };

  const formatAdminDateTime = (value?: string | null) => {
    if (!value) {
      return 'Nunca acessou';
    }

    try {
      return new Intl.DateTimeFormat('pt-BR', {
        day: '2-digit',
        month: '2-digit',
        year: 'numeric',
        hour: '2-digit',
        minute: '2-digit',
      }).format(new Date(value));
    } catch {
      return 'Data indisponível';
    }
  };

  const pendingInviteCount = users.filter((user) => getUserAuthStatus(user) === 'invite_pending').length;

  useEffect(() => {
    checkPermission();
    if (mainTab === 'collections') {
      loadCollections();
    } else if (mainTab === 'users') {
      loadUsers();
    }
  }, []);

  // Double fetch guard: mainTab useEffect already handles initial load

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
      if (roleDropdownRef.current && !roleDropdownRef.current.contains(event.target as Node)) {
        setShowRoleDropdown(false);
      }
      if (editUserRoleRef.current && !editUserRoleRef.current.contains(event.target as Node)) {
        setEditUserRoleDropdownOpen(false);
      }

      // Close actions dropdowns
      Object.keys(actionsDropdownRefs.current).forEach(key => {
        const ref = actionsDropdownRefs.current[key];
        if (ref && !ref.contains(event.target as Node)) {
          setOpenActionsDropdown(null);
        }
      });
    };

    if (showSortDropdown || showLevelDropdown || showFormLevelDropdown || openActionsDropdown || showHeaderActionsDropdown || showRoleDropdown || editUserRoleDropdownOpen) {
      document.addEventListener('mousedown', handleClickOutside);
    }

    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, [showSortDropdown, showLevelDropdown, showFormLevelDropdown, openActionsDropdown, showHeaderActionsDropdown, showRoleDropdown, editUserRoleDropdownOpen]);

  const checkPermission = async () => {
    setCheckingPermission(true);
    try {
      const canEdit = await canEditCollections();
      const admin = await isAdmin();
      setHasPermission(canEdit);
      setIsAdminUser(admin);
      if (!canEdit) {
        onBack();
      }
    } catch (error) {
      console.error('Error checking permission:', error);
      showToast('Erro ao verificar permissões.', 'error');
    } finally {
      setCheckingPermission(false);
    }
  };

  const loadCollections = async () => {
    setLoading(true);
    try {
      const data = await api.getCollections();
      setCollections(data);
    } catch (error) {
      console.error('Error loading collections:', error);
      showToast('Erro ao carregar coleções.', 'error');
    } finally {
      setLoading(false);
    }
  };

  const loadUsers = async () => {
    setLoadingUsers(true);
    try {
      const data = await api.getAllUsers();
      setUsers(data);
    } catch (error) {
      console.error('Error loading users:', error);
      showToast('Erro ao carregar usuários.', 'error');
    } finally {
      setLoadingUsers(false);
    }
  };

  const handleCreateUser = async (e?: React.FormEvent) => {
    if (e) e.preventDefault();

    if (!isAdminUser) {
      setUserErrorMsg('Apenas administradores podem criar usuários.');
      return;
    }

    if (!acceptedTerms) {
      setUserErrorMsg('Você precisa aceitar a política de privacidade para continuar.');
      return;
    }

    if (!userFormData.email || !userFormData.full_name) {
      setUserErrorMsg('Preencha todos os campos obrigatórios.');
      return;
    }

    setIsCreatingUser(true);
    setUserErrorMsg(null);
    setUserSuccessMsg(null);

    try {
      const result = await api.createUser({
        email: userFormData.email,
        full_name: userFormData.full_name,
        role: userFormData.role,
      });

      if (result.success) {
        showToast(`Convite enviado para ${userFormData.email}!`, 'success');
        setShowUserForm(false);
        setUserFormData({ email: '', full_name: '', role: 'viewer' });
        setAcceptedTerms(false);
        setUserSuccessMsg(null);
        loadUsers();
      } else {
        let msg = result.error || 'Erro ao criar usuário.';
        if (msg === 'User already registered') msg = 'Este e-mail já está cadastrado.';
        setUserErrorMsg(msg);
      }
    } catch (error) {
      console.error('Error creating user:', error);
      showToast('Erro ao criar usuário. Tente novamente.', 'error');
    } finally {
      setIsCreatingUser(false);
    }
  };

  const clearUserError = () => {
    if (userErrorMsg) setUserErrorMsg(null);
  };

  const handleEditUserOpen = (user: UserProfile) => {
    setEditingUserId(user.id);
    setEditUserFormData({
      full_name: user.full_name || '',
      role: (user.role as UserRole) || 'viewer',
    });
    setEditUserErrorMsg(null);
  };

  const handleEditUserSave = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingUserId) return;
    if (!editUserFormData.full_name.trim()) {
      setEditUserErrorMsg('Nome completo é obrigatório.');
      return;
    }
    setLoadingUserEdit(true);
    setEditUserErrorMsg(null);
    try {
      const result = await api.updateUser(editingUserId, {
        full_name: editUserFormData.full_name.trim(),
        role: editUserFormData.role,
      });
      if (result.success) {
        showToast('Usuário atualizado com sucesso!', 'success');
        setEditingUserId(null);
        loadUsers();
      } else {
        setEditUserErrorMsg(result.error || 'Erro ao atualizar usuário.');
      }
    } catch (error) {
      console.error('Error updating user:', error);
      showToast('Erro ao atualizar usuário. Tente novamente.', 'error');
    } finally {
      setLoadingUserEdit(false);
    }
  };

  const handleEdit = (collection: Collection) => {
    const initialData = {
      title: collection.title || '',
      level: collection.level || 'Educação Infantil',
      cover_image: collection.cover_image || placeholderImageUrl,
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
    if (!collectionToDelete || isDeleting) return;
    setIsDeleting(true);
    try {
      const success = await api.deleteCollection(collectionToDelete);
      if (success) {
        showToast('Coleção excluída com sucesso!', 'success');
        loadCollections();
      } else {
        showToast('Erro ao excluir coleção.', 'error');
      }
    } catch (error) {
      console.error('Error deleting collection:', error);
      showToast('Erro ao excluir coleção. Tente novamente.', 'error');
    } finally {
      setIsDeleting(false);
      setShowDeleteModal(false);
      setCollectionToDelete(null);
    }
  };

  const handleSave = async () => {
    if (!formData.title) {
      showToast('Título é obrigatório.', 'error');
      return;
    }

    setIsSaving(true);
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
    setIsSaving(false);
  };

  const hasUnsavedChanges = (): boolean => {
    if (!originalFormData) return false;

    return JSON.stringify(formData) !== JSON.stringify(originalFormData);
  };

  useImperativeHandle(ref, () => ({
    hasUnsavedChanges,
  }));

  const resetForm = () => {
    setFormData({
      title: '',
      level: 'Educação Infantil',
      cover_image: placeholderImageUrl,
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
        title="Gerenciar"
        onBack={handleBackClick}
        rightContent={
          mainTab === 'collections' && editingId ? (
            <div className="flex items-center gap-2">
              <div className="relative" ref={headerActionsRef}>
                <button
                  onClick={() => setShowHeaderActionsDropdown(!showHeaderActionsDropdown)}
                  className="w-10 h-10 rounded-full bg-gray-50 hover:bg-gray-100 border border-gray-200 flex items-center justify-center transition-all active:scale-95"
                  aria-label="Ações da coleção"
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
            </div>
          ) : null
        }
      />

      {/* Collections Tab Content */}
      {mainTab === 'collections' && (
        <>
          {loading ? (
            <div className="flex items-center justify-center h-64">
              <div className="w-8 h-8 border-4 border-kaboo-primary border-t-transparent rounded-full animate-spin"></div>
            </div>
          ) : editingId || showCreateForm ? (
            <div className="flex-1 overflow-y-auto px-6 md:px-8 pb-6 pt-0">
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


                      {/* 1.1. Imagem de Capa and 1.2. Cor da Coleção in same row */}
                      <div className="grid grid-cols-2 gap-4">
                        <div>
                          <FileUpload
                            label="Imagem de Capa"
                            value={formData.cover_image || placeholderImageUrl}
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
                                  setFormData({ ...formData, level: 'Educação Infantil' });
                                  setShowFormLevelDropdown(false);
                                }}
                                className={`w-full px-4 py-3 text-left flex items-center gap-3 transition-colors first:rounded-t-2xl ${formData.level === 'Educação Infantil'
                                  ? 'bg-kaboo-primary/10 text-kaboo-primary font-bold'
                                  : 'text-gray-700 hover:bg-gray-50 font-medium'
                                  }`}
                              >
                                <span>Educação Infantil</span>
                                {formData.level === 'Educação Infantil' && <Icons.Check size={18} className="ml-auto" />}
                              </button>
                              <button
                                onClick={() => {
                                  setFormData({ ...formData, level: 'Fundamental I' });
                                  setShowFormLevelDropdown(false);
                                }}
                                className={`w-full px-4 py-3 text-left flex items-center gap-3 transition-colors last:rounded-b-2xl ${formData.level === 'Fundamental I'
                                  ? 'bg-kaboo-primary/10 text-kaboo-primary font-bold'
                                  : 'text-gray-700 hover:bg-gray-50 font-medium'
                                  }`}
                              >
                                <span>Fundamental I</span>
                                {formData.level === 'Fundamental I' && <Icons.Check size={18} className="ml-auto" />}
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
                    <Button variant="secondary" fullWidth onClick={handleCancel} disabled={isSaving}>
                      Cancelar
                    </Button>
                    <Button variant="primary" fullWidth onClick={handleSave} disabled={isSaving}>
                      {isSaving ? 'Salvando...' : (editingId ? 'Salvar Alterações' : 'Criar Coleção')}
                    </Button>
                  </div>
                </div>
              </div>
            </div>
          ) : (
            <div className="flex-1 overflow-y-auto px-6 md:px-8 pb-6 pt-0">
              {collections.length === 0 ? (
                <div className="text-center py-12">
                  <Icons.BookOpen size={48} className="mx-auto mb-4 text-gray-300" />
                  <p className="text-gray-500 font-bold">Nenhuma coleção encontrada.</p>
                </div>
              ) : (
                <div className="space-y-4">
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
                          placeholder="Buscar por título ou tema..."
                          className="w-full bg-gray-100 border-none rounded-2xl pl-12 pr-4 py-3 text-gray-800 placeholder-gray-400 focus:ring-2 focus:ring-kaboo-primary outline-none transition-all font-medium"
                        />
                      </div>
                    </div>

                    {/* Filtro de Nível com Dropdown */}
                    <div className="md:w-48 relative" ref={levelDropdownRef}>
                      <button
                        onClick={() => setShowLevelDropdown(!showLevelDropdown)}
                        className={`h-11 px-4 rounded-2xl flex items-center gap-2 border transition-all active:scale-95 shadow-sm font-bold text-sm w-full justify-between ${levelFilter !== 'all'
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
                            className={`w-full px-4 py-3 text-left flex items-center gap-3 transition-colors first:rounded-t-2xl ${levelFilter === 'all'
                              ? 'bg-kaboo-primary/10 text-kaboo-primary font-bold'
                              : 'text-gray-700 hover:bg-gray-50 font-medium'
                              }`}
                          >
                            <span>Todos os níveis</span>
                            {levelFilter === 'all' && <Icons.Check size={18} className="ml-auto" />}
                          </button>
                          <button
                            onClick={() => {
                              setLevelFilter('Educação Infantil');
                              setShowLevelDropdown(false);
                            }}
                            className={`w-full px-4 py-3 text-left flex items-center gap-3 transition-colors ${levelFilter === 'Educação Infantil'
                              ? 'bg-kaboo-primary/10 text-kaboo-primary font-bold'
                              : 'text-gray-700 hover:bg-gray-50 font-medium'
                              }`}
                          >
                            <span>Educação Infantil</span>
                            {levelFilter === 'Educação Infantil' && <Icons.Check size={18} className="ml-auto" />}
                          </button>
                          <button
                            onClick={() => {
                              setLevelFilter('Fundamental I');
                              setShowLevelDropdown(false);
                            }}
                            className={`w-full px-4 py-3 text-left flex items-center gap-3 transition-colors last:rounded-b-2xl ${levelFilter === 'Fundamental I'
                              ? 'bg-kaboo-primary/10 text-kaboo-primary font-bold'
                              : 'text-gray-700 hover:bg-gray-50 font-medium'
                              }`}
                          >
                            <span>Fundamental I</span>
                            {levelFilter === 'Fundamental I' && <Icons.Check size={18} className="ml-auto" />}
                          </button>
                        </div>
                      )}
                    </div>

                    {/* Botão de Ordenação com Dropdown */}
                    <div className="relative" ref={sortDropdownRef}>
                      <div className="flex items-center gap-2">
                        <button
                          onClick={() => setShowSortDropdown(!showSortDropdown)}
                          className={`h-11 px-4 rounded-2xl flex items-center gap-2 border transition-all active:scale-95 shadow-sm font-bold text-sm ${sortOrder
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
                            className={`w-full px-4 py-3 text-left flex items-center gap-3 transition-colors first:rounded-t-2xl ${sortOrder === 'asc'
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
                            className={`w-full px-4 py-3 text-left flex items-center gap-3 transition-colors last:rounded-b-2xl ${sortOrder === 'desc'
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

                    {/* Botão Nova Coleção */}
                    {!editingId && !showCreateForm && (
                      <button
                        onClick={() => {
                          if (hasUnsavedChanges()) {
                            setPendingAction(() => () => {
                              setShowCreateForm(true);
                              setOriginalFormData({
                                title: '',
                                level: 'Educação Infantil',
                                cover_image: placeholderImageUrl,
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
                              level: 'Educação Infantil',
                              cover_image: placeholderImageUrl,
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
                        className="h-11 px-6 rounded-2xl bg-kaboo-primary text-white flex items-center justify-center gap-2 hover:bg-opacity-90 transition-all active:scale-95 shadow-sm font-bold text-sm whitespace-nowrap"
                      >
                        <Icons.Plus size={18} />
                        <span>Nova Coleção</span>
                      </button>
                    )}
                  </div>

                  {/* Lista de Coleções */}
                  {getFilteredAndSortedCollections().length === 0 ? (
                    <div className="text-center py-12">
                      <Icons.BookOpen size={48} className="mx-auto mb-4 text-gray-300" />
                      <p className="text-gray-500 font-bold">
                        {collections.length > 0 ? 'Nenhuma coleção corresponde aos filtros.' : 'Nenhuma coleção encontrada.'}
                      </p>
                      {collections.length > 0 && (searchFilter || levelFilter !== 'all' || sortOrder) && (
                        <button
                          onClick={() => { setSearchFilter(''); setLevelFilter('all'); setSortOrder(null); }}
                          className="mt-3 text-sm font-bold text-kaboo-primary hover:underline"
                        >
                          Limpar filtros
                        </button>
                      )}
                    </div>
                  ) : (
                    <div className="grid grid-cols-1 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 gap-4 md:gap-6">
                      {getFilteredAndSortedCollections().map((collection) => {
                        const actionsButton = (
                          <div
                            className="actions-button"
                            ref={(el) => {
                              actionsDropdownRefs.current[collection.id] = el;
                            }}
                            onClick={(e) => e.stopPropagation()}
                          >
                            <button
                              onClick={(e) => {
                                e.stopPropagation();
                                e.preventDefault();
                                setOpenActionsDropdown(openActionsDropdown === collection.id ? null : collection.id);
                              }}
                              className="w-8 h-8 rounded-full bg-white/90 hover:bg-white border border-gray-200 flex items-center justify-center transition-all shadow-sm hover:shadow-md"
                              aria-label="Ações da coleção"
                            >
                              <Icons.MoreHorizontal size={18} className="text-gray-600" />
                            </button>

                            {openActionsDropdown === collection.id && (
                              <div
                                className="absolute top-full right-0 mt-2 w-48 bg-white rounded-2xl shadow-xl border border-gray-100 z-[100] animate-fade-in-up origin-top-right actions-dropdown"
                                onClick={(e) => {
                                  e.stopPropagation();
                                  e.preventDefault();
                                }}
                                onMouseDown={(e) => {
                                  e.stopPropagation();
                                }}
                              >
                                {isAdminUser && (
                                  <button
                                    type="button"
                                    onClick={(e) => {
                                      e.stopPropagation();
                                      e.preventDefault();
                                      handleDeleteClick(collection.id);
                                      setOpenActionsDropdown(null);
                                    }}
                                    onMouseDown={(e) => {
                                      e.stopPropagation();
                                    }}
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
                              // Não abrir edição se clicar no botão de ações ou dropdown
                              const target = e.target as HTMLElement;
                              if (
                                target.closest('.actions-button') ||
                                target.closest('.actions-dropdown') ||
                                target.tagName === 'BUTTON' ||
                                target.closest('button')
                              ) {
                                e.stopPropagation();
                                return;
                              }
                              if (hasUnsavedChanges()) {
                                setPendingAction(() => () => {
                                  const initialData = {
                                    title: collection.title || '',
                                    level: collection.level || 'Educação Infantil',
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
        </>
      )}

      {/* Users Tab Content */}
      {mainTab === 'users' && (
        <>
          {editingUserId ? (
            <div className="flex-1 overflow-y-auto px-6 md:px-8 pb-6 pt-0">
              <div className="max-w-2xl mx-auto">
                {/* Header */}
                <div className="mb-6 flex items-center gap-4">
                  <button
                    type="button"
                    onClick={() => setEditingUserId(null)}
                    className="p-2 rounded-xl hover:bg-gray-100 text-gray-500 transition-colors"
                  >
                    <Icons.ChevronLeft size={20} />
                  </button>
                  <h2 className="text-xl font-black text-gray-800">Editar Usuário</h2>
                </div>

                <form onSubmit={handleEditUserSave} className="space-y-5">
                  {/* Nome */}
                  <div className="space-y-2">
                    <label className="text-sm font-bold text-gray-600 ml-2">Nome completo</label>
                    <div className="relative">
                      <input
                        type="text"
                        value={editUserFormData.full_name}
                        onChange={(e) => { setEditUserFormData({ ...editUserFormData, full_name: e.target.value }); setEditUserErrorMsg(null); }}
                        className="w-full bg-gray-50 border-none rounded-2xl p-4 pl-12 text-gray-800 placeholder-gray-400 focus:ring-2 focus:ring-kaboo-primary outline-none transition-all"
                        placeholder="Nome completo do usuário"
                        required
                      />
                      <Icons.User className="absolute left-4 top-4 text-gray-400" size={20} />
                    </div>
                  </div>

                  {/* Papel */}
                  <div className="space-y-2">
                    <label className="text-sm font-bold text-gray-600 ml-2">Papel</label>
                    <div className="relative" ref={editUserRoleRef}>
                      <button
                        type="button"
                        onClick={() => setEditUserRoleDropdownOpen(!editUserRoleDropdownOpen)}
                        className="w-full bg-gray-50 border-none rounded-2xl p-4 pl-12 pr-4 flex items-center justify-between text-gray-800 focus:ring-2 focus:ring-kaboo-primary outline-none transition-all"
                      >
                        <span className="text-left">
                          {editUserFormData.role === 'admin' ? 'Administrador' : editUserFormData.role === 'editor' ? 'Editor' : 'Visualizador'}
                        </span>
                        <Icons.ChevronDown size={16} className={`transition-transform flex-shrink-0 ${editUserRoleDropdownOpen ? 'rotate-180' : ''}`} />
                      </button>
                      <Icons.User className="absolute left-4 top-4 text-gray-400 pointer-events-none" size={20} />
                      {editUserRoleDropdownOpen && (
                        <div className="absolute top-full left-0 right-0 mt-2 bg-white rounded-2xl shadow-xl border border-gray-100 z-50">
                          {(['viewer', 'editor', 'admin'] as UserRole[]).map((r) => (
                            <button
                              key={r}
                              type="button"
                              onClick={() => { setEditUserFormData({ ...editUserFormData, role: r }); setEditUserRoleDropdownOpen(false); }}
                              className={`w-full px-4 py-3 text-left flex items-center gap-3 transition-colors first:rounded-t-2xl last:rounded-b-2xl ${editUserFormData.role === r ? 'bg-kaboo-primary/10 text-kaboo-primary font-bold' : 'text-gray-700 hover:bg-gray-50 font-medium'
                                }`}
                            >
                              <span>{r === 'admin' ? 'Administrador' : r === 'editor' ? 'Editor' : 'Visualizador'}</span>
                              {editUserFormData.role === r && <Icons.Check size={16} className="ml-auto" />}
                            </button>
                          ))}
                        </div>
                      )}
                    </div>
                  </div>

                  {editUserErrorMsg && (
                    <div role="alert" className="bg-red-50 text-red-500 text-sm p-3 rounded-xl font-medium text-center">
                      {editUserErrorMsg}
                    </div>
                  )}

                  <div className="pt-2 flex gap-3">
                    <button
                      type="button"
                      onClick={() => setEditingUserId(null)}
                      className="flex-1 h-12 rounded-2xl border border-gray-200 text-gray-600 font-bold text-sm hover:bg-gray-50 transition-all"
                    >
                      Cancelar
                    </button>
                    <Button type="submit" fullWidth disabled={loadingUserEdit}>
                      {loadingUserEdit ? 'Salvando...' : 'Salvar alterações'}
                    </Button>
                  </div>
                </form>
              </div>
            </div>
          ) : showUserForm ? (
            <div className="flex-1 overflow-y-auto px-6 md:px-8 pb-6 pt-0">
              <div className="max-w-2xl mx-auto">
                {/* Header */}
                <div className="mb-6 flex items-center gap-4">
                  <button
                    type="button"
                    onClick={() => {
                      setShowUserForm(false);
                      setUserFormData({
                        email: '',
                        full_name: '',
                        role: 'viewer',
                      });
                      setAcceptedTerms(false);
                      setUserErrorMsg(null);
                      setUserSuccessMsg(null);
                    }}
                    className="w-10 h-10 rounded-full bg-gray-50 flex items-center justify-center hover:bg-gray-100 transition-colors text-gray-700"
                  >
                    <Icons.ChevronLeft size={24} />
                  </button>
                  <h1 className="text-xl font-bold text-gray-800 flex-1">Convidar colaborador</h1>
                </div>

                <form onSubmit={handleCreateUser} className="space-y-4">
                  {/* Registration Fields */}
                  <div className="space-y-4 animate-in fade-in slide-in-from-right-4 duration-300">
                    {/* Name */}
                    <div className="space-y-2">
                      <label className="text-sm font-bold text-gray-600 ml-2">Nome Completo</label>
                      <div className="relative">
                        <input
                          type="text"
                          value={userFormData.full_name}
                          onChange={(e) => { setUserFormData({ ...userFormData, full_name: e.target.value }); clearUserError(); }}
                          className="w-full bg-gray-50 border-none rounded-2xl p-4 pl-12 text-gray-800 placeholder-gray-400 focus:ring-2 focus:ring-kaboo-primary outline-none transition-all"
                          placeholder="Seu nome"
                          required
                        />
                        <Icons.User className="absolute left-4 top-4 text-gray-400" size={20} />
                      </div>
                    </div>

                  </div>

                  {/* Email Field */}
                  <div className="space-y-2">
                    <label className="text-sm font-bold text-gray-600 ml-2">E-mail</label>
                    <div className="relative">
                      <input
                        type="email"
                        value={userFormData.email}
                        onChange={(e) => { setUserFormData({ ...userFormData, email: e.target.value }); clearUserError(); }}
                        className="w-full bg-gray-50 border-none rounded-2xl p-4 pl-12 text-gray-800 placeholder-gray-400 focus:ring-2 focus:ring-kaboo-primary outline-none transition-all"
                        placeholder="email@exemplo.com.br"
                        required
                      />
                      <Icons.Mail className="absolute left-4 top-4 text-gray-400" size={20} />
                    </div>
                  </div>

                  {/* Password Field removed — collaborator sets password via invite email */}

                  {/* Role Field */}
                  <div className="space-y-2">
                    <label className="text-sm font-bold text-gray-600 ml-2">Função</label>
                    <div className="relative" ref={roleDropdownRef}>
                      <button
                        type="button"
                        onClick={() => setShowRoleDropdown(!showRoleDropdown)}
                        className="w-full bg-gray-50 border-none rounded-2xl p-4 pl-12 pr-4 flex items-center justify-between text-gray-800 focus:ring-2 focus:ring-kaboo-primary outline-none transition-all"
                      >
                        <span className="text-left">
                          {userFormData.role === 'admin' ? 'Administrador' :
                            userFormData.role === 'editor' ? 'Editor' : 'Visualizador'}
                        </span>
                        <Icons.ChevronDown size={16} className={`transition-transform flex-shrink-0 ${showRoleDropdown ? 'rotate-180' : ''}`} />
                      </button>

                      {showRoleDropdown && (
                        <div className="absolute top-full left-0 right-0 mt-2 bg-white rounded-2xl shadow-xl border border-gray-100 z-50 animate-fade-in-up origin-top">
                          <button
                            type="button"
                            onClick={() => {
                              setUserFormData({ ...userFormData, role: 'viewer' });
                              setShowRoleDropdown(false);
                            }}
                            className={`w-full px-4 py-3 text-left flex items-center gap-3 transition-colors first:rounded-t-2xl ${userFormData.role === 'viewer'
                              ? 'bg-kaboo-primary/10 text-kaboo-primary font-bold'
                              : 'text-gray-700 hover:bg-gray-50 font-medium'
                              }`}
                          >
                            <span>Visualizador</span>
                            {userFormData.role === 'viewer' && <Icons.Check size={18} className="ml-auto" />}
                          </button>
                          <button
                            type="button"
                            onClick={() => {
                              setUserFormData({ ...userFormData, role: 'editor' });
                              setShowRoleDropdown(false);
                            }}
                            className={`w-full px-4 py-3 text-left flex items-center gap-3 transition-colors ${userFormData.role === 'editor'
                              ? 'bg-kaboo-primary/10 text-kaboo-primary font-bold'
                              : 'text-gray-700 hover:bg-gray-50 font-medium'
                              }`}
                          >
                            <span>Editor</span>
                            {userFormData.role === 'editor' && <Icons.Check size={18} className="ml-auto" />}
                          </button>
                          <button
                            type="button"
                            onClick={() => {
                              setUserFormData({ ...userFormData, role: 'admin' });
                              setShowRoleDropdown(false);
                            }}
                            className={`w-full px-4 py-3 text-left flex items-center gap-3 transition-colors last:rounded-b-2xl ${userFormData.role === 'admin'
                              ? 'bg-kaboo-primary/10 text-kaboo-primary font-bold'
                              : 'text-gray-700 hover:bg-gray-50 font-medium'
                              }`}
                          >
                            <span>Administrador</span>
                            {userFormData.role === 'admin' && <Icons.Check size={18} className="ml-auto" />}
                          </button>
                        </div>
                      )}
                    </div>
                  </div>

                  {isSupabaseConfigured ? (
                    <div className="rounded-2xl border border-emerald-100 bg-emerald-50 px-4 py-3 text-xs text-emerald-800 leading-relaxed flex items-start gap-2">
                      <Icons.Mail size={14} className="mt-0.5 shrink-0" />
                      <span>Um e-mail de convite será enviado automaticamente para que o colaborador defina a própria senha no primeiro acesso.</span>
                    </div>
                  ) : (
                    <div className="rounded-2xl border border-sky-100 bg-sky-50 px-4 py-3 text-xs text-sky-800 leading-relaxed">
                      {userFormData.role === 'viewer'
                        ? 'No modo demonstração, o e-mail de convite não é enviado. O colaborador pode usar "Esqueci minha senha" na tela de login para definir a senha.'
                        : 'No modo demonstração, editores e administradores criados por aqui entram com acesso ativo para fins operacionais.'}
                    </div>
                  )}

                  {/* Privacy Policy Checkbox */}
                  <div className="flex items-center gap-3 px-2 py-2 animate-in fade-in slide-in-from-right-4 duration-300">
                    <div className="relative flex items-center justify-center shrink-0">
                      <input
                        type="checkbox"
                        id="terms"
                        checked={acceptedTerms}
                        onChange={(e) => {
                          setAcceptedTerms(e.target.checked);
                          clearUserError();
                        }}
                        className="peer h-5 w-5 cursor-pointer appearance-none rounded-md border-2 border-gray-300 transition-all checked:border-kaboo-primary checked:bg-kaboo-primary focus:ring-2 focus:ring-kaboo-primary/30 outline-none"
                      />
                      <Icons.Check
                        size={14}
                        strokeWidth={4}
                        className="pointer-events-none absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 text-white opacity-0 peer-checked:opacity-100 transition-opacity"
                      />
                    </div>
                    <label htmlFor="terms" className="text-sm text-gray-600 cursor-pointer select-none leading-tight">
                      Li e concordo com a <button type="button" className="text-kaboo-primary font-bold hover:underline">política de privacidade</button> do Mundo de Kaboo.
                    </label>
                  </div>

                  {/* Error Message */}
                  {userErrorMsg && (
                    <div className="bg-red-50 text-red-500 text-sm p-3 rounded-xl font-medium text-center animate-in fade-in" role="alert">
                      {userErrorMsg}
                    </div>
                  )}

                  <div className="pt-2">
                    <Button type="submit" fullWidth disabled={isCreatingUser}>
                      {isCreatingUser ? 'Enviando convite...' : 'Enviar convite por e-mail'}
                    </Button>
                  </div>
                </form>
              </div>
            </div>
          ) : (
            <div className="flex-1 overflow-y-auto px-6 md:px-8 pb-6 pt-0">
              {isAdminUser && (
                <div className="mb-6">
                  <button
                    onClick={() => { setUserErrorMsg(null); setUserSuccessMsg(null); setShowUserForm(true); }}
                    className="h-11 px-6 rounded-2xl bg-kaboo-primary text-white flex items-center justify-center gap-2 hover:bg-opacity-90 transition-all active:scale-95 shadow-sm font-bold text-sm"
                  >
                    <Icons.Plus size={18} />
                    <span>Novo Usuário</span>
                  </button>
                </div>
              )}
              {loadingUsers ? (
                <div className="flex items-center justify-center h-64">
                  <div className="w-8 h-8 border-4 border-kaboo-primary border-t-transparent rounded-full animate-spin"></div>
                </div>
              ) : users.length === 0 ? (
                <div className="text-center py-12">
                  <Icons.User size={48} className="mx-auto mb-4 text-gray-300" />
                  <p className="text-gray-500 font-bold">Nenhum usuário encontrado.</p>
                </div>
              ) : (
                <div className="space-y-3">
                  <div className="grid grid-cols-2 md:grid-cols-5 gap-3 mb-4">
                    {[
                      { label: 'Total', value: accessSummary.total, tone: 'bg-gray-100 text-gray-700' },
                      { label: 'Ativos', value: accessSummary.active, tone: 'bg-emerald-100 text-emerald-700' },
                      { label: 'Aguardando acesso', value: pendingInviteCount, tone: 'bg-amber-100 text-amber-700' },
                      { label: 'Aguardando voucher', value: accessSummary.pending_voucher, tone: 'bg-yellow-100 text-yellow-700' },
                      { label: 'Expirados', value: accessSummary.expired, tone: 'bg-orange-100 text-orange-700' },
                    ].map((item) => (
                      <div key={item.label} className="rounded-2xl border border-gray-100 bg-white px-4 py-3 shadow-sm">
                        <p className="text-[11px] font-black uppercase tracking-[0.14em] text-gray-500 mb-2">{item.label}</p>
                        <span className={`inline-flex rounded-full px-3 py-1 text-sm font-black ${item.tone}`}>
                          {item.value}
                        </span>
                      </div>
                    ))}
                  </div>

                  {users.map((user) => (
                    (() => {
                      const authBadge = getAuthBadgeMeta(user);
                      const isWaitingFirstAccess = !user.last_sign_in_at && Boolean(user.invited_at);

                      return (
                    <div
                      key={user.id}
                      className={`rounded-2xl p-4 border transition-all ${isWaitingFirstAccess
                        ? 'bg-gray-50/80 border-gray-300 border-dashed opacity-80'
                        : 'bg-gray-50 border-gray-200 hover:border-gray-300'
                        }`}
                    >
                      <div className="flex items-center justify-between">
                        <div className="flex-1">
                          <h3 className="font-bold text-gray-800 text-base mb-1">
                            {user.full_name || 'Sem nome'}
                          </h3>
                          <p className="text-sm text-gray-600 mb-1">{user.email}</p>
                          <p className="text-xs text-gray-500">
                            Último acesso: {formatAdminDateTime(user.last_sign_in_at)}
                          </p>
                          {user.invited_at && !user.last_sign_in_at && (
                            <p className="text-xs text-gray-400 mt-1">
                              Convite enviado em {formatAdminDateTime(user.invited_at)}
                            </p>
                          )}
                          <div className="mt-3 flex flex-wrap gap-2">
                            <span className={`px-3 py-1 rounded-full text-[11px] font-bold ${getAccessBadgeClasses(user)}`}>
                              {getAccessStatusLabel(getProfileAccessStatus(user))}
                            </span>
                            <span className={`px-3 py-1 rounded-full text-[11px] font-bold ${authBadge.classes}`}>
                              {authBadge.label}
                            </span>
                            <span className="px-3 py-1 rounded-full text-[11px] font-bold bg-slate-100 text-slate-700">
                              Vigencia: {formatAccessDate(user.access_expires_at)}
                            </span>
                          </div>
                        </div>
                        <div className="ml-4 flex flex-col items-end gap-2">
                          <span className={`px-3 py-1 rounded-full text-xs font-bold ${user.role === 'admin'
                            ? 'bg-purple-100 text-purple-700'
                            : user.role === 'editor'
                              ? 'bg-blue-100 text-blue-700'
                              : 'bg-gray-100 text-gray-700'
                            }`}>
                            {user.role === 'admin' ? 'Admin' :
                              user.role === 'editor' ? 'Editor' : 'Visualizador'}
                          </span>
                          {isAdminUser && (
                            <button
                              onClick={() => handleEditUserOpen(user)}
                              className="p-1.5 rounded-lg hover:bg-gray-200 text-gray-400 hover:text-kaboo-primary transition-colors"
                              title="Editar usuário"
                            >
                              <Icons.Edit size={16} />
                            </button>
                          )}
                        </div>
                      </div>
                    </div>
                      );
                    })()
                  ))}
                </div>
              )}
            </div>
          )}
        </>
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
          if (isDeleting) return;
          setShowDeleteModal(false);
          setCollectionToDelete(null);
        }}
        danger={true}
        loading={isDeleting}
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
          if (!formData.title) {
            showToast('Título é obrigatório para salvar.', 'error');
            setShowUnsavedChangesModal(false);
            setPendingAction(null);
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
            showToast(editingId ? 'Coleção atualizada com sucesso!' : 'Coleção criada com sucesso!', 'success');
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
            showToast('Erro ao salvar. As alterações não foram salvas.', 'error');
            setShowUnsavedChangesModal(false);
            setPendingAction(null);
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
});
