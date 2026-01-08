import React, { useEffect } from 'react';
import { Icons } from './Icons';

export type ToastType = 'success' | 'error';

interface ToastProps {
  message: string;
  type: ToastType;
  isVisible: boolean;
  onClose: () => void;
  duration?: number;
}

export const Toast: React.FC<ToastProps> = ({
  message,
  type,
  isVisible,
  onClose,
  duration = 3000
}) => {
  useEffect(() => {
    if (isVisible) {
      const timer = setTimeout(() => {
        onClose();
      }, duration);

      return () => clearTimeout(timer);
    }
  }, [isVisible, duration, onClose]);

  if (!isVisible) return null;

  const bgColor = type === 'success' ? 'bg-green-500' : 'bg-red-500';
  const icon = type === 'success' ? <Icons.Check size={20} /> : <Icons.AlertCircle size={20} />;

  return (
    <div className="fixed top-4 right-4 z-[300] animate-in slide-in-from-top-5 duration-300">
      <div className={`${bgColor} text-white rounded-xl shadow-lg px-4 py-3 flex items-center gap-3 min-w-[300px] max-w-md`}>
        <div className="flex-shrink-0">
          {icon}
        </div>
        <p className="flex-1 font-bold text-sm">{message}</p>
        <button
          onClick={onClose}
          className="flex-shrink-0 hover:bg-white/20 rounded-full p-1 transition-colors"
          aria-label="Fechar"
        >
          <Icons.X size={16} />
        </button>
      </div>
    </div>
  );
};
