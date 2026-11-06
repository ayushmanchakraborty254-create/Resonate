import { useState, useEffect } from 'react';
import { Sidebar } from './components/Sidebar';
import { Navbar } from './components/Navbar';
import { PlayerBar } from './components/PlayerBar';
import { MainFeed } from './components/MainFeed';
import { LyricsAndQueue } from './components/LyricsAndQueue';
import { AuthModal } from './components/AuthModal';
import { LyricsModal } from './components/LyricsModal';
import { MusicRecognizerModal } from './components/MusicRecognizerModal';
import { ListenTogetherModal } from './components/ListenTogetherModal';
import { StatsModal } from './components/StatsModal';
import { HistoryModal } from './components/HistoryModal';
import { AppDownloadModal } from './components/AppDownloadModal';
import { MobileSearchView } from './components/MobileSearchView';
import { ProfileView } from './components/ProfileView';
import { SpotifyAuthManager } from './utils/spotifyAuth';
import type { Track, Playlist, UnifiedTrack, UnifiedPlaylist } from './types';
import { POPULAR_TRACKS, searchYouTube } from './utils/youtube';
import { syncManager } from './utils/syncManager';
import { floatingPlayer } from './utils/floatingPlayer';
import { UniversalLibrary } from './components/UniversalLibrary';
import { personalization } from './utils/personalization';
import { useBreakpoint } from './utils/responsive';
import { useNavigation } from './utils/navigation';
import type { ActiveView } from './utils/navigation';
import { Home, Search, Library, Mic, Radio } from 'lucide-react';

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
  'kPa7bsKwL-8': { primary: '#e50914', glow: 'rgba(229, 9, 20, 0.25)', bg: '#1c0505' }, // Die With A Smile - Crimson/Red
};

const DEFAULT_THEME = { primary: '#ff0000', glow: 'rgba(255, 0, 0, 0.2)', bg: '#070707' };

function safeJsonParse<T>(key: string, fallback: T): T {
  try {
    const raw = localStorage.getItem(key);
    if (!raw || raw === 'undefined' || raw === 'null') return fallback;
    return JSON.parse(raw);
  } catch (err) {
    console.warn(`[Resonate] Resetting corrupted localStorage key: ${key}`, err);
    try { localStorage.removeItem(key); } catch (_) {}
    return fallback;
  }
}

function App() {
  const { isMobile } = useBreakpoint();
  const { currentView, pushView, activePlaylistId: selectedPlaylistId, setSelectedPlaylistId } = useNavigation();
  const setView = (v: any) => pushView(v as ActiveView);

  // Search state
  const [searchQuery, setSearchQuery] = useState<string>('');
  const [searchResults, setSearchResults] = useState<Track[]>([]);

  // Persistent States with safe parsing to prevent mobile blank screens
  const [playlists, setPlaylists] = useState<Playlist[]>(() => safeJsonParse('yt_music_playlists', []));
  const [likedTracks, setLikedTracks] = useState<Track[]>(() => safeJsonParse('yt_music_liked', []));

  // Playback States
  const [currentTrack, setCurrentTrack] = useState<Track | null>(() => safeJsonParse('yt_music_current_track', null));
  const [isPlaying, setIsPlaying] = useState<boolean>(false);
  const [progress, setProgress] = useState<number>(() => {
    return Number(localStorage.getItem('yt_music_progress') || 0);
  });
  const [volume, setVolume] = useState<number>(() => {
    return Number(localStorage.getItem('yt_music_volume') || 0.5);
  });
  const [queue, setQueue] = useState<Track[]>(() => safeJsonParse('yt_music_queue', POPULAR_TRACKS));
  const [currentIndex, setCurrentIndex] = useState<number>(() => {
    return Number(localStorage.getItem('yt_music_current_index') || 0);
  });
  const [isShuffle, setIsShuffle] = useState<boolean>(() => {
    return localStorage.getItem('yt_music_is_shuffle') === 'true';
  });
  const [isRepeat, setIsRepeat] = useState<'none' | 'one' | 'all'>(() => {
    return (localStorage.getItem('yt_music_is_repeat') as 'none' | 'one' | 'all') || 'none';
  });

  // User & Auth States
  const [user, setUser] = useState<{ name: string; email: string; avatar?: string; isGoogle?: boolean } | null>(() => safeJsonParse('resonate_user', null));
  const [isAuthModalOpen, setIsAuthModalOpen] = useState(false);

  // Side panels & New Feature Modals
  const [showLyrics, setShowLyrics] = useState<boolean>(false);
  const [showQueue, setShowQueue] = useState<boolean>(false);
  const [isListenTogetherOpen, setIsListenTogetherOpen] = useState<boolean>(false);
  const [isStatsOpen, setIsStatsOpen] = useState<boolean>(false);
  const [isHistoryOpen, setIsHistoryOpen] = useState<boolean>(false);
  const [isRecognizerOpen, setIsRecognizerOpen] = useState<boolean>(false);
  const [isDownloadApkOpen, setIsDownloadApkOpen] = useState<boolean>(false);

  // Playlist Creator Modal State
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [newPlaylistName, setNewPlaylistName] = useState('');
  const [newPlaylistDesc, setNewPlaylistDesc] = useState('');
  const [syncToYouTube, setSyncToYouTube] = useState(false);

  // Save changes to localstorage
  useEffect(() => {
    localStorage.setItem('yt_music_playlists', JSON.stringify(playlists));
  }, [playlists]);

  useEffect(() => {
    localStorage.setItem('yt_music_liked', JSON.stringify(likedTracks));
  }, [likedTracks]);

  useEffect(() => {
    localStorage.setItem('yt_music_current_view', currentView);
  }, [currentView]);

  useEffect(() => {
    if (selectedPlaylistId) {
      localStorage.setItem('yt_music_selected_playlist_id', selectedPlaylistId);
    } else {
      localStorage.removeItem('yt_music_selected_playlist_id');
    }
  }, [selectedPlaylistId]);

  useEffect(() => {
    if (currentTrack) {
      localStorage.setItem('yt_music_current_track', JSON.stringify(currentTrack));
    } else {
      localStorage.removeItem('yt_music_current_track');
    }
  }, [currentTrack]);

  useEffect(() => {
    localStorage.setItem('yt_music_progress', progress.toString());
  }, [progress]);

  useEffect(() => {
    localStorage.setItem('yt_music_volume', volume.toString());
  }, [volume]);

  useEffect(() => {
    localStorage.setItem('yt_music_queue', JSON.stringify(queue));
  }, [queue]);

  useEffect(() => {
    localStorage.setItem('yt_music_current_index', currentIndex.toString());
  }, [currentIndex]);

  useEffect(() => {
    localStorage.setItem('yt_music_is_shuffle', isShuffle.toString());
  }, [isShuffle]);

  useEffect(() => {
    localStorage.setItem('yt_music_is_repeat', isRepeat);
  }, [isRepeat]);

  useEffect(() => {
    if (user) {
      localStorage.setItem('resonate_user', JSON.stringify(user));
    } else {
      localStorage.removeItem('resonate_user');
    }
  }, [user]);

  const executeSyncSilent = async () => {
    try {
      const { playlists: syncedPlaylists, tracks: syncedTracks } = await syncManager.syncAllConnected();
      
      const appPlaylists = syncedPlaylists.map((pl: UnifiedPlaylist) => ({
        id: pl.id,
        name: pl.name,
        description: pl.description,
        createdAt: pl.createdAt,
        tracks: pl.tracks.map((t: UnifiedTrack) => ({
          id: t.id.split(':')[1] || t.id,
          title: t.title,
          artist: t.artist,
          album: t.album,
          duration: t.duration,
          thumbnailUrl: t.thumbnailUrl,
          youtubeUrl: t.source === 'youtube' ? t.externalUrl || `https://www.youtube.com/watch?v=${t.id}` : `https://www.youtube.com/watch?v=${t.id}`,
          lyrics: `[Enjoy listening to ${t.title} on Resonate!]`
        }))
      }));

      console.log("Before state update - Previous playlist count:", playlists.length);
      console.log("Incoming playlist count:", appPlaylists.length);

      // Deduplicate before updating state by playlist ID
      const uniqueIncomingPlaylists = Array.from(
        new Map(appPlaylists.map(p => [p.id, p])).values()
      );

      setPlaylists((prev) => {
        // Correct prefix filter to strip previously synced playlists (yt-playlist- instead of yt-sync-)
        const custom = prev.filter((p) => !p.id.startsWith('yt-playlist-') && !p.id.startsWith('sp-playlist-') && !p.id.startsWith('am-playlist-'));
        const nextState = [...custom, ...uniqueIncomingPlaylists];
        console.log("Final state length (playlists count):", nextState.length);
        return nextState;
      });

      const appLikes = syncedTracks.map((t: UnifiedTrack) => ({
        id: t.id.split(':')[1] || t.id,
        title: t.title,
        artist: t.artist,
        album: t.album,
        duration: t.duration,
        thumbnailUrl: t.thumbnailUrl,
        youtubeUrl: t.source === 'youtube' ? t.externalUrl || `https://www.youtube.com/watch?v=${t.id}` : `https://www.youtube.com/watch?v=${t.id}`,
        lyrics: `[Enjoy listening to ${t.title} on Resonate!]`
      }));
      
      setLikedTracks((prev) => {
        const merged = [...prev];
        appLikes.forEach((track: Track) => {
          if (!merged.some((t: Track) => t.id === track.id)) {
            merged.push(track);
          }
        });
        return merged;
      });
    } catch (e) {
      console.warn('Silent sync failed:', e);
    }
  };

  // Automatically sync playlists when a Google user logs in, or clear them on logout
  useEffect(() => {
    if (user) {
      executeSyncSilent();
    } else {
      // Clear synced playlists on logout
      setPlaylists((prev) => prev.filter((p) => !p.id.startsWith('yt-sync-') && !p.id.startsWith('sp-playlist-') && !p.id.startsWith('am-playlist-')));
    }
  }, [user]);

  // Background periodic sync (every 15 minutes)
  useEffect(() => {
    if (!user) return;

    const interval = setInterval(() => {
      executeSyncSilent();
    }, 15 * 60 * 1000); // 15 mins

    return () => clearInterval(interval);
  }, [user]);

  // Spotify OAuth Callback & Auto-Sync on App Open / Relaunch
  useEffect(() => {
    (async () => {
      const handled = await SpotifyAuthManager.handleCallback();
      if (handled) {
        alert('Spotify API Connected! Syncing libraries...');
      }
      // Auto-sync library every time app is relaunched/reopened
      executeSyncSilent();
    })();

    const handleFocus = () => {
      // Background auto-sync on window return
      executeSyncSilent();
    };
    window.addEventListener('focus', handleFocus);
    return () => window.removeEventListener('focus', handleFocus);
  }, []);

  // Track Playback session events for personalization
  useEffect(() => {
    if (!currentTrack) return;
    personalization.trackPlayStart(currentTrack.id);
    
    return () => {
      // Record a 60s mock listening session to update analytics database
      personalization.trackPlaySession(currentTrack.id, 60, currentTrack.duration || 240, false);
    };
  }, [currentTrack]);

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

  const handleAddToQueue = (track: Track) => {
    setQueue((prev) => {
      const updated = [...prev, track];
      try {
        localStorage.setItem('yt_music_queue', JSON.stringify(updated));
      } catch (_) {}
      return updated;
    });
  };

  const handleRemoveFromQueue = (index: number) => {
    setQueue((prev) => {
      const updated = prev.filter((_, i) => i !== index);
      try {
        localStorage.setItem('yt_music_queue', JSON.stringify(updated));
      } catch (_) {}
      if (index < currentIndex) {
        setCurrentIndex(currentIndex - 1);
      } else if (index === currentIndex && updated.length > 0) {
        const nextIdx = Math.min(index, updated.length - 1);
        setCurrentIndex(nextIdx);
        setCurrentTrack(updated[nextIdx]);
      }
      return updated;
    });
  };

  const handleSelectFromQueue = (index: number) => {
    if (index >= 0 && index < queue.length) {
      setCurrentIndex(index);
      setCurrentTrack(queue[index]);
      setProgress(0);
      setIsPlaying(true);
    }
  };

  const handleNext = () => {
    if (queue.length === 0) {
      if (POPULAR_TRACKS.length > 0) {
        handlePlayTrack(POPULAR_TRACKS[0]);
      }
      return;
    }
    let nextIdx = currentIndex + 1;
    if (isShuffle) {
      nextIdx = Math.floor(Math.random() * queue.length);
    } else if (nextIdx >= queue.length) {
      if (isRepeat === 'all') {
        nextIdx = 0;
      } else {
        // Auto-recommend next track from catalogue to keep playback seamless
        const currentId = currentTrack?.id;
        const candidate = POPULAR_TRACKS.find((t) => t.id !== currentId) || POPULAR_TRACKS[0];
        const newQueue = [...queue, candidate];
        setQueue(newQueue);
        setCurrentIndex(newQueue.length - 1);
        setCurrentTrack(candidate);
        setProgress(0);
        setIsPlaying(true);
        return;
      }
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
  const handleCreatePlaylist = async () => {
    if (!newPlaylistName.trim()) return;
    const newPlaylist: Playlist = {
      id: Date.now().toString(),
      name: newPlaylistName,
      description: newPlaylistDesc,
      tracks: [],
      createdAt: new Date().toISOString(),
      syncToYouTube,
    };
    setPlaylists([...playlists, newPlaylist]);

    if (syncToYouTube) {
      try {
        await syncManager.pushPlaylistToYouTube(newPlaylist);
      } catch (err) {
        console.warn('[YouTube Sync]', err);
      }
    }

    setNewPlaylistName('');
    setNewPlaylistDesc('');
    setSyncToYouTube(false);
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

  // Sync Playlists from Google/YouTube using official API
  const handleSyncPlaylists = async () => {
    try {
      await executeSync();
    } catch (e: any) {
      alert(`Sync failed: ${e.message || e}`);
    }
  };

  const executeSync = async () => {
    try {
      await executeSyncSilent();
      alert('Sync completed successfully! Your music library is updated.');
    } catch (e) {
      console.error('Sync failed:', e);
      alert('Failed to sync library. Please ensure your account configurations are correct.');
    }
  };

  const hideNavbarOnMobile = isMobile && (currentView === 'explore' || currentView === 'profile');

  return (
    <div className={`app-container dynamic-theme ${isMobile ? 'mobile-layout' : ''} ${hideNavbarOnMobile ? 'no-mobile-nav' : ''}`}>
      {/* Top Navbar (Hidden on mobile search & profile to allow dedicated edge-to-edge headers) */}
      {!hideNavbarOnMobile && (
        <Navbar
          currentView={currentView}
          onSearch={handleSearch}
          setView={setView}
          onPlayTrackImmediate={handlePlayTrackImmediate}
          user={user}
          onOpenAuth={() => setIsAuthModalOpen(true)}
          onLogout={() => setUser(null)}
          onOpenListenTogether={() => setIsListenTogetherOpen(true)}
          onOpenStats={() => setIsStatsOpen(true)}
          onOpenHistory={() => setIsHistoryOpen(true)}
          onOpenRecognizer={() => setIsRecognizerOpen(true)}
        />
      )}

      {/* Side Navigation Bar */}
      {!isMobile && (
        <Sidebar
          currentView={currentView}
          setView={setView}
          playlists={playlists}
          onCreatePlaylist={() => setIsModalOpen(true)}
          setSelectedPlaylistId={setSelectedPlaylistId}
          user={user}
          onSyncPlaylists={handleSyncPlaylists}
        />
      )}

      {/* Main Content Layout containing Feed and Drawer */}
      <div className="main-layout" style={{ gridArea: 'main' }}>
        <main className={`main-content ${hideNavbarOnMobile ? 'no-pad' : ''}`}>
          {currentView === 'profile' ? (
            <ProfileView
              user={user}
              onOpenAuth={() => setIsAuthModalOpen(true)}
              onLogout={() => setUser(null)}
              onNavigateToUniversal={() => pushView('universal_library')}
              onOpenDownloadModal={() => setIsDownloadApkOpen(true)}
              onBack={() => pushView('home')}
            />
          ) : isMobile && currentView === 'explore' ? (
            <MobileSearchView
              onBack={() => pushView('home')}
              onPlayTrackImmediate={handlePlayTrackImmediate}
              onOpenRecognizer={() => setIsRecognizerOpen(true)}
              onAddToQueue={handleAddToQueue}
            />
          ) : currentView === 'universal_library' ? (
            <UniversalLibrary
              onPlayTrack={(track) => {
                handlePlayTrackImmediate({
                  id: track.id.split(':')[1] || track.id,
                  title: track.title,
                  artist: track.artist,
                  album: track.album,
                  duration: track.duration,
                  thumbnailUrl: track.thumbnailUrl,
                  youtubeUrl: track.source === 'youtube' ? track.externalUrl : `https://www.youtube.com/watch?v=${track.id}`,
                  lyrics: `[Enjoy listening to ${track.title} on Resonate!]`
                });
              }}
            />
          ) : (
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
              onCreatePlaylist={() => setIsModalOpen(true)}
              onAddToQueue={handleAddToQueue}
            />
          )}
        </main>

        {/* Queue sidebar overlay (Only on Desktop when requested) */}
        {!isMobile && showQueue && (
          <LyricsAndQueue
            showLyrics={false}
            showQueue={showQueue}
            currentTrack={currentTrack}
            queue={queue}
            currentIndex={currentIndex}
            onSelectFromQueue={handleSelectFromQueue}
            onRemoveFromQueue={handleRemoveFromQueue}
            onClearQueue={() => {
              setQueue([]);
              setCurrentTrack(null);
              setIsPlaying(false);
            }}
            progress={progress}
            duration={currentTrack?.duration || 180}
            onSeek={(secs) => {
              setProgress(secs);
              floatingPlayer.seek(secs);
            }}
          />
        )}
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
        onSelectFromQueue={handleSelectFromQueue}
        onRemoveFromQueue={handleRemoveFromQueue}
        onAddToQueue={handleAddToQueue}
      />



      {/* Mobile Floating Action Buttons (Bottom Right): Music Recognizer & Listen Together */}
      {isMobile && currentView === 'home' && (
        <div
          style={{
            position: 'fixed',
            bottom: currentTrack ? '124px' : '64px',
            right: '16px',
            display: 'flex',
            flexDirection: 'column',
            gap: '10px',
            zIndex: 60,
          }}
        >
          {/* Floating Mic for Music Recognizer */}
          <button
            onClick={() => setIsRecognizerOpen(true)}
            style={{
              width: '44px',
              height: '44px',
              borderRadius: '14px',
              backgroundColor: '#3b5478',
              color: '#fff',
              border: 'none',
              boxShadow: '0 8px 24px rgba(0, 0, 0, 0.5)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              cursor: 'pointer',
              transition: 'transform 0.2s',
            }}
            title="Music Recognizer"
          >
            <Mic size={19} />
          </button>

          {/* Floating Listen Together Radio button */}
          <button
            onClick={() => setIsListenTogetherOpen(true)}
            style={{
              width: '44px',
              height: '44px',
              borderRadius: '14px',
              backgroundColor: '#384358',
              color: '#fff',
              border: 'none',
              boxShadow: '0 8px 24px rgba(0, 0, 0, 0.5)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              cursor: 'pointer',
              transition: 'transform 0.2s',
            }}
            title="Listen Together Room"
          >
            <Radio size={19} />
          </button>
        </div>
      )}

      {/* Mobile Bottom Navigation Bar (Material You 3-Tab - Reference Match: Images 3, 4, 5) */}
      {isMobile && (
        <div className="bottom-nav-material">
          <button
            className={`nav-tab-pill ${currentView === 'home' ? 'active' : ''}`}
            onClick={() => pushView('home')}
          >
            <div className="tab-icon-wrapper">
              <Home size={22} />
            </div>
            <span>Home</span>
          </button>

          <button
            className={`nav-tab-pill ${currentView === 'explore' ? 'active' : ''}`}
            onClick={() => pushView('explore')}
          >
            <div className="tab-icon-wrapper">
              <Search size={22} />
            </div>
            <span>Search</span>
          </button>

          <button
            className={`nav-tab-pill ${currentView === 'library' || currentView === 'universal_library' ? 'active' : ''}`}
            onClick={() => pushView('library')}
          >
            <div className="tab-icon-wrapper">
              <Library size={22} />
            </div>
            <span>Library</span>
          </button>
        </div>
      )}

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
            <label
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: '10px',
                cursor: 'pointer',
                margin: '12px 0 16px 0',
                fontSize: '13px',
                color: '#e2e8f0',
                userSelect: 'none',
              }}
            >
              <input
                type="checkbox"
                checked={syncToYouTube}
                onChange={(e) => setSyncToYouTube(e.target.checked)}
                style={{
                  width: '18px',
                  height: '18px',
                  accentColor: '#e50914',
                  cursor: 'pointer',
                }}
              />
              <span>Also add this playlist to YouTube Music</span>
            </label>
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

      {/* Google and Custom Authentication Modal */}
      <AuthModal
        isOpen={isAuthModalOpen}
        onClose={() => setIsAuthModalOpen(false)}
        onLoginSuccess={(u) => setUser(u)}
      />

      {/* Full-Screen Ambient Blurred Lyrics Modal */}
      <LyricsModal
        isOpen={showLyrics}
        onClose={() => setShowLyrics(false)}
        currentTrack={currentTrack}
        isPlaying={isPlaying}
        onTogglePlay={() => setIsPlaying(!isPlaying)}
        onNext={handleNext}
        onPrev={handlePrev}
        progress={progress}
        duration={currentTrack?.duration || 180}
        onSeek={(secs) => {
          setProgress(secs);
          floatingPlayer.seek(secs);
        }}
      />

      {/* Music Recognizer Modal (Metrolist / Shazam Engine) */}
      <MusicRecognizerModal
        isOpen={isRecognizerOpen}
        onClose={() => setIsRecognizerOpen(false)}
        onPlayTrackImmediate={handlePlayTrackImmediate}
      />

      {/* Listen Together Modal (Host/Join Rooms) */}
      <ListenTogetherModal
        isOpen={isListenTogetherOpen}
        onClose={() => setIsListenTogetherOpen(false)}
        currentTrack={currentTrack}
        isPlaying={isPlaying}
        onPlayTrackImmediate={handlePlayTrackImmediate}
        onTogglePlay={() => setIsPlaying(!isPlaying)}
      />

      {/* Stats Modal (Listening Insights) */}
      <StatsModal
        isOpen={isStatsOpen}
        onClose={() => setIsStatsOpen(false)}
        onPlayTrackImmediate={handlePlayTrackImmediate}
        playlists={playlists}
        likedTracks={likedTracks}
      />

      {/* History Modal (Listening Log) */}
      <HistoryModal
        isOpen={isHistoryOpen}
        onClose={() => setIsHistoryOpen(false)}
        onPlayTrackImmediate={handlePlayTrackImmediate}
      />

      {/* APK & App Download Hub Modal */}
      <AppDownloadModal
        isOpen={isDownloadApkOpen}
        onClose={() => setIsDownloadApkOpen(false)}
      />
    </div>
  );
}

export default App;
