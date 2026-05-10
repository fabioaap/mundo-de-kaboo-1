import React, { useState, useEffect } from 'react';
import { Icons } from './Icons';
import { ScreenName, UserProfile } from '../types';
import { LOGO_URL } from '../constants';
import { UserIdentityCard } from './UserIdentityCard';
import { isSupabaseConfigured } from '../lib/supabase';
import { isDevMockSession } from '../lib/api';
import { getMockCurrentUserRole } from '../lib/mockData';
import { getMockProfile } from '../lib/mockData';
import { layoutSpacing } from '../design-system/layout/spacing';

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

  // Auto-collapse when entering the admin screen to give space to the secondary sidebar
  useEffect(() => {
    if (currentScreen === 'admin') {
      setIsCollapsed(true);
    }
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


  const desktopNavSections = [
    { title: 'Acervo', items: catalogNavItems },
    { title: 'Bibliotecas', items: libraryNavItems },
    ...(adminNavItem ? [{ title: 'Gestão', items: [adminNavItem] }] : []),
  ];

  const footerNavItems: NavItem[] = [];

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
    ? 'bg-kaboo-primary'
    : 'bg-kaboo-bg border-r border-kaboo-primary/10 shadow-sm';
  const desktopToggleClass = isCentralCoruja
    ? 'bg-kaboo-primary border-white/15 hover:bg-white/[0.08]'
    : 'bg-kaboo-bg border-kaboo-primary/20 hover:bg-kaboo-primary/5';
  const desktopToggleIconClass = isCentralCoruja ? 'text-white/85' : 'text-gray-600';
  const desktopSectionTitleClass = isCentralCoruja ? 'text-white/45' : 'text-kaboo-primary/50';
  const desktopSectionDividerClass = isCentralCoruja ? 'border-white/10' : 'border-kaboo-primary/10';
  const desktopItemActiveClass = isCentralCoruja
    ? 'bg-kaboo-light text-white shadow-md shadow-black/20'
    : 'bg-kaboo-primary text-white shadow-md shadow-kaboo-primary/20';
  const desktopItemInactiveClass = isCentralCoruja
    ? 'bg-transparent text-white/78 hover:bg-white/[0.07] hover:text-white'
    : 'bg-transparent text-gray-500 hover:bg-kaboo-primary/[0.06]';
  const desktopItemInactiveHoverIconClass = isCentralCoruja ? 'group-hover:text-white' : 'group-hover:text-kaboo-primary';
  const desktopItemInactiveHoverLabelClass = isCentralCoruja ? 'group-hover:text-white' : 'group-hover:text-kaboo-primary';
  const desktopFooterTextClass = isCentralCoruja ? 'text-white/45' : 'text-kaboo-primary/40';
  const desktopSectionPaddingClass = isCollapsed
    ? 'px-2'
    : isCentralCoruja
      ? 'px-4'
      : 'px-4';
  const desktopFooterPaddingClass = isCollapsed
    ? 'px-2 py-4'
    : isCentralCoruja
      ? 'px-4 pt-4 pb-6'
      : 'px-4 pt-4 pb-6';
  const desktopFooterTextOffsetClass = '';

  return (
    <>
      {/* MOBILE BOTTOM NAV */}
      <div className={`md:hidden fixed bottom-0 left-0 right-0 border-t border-gray-100/90 bg-white/95 backdrop-blur-md rounded-t-3xl shadow-[0_-8px_24px_rgba(15,23,42,0.08)] z-50 ${layoutSpacing.bottomNavShell}`}>
        <div className="grid grid-cols-5 gap-1">
          {mobilePrimaryNavItems.map((item) => {
            const isActive = isItemActive(item);
            const Icon = item.icon;
            return (
              <button
                key={item.key}
                onClick={() => handleMobileNavigate(item.screen, item.params)}
                aria-label={item.label}
                className={`flex min-h-[58px] flex-col items-center justify-center gap-1 rounded-2xl transition-[background-color,transform] duration-150 ${isActive ? 'bg-kaboo-primary/[0.07]' : 'hover:bg-gray-50 active:scale-[0.98]'}`}
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
            className={`flex min-h-[58px] flex-col items-center justify-center gap-1 rounded-2xl transition-[background-color,transform] duration-150 ${isMoreItemActive || isMoreMenuOpen ? 'bg-kaboo-primary/[0.07]' : 'hover:bg-gray-50 active:scale-[0.98]'}`}
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
            className={`absolute rounded-2xl border border-gray-100 bg-white shadow-2xl ${layoutSpacing.bottomNavPopover}`}
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
                    className={`flex min-h-[48px] w-full items-center gap-3 rounded-xl px-3 transition-[background-color,color,transform,box-shadow] duration-150 ${isActive ? 'bg-kaboo-primary text-white shadow-sm shadow-kaboo-primary/25' : 'bg-gray-50 text-gray-700 hover:bg-gray-100 active:scale-[0.99]'}`}
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
      <div className={`hidden md:flex flex-col h-screen shrink-0 z-50 transition-[width] duration-180 ease-out relative ${desktopShellClass} ${isCollapsed ? 'w-20 overflow-visible' : 'w-[268px] overflow-hidden'
        }`}>

        {/* Toggle Button - always at top, on the right edge of sidebar */}
        <button
          onClick={toggleSidebar}
          className={`absolute top-4 -right-3 w-6 h-6 flex items-center justify-center border rounded-full shadow-sm hover:shadow-md hover:scale-105 transition-[transform,box-shadow,background-color,border-color] duration-150 z-20 ${desktopToggleClass}`}
          aria-label={isCollapsed ? 'Expandir menu' : 'Recolher menu'}
          title={isCollapsed ? 'Expandir menu' : 'Recolher menu'}
        >
          {isCollapsed ? (
            <Icons.ChevronRight size={14} className={desktopToggleIconClass} />
          ) : (
            <Icons.ChevronLeft size={14} className={desktopToggleIconClass} />
          )}
        </button>

        {/* Logo Area - Clickable */}
        <button
          onClick={() => onNavigate('home')}
          className={`relative z-10 w-full flex justify-center hover:opacity-80 transition-opacity duration-150 focus:outline-none ${isCollapsed ? 'p-4' : 'p-8'
            }`}
          aria-label="Ir para o Início"
          title="Ir para o Início"
        >
          {!isCollapsed && (
            resolvedBrandLogoUrl ? (
              <img src={resolvedBrandLogoUrl} alt={resolvedBrandName} className="w-32 h-auto" />
            ) : (
              <div className="px-4 py-3 text-center text-base font-black leading-tight shadow-sm rounded-[28px] border border-gray-200 bg-white text-gray-800">
                {resolvedBrandName}
              </div>
            )
          )}
          {isCollapsed && (
            resolvedBrandLogoUrl ? (
              <img src={resolvedBrandLogoUrl} alt={resolvedBrandName} className="w-10 h-auto" />
            ) : (
              <div className="flex h-10 w-10 items-center justify-center rounded-full text-sm font-black shadow-sm border border-gray-200 bg-white text-gray-800">
                {resolvedBrandName.charAt(0)}
              </div>
            )
          )}
        </button>

        {/* Nav Items */}
        <div className={`relative z-10 flex-1 space-y-4 py-4 transition-[padding] duration-180 ease-out ${desktopSectionPaddingClass}`}>
          {desktopNavSections.map((section, sectionIndex) => (
            <div key={`${section.title}-${sectionIndex}`} className={`space-y-2 ${sectionIndex > 0 ? `pt-4 border-t ${desktopSectionDividerClass}` : ''}`}>
              {!isCollapsed && section.title && (
                <p className={`px-4 text-[11px] font-black uppercase tracking-[0.2em] ${desktopSectionTitleClass}`}>
                  {section.title}
                </p>
              )}

              {section.items.map((item) => {
                const isActive = isItemActive(item);
                const Icon = item.icon;
                return (
                  <div key={item.key} className={`relative ${isCollapsed ? 'group/tooltip' : ''}`}>
                    {isCollapsed && (
                      <div className="pointer-events-none absolute left-full top-1/2 z-50 ml-3 -translate-y-1/2 whitespace-nowrap rounded-lg px-3 py-1.5 text-xs font-bold shadow-lg opacity-0 transition-opacity duration-150 group-hover/tooltip:opacity-100 group-hover/tooltip:pointer-events-none select-none
                        bg-gray-900 text-white">
                        {item.label}
                        <span className="absolute right-full top-1/2 -translate-y-1/2 border-4 border-transparent border-r-gray-900" />
                      </div>
                    )}
                    <button
                      onClick={() => onNavigate(item.screen, item.params)}
                      aria-label={item.label}
                      className={`relative w-full flex items-center rounded-[100px] transition-[background-color,color,transform,box-shadow,padding] duration-150 group ${isCollapsed
                        ? 'justify-center px-[var(--space-drawer-inset)] py-[var(--space-modal-header-y)]'
                        : 'gap-4 px-[var(--space-page-x)] py-[var(--space-modal-header-y)]'
                        } ${isActive
                          ? desktopItemActiveClass
                          : desktopItemInactiveClass
                        }`}
                    >
                       {!isCollapsed && isActive && (
                         isCentralCoruja ? (
                            <span
                              className="absolute left-[0.42rem] flex h-5 w-5 items-center justify-center text-[#FFB347] drop-shadow-[0_0_8px_rgba(255,179,71,0.28)]"
                              style={{ transform: 'translateX(-4px)' }}
                              aria-hidden="true"
                            >
                              <Icons.Feather
                                size={14}
                                className="stroke-[2.35px]"
                                style={{ transform: 'scaleX(-1) rotate(18deg)' }}
                              />
                           </span>
                         ) : (
                           <span className="absolute left-2 h-5 w-1 rounded-full bg-white/85" aria-hidden="true" />
                         )
                       )}
                       <Icon
                         size={22}
                         className={isActive ? 'stroke-[2.5px]' : `stroke-[2px] ${desktopItemInactiveHoverIconClass}`}
                       />
                       {!isCollapsed && (
                         <span className={`text-sm font-bold ${isActive ? '' : desktopItemInactiveHoverLabelClass}`}>
                           {item.label}
                         </span>
                       )}
                    </button>
                  </div>
                );
              })}
            </div>
          ))}
        </div>

        {/* Footer */}
        <div className={`relative z-10 transition-[padding] duration-180 ease-out border-t ${desktopSectionDividerClass} ${desktopFooterPaddingClass}`}>
          <div className="space-y-2">
            {footerNavItems.map((item) => {
              const isActive = isItemActive(item);
              const Icon = item.icon;

              return (
                <div key={item.key} className={`relative ${isCollapsed ? 'group/tooltip' : ''}`}>
                  {isCollapsed && (
                    <div className="pointer-events-none absolute left-full top-1/2 z-50 ml-3 -translate-y-1/2 whitespace-nowrap rounded-lg px-3 py-1.5 text-xs font-bold shadow-lg opacity-0 transition-opacity duration-150 group-hover/tooltip:opacity-100 select-none bg-gray-900 text-white">
                      {item.label}
                      <span className="absolute right-full top-1/2 -translate-y-1/2 border-4 border-transparent border-r-gray-900" />
                    </div>
                  )}
                  <button
                    onClick={() => onNavigate(item.screen, item.params)}
                    aria-label={item.label}
                    className={`w-full flex items-center rounded-[100px] transition-[background-color,color,transform,box-shadow,padding] duration-150 group ${isCollapsed
                      ? 'justify-center px-[var(--space-drawer-inset)] py-[var(--space-modal-header-y)]'
                      : 'gap-4 px-[var(--space-page-x)] py-[var(--space-modal-header-y)]'
                      } ${isActive
                        ? desktopItemActiveClass
                        : desktopItemInactiveClass
                      }`}
                  >
                    <Icon
                      size={22}
                      className={isActive ? 'stroke-[2.5px]' : `stroke-[2px] ${desktopItemInactiveHoverIconClass}`}
                    />
                    {!isCollapsed && (
                      <span className={`text-sm font-bold ${isActive ? '' : desktopItemInactiveHoverLabelClass}`}>
                        {item.label}
                      </span>
                    )}
                  </button>
                </div>
              );
            })}
          </div>

          {effectiveProfile && (
            <div className={`${isCollapsed ? 'flex justify-center' : ''} ${footerNavItems.length > 0 ? 'mt-4' : ''}`}>
              <UserIdentityCard
                profile={effectiveProfile}
                collapsed={isCollapsed}
                active={isProfileSection}
                tone={isCentralCoruja ? 'central-coruja' : 'default'}
                onClick={() => onNavigate('profile')}
              />
            </div>
          )}

          {!isCollapsed && (
            <div className={`pt-4 text-center text-xs ${desktopFooterTextClass} ${desktopFooterTextOffsetClass}`}>
              <p>{footerBrandLabel}</p>
              <p className="mt-1">Versão 2.1</p>
            </div>
          )}
        </div>
      </div>
    </>
  );
};
