import React, { useCallback, useRef, useState, useEffect } from 'react';
import { Document, pdfjs } from 'react-pdf';
import { TransformWrapper } from 'react-zoom-pan-pinch';
import 'react-pdf/dist/Page/AnnotationLayer.css';
import 'react-pdf/dist/Page/TextLayer.css';
import Flipbook from './Flipbook';
import { cn } from '../../lib/utils';

// Configure PDF.js worker - use the worker from the installed package to ensure version matching
if (typeof window !== 'undefined') {
  // Use the version from the installed pdfjs-dist package to ensure compatibility
  // This ensures the worker version matches the API version
  pdfjs.GlobalWorkerOptions.workerSrc = `https://unpkg.com/pdfjs-dist@${pdfjs.version}/build/pdf.worker.min.js`;
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
      className={cn('relative h-full w-full bg-transparent overflow-hidden flex items-center justify-center', className)}
      style={{ minHeight: '400px', height: '100%', display: 'flex', justifyContent: 'center', alignItems: 'center' }}
    >
      <style>{`
        .react-pdf__Document {
          display: flex !important;
          justify-content: center !important;
          align-items: center !important;
          height: 100% !important;
          width: 100% !important;
        }
        .react-pdf__Document > div {
          display: flex !important;
          justify-content: center !important;
          align-items: center !important;
          height: 100% !important;
          width: 100% !important;
        }
      `}</style>
      {pdfLoading && (
        <div className="absolute inset-0 flex items-center justify-center z-50 bg-white/80">
          <div className="text-center">
            <div className="w-12 h-12 border-4 border-amber-600 border-t-transparent rounded-full animate-spin mx-auto mb-4"></div>
            <p className="text-gray-700 font-bold">Carregando PDF...</p>
          </div>
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
            <div className="absolute inset-0 flex items-center justify-center z-40">
              <div className="text-center">
                <div className="w-12 h-12 border-4 border-blue-500 border-t-transparent rounded-full animate-spin mx-auto mb-4"></div>
                <p className="text-gray-700 font-bold">Carregando documento PDF...</p>
              </div>
            </div>
          }
        >
          {pdfDetails && !pdfLoading ? (
            <>
              {/* Loading overlay that fades out when first page is ready */}
              <div 
                className={`absolute inset-0 z-50 flex items-center justify-center transition-opacity duration-500 ${
                  firstPageRendered ? 'opacity-0 pointer-events-none' : 'opacity-100'
                }`}
                style={{ backgroundColor: bgColor }}
              >
                <div className="text-center">
                  <div className="w-12 h-12 border-4 border-white/30 border-t-white rounded-full animate-spin mx-auto mb-4"></div>
                  <p className="text-white font-bold">Abrindo o livro...</p>
                  <p className="text-xs text-white/80 mt-2">Aguarde enquanto preparamos o livro</p>
                </div>
              </div>
              
              {/* Book content - always rendered but covered by overlay until ready */}
              <div className="w-full h-full">
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
            </>
          ) : (
            <div className="absolute inset-0 flex items-center justify-center z-30">
              <div className="text-center text-gray-600 bg-white/90 p-8 rounded-xl shadow-lg">
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
