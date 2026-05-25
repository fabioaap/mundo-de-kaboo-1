import React, { useEffect, useRef, useState } from 'react';
import { Icons } from './Icons';
import { uploadFile } from '../lib/storage';
import { useToast } from '../hooks/useToast';
import { Toast } from './Toast';

interface VideoFramePickerProps {
  /** URL of the video to extract frames from */
  videoUrl: string;
  /** Supabase collection ID used when uploading the frame as cover */
  collectionId?: string;
  /** Called with the Supabase Storage URL of the uploaded frame */
  onFrameSelected: (url: string) => void;
  disabled?: boolean;
}

// Fractions of duration to seek for frame capture
const FRAME_POSITIONS = [0.12, 0.42, 0.72];
const FRAME_WIDTH = 640;
const FRAME_HEIGHT = 360;

type FrameState =
  | { status: 'idle' }
  | { status: 'loading' }
  | { status: 'ready'; dataUrls: string[] }
  | { status: 'error'; message: string };

export const VideoFramePicker: React.FC<VideoFramePickerProps> = ({
  videoUrl,
  collectionId,
  onFrameSelected,
  disabled = false,
}) => {
  const [frameState, setFrameState] = useState<FrameState>({ status: 'idle' });
  const [uploadingIndex, setUploadingIndex] = useState<number | null>(null);
  const videoRef = useRef<HTMLVideoElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const { toast, showToast, updateToast, hideToast } = useToast();

  // Extract frames whenever videoUrl changes
  useEffect(() => {
    if (!videoUrl) return;
    setFrameState({ status: 'idle' });
  }, [videoUrl]);

  const extractFrames = () => {
    const video = videoRef.current;
    const canvas = canvasRef.current;
    if (!video || !canvas) return;

    setFrameState({ status: 'loading' });

    const ctx = canvas.getContext('2d');
    if (!ctx) {
      setFrameState({ status: 'error', message: 'Canvas não suportado neste navegador.' });
      return;
    }

    canvas.width = FRAME_WIDTH;
    canvas.height = FRAME_HEIGHT;

    const capturedFrames: string[] = [];
    let positionIndex = 0;

    const captureNext = () => {
      if (positionIndex >= FRAME_POSITIONS.length) {
        setFrameState({ status: 'ready', dataUrls: capturedFrames });
        return;
      }
      video.currentTime = video.duration * FRAME_POSITIONS[positionIndex];
    };

    const onSeeked = () => {
      try {
        ctx.drawImage(video, 0, 0, FRAME_WIDTH, FRAME_HEIGHT);
        capturedFrames.push(canvas.toDataURL('image/jpeg', 0.85));
        positionIndex++;
        captureNext();
      } catch {
        // CORS block when drawing — canvas is tainted
        setFrameState({
          status: 'error',
          message:
            'Não foi possível extrair frames (restrição de CORS). Por favor, envie a capa manualmente.',
        });
        video.removeEventListener('seeked', onSeeked);
      }
    };

    const onError = () => {
      setFrameState({
        status: 'error',
        message: 'Não foi possível carregar o vídeo para extração de frames.',
      });
    };

    const onLoaded = () => {
      if (!video.duration || !isFinite(video.duration)) {
        setFrameState({ status: 'error', message: 'Vídeo sem duração detectável.' });
        return;
      }
      video.addEventListener('seeked', onSeeked);
      captureNext();
    };

    video.removeEventListener('loadedmetadata', onLoaded);
    video.removeEventListener('error', onError);
    video.addEventListener('loadedmetadata', onLoaded, { once: true });
    video.addEventListener('error', onError, { once: true });

    // Re-load the video to trigger loadedmetadata
    video.load();
  };

  const handleSelectFrame = async (dataUrl: string, index: number) => {
    if (uploadingIndex !== null || disabled) return;

    setUploadingIndex(index);
    showToast('Enviando frame como capa...', 'progress', 0);

    try {
      // dataURL → Blob → File
      const res = await fetch(dataUrl);
      const blob = await res.blob();
      const file = new File([blob], `frame-cover-${Date.now()}.jpg`, { type: 'image/jpeg' });

      const result = await uploadFile(file, 'covers', collectionId, (progress) => {
        updateToast({ progress });
      });

      hideToast();

      if (result.error) {
        showToast('Erro ao enviar frame: ' + result.error, 'error');
      } else if (result.url) {
        onFrameSelected(result.url);
        showToast('Frame definido como capa!', 'success');
      }
    } catch (err: any) {
      hideToast();
      showToast(err.message || 'Erro ao processar frame.', 'error');
    } finally {
      setUploadingIndex(null);
    }
  };

  return (
    <>
      {/* Hidden video + canvas used for frame extraction */}
      <video
        ref={videoRef}
        src={videoUrl}
        crossOrigin="anonymous"
        muted
        playsInline
        preload="metadata"
        className="hidden"
        aria-hidden="true"
      />
      <canvas ref={canvasRef} className="hidden" aria-hidden="true" />

      <div className="mt-3">
        {frameState.status === 'idle' && (
          <button
            type="button"
            onClick={extractFrames}
            disabled={disabled}
            className="flex items-center gap-2 w-full px-3 py-2 rounded-xl bg-brand-primary/8 border border-brand-primary/20 text-brand-primary text-sm font-bold hover:bg-brand-primary/15 transition-colors disabled:opacity-40"
          >
            <Icons.Video size={15} />
            Sugerir frames do vídeo
          </button>
        )}

        {frameState.status === 'loading' && (
          <div className="flex items-center gap-2 px-3 py-2 text-sm text-gray-500 font-bold">
            <div className="w-4 h-4 border-2 border-brand-primary border-t-transparent rounded-full animate-spin" />
            Extraindo frames…
          </div>
        )}

        {frameState.status === 'error' && (
          <div className="rounded-xl bg-amber-50 border border-amber-200 px-3 py-2 text-xs text-amber-700 font-bold flex items-start gap-2">
            <Icons.AlertTriangle size={14} className="mt-0.5 flex-shrink-0" />
            {frameState.message}
          </div>
        )}

        {frameState.status === 'ready' && (
          <div>
            <p className="text-xs font-bold text-gray-500 mb-2">
              Escolha um frame como capa:
            </p>
            <div className="grid grid-cols-3 gap-2">
              {frameState.dataUrls.map((dataUrl, i) => {
                const isUploading = uploadingIndex === i;
                return (
                  <button
                    key={i}
                    type="button"
                    onClick={() => handleSelectFrame(dataUrl, i)}
                    disabled={uploadingIndex !== null || disabled}
                    className="relative aspect-video rounded-lg overflow-hidden border-2 border-transparent hover:border-brand-primary focus:border-brand-primary focus:outline-none transition-all disabled:opacity-50 disabled:cursor-wait group"
                    title={`Usar frame ${i + 1} como capa`}
                  >
                    <img
                      src={dataUrl}
                      alt={`Frame ${i + 1}`}
                      className="w-full h-full object-cover"
                    />
                    {/* Hover overlay */}
                    <div className="absolute inset-0 bg-brand-primary/0 group-hover:bg-brand-primary/20 transition-colors flex items-center justify-center">
                      {isUploading ? (
                        <div className="w-5 h-5 border-2 border-white border-t-transparent rounded-full animate-spin" />
                      ) : (
                        <Icons.Check
                          size={20}
                          className="text-white opacity-0 group-hover:opacity-100 transition-opacity drop-shadow-md"
                        />
                      )}
                    </div>
                  </button>
                );
              })}
            </div>
            {/* Re-extract option */}
            <button
              type="button"
              onClick={() => setFrameState({ status: 'idle' })}
              className="mt-2 text-xs text-gray-400 hover:text-gray-600 transition-colors font-bold"
              disabled={uploadingIndex !== null}
            >
              ← Gerar novos frames
            </button>
          </div>
        )}
      </div>

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
