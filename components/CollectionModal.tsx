import React, { useEffect, useState } from 'react';
import { Icons } from './Icons';
import { Collection, ScreenName } from '../types';
import { DetailsScreen } from '../screens/DetailsScreen';
import { ModalSkeleton } from './ModalSkeleton';

interface CollectionModalProps {
  collection: Collection | null;
  isOpen: boolean;
  onClose: () => void;
  onNavigate: (screen: ScreenName, params?: any) => void;
}

export const CollectionModal: React.FC<CollectionModalProps> = ({
  collection,
  isOpen,
  onClose,
  onNavigate
}) => {
  const [showContent, setShowContent] = useState(false);
  const [showSkeleton, setShowSkeleton] = useState(true);

  // Close on Escape key
  useEffect(() => {
    const handleEscape = (e: KeyboardEvent) => {
      if (e.key === 'Escape' && isOpen) {
        onClose();
      }
    };

    if (isOpen) {
      document.addEventListener('keydown', handleEscape);
      // Prevent body scroll when modal is open
      document.body.style.overflow = 'hidden';
      // Reset states when modal opens
      setShowSkeleton(true);
      setShowContent(false);
    }

    return () => {
      document.removeEventListener('keydown', handleEscape);
      document.body.style.overflow = 'unset';
    };
  }, [isOpen, onClose]);

  // Handle smooth transition from skeleton to content
  useEffect(() => {
    if (collection) {
      // Small delay to ensure smooth transition
      const timer = setTimeout(() => {
        setShowSkeleton(false);
        // Show content after skeleton starts fading
        setTimeout(() => {
          setShowContent(true);
        }, 100);
      }, 50);
      return () => clearTimeout(timer);
    } else {
      setShowContent(false);
      setShowSkeleton(true);
    }
  }, [collection]);

  if (!isOpen) return null;

  return (
    <div 
      className="fixed inset-0 z-[100] flex items-center justify-center p-4 md:p-8"
      onClick={(e) => {
        // Close when clicking backdrop
        if (e.target === e.currentTarget) {
          onClose();
        }
      }}
    >
      {/* Backdrop */}
      <div className="absolute inset-0 bg-black/50 backdrop-blur-sm animate-in fade-in duration-100" />
      
      {/* Modal Content */}
      <div className="relative w-full max-w-6xl h-[90vh] md:h-[95vh] bg-white rounded-2xl md:rounded-3xl shadow-2xl overflow-hidden animate-in zoom-in-95 duration-100 flex flex-col">
        {/* Close Button - Always visible on all screen sizes */}
        <button
          onClick={onClose}
          className="absolute top-4 right-4 z-[60] w-10 h-10 rounded-full bg-white/90 backdrop-blur-sm shadow-lg text-gray-700 flex items-center justify-center hover:bg-white transition-all active:scale-95 border border-gray-200"
          aria-label="Fechar"
        >
          <Icons.X size={20} />
        </button>

        {/* Modal Body - Full Height Container */}
        <div className="flex-1 overflow-hidden flex min-h-0 relative">
          {/* Skeleton - fades out when content loads */}
          {showSkeleton && (
            <div className={`absolute inset-0 ${collection ? 'skeleton-fade-out' : ''}`}>
              <ModalSkeleton />
            </div>
          )}
          
          {/* Content - fades in when ready */}
          {collection && showContent && (
            <div className="flex-1 content-fade-in">
              <DetailsScreen 
                collection={collection} 
                onNavigate={(screen, params) => {
                  // Close modal when navigating to player screens
                  if (['player_book', 'player_audio', 'player_video'].includes(screen)) {
                    onClose();
                  }
                  onNavigate(screen, params);
                }}
                onBack={onClose}
              />
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
