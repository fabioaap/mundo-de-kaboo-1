import React, { forwardRef, memo, useCallback, useState, useEffect } from 'react';
import HTMLFlipBookRaw from 'react-pageflip';

// react-pageflip's IProps marca várias props opcionais em runtime como obrigatórias.
// Relaxamos o tipo (sem alterar runtime) para passar só o que usamos, incluindo ref.
const HTMLFlipBook = HTMLFlipBookRaw as unknown as React.ComponentType<any>;
import PdfPage from './PdfPage';
import { useDebounce } from '../../hooks/useDebounce';
import useScreenSize from '../../hooks/useScreenSize';
import useIsMobile from '../../hooks/useIsMobile';

interface FlipbookLoaderProps {
  pdfDetails: {
    totalPages: number;
    width: number;
    height: number;
  };
  scale: number;
  viewerStates: {
    currentPageIndex: number;
    zoomScale: number;
  };
  setViewerStates: (states: any) => void;
  viewRange: [number, number];
  setViewRange: (range: [number, number]) => void;
  onFirstPageRendered?: () => void;
}

const FlipbookLoader = forwardRef<any, FlipbookLoaderProps>(
  ({ pdfDetails, scale, viewerStates, setViewerStates, viewRange, setViewRange, onFirstPageRendered }, ref) => {
    const htmlFlipBookRef = React.useRef<any>(null);
    const { width } = useScreenSize();
    const isMobile = useIsMobile();
    const debouncedZoom = useDebounce(viewerStates.zoomScale, 500);
    const firstPageRenderedRef = React.useRef(false);
    // Progressive loading: mobile starts with 3 pages, desktop with 8 pages
    const [loadedPagesCount, setLoadedPagesCount] = useState(() => {
      const initialIsMobile = window.innerWidth < 768 || /Android|webOS|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini/i.test(navigator.userAgent);
      return initialIsMobile ? 3 : Math.min(8, pdfDetails.totalPages);
    });
    
    // Reset loadedPagesCount when pdfDetails changes
    useEffect(() => {
      const initialIsMobile = window.innerWidth < 768 || /Android|webOS|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini/i.test(navigator.userAgent);
      setLoadedPagesCount(initialIsMobile ? 3 : Math.min(8, pdfDetails.totalPages));
      firstPageRenderedRef.current = false;
    }, [pdfDetails.totalPages]);

    const handleFirstPageRender = React.useCallback(() => {
      if (!firstPageRenderedRef.current) {
        firstPageRenderedRef.current = true;
        console.log('✅ FlipbookLoader: First page rendered, calling onFirstPageRendered');
        onFirstPageRendered?.();
        
        // Gradually load more pages after first page is ready
        // Desktop loads more pages at once (10) vs mobile (5)
        if (loadedPagesCount < pdfDetails.totalPages) {
          setTimeout(() => {
            const pagesToAdd = isMobile ? 5 : 10;
            setLoadedPagesCount(Math.min(loadedPagesCount + pagesToAdd, pdfDetails.totalPages));
          }, 500);
        }
      }
    }, [onFirstPageRendered, isMobile, loadedPagesCount, pdfDetails.totalPages]);
    
    // Load more pages when user flips near the end of loaded pages
    useEffect(() => {
      if (viewerStates.currentPageIndex >= loadedPagesCount - 2) {
        // Load more pages when user is near the end of loaded pages
        // Desktop loads more pages at once (5) vs mobile (3)
        if (loadedPagesCount < pdfDetails.totalPages) {
          const pagesToAdd = isMobile ? 3 : 5;
          setLoadedPagesCount(Math.min(loadedPagesCount + pagesToAdd, pdfDetails.totalPages));
        }
      }
    }, [viewerStates.currentPageIndex, loadedPagesCount, isMobile, pdfDetails.totalPages]);
    
    // Gradually load all pages after first page is rendered
    // Desktop loads faster (4 pages/second) vs mobile (2 pages/second)
    useEffect(() => {
      if (firstPageRenderedRef.current && loadedPagesCount < pdfDetails.totalPages) {
        const pagesPerSecond = isMobile ? 2 : 4;
        const interval = setInterval(() => {
          setLoadedPagesCount(prev => {
            const next = Math.min(prev + pagesPerSecond, pdfDetails.totalPages);
            if (next >= pdfDetails.totalPages) {
              clearInterval(interval);
            }
            return next;
          });
        }, 1000);
        
        return () => clearInterval(interval);
      }
    }, [isMobile, loadedPagesCount, pdfDetails.totalPages]);

    // Expose the HTMLFlipBook instance via ref
    React.useImperativeHandle(ref, () => ({
      pageFlip: () => {
        return htmlFlipBookRef.current?.pageFlip?.();
      },
      flipNext: () => {
        const pageFlip = htmlFlipBookRef.current?.pageFlip?.();
        if (pageFlip) {
          pageFlip.flipNext();
        }
      },
      flipPrev: () => {
        const pageFlip = htmlFlipBookRef.current?.pageFlip?.();
        if (pageFlip) {
          pageFlip.flipPrev();
        }
      },
    }));

    const isPageInView = (index: number) => {
      return viewerStates.currentPageIndex === index || viewerStates.currentPageIndex + 1 === index;
    };

    const onFlip = useCallback(
      (e: any) => {
        const newPageIndex = e.data;
        // Don't update viewRange on every flip - keep all pages loaded
        // This prevents the black loading screen
        setViewerStates({
          ...viewerStates,
          currentPageIndex: newPageIndex,
        });
      },
      [viewerStates, setViewerStates]
    );

    // Calculate actual page dimensions
    const pageWidth = pdfDetails.width * scale;
    const pageHeight = pdfDetails.height * scale;

    console.log('📖 FlipbookLoader render:', { 
      totalPages: pdfDetails.totalPages, 
      scale, 
      pageWidth, 
      pageHeight, 
      currentPageIndex: viewerStates.currentPageIndex 
    });

    if (pageWidth <= 0 || pageHeight <= 0) {
      return (
        <div className="text-center text-red-500 p-8">
          <p className="font-bold">Erro: Dimensões inválidas</p>
          <p className="text-xs">pageWidth: {pageWidth}, pageHeight: {pageHeight}, scale: {scale}</p>
        </div>
      );
    }

    return (
      <div className="relative flex justify-center items-center bg-transparent" style={{ width: pageWidth * 2, height: pageHeight, minWidth: '300px', minHeight: '400px' }}>
        <HTMLFlipBook
          ref={(el) => {
            htmlFlipBookRef.current = el;
          }}
          key={`flipbook-${scale}`}
          startPage={viewerStates.currentPageIndex}
          width={pageWidth}
          height={pageHeight}
          size="stretch"
          drawShadow={true}
          flippingTime={700}
          usePortrait={false}
          showCover={true}
          showPageCorners={false}
          onFlip={onFlip}
          disableFlipByClick={width < 768}
          className={viewerStates.zoomScale > 1 ? 'pointer-events-none md:pointer-events-none' : ''}
        >
          {Array.from({ length: pdfDetails.totalPages }, (_, index) => {
            // Always render PdfPage for all pages to maintain consistent DOM structure
            // PdfPage will handle showing loading state for pages not yet loaded
            return (
              <PdfPage
                key={`page-${index}`}
                height={pageHeight}
                zoomScale={debouncedZoom}
                page={index + 1}
                isPageInViewRange={index < loadedPagesCount}
                isPageInView={isPageInView(index)}
                onRenderSuccess={index === 0 ? handleFirstPageRender : undefined}
                shouldLoad={index < loadedPagesCount}
              />
            );
          })}
        </HTMLFlipBook>
      </div>
    );
  }
);

FlipbookLoader.displayName = 'FlipbookLoader';

export default memo(FlipbookLoader);
