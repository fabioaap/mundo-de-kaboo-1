import React, { useState, useRef } from 'react';
import { Icons } from './Icons';
import { isPlaceholderImageUrl, placeholderImageUrl } from '../lib/appPaths';
import { uploadFile, extractOriginalFileName } from '../lib/storage';
import { ConfirmationModal } from './ConfirmationModal';
import { FilePreviewModal } from './FilePreviewModal';
import { Toast } from './Toast';
import { useToast } from '../hooks/useToast';

interface FileUploadProps {
  label: string;
  value: string; // Current URL value
  onChange: (url: string) => void;
  folder: 'covers' | 'characters' | 'pdfs' | 'audio' | 'video' | 'extras';
  accept: string; // File types to accept (e.g., "image/*", "application/pdf")
  collectionId?: string;
  disabled?: boolean;
  hideUrlInput?: boolean; // For cover images, hide URL input
  showAsIcon?: boolean; // Show as file icon instead of URL input
  inputId?: string;
}

export const FileUpload: React.FC<FileUploadProps> = ({
  label,
  value,
  onChange,
  folder,
  accept,
  collectionId,
  disabled = false,
  hideUrlInput = false,
  showAsIcon = false,
  inputId,
}) => {
  const [uploading, setUploading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [showConfirmDelete, setShowConfirmDelete] = useState(false);
  const [showPreview, setShowPreview] = useState(false);
  const [isHovering, setIsHovering] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const { toast, showToast, updateToast, hideToast } = useToast();
  const hasPlaceholderImage = isPlaceholderImageUrl(value);
  const resolvedInputId = inputId || `file-upload-${folder}`;

  const handleFileSelect = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    // Validate file size (500MB limit)
    const maxSize = 500 * 1024 * 1024; // 500MB
    if (file.size > maxSize) {
      setError('Arquivo muito grande. Tamanho máximo: 500MB');
      return;
    }

    setUploading(true);
    setError(null);

    // Show progress toast
    const fileName = file.name.length > 30 ? file.name.substring(0, 30) + '...' : file.name;
    showToast(`Enviando: ${fileName}`, 'progress', 0);

    try {
      const result = await uploadFile(file, folder, collectionId, (progress) => {
        // Update progress in toast
        updateToast({ progress });
      });

      // Hide progress toast
      hideToast();

      if (result.error) {
        setError(result.error);
        showToast('Erro ao fazer upload do arquivo.', 'error');
      } else if (result.url) {
        onChange(result.url);
        setError(null);
        showToast('Arquivo enviado com sucesso!', 'success');
      }
    } catch (err: any) {
      // Hide progress toast
      hideToast();
      const errorMsg = err.message || 'Erro ao fazer upload';
      setError(errorMsg);
      showToast(errorMsg, 'error');
    } finally {
      setUploading(false);
      // Reset file input
      if (fileInputRef.current) {
        fileInputRef.current.value = '';
      }
    }
  };

  const handleRemove = async () => {
    // If it's a cover image, set to placeholder instead of empty
    if (folder === 'covers') {
      onChange(placeholderImageUrl);
    } else {
      onChange('');
    }
    setError(null);
    setShowConfirmDelete(false);
    showToast('Arquivo removido com sucesso!', 'success');
  };

  const isImage = folder === 'covers' || folder === 'characters' || !!value.match(/\.(jpg|jpeg|png|gif|webp|svg)$/i);


  return (
    <>
      {/* File Upload Input - Always present but hidden */}
      <input
        ref={fileInputRef}
        type="file"
        accept={accept}
        onChange={handleFileSelect}
        className="hidden"
        id={resolvedInputId}
        disabled={disabled || uploading}
      />

      <div>
        <label className="block text-sm font-bold text-gray-700 mb-2">
          {label}
        </label>

        {/* Image Thumbnail Preview with Hover Effect */}
        {isImage && value && !showAsIcon && (
          <div className="mb-3">
            <div
              className="relative inline-block group cursor-pointer"
              onMouseEnter={() => setIsHovering(true)}
              onMouseLeave={() => setIsHovering(false)}
              onClick={() => {
                // Only show preview if it's not the placeholder
                if (!hasPlaceholderImage) {
                  setShowPreview(true);
                }
              }}
            >
              <img
                src={value}
                alt="Preview"
                className="w-32 h-32 object-cover rounded-xl border-2 border-gray-200 transition-opacity duration-300"
                onError={(e) => {
                  // Fallback to placeholder if image fails to load
                  (e.target as HTMLImageElement).src = placeholderImageUrl;
                }}
              />
              {/* Hover Overlay with Eye Icon - Only show if not placeholder */}
              {isHovering && !hasPlaceholderImage && (
                <div className="absolute inset-0 bg-black/50 rounded-xl flex items-center justify-center transition-opacity duration-300 ease-in-out">
                  <Icons.Eye size={24} className="text-white" />
                </div>
              )}
            </div>
            {/* Action Button Below Thumbnail */}
            {hasPlaceholderImage ? (
              <button
                type="button"
                onClick={(e) => {
                  e.preventDefault();
                  e.stopPropagation();
                  if (fileInputRef.current) {
                    fileInputRef.current.click();
                  }
                }}
                className="mt-2 w-full px-3 py-1.5 bg-brand-primary/10 text-brand-primary rounded-lg font-bold text-sm hover:bg-brand-primary/20 transition-colors disabled:opacity-50"
                disabled={disabled || uploading}
              >
                Adicionar Imagem
              </button>
            ) : (
              <button
                type="button"
                onClick={() => setShowConfirmDelete(true)}
                className="mt-2 w-full px-3 py-1.5 bg-red-50 text-red-500 rounded-lg font-bold text-sm hover:bg-red-100 transition-colors disabled:opacity-50"
                disabled={disabled || uploading}
              >
                Remover Imagem
              </button>
            )}
          </div>
        )}

        {/* File Icon Display (for PDF, Audio, Video when showAsIcon is true) */}
        {showAsIcon && value && (
          <div className="mb-3">
            <div
              className="inline-flex items-center gap-2 px-3 py-2 bg-brand-primary/10 text-brand-primary rounded-full text-sm font-bold cursor-pointer transition-all duration-300 ease-in-out hover:bg-brand-primary/20"
              onMouseEnter={() => setIsHovering(true)}
              onMouseLeave={() => setIsHovering(false)}
              onClick={() => setShowPreview(true)}
              style={{ minWidth: 'fit-content' }}
            >
              <div className="flex-shrink-0 w-[14px] flex items-center justify-center transition-opacity duration-300 ease-in-out">
                {isHovering ? (
                  <Icons.Eye size={14} />
                ) : (
                  <Icons.FileText size={14} />
                )}
              </div>
              <span className="w-[140px] truncate inline-block text-left">
                {isHovering ? 'Visualizar Arquivo' : extractOriginalFileName(value)}
              </span>
              <button
                type="button"
                onClick={(e) => {
                  e.stopPropagation();
                  setShowConfirmDelete(true);
                }}
                className="hover:bg-brand-primary/30 rounded-full p-0.5 transition-colors flex-shrink-0"
                aria-label={`Remover arquivo`}
                disabled={disabled || uploading}
              >
                <Icons.X size={14} />
              </button>
            </div>
          </div>
        )}

        {/* URL Input (for manual entry or display) - Hidden for covers and when showAsIcon is true */}
        {!hideUrlInput && !showAsIcon && (
          <div className="flex gap-2 mb-2">
            <input
              type="url"
              value={value}
              onChange={(e) => onChange(e.target.value)}
              className="flex-1 bg-gray-50 border-none rounded-2xl p-4 text-gray-800 focus:ring-2 focus:ring-brand-primary outline-none"
              placeholder="URL ou faça upload de um arquivo..."
              disabled={disabled || uploading}
            />
            {value && !isImage && (
              <button
                type="button"
                onClick={() => setShowConfirmDelete(true)}
                className="px-4 py-2 bg-red-50 text-red-500 rounded-2xl font-bold hover:bg-red-100 transition-colors disabled:opacity-50"
                disabled={disabled || uploading}
                title="Remover arquivo"
              >
                <Icons.X size={20} />
              </button>
            )}
          </div>
        )}

        {/* File Upload Button - Show when no file is uploaded */}
        {!value && (
          <div className="flex items-center gap-2">
            <label
              htmlFor={resolvedInputId}
              className={`flex items-center gap-2 px-4 py-2 bg-brand-primary/10 text-brand-primary rounded-xl font-bold cursor-pointer hover:bg-brand-primary/20 transition-colors disabled:opacity-50 disabled:cursor-not-allowed ${uploading ? 'opacity-50 cursor-wait' : ''
                }`}
            >
              {uploading ? (
                <>
                  <div className="w-4 h-4 border-2 border-brand-primary border-t-transparent rounded-full animate-spin"></div>
                  <span>Enviando...</span>
                </>
              ) : (
                <>
                  <Icons.Upload size={18} />
                  <span>Fazer Upload</span>
                </>
              )}
            </label>
          </div>
        )}

        {/* Error Message */}
        {error && (
          <div className="mt-2 p-3 bg-red-50 border border-red-200 rounded-xl">
            <p className="text-sm text-red-600 font-bold mb-1">{error}</p>
            {error.includes('Bucket') && (
              <p className="text-xs text-red-500 mt-1">
                📋 Instruções: Vá para Supabase Dashboard → Storage → "New bucket" → Nome: "collections" → Marque "Public" → Crie o bucket.
              </p>
            )}
          </div>
        )}

        {/* File Type Hints */}
        <p className="mt-1 text-xs text-gray-500">
          {folder === 'covers' && 'Formatos aceitos: JPG, PNG, WebP (máx. 500MB)'}
          {folder === 'characters' && 'Formatos aceitos: JPG, PNG, WebP e SVG (máx. 500MB)'}
          {folder === 'pdfs' && 'Formatos aceitos: PDF (máx. 500MB)'}
          {folder === 'audio' && 'Formatos aceitos: MP3, WAV, OGG (máx. 500MB)'}
          {folder === 'video' && 'Formatos aceitos: MP4, WebM (máx. 500MB)'}
          {folder === 'extras' && 'Formatos aceitos: JPG, PNG, WebP e SVG (máx. 500MB)'}
        </p>
      </div>

      <ConfirmationModal
        isOpen={showConfirmDelete}
        title="Confirmar Exclusão"
        message="Tem certeza que deseja remover este arquivo? Esta ação não pode ser desfeita."
        confirmText="Remover"
        cancelText="Cancelar"
        onConfirm={handleRemove}
        onCancel={() => setShowConfirmDelete(false)}
      />

      <FilePreviewModal
        isOpen={showPreview}
        fileUrl={value}
        fileName={extractOriginalFileName(value)}
        fileType={isImage ? 'image' : folder === 'pdfs' ? 'pdf' : folder === 'audio' ? 'audio' : folder === 'video' ? 'video' : 'other'}
        onClose={() => setShowPreview(false)}
      />

      <Toast
        message={toast.message}
        type={toast.type}
        isVisible={toast.isVisible}
        onClose={hideToast}
        progress={toast.progress}
      />
    </>
  );
};
