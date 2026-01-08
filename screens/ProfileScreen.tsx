import React, { useEffect, useState } from 'react';
import { Icons } from '../components/Icons';
import { ScreenName, UserProfile } from '../types';
import { supabase } from '../lib/supabase';
import { getCharacterImageUrl, getCharacterColor } from '../constants';
import { canEditCollections, getUserRole } from '../lib/auth';

interface ProfileScreenProps {
  onNavigate: (screen: ScreenName) => void;
}

export const ProfileScreen: React.FC<ProfileScreenProps> = ({ onNavigate }) => {
  const [profile, setProfile] = useState<UserProfile | null>(null);
  const [loading, setLoading] = useState(true);
  const [isEditor, setIsEditor] = useState(false);
  const [userRole, setUserRole] = useState<string | null>(null);
  const [roleLoaded, setRoleLoaded] = useState(false);

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

  return (
    <div className="flex flex-col h-full bg-white pb-24 md:pb-0">
       {/* WHITE HEADER - Standardization */}
       <div className="px-6 pt-12 pb-4 flex items-center justify-between bg-white border-b border-gray-50 sticky top-0 z-30">
          <button 
              onClick={() => onNavigate('home')}
              className="w-10 h-10 rounded-full bg-gray-50 flex items-center justify-center text-gray-800 hover:bg-gray-100 transition-all active:scale-95"
          >
              <Icons.ChevronLeft size={24} />
          </button>
          <span className="font-black text-gray-800">Meu Perfil</span>
          <div className="w-10" />
       </div>

       {/* HERO SECTION - Standard White Background */}
       <div className="px-6 py-8 flex flex-col items-center gap-4 max-w-2xl mx-auto w-full">
            <div className={`w-32 h-32 rounded-full border-4 border-gray-100 flex items-center justify-center shadow-lg overflow-hidden relative ${profile?.avatar_id ? getCharacterColor(profile.avatar_id) : 'bg-gray-50'}`}>
               {loading ? (
                 <div className="animate-pulse w-full h-full bg-gray-100" />
               ) : profile?.avatar_id ? (
                 <>
                  <div className="absolute inset-0 opacity-40 bg-inherit" />
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

            <div className="text-center">
                <h1 className="text-2xl font-black text-gray-800">
                  {loading ? 'Carregando...' : (profile?.full_name || 'Usuário')}
                </h1>
                <p className="text-gray-500 text-sm font-bold mt-1">
                  {loading ? '...' : (profile?.school_name || 'Adicione sua escola')}
                </p>
                {!loading && roleLoaded && userRole && (userRole === 'admin' || userRole === 'editor') && (
                  <div className="mt-2">
                    <span className={`text-xs font-bold px-3 py-1 rounded-full ${
                      userRole === 'admin' 
                        ? 'bg-purple-100 text-purple-700' 
                        : 'bg-blue-100 text-blue-700'
                    }`}>
                      {userRole === 'admin' ? 'Administrador' : 'Editor'}
                    </span>
                  </div>
                )}
                <p className="text-gray-400 text-xs mt-2 bg-gray-100 px-4 py-1.5 rounded-full inline-block font-bold">
                    {profile?.email}
                </p>
            </div>
       </div>

       <div className="px-6 space-y-1 max-w-2xl mx-auto w-full mt-4">
            {[
                { icon: Icons.User, label: 'Meus Dados', action: () => onNavigate('my_data') },
                ...(isEditor ? [{ icon: Icons.Settings, label: 'Gerenciar Coleções', action: () => onNavigate('admin_collections') }] : []),
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
    </div>
  );
};