import React, { useEffect, useState } from 'react';
import { Icons } from '../components/Icons';
import { ScreenName, UserProfile } from '../types';
import { supabase } from '../lib/supabase';
import { getCharacterImageUrl, getCharacterColor, getCharacterBgColor, AVATAR_CHARACTERS } from '../constants';
import { canEditCollections, getUserRole } from '../lib/auth';
import { PageHeader } from '../components/PageHeader';
import { Button } from '../components/Button';

interface ProfileScreenProps {
  onNavigate: (screen: ScreenName) => void;
}

export const ProfileScreen: React.FC<ProfileScreenProps> = ({ onNavigate }) => {
  const [profile, setProfile] = useState<UserProfile | null>(null);
  const [loading, setLoading] = useState(true);
  const [isEditor, setIsEditor] = useState(false);
  const [userRole, setUserRole] = useState<string | null>(null);
  const [roleLoaded, setRoleLoaded] = useState(false);
  const [isAvatarModalOpen, setIsAvatarModalOpen] = useState(false);
  const [savingAvatar, setSavingAvatar] = useState(false);
  const [selectedAvatarId, setSelectedAvatarId] = useState<string | null>(null);

  useEffect(() => {
    getProfile();
    checkEditorPermission();
  }, []);

  const checkEditorPermission = async () => {
    const canEdit = await canEditCollections();
    setIsEditor(canEdit);
    const role = await getUserRole();
    setUserRole(role);
    setRoleLoaded(true);
  };

  const getProfile = async () => {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (user) {
        const { data } = await supabase
          .from('profiles')
          .select('*')
          .eq('id', user.id)
          .single();

        if (data) {
          setProfile(data);
        } else {
             setProfile({
                id: user.id,
                full_name: user.user_metadata?.full_name || 'Professor(a)',
                school_name: null,
                email: user.email || null,
                avatar_id: null
             });
        }
      }
    } catch (error) {
      console.error('Erro ao carregar perfil:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleLogout = async () => {
    await supabase.auth.signOut();
  };

  const getInitials = (name: string) => {
    if (!name) return 'MK';
    return name.trim().split(' ').map(n => n[0]).slice(0, 2).join('').toUpperCase();
  };

  const handleAvatarChange = async (avatarId: string | null) => {
    setSavingAvatar(true);
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error('Usuário não autenticado');

      const { error } = await supabase
        .from('profiles')
        .upsert({
          id: user.id,
          avatar_id: avatarId,
          updated_at: new Date().toISOString(),
        });

      if (error) throw error;

      // Update local state
      setProfile(prev => prev ? { ...prev, avatar_id: avatarId } : null);
      setIsAvatarModalOpen(false);
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
       <div className="px-6 py-8 flex flex-col items-center gap-4 max-w-2xl mx-auto w-full">
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
                    <div className={`absolute inset-0 opacity-40 ${getCharacterBgColor(profile.avatar_id)}`} />
                    <img 
                        src={getCharacterImageUrl(profile.avatar_id)} 
                        alt={profile.avatar_id}
                        className="w-full h-full object-cover relative z-10"
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
                <div className="absolute bottom-1 right-1 w-8 h-8 bg-kaboo-primary rounded-full flex items-center justify-center text-white border-2 border-white shadow-md transition-transform group-hover:scale-110 z-20">
                  <Icons.Settings size={14} />
                </div>
              )}
            </div>

            <div className="text-center">
                {!loading && roleLoaded && userRole && (userRole === 'admin' || userRole === 'editor') && (
                  <div className="mb-2">
                    <span className={`text-xs font-bold px-3 py-1 rounded-full ${
                      userRole === 'admin' 
                        ? 'bg-purple-100 text-purple-700' 
                        : 'bg-blue-100 text-blue-700'
                    }`}>
                      {userRole === 'admin' ? 'Administrador' : 'Editor'}
                    </span>
                  </div>
                )}
                <h1 className="text-2xl font-black text-gray-800">
                  {loading ? 'Carregando...' : (profile?.full_name || 'Usuário')}
                </h1>
                <p className="text-gray-500 text-sm font-medium mt-2 flex items-center justify-center gap-2">
                  <Icons.Home size={16} className="text-gray-500" />
                  {loading ? '...' : (profile?.school_name || 'Adicione sua escola')}
                </p>
                <p className="text-gray-500 text-sm font-medium mt-1 flex items-center justify-center gap-2">
                    <Icons.Mail size={16} className="text-gray-500" />
                    {profile?.email}
                </p>
            </div>
       </div>

       <div className="px-6 space-y-1 max-w-2xl mx-auto w-full mt-4">
            {[
                { icon: Icons.User, label: 'Meus Dados', action: () => onNavigate('my_data') },
                { icon: Icons.Mail, label: 'Fale Conosco', action: () => onNavigate('support') },
                { icon: Icons.LogOut, label: 'Sair do App', color: 'text-red-500', bg: 'bg-red-50', action: handleLogout },
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

      {/* Avatar Selection Modal */}
      {isAvatarModalOpen && (
        <div className="fixed inset-0 z-50 flex items-end md:items-center justify-center">
            <div className="absolute inset-0 bg-black/60 backdrop-blur-sm" onClick={() => setIsAvatarModalOpen(false)} />
            
            <div className="relative w-full md:w-[600px] h-[70vh] md:h-auto md:max-h-[80vh] bg-white rounded-t-3xl md:rounded-3xl shadow-2xl flex flex-col overflow-hidden animate-in slide-in-from-bottom-10 duration-300">
                
                {/* Modal Header */}
                <div className="px-6 py-4 border-b border-gray-100 flex items-center justify-between">
                    <h2 className="text-lg font-bold text-gray-800">Escolha um Personagem</h2>
                    <button onClick={() => setIsAvatarModalOpen(false)} className="w-8 h-8 rounded-full bg-gray-100 flex items-center justify-center text-gray-500 hover:bg-gray-200">
                        <Icons.X size={16} />
                    </button>
                </div>

                {/* Grid */}
                <div className="flex-1 overflow-y-auto p-6 grid grid-cols-3 md:grid-cols-4 gap-4">
                    
                    {/* Default Option (Initials) */}
                    <button 
                        onClick={() => setSelectedAvatarId(null)}
                        disabled={savingAvatar}
                        className="flex flex-col items-center gap-2 group disabled:opacity-50"
                    >
                        <div className={`w-20 h-20 md:w-24 md:h-24 rounded-full flex items-center justify-center bg-gray-100 border-4 border-white shadow-md group-hover:shadow-xl group-hover:scale-105 transition-all duration-300 ${selectedAvatarId === null ? 'ring-4 ring-kaboo-primary ring-offset-2' : ''}`}>
                             <span className="text-2xl font-black text-gray-400 group-hover:text-kaboo-primary transition-colors">
                                {getInitials(profile?.full_name || '')}
                             </span>
                        </div>
                        <span className={`text-xs md:text-sm font-bold text-center leading-tight transition-colors ${selectedAvatarId === null ? 'text-kaboo-primary' : 'text-gray-600'}`}>
                            Usar Sigla
                        </span>
                    </button>

                    {/* Character Options */}
                    {AVATAR_CHARACTERS.map((char) => {
                        const isSelected = selectedAvatarId === char;
                        const charColor = getCharacterColor(char);
                        
                        return (
                            <button
                                key={char}
                                onClick={() => setSelectedAvatarId(char)}
                                disabled={savingAvatar}
                                className="flex flex-col items-center gap-2 group disabled:opacity-50"
                            >
                                <div className={`w-20 h-20 md:w-24 md:h-24 rounded-full shadow-md group-hover:shadow-xl group-hover:scale-105 transition-all duration-300 overflow-hidden border-4 border-white relative ${isSelected ? 'ring-4 ring-kaboo-primary ring-offset-2' : ''} ${charColor}`}>
                                    {/* Background Color Layer */}
                                    <div className={`absolute inset-0 opacity-50 ${getCharacterBgColor(char)}`} />
                                    {/* Image Layer */}
                                    <img 
                                        src={getCharacterImageUrl(char)} 
                                        alt={char} 
                                        className="absolute inset-0 w-full h-full object-cover transition-opacity duration-300 relative z-10"
                                        onError={(e) => { (e.target as HTMLImageElement).style.opacity = '0'; }}
                                    />
                                </div>
                                <span className={`text-xs md:text-sm font-bold text-center leading-tight transition-colors ${isSelected ? 'text-kaboo-primary' : 'text-gray-600'}`}>
                                    {char}
                                </span>
                            </button>
                        );
                    })}
                </div>

                {/* Modal Footer */}
                <div className="px-6 py-4 border-t border-gray-100 flex gap-3">
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