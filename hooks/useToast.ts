import { useState, useCallback } from 'react';
import { ToastType } from '../components/Toast';

interface ToastState {
  message: string;
  type: ToastType;
  isVisible: boolean;
  progress?: number;
}

export const useToast = () => {
  const [toast, setToast] = useState<ToastState>({
    message: '',
    type: 'success',
    isVisible: false,
    progress: undefined
  });

  const showToast = useCallback((message: string, type: ToastType = 'success', progress?: number) => {
    setToast({
      message,
      type,
      isVisible: true,
      progress
    });
  }, []);

  const updateToast = useCallback((updates: Partial<ToastState>) => {
    setToast(prev => ({ ...prev, ...updates }));
  }, []);

  const hideToast = useCallback(() => {
    setToast(prev => ({ ...prev, isVisible: false }));
  }, []);

  return {
    toast,
    showToast,
    updateToast,
    hideToast
  };
};
