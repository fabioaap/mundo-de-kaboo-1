import React, { useState, useEffect } from 'react';
import { Icons } from '../components/Icons';
import { api } from '../lib/api';
import { ScreenName, Collection } from '../types';

interface LibraryScreenProps {
  onNavigate: (screen: ScreenName, params?: any) => void;
}

export const LibraryScreen: React.FC<LibraryScreenProps> = ({ onNavigate }) => {
  const [activeTab, setActiveTab] = useState<'saved' | 'history' | 'downloads'>('saved');
  const [collections, setCollections] = useState<Collection[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    // In a real app we would have specific endpoints for each tab
    api.getCollections().then(data => {
      setCollections(data);
      setLoading(false);
    });
  }, []);

  // Filter collections based on active tab (Mock logic for now as we don't have saved_items table yet)
  const getCollections = () => {
    switch (activeTab) {
      case 'saved':
        return collections.slice(0, 3); 
      case 'history':
        // Here we would ideally merge with user_progress again, but for now just showing a subset
        return collections.slice(0, 2);
      case 'downloads':
        return collections.slice(2, 3);
      default:
        return [];
    }
  };

  const displayCollections = getCollections();

  const handleCollectionClick = (collection: Collection) => {
    onNavigate('home', { collectionId: collection.id });
  };

  return (
    <div className="flex flex-col h-full bg-white pb-24">
      {/* Header */}
      <div className="px-6 pt-12 pb-6">
        <h1 className="text-2xl font-black text-kaboo-primary mb-6">Minha Biblioteca</h1>
        
        {/* Tabs */}
        <div className="flex p-1 bg-gray-100 rounded-xl">
          {(['saved', 'history', 'downloads'] as const).map((tab) => (
            <button
              key={tab}
              onClick={() => setActiveTab(tab)}
              className={`flex-1 py-2 text-sm font-bold rounded-lg transition-all ${
                activeTab === tab 
                  ? 'bg-white text-kaboo-primary shadow-sm' 
                  : 'text-gray-400 hover:text-gray-600'
              }`}
            >
              {tab === 'saved' && 'Salvos'}
              {tab === 'history' && 'Histórico'}
              {tab === 'downloads' && 'Baixados'}
            </button>
          ))}
        </div>
      </div>

      {/* Content */}
      <div className="flex-1 overflow-y-auto px-6 pb-6 no-scrollbar">
        {loading ? (
             <div className="text-center text-gray-400 mt-10">Carregando...</div>
        ) : displayCollections.length > 0 ? (
          <div className="space-y-4">
            {displayCollections.map((collection) => (
              <div 
                key={collection.id}
                onClick={() => handleCollectionClick(collection)}
                className="flex gap-4 p-3 rounded-2xl bg-white border border-gray-100 shadow-sm hover:shadow-md transition-all active:scale-98 cursor-pointer"
              >
                <img 
                  src={collection.cover_image} 
                  alt={collection.title}
                  className="w-20 h-20 rounded-xl object-cover bg-gray-200"
                />
                <div className="flex-1 py-1 flex flex-col justify-between">
                  <div>
                    <h3 className="font-bold text-gray-800 leading-tight line-clamp-2 mb-1">
                      {collection.title}
                    </h3>
                    {/* Author removed */}
                  </div>
                  
                  <div className="flex items-center gap-2 mt-2">
                        <span className={`text-[10px] font-bold px-2 py-0.5 rounded-md ${
                            collection.level === 'Fundamental I' ? 'bg-blue-50 text-blue-500' : 'bg-green-50 text-green-500'
                        }`}>
                            {collection.level}
                        </span>
                  </div>
                </div>
                <div className="flex items-center">
                    <Icons.ChevronLeft className="rotate-180 text-gray-300" size={20} />
                </div>
              </div>
            ))}
          </div>
        ) : (
          <div className="flex flex-col items-center justify-center h-64 text-center">
            <div className="w-16 h-16 bg-gray-50 rounded-full flex items-center justify-center text-gray-300 mb-4">
               {activeTab === 'saved' && <Icons.BookOpen size={32} />}
               {activeTab === 'history' && <Icons.User size={32} />}
               {activeTab === 'downloads' && <Icons.Download size={32} />}
            </div>
            <p className="text-gray-500 font-medium">Nenhum item encontrado aqui.</p>
            <button 
                onClick={() => onNavigate('home')}
                className="mt-4 text-kaboo-primary font-bold text-sm hover:underline"
            >
                Explorar acervo
            </button>
          </div>
        )}
      </div>
    </div>
  );
};