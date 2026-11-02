import React from 'react';
import { X, Volume2, Headphones, Radio, Play } from 'lucide-react';
import { SoundType } from '../types/metronome';
import { audioEngine } from '../utils/audioEngine';

interface AudioSettingsModalProps {
  isOpen: boolean;
  onClose: () => void;
  soundType: SoundType;
  onSoundTypeChange: (type: SoundType) => void;
  metronomeVolume: number;
  onMetronomeVolumeChange: (vol: number) => void;
  youtubeVolume: number;
  onYoutubeVolumeChange: (vol: number) => void;
  pan: number;
  onPanChange: (pan: number) => void;
  bluetoothLatencyMs: number;
  onBluetoothLatencyChange: (ms: number) => void;
}

const SOUND_OPTIONS: Array<{ id: SoundType; name: string; desc: string }> = [
  { id: 'woodblock', name: '우드블록 (Woodblock)', desc: '클래식하고 따뜻한 천연 원목 타격음' },
  { id: 'digital', name: '디지털 클릭 (Digital Click)', desc: '음악 소리를 뚫고 나오는 또렷한 고주파 피치' },
  { id: 'rimshot', name: '드럼 림샷 (Rimshot)', desc: '스튜디오 크로스 스틱 어쿠스틱 타격음' },
  { id: 'hihat', name: '하이햇 (Hi-Hat)', desc: '경쾌하고 샤프한 클로즈드 하이햇 사운드' },
  { id: 'cowbell', name: '카우벨 (808 Cowbell)', desc: '묵직하고 펀치감 있는 808 아날로그 카우벨' },
];

export const AudioSettingsModal: React.FC<AudioSettingsModalProps> = ({
  isOpen,
  onClose,
  soundType,
  onSoundTypeChange,
  metronomeVolume,
  onMetronomeVolumeChange,
  youtubeVolume,
  onYoutubeVolumeChange,
  pan,
  onPanChange,
  bluetoothLatencyMs,
  onBluetoothLatencyChange,
}) => {
  if (!isOpen) return null;

  const handleTestSound = (type: SoundType) => {
    const prev = audioEngine.getSoundType();
    audioEngine.setSoundType(type);
    audioEngine.playClick(undefined, true);
    setTimeout(() => {
      audioEngine.playClick(undefined, false);
    }, 180);
    audioEngine.setSoundType(prev);
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/70 backdrop-blur-sm">
      <div className="w-full max-w-lg bg-neutral-900 border border-neutral-800 rounded-xl shadow-2xl overflow-hidden flex flex-col max-h-[90vh]">
        {/* Modal Header */}
        <div className="flex items-center justify-between px-5 py-4 border-b border-neutral-800">
          <div className="flex items-center gap-2">
            <Headphones className="w-4 h-4 text-amber-400" />
            <h3 className="text-sm font-bold text-white">오디오 믹서 & 싱크 설정</h3>
          </div>
          <button
            onClick={onClose}
            className="p-1 rounded-lg text-neutral-400 hover:text-white hover:bg-neutral-800 transition-colors cursor-pointer"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Modal Body */}
        <div className="p-5 overflow-y-auto space-y-5 text-xs">
          {/* 1. Metronome Sound Select */}
          <div>
            <label className="font-semibold text-neutral-200 block mb-2">메트로놈 사운드 선택</label>
            <div className="space-y-1.5">
              {SOUND_OPTIONS.map((opt) => (
                <div
                  key={opt.id}
                  onClick={() => onSoundTypeChange(opt.id)}
                  className={`p-3 rounded-lg border transition-all cursor-pointer flex items-center justify-between ${
                    soundType === opt.id
                      ? 'bg-amber-500/10 border-amber-500/40 text-white'
                      : 'bg-neutral-950/70 border-neutral-800 text-neutral-300 hover:border-neutral-700'
                  }`}
                >
                  <div className="flex flex-col">
                    <span className="font-medium text-xs">{opt.name}</span>
                    <span className="text-[11px] text-neutral-400">{opt.desc}</span>
                  </div>
                  <button
                    onClick={(e) => {
                      e.stopPropagation();
                      handleTestSound(opt.id);
                    }}
                    className="p-1.5 rounded bg-neutral-800 hover:bg-neutral-700 text-neutral-300 transition-colors"
                    title="소리 미리듣기"
                  >
                    <Play className="w-3 h-3 fill-current ml-0.5" />
                  </button>
                </div>
              ))}
            </div>
          </div>

          {/* 2. Volume Balance */}
          <div className="p-4 bg-neutral-950/80 rounded-lg border border-neutral-800 space-y-3">
            <h4 className="font-semibold text-neutral-200">볼륨 밸런스</h4>

            <div>
              <div className="flex justify-between text-[11px] mb-1">
                <span className="text-neutral-400">메트로놈 음량</span>
                <span className="font-mono text-amber-400">{Math.round(metronomeVolume * 100)}%</span>
              </div>
              <input
                type="range"
                min="0"
                max="1"
                step="0.05"
                value={metronomeVolume}
                onChange={(e) => onMetronomeVolumeChange(parseFloat(e.target.value))}
                className="w-full accent-amber-400 h-1.5 bg-neutral-800 rounded cursor-pointer"
              />
            </div>

            <div>
              <div className="flex justify-between text-[11px] mb-1">
                <span className="text-neutral-400">유튜브 음악 음량</span>
                <span className="font-mono text-neutral-300">{Math.round(youtubeVolume)}%</span>
              </div>
              <input
                type="range"
                min="0"
                max="100"
                step="5"
                value={youtubeVolume}
                onChange={(e) => onYoutubeVolumeChange(parseFloat(e.target.value))}
                className="w-full accent-amber-400 h-1.5 bg-neutral-800 rounded cursor-pointer"
              />
            </div>
          </div>

          {/* 3. Stereo Panning */}
          <div className="p-4 bg-neutral-950/80 rounded-lg border border-neutral-800 space-y-2">
            <div className="flex justify-between text-[11px]">
              <span className="font-semibold text-neutral-200">메트로놈 팬 (좌/우 정위)</span>
              <span className="font-mono text-neutral-400">
                {pan === 0 ? '가운데 (Center)' : pan < 0 ? `왼쪽 L ${Math.round(Math.abs(pan) * 100)}%` : `오른쪽 R ${Math.round(pan * 100)}%`}
              </span>
            </div>
            <p className="text-[11px] text-neutral-400">
              이어폰 착용 시 메트로놈을 한쪽 귀에만 몰아주어 악기 소리를 편하게 모니터링할 수 있습니다.
            </p>
            <div className="flex items-center gap-2 pt-1">
              <span className="text-[10px] font-mono text-neutral-500">L</span>
              <input
                type="range"
                min="-1"
                max="1"
                step="0.1"
                value={pan}
                onChange={(e) => onPanChange(parseFloat(e.target.value))}
                className="w-full accent-amber-400 h-1.5 bg-neutral-800 rounded cursor-pointer"
              />
              <span className="text-[10px] font-mono text-neutral-500">R</span>
            </div>
          </div>

          {/* 4. Bluetooth Latency Compensation */}
          <div className="p-4 bg-neutral-950/80 rounded-lg border border-neutral-800 space-y-2">
            <div className="flex justify-between text-[11px]">
              <span className="font-semibold text-neutral-200">블루투스 음향 딜레이 보정</span>
              <span className="font-mono text-amber-400 font-semibold">{bluetoothLatencyMs} ms</span>
            </div>
            <p className="text-[11px] text-neutral-400">
              무선 이어폰(에어팟, 버즈) 특유의 전송 지연을 상쇄합니다.
            </p>
            <div className="flex items-center gap-1.5 pt-1">
              <button
                onClick={() => onBluetoothLatencyChange(0)}
                className={`flex-1 py-1 text-center rounded border text-[11px] cursor-pointer ${
                  bluetoothLatencyMs === 0 ? 'bg-amber-400 text-neutral-950 font-bold border-amber-300' : 'bg-neutral-900 border-neutral-800 text-neutral-400'
                }`}
              >
                유선 (0ms)
              </button>
              <button
                onClick={() => onBluetoothLatencyChange(120)}
                className={`flex-1 py-1 text-center rounded border text-[11px] cursor-pointer ${
                  bluetoothLatencyMs === 120 ? 'bg-amber-400 text-neutral-950 font-bold border-amber-300' : 'bg-neutral-900 border-neutral-800 text-neutral-400'
                }`}
              >
                무선 표준 (+120ms)
              </button>
              <button
                onClick={() => onBluetoothLatencyChange(180)}
                className={`flex-1 py-1 text-center rounded border text-[11px] cursor-pointer ${
                  bluetoothLatencyMs === 180 ? 'bg-amber-400 text-neutral-950 font-bold border-amber-300' : 'bg-neutral-900 border-neutral-800 text-neutral-400'
                }`}
              >
                무선 지연 (+180ms)
              </button>
            </div>
          </div>
        </div>

        {/* Modal Footer */}
        <div className="px-5 py-3 border-t border-neutral-800 bg-neutral-950 flex justify-end">
          <button
            onClick={onClose}
            className="px-4 py-2 text-xs font-semibold rounded-lg bg-white text-neutral-900 hover:bg-neutral-200 transition-colors cursor-pointer"
          >
            설정 완료
          </button>
        </div>
      </div>
    </div>
  );
};
