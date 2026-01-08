import React, { useState, useEffect } from 'react';
import { Icons } from './Icons';
import { ScreenName } from '../types';
import { LOGO_URL } from '../constants';
import { canEditCollections } from '../lib/auth';

interface BottomNavProps {
  currentScreen: ScreenName;
  onNavigate: (screen: ScreenName) => void;
}

export const BottomNav: React.FC<BottomNavProps> = ({ currentScreen, onNavigate }) => {
  const [canEdit, setCanEdit] = useState(false);

  useEffect(() => {
    checkPermission();
  }, []);

  const checkPermission = async () => {
    const hasPermission = await canEditCollections();
    setCanEdit(hasPermission);
  };

  const baseNavItems = [
    { id: 'home', icon: Icons.Library, label: 'Coleções' },
    { id: 'search', icon: Icons.Search, label: 'Buscar' },
    { id: 'support', icon: Icons.HelpCircle, label: 'Suporte' },
  ];

  // Add admin collections item if user has permission
  const adminNavItem = canEdit 
    ? { id: 'admin_collections', icon: Icons.Settings, label: 'Gerenciar' }
    : null;

  const navItems = [
    ...baseNavItems,
    ...(adminNavItem ? [adminNavItem] : []),
    { id: 'profile', icon: Icons.User, label: 'Perfil' },
  ];

  return (
    <>
      {/* MOBILE BOTTOM NAV */}
      <div className="md:hidden fixed bottom-0 left-0 right-0 bg-white border-t border-gray-100 px-6 py-4 pb-8 rounded-t-3xl shadow-[0_-4px_20px_rgba(0,0,0,0.05)] z-50">
        <div className="flex justify-between items-center max-w-md mx-auto">
          {navItems.map((item) => {
            const isActive = currentScreen === item.id;
            const Icon = item.icon;
            return (
              <button
                key={item.id}
                onClick={() => onNavigate(item.id as ScreenName)}
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
      <div className="hidden md:flex flex-col w-64 h-screen bg-white border-r border-gray-100 shrink-0 z-50 shadow-sm">
        {/* Logo Area - Clickable */}
        <button 
          onClick={() => onNavigate('home')}
          className="p-8 flex justify-center hover:opacity-80 transition-opacity focus:outline-none"
          title="Ir para o Início"
        >
            <img src={LOGO_URL} alt="Kaboo" className="w-32 h-auto" />
        </button>

        {/* Nav Items */}
        <div className="flex-1 px-4 space-y-2 py-4">
            {navItems.map((item) => {
                const isActive = currentScreen === item.id;
                const Icon = item.icon;
                return (
                <button
                    key={item.id}
                    onClick={() => onNavigate(item.id as ScreenName)}
                    className={`w-full flex items-center gap-4 px-6 py-4 rounded-[100px] transition-all duration-200 group ${
                        isActive 
                        ? 'bg-kaboo-primary text-white shadow-md shadow-kaboo-primary/20' 
                        : 'bg-transparent text-gray-500 hover:bg-gray-50'
                    }`}
                >
                    <Icon 
                        size={22} 
                        className={isActive ? 'stroke-[2.5px]' : 'stroke-[2px] group-hover:text-kaboo-primary'} 
                    />
                    <span className={`text-sm font-bold ${isActive ? '' : 'group-hover:text-gray-800'}`}>
                        {item.label}
                    </span>
                </button>
                );
            })}
        </div>

        {/* Desktop Only Footer Info */}
        <div className="p-6 text-center text-xs text-gray-300">
            <p>Mundo de Kaboo © 2025</p>
            <p className="mt-1">Versão 2.1</p>
        </div>
      </div>
    </>
  );
};