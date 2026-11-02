import React from 'react';
import { X, Play, Music2 } from 'lucide-react';

interface CountdownOverlayProps {
  currentCount: number; // e.g. 1, 2, 3, 4
  totalCounts: number; // e.g. 4 or 8 or 3
  isGo: boolean; // shows "GO!" / "START!"
  onCancel: () => void;
  bpm: number;
  effectiveBpm: number;
  countdownLabel?: string;
}

export const CountdownOverlay: React.FC<CountdownOverlayProps> = ({
  currentCount,
  totalCounts,
  isGo,
  onCancel,
  bpm,
  effectiveBpm,
  countdownLabel = '악기 잡고 준비하세요!',
}) => {
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/85 backdrop-blur-md animate-in fade-in duration-150">
      <div className="relative flex flex-col items-center justify-center max-w-md w-full p-8 text-center">
        {/* Top Cancel button */}
        <button
          onClick={onCancel}
          className="absolute top-2 right-2 p-2 rounded-lg text-neutral-400 hover:text-white hover:bg-neutral-800/80 transition-colors cursor-pointer flex items-center gap-1 text-xs"
        >
          <X className="w-4 h-4" />
          <span className="font-mono">취소 (Esc)</span>
        </button>

        {/* Status Tag */}
        <div className="flex items-center gap-2 px-3 py-1 rounded-full bg-amber-500/10 border border-amber-500/30 text-amber-300 text-xs font-semibold mb-6">
          <Music2 className="w-3.5 h-3.5" />
          <span>예비 카운트다운 진행 중</span>
          <span aria-hidden="true">·</span>
          <span className="font-mono">{effectiveBpm.toFixed(1)} BPM</span>
        </div>

        {/* Giant Number Display with Pulse Ring */}
        <div className="relative w-40 h-40 flex items-center justify-center mb-6">
          {/* Animated glowing border ring */}
          <div className="absolute inset-0 rounded-full border-2 border-amber-500/40 animate-ping opacity-25" />
          <div className="absolute inset-2 rounded-full border-4 border-amber-400/80 shadow-[0_0_40px_rgba(251,191,36,0.5)]" />

          {/* Central digit */}
          <div className="z-10 font-mono text-7xl font-black tracking-tight text-white transition-all scale-100">
            {isGo ? (
              <span className="text-amber-400 text-5xl font-black">START!</span>
            ) : (
              <span className="text-white drop-shadow-[0_0_20px_rgba(251,191,36,0.8)]">
                {currentCount}
              </span>
            )}
          </div>
        </div>

        {/* Friendly instruction */}
        <h3 className="text-xl font-bold text-white mb-2">
          {isGo ? '연주 시작!' : countdownLabel}
        </h3>
        <p className="text-xs text-neutral-400 mb-6">
          카운트다운이 끝나면 영상과 메트로놈이 박자에 맞춰 동시에 재생됩니다.
        </p>

        {/* Progress Step Dots */}
        <div className="flex items-center gap-2 mb-6">
          {Array.from({ length: totalCounts }, (_, i) => {
            const stepNum = i + 1;
            const isFilled = stepNum <= currentCount;
            const isCurrent = stepNum === currentCount;

            return (
              <div
                key={stepNum}
                className={`h-2.5 rounded-full transition-all duration-150 ${
                  isCurrent
                    ? 'w-7 bg-amber-400 shadow-[0_0_10px_rgba(251,191,36,0.8)]'
                    : isFilled
                    ? 'w-4 bg-amber-500/60'
                    : 'w-2.5 bg-neutral-800'
                }`}
              />
            );
          })}
        </div>

        {/* Quick cancel button */}
        <button
          onClick={onCancel}
          className="px-4 py-2 text-xs font-medium text-neutral-400 hover:text-white bg-neutral-900 border border-neutral-800 hover:border-neutral-700 rounded-lg transition-colors cursor-pointer"
        >
          카운트다운 건너뛰고 바로 재생
        </button>
      </div>
    </div>
  );
};
