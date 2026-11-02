import React from 'react';
import { Repeat, Flag, ArrowRight, Zap } from 'lucide-react';
import { formatTime } from '../utils/youtubeHelper';
import { LoopSettings } from '../types/metronome';

interface PracticeLoopBarProps {
  currentTime: number;
  duration: number;
  loopSettings: LoopSettings;
  onUpdateLoopSettings: (newSettings: Partial<LoopSettings>) => void;
  onSeek: (seconds: number) => void;
}

export const PracticeLoopBar: React.FC<PracticeLoopBarProps> = ({
  currentTime,
  duration,
  loopSettings,
  onUpdateLoopSettings,
  onSeek,
}) => {
  const handleSetA = () => {
    onUpdateLoopSettings({
      startTime: Math.round(currentTime * 10) / 10,
      enabled: true,
    });
  };

  const handleSetB = () => {
    if (currentTime > loopSettings.startTime) {
      onUpdateLoopSettings({
        endTime: Math.round(currentTime * 10) / 10,
        enabled: true,
      });
    } else {
      onUpdateLoopSettings({
        endTime: Math.min(duration, Math.round((loopSettings.startTime + 10) * 10) / 10),
        enabled: true,
      });
    }
  };

  return (
    <div className="bg-neutral-900/90 border border-neutral-800 rounded-xl p-4 flex flex-col gap-3">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <div className="flex items-center gap-2">
          <Repeat className="w-4 h-4 text-amber-400" />
          <h4 className="text-xs font-bold text-neutral-200">A-B 구간 반복 연습기</h4>
          <span className="text-[11px] text-neutral-500">
            어려운 파트(솔로, 간주, 드럼 브레이크)를 지정해 집중 반복
          </span>
        </div>

        <div className="flex items-center gap-2">
          {/* Loop Enable Toggle */}
          <button
            onClick={() => onUpdateLoopSettings({ enabled: !loopSettings.enabled })}
            className={`px-3 py-1 text-xs font-semibold rounded-lg border transition-colors cursor-pointer ${
              loopSettings.enabled
                ? 'bg-amber-400 text-neutral-950 border-amber-300'
                : 'bg-neutral-950 border-neutral-800 text-neutral-400 hover:text-neutral-200'
            }`}
          >
            {loopSettings.enabled ? '구간 반복 켜짐' : '구간 반복 끔'}
          </button>
        </div>
      </div>

      {/* Marker Controls */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-2">
        {/* Set [A] */}
        <div className="flex items-center justify-between p-2.5 bg-neutral-950 rounded-lg border border-neutral-800">
          <div className="flex items-center gap-2">
            <span className="text-xs font-bold text-amber-400 font-mono">[A] 시작</span>
            <span className="text-xs font-mono text-neutral-300">
              {formatTime(loopSettings.startTime, true)}
            </span>
          </div>
          <div className="flex items-center gap-1">
            <button
              onClick={handleSetA}
              className="px-2 py-1 text-[11px] font-semibold bg-neutral-900 hover:bg-neutral-800 border border-neutral-700 text-neutral-200 rounded cursor-pointer"
            >
              현재 위치
            </button>
            <button
              onClick={() => onSeek(loopSettings.startTime)}
              className="px-2 py-1 text-[11px] text-neutral-400 hover:text-white cursor-pointer"
            >
              이동
            </button>
          </div>
        </div>

        {/* Set [B] */}
        <div className="flex items-center justify-between p-2.5 bg-neutral-950 rounded-lg border border-neutral-800">
          <div className="flex items-center gap-2">
            <span className="text-xs font-bold text-amber-400 font-mono">[B] 끝</span>
            <span className="text-xs font-mono text-neutral-300">
              {formatTime(loopSettings.endTime, true)}
            </span>
          </div>
          <div className="flex items-center gap-1">
            <button
              onClick={handleSetB}
              className="px-2 py-1 text-[11px] font-semibold bg-neutral-900 hover:bg-neutral-800 border border-neutral-700 text-neutral-200 rounded cursor-pointer"
            >
              현재 위치
            </button>
            <button
              onClick={() => onSeek(loopSettings.endTime)}
              className="px-2 py-1 text-[11px] text-neutral-400 hover:text-white cursor-pointer"
            >
              이동
            </button>
          </div>
        </div>

        {/* Speed Drill Trainer Toggle */}
        <div className="sm:col-span-2 flex items-center justify-between p-2.5 bg-neutral-950 rounded-lg border border-neutral-800">
          <div className="flex items-center gap-2">
            <Zap className="w-3.5 h-3.5 text-amber-400" />
            <div className="flex flex-col">
              <span className="text-xs font-semibold text-neutral-300">스피드 트레이너</span>
              <span className="text-[10px] text-neutral-500">
                반복할 때마다 속도를 점진적으로 +5% 가속 연습
              </span>
            </div>
          </div>

          <button
            onClick={() =>
              onUpdateLoopSettings({
                autoIncrementSpeed: !loopSettings.autoIncrementSpeed,
              })
            }
            className={`px-2.5 py-1 text-xs font-medium rounded border transition-colors cursor-pointer ${
              loopSettings.autoIncrementSpeed
                ? 'bg-amber-500/10 border-amber-500/40 text-amber-300'
                : 'bg-neutral-900 border-neutral-800 text-neutral-500 hover:text-neutral-300'
            }`}
          >
            {loopSettings.autoIncrementSpeed ? '+0.05x 가속 활성' : '비활성'}
          </button>
        </div>
      </div>
    </div>
  );
};
