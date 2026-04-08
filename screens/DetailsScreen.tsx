import React, { useState, useEffect, useRef } from 'react';
import { Icons } from '../components/Icons';
import { Button } from '../components/Button';
import { Collection, CollectionResource, ScreenName } from '../types';
import { offlineManager } from '../lib/offline';
import { api } from '../lib/api';
import { FilePreviewModal } from '../components/FilePreviewModal';
import { extractOriginalFileName } from '../lib/storage';
import { CollectionCoverSection } from '../components/CollectionCoverSection';

interface DetailsScreenProps {
  collection: Collection;
  onNavigate: (screen: ScreenName, params?: any) => void;
  onBack: () => void;
}

export const DetailsScreen: React.FC<DetailsScreenProps> = ({ collection, onNavigate, onBack }) => {
  const themeColor = collection.color_theme || '#5D1F58';

  // States for Offline Logic
  const [isOffline, setIsOffline] = useState(false);
  const [hasResources, setHasResources] = useState(false);
  const [showExtraTools, setShowExtraTools] = useState(false);
  const [resources, setResources] = useState<CollectionResource[]>([]);
  const [loadingResources, setLoadingResources] = useState(false);
  const [previewFile, setPreviewFile] = useState<{ url: string; name: string; type: 'pdf' | 'audio' | 'video' | 'image' | 'other' } | null>(null);
  const [fileSizes, setFileSizes] = useState<Record<string, string>>({});
  const fetchedSizesRef = useRef<Set<string>>(new Set());

  useEffect(() => {
    // Check initial status
    setIsOffline(offlineManager.isOffline(collection.id));

    // Check if collection has extra materials/resources
    // Check both collection_resources table and extra_materials array
    const hasExtraMaterials = collection.extra_materials && collection.extra_materials.length > 0;

    // Set hasResources immediately if extra_materials exists
    if (hasExtraMaterials) {
      setHasResources(true);
    }

    api.getCollectionResources(collection.id).then(resources => {
      const hasTableResources = resources && resources.length > 0;
      // Update hasResources with both sources
      setHasResources(hasExtraMaterials || hasTableResources);
      setResources(resources);
    });
  }, [collection.id, collection.extra_materials]);

  const handleShowExtraTools = () => {
    setShowExtraTools(true);
    setLoadingResources(true);
    // Reload resources when opening
    api.getCollectionResources(collection.id).then(data => {
      setResources(data);
      setLoadingResources(false);
    });
  };

  // Helper function to format file size
  const formatFileSize = (bytes: number): string => {
    if (bytes === 0) return '0 B';
    const k = 1024;
    const sizes = ['B', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return Math.round((bytes / Math.pow(k, i)) * 100) / 100 + ' ' + sizes[i];
  };

  // Fetch file sizes for resources that don't have them
  useEffect(() => {
    if (!showExtraTools) return;

    const fetchSizes = async () => {
      const sizesToFetch: Array<{ url: string; id: string }> = [];

      // Check resources from database
      resources.forEach(res => {
        const hasSize = res.size && res.size.trim() !== '' && res.size !== '-';
        if (!hasSize && !fetchedSizesRef.current.has(res.id)) {
          sizesToFetch.push({ url: res.url, id: res.id });
          fetchedSizesRef.current.add(res.id);
        }
      });

      // Check extra_materials
      (collection.extra_materials || []).forEach((url, index) => {
        const extraId = `extra-${index}`;
        if (!fetchedSizesRef.current.has(extraId)) {
          sizesToFetch.push({ url, id: extraId });
          fetchedSizesRef.current.add(extraId);
        }
      });

      if (sizesToFetch.length === 0) return;

      const newSizes: Record<string, string> = {};

      await Promise.all(
        sizesToFetch.map(async ({ url, id }) => {
          try {
            const response = await fetch(url, { method: 'HEAD' });
            const contentLength = response.headers.get('content-length');
            if (contentLength) {
              newSizes[id] = formatFileSize(parseInt(contentLength, 10));
            }
          } catch (error) {
            // Silently fail - file size might not be available
          }
        })
      );

      if (Object.keys(newSizes).length > 0) {
        setFileSizes(prev => ({ ...prev, ...newSizes }));
      }
    };

    fetchSizes();
  }, [showExtraTools, resources, collection.extra_materials]);

  // Combine resources from table and extra_materials array
  const getAllResources = (): Array<{ id: string; title: string; type: string; url: string; size?: string }> => {
    const tableResources = resources.map(res => {
      const dbSize = res.size && res.size.trim() !== '' ? res.size : null;
      const fetchedSize = fileSizes[res.id];
      return {
        id: res.id,
        title: res.title,
        type: res.type,
        url: res.url,
        size: dbSize || fetchedSize || undefined
      };
    });

    const existingUrls = new Set(tableResources.map(resource => resource.url));

    const extraMaterials = (collection.extra_materials || []).filter(url => !existingUrls.has(url)).map((url, index) => {
      // Extract filename from URL for title
      const filename = extractOriginalFileName(url) || `Material ${index + 1}`;
      // Try to determine type from URL extension
      const extension = filename.split('.').pop()?.toLowerCase() || 'file';
      let type: 'pdf' | 'audio' | 'video' | 'zip' = 'pdf';
      if (['mp3', 'wav', 'ogg', 'm4a'].includes(extension)) type = 'audio';
      else if (['mp4', 'webm', 'mov', 'avi'].includes(extension)) type = 'video';
      else if (['zip', 'rar', '7z'].includes(extension)) type = 'zip';
      else if (['pdf'].includes(extension)) type = 'pdf';

      const extraId = `extra-${index}`;
      const fetchedSize = fileSizes[extraId];

      return {
        id: extraId,
        title: filename,
        type,
        url,
        size: fetchedSize || undefined
      };
    });

    return [...tableResources, ...extraMaterials];
  };

  const handleBackToMain = () => {
    setShowExtraTools(false);
  };

  const handleTagClick = (tag: string) => {
    onNavigate('search', { query: tag });
  };

  // Function to get the appropriate icon based on file type
  const getFileIcon = (fileType: string) => {
    const type = fileType.toLowerCase();
    if (type === 'pdf') {
      return <Icons.FileText size={24} />;
    } else if (type === 'audio' || ['mp3', 'wav', 'ogg', 'm4a', 'aac'].some(ext => type.includes(ext))) {
      return <Icons.Headphones size={24} />;
    } else if (type === 'video' || ['mp4', 'webm', 'mov', 'avi'].some(ext => type.includes(ext))) {
      return <Icons.Video size={24} />;
    } else if (type === 'image' || ['jpg', 'jpeg', 'png', 'gif', 'webp'].some(ext => type.includes(ext))) {
      return <Icons.Image size={24} />;
    } else {
      return <Icons.FileText size={24} />;
    }
  };

  return (
    <div className="flex flex-col md:flex-row bg-white relative h-full w-full">

      {/* DESKTOP: LEFT SIDE (Cover & Aesthetics) / MOBILE: TOP HEADER */}
      <CollectionCoverSection
        collection={collection}
        isOffline={isOffline}
        headerContent={
          <div className="flex justify-center items-center w-full">
            <span className="font-bold text-lg opacity-90 md:hidden">Detalhes</span>
          </div>
        }
      />

      {/* DESKTOP: RIGHT SIDE (Content) / MOBILE: BOTTOM CARD */}
      <div className="flex-1 overflow-y-auto z-10 no-scrollbar bg-white rounded-t-[2.5rem] md:rounded-none mt-0 relative shadow-[0_-10px_40px_rgba(0,0,0,0.05)] md:shadow-none md:h-full">
        <div className="pt-9 px-6 pb-24 md:p-12 md:max-w-4xl md:mx-auto">

          {/* Back Button - Show when in Extra Tools view */}
          {showExtraTools && (
            <div className="mb-6">
              <button
                onClick={handleBackToMain}
                className="flex items-center gap-2 text-gray-600 hover:text-gray-800 transition-colors mb-4"
              >
                <Icons.ChevronLeft size={20} />
                <span className="font-bold text-sm">Voltar</span>
              </button>
            </div>
          )}

          {showExtraTools ? (
            /* Extra Tools Content */
            <>
              <h1 className="text-2xl md:text-3xl font-black text-gray-800 mb-2">Materiais Extras</h1>
              <p className="text-gray-500 mb-8">Recursos complementares para {collection.title}</p>

              {loadingResources ? (
                <div className="text-center text-gray-400 py-10">Carregando materiais...</div>
              ) : getAllResources().length === 0 ? (
                <div className="text-center text-gray-400 py-10 flex flex-col items-center">
                  <div className="w-16 h-16 bg-gray-100 rounded-full flex items-center justify-center mb-4">
                    <Icons.FileText className="text-gray-300" size={32} />
                  </div>
                  <p>Nenhum material extra disponível.</p>
                </div>
              ) : (
                <div className="space-y-4">
                  {getAllResources().map((res) => (
                    <div key={res.id} className="flex flex-col md:flex-row md:items-center p-4 border border-gray-100 rounded-2xl hover:border-kaboo-primary/30 hover:bg-kaboo-primary/5 transition-colors group">
                      {/* Mobile: Layout vertical - Ícone acima, título abaixo, botões com texto */}
                      {/* Desktop: Layout horizontal - Ícone à esquerda, título no meio, botões à direita */}
                      <div className="flex flex-col md:flex-row md:items-center gap-3 md:gap-0 mb-3 md:mb-0 flex-1">
                        {/* Ícone - acima no mobile, à esquerda no desktop */}
                        <div className="w-12 h-12 rounded-xl bg-gray-100 flex items-center justify-center text-gray-500 md:mr-4 group-hover:bg-white group-hover:text-kaboo-primary transition-colors flex-shrink-0 self-start md:self-center">
                          {getFileIcon(res.type)}
                        </div>
                        {/* Título e badges - abaixo do ícone no mobile, ao lado no desktop */}
                        <div className="flex-1 min-w-0">
                          <h4 className="font-bold text-gray-800 text-sm mb-1 break-words">{res.title}</h4>
                          <div className="flex gap-2 text-xs text-gray-500 font-bold uppercase">
                            <span className="bg-gray-100 px-2 py-0.5 rounded-md">{res.type}</span>
                            <span className="mt-0.5">-</span>
                            <span className="mt-0.5">{res.size || '-'}</span>
                          </div>
                        </div>
                      </div>
                      {/* Mobile: Botões full width abaixo */}
                      {/* Desktop: Botões apenas ícones à direita */}
                      <div className="flex items-center gap-2 md:ml-auto md:flex-shrink-0 w-full md:w-auto">
                        <button
                          onClick={() => {
                            const fileType = res.type === 'pdf' ? 'pdf' :
                              res.type === 'audio' ? 'audio' :
                                res.type === 'video' ? 'video' :
                                  res.url.match(/\.(jpg|jpeg|png|gif|webp)$/i) ? 'image' : 'other';
                            setPreviewFile({ url: res.url, name: res.title, type: fileType });
                          }}
                          className="flex-1 md:flex-none flex items-center justify-center py-2 md:py-0 md:w-10 md:h-10 rounded-full border-2 border-kaboo-primary/20 text-kaboo-primary hover:bg-kaboo-primary hover:text-white transition-all text-sm font-bold"
                        >
                          <Icons.Eye size={20} />
                        </button>
                        <a
                          href={res.url}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="flex-1 md:flex-none flex items-center justify-center py-2 md:py-0 md:w-10 md:h-10 rounded-full border-2 border-kaboo-primary/20 text-kaboo-primary hover:bg-kaboo-primary hover:text-white transition-all text-sm font-bold"
                        >
                          <Icons.Download size={20} />
                        </a>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </>
          ) : (
            /* Main Content */
            <>
              {/* Metadata Badges */}
              <div className="flex flex-wrap items-center justify-center md:justify-start gap-2 mb-4">
                <span className="px-3 py-1 rounded-full bg-kaboo-primary/10 text-kaboo-primary text-xs font-bold uppercase tracking-wide">
                  {collection.level}
                </span>
                {collection.age_grade && collection.age_grade.length > 0 && (
                  <>
                    <span className="text-kaboo-primary/40 text-xs font-bold">|</span>
                    {collection.age_grade.map((item, i) => (
                      <button
                        key={i}
                        onClick={() => handleTagClick(item)}
                        className="px-3 py-1 rounded-full bg-kaboo-primary/10 text-kaboo-primary text-xs font-bold uppercase tracking-wide hover:bg-kaboo-primary/20 transition-colors cursor-pointer"
                      >
                        {item}
                      </button>
                    ))}
                  </>
                )}
              </div>

              <h1 className="text-2xl md:text-4xl font-black text-center md:text-left text-gray-800 mb-6 leading-tight mt-6">
                {collection.title}
              </h1>

              {collection.progress ? (
                <div className="w-full max-w-xs mx-auto md:mx-0 mb-8">
                  <div className="flex justify-between text-xs font-bold text-gray-400 mb-2">
                    <span>Progresso</span>
                    <span>{collection.progress}%</span>
                  </div>
                  <div className="h-2 w-full bg-gray-100 rounded-full overflow-hidden">
                    <div
                      className="h-full rounded-full transition-all duration-1000"
                      style={{ width: `${collection.progress}%`, backgroundColor: themeColor }}
                    />
                  </div>
                </div>
              ) : null}

              {/* Actions Grid */}
              <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-10">
                <button
                  onClick={() => onNavigate('player_book', { collectionId: collection.id })}
                  disabled={!collection.pdf_url}
                  className="flex flex-col items-center justify-center gap-2 h-20 bg-gray-100 text-gray-800 hover:bg-gray-200 disabled:opacity-50 disabled:cursor-not-allowed disabled:hover:bg-gray-100 rounded-2xl transition-all duration-200 active:scale-95"
                >
                  <Icons.BookOpen size={24} />
                  <span className="text-xs font-bold">Ler</span>
                </button>

                <button
                  onClick={() => onNavigate('player_audio', { collectionId: collection.id })}
                  disabled={!collection.audio_url}
                  className="flex flex-col items-center justify-center gap-2 h-20 bg-gray-100 text-gray-800 hover:bg-gray-200 disabled:opacity-50 disabled:cursor-not-allowed disabled:hover:bg-gray-100 rounded-2xl transition-all duration-200 active:scale-95"
                >
                  <Icons.Headphones size={24} />
                  <span className="text-xs font-bold">Ouvir</span>
                </button>

                <button
                  onClick={() => onNavigate('player_video', { collectionId: collection.id })}
                  disabled={!collection.video_url}
                  className="flex flex-col items-center justify-center gap-2 h-20 bg-gray-100 text-gray-800 hover:bg-gray-200 disabled:opacity-50 disabled:cursor-not-allowed disabled:hover:bg-gray-100 rounded-2xl transition-all duration-200 active:scale-95"
                >
                  <Icons.Video size={24} />
                  <span className="text-xs font-bold">Assistir</span>
                </button>

                <button
                  onClick={handleShowExtraTools}
                  disabled={!hasResources}
                  className="flex flex-col items-center justify-center gap-2 h-20 bg-gray-100 text-gray-800 hover:bg-gray-200 disabled:opacity-50 disabled:cursor-not-allowed disabled:hover:bg-gray-100 rounded-2xl transition-all duration-200 active:scale-95"
                >
                  <Icons.Paperclip size={24} />
                  <span className="text-xs font-bold">Materiais</span>
                </button>
              </div>

              {/* --- PEDAGOGICAL INFORMATION SECTION --- */}
              {(collection.theme || collection.learning_objectives || collection.characters || collection.bncc_skills || collection.casel_competencies || collection.age_grade) && (
                <div className="border-t border-gray-100 pt-8 space-y-6">
                  <h3 className="text-lg font-bold text-gray-800 flex items-center gap-2">
                    <Icons.BookOpen size={20} className="stroke-[2.5px]" />
                    Informações Pedagógicas
                  </h3>

                  <div className="grid md:grid-cols-2 gap-6">
                    {/* Tema */}
                    {collection.theme && (
                      <div className="col-span-full">
                        <h4 className="text-sm font-bold text-gray-800 mb-1">Tema</h4>
                        <p className="text-gray-600 text-sm leading-relaxed">{collection.theme}</p>
                      </div>
                    )}

                    {/* Objetivo de Aprendizagem */}
                    {collection.learning_objectives && (
                      <div className="col-span-full">
                        <h4 className="text-sm font-bold text-gray-800 mb-1">Objetivo de Aprendizagem</h4>
                        <p className="text-gray-600 text-sm leading-relaxed">{collection.learning_objectives}</p>
                      </div>
                    )}

                    {/* Personagens Centrais */}
                    {collection.characters && collection.characters.length > 0 && (
                      <div>
                        <h4 className="text-sm font-bold text-gray-800 mb-2">Personagens Centrais</h4>
                        <div className="flex flex-wrap gap-2">
                          {collection.characters.map((char, i) => (
                            <button
                              key={i}
                              onClick={() => handleTagClick(char)}
                              className="px-3 py-1 rounded-full bg-indigo-50 text-indigo-600 text-xs font-bold border border-indigo-100 hover:bg-indigo-100 transition-colors cursor-pointer text-left"
                            >
                              {char}
                            </button>
                          ))}
                        </div>
                      </div>
                    )}

                    {/* Habilidades BNCC */}
                    {collection.bncc_skills && collection.bncc_skills.length > 0 && (
                      <div>
                        <h4 className="text-sm font-bold text-gray-800 mb-2">Habilidades da BNCC</h4>
                        <div className="flex flex-wrap gap-2">
                          {collection.bncc_skills.map((skill, i) => (
                            <button
                              key={i}
                              onClick={() => handleTagClick(skill)}
                              className="px-3 py-1 rounded-full bg-green-50 text-green-700 text-xs font-bold border border-green-100 hover:bg-green-100 transition-colors cursor-pointer text-left"
                              title="Buscar por esta habilidade"
                            >
                              {skill}
                            </button>
                          ))}
                        </div>
                      </div>
                    )}

                    {/* CASEL */}
                    {collection.casel_competencies && collection.casel_competencies.length > 0 && (
                      <div>
                        <h4 className="text-sm font-bold text-gray-800 mb-2">Competências CASEL</h4>
                        <div className="flex flex-wrap gap-2">
                          {collection.casel_competencies.map((casel, i) => (
                            <button
                              key={i}
                              onClick={() => handleTagClick(casel)}
                              className="px-3 py-1 rounded-full bg-orange-50 text-orange-600 text-xs font-bold border border-orange-100 hover:bg-orange-100 transition-colors cursor-pointer text-left"
                            >
                              {casel}
                            </button>
                          ))}
                        </div>
                      </div>
                    )}
                  </div>
                </div>
              )}
            </>
          )}

        </div>
      </div>

      {/* File Preview Modal */}
      {previewFile && (
        <FilePreviewModal
          isOpen={!!previewFile}
          fileUrl={previewFile.url}
          fileName={previewFile.name}
          fileType={previewFile.type}
          onClose={() => setPreviewFile(null)}
        />
      )}
    </div>
  );
};