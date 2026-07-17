import { useState, useEffect } from 'react';
import { Sidebar } from './components/Sidebar';
import { Navbar } from './components/Navbar';
import { PlayerBar } from './components/PlayerBar';
import { MainFeed } from './components/MainFeed';
import { LyricsAndQueue } from './components/LyricsAndQueue';
import type { Track, Playlist } from './types';
import { POPULAR_TRACKS, searchYouTube } from './utils/youtube';

// Color themes mapped to each track's visual identity to simulate Material You dynamic theme
const TRACK_THEMES: Record<string, { primary: string; glow: string; bg: string }> = {
  'kJQP7kiw5Fk': { primary: '#e53935', glow: 'rgba(229, 57, 53, 0.25)', bg: '#1a0505' }, // Despacito - Red
  '9bZkp7q19f0': { primary: '#ffb300', glow: 'rgba(255, 179, 0, 0.25)', bg: '#1c1706' }, // Gangnam Style - Yellow
  'OPf0YbXqDm0': { primary: '#3949ab', glow: 'rgba(57, 73, 171, 0.25)', bg: '#060a1c' }, // Uptown Funk - Purple/Blue
  'JGwWNGJdvx8': { primary: '#00acc1', glow: 'rgba(0, 172, 193, 0.25)', bg: '#031417' }, // Shape of You - Teal
  'fLexgOxsZu0': { primary: '#7cb342', glow: 'rgba(124, 179, 66, 0.25)', bg: '#0b1405' }, // Bad Guy - Lime Green
  'hT_nvWreIhg': { primary: '#039be5', glow: 'rgba(3, 155, 229, 0.25)', bg: '#05121a' }, // Counting Stars - Light Blue
  '09R8_2nJtjg': { primary: '#d81b60', glow: 'rgba(216, 27, 96, 0.25)', bg: '#1c050f' }, // Sugar - Pink
  'rtOvBOTyXkk': { primary: '#e53935', glow: 'rgba(229, 57, 53, 0.25)', bg: '#1a0505' }, // Stressed Out - Red/Black
  'CevxZvSJLk8': { primary: '#ffb300', glow: 'rgba(255, 179, 0, 0.25)', bg: '#1c1706' }, // Roar - Gold/Orange
  'LHCob76kigA': { primary: '#8e24aa', glow: 'rgba(142, 36, 170, 0.25)', bg: '#16051c' }, // Lofi - Dark Violet
};

const DEFAULT_THEME = { primary: '#ff0000', glow: 'rgba(255, 0, 0, 0.2)', bg: '#070707' };

function App() {
  // Views and search state
  const [currentView, setView] = useState<string>('home');
  const [searchQuery, setSearchQuery] = useState<string>('');
  const [searchResults, setSearchResults] = useState<Track[]>([]);

  // Persistent States
  const [playlists, setPlaylists] = useState<Playlist[]>(() => {
    const saved = localStorage.getItem('yt_music_playlists');
    return saved ? JSON.parse(saved) : [];
  });
  const [likedTracks, setLikedTracks] = useState<Track[]>(() => {
    const saved = localStorage.getItem('yt_music_liked');
    return saved ? JSON.parse(saved) : [];
  });
  const [selectedPlaylistId, setSelectedPlaylistId] = useState<string | null>(null);

  // Playback States
  const [currentTrack, setCurrentTrack] = useState<Track | null>(null);
  const [isPlaying, setIsPlaying] = useState<boolean>(false);
  const [progress, setProgress] = useState<number>(0);
  const [volume, setVolume] = useState<number>(0.5);
  const [queue, setQueue] = useState<Track[]>(POPULAR_TRACKS);
  const [currentIndex, setCurrentIndex] = useState<number>(0);
  const [isShuffle, setIsShuffle] = useState<boolean>(false);
  const [isRepeat, setIsRepeat] = useState<'none' | 'one' | 'all'>('none');

  // Side panels states
  const [showLyrics, setShowLyrics] = useState<boolean>(false);
  const [showQueue, setShowQueue] = useState<boolean>(false);

  // Playlist Creator Modal State
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [newPlaylistName, setNewPlaylistName] = useState('');
  const [newPlaylistDesc, setNewPlaylistDesc] = useState('');

  // Save changes to localstorage
  useEffect(() => {
    localStorage.setItem('yt_music_playlists', JSON.stringify(playlists));
  }, [playlists]);

  useEffect(() => {
    localStorage.setItem('yt_music_liked', JSON.stringify(likedTracks));
  }, [likedTracks]);

  // Apply Dynamic Theme when currentTrack changes
  useEffect(() => {
    const root = document.documentElement;
    if (currentTrack && TRACK_THEMES[currentTrack.id]) {
      const theme = TRACK_THEMES[currentTrack.id];
      root.style.setProperty('--dynamic-primary', theme.primary);
      root.style.setProperty('--dynamic-primary-glow', theme.glow);
      root.style.setProperty('--dynamic-bg', theme.bg);
    } else {
      root.style.setProperty('--dynamic-primary', DEFAULT_THEME.primary);
      root.style.setProperty('--dynamic-primary-glow', DEFAULT_THEME.glow);
      root.style.setProperty('--dynamic-bg', DEFAULT_THEME.bg);
    }
  }, [currentTrack]);

  // Search Handler
  const handleSearch = async (query: string) => {
    setSearchQuery(query);
    const results = await searchYouTube(query);
    setSearchResults(results);
  };

  // Playback handlers
  const handlePlayTrack = (track: Track) => {
    // If track is already in the queue, find its index, else append to the queue
    const index = queue.findIndex((t) => t.id === track.id);
    if (index !== -1) {
      setCurrentIndex(index);
    } else {
      const newQueue = [...queue, track];
      setQueue(newQueue);
      setCurrentIndex(newQueue.length - 1);
    }
    setCurrentTrack(track);
    setIsPlaying(true);
    setProgress(0);
  };

  const handlePlayTrackImmediate = (track: Track) => {
    // Instantly queue and play this track
    setQueue([track]);
    setCurrentIndex(0);
    setCurrentTrack(track);
    setIsPlaying(true);
    setProgress(0);
  };

  const handleNext = () => {
    if (queue.length === 0) return;
    let nextIdx = currentIndex + 1;
    if (isShuffle) {
      nextIdx = Math.floor(Math.random() * queue.length);
    } else if (nextIdx >= queue.length) {
      nextIdx = isRepeat === 'all' ? 0 : queue.length - 1;
    }
    setCurrentIndex(nextIdx);
    setCurrentTrack(queue[nextIdx]);
    setProgress(0);
    setIsPlaying(true);
  };

  const handlePrev = () => {
    if (queue.length === 0) return;
    let prevIdx = currentIndex - 1;
    if (prevIdx < 0) {
      prevIdx = isRepeat === 'all' ? queue.length - 1 : 0;
    }
    setCurrentIndex(prevIdx);
    setCurrentTrack(queue[prevIdx]);
    setProgress(0);
    setIsPlaying(true);
  };

  // Playlist management
  const handleCreatePlaylist = () => {
    if (!newPlaylistName.trim()) return;
    const newPlaylist: Playlist = {
      id: Date.now().toString(),
      name: newPlaylistName,
      description: newPlaylistDesc,
      tracks: [],
      createdAt: new Date().toISOString(),
    };
    setPlaylists([...playlists, newPlaylist]);
    setNewPlaylistName('');
    setNewPlaylistDesc('');
    setIsModalOpen(false);
  };

  const handleRemovePlaylist = (playlistId: string) => {
    setPlaylists(playlists.filter((p) => p.id !== playlistId));
    setView('home');
  };

  const handleAddTrackToPlaylist = (track: Track, playlistId: string) => {
    setPlaylists(
      playlists.map((p) => {
        if (p.id === playlistId) {
          // Prevent duplicates
          if (p.tracks.some((t) => t.id === track.id)) return p;
          return { ...p, tracks: [...p.tracks, track] };
        }
        return p;
      })
    );
  };

  const handleRemoveTrackFromPlaylist = (playlistId: string, trackId: string) => {
    setPlaylists(
      playlists.map((p) => {
        if (p.id === playlistId) {
          return { ...p, tracks: p.tracks.filter((t) => t.id !== trackId) };
        }
        return p;
      })
    );
  };

  // Toggle Like Handler
  const handleToggleLike = (track: Track) => {
    const isLiked = likedTracks.some((t) => t.id === track.id);
    if (isLiked) {
      setLikedTracks(likedTracks.filter((t) => t.id !== track.id));
    } else {
      setLikedTracks([...likedTracks, track]);
    }
  };

  return (
    <div className="app-container dynamic-theme">
      {/* Top Navbar */}
      <Navbar
        onSearch={handleSearch}
        setView={setView}
        onPlayTrackImmediate={handlePlayTrackImmediate}
      />

      {/* Side Navigation Bar */}
      <Sidebar
        currentView={currentView}
        setView={setView}
        playlists={playlists}
        onCreatePlaylist={() => setIsModalOpen(true)}
        setSelectedPlaylistId={setSelectedPlaylistId}
      />

      {/* Main Content Layout containing Feed and Drawer */}
      <div className="main-layout" style={{ gridArea: 'main' }}>
        <main className="main-content">
          <MainFeed
            view={currentView}
            searchQuery={searchQuery}
            searchResults={searchResults}
            playlists={playlists}
            selectedPlaylistId={selectedPlaylistId}
            likedTracks={likedTracks}
            onPlayTrack={handlePlayTrack}
            onAddTrackToPlaylist={handleAddTrackToPlaylist}
            onRemovePlaylist={handleRemovePlaylist}
            onRemoveTrackFromPlaylist={handleRemoveTrackFromPlaylist}
          />
        </main>

        {/* Lyrics or Queue sidebar overlay */}
        <LyricsAndQueue
          showLyrics={showLyrics}
          showQueue={showQueue}
          currentTrack={currentTrack}
          queue={queue}
          currentIndex={currentIndex}
          onSelectFromQueue={(index) => {
            setCurrentIndex(index);
            setCurrentTrack(queue[index]);
            setIsPlaying(true);
            setProgress(0);
          }}
          onClearQueue={() => {
            setQueue([]);
            setCurrentTrack(null);
            setIsPlaying(false);
          }}
          progress={progress}
        />
      </div>

      {/* Persistent Audio Player Controls (Bottom) */}
      <PlayerBar
        currentTrack={currentTrack}
        isPlaying={isPlaying}
        setIsPlaying={setIsPlaying}
        progress={progress}
        setProgress={setProgress}
        volume={volume}
        setVolume={setVolume}
        queue={queue}
        onNext={handleNext}
        onPrev={handlePrev}
        isShuffle={isShuffle}
        setIsShuffle={setIsShuffle}
        isRepeat={isRepeat}
        setIsRepeat={setIsRepeat}
        showLyrics={showLyrics}
        setShowLyrics={setShowLyrics}
        showQueue={showQueue}
        setShowQueue={setShowQueue}
        likedTracks={likedTracks}
        onToggleLike={handleToggleLike}
      />

      {/* Create Playlist Modal overlay */}
      {isModalOpen && (
        <div className="modal-overlay">
          <div className="modal-content">
            <div className="modal-title">Create New Playlist</div>
            <input
              type="text"
              placeholder="Playlist name"
              className="modal-input"
              value={newPlaylistName}
              onChange={(e) => setNewPlaylistName(e.target.value)}
            />
            <input
              type="text"
              placeholder="Description (optional)"
              className="modal-input"
              value={newPlaylistDesc}
              onChange={(e) => setNewPlaylistDesc(e.target.value)}
            />
            <div className="modal-actions">
              <button className="btn btn-secondary" onClick={() => setIsModalOpen(false)}>
                Cancel
              </button>
              <button className="btn btn-primary" onClick={handleCreatePlaylist}>
                Create
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

export default App;
