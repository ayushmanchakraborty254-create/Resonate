export interface Track {
  id: string; // YouTube Video ID
  title: string;
  artist: string;
  album?: string;
  duration: number; // in seconds
  thumbnailUrl: string;
  youtubeUrl: string;
  lyrics?: string;
}

export interface Playlist {
  id: string;
  name: string;
  description?: string;
  tracks: Track[];
  createdAt: string;
}

export interface PlaybackState {
  currentTrack: Track | null;
  isPlaying: boolean;
  progress: number; // current time in seconds
  volume: number; // 0 to 1
  queue: Track[];
  currentIndex: number;
  isShuffle: boolean;
  isRepeat: 'none' | 'one' | 'all';
}
