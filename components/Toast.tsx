import React, { useEffect } from 'react';
import { Icons } from './Icons';

export type ToastType = 'success' | 'error' | 'progress';

interface ToastProps {
  message: string;
  type: ToastType;
  isVisible: boolean;
  onClose: () => void;
  duration?: number;
  progress?: number; // 0-100 for progress type
}

export const Toast: React.FC<ToastProps> = ({
  message,
  type,
  isVisible,
  onClose,
  duration = 3000,
  progress
}) => {
  useEffect(() => {
    if (isVisible && type !== 'progress') {
      const timer = setTimeout(() => {
        onClose();
      }, duration);

      return () => clearTimeout(timer);
    }
  }, [isVisible, duration, onClose, type]);

  if (!isVisible) return null;

  const bgColor = type === 'success' ? 'bg-green-500' : type === 'error' ? 'bg-red-500' : 'bg-blue-500';
  const icon = type === 'success' ? <Icons.Check size={20} /> : type === 'error' ? <Icons.AlertCircle size={20} /> : (
    <div className="w-5 h-5 border-2 border-white border-t-transparent rounded-full animate-spin"></div>
  );

  return (
    <div className="fixed top-4 right-4 z-[300] animate-in slide-in-from-top-5 duration-300">
      <div className={`${bgColor} text-white rounded-xl shadow-lg px-4 py-3 flex flex-col gap-2 min-w-[300px] max-w-md`}>
        <div className="flex items-center gap-3">
          <div className="flex-shrink-0">
            {icon}
          </div>
          <p className="flex-1 font-bold text-sm">{message}</p>
          {type !== 'progress' && (
            <button
              onClick={onClose}
              className="flex-shrink-0 hover:bg-white/20 rounded-full p-1 transition-colors"
              aria-label="Fechar"
            >
              <Icons.X size={16} />
            </button>
          )}
        </div>
        {type === 'progress' && progress !== undefined && (
          <div className="w-full bg-white/20 rounded-full h-2 overflow-hidden">
            <div 
              className="bg-white h-full rounded-full transition-all duration-300 ease-out"
              style={{ width: `${Math.min(100, Math.max(0, progress))}%` }}
            />
          </div>
        )}
      </div>
    </div>
  );
};
