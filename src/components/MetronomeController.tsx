import React, { useState, useRef, useEffect } from 'react';
import {
  Play,
  Pause,
  RotateCcw,
  Volume2,
  VolumeX,
  FastForward,
  ChevronLeft,
  ChevronRight,
  Disc,
  Clock,
  Sliders,
  Sparkles,
} from 'lucide-react';
import { TimeSignature, Subdivision } from '../types/metronome';

interface MetronomeControllerProps {
  bpm: number;
  onBpmChange: (newBpm: number) => void;
  speed: number;
  onSpeedChange: (newSpeed: number) => void;
  offsetMs: number;
  onOffsetChange: (newOffset: number) => void;
  timeSignature: { beats: number; noteValue: number };
  onTimeSignatureChange: (ts: { beats: number; noteValue: number }) => void;
  subdivision: Subdivision;
  onSubdivisionChange: (sub: Subdivision) => void;
  isPlaying: boolean;
  onTogglePlay: () => void;
  onRestart: () => void;
  isMetronomeMuted: boolean;
  onToggleMetronomeMute: () => void;
  onTapDownbeat: () => void;
  countIn: boolean;
  onToggleCountIn: () => void;
}

const COMMON_SPEEDS = [0.5, 0.75, 0.85, 1.0, 1.1, 1.25, 1.5, 2.0];

const TIME_SIGNATURES: Array<{ beats: number; noteValue: number; label: string }> = [
  { beats: 4, noteValue: 4, label: '4/4 박자' },
  { beats: 3, noteValue: 4, label: '3/4 박자' },
  { beats: 2, noteValue: 4, label: '2/4 박자' },
  { beats: 6, noteValue: 8, label: '6/8 박자' },
  { beats: 5, noteValue: 4, label: '5/4 박자' },
];

export const MetronomeController: React.FC<MetronomeControllerProps> = ({
  bpm,
  onBpmChange,
  speed,
  onSpeedChange,
  offsetMs,
  onOffsetChange,
  timeSignature,
  onTimeSignatureChange,
  subdivision,
  onSubdivisionChange,
  isPlaying,
  onTogglePlay,
  onRestart,
  isMetronomeMuted,
  onToggleMetronomeMute,
  onTapDownbeat,
  countIn,
  onToggleCountIn,
}) => {
  // Tap tempo state
  const tapTimesRef = useRef<number[]>([]);
  const [tapCount, setTapCount] = useState(0);
  const [tapActive, setTapActive] = useState(false);

  const handleTapTempo = () => {
    const now = performance.now();
    setTapActive(true);
    setTimeout(() => setTapActive(false), 150);

    const taps = tapTimesRef.current;
    // Reset if last tap was more than 2.5 seconds ago
    if (taps.length > 0 && now - taps[taps.length - 1] > 2500) {
      tapTimesRef.current = [now];
      setTapCount(1);
      return;
    }

    taps.push(now);
    if (taps.length > 8) {
      taps.shift();
    }
    setTapCount(taps.length);

    if (taps.length >= 2) {
      // Calculate intervals between consecutive taps
      const intervals: number[] = [];
      for (let i = 1; i < taps.length; i++) {
        intervals.push(taps[i] - taps[i - 1]);
      }
      const avgIntervalMs = intervals.reduce((a, b) => a + b, 0) / intervals.length;
      const rawBpm = 60000 / avgIntervalMs;
      // Clamp between 30 and 320
      const clampedBpm = Math.max(30, Math.min(320, Math.round(rawBpm * 10) / 10));
      onBpmChange(clampedBpm);
    }
  };

  const handleBpmStep = (delta: number) => {
    const updated = Math.max(30, Math.min(320, Math.round((bpm + delta) * 10) / 10));
    onBpmChange(updated);
  };

  const handleOffsetNudge = (deltaMs: number) => {
    onOffsetChange(offsetMs + deltaMs);
  };

  // Effective BPM scaled by playback speed
  const effectiveBpm = bpm * speed;

  return (
    <div className="bg-neutral-900/90 border border-neutral-800 rounded-xl p-5 flex flex-col gap-5">
      {/* 1. Main Action Bar: Synchronized Play/Pause & Master controls */}
      <div className="flex flex-wrap items-center justify-between gap-3 p-3 bg-neutral-950/70 border border-neutral-800/80 rounded-lg">
        <div className="flex items-center gap-2">
          <button
            onClick={onTogglePlay}
            className={`px-5 py-2.5 rounded-lg font-bold text-sm flex items-center gap-2 transition-all cursor-pointer shadow-sm ${
              isPlaying
                ? 'bg-amber-400 text-neutral-950 hover:bg-amber-300 shadow-amber-900/50'
                : 'bg-white text-neutral-950 hover:bg-neutral-200'
            }`}
          >
            {isPlaying ? (
              <>
                <Pause className="w-4 h-4 fill-current" />
                <span>일시정지</span>
              </>
            ) : (
              <>
                <Play className="w-4 h-4 fill-current ml-0.5" />
                <span>재생 & 싱크 시작</span>
              </>
            )}
          </button>

          <button
            onClick={onRestart}
            title="처음부터 다시 재생"
            className="p-2.5 rounded-lg border border-neutral-800 bg-neutral-900 hover:bg-neutral-800 text-neutral-300 transition-colors cursor-pointer"
          >
            <RotateCcw className="w-4 h-4" />
          </button>
        </div>

        {/* Metronome Sound Mute and Count-in */}
        <div className="flex items-center gap-2">
          <button
            onClick={onToggleCountIn}
            className={`px-3 py-1.5 text-xs font-medium rounded-lg border transition-colors cursor-pointer ${
              countIn
                ? 'bg-amber-500/10 border-amber-500/40 text-amber-300'
                : 'bg-neutral-900 border-neutral-800 text-neutral-400 hover:text-neutral-200'
            }`}
          >
            <span>예비박 (1마디 카운트)</span>
          </button>

          <button
            onClick={onToggleMetronomeMute}
            className={`px-3 py-1.5 text-xs font-medium rounded-lg border transition-colors flex items-center gap-1.5 cursor-pointer ${
              isMetronomeMuted
                ? 'bg-red-500/10 border-red-500/30 text-red-400'
                : 'bg-neutral-900 border-neutral-800 text-neutral-300 hover:text-neutral-100'
            }`}
          >
            {isMetronomeMuted ? (
              <>
                <VolumeX className="w-3.5 h-3.5" />
                <span>메트로놈 음소거</span>
              </>
            ) : (
              <>
                <Volume2 className="w-3.5 h-3.5 text-amber-400" />
                <span>메트로놈 켜짐</span>
              </>
            )}
          </button>
        </div>
      </div>

      {/* 2. BPM Core Section */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        {/* Left: BPM & Tap Tempo */}
        <div className="p-4 bg-neutral-950/60 border border-neutral-800/80 rounded-lg flex flex-col justify-between">
          <div className="flex items-center justify-between mb-2">
            <span className="text-xs font-semibold text-neutral-300">원곡 템포 (BPM)</span>
            <span className="text-[11px] text-neutral-500">30 ~ 320 BPM</span>
          </div>

          <div className="flex items-center justify-between gap-3 my-2">
            <div className="flex items-center gap-1">
              <button
                onClick={() => handleBpmStep(-5)}
                className="px-2 py-1 text-xs font-mono font-semibold rounded bg-neutral-900 hover:bg-neutral-800 border border-neutral-800 text-neutral-300 cursor-pointer"
              >
                -5
              </button>
              <button
                onClick={() => handleBpmStep(-1)}
                className="px-2 py-1 text-xs font-mono font-semibold rounded bg-neutral-900 hover:bg-neutral-800 border border-neutral-800 text-neutral-300 cursor-pointer"
              >
                -1
              </button>
            </div>

            <div className="flex items-baseline gap-1.5">
              <input
                type="number"
                min="30"
                max="320"
                step="0.5"
                value={bpm}
                onChange={(e) => onBpmChange(Math.max(30, Math.min(320, parseFloat(e.target.value) || 120)))}
                className="w-24 text-center font-mono text-3xl font-bold text-white bg-transparent border-b border-amber-500/50 focus:outline-none focus:border-amber-400 tabular-nums"
              />
              <span className="text-xs font-mono text-neutral-400">BPM</span>
            </div>

            <div className="flex items-center gap-1">
              <button
                onClick={() => handleBpmStep(1)}
                className="px-2 py-1 text-xs font-mono font-semibold rounded bg-neutral-900 hover:bg-neutral-800 border border-neutral-800 text-neutral-300 cursor-pointer"
              >
                +1
              </button>
              <button
                onClick={() => handleBpmStep(5)}
                className="px-2 py-1 text-xs font-mono font-semibold rounded bg-neutral-900 hover:bg-neutral-800 border border-neutral-800 text-neutral-300 cursor-pointer"
              >
                +5
              </button>
            </div>
          </div>

          {/* Tap Tempo Button */}
          <div className="mt-2 pt-2 border-t border-neutral-800/80 flex items-center justify-between">
            <button
              onClick={handleTapTempo}
              className={`w-full py-2 px-3 text-xs font-semibold rounded-lg border transition-all cursor-pointer flex items-center justify-center gap-2 ${
                tapActive
                  ? 'bg-amber-400 text-neutral-950 border-amber-300 scale-[0.98]'
                  : 'bg-neutral-900 hover:bg-neutral-800 border-neutral-700 text-neutral-200'
              }`}
            >
              <Disc className="w-3.5 h-3.5" />
              <span>박자에 맞춰 탭 (TAP TEMPO)</span>
              {tapCount > 1 && (
                <span className="text-[10px] font-mono bg-neutral-800 px-1.5 py-0.5 rounded text-amber-300">
                  {tapCount}회 탭
                </span>
              )}
            </button>
          </div>
        </div>

        {/* Right: Playback Speed (속도 조절) */}
        <div className="p-4 bg-neutral-950/60 border border-neutral-800/80 rounded-lg flex flex-col justify-between">
          <div className="flex items-center justify-between mb-2">
            <span className="text-xs font-semibold text-neutral-300">재생 속도 (유튜브 연동)</span>
            <span className="text-[11px] font-mono text-amber-400 font-semibold">
              {speed.toFixed(2)}x 배속
            </span>
          </div>

          {/* Speed Preset Buttons */}
          <div className="grid grid-cols-4 gap-1.5 my-1">
            {COMMON_SPEEDS.map((s) => (
              <button
                key={s}
                onClick={() => onSpeedChange(s)}
                className={`py-1 text-xs font-mono font-semibold rounded border transition-colors cursor-pointer ${
                  Math.abs(speed - s) < 0.01
                    ? 'bg-amber-400 text-neutral-950 border-amber-400'
                    : 'bg-neutral-900 border-neutral-800 text-neutral-400 hover:text-neutral-200'
                }`}
              >
                {s}x
              </button>
            ))}
          </div>

          {/* Speed Slider */}
          <div className="mt-2 flex items-center gap-2">
            <span className="text-[10px] font-mono text-neutral-500">0.5x</span>
            <input
              type="range"
              min="0.5"
              max="2.0"
              step="0.05"
              value={speed}
              onChange={(e) => onSpeedChange(parseFloat(e.target.value))}
              className="flex-1 accent-amber-400 cursor-pointer h-1.5 bg-neutral-800 rounded-lg"
            />
            <span className="text-[10px] font-mono text-neutral-500">2.0x</span>
          </div>

          <div className="text-[11px] text-neutral-400 mt-1">
            체감 속도: <strong className="text-white font-mono">{effectiveBpm.toFixed(1)} BPM</strong> 으로 자동 가속/감속
          </div>
        </div>
      </div>

      {/* 3. The Crucial Alignment: Beat Phase & Downbeat Sync ("노래에 맞게 메트로늄이 나와야함") */}
      <div className="p-4 bg-neutral-950/80 border border-amber-500/30 rounded-lg flex flex-col gap-3">
        <div className="flex flex-wrap items-center justify-between gap-2">
          <div>
            <h4 className="text-xs font-bold text-amber-300 flex items-center gap-1.5">
              <span>첫 박자 및 비트 오프셋 동기화</span>
            </h4>
            <p className="text-[11px] text-neutral-400 mt-0.5">
              노래의 첫 박(Downbeat)이 떨어지는 순간 아래 버튼을 누르면 오프셋이 즉시 정렬됩니다.
            </p>
          </div>

          {/* Current Offset Readout */}
          <div className="flex items-center gap-2">
            <span className="text-xs text-neutral-400">현재 오프셋:</span>
            <span className="text-xs font-mono font-bold text-amber-400 bg-neutral-900 px-2 py-0.5 rounded border border-neutral-800">
              {offsetMs >= 0 ? `+${offsetMs}` : offsetMs} ms
            </span>
            <button
              onClick={() => onOffsetChange(0)}
              className="text-[11px] text-neutral-400 hover:text-neutral-200 underline cursor-pointer ml-1"
            >
              0ms 리셋
            </button>
          </div>
        </div>

        {/* Primary Sync Action: Tap Downbeat Now */}
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-2">
          <button
            onClick={onTapDownbeat}
            className="sm:col-span-1 py-2.5 px-3 bg-amber-500 hover:bg-amber-400 text-neutral-950 font-bold text-xs rounded-lg transition-all cursor-pointer flex items-center justify-center gap-1.5 shadow-md shadow-amber-950"
          >
            <Clock className="w-3.5 h-3.5" />
            <span>첫 박자 탭 (다운비트 동기화)</span>
          </button>

          {/* Offset Nudge Buttons */}
          <div className="sm:col-span-2 flex items-center justify-between gap-1 p-1 bg-neutral-900 rounded-lg border border-neutral-800">
            <button
              onClick={() => handleOffsetNudge(-50)}
              className="flex-1 py-1.5 text-xs font-mono font-medium rounded hover:bg-neutral-800 text-neutral-300 transition-colors cursor-pointer"
            >
              -50ms
            </button>
            <button
              onClick={() => handleOffsetNudge(-10)}
              className="flex-1 py-1.5 text-xs font-mono font-medium rounded hover:bg-neutral-800 text-neutral-300 transition-colors cursor-pointer"
            >
              -10ms
            </button>
            <span className="text-[11px] text-neutral-500 font-mono px-1">미세조정</span>
            <button
              onClick={() => handleOffsetNudge(10)}
              className="flex-1 py-1.5 text-xs font-mono font-medium rounded hover:bg-neutral-800 text-neutral-300 transition-colors cursor-pointer"
            >
              +10ms
            </button>
            <button
              onClick={() => handleOffsetNudge(50)}
              className="flex-1 py-1.5 text-xs font-mono font-medium rounded hover:bg-neutral-800 text-neutral-300 transition-colors cursor-pointer"
            >
              +50ms
            </button>
          </div>
        </div>
      </div>

      {/* 4. Time Signature & Subdivision Selectors */}
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        {/* Time Signature */}
        <div>
          <label className="text-xs font-semibold text-neutral-300 block mb-2">박자표</label>
          <div className="grid grid-cols-3 sm:grid-cols-5 gap-1.5">
            {TIME_SIGNATURES.map((ts) => {
              const active =
                timeSignature.beats === ts.beats && timeSignature.noteValue === ts.noteValue;
              return (
                <button
                  key={ts.label}
                  onClick={() =>
                    onTimeSignatureChange({ beats: ts.beats, noteValue: ts.noteValue })
                  }
                  className={`py-1.5 text-xs font-mono font-semibold rounded border transition-colors cursor-pointer ${
                    active
                      ? 'bg-neutral-100 text-neutral-950 border-white'
                      : 'bg-neutral-950 border-neutral-800 text-neutral-400 hover:text-neutral-200'
                  }`}
                >
                  {ts.beats}/{ts.noteValue}
                </button>
              );
            })}
          </div>
        </div>

        {/* Subdivision */}
        <div>
          <label className="text-xs font-semibold text-neutral-300 block mb-2">음표 세분화</label>
          <div className="grid grid-cols-4 gap-1.5">
            {[
              { val: 1 as Subdivision, label: '1/4 (4분)' },
              { val: 2 as Subdivision, label: '1/8 (8분)' },
              { val: 3 as Subdivision, label: '셋잇단' },
              { val: 4 as Subdivision, label: '1/16 (16분)' },
            ].map((sub) => (
              <button
                key={sub.val}
                onClick={() => onSubdivisionChange(sub.val)}
                className={`py-1.5 text-xs font-mono font-medium rounded border transition-colors cursor-pointer ${
                  subdivision === sub.val
                    ? 'bg-neutral-100 text-neutral-950 border-white'
                    : 'bg-neutral-950 border-neutral-800 text-neutral-400 hover:text-neutral-200'
                }`}
              >
                {sub.label}
              </button>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
};
