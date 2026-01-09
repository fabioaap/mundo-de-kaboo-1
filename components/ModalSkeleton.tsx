import React from 'react';

export const ModalSkeleton: React.FC = () => {
  return (
    <div className="flex flex-col md:flex-row bg-white relative h-full w-full animate-pulse">
      {/* LEFT SIDE: Cover & Background (Desktop) / TOP HEADER (Mobile) */}
      <div className="relative md:w-1/3 h-64 md:h-full md:shrink-0 flex-shrink-0">
        {/* Solid Background - matching theme color skeleton */}
        <div className="absolute inset-0 z-0 bg-gray-300" />
        
        {/* Navigation Header Skeleton */}
        <div className="absolute top-0 left-0 right-0 z-20 px-6 pt-12 pb-4 md:p-8 flex justify-center items-center">
          <div className="h-6 bg-white/20 rounded w-20 md:hidden"></div>
        </div>
        
        {/* Cover Image Skeleton - Centered */}
        <div className="relative h-full flex flex-col items-center justify-center px-6 py-6 z-30">
          <div className="w-48 h-48 md:w-64 md:h-64 rounded-3xl shadow-2xl bg-white/30 border-4 border-white/20 shrink-0 mx-auto"></div>
        </div>
      </div>

      {/* RIGHT SIDE: Content (Desktop) / BOTTOM CARD (Mobile) */}
      <div className="flex-1 overflow-y-auto z-10 bg-white rounded-t-[2.5rem] md:rounded-none mt-0 relative shadow-[0_-10px_40px_rgba(0,0,0,0.05)] md:shadow-none md:h-full">
        <div className="pt-16 px-6 pb-24 md:p-12 md:max-w-4xl md:mx-auto space-y-6">
          
          {/* Level Badge Skeleton */}
          <div className="flex flex-wrap justify-center md:justify-start gap-2">
            <div className="h-6 bg-gray-200 rounded-full w-16"></div>
          </div>

          {/* Title Skeleton */}
          <div className="space-y-3">
            <div className="h-8 md:h-10 bg-gray-200 rounded-lg w-3/4 mx-auto md:mx-0"></div>
            <div className="h-8 md:h-10 bg-gray-200 rounded-lg w-1/2 mx-auto md:mx-0"></div>
          </div>

          {/* Progress Bar Skeleton (optional) */}
          <div className="w-full max-w-xs mx-auto md:mx-0">
            <div className="h-2 bg-gray-100 rounded-full">
              <div className="h-full bg-gray-200 rounded-full w-1/3"></div>
            </div>
          </div>

          {/* Description Skeleton */}
          <div className="space-y-2">
            <div className="h-4 bg-gray-200 rounded w-full"></div>
            <div className="h-4 bg-gray-200 rounded w-full"></div>
            <div className="h-4 bg-gray-200 rounded w-5/6"></div>
            <div className="h-4 bg-gray-200 rounded w-4/5"></div>
          </div>

          {/* Actions Grid Skeleton (4 buttons) */}
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            <div className="h-20 bg-gray-100 rounded-2xl"></div>
            <div className="h-20 bg-gray-100 rounded-2xl"></div>
            <div className="h-20 bg-gray-100 rounded-2xl"></div>
            <div className="h-20 bg-gray-100 rounded-2xl"></div>
          </div>

          {/* Pedagogical Information Section Skeleton */}
          <div className="border-t border-gray-100 pt-8 space-y-6">
            {/* Section Title */}
            <div className="h-6 bg-gray-200 rounded w-48"></div>

            <div className="grid md:grid-cols-2 gap-6">
              {/* Theme Skeleton */}
              <div className="col-span-full space-y-2">
                <div className="h-4 bg-gray-200 rounded w-16"></div>
                <div className="h-4 bg-gray-200 rounded w-full"></div>
                <div className="h-4 bg-gray-200 rounded w-5/6"></div>
              </div>

              {/* Learning Objectives Skeleton */}
              <div className="col-span-full space-y-2">
                <div className="h-4 bg-gray-200 rounded w-32"></div>
                <div className="h-4 bg-gray-200 rounded w-full"></div>
                <div className="h-4 bg-gray-200 rounded w-4/5"></div>
              </div>

              {/* Characters Tags Skeleton */}
              <div className="space-y-2">
                <div className="h-4 bg-gray-200 rounded w-28"></div>
                <div className="flex flex-wrap gap-2">
                  <div className="h-7 bg-gray-200 rounded-lg w-20"></div>
                  <div className="h-7 bg-gray-200 rounded-lg w-24"></div>
                  <div className="h-7 bg-gray-200 rounded-lg w-18"></div>
                </div>
              </div>

              {/* BNCC Skills Tags Skeleton */}
              <div className="space-y-2">
                <div className="h-4 bg-gray-200 rounded w-32"></div>
                <div className="flex flex-wrap gap-2">
                  <div className="h-7 bg-gray-200 rounded-lg w-28"></div>
                  <div className="h-7 bg-gray-200 rounded-lg w-24"></div>
                </div>
              </div>

              {/* Age Grade Tags Skeleton */}
              <div className="space-y-2">
                <div className="h-4 bg-gray-200 rounded w-24"></div>
                <div className="flex flex-wrap gap-2">
                  <div className="h-7 bg-gray-200 rounded-lg w-16"></div>
                  <div className="h-7 bg-gray-200 rounded-lg w-20"></div>
                </div>
              </div>

              {/* CASEL Tags Skeleton */}
              <div className="space-y-2">
                <div className="h-4 bg-gray-200 rounded w-36"></div>
                <div className="flex flex-wrap gap-2">
                  <div className="h-7 bg-gray-200 rounded-lg w-28"></div>
                  <div className="h-7 bg-gray-200 rounded-lg w-32"></div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
