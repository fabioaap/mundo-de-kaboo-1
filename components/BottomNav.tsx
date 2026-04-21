import React, { useState, useEffect } from 'react';
import { Icons } from './Icons';
import { ScreenName, UserProfile } from '../types';
import { LOGO_URL } from '../constants';
import { UserIdentityCard } from './UserIdentityCard';

interface BottomNavProps {
  currentScreen: ScreenName;
  onNavigate: (screen: ScreenName, params?: any) => void;
  profile?: UserProfile | null;
}

const STORAGE_SIDEBAR_COLLAPSED = 'kaboo_sidebar_collapsed';

export const BottomNav: React.FC<BottomNavProps> = ({ currentScreen, onNavigate, profile }) => {
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

  const canEdit = profile?.role === 'admin' || profile?.role === 'editor';
  const isProfileSection = currentScreen === 'profile' || currentScreen === 'my_data';

  const isItemActive = (itemId: string) => {
    if (itemId === 'home') {
      return currentScreen === 'home' || currentScreen === 'search' || currentScreen === 'characters';
    }

    if (itemId === 'profile') {
      return isProfileSection;
    }

    return currentScreen === itemId;
  };

  const baseNavItems = [
    { id: 'home', icon: Icons.Library, label: 'Coleções' },
    { id: 'support', icon: Icons.HelpCircle, label: 'Suporte' },
  ];

  // Add admin collections item if user has permission
  const adminNavItem = canEdit
    ? { id: 'admin', icon: Icons.Settings, label: 'Gerenciar' }
    : null;

  const desktopNavItems = [
    ...baseNavItems,
    ...(adminNavItem ? [adminNavItem] : []),
  ];

  const mobileNavItems = [
    ...desktopNavItems,
    { id: 'profile', icon: Icons.User, label: 'Perfil' },
  ];

  return (
    <>
      {/* MOBILE BOTTOM NAV */}
      <div className="md:hidden fixed bottom-0 left-0 right-0 bg-white border-t border-gray-100 px-6 py-4 pb-4 rounded-t-3xl shadow-[0_-4px_20px_rgba(0,0,0,0.05)] z-50">
        <div className="flex justify-between items-center max-w-md mx-auto">
          {mobileNavItems.map((item) => {
            const isActive = isItemActive(item.id);
            const Icon = item.icon;
            return (
              <button
                key={item.id}
                onClick={() => onNavigate(item.id as ScreenName)}
                aria-label={item.label}
                className="flex flex-col items-center gap-1 min-w-[64px]"
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
        {/* Toggle Button - Top Border */}
        <button
          onClick={toggleSidebar}
          className="absolute -right-3 top-4 w-6 h-6 flex items-center justify-center bg-white border border-gray-200 rounded-full shadow-sm hover:bg-gray-50 hover:shadow-md transition-all duration-200 z-10"
          aria-label={isCollapsed ? 'Expandir menu' : 'Recolher menu'}
          title={isCollapsed ? 'Expandir menu' : 'Recolher menu'}
        >
          {isCollapsed ? (
            <Icons.ChevronRight size={14} className="text-gray-600" />
          ) : (
            <Icons.ChevronLeft size={14} className="text-gray-600" />
          )}
        </button>

        {/* Logo Area - Clickable */}
        <button
          onClick={() => onNavigate('home')}
          className={`w-full flex justify-center hover:opacity-80 transition-opacity focus:outline-none ${isCollapsed ? 'p-4' : 'p-8'
            }`}
          aria-label="Ir para o Início"
          title="Ir para o Início"
        >
          {!isCollapsed && (
            <img src={LOGO_URL} alt="Kaboo" className="w-32 h-auto" />
          )}
          {isCollapsed && (
            <img src={LOGO_URL} alt="Kaboo" className="w-10 h-auto" />
          )}
        </button>

        {/* Nav Items */}
        <div className={`flex-1 space-y-2 py-4 transition-all duration-300 ${isCollapsed ? 'px-2' : 'px-4'
          }`}>
          {desktopNavItems.map((item) => {
            const isActive = isItemActive(item.id);
            const Icon = item.icon;
            return (
              <button
                key={item.id}
                onClick={() => onNavigate(item.id as ScreenName)}
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
                  </span>
                )}
              </button>
            );
          })}
        </div>

        {/* Footer */}
        <div className={`border-t border-gray-100 transition-all duration-300 ${isCollapsed ? 'px-2 py-4' : 'px-4 pt-4 pb-6'}`}>
          {profile && (
            <div className={isCollapsed ? 'flex justify-center' : ''}>
              <UserIdentityCard
                profile={profile}
                collapsed={isCollapsed}
                active={isProfileSection}
                onClick={() => onNavigate('profile')}
              />
            </div>
          )}

          {!isCollapsed && (
            <div className="pt-4 text-center text-xs text-gray-300">
              <p>Mundo de Kaboo © 2025</p>
              <p className="mt-1">Versão 2.1</p>
            </div>
          )}
        </div>
      </div>
    </>
  );
};