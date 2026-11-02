import React, { useState, useEffect, useRef, useCallback } from 'react';
import { Header } from './components/Header';
import { YouTubeInputBar } from './components/YouTubeInputBar';
import { YouTubeView, YouTubeControls } from './components/YouTubeView';
import { MetronomeController } from './components/MetronomeController';
import { VisualMetronome } from './components/VisualMetronome';
import { PracticeLoopBar } from './components/PracticeLoopBar';
import { SongAudioSyncPanel } from './components/SongAudioSyncPanel';
import { AudioSettingsModal } from './components/AudioSettingsModal';
import { PresetLibraryModal } from './components/PresetLibraryModal';
import { CountdownOverlay } from './components/CountdownOverlay';
import {
  SongConfig,
  SoundType,
  LoopSettings,
  Subdivision,
  SongAnalysisResult,
  CountdownMode,
} from './types/metronome';
import { PRACTICE_PRESETS } from './constants/presets';
import { audioEngine } from './utils/audioEngine';
import { formatTime } from './utils/youtubeHelper';
import { Volume2, Sliders, Music, Info, HelpCircle } from 'lucide-react';

const STORAGE_SAVED_SONGS_KEY = 'syncbeat_saved_songs_v2';
const STORAGE_LAST_CONFIG_KEY = 'syncbeat_last_config_v2';

export default function App() {
  const defaultPreset = PRACTICE_PRESETS[0];

  // Song identification
  const [youtubeId, setYoutubeId] = useState<string>(defaultPreset.youtubeId);
  const [youtubeUrl, setYoutubeUrl] = useState<string>(
    `https://www.youtube.com/watch?v=${defaultPreset.youtubeId}`
  );
  const [songTitle, setSongTitle] = useState<string>(
    `${defaultPreset.title} - ${defaultPreset.artist}`
  );

  // Tempo & Timing
  const [bpm, setBpm] = useState<number>(defaultPreset.defaultBpm);
  const [speed, setSpeed] = useState<number>(1.0);
  const [offsetMs, setOffsetMs] = useState<number>(defaultPreset.defaultOffsetMs);
  const [timeSignature, setTimeSignature] = useState<{ beats: number; noteValue: number }>(
    defaultPreset.timeSignature
  );
  const [subdivision, setSubdivision] = useState<Subdivision>(1);

  // Preparation Countdown (예비 카운트다운)
  const [countdownMode, setCountdownMode] = useState<CountdownMode>('1_bar');
  const [isCountingDown, setIsCountingDown] = useState<boolean>(false);
  const [countdownCurrent, setCountdownCurrent] = useState<number>(1);
  const [countdownTotal, setCountdownTotal] = useState<number>(4);
  const [isGo, setIsGo] = useState<boolean>(false);

  // Audio start & Pickup beat (못갖춘마디 / 예비박)
  const [songStartTimeSec, setSongStartTimeSec] = useState<number>(
    defaultPreset.audioStartSec ?? 0.15
  );
  const [pickupBeats, setPickupBeats] = useState<number>(defaultPreset.pickupBeats ?? 1);
  const [muteBeforeStart, setMuteBeforeStart] = useState<boolean>(true);

  // Audio Mixer & Settings
  const [soundType, setSoundType] = useState<SoundType>('woodblock');
  const [metronomeVolume, setMetronomeVolume] = useState<number>(0.85);
  const [isMetronomeMuted, setIsMetronomeMuted] = useState<boolean>(false);
  const [youtubeVolume, setYoutubeVolume] = useState<number>(80);
  const [pan, setPan] = useState<number>(0);
  const [bluetoothLatencyMs, setBluetoothLatencyMs] = useState<number>(0);

  // Runtime Playback State
  const [isPlaying, setIsPlaying] = useState<boolean>(false);
  const [currentTime, setCurrentTime] = useState<number>(0);
  const [duration, setDuration] = useState<number>(0);

  // Real-time Beat & Phase state
  const [currentBeat, setCurrentBeat] = useState<number>(1);
  const [currentSubdivision, setCurrentSubdivision] = useState<number>(0);
  const [beatPhase, setBeatPhase] = useState<number>(0);
  const [isWaitingForStart, setIsWaitingForStart] = useState<boolean>(false);
  const [isPickupBeat, setIsPickupBeat] = useState<boolean>(false);

  // A-B Loop Settings
  const [loopSettings, setLoopSettings] = useState<LoopSettings>({
    enabled: false,
    startTime: 0,
    endTime: 30,
    autoIncrementSpeed: false,
    speedStep: 0.05,
    loopCount: 0,
    maxSpeed: 1.5,
  });

  // Saved songs
  const [savedSongs, setSavedSongs] = useState<SongConfig[]>([]);

  // Modals
  const [isAudioSettingsOpen, setIsAudioSettingsOpen] = useState(false);
  const [isPresetsOpen, setIsPresetsOpen] = useState(false);

  // Refs
  const ytControlsRef = useRef<YouTubeControls | null>(null);
  const lastScheduledIndexRef = useRef<number>(-1);
  const lastSubIndexRef = useRef<number>(-1);
  const countIntervalRef = useRef<number | null>(null);
  const goTimeoutRef = useRef<number | null>(null);

  // Load saved state on mount
  useEffect(() => {
    try {
      const storedSaved = localStorage.getItem(STORAGE_SAVED_SONGS_KEY);
      if (storedSaved) {
        setSavedSongs(JSON.parse(storedSaved));
      }
      const storedLast = localStorage.getItem(STORAGE_LAST_CONFIG_KEY);
      if (storedLast) {
        const last = JSON.parse(storedLast);
        if (last.youtubeId) setYoutubeId(last.youtubeId);
        if (last.youtubeUrl) setYoutubeUrl(last.youtubeUrl);
        if (last.title) setSongTitle(last.title);
        if (last.bpm) setBpm(last.bpm);
        if (last.speed) setSpeed(last.speed);
        if (last.offsetMs !== undefined) setOffsetMs(last.offsetMs);
        if (last.timeSignature) setTimeSignature(last.timeSignature);
        if (last.songStartTimeSec !== undefined) setSongStartTimeSec(last.songStartTimeSec);
        if (last.pickupBeats !== undefined) setPickupBeats(last.pickupBeats);
        if (last.muteBeforeStart !== undefined) setMuteBeforeStart(last.muteBeforeStart);
        if (last.countdownMode !== undefined) setCountdownMode(last.countdownMode);
      }
    } catch {
      // ignore
    }
  }, []);

  // Save changes to localStorage
  useEffect(() => {
    try {
      const config = {
        youtubeId,
        youtubeUrl,
        title: songTitle,
        bpm,
        speed,
        offsetMs,
        timeSignature,
        songStartTimeSec,
        pickupBeats,
        muteBeforeStart,
        countdownMode,
      };
      localStorage.setItem(STORAGE_LAST_CONFIG_KEY, JSON.stringify(config));
    } catch {
      // ignore
    }
  }, [
    youtubeId,
    youtubeUrl,
    songTitle,
    bpm,
    speed,
    offsetMs,
    timeSignature,
    songStartTimeSec,
    pickupBeats,
    muteBeforeStart,
    countdownMode,
  ]);

  // Audio Engine parameter sync
  useEffect(() => {
    audioEngine.setSoundType(soundType);
  }, [soundType]);

  useEffect(() => {
    audioEngine.setVolume(metronomeVolume);
  }, [metronomeVolume]);

  useEffect(() => {
    audioEngine.setMuted(isMetronomeMuted);
  }, [isMetronomeMuted]);

  useEffect(() => {
    audioEngine.setPan(pan);
  }, [pan]);

  // Cleanup timers on unmount
  useEffect(() => {
    return () => {
      if (countIntervalRef.current) clearInterval(countIntervalRef.current);
      if (goTimeoutRef.current) clearTimeout(goTimeoutRef.current);
    };
  }, []);

  // High-precision beat calculator taking into account audio start time and pickup beats
  const handleTimeUpdate = useCallback(
    (t: number, dur: number, playing: boolean) => {
      setCurrentTime(t);
      if (dur > 0 && dur !== duration) setDuration(dur);

      if (!playing) {
        setIsWaitingForStart(false);
        return;
      }

      const effectiveBpm = bpm * speed;
      if (effectiveBpm <= 0) return;

      const beatPeriodSec = 60 / effectiveBpm;
      const effectiveOffsetSec = (offsetMs - bluetoothLatencyMs) / 1000;
      const adjustedStartTime = Math.max(0, songStartTimeSec + effectiveOffsetSec);

      // Case 1: Video is before audio entry point
      if (t < adjustedStartTime) {
        setIsWaitingForStart(true);
        setIsPickupBeat(false);
        setBeatPhase(0);
        setCurrentBeat(pickupBeats > 0 ? timeSignature.beats - pickupBeats + 1 : 1);
        lastScheduledIndexRef.current = -1;
        lastSubIndexRef.current = -1;
        return;
      }

      setIsWaitingForStart(false);

      // Case 2: In playback past adjustedStartTime
      let beatNumber = 1;
      let isAccent = false;
      let phaseInBeat = 0;
      let schedulingKey = 0;
      let inPickup = false;

      if (pickupBeats > 0) {
        // Pickup beats lead up to the first downbeat
        const firstDownbeatTime = adjustedStartTime + pickupBeats * beatPeriodSec;

        if (t < firstDownbeatTime) {
          // Inside the pickup measure
          inPickup = true;
          const pickupElapsed = (t - adjustedStartTime) / beatPeriodSec;
          const pickupBeatIndex = Math.floor(pickupElapsed);
          phaseInBeat = pickupElapsed - pickupBeatIndex;

          beatNumber = timeSignature.beats - pickupBeats + 1 + pickupBeatIndex;
          isAccent = false;
          schedulingKey = -1000 + pickupBeatIndex;
        } else {
          // Main measures after the downbeat
          inPickup = false;
          const elapsedFromDownbeat = (t - firstDownbeatTime) / beatPeriodSec;
          const beatIndexInt = Math.floor(elapsedFromDownbeat);
          phaseInBeat = elapsedFromDownbeat - beatIndexInt;
          beatNumber = (beatIndexInt % timeSignature.beats) + 1;
          isAccent = beatNumber === 1;
          schedulingKey = beatIndexInt;
        }
      } else {
        // Straight downbeat start
        inPickup = false;
        const elapsedFromStart = (t - adjustedStartTime) / beatPeriodSec;
        const beatIndexInt = Math.floor(elapsedFromStart);
        phaseInBeat = elapsedFromStart - beatIndexInt;
        beatNumber = (beatIndexInt % timeSignature.beats) + 1;
        isAccent = beatNumber === 1;
        schedulingKey = beatIndexInt;
      }

      setCurrentBeat(beatNumber);
      setIsPickupBeat(inPickup);
      setBeatPhase(phaseInBeat);

      const subIndex = Math.floor(phaseInBeat * subdivision);
      setCurrentSubdivision(subIndex);

      // Trigger Web Audio synthesis clicks
      if (schedulingKey !== lastScheduledIndexRef.current) {
        if (
          lastScheduledIndexRef.current === -1 ||
          Math.abs(schedulingKey - lastScheduledIndexRef.current) < 4
        ) {
          audioEngine.playClick(undefined, isAccent, false);
        }
        lastScheduledIndexRef.current = schedulingKey;
        lastSubIndexRef.current = subIndex;
      } else if (subdivision > 1 && subIndex !== lastSubIndexRef.current) {
        if (subIndex > 0) {
          audioEngine.playClick(undefined, false, true);
        }
        lastSubIndexRef.current = subIndex;
      }
    },
    [
      bpm,
      speed,
      offsetMs,
      bluetoothLatencyMs,
      songStartTimeSec,
      pickupBeats,
      timeSignature,
      subdivision,
      duration,
    ]
  );

  // Cancel any running countdown
  const handleCancelCountdown = () => {
    if (countIntervalRef.current) clearInterval(countIntervalRef.current);
    if (goTimeoutRef.current) clearTimeout(goTimeoutRef.current);
    setIsCountingDown(false);
    setIsGo(false);
  };

  // Launch countdown then trigger playback
  const startCountdown = () => {
    if (countIntervalRef.current) clearInterval(countIntervalRef.current);
    if (goTimeoutRef.current) clearTimeout(goTimeoutRef.current);

    setIsCountingDown(true);
    setIsGo(false);

    const effectiveBpm = bpm * speed;
    let total = 4;
    let intervalMs = (60 / effectiveBpm) * 1000;

    if (countdownMode === '1_bar') {
      total = timeSignature.beats;
      intervalMs = (60 / effectiveBpm) * 1000;
    } else if (countdownMode === '2_bars') {
      total = timeSignature.beats * 2;
      intervalMs = (60 / effectiveBpm) * 1000;
    } else if (countdownMode === '3_sec') {
      total = 3;
      intervalMs = 1000;
    }

    setCountdownTotal(total);
    setCountdownCurrent(1);

    // Initial click for count 1
    audioEngine.playClick(undefined, true, false);

    let count = 1;
    countIntervalRef.current = window.setInterval(() => {
      count++;
      if (count <= total) {
        setCountdownCurrent(count);
        // Accent on beat 1 of each bar
        const isAccent =
          countdownMode === '2_bars'
            ? count === 1 || count === timeSignature.beats + 1
            : count === 1;
        audioEngine.playClick(undefined, isAccent, false);
      } else {
        if (countIntervalRef.current) clearInterval(countIntervalRef.current);
        setIsGo(true);
        audioEngine.playClick(undefined, true, false);

        // Start YouTube video right on cue
        if (ytControlsRef.current) {
          ytControlsRef.current.play();
        }

        goTimeoutRef.current = window.setTimeout(() => {
          setIsCountingDown(false);
          setIsGo(false);
        }, 350);
      }
    }, intervalMs);
  };

  // Play / Pause Master Toggle
  const handleTogglePlay = () => {
    if (isCountingDown) {
      handleCancelCountdown();
      return;
    }

    if (isPlaying) {
      if (ytControlsRef.current) {
        ytControlsRef.current.pause();
      }
      setIsPlaying(false);
    } else {
      if (countdownMode === 'off') {
        if (ytControlsRef.current) {
          ytControlsRef.current.play();
        }
      } else {
        startCountdown();
      }
    }
  };

  // Spacebar and Esc keyboard shortcuts
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      const target = e.target as HTMLElement;
      const isInput =
        target?.tagName === 'INPUT' ||
        target?.tagName === 'TEXTAREA' ||
        target?.isContentEditable;
      if (isInput) return;

      if (e.code === 'Space') {
        e.preventDefault();
        handleTogglePlay();
      } else if (e.code === 'Escape' && isCountingDown) {
        e.preventDefault();
        handleCancelCountdown();
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isPlaying, isCountingDown, countdownMode, bpm, speed, timeSignature]);

  const handleRestart = () => {
    handleCancelCountdown();
    lastScheduledIndexRef.current = -1;
    lastSubIndexRef.current = -1;
    const start = loopSettings.enabled ? loopSettings.startTime : 0;
    if (ytControlsRef.current) {
      ytControlsRef.current.seekTo(start);
      if (countdownMode === 'off') {
        ytControlsRef.current.play();
      } else {
        startCountdown();
      }
    }
  };

  const handleSeek = (secs: number) => {
    lastScheduledIndexRef.current = -1;
    lastSubIndexRef.current = -1;
    if (ytControlsRef.current) {
      ytControlsRef.current.seekTo(secs);
    }
  };

  // Tap Downbeat handler: Align beat 1 to current playback position
  const handleTapDownbeat = () => {
    if (!isPlaying && currentTime === 0) return;

    const effectiveBpm = bpm * speed;
    const beatPeriodSec = 60 / effectiveBpm;

    if (pickupBeats > 0) {
      const newAudioStart = Math.max(0, currentTime - pickupBeats * beatPeriodSec);
      setSongStartTimeSec(Math.round(newAudioStart * 100) / 100);
      setOffsetMs(0);
    } else {
      setSongStartTimeSec(Math.round(currentTime * 100) / 100);
      setOffsetMs(0);
    }

    lastScheduledIndexRef.current = -1;
    audioEngine.playClick(undefined, true, false);
  };

  // Apply AI Song Analysis result
  const handleApplyAnalysis = (result: SongAnalysisResult) => {
    if (result.bpm) setBpm(result.bpm);
    if (result.timeSignature) setTimeSignature(result.timeSignature);
    if (result.pickupBeatsCount !== undefined) setPickupBeats(result.pickupBeatsCount);
    if (result.estimatedStartTimeSec !== undefined) {
      setSongStartTimeSec(result.estimatedStartTimeSec);
    }
    setOffsetMs(0);
    lastScheduledIndexRef.current = -1;
  };

  // Loop trigger
  const handleLoopTrigger = () => {
    lastScheduledIndexRef.current = -1;
    lastSubIndexRef.current = -1;

    if (loopSettings.autoIncrementSpeed) {
      const nextSpeed = Math.min(loopSettings.maxSpeed, Math.round((speed + 0.05) * 100) / 100);
      if (nextSpeed !== speed) {
        setSpeed(nextSpeed);
        if (ytControlsRef.current) {
          ytControlsRef.current.setPlaybackRate(nextSpeed);
        }
      }
    }
  };

  // Select Preset Song
  const handleSelectSong = (preset: {
    youtubeId: string;
    youtubeUrl: string;
    title: string;
    bpm: number;
    offsetMs: number;
    timeSignature: { beats: number; noteValue: number };
    pickupBeats?: number;
    audioStartSec?: number;
  }) => {
    handleCancelCountdown();
    setYoutubeId(preset.youtubeId);
    setYoutubeUrl(preset.youtubeUrl);
    setSongTitle(preset.title);
    setBpm(preset.bpm);
    setOffsetMs(preset.offsetMs);
    setTimeSignature(preset.timeSignature);
    if (preset.pickupBeats !== undefined) setPickupBeats(preset.pickupBeats);
    if (preset.audioStartSec !== undefined) setSongStartTimeSec(preset.audioStartSec);
    lastScheduledIndexRef.current = -1;
    lastSubIndexRef.current = -1;
  };

  // Save current song to library
  const handleSaveCurrentSong = () => {
    const existingIndex = savedSongs.findIndex((s) => s.youtubeId === youtubeId);
    const newConfig: SongConfig = {
      youtubeId,
      youtubeUrl,
      title: songTitle || `YouTube Track (${youtubeId})`,
      bpm,
      speed,
      offsetMs,
      timeSignature,
      subdivision,
      countIn: countdownMode !== 'off',
      countInBars: countdownMode === '2_bars' ? 2 : 1,
      songStartTimeSec,
      pickupBeats,
      muteBeforeStart,
    };

    let updated: SongConfig[];
    if (existingIndex >= 0) {
      updated = [...savedSongs];
      updated[existingIndex] = newConfig;
    } else {
      updated = [newConfig, ...savedSongs];
    }

    setSavedSongs(updated);
    try {
      localStorage.setItem(STORAGE_SAVED_SONGS_KEY, JSON.stringify(updated));
    } catch {
      // ignore
    }
  };

  const handleDeleteSavedSong = (id: string) => {
    const updated = savedSongs.filter((s) => s.youtubeId !== id);
    setSavedSongs(updated);
    try {
      localStorage.setItem(STORAGE_SAVED_SONGS_KEY, JSON.stringify(updated));
    } catch {
      // ignore
    }
  };

  const isCurrentSaved = savedSongs.some((s) => s.youtubeId === youtubeId);

  return (
    <div className="min-h-screen bg-neutral-950 text-neutral-100 flex flex-col font-sans">
      {/* 1. Header (3-zone Top Bar Contract) */}
      <Header
        onOpenPresets={() => setIsPresetsOpen(true)}
        onOpenSettings={() => setIsAudioSettingsOpen(true)}
        onOpenSaved={() => setIsPresetsOpen(true)}
        savedCount={savedSongs.length}
      />

      {/* 2. Main Workspace */}
      <main className="flex-1 max-w-7xl w-full mx-auto p-4 sm:p-6 lg:p-8 flex flex-col gap-6">
        {/* Top: URL input bar */}
        <YouTubeInputBar
          currentUrl={youtubeUrl}
          onLoadUrl={(url, newId) => {
            setYoutubeUrl(url);
            setYoutubeId(newId);
            setSongTitle(`YouTube Track (${newId})`);
            lastScheduledIndexRef.current = -1;
          }}
          onSaveCurrentSong={handleSaveCurrentSong}
          isCurrentSaved={isCurrentSaved}
          songTitle={songTitle}
          onUpdateTitle={setSongTitle}
        />

        {/* Essential: Audio Start & Pickup Beat (못갖춘마디) Alignment Panel */}
        <SongAudioSyncPanel
          currentTime={currentTime}
          songStartTimeSec={songStartTimeSec}
          onSongStartTimeChange={(sec) => {
            setSongStartTimeSec(sec);
            lastScheduledIndexRef.current = -1;
          }}
          pickupBeats={pickupBeats}
          onPickupBeatsChange={(b) => {
            setPickupBeats(b);
            lastScheduledIndexRef.current = -1;
          }}
          muteBeforeStart={muteBeforeStart}
          onToggleMuteBeforeStart={() => setMuteBeforeStart(!muteBeforeStart)}
          onSeek={handleSeek}
          songTitle={songTitle}
          youtubeId={youtubeId}
          onApplyAnalysis={handleApplyAnalysis}
          timeSignature={timeSignature}
        />

        {/* Central Split Layout: Video & Visualizer (Left) vs Controller (Right) */}
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
          {/* Left Column (5 cols on lg): Video Player + Visual Metronome */}
          <div className="lg:col-span-5 flex flex-col gap-4">
            <YouTubeView
              videoId={youtubeId}
              playbackSpeed={speed}
              onTimeUpdate={handleTimeUpdate}
              onStateChange={(playing) => setIsPlaying(playing)}
              playerRefCallback={(controls) => {
                ytControlsRef.current = controls;
              }}
              loopSettings={loopSettings}
              onLoopTrigger={handleLoopTrigger}
              youtubeVolume={youtubeVolume}
              isMuted={false}
            />

            {/* Visual Beat & Pendulum Monitor */}
            <VisualMetronome
              currentBeat={currentBeat}
              totalBeats={timeSignature.beats}
              subdivision={subdivision}
              currentSubdivision={currentSubdivision}
              isPlaying={isPlaying}
              phase={beatPhase}
              effectiveBpm={bpm * speed}
              isWaitingForStart={isWaitingForStart}
              timeUntilStartSec={Math.max(0, songStartTimeSec - currentTime)}
              isPickupBeat={isPickupBeat}
            />

            {/* A-B Loop Section */}
            <PracticeLoopBar
              currentTime={currentTime}
              duration={duration}
              loopSettings={loopSettings}
              onUpdateLoopSettings={(newSettings) =>
                setLoopSettings((prev) => ({ ...prev, ...newSettings }))
              }
              onSeek={handleSeek}
            />
          </div>

          {/* Right Column (7 cols on lg): Precision Metronome Controller */}
          <div className="lg:col-span-7 flex flex-col gap-4">
            <MetronomeController
              bpm={bpm}
              onBpmChange={(newBpm) => {
                setBpm(newBpm);
                lastScheduledIndexRef.current = -1;
              }}
              speed={speed}
              onSpeedChange={(newSpeed) => {
                setSpeed(newSpeed);
                lastScheduledIndexRef.current = -1;
              }}
              offsetMs={offsetMs}
              onOffsetChange={(newOffset) => {
                setOffsetMs(newOffset);
                lastScheduledIndexRef.current = -1;
              }}
              timeSignature={timeSignature}
              onTimeSignatureChange={(ts) => {
                setTimeSignature(ts);
                lastScheduledIndexRef.current = -1;
              }}
              subdivision={subdivision}
              onSubdivisionChange={setSubdivision}
              isPlaying={isPlaying}
              onTogglePlay={handleTogglePlay}
              onRestart={handleRestart}
              isMetronomeMuted={isMetronomeMuted}
              onToggleMetronomeMute={() => setIsMetronomeMuted(!isMetronomeMuted)}
              onTapDownbeat={handleTapDownbeat}
              countdownMode={countdownMode}
              onCountdownModeChange={setCountdownMode}
            />

            {/* Quick Practice Hotkey & Musician Guide */}
            <div className="p-4 bg-neutral-900/60 border border-neutral-800 rounded-xl text-xs space-y-2 text-neutral-400">
              <div className="flex items-center justify-between text-neutral-200 font-semibold">
                <div className="flex items-center gap-2">
                  <HelpCircle className="w-4 h-4 text-amber-400" />
                  <span>실전 악기 연습 편의 기능</span>
                </div>
                <span className="text-[11px] font-mono text-neutral-400">
                  단축키: <kbd className="px-1.5 py-0.5 bg-neutral-800 rounded text-amber-300">Space</kbd> 재생/정지
                </span>
              </div>
              <ul className="space-y-1.5 text-[11px] text-neutral-400 leading-relaxed pl-1">
                <li>
                  <strong className="text-neutral-200">악기 파지 준비 카운트다운</strong>: 상단{' '}
                  <span className="text-amber-300 font-medium">[준비 카운트: 1마디 또는 2마디]</span>를 설정하면 재생 버튼 클릭 후 메트로놈 소리와 함께 큰 화면으로 카운트다운(1-2-3-4)이 진행되어 악기를 편안하게 쥐고 자세를 잡을 수 있습니다.
                </li>
                <li>
                  <strong className="text-neutral-200">스페이스바(Space) 지원</strong>: 마우스를 만질 필요 없이 발 페달이나 손가락 하나로 스페이스바를 눌러 즉시 시작/정지할 수 있습니다.
                </li>
              </ul>
            </div>
          </div>
        </div>
      </main>

      {/* 3. Footer */}
      <footer className="border-t border-neutral-800/80 bg-neutral-950 py-4 px-6 text-center text-xs text-neutral-500">
        <div className="flex items-center justify-center gap-3">
          <span>SyncBeat · 유튜브 음원 동기화 & 준비 카운트다운 메트로놈</span>
          <span aria-hidden="true">·</span>
          <span>Web Audio API 기반 0-지연 정밀 합성 엔진</span>
        </div>
      </footer>

      {/* Full-screen Auditory & Visual Countdown Overlay */}
      {isCountingDown && (
        <CountdownOverlay
          currentCount={countdownCurrent}
          totalCounts={countdownTotal}
          isGo={isGo}
          onCancel={handleCancelCountdown}
          bpm={bpm}
          effectiveBpm={bpm * speed}
          countdownLabel={
            countdownMode === '3_sec'
              ? '3초 후 시작됩니다!'
              : countdownMode === '2_bars'
              ? '2마디(8박) 준비 카운트 중입니다!'
              : '1마디(4박) 준비 카운트 중입니다!'
          }
        />
      )}

      {/* Modals */}
      <AudioSettingsModal
        isOpen={isAudioSettingsOpen}
        onClose={() => setIsAudioSettingsOpen(false)}
        soundType={soundType}
        onSoundTypeChange={setSoundType}
        metronomeVolume={metronomeVolume}
        onMetronomeVolumeChange={setMetronomeVolume}
        youtubeVolume={youtubeVolume}
        onYoutubeVolumeChange={setYoutubeVolume}
        pan={pan}
        onPanChange={setPan}
        bluetoothLatencyMs={bluetoothLatencyMs}
        onBluetoothLatencyChange={setBluetoothLatencyMs}
      />

      <PresetLibraryModal
        isOpen={isPresetsOpen}
        onClose={() => setIsPresetsOpen(false)}
        onSelectSong={handleSelectSong}
        savedSongs={savedSongs}
        onDeleteSavedSong={handleDeleteSavedSong}
        currentVideoId={youtubeId}
      />
    </div>
  );
}
