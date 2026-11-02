import React from 'react';
import { VolumeX, Play, Music } from 'lucide-react';

interface VisualMetronomeProps {
  currentBeat: number; // 1-indexed (1 to totalBeats)
  totalBeats: number;
  subdivision: number;
  currentSubdivision: number; // 0 to subdivision-1
  isPlaying: boolean;
  phase: number; // 0.0 to 1.0 within current beat
  effectiveBpm: number;
  isWaitingForStart?: boolean;
  timeUntilStartSec?: number;
  isPickupBeat?: boolean;
}

export const VisualMetronome: React.FC<VisualMetronomeProps> = ({
  currentBeat,
  totalBeats,
  subdivision,
  currentSubdivision,
  isPlaying,
  phase,
  effectiveBpm,
  isWaitingForStart = false,
  timeUntilStartSec = 0,
  isPickupBeat = false,
}) => {
  // Pendulum swing angle (-26 to +26 degrees)
  const swingAngle =
    isPlaying && !isWaitingForStart ? Math.sin((currentBeat - 1 + phase) * Math.PI) * 26 : 0;
  const isDownbeat = currentBeat === 1 && !isPickupBeat;

  return (
    <div className="flex flex-col items-center justify-between p-5 bg-neutral-900/90 border border-neutral-800 rounded-xl relative overflow-hidden">
      {/* Top indicator bar */}
      <div className="w-full flex items-center justify-between text-xs text-neutral-400 mb-2">
        <div className="flex items-center gap-1.5">
          <span className="font-medium text-neutral-300">비트 모니터</span>
          {isPickupBeat && (
            <span className="text-[10px] font-bold text-amber-300 bg-amber-500/20 px-1.5 py-0.5 rounded border border-amber-500/30">
              예비박(못갖춘마디)
            </span>
          )}
          {isWaitingForStart && (
            <span className="text-[10px] text-neutral-400 bg-neutral-800 px-1.5 py-0.5 rounded flex items-center gap-1">
              <VolumeX className="w-3 h-3 text-neutral-500" />
              <span>음원 시작 전 대기</span>
            </span>
          )}
        </div>
        <span className="font-mono text-neutral-400">
          실효 템포: <strong className="text-amber-400 font-semibold">{effectiveBpm.toFixed(1)}</strong> BPM
        </span>
      </div>

      {/* Main Pendulum Canvas Area */}
      <div className="relative w-full h-36 flex items-center justify-center overflow-hidden my-1">
        {/* Arc guide background */}
        <div className="absolute top-2 w-48 h-28 border-b border-neutral-800/80 rounded-b-full pointer-events-none" />

        {/* Pendulum Base Pivot */}
        <div className="absolute top-2 w-3.5 h-3.5 rounded-full bg-neutral-600 border border-neutral-400 shadow-sm z-10" />

        {/* Pendulum Arm */}
        <div
          className="absolute top-3 w-1 bg-gradient-to-b from-neutral-400 to-amber-400 origin-top h-28 transition-transform duration-75 ease-out rounded-full shadow-lg"
          style={{
            transform: `rotate(${swingAngle}deg)`,
          }}
        >
          {/* Pendulum Weight / Bob */}
          <div
            className={`absolute -bottom-3 -left-3 w-7 h-7 rounded-full border-2 transition-colors duration-100 flex items-center justify-center ${
              isPlaying && !isWaitingForStart && isDownbeat && phase < 0.25
                ? 'bg-amber-400 border-amber-200 shadow-[0_0_20px_rgba(251,191,36,0.8)] scale-110'
                : isPlaying && !isWaitingForStart && phase < 0.25
                ? 'bg-white border-neutral-200 shadow-[0_0_12px_rgba(255,255,255,0.6)]'
                : 'bg-neutral-800 border-neutral-600'
            }`}
          >
            <div className="w-2 h-2 rounded-full bg-neutral-900" />
          </div>
        </div>

        {/* Waiting Overlay Badge */}
        {isPlaying && isWaitingForStart && (
          <div className="absolute bottom-2 bg-neutral-950/85 backdrop-blur px-3 py-1 rounded-full border border-neutral-800 text-[11px] font-mono text-amber-300 flex items-center gap-1.5 animate-pulse z-20">
            <span>음원 시작까지 {timeUntilStartSec.toFixed(1)}초 후 진입</span>
          </div>
        )}
      </div>

      {/* Beat dots cluster */}
      <div className="w-full mt-3 pt-3 border-t border-neutral-800/80 flex flex-col items-center gap-2">
        <div className="flex items-center justify-center gap-3">
          {Array.from({ length: totalBeats }, (_, i) => {
            const beatNum = i + 1;
            const isCurrent = isPlaying && !isWaitingForStart && currentBeat === beatNum;
            const isFirst = beatNum === 1;

            return (
              <div
                key={beatNum}
                className="flex flex-col items-center gap-1.5 transition-all duration-100"
              >
                <div
                  className={`w-9 h-9 rounded-lg flex items-center justify-center font-mono text-sm font-bold transition-all duration-100 ${
                    isCurrent
                      ? isFirst && !isPickupBeat
                        ? 'bg-amber-400 text-neutral-950 shadow-[0_0_18px_rgba(251,191,36,0.7)] scale-110'
                        : isPickupBeat
                        ? 'bg-amber-300 text-neutral-950 shadow-[0_0_12px_rgba(252,211,77,0.7)] scale-105'
                        : 'bg-neutral-100 text-neutral-950 shadow-[0_0_12px_rgba(255,255,255,0.5)] scale-105'
                      : isFirst
                      ? 'bg-neutral-900 border border-amber-500/40 text-amber-500/80'
                      : 'bg-neutral-900 border border-neutral-800 text-neutral-500'
                  }`}
                >
                  {beatNum}
                </div>
                <span className="text-[10px] text-neutral-500 font-mono">
                  {isFirst ? '강박' : '약박'}
                </span>
              </div>
            );
          })}
        </div>

        {/* Subdivision Indicator (if > 1) */}
        {subdivision > 1 && (
          <div className="flex items-center gap-1.5 mt-1">
            <span className="text-[11px] text-neutral-500 mr-1">세분박:</span>
            {Array.from({ length: subdivision }, (_, idx) => (
              <div
                key={idx}
                className={`w-2.5 h-1.5 rounded-full transition-colors ${
                  isPlaying && !isWaitingForStart && currentSubdivision === idx
                    ? 'bg-amber-400'
                    : 'bg-neutral-800'
                }`}
              />
            ))}
          </div>
        )}
      </div>
    </div>
  );
};
