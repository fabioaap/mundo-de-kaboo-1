import React, { forwardRef, memo, useCallback } from 'react';
import HTMLFlipBook from 'react-pageflip';
import PdfPage from './PdfPage';
import { useDebounce } from '../../hooks/useDebounce';
import useScreenSize from '../../hooks/useScreenSize';

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
    const debouncedZoom = useDebounce(viewerStates.zoomScale, 500);
    const firstPageRenderedRef = React.useRef(false);

    const handleFirstPageRender = React.useCallback(() => {
      if (!firstPageRenderedRef.current && onFirstPageRendered) {
        firstPageRenderedRef.current = true;
        onFirstPageRendered();
      }
    }, [onFirstPageRendered]);

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
          {Array.from({ length: pdfDetails.totalPages }, (_, index) => (
            <PdfPage
              key={`page-${index}`}
              height={pageHeight}
              zoomScale={debouncedZoom}
              page={index + 1}
              isPageInViewRange={true}
              isPageInView={isPageInView(index)}
              onRenderSuccess={index === 0 ? handleFirstPageRender : undefined}
            />
          ))}
        </HTMLFlipBook>
      </div>
    );
  }
);

FlipbookLoader.displayName = 'FlipbookLoader';

export default memo(FlipbookLoader);
