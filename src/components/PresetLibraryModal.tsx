import React, { useState } from 'react';
import { X, Search, Music, Play, Trash2, Check } from 'lucide-react';
import { PRACTICE_PRESETS } from '../constants/presets';
import { PracticePreset, SongConfig } from '../types/metronome';
import { getYouTubeThumbnail } from '../utils/youtubeHelper';

interface PresetLibraryModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSelectSong: (preset: {
    youtubeId: string;
    youtubeUrl: string;
    title: string;
    bpm: number;
    offsetMs: number;
    timeSignature: { beats: number; noteValue: number };
    pickupBeats?: number;
    audioStartSec?: number;
    songStartTimeSec?: number;
  }) => void;
  savedSongs: SongConfig[];
  onDeleteSavedSong: (id: string) => void;
  currentVideoId: string;
}

export const PresetLibraryModal: React.FC<PresetLibraryModalProps> = ({
  isOpen,
  onClose,
  onSelectSong,
  savedSongs,
  onDeleteSavedSong,
  currentVideoId,
}) => {
  const [activeTab, setActiveTab] = useState<'presets' | 'saved'>('presets');
  const [searchQuery, setSearchQuery] = useState('');

  if (!isOpen) return null;

  const filteredPresets = PRACTICE_PRESETS.filter(
    (p) =>
      p.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
      p.artist.toLowerCase().includes(searchQuery.toLowerCase()) ||
      p.genre.toLowerCase().includes(searchQuery.toLowerCase())
  );

  const filteredSaved = savedSongs.filter(
    (s) =>
      s.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
      s.youtubeId.toLowerCase().includes(searchQuery.toLowerCase())
  );

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/75 backdrop-blur-sm">
      <div className="w-full max-w-2xl bg-neutral-900 border border-neutral-800 rounded-xl shadow-2xl overflow-hidden flex flex-col max-h-[85vh]">
        {/* Header */}
        <div className="p-4 border-b border-neutral-800 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Music className="w-4 h-4 text-amber-400" />
            <h3 className="text-sm font-bold text-white">음악 & 연습곡 선택</h3>
          </div>
          <button
            onClick={onClose}
            className="p-1 rounded-lg text-neutral-400 hover:text-white hover:bg-neutral-800 transition-colors cursor-pointer"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Tab & Search */}
        <div className="p-4 border-b border-neutral-800/80 bg-neutral-950/50 flex flex-col sm:flex-row gap-3">
          {/* Tabs */}
          <div className="flex items-center gap-1 p-1 bg-neutral-900 rounded-lg border border-neutral-800 shrink-0">
            <button
              onClick={() => setActiveTab('presets')}
              className={`px-3 py-1.5 text-xs font-semibold rounded-md transition-colors cursor-pointer ${
                activeTab === 'presets'
                  ? 'bg-neutral-100 text-neutral-950 shadow-sm'
                  : 'text-neutral-400 hover:text-neutral-200'
              }`}
            >
              검증된 추천곡 ({PRACTICE_PRESETS.length})
            </button>
            <button
              onClick={() => setActiveTab('saved')}
              className={`px-3 py-1.5 text-xs font-semibold rounded-md transition-colors cursor-pointer ${
                activeTab === 'saved'
                  ? 'bg-neutral-100 text-neutral-950 shadow-sm'
                  : 'text-neutral-400 hover:text-neutral-200'
              }`}
            >
              내 보관함 ({savedSongs.length})
            </button>
          </div>

          {/* Search Input */}
          <div className="relative flex-1">
            <Search className="w-3.5 h-3.5 absolute left-3 top-1/2 -translate-y-1/2 text-neutral-500" />
            <input
              type="text"
              placeholder="곡명, 아티스트, 장르 검색..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full bg-neutral-900 border border-neutral-800 rounded-lg pl-9 pr-3 py-1.5 text-xs text-neutral-100 placeholder-neutral-500 focus:outline-none focus:border-amber-400"
            />
          </div>
        </div>

        {/* List Content */}
        <div className="p-4 overflow-y-auto space-y-3 flex-1">
          {activeTab === 'presets' ? (
            filteredPresets.length === 0 ? (
              <div className="py-12 text-center text-xs text-neutral-500">
                검색된 추천곡이 없습니다.
              </div>
            ) : (
              filteredPresets.map((preset) => {
                const isCurrent = currentVideoId === preset.youtubeId;
                return (
                  <div
                    key={preset.id}
                    className={`p-3 rounded-lg border transition-all flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 ${
                      isCurrent
                        ? 'bg-amber-500/10 border-amber-500/40'
                        : 'bg-neutral-950/70 border-neutral-800 hover:border-neutral-700'
                    }`}
                  >
                    <div className="flex items-center gap-3">
                      <img
                        src={getYouTubeThumbnail(preset.youtubeId)}
                        alt={preset.title}
                        className="w-16 h-12 object-cover rounded bg-neutral-800 shrink-0"
                        referrerPolicy="no-referrer"
                      />
                      <div className="flex flex-col">
                        <span className="font-bold text-xs text-white leading-tight">
                          {preset.title}
                        </span>
                        <div className="flex items-center gap-1.5 text-[11px] text-neutral-400 mt-0.5">
                          <span>{preset.artist}</span>
                          <span aria-hidden="true">·</span>
                          <span className="text-amber-400/90 font-mono font-medium">
                            {preset.defaultBpm} BPM
                          </span>
                          <span aria-hidden="true">·</span>
                          <span>
                            {preset.timeSignature.beats}/{preset.timeSignature.noteValue}
                          </span>
                        </div>
                        <span className="text-[10px] text-neutral-500 mt-0.5 line-clamp-1">
                          {preset.description}
                        </span>
                      </div>
                    </div>

                    <div className="shrink-0 w-full sm:w-auto flex justify-end">
                      <button
                        onClick={() => {
                          onSelectSong({
                            youtubeId: preset.youtubeId,
                            youtubeUrl: `https://www.youtube.com/watch?v=${preset.youtubeId}`,
                            title: `${preset.title} - ${preset.artist}`,
                            bpm: preset.defaultBpm,
                            offsetMs: preset.defaultOffsetMs,
                            timeSignature: preset.timeSignature,
                            pickupBeats: preset.pickupBeats,
                            audioStartSec: preset.audioStartSec,
                          });
                          onClose();
                        }}
                        className={`px-3 py-1.5 rounded-lg text-xs font-semibold flex items-center gap-1.5 cursor-pointer transition-colors ${
                          isCurrent
                            ? 'bg-amber-400 text-neutral-950'
                            : 'bg-neutral-800 hover:bg-neutral-700 text-neutral-200'
                        }`}
                      >
                        {isCurrent ? (
                          <>
                            <Check className="w-3.5 h-3.5" />
                            <span>현재 선택됨</span>
                          </>
                        ) : (
                          <>
                            <Play className="w-3 h-3 fill-current" />
                            <span>불러오기</span>
                          </>
                        )}
                      </button>
                    </div>
                  </div>
                );
              })
            )
          ) : filteredSaved.length === 0 ? (
            <div className="py-12 text-center text-xs text-neutral-500 flex flex-col items-center gap-2">
              <span>보관함에 저장된 곡이 없습니다.</span>
              <span className="text-[11px] text-neutral-600">
                메인 화면에서 곡을 설정하고 &apos;보관함 저장&apos;을 누르면 여기에 기록됩니다.
              </span>
            </div>
          ) : (
            filteredSaved.map((song) => {
              const isCurrent = currentVideoId === song.youtubeId;
              return (
                <div
                  key={song.youtubeId}
                  className={`p-3 rounded-lg border transition-all flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 ${
                    isCurrent
                      ? 'bg-amber-500/10 border-amber-500/40'
                      : 'bg-neutral-950/70 border-neutral-800 hover:border-neutral-700'
                  }`}
                >
                  <div className="flex items-center gap-3">
                    <img
                      src={getYouTubeThumbnail(song.youtubeId)}
                      alt={song.title}
                      className="w-16 h-12 object-cover rounded bg-neutral-800 shrink-0"
                      referrerPolicy="no-referrer"
                    />
                    <div className="flex flex-col">
                      <span className="font-bold text-xs text-white leading-tight">
                        {song.title}
                      </span>
                      <div className="flex items-center gap-1.5 text-[11px] text-neutral-400 mt-0.5">
                        <span className="text-amber-400/90 font-mono font-medium">
                          {song.bpm} BPM
                        </span>
                        <span aria-hidden="true">·</span>
                        <span>{song.speed}x 속도</span>
                        <span aria-hidden="true">·</span>
                        <span className="font-mono text-amber-300">
                          {song.pickupBeats ? `${song.pickupBeats}박 예비` : '정박'}
                        </span>
                        <span aria-hidden="true">·</span>
                        <span className="font-mono">
                          {song.songStartTimeSec ? `${song.songStartTimeSec}s 시작` : '0s'}
                        </span>
                      </div>
                    </div>
                  </div>

                  <div className="shrink-0 flex items-center gap-1.5 self-end sm:self-auto">
                    <button
                      onClick={() => {
                        onSelectSong(song);
                        onClose();
                      }}
                      className="px-3 py-1.5 rounded-lg text-xs font-semibold bg-neutral-800 hover:bg-neutral-700 text-neutral-200 flex items-center gap-1 cursor-pointer transition-colors"
                    >
                      <Play className="w-3 h-3 fill-current" />
                      <span>적용</span>
                    </button>
                    <button
                      onClick={() => onDeleteSavedSong(song.youtubeId)}
                      title="삭제"
                      className="p-1.5 rounded-lg text-neutral-500 hover:text-red-400 hover:bg-neutral-800 transition-colors cursor-pointer"
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                    </button>
                  </div>
                </div>
              );
            })
          )}
        </div>
      </div>
    </div>
  );
};
