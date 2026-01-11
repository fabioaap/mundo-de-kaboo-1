import React, { memo, useState, useEffect, useCallback, useRef } from 'react';
import { useRefSize } from '../../hooks/useRefSize';
import FlipbookLoader from './FlipbookLoader';
import { TransformComponent } from 'react-zoom-pan-pinch';

interface FlipbookProps {
  viewerStates: {
    currentPageIndex: number;
    zoomScale: number;
  };
  setViewerStates: (states: any) => void;
  flipbookRef: React.RefObject<any>;
  pdfDetails: {
    totalPages: number;
    width: number;
    height: number;
  };
  innerRef?: React.RefObject<any>;
  onRef?: (ref: any) => void;
  onPageChange?: (currentPage: number) => void;
  onFirstPageRendered?: () => void;
}

const Flipbook = memo(({ viewerStates, setViewerStates, flipbookRef, pdfDetails, innerRef, onRef, onPageChange, onFirstPageRendered }: FlipbookProps) => {
  const loaderRef = useRef<any>(null);
  const { ref, width, height, refreshSize } = useRefSize();
  const [scale, setScale] = useState(1);
  const [wrapperCss, setWrapperCss] = useState<React.CSSProperties>({});
  const [viewRange, setViewRange] = useState<[number, number]>([0, 4]);

  useEffect(() => {
    if (pdfDetails) {
      // Use window dimensions as fallback if ref dimensions aren't available yet
      const effectiveWidth = width > 0 ? width : window.innerWidth - 100;
      const effectiveHeight = height > 0 ? height : window.innerHeight - 200;
      
      if (effectiveWidth > 0 && effectiveHeight > 0) {
        console.log('📐 Flipbook: Calculating scale', { effectiveWidth, effectiveHeight, pdfDetails });
        // Calculate scale to fit two pages side by side with some margin
        const pageWidth = pdfDetails.width;
        const pageHeight = pdfDetails.height;
        const availableWidth = effectiveWidth - 80; // Leave 40px margin on each side
        const availableHeight = effectiveHeight - 80; // Leave 40px margin top/bottom
        
        const scaleX = availableWidth / (2 * pageWidth);
        const scaleY = availableHeight / pageHeight;
        const calculatedScale = Math.min(scaleX, scaleY, 1); // Don't scale up beyond 1
        
        console.log('📐 Flipbook: Calculated scale', { scaleX, scaleY, calculatedScale, pageWidth, pageHeight });
        
        setScale(calculatedScale);
        setWrapperCss({
          width: `${pageWidth * calculatedScale * 2}px`,
          height: `${pageHeight * calculatedScale}px`,
          margin: '0 auto', // Center the wrapper
        });
      } else {
        console.log('📐 Flipbook: Waiting for dimensions', { effectiveWidth, effectiveHeight });
      }
    } else {
      console.log('📐 Flipbook: Missing pdfDetails');
    }
  }, [pdfDetails, width, height]);

  // Initialize viewRange to load all pages initially
  useEffect(() => {
    if (pdfDetails) {
      setViewRange([0, pdfDetails.totalPages - 1]);
    }
  }, [pdfDetails]);

  const content = (
    <div className="w-full h-full flex justify-center items-center overflow-hidden bg-transparent" style={{ minHeight: '400px', minWidth: '300px' }}>
      {pdfDetails && scale > 0 ? (
        <div style={wrapperCss} className="flex justify-center items-center bg-transparent">
          <FlipbookLoader
            ref={(el) => {
              loaderRef.current = el;
              // Update parent refs when loader ref changes
              if (onRef && el) {
                onRef({ current: el });
              }
              if (innerRef && el) {
                (innerRef as React.MutableRefObject<any>).current = el;
              }
              if (flipbookRef && el) {
                (flipbookRef as React.MutableRefObject<any>).current = el;
              }
            }}
            pdfDetails={pdfDetails}
            scale={scale}
            viewRange={viewRange}
            setViewRange={setViewRange}
            viewerStates={viewerStates}
            setViewerStates={(newStates) => {
              setViewerStates(newStates);
              if (onPageChange) {
                onPageChange(newStates.currentPageIndex);
              }
            }}
            onFirstPageRendered={onFirstPageRendered}
          />
        </div>
      ) : (
        <div className="text-center text-gray-600 bg-transparent p-8 rounded-xl shadow-lg">
          <p className="font-bold mb-2">Calculando dimensões...</p>
          <p className="text-xs">scale: {scale.toFixed(3)}, width: {width}, height: {height}</p>
          <p className="text-xs">pdfDetails: {pdfDetails ? `loaded (${pdfDetails.totalPages} pages, ${pdfDetails.width}x${pdfDetails.height})` : 'null'}</p>
        </div>
      )}
    </div>
  );

  return (
    <div
      ref={ref}
      className="relative h-full w-full bg-transparent flex justify-center items-center overflow-hidden"
      style={{ minHeight: '400px', minWidth: '300px', height: '100%', display: 'flex', justifyContent: 'center', alignItems: 'center' }}
    >
      <TransformComponent
        wrapperStyle={{ width: '100%', height: '100%', display: 'flex', justifyContent: 'center', alignItems: 'center', background: 'transparent' }}
        contentStyle={{ width: '100%', height: '100%', display: 'flex', justifyContent: 'center', alignItems: 'center', background: 'transparent' }}
      >
        {content}
      </TransformComponent>
    </div>
  );
});

Flipbook.displayName = 'Flipbook';

export default Flipbook;
