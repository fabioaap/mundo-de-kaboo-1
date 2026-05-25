import React, { useRef, useState } from 'react';
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
  // Only mounted when we need to extract frames — avoids a muted <video> element
  // sitting in the DOM sharing the same URL with the actual player (which would
  // cause some browsers to mute or throttle audio on the real player).
  const [videoMounted, setVideoMounted] = useState(false);
  const videoRef = useRef<HTMLVideoElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const { toast, showToast, updateToast, hideToast } = useToast();

  const extractFrames = () => {
    // Mount the hidden video first; extraction runs inside onLoadedMetadata
    setFrameState({ status: 'loading' });
    setVideoMounted(true);
  };

  // Called by the hidden <video> once metadata (and duration) is available
  const handleVideoMetadata = () => {
    const video = videoRef.current;
    const canvas = canvasRef.current;
    if (!video || !canvas) return;

    const ctx = canvas.getContext('2d');
    if (!ctx) {
      setFrameState({ status: 'error', message: 'Canvas não suportado neste navegador.' });
      setVideoMounted(false);
      return;
    }

    canvas.width = FRAME_WIDTH;
    canvas.height = FRAME_HEIGHT;

    if (!video.duration || !isFinite(video.duration)) {
      setFrameState({ status: 'error', message: 'Vídeo sem duração detectável.' });
      setVideoMounted(false);
      return;
    }

    const capturedFrames: string[] = [];
    let positionIndex = 0;

    const captureNext = () => {
      if (positionIndex >= FRAME_POSITIONS.length) {
        setFrameState({ status: 'ready', dataUrls: capturedFrames });
        setVideoMounted(false); // unmount hidden video — no longer needed
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
        setFrameState({
          status: 'error',
          message:
            'Não foi possível extrair frames (restrição de CORS). Por favor, envie a capa manualmente.',
        });
        video.removeEventListener('seeked', onSeeked);
        setVideoMounted(false);
      }
    };

    video.addEventListener('seeked', onSeeked);
    captureNext();
  };

  const handleVideoError = () => {
    setFrameState({
      status: 'error',
      message: 'Não foi possível carregar o vídeo para extração de frames.',
    });
    setVideoMounted(false);
  };

  const handleSelectFrame = async (dataUrl: string, index: number) => {
    if (uploadingIndex !== null || disabled) return;

    setUploadingIndex(index);
    showToast('Enviando frame como capa...', 'progress', 0);

    try {
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
      {/* Hidden video + canvas — only mounted during frame extraction to avoid
          a permanently-present muted element that could interfere with the
          browser's audio handling for the real video player. */}
      {videoMounted && (
        <video
          ref={videoRef}
          src={videoUrl}
          crossOrigin="anonymous"
          muted
          playsInline
          preload="auto"
          className="hidden"
          aria-hidden="true"
          onLoadedMetadata={handleVideoMetadata}
          onError={handleVideoError}
        />
      )}
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
