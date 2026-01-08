import React from 'react';
import { Icons } from './Icons';

interface PageHeaderProps {
  title: string;
  onBack?: () => void;
  className?: string;
  rightContent?: React.ReactNode;
}

export const PageHeader: React.FC<PageHeaderProps> = ({ title, onBack, className = '', rightContent }) => {
  return (
    <div className={`px-6 pt-12 pb-6 md:px-8 md:pt-8 md:pb-8 flex items-center gap-4 bg-white sticky top-0 z-30 ${className}`}>
      {onBack && (
        <button 
          onClick={onBack}
          className="w-10 h-10 rounded-full bg-gray-50 flex items-center justify-center hover:bg-gray-100 text-kaboo-primary transition-all active:scale-95 group"
          title="Voltar"
        >
          <Icons.ChevronLeft size={24} className="stroke-[2.5px] group-hover:-translate-x-0.5 transition-transform" />
        </button>
      )}
      <h1 className="text-3xl font-black text-kaboo-primary tracking-tight flex-1">
        {title}
      </h1>
      
      {rightContent && (
        <div className="ml-auto">
          {rightContent}
        </div>
      )}
    </div>
  );
};