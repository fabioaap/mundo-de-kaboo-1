import React from 'react';
import { getCharacterBgColor, getCharacterColor, getCharacterImageUrl } from '../constants';
import { UserProfile } from '../types';

interface UserIdentityCardProps {
  profile: UserProfile;
  collapsed?: boolean;
  active?: boolean;
  onClick?: () => void;
}

const getInitials = (name: string) => {
  if (!name) return 'P';
  return name
    .trim()
    .split(' ')
    .map(part => part[0])
    .slice(0, 2)
    .join('')
    .toUpperCase();
};

const getFirstName = (name: string) => {
  if (!name) return 'Professor(a)';
  return name.trim().split(' ')[0];
};

export const UserIdentityCard: React.FC<UserIdentityCardProps> = ({ profile, collapsed = false, active = false, onClick }) => {
  const hasAvatar = !!profile.avatar_id;
  const title = profile.full_name || profile.email || 'Perfil';

  return (
    <button
      type="button"
      onClick={onClick}
      title={collapsed ? title : undefined}
      aria-label={collapsed ? `Abrir perfil de ${getFirstName(profile.full_name || '')}` : 'Abrir perfil'}
      className={`transition-all duration-200 ${collapsed
        ? `inline-flex items-center justify-center rounded-[22px] p-2 ${active ? 'bg-kaboo-primary/10 text-kaboo-primary shadow-sm' : 'hover:bg-gray-50'}`
        : `w-full flex items-center gap-3 rounded-[24px] border px-4 py-3 text-left ${active ? 'border-kaboo-primary/15 bg-kaboo-primary/5 shadow-sm hover:bg-kaboo-primary/10' : 'border-gray-100 bg-gray-50/80 hover:bg-white hover:border-kaboo-primary/15'}`
        }`}
    >
      <div className={`relative flex h-11 w-11 shrink-0 items-center justify-center overflow-hidden rounded-full border border-gray-100 font-bold text-sm shadow-sm ${hasAvatar ? getCharacterColor(profile.avatar_id) : 'bg-kaboo-primary text-white'}`}>
        {hasAvatar && (
          <div className={`absolute inset-0 opacity-50 ${getCharacterBgColor(profile.avatar_id)} pointer-events-none`} />
        )}

        <span className="relative z-0">{getInitials(profile.full_name || '')}</span>

        {hasAvatar && (
          <img
            src={getCharacterImageUrl(profile.avatar_id!)}
            alt="Avatar"
            className="absolute inset-0 z-10 h-full w-full object-cover"
            loading="eager"
            fetchPriority="high"
            onError={(event) => {
              event.currentTarget.style.display = 'none';
            }}
          />
        )}
      </div>

      {!collapsed && (
        <div className="min-w-0 flex-1">
          <p className={`text-sm font-bold ${active ? 'text-kaboo-primary' : 'text-gray-800'}`}>
            Olá, {getFirstName(profile.full_name || '')}
          </p>
          <p className={`truncate text-xs font-medium ${active ? 'text-gray-500' : 'text-gray-400'}`}>
            {profile.email || 'Conta ativa'}
          </p>
        </div>
      )}
    </button>
  );
};