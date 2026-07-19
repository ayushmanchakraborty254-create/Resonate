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

export interface UnifiedTrack {
  id: string; // unique identifier (e.g. "sp:123", "yt:abc")
  title: string;
  artist: string;
  album?: string;
  duration: number; // in seconds
  thumbnailUrl: string;
  source: 'youtube' | 'spotify' | 'applemusic';
  externalUrl?: string;
  isrc?: string;
  availableSources: string[]; // List of available source IDs
}

export interface UnifiedPlaylist {
  id: string;
  name: string;
  description?: string;
  tracks: UnifiedTrack[];
  source: 'youtube' | 'spotify' | 'applemusic' | 'unified';
  createdAt: string;
  thumbnailUrl?: string;
  checksum?: string;
  isMusic?: boolean;
}
