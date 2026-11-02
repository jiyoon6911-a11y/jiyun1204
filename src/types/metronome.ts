export type SoundType = 'woodblock' | 'digital' | 'rimshot' | 'hihat' | 'cowbell';

export type TimeSignature = {
  beats: number;
  noteValue: number;
  label: string;
};

export type Subdivision = 1 | 2 | 3 | 4; // 1 = Quarter, 2 = 8th, 3 = Triplet, 4 = 16th

export type PickupType = 'none' | '1_beat' | '2_beat' | '3_beat' | 'half_beat' | 'custom';

export interface PracticePreset {
  id: string;
  title: string;
  artist: string;
  genre: string;
  youtubeId: string;
  defaultBpm: number;
  defaultOffsetMs: number;
  timeSignature: { beats: number; noteValue: number };
  description: string;
  suggestedSpeed?: number;
  pickupBeats?: number;
  audioStartSec?: number;
}

export interface SongConfig {
  youtubeId: string;
  youtubeUrl: string;
  title: string;
  bpm: number;
  speed: number; // 0.5 to 2.0
  offsetMs: number; // Fine nudge phase alignment in milliseconds
  timeSignature: { beats: number; noteValue: number };
  subdivision: Subdivision;
  countIn: boolean; // 1 measure count-in
  countInBars: number;
  // Audio start & pickup beat
  songStartTimeSec: number; // Exact timestamp in seconds when the song audio begins
  pickupBeats: number; // 0 = downbeat, 1 = 1-beat pickup (enters on beat 4), etc.
  muteBeforeStart: boolean; // Keep metronome silent until songStartTimeSec
}

export interface LoopSettings {
  enabled: boolean;
  startTime: number;
  endTime: number;
  autoIncrementSpeed: boolean;
  speedStep: number;
  loopCount: number;
  maxSpeed: number;
}

export interface SongAnalysisResult {
  success: boolean;
  title?: string;
  artist?: string;
  bpm: number;
  timeSignature: { beats: number; noteValue: number };
  hasPickupBeat: boolean;
  pickupBeatsCount: number;
  estimatedStartTimeSec: number;
  rhythmFeel: string;
  analysisSummary: string;
}
