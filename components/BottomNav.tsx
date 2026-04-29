import React, { useState, useEffect } from 'react';
import { Icons } from './Icons';
import { ScreenName, UserProfile } from '../types';
import { LOGO_URL, getCharacterImageUrl } from '../constants';
import { UserIdentityCard } from './UserIdentityCard';
import { isSupabaseConfigured } from '../lib/supabase';
import { isDevMockSession } from '../lib/api';
import { getMockCurrentUserRole } from '../lib/mockData';
import { getMockProfile } from '../lib/mockData';

interface BottomNavProps {
  currentScreen: ScreenName;
  onNavigate: (screen: ScreenName, params?: any) => void;
  currentParams?: any;
  profile?: UserProfile | null;
  brandSlug?: string;
  brandLogoUrl?: string;
  brandName?: string;
  /**
   * Conjunto de chaves de menu habilitadas pela configuração de marca.
   * Quando omitido, todos os itens canônicos são exibidos (comportamento padrão).
   */
  enabledMenuKeys?: Set<string>;
}

type NavItem = {
  key: string;
  screen: ScreenName;
  icon: typeof Icons.Library;
  label: string;
  params?: any;
};

const STORAGE_SIDEBAR_COLLAPSED = 'kaboo_sidebar_collapsed';

export const BottomNav: React.FC<BottomNavProps> = ({ currentScreen, onNavigate, currentParams, profile, brandSlug, brandLogoUrl, brandName, enabledMenuKeys }) => {
  /** Retorna true se a chave de menu deve aparecer. Sem restrição = tudo habilitado. */
  const isMenuKeyEnabled = (key: string): boolean =>
    !enabledMenuKeys || enabledMenuKeys.has(key);
  const isCentralCoruja = brandSlug === 'central-coruja';
  const resolvedBrandLogoUrl = brandLogoUrl || (brandSlug === 'kaboo' ? LOGO_URL : undefined);
  const resolvedBrandName = brandName || 'Mundo de Kaboo';
  const footerBrandLabel = `${resolvedBrandName} © 2025`;
  const corujaMascotUrl = isCentralCoruja ? getCharacterImageUrl('gaio') : '';
  const [isCollapsed, setIsCollapsed] = useState(() => {
    try {
      const saved = localStorage.getItem(STORAGE_SIDEBAR_COLLAPSED);
      return saved === 'true';
    } catch {
      return false;
    }
  });
  const [isMoreMenuOpen, setIsMoreMenuOpen] = useState(false);

  useEffect(() => {
    try {
      localStorage.setItem(STORAGE_SIDEBAR_COLLAPSED, String(isCollapsed));
    } catch (error) {
      console.warn('Failed to save sidebar state:', error);
    }
  }, [isCollapsed]);

  useEffect(() => {
    setIsMoreMenuOpen(false);
  }, [currentScreen]);

  const toggleSidebar = () => {
    setIsCollapsed(!isCollapsed);
  };

  const fallbackRole = !profile && (!isSupabaseConfigured || isDevMockSession())
    ? getMockCurrentUserRole()
    : null;
  const fallbackProfile = !profile && (!isSupabaseConfigured || isDevMockSession())
    ? getMockProfile()
    : null;
  const effectiveProfile = profile ?? fallbackProfile;
  const effectiveRole = profile?.role ?? fallbackRole;
  const canEdit = effectiveRole === 'admin' || effectiveRole === 'editor';
  const isProfileSection = currentScreen === 'profile' || currentScreen === 'my_data';
  const currentCollectionGroup = currentParams?.collectionGroup === 'books' ? 'books' : 'kits';

  const isItemActive = (item: NavItem) => {
    if (item.key === 'profile') {
      return isProfileSection;
    }

    if (item.screen === 'home') {
      if (!(currentScreen === 'home' || currentScreen === 'search' || currentScreen === 'characters')) {
        return false;
      }

      const itemCollectionGroup = item.params?.collectionGroup === 'books' ? 'books' : 'kits';
      return currentCollectionGroup === itemCollectionGroup;
    }

    return currentScreen === item.screen;
  };

  const catalogNavItems: NavItem[] = ([
    { key: 'collections', screen: 'home', icon: Icons.Library, label: 'Coleções', params: { collectionGroup: 'kits' } },
    { key: 'books', screen: 'home', icon: Icons.BookOpen, label: 'Livros', params: { collectionGroup: 'books' } },
  ] as NavItem[]).filter(item => isMenuKeyEnabled(item.key));

  const libraryNavItems: NavItem[] = ([
    { key: 'videos', screen: 'videos', icon: Icons.Video, label: 'Vídeos' },
    { key: 'music', screen: 'music', icon: Icons.Headphones, label: 'Músicas' },
    { key: 'formations', screen: 'formations', icon: Icons.BookOpen, label: 'Formações' },
    { key: 'materials', screen: 'materials', icon: Icons.FileText, label: 'Materiais' },
  ] as NavItem[]).filter(item => isMenuKeyEnabled(item.key));

  // Add admin collections item if user has permission
  const adminNavItem: NavItem | null = canEdit
    ? { key: 'admin', screen: 'admin', icon: Icons.Settings, label: 'Gerenciar' }
    : null;

  const corujaDesktopNavItems: NavItem[] = ([
    { key: 'collections', screen: 'home', icon: Icons.Library, label: 'Coleções', params: { collectionGroup: 'kits' } },
    { key: 'search', screen: 'search', icon: Icons.Search, label: 'Buscar' },
    { key: 'formations', screen: 'formations', icon: Icons.BookOpen, label: 'Academia' },
    { key: 'materials', screen: 'materials', icon: Icons.FileText, label: 'Materiais' },
    { key: 'profile', screen: 'profile', icon: Icons.User, label: 'Perfil' },
    { key: 'support', screen: 'support', icon: Icons.HelpCircle, label: 'Suporte' },
  ] as NavItem[]).filter((item) => {
    if (item.key === 'search' || item.key === 'profile' || item.key === 'support') {
      return true;
    }

    return isMenuKeyEnabled(item.key);
  });

  const desktopNavSections = isCentralCoruja
    ? [{ title: '', items: corujaDesktopNavItems }]
    : [
      { title: 'Acervo', items: catalogNavItems },
      { title: 'Bibliotecas', items: libraryNavItems },
      ...(adminNavItem ? [{ title: 'Gestão', items: [adminNavItem] }] : []),
    ];

  const footerNavItems: NavItem[] = isCentralCoruja && adminNavItem ? [adminNavItem] : [];

  const mobilePrimaryNavItems: NavItem[] = [
    catalogNavItems[0],
    catalogNavItems[1],
    libraryNavItems[0],
    libraryNavItems[1],
  ].filter((item): item is NavItem => Boolean(item));

  const mobileMoreNavItems: NavItem[] = [
    libraryNavItems[2],
    libraryNavItems[3],
    ...(adminNavItem ? [adminNavItem] : []),
    { key: 'profile', screen: 'profile', icon: Icons.User, label: 'Perfil' },
  ].filter((item): item is NavItem => Boolean(item));

  const isMoreItemActive = mobileMoreNavItems.some((item) => isItemActive(item));

  const handleMobileNavigate = (screen: ScreenName, params?: any) => {
    setIsMoreMenuOpen(false);
    onNavigate(screen, params);
  };

  const desktopShellClass = isCentralCoruja
    ? 'bg-[radial-gradient(58%_30%_at_50%_0%,rgba(250,204,21,0.18),transparent_80%),radial-gradient(40%_22%_at_0%_35%,rgba(168,85,247,0.16),transparent_80%),linear-gradient(180deg,#12233f_0%,#10213a_55%,#132a38_100%)] border-r border-emerald-950/50 shadow-[16px_0_48px_rgba(6,18,31,0.35)]'
    : 'bg-white border-r border-gray-100 shadow-sm';
  const desktopToggleClass = isCentralCoruja
    ? 'bg-[#173052] border-[#2b4f6d] hover:bg-[#1c3a61]'
    : 'bg-white border-gray-200 hover:bg-gray-50';
  const desktopSectionTitleClass = isCentralCoruja
    ? 'text-[#d9d7b0]/55'
    : 'text-gray-300/90';
  const desktopItemActiveClass = isCentralCoruja
    ? 'bg-[linear-gradient(135deg,#612d8f_0%,#8642bf_100%)] text-[#fff3bb] shadow-[0_14px_32px_rgba(92,41,139,0.42)]'
    : 'bg-kaboo-primary text-white shadow-md shadow-kaboo-primary/20';
  const desktopItemInactiveClass = isCentralCoruja
    ? 'bg-transparent text-[#efe2a8] hover:bg-white/6'
    : 'bg-transparent text-gray-500 hover:bg-gray-50/90';
  const desktopFooterTextClass = isCentralCoruja
    ? 'text-[#cfd8c9]/45'
    : 'text-gray-300';

  return (
    <>
      {/* MOBILE BOTTOM NAV */}
      <div className="md:hidden fixed bottom-0 left-0 right-0 border-t border-gray-100/90 bg-white/95 backdrop-blur-md px-3 pb-[calc(env(safe-area-inset-bottom)+10px)] pt-2 rounded-t-3xl shadow-[0_-8px_24px_rgba(15,23,42,0.08)] z-50">
        <div className="grid grid-cols-5 gap-1">
          {mobilePrimaryNavItems.map((item) => {
            const isActive = isItemActive(item);
            const Icon = item.icon;
            return (
              <button
                key={item.key}
                onClick={() => handleMobileNavigate(item.screen, item.params)}
                aria-label={item.label}
                className={`flex min-h-[58px] flex-col items-center justify-center gap-1 rounded-2xl transition-all duration-200 ${isActive ? 'bg-kaboo-primary/[0.07]' : 'hover:bg-gray-50 active:scale-[0.98]'}`}
              >
                <div className={`rounded-xl p-2 transition-colors ${isActive ? 'bg-kaboo-primary/12' : 'bg-transparent'}`}>
                  <Icon
                    size={22}
                    className={`transition-colors ${isActive ? 'text-kaboo-primary stroke-[3px]' : 'text-gray-400 stroke-[2px]'}`}
                  />
                </div>
                <span className={`text-[10px] font-bold leading-none ${isActive ? 'text-kaboo-primary' : 'text-gray-400'}`}>
                  {item.label}
                </span>
              </button>
            );
          })}

          <button
            onClick={() => setIsMoreMenuOpen((open) => !open)}
            aria-label={isMoreMenuOpen ? 'Fechar menu' : 'Abrir mais opções'}
            className={`flex min-h-[58px] flex-col items-center justify-center gap-1 rounded-2xl transition-all duration-200 ${isMoreItemActive || isMoreMenuOpen ? 'bg-kaboo-primary/[0.07]' : 'hover:bg-gray-50 active:scale-[0.98]'}`}
          >
            <div className={`rounded-xl p-2 transition-colors ${isMoreItemActive || isMoreMenuOpen ? 'bg-kaboo-primary/12' : 'bg-transparent'}`}>
              <Icons.MoreHorizontal size={22} className={`transition-colors ${isMoreItemActive || isMoreMenuOpen ? 'text-kaboo-primary stroke-[2.8px]' : 'text-gray-400 stroke-[2px]'}`} />
            </div>
            <span className={`text-[10px] font-bold leading-none ${isMoreItemActive || isMoreMenuOpen ? 'text-kaboo-primary' : 'text-gray-400'}`}>
              Mais
            </span>
          </button>
        </div>
      </div>

      {isMoreMenuOpen && (
        <div className="md:hidden fixed inset-0 z-40 bg-black/35 backdrop-blur-[1px]" onClick={() => setIsMoreMenuOpen(false)}>
          <div
            className="absolute bottom-[88px] left-3 right-3 rounded-2xl border border-gray-100 bg-white p-3 shadow-2xl"
            onClick={(event) => event.stopPropagation()}
          >
            <p className="px-2 pb-2 text-[11px] font-black uppercase tracking-[0.15em] text-gray-400">Mais opções</p>
            <div className="space-y-1">
              {mobileMoreNavItems.map((item) => {
                const isActive = isItemActive(item);
                const Icon = item.icon;
                return (
                  <button
                    key={item.key}
                    onClick={() => handleMobileNavigate(item.screen, item.params)}
                    aria-label={item.label}
                    className={`flex min-h-[48px] w-full items-center gap-3 rounded-xl px-3 transition-all duration-200 ${isActive ? 'bg-kaboo-primary text-white shadow-sm shadow-kaboo-primary/25' : 'bg-gray-50 text-gray-700 hover:bg-gray-100 active:scale-[0.99]'}`}
                  >
                    <Icon size={18} className={isActive ? 'stroke-[2.5px]' : 'stroke-[2px]'} />
                    <span className="text-sm font-bold">{item.label}</span>
                  </button>
                );
              })}
            </div>
          </div>
        </div>
      )}

      {/* DESKTOP SIDEBAR */}
      <div className={`hidden md:flex flex-col h-screen shrink-0 z-50 transition-all duration-300 ease-in-out relative ${desktopShellClass} ${isCollapsed ? 'w-20' : 'w-[268px]'
        }`}>
        {isCentralCoruja && (
          <div className="pointer-events-none absolute inset-0 overflow-hidden">
            <div className="absolute -top-10 left-1/2 h-40 w-40 -translate-x-1/2 rounded-full bg-emerald-300/10 blur-3xl" />
            <div className="absolute top-40 -left-10 h-32 w-32 rounded-full bg-fuchsia-400/10 blur-3xl" />
            <div className="absolute bottom-24 -right-12 h-44 w-44 rounded-full bg-amber-300/10 blur-3xl" />
          </div>
        )}

        {/* Toggle Button - Top Border */}
        <button
          onClick={toggleSidebar}
          className={`absolute -right-3 top-4 w-6 h-6 flex items-center justify-center border rounded-full shadow-sm hover:shadow-md hover:scale-105 transition-all duration-200 z-10 ${desktopToggleClass}`}
          aria-label={isCollapsed ? 'Expandir menu' : 'Recolher menu'}
          title={isCollapsed ? 'Expandir menu' : 'Recolher menu'}
        >
          {isCollapsed ? (
            <Icons.ChevronRight size={14} className={isCentralCoruja ? 'text-[#fff3bb]' : 'text-gray-600'} />
          ) : (
            <Icons.ChevronLeft size={14} className={isCentralCoruja ? 'text-[#fff3bb]' : 'text-gray-600'} />
          )}
        </button>

        {/* Logo Area - Clickable */}
        <button
          onClick={() => onNavigate('home')}
          className={`relative z-10 w-full flex justify-center hover:opacity-80 transition-opacity focus:outline-none ${isCollapsed ? 'p-4' : 'p-8'
            }`}
          aria-label="Ir para o Início"
          title="Ir para o Início"
        >
          {!isCollapsed && (
            resolvedBrandLogoUrl ? (
              <img src={resolvedBrandLogoUrl} alt={resolvedBrandName} className="w-32 h-auto" />
            ) : (
              <div className={`px-4 py-3 text-center text-base font-black leading-tight shadow-sm ${isCentralCoruja
                ? 'rounded-[26px] border border-white/15 bg-white/10 text-[#fff2b8] backdrop-blur-sm'
                : 'rounded-[28px] border border-gray-200 bg-white text-gray-800'}`}>
                {resolvedBrandName}
              </div>
            )
          )}
          {isCollapsed && (
            resolvedBrandLogoUrl ? (
              <img src={resolvedBrandLogoUrl} alt={resolvedBrandName} className="w-10 h-auto" />
            ) : (
              <div className={`flex h-10 w-10 items-center justify-center rounded-full text-sm font-black shadow-sm ${isCentralCoruja
                ? 'border border-white/15 bg-white/10 text-[#fff2b8] backdrop-blur-sm'
                : 'border border-gray-200 bg-white text-gray-800'}`}>
                {resolvedBrandName.charAt(0)}
              </div>
            )
          )}
        </button>

        {/* Nav Items */}
        <div className={`relative z-10 flex-1 space-y-4 py-4 transition-all duration-300 ${isCollapsed ? 'px-2' : 'px-4'
          }`}>
          {desktopNavSections.map((section, sectionIndex) => (
            <div key={`${section.title}-${sectionIndex}`} className={`space-y-2 ${sectionIndex > 0 ? 'pt-4 border-t border-gray-100' : ''}`}>
              {!isCollapsed && section.title && (
                <p className={`px-4 text-[11px] font-black uppercase tracking-[0.2em] ${desktopSectionTitleClass}`}>
                  {section.title}
                </p>
              )}

              {section.items.map((item) => {
                const isActive = isItemActive(item);
                const Icon = item.icon;
                return (
                  <button
                    key={item.key}
                    onClick={() => onNavigate(item.screen, item.params)}
                    aria-label={item.label}
                    className={`relative w-full flex items-center rounded-[100px] transition-all duration-200 group ${isCollapsed
                      ? 'justify-center px-3 py-4'
                      : 'gap-4 px-6 py-4'
                      } ${isActive
                        ? desktopItemActiveClass
                        : desktopItemInactiveClass
                      }`}
                  >
                    {!isCollapsed && isActive && (
                      <span className={`absolute left-2 h-5 w-1 rounded-full ${isCentralCoruja ? 'bg-[#ffe994]' : 'bg-white/85'}`} aria-hidden="true" />
                    )}
                    <Icon
                      size={22}
                      className={isActive ? 'stroke-[2.5px]' : `stroke-[2px] ${isCentralCoruja ? 'group-hover:text-white' : 'group-hover:text-kaboo-primary'}`}
                    />
                    {!isCollapsed && (
                      <span className={`text-sm font-bold ${isActive ? '' : isCentralCoruja ? 'group-hover:text-white' : 'group-hover:text-gray-800'}`}>
                        {item.label}
                      </span>
                    )}
                  </button>
                );
              })}
            </div>
          ))}
        </div>

        {/* Footer */}
        <div className={`relative z-10 transition-all duration-300 ${isCentralCoruja ? 'border-t border-white/10' : 'border-t border-gray-100'} ${isCollapsed ? 'px-2 py-4' : 'px-4 pt-4 pb-6'}`}>
          <div className="space-y-2">
            {footerNavItems.map((item) => {
              const isActive = isItemActive(item);
              const Icon = item.icon;

              return (
                <button
                  key={item.key}
                  onClick={() => onNavigate(item.screen, item.params)}
                  aria-label={item.label}
                  className={`w-full flex items-center rounded-[100px] transition-all duration-200 group ${isCollapsed
                    ? 'justify-center px-3 py-4'
                    : 'gap-4 px-6 py-4'
                    } ${isActive
                      ? desktopItemActiveClass
                      : desktopItemInactiveClass
                    }`}
                >
                  <Icon
                    size={22}
                    className={isActive ? 'stroke-[2.5px]' : `stroke-[2px] ${isCentralCoruja ? 'group-hover:text-white' : 'group-hover:text-kaboo-primary'}`}
                  />
                  {!isCollapsed && (
                    <span className={`text-sm font-bold ${isActive ? '' : isCentralCoruja ? 'group-hover:text-white' : 'group-hover:text-gray-800'}`}>
                      {item.label}
                    </span>
                  )}
                </button>
              );
            })}
          </div>

          {effectiveProfile && !isCentralCoruja && (
            <div className={`${isCollapsed ? 'flex justify-center' : ''} ${footerNavItems.length > 0 ? 'mt-4' : ''}`}>
              <UserIdentityCard
                profile={effectiveProfile}
                collapsed={isCollapsed}
                active={isProfileSection}
                onClick={() => onNavigate('profile')}
              />
            </div>
          )}

          {!isCollapsed && (
            <div className={`pt-4 text-center text-xs ${desktopFooterTextClass}`}>
              {isCentralCoruja && corujaMascotUrl && (
                <div className="mb-4 flex flex-col items-start gap-3 rounded-[28px] border border-white/8 bg-white/5 px-4 py-4 text-left shadow-[0_18px_36px_rgba(5,12,24,0.24)] backdrop-blur-sm">
                  <div className="flex items-end gap-3">
                    <img src={corujaMascotUrl} alt="Mascote Central Coruja" className="h-20 w-20 object-contain drop-shadow-[0_10px_22px_rgba(0,0,0,0.28)]" />
                    <div>
                      <p className="text-lg font-black leading-none text-[#f8edb5]">educacross</p>
                      <p className="mt-1 max-w-[9rem] text-[11px] font-medium leading-relaxed text-[#aab7c8]">Todos os direitos reservados.</p>
                    </div>
                  </div>
                </div>
              )}

              {isCentralCoruja ? (
                <p className="mt-1 text-[11px] font-medium tracking-[0.12em] text-[#93a8bc]">Versão 2.1</p>
              ) : (
                <>
                  <p>{footerBrandLabel}</p>
                  <p className="mt-1">Versão 2.1</p>
                </>
              )}
            </div>
          )}
        </div>
      </div>
    </>
  );
};