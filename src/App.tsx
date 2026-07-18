import { useState, useEffect } from 'react';
import { Sidebar } from './components/Sidebar';
import { Navbar } from './components/Navbar';
import { PlayerBar } from './components/PlayerBar';
import { MainFeed } from './components/MainFeed';
import { LyricsAndQueue } from './components/LyricsAndQueue';
import { AuthModal } from './components/AuthModal';
import type { Track, Playlist } from './types';
import { POPULAR_TRACKS, searchYouTube } from './utils/youtube';
import { YouTubeProvider } from './utils/syncManager';

const youtubeProvider = new YouTubeProvider();

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
  const [currentView, setView] = useState<string>(() => {
    return localStorage.getItem('yt_music_current_view') || 'home';
  });
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
  const [selectedPlaylistId, setSelectedPlaylistId] = useState<string | null>(() => {
    return localStorage.getItem('yt_music_selected_playlist_id');
  });

  // Playback States
  const [currentTrack, setCurrentTrack] = useState<Track | null>(() => {
    const saved = localStorage.getItem('yt_music_current_track');
    return saved ? JSON.parse(saved) : null;
  });
  const [isPlaying, setIsPlaying] = useState<boolean>(false);
  const [progress, setProgress] = useState<number>(() => {
    return Number(localStorage.getItem('yt_music_progress') || 0);
  });
  const [volume, setVolume] = useState<number>(() => {
    return Number(localStorage.getItem('yt_music_volume') || 0.5);
  });
  const [queue, setQueue] = useState<Track[]>(() => {
    const saved = localStorage.getItem('yt_music_queue');
    return saved ? JSON.parse(saved) : POPULAR_TRACKS;
  });
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
  const [user, setUser] = useState<{ name: string; email: string; avatar?: string; isGoogle?: boolean } | null>(() => {
    const saved = localStorage.getItem('resonate_user');
    return saved ? JSON.parse(saved) : null;
  });
  const [isAuthModalOpen, setIsAuthModalOpen] = useState(false);

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

  const executeSyncSilent = async (accessToken: string) => {
    try {
      const syncedPlaylists = await youtubeProvider.fetchPlaylists(accessToken);
      const syncedLikes = await youtubeProvider.fetchLikedSongs(accessToken);

      setPlaylists((prev) => {
        const custom = prev.filter((p) => !p.id.startsWith('yt-sync-'));
        return [...custom, ...syncedPlaylists];
      });

      if (syncedLikes.length > 0) {
        setLikedTracks((prev) => {
          const merged = [...prev];
          syncedLikes.forEach((track) => {
            if (!merged.some((t) => t.id === track.id)) {
              merged.push({
                id: track.id,
                title: track.title,
                artist: track.artist,
                duration: track.duration,
                thumbnailUrl: track.thumbnailUrl,
                youtubeUrl: track.youtubeUrl,
                lyrics: `[Enjoy listening to ${track.title} on Resonate!]`
              });
            }
          });
          return merged;
        });
      }
    } catch (e) {
      console.warn('Silent sync failed:', e);
    }
  };

  // Automatically sync playlists when a Google user logs in, or clear them on logout
  useEffect(() => {
    if (user?.isGoogle) {
      const token = localStorage.getItem('resonate_google_access_token');
      const expiry = localStorage.getItem('resonate_google_token_expiry');
      if (token && expiry && Date.now() < Number(expiry)) {
        executeSyncSilent(token);
      }
    } else {
      // Clear synced playlists on logout
      setPlaylists((prev) => prev.filter((p) => !p.id.startsWith('yt-sync-')));
    }
  }, [user]);

  // Background periodic sync (every 15 minutes)
  useEffect(() => {
    if (!user?.isGoogle) return;

    const interval = setInterval(() => {
      const token = localStorage.getItem('resonate_google_access_token');
      const expiry = localStorage.getItem('resonate_google_token_expiry');
      if (token && expiry && Date.now() < Number(expiry)) {
        executeSyncSilent(token);
      }
    }, 15 * 60 * 1000); // 15 mins

    return () => clearInterval(interval);
  }, [user]);

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

  // Sync Playlists from Google/YouTube using official API
  const handleSyncPlaylists = async () => {
    if (!user || !user.isGoogle) {
      setIsAuthModalOpen(true);
      return;
    }

    const token = localStorage.getItem('resonate_google_access_token');
    const expiry = localStorage.getItem('resonate_google_token_expiry');

    if (!token || !expiry || Date.now() > Number(expiry)) {
      // Token is missing or expired! Re-prompt user scopes using Google GSI Token flow
      const gWindow = window as any;
      if (gWindow.google && gWindow.google.accounts && gWindow.google.accounts.oauth2) {
        try {
          const clientId = localStorage.getItem('resonate_google_client_id') || 
                           import.meta.env.VITE_GOOGLE_CLIENT_ID || 
                           '605009533283-r6tg33nkq8i24n6qh8gkds8cdgknk2a6.apps.googleusercontent.com';
                           
          const client = gWindow.google.accounts.oauth2.initTokenClient({
            client_id: clientId,
            scope: 'openid email profile https://www.googleapis.com/auth/youtube.readonly',
            callback: async (tokenResponse: any) => {
              if (tokenResponse.error) {
                alert(`Authentication failed: ${tokenResponse.error}`);
                return;
              }
              const newToken = tokenResponse.access_token;
              localStorage.setItem('resonate_google_access_token', newToken);
              localStorage.setItem('resonate_google_token_expiry', (Date.now() + tokenResponse.expires_in * 1000).toString());
              
              await executeSync(newToken);
            }
          });
          client.requestAccessToken();
        } catch (e) {
          console.error(e);
          alert('Failed to request Google Access Token');
        }
      } else {
        alert('Google API library is still loading. Please try again.');
      }
      return;
    }

    await executeSync(token);
  };

  const executeSync = async (accessToken: string) => {
    try {
      const syncedPlaylists = await youtubeProvider.fetchPlaylists(accessToken);
      const syncedLikes = await youtubeProvider.fetchLikedSongs(accessToken);

      setPlaylists((prev) => {
        const custom = prev.filter((p) => !p.id.startsWith('yt-sync-'));
        return [...custom, ...syncedPlaylists];
      });

      if (syncedLikes.length > 0) {
        setLikedTracks((prev) => {
          const merged = [...prev];
          syncedLikes.forEach((track) => {
            if (!merged.some((t) => t.id === track.id)) {
              merged.push({
                id: track.id,
                title: track.title,
                artist: track.artist,
                duration: track.duration,
                thumbnailUrl: track.thumbnailUrl,
                youtubeUrl: track.youtubeUrl,
                lyrics: `[Enjoy listening to ${track.title} on Resonate!]`
              });
            }
          });
          return merged;
        });
      }

      alert('Sync completed successfully! Your Google/YouTube music library is updated.');
    } catch (e) {
      console.error('Sync failed:', e);
      alert('Failed to sync library. Please ensure your Google account configuration is correct.');
    }
  };

  return (
    <div className="app-container dynamic-theme">
      {/* Top Navbar */}
      <Navbar
        onSearch={handleSearch}
        setView={setView}
        onPlayTrackImmediate={handlePlayTrackImmediate}
        user={user}
        onOpenAuth={() => setIsAuthModalOpen(true)}
        onLogout={() => setUser(null)}
      />

      {/* Side Navigation Bar */}
      <Sidebar
        currentView={currentView}
        setView={setView}
        playlists={playlists}
        onCreatePlaylist={() => setIsModalOpen(true)}
        setSelectedPlaylistId={setSelectedPlaylistId}
        user={user}
        onSyncPlaylists={handleSyncPlaylists}
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

      {/* Google and Custom Authentication Modal */}
      <AuthModal
        isOpen={isAuthModalOpen}
        onClose={() => setIsAuthModalOpen(false)}
        onLoginSuccess={(u) => setUser(u)}
      />
    </div>
  );
}

export default App;
