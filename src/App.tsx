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
import {
  SongConfig,
  SoundType,
  LoopSettings,
  Subdivision,
  SongAnalysisResult,
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
  const [countIn, setCountIn] = useState<boolean>(false);

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
  const [isCountingIn, setIsCountingIn] = useState<boolean>(false);
  const [countInBeat, setCountInBeat] = useState<number>(1);

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

          // e.g. In 4/4 with 1 pickup beat: enters on beat 4
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
        // Only click if forward progression (not huge backward seeks)
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

  // Play / Pause Master
  const handleTogglePlay = () => {
    if (isPlaying) {
      if (ytControlsRef.current) {
        ytControlsRef.current.pause();
      }
      setIsPlaying(false);
      setIsCountingIn(false);
    } else {
      if (countIn) {
        setIsCountingIn(true);
        let count = 1;
        setCountInBeat(1);
        const beatMs = (60 / (bpm * speed)) * 1000;

        audioEngine.playClick(undefined, true, false);

        const countInterval = window.setInterval(() => {
          count++;
          if (count <= timeSignature.beats) {
            setCountInBeat(count);
            audioEngine.playClick(undefined, false, false);
          } else {
            clearInterval(countInterval);
            setIsCountingIn(false);
            if (ytControlsRef.current) {
              ytControlsRef.current.play();
            }
          }
        }, beatMs);
      } else {
        if (ytControlsRef.current) {
          ytControlsRef.current.play();
        }
      }
    }
  };

  const handleRestart = () => {
    lastScheduledIndexRef.current = -1;
    lastSubIndexRef.current = -1;
    const start = loopSettings.enabled ? loopSettings.startTime : 0;
    if (ytControlsRef.current) {
      ytControlsRef.current.seekTo(start);
      ytControlsRef.current.play();
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
      // Current playhead is the downbeat (Beat 1)
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
      countIn,
      countInBars: 1,
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

        {/* Count-in Overlay if active */}
        {isCountingIn && (
          <div className="p-4 bg-amber-500/20 border border-amber-500/40 rounded-xl flex items-center justify-between animate-pulse">
            <span className="text-sm font-bold text-amber-300">
              연습 시작 전 예비박 카운트다운 진행 중...
            </span>
            <div className="font-mono text-2xl font-black text-amber-300 px-4 py-1 bg-amber-950/80 rounded-lg border border-amber-500/40">
              {countInBeat} / {timeSignature.beats}
            </div>
          </div>
        )}

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
              countIn={countIn}
              onToggleCountIn={() => setCountIn(!countIn)}
            />

            {/* Quick Sync & Practice Tips Guide */}
            <div className="p-4 bg-neutral-900/60 border border-neutral-800 rounded-xl text-xs space-y-2 text-neutral-400">
              <div className="flex items-center gap-2 text-neutral-200 font-semibold">
                <HelpCircle className="w-4 h-4 text-amber-400" />
                <span>예비박(못갖춘마디) 곡을 맞추는 핵심 가이드</span>
              </div>
              <ol className="list-decimal list-inside space-y-1.5 text-[11px] text-neutral-400 leading-relaxed pl-1">
                <li>
                  <strong className="text-neutral-200">1. 예비박 형태 설정</strong>: 마디 시작 전 몇 박자가 먼저 시작되는지{' '}
                  <span className="text-amber-300 font-medium">[1박 예비박]</span>(가장 흔한 4박 진입) 또는{' '}
                  <span className="text-amber-300 font-medium">[2박 예비박]</span>을 클릭하세요.
                </li>
                <li>
                  <strong className="text-neutral-200">2. 소리 시작점 스냅</strong>: 노래 첫 음이 들리는 순간{' '}
                  <span className="text-amber-300 font-medium">[지금 위치를 시작점으로 지정]</span>을 누르면 영상 오프닝 묵음 동안 메트로놈이 울리지 않고 정밀하게 대기합니다.
                </li>
                <li>
                  <strong className="text-neutral-200">3. AI 곡 분석 활용</strong>: 상단의{' '}
                  <span className="text-amber-300 font-medium">[곡 템포 & 예비박 AI 계산]</span> 버튼을 누르면 AI가 곡의 원곡 BPM과 예비박 구조를 자동 탐지해 한 번에 맞춰줍니다.
                </li>
              </ol>
            </div>
          </div>
        </div>
      </main>

      {/* 3. Footer */}
      <footer className="border-t border-neutral-800/80 bg-neutral-950 py-4 px-6 text-center text-xs text-neutral-500">
        <div className="flex items-center justify-center gap-3">
          <span>SyncBeat · 유튜브 음원 동기화 & 못갖춘마디 예비박 메트로놈</span>
          <span aria-hidden="true">·</span>
          <span>Web Audio API 기반 0-지연 정밀 합성 엔진</span>
        </div>
      </footer>

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
