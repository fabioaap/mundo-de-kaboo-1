import React from 'react';
import { layoutSpacing } from '../design-system/layout/spacing';

export const ModalSkeleton: React.FC = () => {
  return (
    <div className="flex flex-col md:flex-row bg-white relative h-full w-full animate-pulse">
      {/* LEFT SIDE: Cover & Background (Desktop) / TOP HEADER (Mobile) */}
      <div className="relative md:w-1/3 h-64 md:h-full md:shrink-0 flex-shrink-0">
        {/* Solid Background - matching theme color skeleton */}
        <div className="absolute inset-0 z-0 bg-gray-300" />
        
        {/* Navigation Header Skeleton */}
        <div className={`absolute top-0 left-0 right-0 z-20 flex justify-center items-center ${layoutSpacing.authHeader}`}>
          <div className="h-6 bg-white/20 rounded w-20 md:hidden"></div>
        </div>
        
        {/* Cover Image Skeleton - Centered */}
        <div className={`relative h-full flex flex-col items-center justify-center z-30 ${layoutSpacing.pageSection}`}>
          <div className="w-48 h-48 md:w-64 md:h-64 rounded-lg shadow-2xl shadow-gray-400/60 bg-white/30 border border-black/10 shrink-0 mx-auto"></div>
        </div>
      </div>

      {/* RIGHT SIDE: Content (Desktop) / BOTTOM CARD (Mobile) */}
      <div className="flex-1 overflow-y-auto z-10 bg-white rounded-t-[2.5rem] md:rounded-none mt-0 relative shadow-[0_-10px_40px_rgba(0,0,0,0.05)] md:shadow-none md:h-full">
        <div className={layoutSpacing.detailBody}>
          
          {/* Metadata Badges Skeleton - Level + Separator + Age Grades */}
          <div className="flex flex-wrap items-center justify-center md:justify-start gap-2 mb-4">
            <div className="h-6 bg-brand-primary/10 rounded-full w-24"></div>
            <div className="h-4 bg-brand-primary/40 rounded w-1"></div>
            <div className="h-6 bg-brand-primary/10 rounded-full w-16"></div>
            <div className="h-6 bg-brand-primary/10 rounded-full w-16"></div>
            <div className="h-6 bg-brand-primary/10 rounded-full w-16"></div>
          </div>

          {/* Title Skeleton */}
          <div className="mb-6 mt-6">
            <div className="h-8 md:h-12 bg-gray-200 rounded w-3/4 mx-auto md:mx-0"></div>
          </div>

          {/* Progress Bar Skeleton (optional) */}
          <div className="w-full max-w-xs mx-auto md:mx-0 mb-8">
            <div className="flex justify-between mb-2">
              <div className="h-3 bg-gray-200 rounded w-16"></div>
              <div className="h-3 bg-gray-200 rounded w-8"></div>
            </div>
            <div className="h-2 bg-gray-100 rounded-full">
              <div className="h-full bg-gray-200 rounded-full w-1/3"></div>
            </div>
          </div>

          {/* Actions Grid Skeleton (4 buttons) */}
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-10">
            <div className="h-20 bg-gray-100 rounded-2xl"></div>
            <div className="h-20 bg-gray-100 rounded-2xl"></div>
            <div className="h-20 bg-gray-100 rounded-2xl"></div>
            <div className="h-20 bg-gray-100 rounded-2xl"></div>
          </div>

          {/* Pedagogical Information Section Skeleton */}
          <div className="border-t border-gray-100 pt-8 space-y-6">
            {/* Section Title with Icon */}
            <div className="flex items-center gap-2">
              <div className="h-5 w-5 bg-gray-200 rounded"></div>
              <div className="h-6 bg-gray-200 rounded w-48"></div>
            </div>

            <div className={`grid md:grid-cols-2 ${layoutSpacing.cardGridGap}`}>
              {/* Theme Skeleton */}
              <div className="col-span-full space-y-2">
                <div className="h-4 bg-gray-200 rounded w-16"></div>
                <div className="h-4 bg-gray-200 rounded w-full"></div>
                <div className="h-4 bg-gray-200 rounded w-5/6"></div>
              </div>

              {/* Learning Objectives Skeleton */}
              <div className="col-span-full space-y-2">
                <div className="h-4 bg-gray-200 rounded w-40"></div>
                <div className="h-4 bg-gray-200 rounded w-full"></div>
                <div className="h-4 bg-gray-200 rounded w-4/5"></div>
              </div>

              {/* Characters Tags Skeleton */}
              <div className="space-y-2">
                <div className="h-4 bg-gray-200 rounded w-32"></div>
                <div className="flex flex-wrap gap-2">
                  <div className="h-7 bg-indigo-50 rounded-full w-20 border border-indigo-100"></div>
                  <div className="h-7 bg-indigo-50 rounded-full w-24 border border-indigo-100"></div>
                </div>
              </div>

              {/* BNCC Skills Tags Skeleton */}
              <div className="space-y-2">
                <div className="h-4 bg-gray-200 rounded w-36"></div>
                <div className="flex flex-wrap gap-2">
                  <div className="h-7 bg-green-50 rounded-full w-28 border border-green-100"></div>
                  <div className="h-7 bg-green-50 rounded-full w-24 border border-green-100"></div>
                </div>
              </div>

              {/* CASEL Tags Skeleton */}
              <div className="space-y-2">
                <div className="h-4 bg-gray-200 rounded w-40"></div>
                <div className="flex flex-wrap gap-2">
                  <div className="h-7 bg-orange-50 rounded-full w-28 border border-orange-100"></div>
                  <div className="h-7 bg-orange-50 rounded-full w-32 border border-orange-100"></div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
