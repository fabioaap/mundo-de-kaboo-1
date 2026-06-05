import React from 'react';
import { getCharacterBgColor, getCharacterColor, getCharacterImageUrl } from '../constants';
import { UserProfile } from '../types';

interface UserIdentityCardProps {
  profile: UserProfile;
  collapsed?: boolean;
  active?: boolean;
  onClick?: () => void;
  tone?: 'default' | 'central-coruja';
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

export const UserIdentityCard: React.FC<UserIdentityCardProps> = ({ profile, collapsed = false, active = false, onClick, tone = 'default' }) => {
  const hasAvatar = !!profile.avatar_id;
  const title = profile.full_name || profile.email || 'Perfil';
  const isCentralCoruja = tone === 'central-coruja';

  const collapsedButtonClass = isCentralCoruja
    ? active
      ? 'inline-flex items-center justify-center rounded-[22px] border border-[#7B4F99]/70 bg-brand-light p-2 text-white shadow-[0_12px_24px_rgba(93,30,118,0.26)]'
      : 'inline-flex items-center justify-center rounded-[22px] border border-transparent bg-transparent p-2 text-white hover:bg-white/[0.08] hover:border-white/12'
    : `inline-flex items-center justify-center rounded-[22px] p-2 ${active ? 'bg-brand-primary/10 text-brand-primary shadow-sm' : 'hover:bg-gray-50'}`;

  const expandedButtonClass = isCentralCoruja
    ? active
      ? 'w-full flex items-center gap-3 rounded-[24px] border border-[#7B4F99]/70 bg-brand-light px-4 py-3 text-left text-white shadow-[0_18px_32px_rgba(93,30,118,0.28)] hover:bg-[#6A2586]'
      : 'w-full flex items-center gap-3 rounded-[24px] border border-transparent bg-transparent px-4 py-3 text-left text-white hover:bg-white/[0.08] hover:border-white/12'
    : `w-full flex items-center gap-3 rounded-[24px] border px-4 py-3 text-left ${active ? 'border-brand-primary/15 bg-brand-primary/5 shadow-sm hover:bg-brand-primary/10' : 'border-gray-100 bg-gray-50/80 hover:bg-white hover:border-brand-primary/15'}`;

  const avatarShellClass = isCentralCoruja
    ? 'border-white/12 shadow-[0_10px_20px_rgba(0,0,0,0.22)]'
    : 'border-gray-100 shadow-sm';
  const fallbackAvatarClass = isCentralCoruja ? 'bg-white text-[#0C1A34]' : 'bg-brand-primary text-white';
  const titleClass = isCentralCoruja
    ? active ? 'text-white' : 'text-white/92'
    : active ? 'text-brand-primary' : 'text-gray-800';
  const subtitleClass = isCentralCoruja
    ? active ? 'text-white/72' : 'text-white/60'
    : active ? 'text-gray-500' : 'text-gray-400';

  return (
    <button
      type="button"
      onClick={onClick}
      title={collapsed ? title : undefined}
      aria-label={collapsed ? `Abrir perfil de ${getFirstName(profile.full_name || '')}` : 'Abrir perfil'}
      className={`transition-all duration-200 ${collapsed ? collapsedButtonClass : expandedButtonClass}`}
    >
      <div className={`relative flex h-11 w-11 shrink-0 items-center justify-center overflow-hidden rounded-full border font-bold text-sm ${avatarShellClass} ${hasAvatar ? getCharacterColor(profile.avatar_id) : fallbackAvatarClass}`}>
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
          <p className={`text-sm font-bold ${titleClass}`}>
            Olá, {getFirstName(profile.full_name || '')}
          </p>
          <p className={`truncate text-xs font-medium ${subtitleClass}`}>
            {profile.email || 'Conta ativa'}
          </p>
        </div>
      )}
    </button>
  );
};
