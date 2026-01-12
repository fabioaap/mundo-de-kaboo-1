import React, { forwardRef, memo } from 'react';
import { Page } from 'react-pdf';
import useIsMobile from '../../hooks/useIsMobile';

interface PdfPageProps {
  page: number;
  height: number;
  zoomScale: number;
  isPageInView: boolean;
  isPageInViewRange: boolean;
  onRenderSuccess?: () => void;
  shouldLoad?: boolean;
}

const PdfPage = forwardRef<HTMLDivElement, PdfPageProps>(
  ({ page, height, zoomScale, isPageInView, isPageInViewRange, onRenderSuccess, shouldLoad = true }, ref) => {
    const [isRendered, setIsRendered] = React.useState(false);
    const isMobile = useIsMobile();

    const handleRenderSuccess = React.useCallback(() => {
      if (!isRendered && onRenderSuccess) {
        setIsRendered(true);
        // Call immediately - no delay
        onRenderSuccess();
      }
    }, [isRendered, onRenderSuccess]);

    const handleLoadSuccess = React.useCallback(() => {
      // Also trigger on load success as a fallback
      if (!isRendered && onRenderSuccess) {
        setIsRendered(true);
        onRenderSuccess();
      }
    }, [isRendered, onRenderSuccess]);

    // If shouldLoad is false, show placeholder to maintain DOM structure
    if (!shouldLoad) {
      return (
        <div ref={ref} className="bg-gray-100 w-full h-full flex items-center justify-center">
          <div className="text-gray-400 text-sm">Carregando...</div>
        </div>
      );
    }

    // Render the PDF page - always render to prevent blank screens
    return (
      <div ref={ref} className="bg-transparent w-full h-full flex items-center justify-center">
        <Page
          devicePixelRatio={
            isMobile
              ? Math.min(window.devicePixelRatio || 1, 1.5) // Limit to 1.5x on mobile for better performance
              : isPageInView && zoomScale > 1.7
              ? Math.min(zoomScale * (window.devicePixelRatio || 1), 5)
              : window.devicePixelRatio || 1
          }
          height={height}
          pageNumber={page}
          renderTextLayer={false}
          renderAnnotationLayer={false}
          onRenderSuccess={handleRenderSuccess}
          onLoadSuccess={handleLoadSuccess}
          loading={
            <div className="w-full h-full bg-transparent flex items-center justify-center">
              <div className="w-8 h-8 border-2 border-gray-300 border-t-gray-600 rounded-full animate-spin"></div>
            </div>
          }
        />
      </div>
    );
  }
);

PdfPage.displayName = 'PdfPage';

export default memo(PdfPage);
