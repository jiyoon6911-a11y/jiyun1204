import React, { useState } from 'react';
import {
  Sparkles,
  Clock,
  Compass,
  ArrowRight,
  Check,
  ChevronLeft,
  ChevronRight,
  Music2,
  VolumeX,
  AlertCircle,
  HelpCircle,
} from 'lucide-react';
import { SongAnalysisResult } from '../types/metronome';
import { formatTime } from '../utils/youtubeHelper';

interface SongAudioSyncPanelProps {
  currentTime: number;
  songStartTimeSec: number;
  onSongStartTimeChange: (sec: number) => void;
  pickupBeats: number;
  onPickupBeatsChange: (beats: number) => void;
  muteBeforeStart: boolean;
  onToggleMuteBeforeStart: () => void;
  onSeek: (seconds: number) => void;
  songTitle: string;
  youtubeId: string;
  onApplyAnalysis: (result: SongAnalysisResult) => void;
  timeSignature: { beats: number; noteValue: number };
}

export const SongAudioSyncPanel: React.FC<SongAudioSyncPanelProps> = ({
  currentTime,
  songStartTimeSec,
  onSongStartTimeChange,
  pickupBeats,
  onPickupBeatsChange,
  muteBeforeStart,
  onToggleMuteBeforeStart,
  onSeek,
  songTitle,
  youtubeId,
  onApplyAnalysis,
  timeSignature,
}) => {
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const [analysisResult, setAnalysisResult] = useState<SongAnalysisResult | null>(null);
  const [analysisError, setAnalysisError] = useState<string>('');

  // Call server-side Gemini endpoint
  const handleAnalyzeSong = async () => {
    setIsAnalyzing(true);
    setAnalysisError('');
    try {
      const res = await fetch('/api/gemini/analyze-track', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          titleOrUrl: songTitle || `YouTube ID ${youtubeId}`,
          videoId: youtubeId,
        }),
      });

      const data = await res.json();
      if (data.success) {
        setAnalysisResult(data);
      } else {
        setAnalysisError(data.error || data.message || '분석 중 문제가 발생했습니다.');
      }
    } catch (e: any) {
      setAnalysisError('서버 연결 실패: ' + (e.message || String(e)));
    } finally {
      setIsAnalyzing(false);
    }
  };

  const handleApplyAnalysis = () => {
    if (!analysisResult) return;
    onApplyAnalysis(analysisResult);
  };

  const handleSnapToCurrent = () => {
    const snapped = Math.round(currentTime * 100) / 100;
    onSongStartTimeChange(snapped);
  };

  const handleNudgeStart = (deltaSec: number) => {
    const updated = Math.max(0, Math.round((songStartTimeSec + deltaSec) * 100) / 100);
    onSongStartTimeChange(updated);
  };

  const isBeforeStart = currentTime < songStartTimeSec;

  return (
    <div className="bg-neutral-900/90 border border-amber-500/40 rounded-xl p-5 flex flex-col gap-4 shadow-xl">
      {/* Header */}
      <div className="flex flex-wrap items-center justify-between gap-2 border-b border-neutral-800 pb-3">
        <div className="flex items-center gap-2">
          <div className="w-6 h-6 rounded bg-amber-500/20 text-amber-400 flex items-center justify-center">
            <Compass className="w-3.5 h-3.5" />
          </div>
          <div>
            <h3 className="text-sm font-bold text-white flex items-center gap-2">
              <span>음원 시작점 & 예비박(못갖춘마디) 정밀 정렬</span>
            </h3>
            <p className="text-[11px] text-neutral-400">
              영상 시작과 동시에 메트로놈이 울리지 않고, 음악 소리가 진입하는 지점부터 카운트합니다.
            </p>
          </div>
        </div>

        {/* AI Analyze Trigger Button */}
        <button
          onClick={handleAnalyzeSong}
          disabled={isAnalyzing}
          className="px-3.5 py-1.5 text-xs font-semibold rounded-lg bg-neutral-800 hover:bg-neutral-700 text-amber-300 border border-amber-500/40 transition-all cursor-pointer flex items-center gap-1.5 disabled:opacity-50"
        >
          <Sparkles className="w-3.5 h-3.5" />
          <span>{isAnalyzing ? '곡 분석 및 템포 계산 중...' : '곡 템포 & 예비박 AI 계산'}</span>
        </button>
      </div>

      {/* AI Analysis Result Card (if generated) */}
      {analysisResult && (
        <div className="p-3.5 bg-amber-500/10 border border-amber-500/30 rounded-lg text-xs space-y-2">
          <div className="flex items-center justify-between">
            <span className="font-bold text-amber-300 flex items-center gap-1">
              <Sparkles className="w-3.5 h-3.5" />
              <span>곡 분석 결과 (BPM 및 박자 구조)</span>
            </span>
            <button
              onClick={handleApplyAnalysis}
              className="px-3 py-1 bg-amber-400 hover:bg-amber-300 text-neutral-950 font-bold rounded text-xs transition-colors cursor-pointer flex items-center gap-1"
            >
              <Check className="w-3 h-3" />
              <span>분석값 즉시 적용</span>
            </button>
          </div>

          <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 py-1 font-mono text-[11px]">
            <div className="bg-neutral-950/70 p-2 rounded border border-neutral-800">
              <span className="text-neutral-500 block text-[10px]">원곡 템포</span>
              <strong className="text-amber-400 text-sm">{analysisResult.bpm} BPM</strong>
            </div>
            <div className="bg-neutral-950/70 p-2 rounded border border-neutral-800">
              <span className="text-neutral-500 block text-[10px]">박자표</span>
              <strong className="text-white text-sm">
                {analysisResult.timeSignature.beats}/{analysisResult.timeSignature.noteValue}
              </strong>
            </div>
            <div className="bg-neutral-950/70 p-2 rounded border border-neutral-800">
              <span className="text-neutral-500 block text-[10px]">예비박 구조</span>
              <strong className="text-amber-300 text-sm">
                {analysisResult.hasPickupBeat
                  ? `${analysisResult.pickupBeatsCount}박 예비박`
                  : '정박 시작'}
              </strong>
            </div>
            <div className="bg-neutral-950/70 p-2 rounded border border-neutral-800">
              <span className="text-neutral-500 block text-[10px]">추정 소리 시작</span>
              <strong className="text-white text-sm font-mono">
                {analysisResult.estimatedStartTimeSec}초
              </strong>
            </div>
          </div>

          {analysisResult.analysisSummary && (
            <p className="text-[11px] text-neutral-300 leading-relaxed bg-neutral-950/40 p-2 rounded">
              {analysisResult.analysisSummary}
            </p>
          )}
        </div>
      )}

      {analysisError && (
        <div className="p-2.5 bg-red-500/10 border border-red-500/30 rounded-lg text-xs text-red-400 flex items-center gap-2">
          <AlertCircle className="w-4 h-4 shrink-0" />
          <span>{analysisError}</span>
        </div>
      )}

      {/* 1. Song Audio Start Time (음원 시작 위치 지정) */}
      <div className="p-3.5 bg-neutral-950/70 border border-neutral-800 rounded-lg flex flex-col gap-3">
        <div className="flex flex-wrap items-center justify-between gap-2">
          <div>
            <span className="text-xs font-bold text-neutral-200">
              1. 음원 실제 시작 위치 (초 단위)
            </span>
            <span className="text-[11px] text-neutral-400 block mt-0.5">
              영상 로고나 묵음이 지나고 실제 첫 소리가 시작되는 지점
            </span>
          </div>

          <div className="flex items-center gap-2">
            <span className="text-[11px] text-neutral-500 font-mono">현재 재생:</span>
            <span className="text-xs font-mono font-semibold text-white bg-neutral-900 px-2 py-0.5 rounded border border-neutral-800">
              {formatTime(currentTime, true)}
            </span>
          </div>
        </div>

        {/* Snap & Frame Nudge Controls */}
        <div className="flex flex-wrap items-center gap-2">
          {/* Main Snap Button */}
          <button
            onClick={handleSnapToCurrent}
            className="flex-1 min-w-[200px] py-2.5 px-3 bg-amber-400 hover:bg-amber-300 text-neutral-950 font-bold text-xs rounded-lg transition-colors cursor-pointer flex items-center justify-center gap-2 shadow-sm"
          >
            <Clock className="w-3.5 h-3.5" />
            <span>지금 위치({formatTime(currentTime, true)})를 시작점으로 지정</span>
          </button>

          {/* Direct Input & Nudge */}
          <div className="flex items-center gap-1 bg-neutral-900 p-1 rounded-lg border border-neutral-800">
            <button
              onClick={() => handleNudgeStart(-0.5)}
              className="px-2 py-1.5 text-[11px] font-mono hover:bg-neutral-800 text-neutral-300 rounded cursor-pointer"
              title="-0.5초"
            >
              -0.5s
            </button>
            <button
              onClick={() => handleNudgeStart(-0.05)}
              className="px-2 py-1.5 text-[11px] font-mono hover:bg-neutral-800 text-neutral-300 rounded cursor-pointer"
              title="-0.05초"
            >
              -0.05s
            </button>

            <div className="flex items-center px-2">
              <input
                type="number"
                step="0.01"
                min="0"
                value={songStartTimeSec}
                onChange={(e) => onSongStartTimeChange(Math.max(0, parseFloat(e.target.value) || 0))}
                className="w-16 text-center font-mono text-xs font-bold text-amber-400 bg-transparent border-b border-amber-500/40 focus:outline-none"
              />
              <span className="text-[11px] text-neutral-500 ml-1">초</span>
            </div>

            <button
              onClick={() => handleNudgeStart(0.05)}
              className="px-2 py-1.5 text-[11px] font-mono hover:bg-neutral-800 text-neutral-300 rounded cursor-pointer"
              title="+0.05초"
            >
              +0.05s
            </button>
            <button
              onClick={() => handleNudgeStart(0.5)}
              className="px-2 py-1.5 text-[11px] font-mono hover:bg-neutral-800 text-neutral-300 rounded cursor-pointer"
              title="+0.5초"
            >
              +0.5s
            </button>
          </div>

          <button
            onClick={() => onSeek(songStartTimeSec)}
            className="px-3 py-2 text-xs font-medium text-neutral-300 bg-neutral-900 hover:bg-neutral-800 border border-neutral-800 rounded-lg cursor-pointer"
          >
            시작점으로 이동
          </button>
        </div>

        {/* Silence before start setting */}
        <div className="flex items-center justify-between pt-1">
          <label className="flex items-center gap-2 cursor-pointer text-xs text-neutral-300">
            <input
              type="checkbox"
              checked={muteBeforeStart}
              onChange={onToggleMuteBeforeStart}
              className="accent-amber-400 rounded cursor-pointer w-4 h-4"
            />
            <span>음원 시작점 도달 전까지 메트로놈 침묵 대기 (권장)</span>
          </label>

          {isBeforeStart && (
            <span className="text-[11px] font-mono text-neutral-500 bg-neutral-900 px-2 py-0.5 rounded">
              시작점까지 {(songStartTimeSec - currentTime).toFixed(2)}초 남음
            </span>
          )}
        </div>
      </div>

      {/* 2. Pickup Beat (못갖춘마디 / 예비박) Selection */}
      <div className="p-3.5 bg-neutral-950/70 border border-neutral-800 rounded-lg flex flex-col gap-2.5">
        <div className="flex items-center justify-between">
          <div>
            <span className="text-xs font-bold text-neutral-200">
              2. 곡 시작 형태: 예비박 (못갖춘마디 / Anacrusis)
            </span>
            <span className="text-[11px] text-neutral-400 block mt-0.5">
              마디 시작 전 몇 박자가 먼저 흘러나오는지 선택하세요 (사용자 질문: &apos;예비박 1박하고 들어가는 곡&apos;)
            </span>
          </div>

          <div className="text-xs font-mono font-bold text-amber-400">
            {pickupBeats === 0
              ? '정박 시작 (1박)'
              : pickupBeats === 1
              ? '1박 예비박 (4박 진입)'
              : pickupBeats === 2
              ? '2박 예비박 (3박 진입)'
              : `${pickupBeats}박 예비박`}
          </div>
        </div>

        {/* Preset Pickup Buttons */}
        <div className="grid grid-cols-2 sm:grid-cols-5 gap-1.5">
          {[
            { beats: 0, label: '정박 시작', desc: '1박 강박' },
            { beats: 1, label: '1박 예비박', desc: '4박 진입 (가장 흔함)' },
            { beats: 2, label: '2박 예비박', desc: '3, 4박 진입' },
            { beats: 3, label: '3박 예비박', desc: '2, 3, 4박 진입' },
            { beats: 0.5, label: '반박(8분) 예비박', desc: '앤드(And)박 진입' },
          ].map((item) => (
            <button
              key={item.beats}
              onClick={() => onPickupBeatsChange(item.beats)}
              className={`p-2 rounded-lg border text-left transition-all cursor-pointer flex flex-col ${
                pickupBeats === item.beats
                  ? 'bg-amber-400 text-neutral-950 border-amber-300 font-bold'
                  : 'bg-neutral-900 border-neutral-800 text-neutral-300 hover:border-neutral-700'
              }`}
            >
              <span className="text-xs">{item.label}</span>
              <span
                className={`text-[10px] ${
                  pickupBeats === item.beats ? 'text-neutral-900 font-medium' : 'text-neutral-500'
                }`}
              >
                {item.desc}
              </span>
            </button>
          ))}
        </div>

        {/* Visual Rhythm Diagram */}
        <div className="p-2.5 bg-neutral-900/80 rounded border border-neutral-800/80 text-[11px] text-neutral-400 flex items-center gap-2">
          <span className="font-semibold text-neutral-300 shrink-0">비트 순서:</span>
          {pickupBeats === 1 ? (
            <div className="flex items-center gap-1.5 font-mono">
              <span className="px-1.5 py-0.5 rounded bg-amber-500/20 text-amber-300 font-bold border border-amber-500/40">
                [예비 4박]
              </span>
              <ArrowRight className="w-3 h-3 text-neutral-500" />
              <span className="px-1.5 py-0.5 rounded bg-amber-400 text-neutral-950 font-bold">
                [1박 강박!]
              </span>
              <span className="text-neutral-400">[2박]</span>
              <span className="text-neutral-400">[3박]</span>
              <span className="text-neutral-400">[4박]</span>
            </div>
          ) : pickupBeats === 2 ? (
            <div className="flex items-center gap-1.5 font-mono">
              <span className="px-1.5 py-0.5 rounded bg-amber-500/20 text-amber-300 font-bold border border-amber-500/40">
                [예비 3, 4박]
              </span>
              <ArrowRight className="w-3 h-3 text-neutral-500" />
              <span className="px-1.5 py-0.5 rounded bg-amber-400 text-neutral-950 font-bold">
                [1박 강박!]
              </span>
              <span className="text-neutral-400">[2박]</span>
              <span className="text-neutral-400">[3박]</span>
              <span className="text-neutral-400">[4박]</span>
            </div>
          ) : (
            <div className="flex items-center gap-1.5 font-mono">
              <span className="px-1.5 py-0.5 rounded bg-amber-400 text-neutral-950 font-bold">
                [1박 강박 시작!]
              </span>
              <span className="text-neutral-400">[2박]</span>
              <span className="text-neutral-400">[3박]</span>
              <span className="text-neutral-400">[4박]</span>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
