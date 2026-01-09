import React from 'react';
import { Collection } from '../types';
import { Icons } from './Icons';

interface CollectionCoverSectionProps {
  collection: Collection;
  headerContent?: React.ReactNode;
  isOffline?: boolean;
  headerPaddingTop?: string; // Custom padding-top for mobile (e.g., 'pt-6', 'pt-4')
}

export const CollectionCoverSection: React.FC<CollectionCoverSectionProps> = ({
  collection,
  headerContent,
  isOffline = false,
  headerPaddingTop = 'pt-12',
}) => {
  const themeColor = collection.color_theme || '#5D1F58';

  return (
    <div className="relative md:w-1/3 h-64 md:h-full md:shrink-0 flex-shrink-0">
      {/* Solid Background Container - Fills entire left column */}
      <div 
        className="absolute inset-0 z-0"
        style={{ backgroundColor: themeColor }}
      />
      
      {/* Navigation Header - Absolute positioned */}
      {headerContent && (
        <div className={`absolute top-0 left-0 right-0 z-20 px-6 ${headerPaddingTop} pb-4 md:p-8 text-white flex-shrink-0`}>
          {headerContent}
        </div>
      )}
      
      {/* Main Cover (Mobile & Desktop) - Full height container */}
      <div className="relative h-full flex flex-col items-center justify-center px-6 py-6 z-30">
        <div className="w-48 h-48 md:w-64 md:h-64 rounded-3xl shadow-2xl relative group border-4 border-white/20 overflow-hidden shrink-0 mx-auto">
          <img 
            src={collection.cover_image} 
            alt={collection.title}
            className="w-full h-full object-cover bg-gray-200"
          />
          {/* Offline Badge on Cover */}
          {isOffline && (
            <div className="absolute top-3 right-3 bg-kaboo-green text-white p-1.5 rounded-full shadow-md z-10 animate-in zoom-in duration-300">
              <Icons.Download size={14} strokeWidth={3} />
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
