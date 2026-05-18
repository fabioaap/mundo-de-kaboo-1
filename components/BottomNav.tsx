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

  useEffect(() => {
    try {
      localStorage.setItem(STORAGE_SIDEBAR_COLLAPSED, String(isCollapsed));
    } catch (error) {
      console.warn('Failed to save sidebar state:', error);
    }
  }, [isCollapsed]);

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
    { key: 'music', screen: 'music', icon: Icons.Headphones, label: 'Áudios' },
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

  const mobileNavItems = [
    ...catalogNavItems,
    ...libraryNavItems,
    ...(adminNavItem ? [adminNavItem] : []),
    { key: 'profile', screen: 'profile', icon: Icons.User, label: 'Perfil' },
  ].filter((item): item is NavItem => Boolean(item));

  return (
    <>
      {/* MOBILE BOTTOM NAV */}
      <div className="md:hidden fixed bottom-0 left-0 right-0 bg-white border-t border-gray-100 px-4 py-3 rounded-t-3xl shadow-[0_-4px_20px_rgba(0,0,0,0.05)] z-50">
        <div className="flex items-center gap-3 overflow-x-auto no-scrollbar">
          {mobileNavItems.map((item) => {
            const isActive = isItemActive(item);
            const Icon = item.icon;
            return (
              <button
                key={item.key}
                onClick={() => onNavigate(item.screen, item.params)}
                aria-label={item.label}
                className="flex flex-col items-center gap-1 min-w-[68px] pb-1"
              >
                <div className={`p-2 rounded-xl transition-colors ${isActive ? 'bg-kaboo-primary/10' : 'bg-transparent'}`}>
                  <Icon
                    size={24}
                    className={`transition-colors ${isActive ? 'text-kaboo-primary stroke-[3px]' : 'text-gray-400 stroke-[2px]'}`}
                  />
                </div>
                <span className={`text-[10px] font-bold ${isActive ? 'text-kaboo-primary' : 'text-gray-400'}`}>
                  {item.label}
                </span>
              </button>
            );
          })}
        </div>
      </div>

      {/* DESKTOP SIDEBAR */}
      <div className={`hidden md:flex flex-col h-screen bg-white border-r border-gray-100 shrink-0 z-50 shadow-sm transition-all duration-300 ease-in-out relative ${isCollapsed ? 'w-20' : 'w-64'
        }`}>

        {/* Toggle Button - always at top, on the right edge of sidebar */}
        <button
          onClick={toggleSidebar}
          className="absolute -right-3 top-4 w-6 h-6 flex items-center justify-center bg-white border border-gray-200 rounded-full shadow-sm hover:bg-gray-50 hover:shadow-md transition-all duration-200 z-10"
          aria-label={isCollapsed ? 'Expandir menu' : 'Recolher menu'}
          title={isCollapsed ? 'Expandir menu' : 'Recolher menu'}
        >
          {isCollapsed ? (
            <Icons.ChevronRight size={desktopToggleIconSize} className={desktopToggleIconClass} />
          ) : (
            <Icons.ChevronLeft size={desktopToggleIconSize} className={desktopToggleIconClass} />
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
            <div key={section.title} className={`space-y-2 ${sectionIndex > 0 ? 'pt-4 border-t border-gray-100' : ''}`}>
              {!isCollapsed && (
                <p className="px-4 text-[11px] font-black uppercase tracking-[0.2em] text-gray-300">
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
                    className={`w-full flex items-center rounded-[100px] transition-all duration-200 group ${isCollapsed
                      ? 'justify-center px-3 py-4'
                      : 'gap-4 px-6 py-4'
                      } ${isActive
                        ? 'bg-kaboo-primary text-white shadow-md shadow-kaboo-primary/20'
                        : 'bg-transparent text-gray-500 hover:bg-gray-50'
                      }`}
                  >
                    <Icon
                      size={22}
                      className={isActive ? 'stroke-[2.5px]' : 'stroke-[2px] group-hover:text-kaboo-primary'}
                    />
                    {!isCollapsed && (
                      <span className={`text-sm font-bold ${isActive ? '' : 'group-hover:text-gray-800'}`}>
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
