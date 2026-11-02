import React, { useEffect, useRef, useState, useCallback } from 'react';
import { Play, Pause, RotateCcw, AlertCircle, Volume2, VolumeX, Maximize2 } from 'lucide-react';
import { formatTime } from '../utils/youtubeHelper';

// Extend window for YouTube API
declare global {
  interface Window {
    YT: any;
    onYouTubeIframeAPIReady: () => void;
  }
}

interface YouTubeViewProps {
  videoId: string;
  playbackSpeed: number;
  onTimeUpdate: (currentTime: number, duration: number, isPlaying: boolean) => void;
  onStateChange: (isPlaying: boolean) => void;
  playerRefCallback: (controls: YouTubeControls | null) => void;
  loopSettings: { enabled: boolean; startTime: number; endTime: number; autoIncrementSpeed?: boolean };
  onLoopTrigger?: () => void;
  youtubeVolume: number;
  isMuted: boolean;
}

export interface YouTubeControls {
  play: () => void;
  pause: () => void;
  seekTo: (seconds: number) => void;
  setPlaybackRate: (rate: number) => void;
  getCurrentTime: () => number;
  getDuration: () => number;
  setVolume: (volume: number) => void;
}

export const YouTubeView: React.FC<YouTubeViewProps> = ({
  videoId,
  playbackSpeed,
  onTimeUpdate,
  onStateChange,
  playerRefCallback,
  loopSettings,
  onLoopTrigger,
  youtubeVolume,
  isMuted,
}) => {
  const containerRef = useRef<HTMLDivElement>(null);
  const playerInstanceRef = useRef<any>(null);
  const [isReady, setIsReady] = useState(false);
  const [isPlaying, setIsPlaying] = useState(false);
  const [currentTime, setCurrentTime] = useState(0);
  const [duration, setDuration] = useState(0);
  const [hasEmbedError, setHasEmbedError] = useState(false);
  const animFrameRef = useRef<number | null>(null);

  // Initialize or reload player
  useEffect(() => {
    let isCancelled = false;
    setHasEmbedError(false);

    const initPlayer = () => {
      if (!window.YT || !window.YT.Player) {
        return;
      }

      // If existing player, destroy first
      if (playerInstanceRef.current && playerInstanceRef.current.destroy) {
        try {
          playerInstanceRef.current.destroy();
        } catch {
          // ignore
        }
      }

      const playerElementId = 'yt-embedded-frame';
      let element = document.getElementById(playerElementId);
      if (!element && containerRef.current) {
        element = document.createElement('div');
        element.id = playerElementId;
        containerRef.current.appendChild(element);
      }

      try {
        const player = new window.YT.Player(playerElementId, {
          videoId,
          playerVars: {
            autoplay: 0,
            controls: 1,
            modestbranding: 1,
            rel: 0,
            playsinline: 1,
            enablejsapi: 1,
            origin: window.location.origin,
          },
          events: {
            onReady: (event: any) => {
              if (isCancelled) return;
              setIsReady(true);
              const dur = event.target.getDuration ? event.target.getDuration() : 0;
              setDuration(dur);
              event.target.setPlaybackRate(playbackSpeed);
              event.target.setVolume(isMuted ? 0 : youtubeVolume);

              const controls: YouTubeControls = {
                play: () => {
                  try { event.target.playVideo(); } catch { /* ignore */ }
                },
                pause: () => {
                  try { event.target.pauseVideo(); } catch { /* ignore */ }
                },
                seekTo: (secs: number) => {
                  try { event.target.seekTo(secs, true); } catch { /* ignore */ }
                },
                setPlaybackRate: (rate: number) => {
                  try { event.target.setPlaybackRate(rate); } catch { /* ignore */ }
                },
                getCurrentTime: () => {
                  try { return event.target.getCurrentTime() || 0; } catch { return 0; }
                },
                getDuration: () => {
                  try { return event.target.getDuration() || 0; } catch { return 0; }
                },
                setVolume: (vol: number) => {
                  try { event.target.setVolume(vol); } catch { /* ignore */ }
                },
              };

              playerRefCallback(controls);
            },
            onStateChange: (event: any) => {
              if (isCancelled) return;
              // 1 = Playing, 2 = Paused, 0 = Ended, 3 = Buffering
              const playing = event.data === 1;
              setIsPlaying(playing);
              onStateChange(playing);

              if (event.data === 0 && loopSettings.enabled) {
                // Loop to start
                event.target.seekTo(loopSettings.startTime, true);
                event.target.playVideo();
                if (onLoopTrigger) onLoopTrigger();
              }
            },
            onError: (event: any) => {
              // 101 or 150: video owner does not allow embedding
              if (event.data === 101 || event.data === 150 || event.data === 100) {
                setHasEmbedError(true);
              }
            },
          },
        });

        playerInstanceRef.current = player;
      } catch (err) {
        console.error('Failed to init YouTube Player:', err);
      }
    };

    if (window.YT && window.YT.Player) {
      initPlayer();
    } else {
      const existingCallback = window.onYouTubeIframeAPIReady;
      window.onYouTubeIframeAPIReady = () => {
        if (existingCallback) existingCallback();
        if (!isCancelled) initPlayer();
      };
    }

    return () => {
      isCancelled = true;
      if (playerInstanceRef.current && playerInstanceRef.current.destroy) {
        try {
          playerInstanceRef.current.destroy();
        } catch {
          // ignore
        }
      }
      playerRefCallback(null);
    };
  }, [videoId]);

  // Sync playback rate when prop changes
  useEffect(() => {
    if (playerInstanceRef.current && playerInstanceRef.current.setPlaybackRate) {
      try {
        playerInstanceRef.current.setPlaybackRate(playbackSpeed);
      } catch {
        // ignore
      }
    }
  }, [playbackSpeed]);

  // Sync volume / mute
  useEffect(() => {
    if (playerInstanceRef.current && playerInstanceRef.current.setVolume) {
      try {
        playerInstanceRef.current.setVolume(isMuted ? 0 : youtubeVolume);
      } catch {
        // ignore
      }
    }
  }, [youtubeVolume, isMuted]);

  // High-frequency polling loop for synchronization & A-B looping
  useEffect(() => {
    let active = true;

    const tick = () => {
      if (!active) return;
      if (playerInstanceRef.current && playerInstanceRef.current.getCurrentTime) {
        try {
          const t = playerInstanceRef.current.getCurrentTime() || 0;
          const dur = playerInstanceRef.current.getDuration ? playerInstanceRef.current.getDuration() : duration;
          setCurrentTime(t);
          if (dur && dur !== duration) setDuration(dur);

          // A-B Loop enforcement
          if (loopSettings.enabled && loopSettings.endTime > loopSettings.startTime) {
            if (t >= loopSettings.endTime) {
              playerInstanceRef.current.seekTo(loopSettings.startTime, true);
              if (onLoopTrigger) onLoopTrigger();
            }
          }

          onTimeUpdate(t, dur, isPlaying);
        } catch {
          // ignore frame errors
        }
      }
      animFrameRef.current = requestAnimationFrame(tick);
    };

    animFrameRef.current = requestAnimationFrame(tick);

    return () => {
      active = false;
      if (animFrameRef.current) cancelAnimationFrame(animFrameRef.current);
    };
  }, [isPlaying, loopSettings, duration, onTimeUpdate, onLoopTrigger]);

  const handlePlayToggle = () => {
    if (!playerInstanceRef.current) return;
    try {
      if (isPlaying) {
        playerInstanceRef.current.pauseVideo();
      } else {
        playerInstanceRef.current.playVideo();
      }
    } catch (e) {
      console.error(e);
    }
  };

  const handleRestart = () => {
    if (!playerInstanceRef.current) return;
    const seekTarget = loopSettings.enabled ? loopSettings.startTime : 0;
    playerInstanceRef.current.seekTo(seekTarget, true);
    playerInstanceRef.current.playVideo();
  };

  return (
    <div className="relative w-full aspect-video rounded-xl overflow-hidden bg-neutral-900 border border-neutral-800 shadow-2xl flex flex-col justify-center items-center">
      {/* Video Container Frame */}
      <div ref={containerRef} className="w-full h-full [&>iframe]:w-full [&>iframe]:h-full [&>iframe]:border-0" />

      {/* Embed Restriction Fallback Warning */}
      {hasEmbedError && (
        <div className="absolute inset-0 bg-neutral-950/90 backdrop-blur flex flex-col items-center justify-center p-6 text-center z-20">
          <AlertCircle className="w-10 h-10 text-amber-400 mb-3" />
          <h4 className="text-base font-semibold text-white mb-1">
            유튜브 임베드 제한 동영상입니다
          </h4>
          <p className="text-xs text-neutral-400 max-w-md mb-4 leading-relaxed">
            해당 영상 소유자가 외부 웹사이트 재생을 비활성화했습니다. 다른 유튜브 공식 음원, 뮤직비디오, 라이브 클립, 또는 상단 &apos;추천 연습곡&apos; 프리셋을 선택해 주세요.
          </p>
        </div>
      )}

      {/* Quick floating playback state badge */}
      <div className="absolute top-3 left-3 pointer-events-none z-10 flex items-center gap-2">
        <div className="bg-neutral-950/80 backdrop-blur border border-neutral-800/80 rounded-md px-2.5 py-1 text-xs font-mono text-neutral-300 flex items-center gap-2">
          <span className="font-semibold text-amber-400">{formatTime(currentTime, true)}</span>
          <span className="text-neutral-500">/</span>
          <span>{formatTime(duration)}</span>
          <span className="text-neutral-500">·</span>
          <span className="text-amber-300 font-bold">{playbackSpeed.toFixed(2)}x</span>
        </div>
      </div>
    </div>
  );
};
