import React from 'react';
import { createPortal } from 'react-dom';
import { Icons } from './Icons';

interface FilePreviewModalProps {
  isOpen: boolean;
  fileUrl: string;
  fileName: string;
  fileType: 'pdf' | 'audio' | 'video' | 'image' | 'other';
  onClose: () => void;
}

export const FilePreviewModal: React.FC<FilePreviewModalProps> = ({
  isOpen,
  fileUrl,
  fileName,
  fileType,
  onClose
}) => {
  if (!isOpen) return null;
  if (typeof document === 'undefined' || !document.body) return null;

  const stripUrlDecorators = (url: string) => {
    return url.split('#')[0]?.split('?')[0] ?? url;
  };

  const getFileTypeFromUrl = (url: string): 'pdf' | 'audio' | 'video' | 'image' | 'other' => {
    const lowerUrl = stripUrlDecorators(url).toLowerCase();
    if (lowerUrl.includes('.pdf')) return 'pdf';
    if (lowerUrl.match(/\.(mp3|wav|ogg|m4a|aac)$/)) return 'audio';
    if (lowerUrl.match(/\.(mp4|webm|ogg|mov|avi)$/)) return 'video';
    if (lowerUrl.match(/\.(jpg|jpeg|png|gif|webp)$/)) return 'image';
    return 'other';
  };

  const actualFileType = fileType === 'other' ? getFileTypeFromUrl(fileUrl) : fileType;

  return createPortal(
    <div
      className="fixed inset-0 z-[200] flex items-center justify-center p-4"
      onClick={(e) => {
        if (e.target === e.currentTarget) {
          onClose();
        }
      }}
    >
      {/* Backdrop */}
      <div className="absolute inset-0 bg-black/90 backdrop-blur-md animate-in fade-in duration-100" />
      
      {/* Modal Content */}
      <div className="relative w-full max-w-4xl max-h-[90vh] bg-white rounded-2xl shadow-2xl overflow-hidden animate-in zoom-in-95 duration-100 flex flex-col">
        {/* Header */}
        <div className="px-6 py-4 border-b border-gray-200 flex items-center justify-between bg-white">
          <div className="flex items-center gap-3">
            {actualFileType === 'pdf' && <Icons.FileText size={20} className="text-brand-primary" />}
            {actualFileType === 'audio' && <Icons.Headphones size={20} className="text-brand-primary" />}
            {actualFileType === 'video' && <Icons.Video size={20} className="text-brand-primary" />}
            {actualFileType === 'image' && <Icons.Eye size={20} className="text-brand-primary" />}
            <h2 className="text-lg font-bold text-gray-800 truncate">{fileName}</h2>
          </div>
          <button
            onClick={onClose}
            className="w-10 h-10 rounded-full bg-gray-100 text-gray-600 flex items-center justify-center hover:bg-gray-200 transition-colors"
            aria-label="Fechar"
          >
            <Icons.X size={20} />
          </button>
        </div>

        {/* Preview Content */}
        <div className="flex-1 overflow-auto p-6 bg-gray-50">
          {actualFileType === 'pdf' && (
            <iframe
              src={fileUrl}
              className="w-full h-full min-h-[600px] rounded-lg border border-gray-200"
              title={fileName}
            />
          )}
          
          {actualFileType === 'audio' && (
            <div className="flex items-center justify-center min-h-[400px]">
              <audio controls className="w-full max-w-2xl">
                <source src={fileUrl} />
                Seu navegador não suporta o elemento de áudio.
              </audio>
            </div>
          )}
          
          {actualFileType === 'video' && (
            <div className="flex items-center justify-center min-h-[400px]">
              <video controls className="w-full max-w-4xl rounded-lg">
                <source src={fileUrl} />
                Seu navegador não suporta o elemento de vídeo.
              </video>
            </div>
          )}
          
          {actualFileType === 'image' && (
            <div className="flex items-center justify-center min-h-[400px]">
              <img
                src={fileUrl}
                alt={fileName}
                className="max-w-full max-h-[70vh] object-contain rounded-lg"
              />
            </div>
          )}
          
          {actualFileType === 'other' && (
            <div className="flex flex-col items-center justify-center min-h-[400px] text-center">
              <Icons.FileText size={64} className="text-gray-300 mb-4" />
              <p className="text-gray-600 font-bold mb-2">Preview não disponível</p>
              <a
                href={fileUrl}
                target="_blank"
                rel="noopener noreferrer"
                className="text-brand-primary hover:underline flex items-center gap-2"
              >
                Abrir arquivo em nova aba
              </a>
            </div>
          )}
        </div>
      </div>
    </div>,
    document.body
  );
};
