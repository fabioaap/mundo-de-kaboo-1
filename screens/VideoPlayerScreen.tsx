import React, { useState, useEffect, useRef } from 'react';
import { Icons } from '../components/Icons';
import { Collection } from '../types';
import { useThemeBackground } from '../hooks/useThemeBackground';

interface VideoPlayerScreenProps {
  collection: Collection;
  assetUrl?: string;
  assetTitle?: string;
  onBack: () => void;
}

export const VideoPlayerScreen: React.FC<VideoPlayerScreenProps> = ({
  collection,
  assetUrl,
  assetTitle,
  onBack,
}) => {
  const [isPlaying, setIsPlaying] = useState(false);
  const [currentTime, setCurrentTime] = useState(0);
  const [duration, setDuration] = useState(0);
  const [showControls, setShowControls] = useState(true);
  const [isLoading, setIsLoading] = useState(true);
  const [playbackRate, setPlaybackRate] = useState(1.0);
  const [isFullscreen, setIsFullscreen] = useState(false);
  const [volume, setVolume] = useState(1);
  const [isMuted, setIsMuted] = useState(false);
  const [playError, setPlayError] = useState<string | null>(null);
  
  const videoRef = useRef<HTMLVideoElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);
  const controlsTimeoutRef = useRef<any>(null);

  const themeColor = collection.color_theme || '#5D1F58';
  const resolvedVideoUrl = assetUrl ?? collection.video_url;
  const resolvedTitle = assetTitle ?? collection.title;
  
  // Set browser background to black for video player
  useThemeBackground('#000000');

  useEffect(() => {
    // Hide controls initially after 3 seconds
    resetControlsTimeout();
    return () => {
      if (controlsTimeoutRef.current) clearTimeout(controlsTimeoutRef.current);
    };
  }, []);

  const resetControlsTimeout = () => {
    setShowControls(true);
    if (controlsTimeoutRef.current) clearTimeout(controlsTimeoutRef.current);
    if (isPlaying) {
      controlsTimeoutRef.current = setTimeout(() => {
        setShowControls(false);
      }, 3000);
    }
  };

  const togglePlay = async (e?: React.MouseEvent) => {
    e?.stopPropagation();
    resetControlsTimeout();
    if (!videoRef.current) return;
    try {
      setPlayError(null);
      if (isPlaying) {
        videoRef.current.pause();
        setIsPlaying(false);
      } else {
        await videoRef.current.play();
        setIsPlaying(true);
      }
    } catch {
      setPlayError('Não foi possível reproduzir o vídeo. Toque novamente para tentar.');
      setIsPlaying(false);
    }
  };

  const handleTimeUpdate = () => {
    if (videoRef.current) {
      setCurrentTime(videoRef.current.currentTime);
    }
  };

  const handleLoadedData = () => {
    setIsLoading(false);
    if (videoRef.current) {
      setDuration(videoRef.current.duration);
    }
  };

  const handleSeek = (e: React.ChangeEvent<HTMLInputElement>) => {
    resetControlsTimeout();
    const time = Number(e.target.value);
    if (videoRef.current) {
      videoRef.current.currentTime = time;
      setCurrentTime(time);
    }
  };

  const handleVolumeChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    e.stopPropagation();
    resetControlsTimeout();
    const val = parseFloat(e.target.value);
    setVolume(val);
    if (videoRef.current) {
        videoRef.current.volume = val;
        setIsMuted(val === 0);
    }
  };

  const toggleMute = (e: React.MouseEvent) => {
    e.stopPropagation();
    resetControlsTimeout();
    if (videoRef.current) {
        const newMutedState = !isMuted;
        videoRef.current.muted = newMutedState;
        setIsMuted(newMutedState);
        if (newMutedState) {
            setVolume(0);
        } else {
            setVolume(1);
            videoRef.current.volume = 1;
        }
    }
  };

  const skip = (seconds: number) => {
    resetControlsTimeout();
    if (videoRef.current) {
      videoRef.current.currentTime = Math.min(Math.max(videoRef.current.currentTime + seconds, 0), duration);
    }
  };

  const toggleSpeed = (e: React.MouseEvent) => {
    e.stopPropagation();
    resetControlsTimeout();
    let newRate = 1.0;
    if (playbackRate === 1.0) newRate = 1.5;
    else if (playbackRate === 1.5) newRate = 2.0;
    else newRate = 1.0;
    
    setPlaybackRate(newRate);
    if (videoRef.current) videoRef.current.playbackRate = newRate;
  };

  const toggleFullscreen = (e: React.MouseEvent) => {
    e.stopPropagation();
    if (!document.fullscreenElement) {
        containerRef.current?.requestFullscreen().then(() => setIsFullscreen(true)).catch(err => console.log(err));
    } else {
        document.exitFullscreen().then(() => setIsFullscreen(false));
    }
  };

  const formatTime = (time: number) => {
    if (isNaN(time)) return "00:00";
    const minutes = Math.floor(time / 60);
    const seconds = Math.floor(time % 60);
    return `${minutes.toString().padStart(2, '0')}:${seconds.toString().padStart(2, '0')}`;
  };

  const progressPercent = duration ? (currentTime / duration) * 100 : 0;

  return (
    <div 
        ref={containerRef}
        className="fixed inset-0 z-50 bg-black flex items-center justify-center overflow-hidden group"
        onMouseMove={resetControlsTimeout}
        onTouchStart={resetControlsTimeout}
        onClick={() => setShowControls(!showControls)}
    >
      {/* Dark overlay to darken background */}
      <div className="absolute inset-0 bg-black/10 z-0" />
      
      {/* Video Element */}
      {resolvedVideoUrl ? (
        <video
            ref={videoRef}
        src={resolvedVideoUrl}
            className="w-full h-full object-contain"
            playsInline
            onClick={(e) => { e.stopPropagation(); togglePlay(); }}
            onTimeUpdate={handleTimeUpdate}
            onLoadedData={handleLoadedData}
            onWaiting={() => setIsLoading(true)}
            onPlaying={() => setIsLoading(false)}
            onEnded={() => { setIsPlaying(false); setShowControls(true); }}
        />
      ) : (
          <div className="text-white text-center">Vídeo indisponível</div>
      )}

      {/* Loading Spinner */}
      {isLoading && (
        <div className="absolute inset-0 flex items-center justify-center pointer-events-none z-10">
           <div className="w-12 h-12 border-4 border-white/30 border-t-white rounded-full animate-spin"></div>
        </div>
      )}

      {/* Play Error Message */}
      {playError && (
        <div className="absolute bottom-28 left-1/2 -translate-x-1/2 z-20 bg-red-500/90 backdrop-blur-sm text-white text-sm px-5 py-2 rounded-full pointer-events-none text-center max-w-xs">
          {playError}
        </div>
      )}

      {/* Overlay Gradient for controls visibility */}
      <div className={`absolute inset-0 bg-gradient-to-b from-black/60 via-transparent to-black/60 transition-opacity duration-300 pointer-events-none ${showControls ? 'opacity-100' : 'opacity-0'}`} />

      {/* Controls Container */}
      <div className={`absolute inset-0 flex flex-col justify-between p-6 transition-opacity duration-300 ${showControls ? 'opacity-100' : 'opacity-0 pointer-events-none'}`}>
        
        {/* Top Bar */}
        <div className="flex items-center justify-between" onClick={(e) => e.stopPropagation()}>
             <button 
                onClick={onBack}
                className="w-12 h-12 rounded-full bg-black/20 backdrop-blur-md shadow-xl text-white flex items-center justify-center hover:bg-black/30 transition-all active:scale-95 border border-white/30"
                aria-label="Voltar"
             >
                 <Icons.ChevronLeft size={24} strokeWidth={2.5} />
             </button>
             
             <div className="flex-1 text-center">
               <div className="inline-block bg-black/20 backdrop-blur-md px-6 py-2 rounded-full shadow-lg border border-white/10">
                 <h1 className="text-sm md:text-base font-bold text-white drop-shadow-sm">
                   {resolvedTitle}
                 </h1>
               </div>
             </div>

             <button 
                onClick={toggleSpeed}
                className="w-12 h-12 rounded-full bg-black/20 backdrop-blur-md shadow-xl text-white flex items-center justify-center hover:bg-black/30 transition-all active:scale-95 border border-white/30 font-bold text-sm"
             >
                 {playbackRate}x
             </button>
        </div>

        {/* Center Play Button (Large & Minimalist) */}
        <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 flex items-center gap-12" onClick={(e) => e.stopPropagation()}>
            <button 
                onClick={() => skip(-10)} 
                className="text-white/70 hover:text-white transition-colors p-4 rounded-full hover:bg-white/10 active:scale-95 hidden md:block"
            >
                <div className="flex flex-col items-center">
                    <Icons.SkipBack size={32} />
                    <span className="text-[10px] font-bold">-10s</span>
                </div>
            </button>

            <button 
                onClick={(e) => togglePlay(e)}
                className="w-20 h-20 rounded-full bg-black/20 backdrop-blur-md shadow-xl flex items-center justify-center text-white border border-white/30 transition-all active:scale-95 hover:bg-black/30 hover:scale-110"
                aria-label={isPlaying ? 'Pausar' : 'Reproduzir'}
            >
                {isPlaying ? (
                    <Icons.Pause size={36} fill="currentColor" strokeWidth={2} />
                ) : (
                    <Icons.Play size={36} fill="currentColor" strokeWidth={2} className="ml-1" />
                )}
            </button>
            
            <button 
                onClick={() => skip(10)} 
                className="text-white/70 hover:text-white transition-colors p-4 rounded-full hover:bg-white/10 active:scale-95 hidden md:block"
            >
                <div className="flex flex-col items-center">
                    <Icons.SkipForward size={32} />
                    <span className="text-[10px] font-bold">+10s</span>
                </div>
            </button>
        </div>

        {/* Bottom Bar */}
        <div className="w-full flex flex-col gap-2" onClick={(e) => e.stopPropagation()}>
            {/* Time & Controls Row */}
            <div className="flex justify-between items-center text-xs font-bold text-white/90 px-1">
                {/* Left: Play + Time */}
                <div className="flex items-center gap-4">
                    <button onClick={(e) => togglePlay(e)} className="hover:text-kaboo-primary text-white transition-colors">
                        {isPlaying ? <Icons.Pause size={24} fill="currentColor" /> : <Icons.Play size={24} fill="currentColor" />}
                    </button>
                    <span>{formatTime(currentTime)} / {formatTime(duration)}</span>
                </div>
                
                {/* Progress Slider */}
                <div className="relative group flex-1 h-4 flex items-center mx-4">
                     <input
                        type="range"
                        min={0}
                        max={duration || 100}
                        value={currentTime}
                        onChange={handleSeek}
                        className="w-full h-1 bg-white/30 rounded-lg appearance-none cursor-pointer focus:outline-none relative z-20 transition-all hover:h-2"
                        style={{
                          background: `linear-gradient(to right, ${themeColor} ${progressPercent}%, rgba(255,255,255,0.3) ${progressPercent}%)`
                        }}
                      />
                </div>
                
                {/* Right: Volume + Fullscreen */}
                <div className="flex items-center gap-4">
                    {/* Volume Control */}
                    <div className="flex items-center gap-2 group/vol">
                        <button onClick={toggleMute} className="hover:text-kaboo-primary transition-colors">
                            {isMuted || volume === 0 ? <Icons.VolumeX size={20} /> : <Icons.Volume2 size={20} />}
                        </button>
                        <input
                            type="range"
                            min="0"
                            max="1"
                            step="0.1"
                            value={volume}
                            onChange={handleVolumeChange}
                            className="w-16 h-1 bg-white/30 rounded-lg appearance-none cursor-pointer focus:outline-none hidden sm:block"
                            style={{
                                background: `linear-gradient(to right, white ${volume * 100}%, rgba(255,255,255,0.3) ${volume * 100}%)`
                            }}
                        />
                    </div>

                    {/* Fullscreen Control */}
                    <button onClick={toggleFullscreen} className="hover:text-kaboo-primary transition-colors ml-2">
                        {isFullscreen ? <Icons.Minimize size={20} /> : <Icons.Maximize size={20} />}
                    </button>
                </div>
            </div>
        </div>
      </div>

      <style>{`
        input[type=range]::-webkit-slider-thumb {
          -webkit-appearance: none;
          height: 14px;
          width: 14px;
          border-radius: 50%;
          background: ${themeColor};
          cursor: pointer;
          margin-top: -5px; 
          box-shadow: 0 0 10px rgba(0,0,0,0.5);
          border: 2px solid white;
          transform: scale(0);
          transition: transform 0.1s;
        }
        .group:hover input[type=range]::-webkit-slider-thumb {
             transform: scale(1.2);
        }
        input[type=range]::-webkit-slider-runnable-track {
            height: 4px;
            background: transparent;
        }
        .group\\/vol input[type=range]::-webkit-slider-thumb {
            background: white;
            height: 12px;
            width: 12px;
            margin-top: -4px;
            border: none;
            box-shadow: 0 0 4px rgba(0,0,0,0.5);
            transform: scale(1);
        }
      `}</style>
    </div>
  );
};