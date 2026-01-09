import React, { useEffect, useState } from 'react';
import { Icons } from '../components/Icons';
import { Collection, CollectionResource } from '../types';
import { api } from '../lib/api';
import { CollectionCoverSection } from '../components/CollectionCoverSection';

interface ExtraToolsScreenProps {
  collection: Collection;
  onBack: () => void;
}

export const ExtraToolsScreen: React.FC<ExtraToolsScreenProps> = ({ collection, onBack }) => {
  const [resources, setResources] = useState<CollectionResource[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    api.getCollectionResources(collection.id).then(data => {
      setResources(data);
      setLoading(false);
    });
  }, [collection.id]);

  return (
    <div className="flex flex-col md:flex-row bg-white relative h-full w-full">
      
      {/* DESKTOP: LEFT SIDE (Cover & Aesthetics) / MOBILE: TOP HEADER */}
      <CollectionCoverSection
        collection={collection}
        headerPaddingTop="pt-6"
        headerContent={
          <div className="flex justify-between items-center w-full">
            <button 
              onClick={onBack}
              className="w-10 h-10 rounded-full bg-white/20 backdrop-blur-md flex items-center justify-center hover:bg-white/30 transition-colors"
            >
              <Icons.ChevronLeft size={24} />
            </button>
            <span className="font-bold text-lg opacity-90 md:hidden">Materiais</span>
            <div className="w-10" /> {/* Spacer for centering on mobile */}
          </div>
        }
      />

      {/* DESKTOP: RIGHT SIDE (Content) / MOBILE: BOTTOM CARD */}
      <div className="flex-1 overflow-y-auto z-10 no-scrollbar bg-white rounded-t-[2.5rem] md:rounded-none -mt-12 md:mt-0 relative shadow-[0_-10px_40px_rgba(0,0,0,0.05)] md:shadow-none">
          <div className="pt-16 px-6 pb-24 md:p-12 md:max-w-4xl md:mx-auto">
            
            <h1 className="text-2xl md:text-3xl font-black text-gray-800 mb-2">Materiais Extras</h1>
            <p className="text-gray-500 mb-8">Recursos complementares para {collection.title}</p>

            {loading ? (
                 <div className="text-center text-gray-400 py-10">Carregando materiais...</div>
            ) : resources.length === 0 ? (
                 <div className="text-center text-gray-400 py-10 flex flex-col items-center">
                    <div className="w-16 h-16 bg-gray-100 rounded-full flex items-center justify-center mb-4">
                        <Icons.FileText className="text-gray-300" size={32} />
                    </div>
                    <p>Nenhum material extra disponível.</p>
                 </div>
            ) : (
                <div className="space-y-4">
                    {resources.map((res) => (
                        <div key={res.id} className="flex items-center p-4 border border-gray-100 rounded-2xl hover:border-kaboo-primary/30 hover:bg-kaboo-primary/5 transition-colors group">
                            <div className="w-12 h-12 rounded-xl bg-gray-100 flex items-center justify-center text-gray-500 mr-4 group-hover:bg-white group-hover:text-kaboo-primary transition-colors">
                                <Icons.FileText size={24} />
                            </div>
                            <div className="flex-1">
                                <h4 className="font-bold text-gray-800 text-sm mb-1">{res.title}</h4>
                                <div className="flex gap-2 text-xs text-gray-500 font-bold uppercase">
                                    <span className="bg-gray-100 px-2 py-0.5 rounded-md">{res.type}</span>
                                    <span className="mt-0.5">{res.size || '-'}</span>
                                </div>
                            </div>
                            <a 
                                href={res.url} 
                                target="_blank" 
                                rel="noopener noreferrer"
                                className="w-10 h-10 rounded-full border-2 border-kaboo-primary/20 flex items-center justify-center text-kaboo-primary hover:bg-kaboo-primary hover:text-white transition-all"
                            >
                                <Icons.Download size={20} />
                            </a>
                        </div>
                    ))}
                </div>
            )}
          </div>
      </div>
    </div>
  );
};