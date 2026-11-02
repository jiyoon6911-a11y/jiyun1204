import React, { useState } from 'react';
import { Youtube, ArrowRight, Bookmark, BookmarkCheck, Sparkles } from 'lucide-react';
import { extractYouTubeId } from '../utils/youtubeHelper';

interface YouTubeInputBarProps {
  currentUrl: string;
  onLoadUrl: (url: string, newId: string) => void;
  onSaveCurrentSong: () => void;
  isCurrentSaved: boolean;
  songTitle: string;
  onUpdateTitle: (title: string) => void;
}

export const YouTubeInputBar: React.FC<YouTubeInputBarProps> = ({
  currentUrl,
  onLoadUrl,
  onSaveCurrentSong,
  isCurrentSaved,
  songTitle,
  onUpdateTitle,
}) => {
  const [inputVal, setInputVal] = useState(currentUrl);
  const [errorMsg, setErrorMsg] = useState('');

  const handleSubmit = (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    setErrorMsg('');
    const id = extractYouTubeId(inputVal);
    if (!id) {
      setErrorMsg('유효한 유튜브 링크 또는 동영상 ID를 입력해 주세요.');
      return;
    }
    onLoadUrl(inputVal, id);
  };

  return (
    <div className="bg-neutral-900/90 border border-neutral-800 rounded-xl p-4 flex flex-col gap-3">
      <form onSubmit={handleSubmit} className="flex flex-col sm:flex-row items-stretch sm:items-center gap-2">
        <div className="relative flex-1">
          <div className="absolute left-3 top-1/2 -translate-y-1/2 text-neutral-500 flex items-center gap-1.5 pointer-events-none">
            <Youtube className="w-4 h-4 text-red-500" />
          </div>
          <input
            type="text"
            placeholder="유튜브 링크 입력 (예: https://www.youtube.com/watch?v=... 또는 youtu.be/...)"
            value={inputVal}
            onChange={(e) => {
              setInputVal(e.target.value);
              if (errorMsg) setErrorMsg('');
            }}
            className="w-full bg-neutral-950 border border-neutral-800 rounded-lg pl-9 pr-3 py-2 text-xs text-neutral-100 placeholder-neutral-500 focus:outline-none focus:border-amber-400 font-mono"
          />
        </div>

        <div className="flex items-center gap-2 shrink-0">
          <button
            type="submit"
            className="flex-1 sm:flex-none px-4 py-2 text-xs font-semibold text-neutral-900 bg-amber-400 hover:bg-amber-300 rounded-lg transition-colors cursor-pointer flex items-center justify-center gap-1.5"
          >
            <span>음원 로드</span>
            <ArrowRight className="w-3.5 h-3.5" />
          </button>

          <button
            type="button"
            onClick={onSaveCurrentSong}
            className={`px-3 py-2 text-xs font-medium rounded-lg border transition-colors flex items-center gap-1.5 cursor-pointer ${
              isCurrentSaved
                ? 'bg-amber-500/10 border-amber-500/40 text-amber-300'
                : 'bg-neutral-950 border-neutral-800 text-neutral-300 hover:text-white'
            }`}
            title="현재 곡과 BPM/오프셋 설정을 보관함에 저장"
          >
            {isCurrentSaved ? (
              <>
                <BookmarkCheck className="w-3.5 h-3.5 text-amber-400" />
                <span className="hidden sm:inline">저장됨</span>
              </>
            ) : (
              <>
                <Bookmark className="w-3.5 h-3.5" />
                <span className="hidden sm:inline">보관함 저장</span>
              </>
            )}
          </button>
        </div>
      </form>

      {errorMsg && (
        <div className="text-[11px] text-red-400 pl-1">
          {errorMsg}
        </div>
      )}

      {/* Editable Song Title Bar */}
      <div className="flex items-center justify-between text-xs pt-1 border-t border-neutral-800/60">
        <div className="flex items-center gap-2 flex-1 mr-2">
          <span className="text-neutral-500 text-[11px] shrink-0">곡 제목:</span>
          <input
            type="text"
            value={songTitle}
            onChange={(e) => onUpdateTitle(e.target.value)}
            placeholder="연습곡 제목을 입력하세요"
            className="bg-transparent border-b border-transparent hover:border-neutral-700 focus:border-amber-400 text-neutral-200 text-xs py-0.5 px-1 focus:outline-none flex-1 truncate font-medium"
          />
        </div>
      </div>
    </div>
  );
};
