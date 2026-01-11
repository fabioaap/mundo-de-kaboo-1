import React, { useCallback, useRef, useState, useEffect } from 'react';
import { Document, pdfjs } from 'react-pdf';
import { TransformWrapper } from 'react-zoom-pan-pinch';
import 'react-pdf/dist/Page/AnnotationLayer.css';
import 'react-pdf/dist/Page/TextLayer.css';
import Flipbook from './Flipbook';
import { cn } from '../../lib/utils';

// Configure PDF.js worker - use local worker file from public directory
// This ensures the worker is bundled with the app and version matches
if (typeof window !== 'undefined') {
  pdfjs.GlobalWorkerOptions.workerSrc = '/pdf.worker.min.mjs';
}

interface FlipbookViewerProps {
  pdfUrl: string;
  className?: string;
  onLoadSuccess?: () => void;
  onLoadError?: (error: any) => void;
  onPageChange?: (currentPage: number, totalPages: number) => void;
  themeColor?: string;
}

const FlipbookViewer = React.forwardRef<any, FlipbookViewerProps>(({
  pdfUrl,
  className,
  onLoadSuccess,
  onLoadError,
  onPageChange,
  themeColor = '#5D1F58',
}, ref) => {
  const flipbookRef = useRef<any>(null);
  const loaderRef = useRef<any>(null);
  
  // Expose flipbook methods via ref
  React.useImperativeHandle(ref, () => ({
    pageFlip: () => {
      // Return the pageFlip controller from the loader
      return loaderRef.current?.pageFlip?.();
    },
    flipNext: () => {
      // Call flipNext on the loader
      if (loaderRef.current?.flipNext) {
        loaderRef.current.flipNext();
      }
    },
    flipPrev: () => {
      // Call flipPrev on the loader
      if (loaderRef.current?.flipPrev) {
        loaderRef.current.flipPrev();
      }
    },
    getCurrentPage: () => viewerStates.currentPageIndex,
    getTotalPages: () => pdfDetails?.totalPages || 0,
  }));

  const [pdfLoading, setPdfLoading] = useState(true);
  const [firstPageRendered, setFirstPageRendered] = useState(false);
  const [pdfDetails, setPdfDetails] = useState<{
    totalPages: number;
    width: number;
    height: number;
  } | null>(null);
  const [viewerStates, setViewerStates] = useState({
    currentPageIndex: 0,
    zoomScale: 1,
  });

  // Convert hex to RGB for background
  const hexToRgb = (hex: string) => {
    const result = /^#?([a-f\d]{2})([a-f\d]{2})([a-f\d]{2})$/i.exec(hex);
    return result
      ? {
          r: parseInt(result[1], 16),
          g: parseInt(result[2], 16),
          b: parseInt(result[3], 16),
        }
      : { r: 93, g: 31, b: 88 };
  };

  const rgb = hexToRgb(themeColor);
  const bgColor = `rgb(${rgb.r}, ${rgb.g}, ${rgb.b})`;

  // Fallback timeout to ensure loading doesn't stay forever
  useEffect(() => {
    if (pdfDetails && !firstPageRendered) {
      const timeout = setTimeout(() => {
        console.log('⏱️ FlipbookViewer: Timeout reached (4s), marking first page as rendered');
        setFirstPageRendered(true);
      }, 4000); // 4 second fallback

      return () => clearTimeout(timeout);
    }
  }, [pdfDetails, firstPageRendered]);

  // Notify parent when page changes
  useEffect(() => {
    if (pdfDetails && onPageChange) {
      onPageChange(viewerStates.currentPageIndex, pdfDetails.totalPages);
    }
  }, [viewerStates.currentPageIndex, pdfDetails, onPageChange]);

  const onDocumentLoadSuccess = useCallback(
    async (document: any) => {
      try {
        console.log('📄 FlipbookViewer: Document loaded, numPages:', document.numPages);
        const pageDetails = await document.getPage(1);
        const pdfDetailsData = {
          totalPages: document.numPages,
          width: pageDetails.view[2],
          height: pageDetails.view[3],
        };
        console.log('📄 FlipbookViewer: PDF details:', pdfDetailsData);
        setPdfDetails(pdfDetailsData);
        setPdfLoading(false);
        onLoadSuccess?.();
      } catch (error) {
        console.error('❌ FlipbookViewer: Error loading document:', error);
        onLoadError?.(error);
      }
    },
    [onLoadSuccess, onLoadError]
  );

  const onDocumentLoadError = useCallback(
    (error: Error) => {
      setPdfLoading(false);
      onLoadError?.(error);
    },
    [onLoadError]
  );

  return (
    <div
      ref={flipbookRef}
      className={cn('relative h-full w-full bg-transparent overflow-hidden', className)}
      style={{ minHeight: '400px', height: '100%', position: 'relative' }}
    >
      <style>{`
        .react-pdf__Document {
          display: flex !important;
          justify-content: center !important;
          align-items: center !important;
          height: 100% !important;
          width: 100% !important;
          background: transparent !important;
        }
        .react-pdf__Document > div {
          display: flex !important;
          justify-content: center !important;
          align-items: center !important;
          height: 100% !important;
          width: 100% !important;
          background: transparent !important;
        }
        .react-pdf__Page {
          background: transparent !important;
        }
        .react-pdf__Page__canvas {
          background: transparent !important;
        }
        /* HTMLFlipBook (react-pageflip) transparent backgrounds */
        .stf__parent,
        .stf__wrapper,
        .tf__parent,
        .tf__wrapper {
          background: transparent !important;
        }
        /* react-zoom-pan-pinch transparent backgrounds */
        .react-transform-wrapper,
        .react-transform-component {
          background: transparent !important;
        }
      `}</style>
      {pdfLoading && (
        <div className="absolute inset-0 flex items-center justify-center z-[9999]" style={{ backgroundColor: bgColor }}>
          {/* Dark overlay to darken background */}
          <div className="absolute inset-0 bg-black/10 z-0" />
          <div className="relative z-10 w-12 h-12 border-4 border-white/30 border-t-white rounded-full animate-spin"></div>
        </div>
      )}
      
      {!pdfUrl && (
        <div className="absolute inset-0 flex items-center justify-center z-50">
          <div className="text-center text-red-500 p-8">
            <p className="font-bold">Erro: PDF URL não fornecida</p>
          </div>
        </div>
      )}
      
      {pdfUrl && (
        <Document 
          file={pdfUrl} 
          onLoadSuccess={onDocumentLoadSuccess} 
          onLoadError={onDocumentLoadError} 
          loading={
            <div className="absolute inset-0 flex items-center justify-center z-[9999]" style={{ backgroundColor: bgColor }}>
              {/* Dark overlay to darken background */}
              <div className="absolute inset-0 bg-black/10 z-0" />
              <div className="relative z-10 w-12 h-12 border-4 border-white/30 border-t-white rounded-full animate-spin"></div>
            </div>
          }
        >
          {pdfDetails && !pdfLoading ? (
            <div className="relative w-full h-full" style={{ position: 'relative', zIndex: 1 }}>
              {/* Book content - always rendered but completely hidden until overlay disappears */}
              <div 
                className="w-full h-full"
                style={{ 
                  opacity: firstPageRendered ? 1 : 0,
                  pointerEvents: firstPageRendered ? 'auto' : 'none',
                  visibility: firstPageRendered ? 'visible' : 'hidden',
                  position: 'relative',
                  zIndex: 1
                }}
              >
                <TransformWrapper
                  doubleClick={{ disabled: true }}
                  pinch={{ step: 2 }}
                  disablePadding={viewerStates?.zoomScale <= 1}
                  initialScale={1}
                  minScale={1}
                  maxScale={5}
                  onTransformed={({ state }: any) =>
                    setViewerStates({ ...viewerStates, zoomScale: state.scale })
                  }
                >
                  <div className="w-full h-full flex items-center justify-center" style={{ minHeight: '400px', height: '100%', display: 'flex', justifyContent: 'center', alignItems: 'center' }}>
                    <Flipbook
                      viewerStates={viewerStates}
                      setViewerStates={setViewerStates}
                      flipbookRef={flipbookRef}
                      pdfDetails={pdfDetails}
                      innerRef={flipbookRef}
                      onRef={(ref) => { 
                        if (ref && ref.current) {
                          loaderRef.current = ref.current;
                        }
                      }}
                      onPageChange={(currentPage) => {
                        setViewerStates({ ...viewerStates, currentPageIndex: currentPage });
                      }}
                      onFirstPageRendered={() => {
                        // Add 2 second delay to ensure everything is fully loaded before hiding overlay
                        setTimeout(() => {
                          setFirstPageRendered(true);
                          onLoadSuccess?.();
                        }, 2000);
                      }}
                    />
                  </div>
                </TransformWrapper>
              </div>
              
              {/* Loading overlay that covers the book until first page is ready - MUST be last in DOM */}
              {!firstPageRendered && (
                <div 
                  className="absolute inset-0 flex items-center justify-center"
                  style={{ 
                    backgroundColor: bgColor,
                    zIndex: 999999,
                    top: 0,
                    left: 0,
                    right: 0,
                    bottom: 0,
                    position: 'absolute',
                    willChange: 'opacity'
                  }}
                >
                  {/* Dark overlay to darken background */}
                  <div className="absolute inset-0 bg-black/10 z-0" />
                  <div className="relative z-10 w-12 h-12 border-4 border-white/30 border-t-white rounded-full animate-spin"></div>
                </div>
              )}
            </div>
          ) : (
            <div className="absolute inset-0 flex items-center justify-center z-30">
              <div className="text-center text-gray-600 bg-transparent p-8 rounded-xl shadow-lg">
                <p className="font-bold mb-2">Aguardando PDF...</p>
                <p className="text-xs">pdfLoading: {pdfLoading ? 'true' : 'false'}</p>
                <p className="text-xs">pdfDetails: {pdfDetails ? `loaded (${pdfDetails.totalPages} pages)` : 'null'}</p>
                <p className="text-xs mt-2">URL: {pdfUrl?.substring(0, 50)}...</p>
              </div>
            </div>
          )}
        </Document>
      )}
    </div>
  );
});

FlipbookViewer.displayName = 'FlipbookViewer';

export default FlipbookViewer;
