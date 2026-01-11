import React, { forwardRef, memo } from 'react';
import { Page } from 'react-pdf';

interface PdfPageProps {
  page: number;
  height: number;
  zoomScale: number;
  isPageInView: boolean;
  isPageInViewRange: boolean;
  onRenderSuccess?: () => void;
}

const PdfPage = forwardRef<HTMLDivElement, PdfPageProps>(
  ({ page, height, zoomScale, isPageInView, isPageInViewRange, onRenderSuccess }, ref) => {
    const [isRendered, setIsRendered] = React.useState(false);

    const handleRenderSuccess = React.useCallback(() => {
      if (!isRendered && onRenderSuccess) {
        setIsRendered(true);
        // Small delay to ensure page is fully painted
        setTimeout(() => {
          onRenderSuccess();
        }, 150);
      }
    }, [isRendered, onRenderSuccess]);

    const handleLoadSuccess = React.useCallback(() => {
      // Also trigger on load success as a fallback
      if (!isRendered && onRenderSuccess) {
        setTimeout(() => {
          setIsRendered(true);
          onRenderSuccess();
        }, 150);
      }
    }, [isRendered, onRenderSuccess]);

    // Always render the PDF page to prevent black screens
    return (
      <div ref={ref} className="bg-transparent w-full h-full flex items-center justify-center">
        <Page
          devicePixelRatio={
            isPageInView && zoomScale > 1.7
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
