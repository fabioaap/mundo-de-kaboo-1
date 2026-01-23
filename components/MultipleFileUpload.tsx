import React, { useState, useRef } from 'react';
import { Icons } from './Icons';
import { uploadFile, deleteFile, extractOriginalFileName } from '../lib/storage';
import { ConfirmationModal } from './ConfirmationModal';
import { FilePreviewModal } from './FilePreviewModal';
import { Toast } from './Toast';
import { useToast } from '../hooks/useToast';

interface FileItem {
  url: string;
  name: string;
}

interface MultipleFileUploadProps {
  label: string;
  value: string[]; // Array of file URLs
  onChange: (urls: string[]) => void;
  folder: 'covers' | 'pdfs' | 'audio' | 'video' | 'extras';
  accept?: string;
  collectionId?: string;
  disabled?: boolean;
}

export const MultipleFileUpload: React.FC<MultipleFileUploadProps> = ({
  label,
  value,
  onChange,
  folder,
  accept = '*/*',
  collectionId,
  disabled = false
}) => {
  const [uploading, setUploading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [fileToDelete, setFileToDelete] = useState<string | null>(null);
  const [hoveredFileIndex, setHoveredFileIndex] = useState<number | null>(null);
  const [previewFile, setPreviewFile] = useState<{ url: string; name: string } | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const { toast, showToast, hideToast } = useToast();

  const handleFileSelect = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = Array.from(e.target.files || []);
    if (files.length === 0) return;

    // Validate file sizes (500MB limit per file)
    const maxSize = 500 * 1024 * 1024; // 500MB
    const oversizedFiles = files.filter(f => f.size > maxSize);
    if (oversizedFiles.length > 0) {
      setError(`Arquivo(s) muito grande(s). Tamanho máximo: 500MB por arquivo`);
      return;
    }

    setUploading(true);
    setError(null);

    try {
      const uploadedUrls: string[] = [];
      
      for (const file of files) {
        const result = await uploadFile(file, folder as any, collectionId);
        
        if (result.error) {
          setError(result.error);
          setUploading(false);
          showToast(`Erro ao fazer upload de ${file.name}`, 'error');
          return;
        }
        
        if (result.url) {
          uploadedUrls.push(result.url);
        }
      }

      // Add new URLs to existing ones
      onChange([...value, ...uploadedUrls]);
      setError(null);
      if (uploadedUrls.length > 0) {
        showToast(`${uploadedUrls.length} arquivo(s) enviado(s) com sucesso!`, 'success');
      }
    } catch (err: any) {
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

  const handleRemove = async (urlToRemove: string) => {
    // Remove from list immediately (optimistic update)
    const newUrls = value.filter(url => url !== urlToRemove);
    onChange(newUrls);
    setFileToDelete(null);

    // Try to delete from storage (non-blocking)
    try {
      await deleteFile(urlToRemove);
      showToast('Arquivo removido com sucesso!', 'success');
    } catch (err) {
      console.error('Error deleting file from storage:', err);
      showToast('Arquivo removido da lista, mas pode ainda existir no servidor.', 'error');
      // File is already removed from the list, so we continue
    }
  };

  const getFileName = (url: string): string => {
    return extractOriginalFileName(url);
  };

  return (
    <>
      <div>
        <label className="block text-sm font-bold text-gray-700 mb-2">
          {label}
        </label>

      {/* File List */}
      {value.length > 0 && (
        <div className="flex flex-wrap gap-2 mb-3">
          {value.map((url, index) => (
            <div
              key={index}
              className="inline-flex items-center gap-2 px-3 py-2 bg-kaboo-primary/10 text-kaboo-primary rounded-full text-sm font-bold cursor-pointer transition-all duration-300 ease-in-out hover:bg-kaboo-primary/20"
              onMouseEnter={() => setHoveredFileIndex(index)}
              onMouseLeave={() => setHoveredFileIndex(null)}
              onClick={() => setPreviewFile({ url, name: getFileName(url) })}
              style={{ minWidth: 'fit-content' }}
            >
              <div className="flex-shrink-0 w-[14px] flex items-center justify-center transition-opacity duration-300 ease-in-out">
                {hoveredFileIndex === index ? (
                  <Icons.Eye size={14} />
                ) : (
                  <Icons.FileText size={14} />
                )}
              </div>
              <span className="w-[140px] truncate inline-block text-left">
                {hoveredFileIndex === index ? 'Visualizar Arquivo' : getFileName(url)}
              </span>
              <button
                type="button"
                onClick={(e) => {
                  e.stopPropagation();
                  setFileToDelete(url);
                }}
                className="hover:bg-kaboo-primary/30 rounded-full p-0.5 transition-colors flex-shrink-0"
                aria-label={`Remover ${getFileName(url)}`}
                disabled={disabled || uploading}
              >
                <Icons.X size={14} />
              </button>
            </div>
          ))}
        </div>
      )}

        {/* Upload Button */}
        <div className="flex items-center gap-2">
          <input
            ref={fileInputRef}
            type="file"
            accept={accept}
            onChange={handleFileSelect}
            multiple
            className="hidden"
            id={`multiple-file-upload-${folder}`}
            disabled={disabled || uploading}
          />
          <label
            htmlFor={`multiple-file-upload-${folder}`}
            className={`flex items-center gap-2 px-4 py-2 bg-kaboo-primary/10 text-kaboo-primary rounded-xl font-bold cursor-pointer hover:bg-kaboo-primary/20 transition-colors disabled:opacity-50 disabled:cursor-not-allowed ${
              uploading ? 'opacity-50 cursor-wait' : ''
            }`}
          >
            {uploading ? (
              <>
                <div className="w-4 h-4 border-2 border-kaboo-primary border-t-transparent rounded-full animate-spin"></div>
                <span>Enviando...</span>
              </>
            ) : (
              <>
                <Icons.Upload size={18} />
                <span>Adicionar Arquivos</span>
              </>
            )}
          </label>

          {value.length > 0 && (
            <span className="text-sm text-gray-500">
              {value.length} arquivo{value.length !== 1 ? 's' : ''} adicionado{value.length !== 1 ? 's' : ''}
            </span>
          )}
        </div>

        {/* Error Message */}
        {error && (
          <div className="mt-2 p-3 bg-red-50 border border-red-200 rounded-xl">
            <p className="text-sm text-red-600 font-bold">{error}</p>
          </div>
        )}

        {/* File Type Hints */}
        <p className="mt-1 text-xs text-gray-500">
          Você pode adicionar múltiplos arquivos. Formatos aceitos: Todos (máx. 500MB por arquivo)
        </p>
      </div>

    <ConfirmationModal
      isOpen={!!fileToDelete}
      title="Confirmar Exclusão"
      message={`Tem certeza que deseja remover o arquivo "${fileToDelete ? getFileName(fileToDelete) : ''}"? Esta ação não pode ser desfeita.`}
      confirmText="Remover"
      cancelText="Cancelar"
      onConfirm={() => fileToDelete && handleRemove(fileToDelete)}
      onCancel={() => setFileToDelete(null)}
    />

    {previewFile && (
      <FilePreviewModal
        isOpen={!!previewFile}
        fileUrl={previewFile.url}
        fileName={previewFile.name}
        fileType="other"
        onClose={() => setPreviewFile(null)}
      />
    )}

    <Toast
      message={toast.message}
      type={toast.type}
      isVisible={toast.isVisible}
      onClose={hideToast}
    />
    </>
  );
};
