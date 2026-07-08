import React, { useEffect, useState } from 'react';
import { Icons } from '../components/Icons';
import { ScreenName, UserProfile } from '../types';
import { supabase, isSupabaseConfigured } from '../lib/supabase';
import { getCharacterImageUrl, getCharacterColor, getCharacterBgColor } from '../constants';
import { getAvatarCharacters } from '../lib/characters';
import { canEditCollections, getUserRole } from '../lib/auth';
import { PageHeader } from '../components/PageHeader';
import { Button } from '../design-system';
import { api, clearAllUserCache, getCachedProfileSync } from '../lib/api';
import { formatAccessDate, getAccessStatusLabel, getProfileAccessStatus } from '../lib/access';
import { ConfirmationModal } from '../components/ConfirmationModal';
import { layoutSpacing } from '../design-system/layout/spacing';

interface ProfileScreenProps {
  onNavigate: (screen: ScreenName) => void;
}

export const ProfileScreen: React.FC<ProfileScreenProps> = ({ onNavigate }) => {
  // Initialize profile from cache if available
  const cachedProfile = getCachedProfileSync();
  const [profile, setProfile] = useState<UserProfile | null>(cachedProfile);
  // Only show loading if we don't have cached profile
  const [loading, setLoading] = useState(!cachedProfile);
  const [isEditor, setIsEditor] = useState(false);
  const [userRole, setUserRole] = useState<string | null>(null);
  const [roleLoaded, setRoleLoaded] = useState(false);
  const [isAvatarModalOpen, setIsAvatarModalOpen] = useState(false);
  const [savingAvatar, setSavingAvatar] = useState(false);
  const [selectedAvatarId, setSelectedAvatarId] = useState<string | null>(null);
  const [showLogoutConfirm, setShowLogoutConfirm] = useState(false);

  // Preload avatar image to ensure it's cached
  const preloadAvatarImage = (avatarId: string | null) => {
    if (!avatarId) return;

    const imageUrl = getCharacterImageUrl(avatarId);
    if (!imageUrl) return;

    // Create a new Image object to preload and cache the image
    const img = new Image();
    img.src = imageUrl;
    // Set crossOrigin to allow caching
    img.crossOrigin = 'anonymous';
    // Preload the image - browser will cache it
    img.onload = () => {
      // Image is now cached
    };
    img.onerror = () => {
      // Silently handle errors
    };
  };

  useEffect(() => {
    // Always force refresh on mount to ensure we have the correct user's data
    // The cache validation will check user ID, but we want to be sure
    getProfile(true); // Always show loading to ensure fresh data
    checkEditorPermission();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Preload avatar image whenever profile changes
  useEffect(() => {
    if (profile?.avatar_id) {
      preloadAvatarImage(profile.avatar_id);
    }
  }, [profile?.avatar_id]);

  const checkEditorPermission = async () => {
    const canEdit = await canEditCollections();
    setIsEditor(canEdit);
    const role = await getUserRole();
    setUserRole(role);
    setRoleLoaded(true);
  };

  const getProfile = async (showLoading: boolean = true) => {
    try {
      if (showLoading) {
        setLoading(true);
      }

      // Force refresh to ensure we get the correct user's profile
      // Cache validation will handle user ID mismatch, but force refresh ensures correctness
      const profileData = await api.getProfile(true); // Force refresh to ensure correct user

      if (profileData) {
        setProfile(profileData);
        // Preload avatar image when profile is loaded
        if (profileData.avatar_id) {
          preloadAvatarImage(profileData.avatar_id);
        }
      }
    } catch (error) {
      console.error('Erro ao carregar perfil:', error);
    } finally {
      if (showLoading) {
        setLoading(false);
      }
    }
  };

  const handleLogout = async () => {
    await api.signOut();
    onNavigate('login');
  };

  const handleLogoutRequest = () => {
    setShowLogoutConfirm(true);
  };

  const getInitials = (name: string) => {
    if (!name) return 'MK';
    return name.trim().split(' ').map(n => n[0]).slice(0, 2).join('').toUpperCase();
  };

  const handleAvatarChange = async (avatarId: string | null) => {
    setSavingAvatar(true);
    try {
      const updatedProfile = await api.updateProfile({ avatar_id: avatarId });

      if (updatedProfile) {
        // Update local state
        setProfile(updatedProfile);
        // Preload new avatar image
        if (avatarId) {
          preloadAvatarImage(avatarId);
        }
        setIsAvatarModalOpen(false);
      } else {
        throw new Error('Failed to update profile');
      }
    } catch (error) {
      console.error('Erro ao atualizar avatar:', error);
    } finally {
      setSavingAvatar(false);
    }
  };

  return (
    <div className="flex flex-col h-full bg-white pb-24 md:pb-0">
      {/* Standard Header */}
      <PageHeader title="Meu Perfil" onBack={() => onNavigate('home')} />

      {/* HERO SECTION - Standard White Background */}
      <div className={`${layoutSpacing.pageSection} flex flex-col items-center gap-4 max-w-2xl mx-auto w-full h-[324px]`}>
        <div
          className="relative group cursor-pointer"
          onClick={() => {
            if (!loading) {
              setSelectedAvatarId(profile?.avatar_id || null);
              setIsAvatarModalOpen(true);
            }
          }}
        >
          <div className={`w-32 h-32 rounded-full border-4 border-gray-100 flex items-center justify-center shadow-lg overflow-hidden relative transition-transform group-hover:scale-105 ${profile?.avatar_id ? getCharacterColor(profile.avatar_id) : 'bg-gray-50'}`}>
            {loading ? (
              <div className="animate-pulse w-full h-full bg-gray-100" />
            ) : profile?.avatar_id ? (
              <>
                <div className={`absolute inset-0 opacity-40 ${getCharacterBgColor(profile.avatar_id)} pointer-events-none`} />
                <img
                  src={getCharacterImageUrl(profile.avatar_id)}
                  alt={profile.avatar_id}
                  className="w-full h-full object-cover relative z-10"
                  loading="eager"
                  fetchPriority="high"
                />
              </>
            ) : (
              <span className="text-3xl font-black text-gray-300">
                {getInitials(profile?.full_name || '')}
              </span>
            )}
          </div>
          {/* Edit Badge */}
          {!loading && (
            <div className="absolute bottom-1 right-1 w-8 h-8 bg-brand-primary rounded-full flex items-center justify-center text-white border-2 border-white shadow-md transition-transform group-hover:scale-110 z-20">
              <Icons.Settings size={14} />
            </div>
          )}
        </div>

        <div className="text-center">
          <h1 className="text-2xl font-black text-gray-800">
            {loading ? 'Carregando...' : (profile?.full_name || 'Usuário')}
          </h1>
          <p className="text-gray-500 text-sm font-medium mt-2 flex items-center justify-center gap-2">
            <Icons.Mail size={16} className="text-gray-500" />
            {profile?.email}
          </p>
          {!loading && roleLoaded && userRole && (userRole === 'admin' || userRole === 'editor') && (
            <div className="mt-2">
              <span className={`text-xs font-bold px-3 py-1 rounded-full ${userRole === 'admin'
                ? 'bg-purple-100 text-purple-700'
                : 'bg-blue-100 text-blue-700'
                }`}>
                {userRole === 'admin' ? 'Administrador' : 'Editor'}
              </span>
            </div>
          )}
          {!loading && profile && (
            <div className="mt-4 inline-flex flex-col items-center gap-1 rounded-2xl bg-orange-50 border border-orange-100 px-4 py-3">
              <span className="text-xs font-black uppercase tracking-[0.18em] text-orange-600">
                {getAccessStatusLabel(getProfileAccessStatus(profile))}
              </span>
              <span className="text-sm font-semibold text-gray-700">
                Vigente até {formatAccessDate(profile.access_expires_at)}
              </span>
            </div>
          )}
        </div>
      </div>

      <div className={`${layoutSpacing.pageSectionX} space-y-1 max-w-2xl mx-auto w-full mt-4`}>
        {[
          { icon: Icons.User, label: 'Meus Dados', action: () => onNavigate('my_data') },
          { icon: Icons.Mail, label: 'Fale Conosco', action: () => onNavigate('support') },
          { icon: Icons.LogOut, label: 'Sair do App', color: 'text-red-500', bg: 'bg-red-50', action: handleLogoutRequest },
        ].map((item, idx) => (
          <button
            key={idx}
            onClick={item.action}
            className="w-full flex items-center py-5 border-b border-gray-50 last:border-0 transition-all group active:scale-98"
          >
            <div className={`w-10 h-10 rounded-2xl flex items-center justify-center mr-4 ${item.bg || 'bg-gray-50 text-gray-500'} ${item.color || ''} group-hover:scale-105 transition-transform`}>
              <item.icon size={20} />
            </div>
            <span className={`flex-1 text-left font-bold ${item.color || 'text-gray-700'}`}>{item.label}</span>
            <Icons.ChevronLeft size={20} className="rotate-180 text-gray-300" />
          </button>
        ))}
      </div>

      {/* Logout Confirmation Modal */}
      <ConfirmationModal
        isOpen={showLogoutConfirm}
        title="Sair do App"
        message="Tem certeza que deseja sair? Você precisará fazer login novamente para acessar o conteúdo."
        confirmText="Sair"
        cancelText="Cancelar"
        danger
        onConfirm={handleLogout}
        onCancel={() => setShowLogoutConfirm(false)}
      />

      {/* Avatar Selection Modal */}
      {isAvatarModalOpen && (
        <div className="fixed inset-0 z-50 flex items-end md:items-center justify-center">
          <div className="absolute inset-0 bg-black/60 backdrop-blur-sm" onClick={() => setIsAvatarModalOpen(false)} />

          <div className="relative w-full md:w-[600px] h-[70vh] md:h-auto md:max-h-[80vh] bg-white rounded-t-3xl md:rounded-3xl shadow-2xl flex flex-col overflow-hidden animate-in slide-in-from-bottom-10 duration-300">

            {/* Modal Header */}
            <div className={`${layoutSpacing.modalHeader} border-b border-gray-100 flex items-center justify-between`}>
              <h2 className="text-lg font-bold text-gray-800">Escolha um Personagem</h2>
              <button onClick={() => setIsAvatarModalOpen(false)} className="w-8 h-8 rounded-full bg-gray-100 flex items-center justify-center text-gray-500 hover:bg-gray-200">
                <Icons.X size={16} />
              </button>
            </div>

            {/* Grid */}
            <div className={`flex-1 overflow-y-auto ${layoutSpacing.modalBody} grid grid-cols-3 md:grid-cols-4 ${layoutSpacing.cardGridGap}`}>

              {/* Default Option (Initials) */}
              <button
                onClick={() => setSelectedAvatarId(null)}
                disabled={savingAvatar}
                className="flex flex-col items-center gap-2 group disabled:opacity-50"
              >
                <div className={`w-20 h-20 md:w-24 md:h-24 rounded-full flex items-center justify-center bg-gray-100 border-4 border-white shadow-md group-hover:shadow-xl group-hover:scale-105 transition-all duration-300 ${selectedAvatarId === null ? 'ring-4 ring-brand-primary ring-offset-2' : ''}`}>
                  <span className="text-2xl font-black text-gray-400 group-hover:text-brand-primary transition-colors">
                    {getInitials(profile?.full_name || '')}
                  </span>
                </div>
                <span className={`text-xs md:text-sm font-bold text-center leading-tight transition-colors ${selectedAvatarId === null ? 'text-brand-primary' : 'text-gray-600'}`}>
                  Usar Sigla
                </span>
              </button>

              {/* Character Options */}
              {getAvatarCharacters().map((char) => {
                const isSelected = selectedAvatarId === char;
                const charColor = getCharacterColor(char);

                return (
                  <button
                    key={char}
                    onClick={() => setSelectedAvatarId(char)}
                    disabled={savingAvatar}
                    className="flex flex-col items-center gap-2 group disabled:opacity-50"
                  >
                    <div className={`w-20 h-20 md:w-24 md:h-24 rounded-full shadow-md group-hover:shadow-xl group-hover:scale-105 transition-all duration-300 overflow-hidden border-4 border-white relative ${isSelected ? 'ring-4 ring-brand-primary ring-offset-2' : ''} ${charColor}`}>
                      {/* Background Color Layer */}
                      <div className={`absolute inset-0 opacity-50 ${getCharacterBgColor(char)} pointer-events-none`} />
                      {/* Image Layer */}
                      <img
                        src={getCharacterImageUrl(char)}
                        alt={char}
                        className="absolute inset-0 w-full h-full object-cover transition-opacity duration-300 relative z-10"
                        loading="eager"
                        fetchPriority="high"
                        onError={(e) => { (e.target as HTMLImageElement).style.opacity = '0'; }}
                      />
                    </div>
                    <span className={`text-xs md:text-sm font-bold text-center leading-tight transition-colors ${isSelected ? 'text-brand-primary' : 'text-gray-600'}`}>
                      {char}
                    </span>
                  </button>
                );
              })}
            </div>

            {/* Modal Footer */}
            <div className={`${layoutSpacing.modalFooter} border-t border-gray-100 flex gap-3`}>
              <Button
                variant="ghost"
                fullWidth
                onClick={() => setIsAvatarModalOpen(false)}
                disabled={savingAvatar}
              >
                Cancelar
              </Button>
              <Button
                variant="primary"
                fullWidth
                onClick={() => handleAvatarChange(selectedAvatarId)}
                disabled={savingAvatar}
              >
                {savingAvatar ? 'Salvando...' : 'Salvar Alteração'}
              </Button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
