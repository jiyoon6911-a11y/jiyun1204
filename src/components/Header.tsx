import React from 'react';
import { Volume2, Music, Bookmark, Sliders } from 'lucide-react';

interface HeaderProps {
  onOpenPresets: () => void;
  onOpenSettings: () => void;
  onOpenSaved: () => void;
  savedCount: number;
}

export const Header: React.FC<HeaderProps> = ({
  onOpenPresets,
  onOpenSettings,
  onOpenSaved,
  savedCount,
}) => {
  return (
    <header className="flex items-center justify-between gap-8 px-6 py-3.5 border-b border-neutral-800/80 bg-neutral-950/90 backdrop-blur sticky top-0 z-40">
      {/* Zone 1: Single text element wordmark */}
      <div className="flex items-center gap-2.5 whitespace-nowrap shrink-0">
        <div className="w-8 h-8 rounded-lg bg-amber-500/10 border border-amber-500/30 flex items-center justify-center text-amber-400">
          <Music className="w-4 h-4" />
        </div>
        <div className="flex flex-col">
          <span className="text-base font-bold tracking-tight text-white">SyncBeat</span>
        </div>
      </div>

      {/* Zone 2: 4 clean single-line nav links / quick tools */}
      <nav className="hidden md:flex items-center gap-6 text-xs font-medium text-neutral-400">
        <button
          onClick={onOpenPresets}
          className="hover:text-neutral-100 transition-colors whitespace-nowrap shrink-0 flex items-center gap-1.5 cursor-pointer"
        >
          <span>추천 연습곡</span>
        </button>
        <button
          onClick={onOpenSaved}
          className="hover:text-neutral-100 transition-colors whitespace-nowrap shrink-0 flex items-center gap-1.5 cursor-pointer"
        >
          <span>보관함 ({savedCount})</span>
        </button>
        <button
          onClick={onOpenSettings}
          className="hover:text-neutral-100 transition-colors whitespace-nowrap shrink-0 flex items-center gap-1.5 cursor-pointer"
        >
          <span>오디오 & 싱크 설정</span>
        </button>
      </nav>

      {/* Zone 3: 1 primary action */}
      <div className="flex items-center gap-2.5 shrink-0">
        <button
          onClick={onOpenPresets}
          className="px-3.5 py-1.5 text-xs font-semibold text-neutral-900 bg-amber-400 hover:bg-amber-300 rounded-lg transition-colors whitespace-nowrap shrink-0 flex items-center gap-1.5 cursor-pointer shadow-sm shadow-amber-950"
        >
          <Music className="w-3.5 h-3.5" />
          <span>곡 불러오기</span>
        </button>
      </div>
    </header>
  );
};
