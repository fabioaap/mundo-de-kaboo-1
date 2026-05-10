import React, { useState, useRef } from 'react';
import { Icons } from '../components/Icons';
import { Collection } from '../types';
import FlipbookViewer from '../components/flipbook/FlipbookViewer';
import useOrientation from '../hooks/useOrientation';
import useIsMobile from '../hooks/useIsMobile';
import { useThemeBackground } from '../hooks/useThemeBackground';
import { GalaxyBackground } from '../components/GalaxyBackground';
import { useOfflineDownload } from '../hooks/useOfflineDownload';

interface BookReaderScreenProps {
  collection: Collection;
  onBack: () => void;
}

export const BookReaderScreen: React.FC<BookReaderScreenProps> = ({ collection, onBack }) => {
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [forcePortrait, setForcePortrait] = useState(false);
  const [textMode, setTextMode] = useState(false);
  const flipbookRef = useRef<any>(null);
  const [currentPage, setCurrentPage] = useState(0);
  const [totalPages, setTotalPages] = useState(0);
  const themeColor = collection.color_theme || '#5D1F58';
  const isLandscape = useOrientation();
  const isMobile = useIsMobile();
  const isMobileLandscape = isMobile && isLandscape;
  const {
    isAvailable: canDownloadOffline,
    isDownloaded: isOfflineDownloaded,
    isDownloading: isOfflineDownloading,
    downloadError: offlineDownloadError,
    handleDownload: handleOfflineDownload,
  } = useOfflineDownload(collection, [collection.pdf_url]);
  
  // Set browser background to match theme color
  useThemeBackground(themeColor);
  
  // Helper function to get pagination text
  const getPaginationText = () => {
    if (totalPages === 0) return 'Carregando...';
    
    // currentPage is 0-based index from react-pageflip
    // Page 0 = first page (page 1 of PDF)
    // Page 1 = shows pages 2 and 3
    // Page 2 = shows pages 4 and 5
    // etc.
    
    if (currentPage === 0) {
      // First page shows single page
      return `1 de ${totalPages}`;
    }
    
    // For other pages, calculate which PDF pages are shown
    // react-pageflip shows 2 pages side by side (except first page)
    const firstPageNum = currentPage * 2; // Page 1 → 2, Page 2 → 4, etc.
    const secondPageNum = firstPageNum + 1;
    
    if (secondPageNum <= totalPages) {
      return `${firstPageNum} e ${secondPageNum} de ${totalPages}`;
    } else {
      // Last page might be single
      return `${firstPageNum} de ${totalPages}`;
    }
  };

  const flipNext = () => {
    try {
      // Use the exposed flipNext method
      if (flipbookRef.current?.flipNext) {
        flipbookRef.current.flipNext();
      }
    } catch (error) {
      console.error('Error flipping next:', error);
    }
  };

  const flipPrev = () => {
    try {
      // Use the exposed flipPrev method
      if (flipbookRef.current?.flipPrev) {
        flipbookRef.current.flipPrev();
      }
    } catch (error) {
      console.error('Error flipping prev:', error);
    }
  };

  // Keyboard navigation
  React.useEffect(() => {
    const handleKeyPress = (e: KeyboardEvent) => {
      if (e.key === 'ArrowLeft') flipPrev();
      if (e.key === 'ArrowRight') flipNext();
      if (e.key === 'Escape') onBack();
    };

    window.addEventListener('keydown', handleKeyPress);
    return () => window.removeEventListener('keydown', handleKeyPress);
  }, []);


  if (!collection.pdf_url) {
    return (
      <div className="fixed inset-0 z-50 flex flex-col bg-white" style={{ height: '100vh', width: '100vw' }}>
        <div className="relative z-10 p-6 pt-12">
          <button 
            onClick={onBack}
            className="w-10 h-10 rounded-full bg-white/90 backdrop-blur-sm shadow-lg text-gray-700 flex items-center justify-center hover:bg-white transition-all active:scale-95"
          >
            <Icons.ChevronLeft size={24} />
          </button>
        </div>
        <div className="flex-1 flex items-center justify-center relative z-10">
          <div className="text-center p-8">
            <Icons.BookOpen size={64} className="mx-auto mb-4 text-gray-400" />
            <p className="text-lg font-bold text-gray-700 mb-2">PDF não disponível</p>
            <p className="text-sm text-gray-500">Este livro não possui versão em PDF.</p>
          </div>
        </div>
      </div>
    );
  }

  // Convert hex color to RGB for gradient
  const hexToRgb = (hex: string) => {
    const result = /^#?([a-f\d]{2})([a-f\d]{2})([a-f\d]{2})$/i.exec(hex);
    return result
      ? {
          r: parseInt(result[1], 16),
          g: parseInt(result[2], 16),
          b: parseInt(result[3], 16),
        }
      : { r: 93, g: 31, b: 88 }; // Default color
  };

  const rgb = hexToRgb(themeColor);
  const bgColor = `rgb(${rgb.r}, ${rgb.g}, ${rgb.b})`;

  // Show orientation overlay if in portrait mode (but not if user chose to continue)
  if (!isLandscape && !forcePortrait) {
    return (
      <div 
        className="fixed inset-0 z-50 flex flex-col items-center justify-center overflow-hidden" 
        style={{ 
          height: '100vh', 
          width: '100vw',
          backgroundColor: bgColor
        }}
      >
        {/* Galaxy Effect - Only show after book is loaded and not on mobile */}
        {!isLoading && !isMobile && <GalaxyBackground />}
        
        {/* Dark overlay to darken background - Works on both desktop and mobile */}
        <div className="absolute inset-0 bg-black/20" style={{ zIndex: 1 }} />
        
        {/* Back Button */}
        <button 
          onClick={onBack}
          className="absolute top-4 left-4 z-30 w-12 h-12 rounded-full bg-white/20 backdrop-blur-md shadow-xl text-white flex items-center justify-center hover:bg-white/30 transition-all active:scale-95 border border-white/30"
          aria-label="Voltar"
        >
          <Icons.ChevronLeft size={24} strokeWidth={2.5} />
        </button>

        <div className="text-center p-8 max-w-md mx-auto relative z-10">
          <style>{`
            @keyframes rotatePhone {
              0% {
                transform: rotate(0deg);
              }
              50% {
                transform: rotate(90deg);
              }
              100% {
                transform: rotate(0deg);
              }
            }
            .phone-rotate-animation {
              animation: rotatePhone 3s ease-in-out infinite;
              transform-origin: center center;
            }
          `}</style>
          <div className="mb-6 flex justify-center">
            <Icons.Smartphone 
              size={80} 
              className="text-white/90 phone-rotate-animation" 
              strokeWidth={2}
            />
          </div>
          <h2 className="text-2xl font-bold text-white mb-4 drop-shadow-lg">
            Gire seu dispositivo
          </h2>
          <p className="text-lg text-white/90 mb-6 drop-shadow-md">
            Para uma melhor experiência de leitura, gire seu dispositivo para o modo horizontal.
          </p>
          <button
            onClick={() => setForcePortrait(true)}
            className="text-sm text-white/60 underline underline-offset-2 hover:text-white/90 transition-colors mt-2"
          >
            Continuar em retrato mesmo assim
          </button>
        </div>
      </div>
    );
  }

  return (
    <div 
      className="fixed inset-0 z-50 flex flex-col overflow-hidden" 
      style={{ 
        height: '100vh', 
        width: '100vw',
        backgroundColor: bgColor
      }}
    >
      {/* Galaxy Effect - Only show after book is loaded and not on mobile */}
      {!isLoading && !isMobile && <GalaxyBackground />}
      
      {/* Dark overlay to darken background - Works on both desktop and mobile */}
      <div className={`absolute inset-0 ${isMobile ? 'bg-black/20' : 'bg-black/10'}`} style={{ zIndex: 1 }} />

      {/* Header - Hidden on mobile landscape */}
      {!isMobileLandscape && (
        <div className="relative z-20 p-4 flex items-center justify-between flex-shrink-0">
          <button 
            onClick={onBack}
            className="w-12 h-12 rounded-full bg-black/20 backdrop-blur-md shadow-xl text-white flex items-center justify-center hover:bg-black/30 transition-all active:scale-95 border border-white/30"
            aria-label="Voltar"
          >
            <Icons.ChevronLeft size={24} strokeWidth={2.5} />
          </button>
          
          <div className="flex-1 text-center">
            <div className="inline-block bg-black/20 backdrop-blur-md px-6 py-2 rounded-full shadow-lg border border-white/10">
              <h1 className="text-sm md:text-base font-bold text-white drop-shadow-sm">
                {collection.title}
              </h1>
            </div>
          </div>

          <div className="flex min-w-[104px] items-center justify-end gap-2">
            {canDownloadOffline && (
              <button
                type="button"
                onClick={handleOfflineDownload}
                disabled={isOfflineDownloading || isOfflineDownloaded}
                aria-label={isOfflineDownloaded ? 'Conteúdo disponível offline' : 'Baixar livro para offline'}
                title={isOfflineDownloaded ? 'Conteúdo offline disponível' : 'Baixar para offline'}
                className={`w-12 h-12 rounded-full backdrop-blur-md shadow-xl flex items-center justify-center transition-all active:scale-95 border border-white/30 text-white disabled:cursor-default ${isOfflineDownloaded
                  ? 'bg-emerald-400/30'
                  : isOfflineDownloading
                    ? 'bg-white/25'
                    : 'bg-black/20 hover:bg-black/30'
                }`}
              >
                {isOfflineDownloading ? (
                  <Icons.RotateCw size={20} className="animate-spin" strokeWidth={2.5} />
                ) : (
                  <Icons.Download size={20} strokeWidth={2.5} />
                )}
              </button>
            )}

            {collection.text_content && (
              <button
                onClick={() => setTextMode(prev => !prev)}
                className={`w-12 h-12 rounded-full backdrop-blur-md shadow-xl flex items-center justify-center transition-all active:scale-95 border border-white/30 ${textMode ? 'bg-white/40 text-white' : 'bg-black/20 text-white hover:bg-black/30'}`}
                aria-label={textMode ? 'Modo flipbook' : 'Modo texto'}
                title={textMode ? 'Voltar ao flipbook' : 'Ler em modo texto'}
              >
                <Icons.Type size={20} strokeWidth={2.5} />
              </button>
            )}
          </div>
        </div>
      )}

      {/* Back button for mobile landscape - Floating top left */}
      {isMobileLandscape && (
        <button 
          onClick={onBack}
          className="fixed top-4 left-4 z-30 w-12 h-12 rounded-full bg-black/20 backdrop-blur-md shadow-xl text-white flex items-center justify-center hover:bg-black/30 transition-all active:scale-95 border border-white/30"
          aria-label="Voltar"
        >
          <Icons.ChevronLeft size={24} strokeWidth={2.5} />
        </button>
      )}

      {/* Text mode toggle for mobile landscape */}
      {isMobileLandscape && (
        <div className="fixed top-4 right-4 z-30 flex items-center gap-2">
          {canDownloadOffline && (
            <button
              type="button"
              onClick={handleOfflineDownload}
              disabled={isOfflineDownloading || isOfflineDownloaded}
              aria-label={isOfflineDownloaded ? 'Conteúdo disponível offline' : 'Baixar livro para offline'}
              title={isOfflineDownloaded ? 'Conteúdo offline disponível' : 'Baixar para offline'}
              className={`w-12 h-12 rounded-full backdrop-blur-md shadow-xl flex items-center justify-center transition-all active:scale-95 border border-white/30 text-white disabled:cursor-default ${isOfflineDownloaded
                ? 'bg-emerald-400/30'
                : isOfflineDownloading
                  ? 'bg-white/25'
                  : 'bg-black/20 hover:bg-black/30'
              }`}
            >
              {isOfflineDownloading ? (
                <Icons.RotateCw size={20} className="animate-spin" strokeWidth={2.5} />
              ) : (
                <Icons.Download size={20} strokeWidth={2.5} />
              )}
            </button>
          )}

          {collection.text_content && (
            <button
              onClick={() => setTextMode(prev => !prev)}
              className={`w-12 h-12 rounded-full backdrop-blur-md shadow-xl flex items-center justify-center transition-all active:scale-95 border border-white/30 ${textMode ? 'bg-white/40 text-white' : 'bg-black/20 text-white hover:bg-black/30'}`}
              aria-label={textMode ? 'Modo flipbook' : 'Modo texto'}
              title={textMode ? 'Voltar ao flipbook' : 'Ler em modo texto'}
            >
              <Icons.Type size={20} strokeWidth={2.5} />
            </button>
          )}
        </div>
      )}

      {offlineDownloadError && (
        <div className="relative z-20 px-4 pb-2">
          <div className="mx-auto max-w-md rounded-2xl border border-red-300/35 bg-red-500/80 px-4 py-2 text-center text-xs text-white backdrop-blur-md shadow-lg">
            {offlineDownloadError}
          </div>
        </div>
      )}

      {/* Text Mode View */}
      {textMode && collection.text_content ? (
        <div className="flex-1 relative z-10 overflow-auto">
          <div
            className="max-w-2xl mx-auto px-6 py-8 text-gray-800 bg-white min-h-full rounded-t-2xl mt-2"
            role="article"
            aria-label={`Texto do livro: ${collection.title}`}
          >
            <h1 className="text-2xl font-bold mb-6">{collection.title}</h1>
            {collection.text_content.split('\n\n').map((paragraph, i) => (
              <p key={i} className="text-base leading-relaxed mb-4">{paragraph}</p>
            ))}
          </div>
        </div>
      ) : (
        <>
          {/* Book Container - Full screen centered for mobile landscape */}
      <div 
        className={`${isMobileLandscape ? 'fixed inset-0 flex items-center justify-center z-10' : 'flex-1 relative z-10 overflow-hidden'}`} 
        style={isMobileLandscape ? { minHeight: 0 } : { minHeight: 0 }}
      >
        {error ? (
          <div className="text-center p-8 bg-white/95 backdrop-blur-md rounded-2xl shadow-xl max-w-md mx-auto mt-20">
            <Icons.AlertCircle size={48} className="mx-auto mb-4 text-red-500" />
            <p className="font-bold text-lg text-gray-800 mb-2">Erro ao carregar PDF</p>
            <p className="text-sm text-gray-600 mb-4">{error}</p>
            <button
              onClick={() => {
                setError(null);
                setIsLoading(true);
                window.location.reload();
              }}
              className="px-6 py-3 bg-kaboo-primary text-white rounded-xl font-bold hover:opacity-90 transition-opacity"
            >
              Recarregar página
            </button>
          </div>
        ) : (
          <FlipbookViewer
            ref={flipbookRef}
            pdfUrl={collection.pdf_url}
            className="h-full w-full"
            themeColor={themeColor}
            onLoadSuccess={() => {
              setIsLoading(false);
              setError(null);
            }}
            onLoadError={(err: any) => {
              setIsLoading(false);
              setError(`Erro ao carregar PDF: ${err?.message || 'Erro desconhecido'}`);
            }}
            onPageChange={(currentPage, totalPages) => {
              setCurrentPage(currentPage);
              setTotalPages(totalPages);
            }}
          />
        )}
      </div>

      {/* Navigation Controls */}
      {isMobileLandscape ? (
        <>
          {/* Left Arrow - Center far left corner */}
          <button
            onClick={flipPrev}
            className="fixed left-4 top-1/2 -translate-y-1/2 z-30 w-14 h-14 rounded-full bg-black/20 backdrop-blur-md shadow-xl flex items-center justify-center text-white border border-white/30 transition-all active:scale-95 hover:bg-black/30"
            aria-label="Página anterior"
          >
            <Icons.ChevronLeft size={28} strokeWidth={2.5} />
          </button>

          {/* Right Arrow - Center far right corner */}
          <button
            onClick={flipNext}
            className="fixed right-4 top-1/2 -translate-y-1/2 z-30 w-14 h-14 rounded-full bg-black/20 backdrop-blur-md shadow-xl flex items-center justify-center text-white border border-white/30 transition-all active:scale-95 hover:bg-black/30"
            aria-label="Próxima página"
          >
            <Icons.ChevronLeft size={28} className="rotate-180" strokeWidth={2.5} />
          </button>
        </>
      ) : (
        <div className="relative z-20 pb-6 pt-4 flex items-center justify-center gap-6 flex-shrink-0">
          <button
            onClick={flipPrev}
            className="w-14 h-14 rounded-full bg-black/20 backdrop-blur-md shadow-xl flex items-center justify-center text-white border border-white/30 transition-all active:scale-95 hover:bg-black/30 hover:scale-110"
            aria-label="Página anterior"
          >
            <Icons.ChevronLeft size={28} strokeWidth={2.5} />
          </button>

          {/* Pagination temporarily hidden */}
          {/* <div className="bg-black/40 backdrop-blur-md rounded-full px-6 py-2 shadow-lg border border-white/10">
            <span className="text-sm font-bold text-white">
              {getPaginationText()}
            </span>
          </div> */}

          <button
            onClick={flipNext}
            className="w-14 h-14 rounded-full bg-black/20 backdrop-blur-md shadow-xl flex items-center justify-center text-white border border-white/30 transition-all active:scale-95 hover:bg-black/30 hover:scale-110"
            aria-label="Próxima página"
          >
            <Icons.ChevronLeft size={28} className="rotate-180" strokeWidth={2.5} />
          </button>
        </div>
      )}
        </>
      )}
    </div>
  );
};
