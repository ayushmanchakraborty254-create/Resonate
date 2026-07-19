import React, { useState, useEffect } from 'react';
import { 
  Music, RefreshCw, Shield, ShieldAlert, CheckCircle, 
  Trash2, Play, Sparkles, FolderHeart, Disc, AlertTriangle,
  ChevronLeft, ChevronRight
} from 'lucide-react';
import type { UnifiedTrack, UnifiedPlaylist } from '../types';
import { syncManager } from '../utils/syncManager';
import { db } from '../utils/db';
import { personalization } from '../utils/personalization';
import { useBreakpoint } from '../utils/responsive';

interface UniversalLibraryProps {
  onPlayTrack: (track: any) => void;
}

export const UniversalLibrary: React.FC<UniversalLibraryProps> = ({ onPlayTrack }) => {
  const [activeTab, setActiveTab] = useState<'connections' | 'songs' | 'playlists' | 'recommendations'>('connections');
  
  // Connections metadata
  const [googleConnected, setGoogleConnected] = useState(false);
  const [spotifyConnected, setSpotifyConnected] = useState(false);
  const [appleConnected, setAppleConnected] = useState(false);

  // Sync state
  const [syncProgress, setSyncProgress] = useState(0);
  const [isSyncing, setIsSyncing] = useState(false);
  const [lastSync, setLastSync] = useState<string | null>(null);
  const [syncStatus, setSyncStatus] = useState<string | null>(null);
  const [syncErrors, setSyncErrors] = useState<string[]>([]);

  const [showOnlyMusic, setShowOnlyMusic] = useState(() => {
    const saved = localStorage.getItem('resonate_show_only_music');
    return saved !== 'false'; // default to true
  });

  const handleToggleShowOnlyMusic = (e: React.ChangeEvent<HTMLInputElement>) => {
    const val = e.target.checked;
    setShowOnlyMusic(val);
    localStorage.setItem('resonate_show_only_music', val ? 'true' : 'false');
  };

  // Developer Credentials inputs
  const [spotifyClientId, setSpotifyClientId] = useState(() => localStorage.getItem('resonate_spotify_client_id') || '4ea5b820a16e4544837a28ebf56b7ca2');
  const [appleDevToken, setAppleDevToken] = useState(() => localStorage.getItem('resonate_apple_developer_token') || '');
  const [appleUserToken, setAppleUserToken] = useState(() => localStorage.getItem('resonate_apple_user_token') || '');

  // Cached Unified Data
  const [syncedTracks, setSyncedTracks] = useState<UnifiedTrack[]>([]);
  const [syncedPlaylists, setSyncedPlaylists] = useState<UnifiedPlaylist[]>([]);
  
  // Recommendations
  const [dailyMix, setDailyMix] = useState<UnifiedPlaylist | null>(null);
  const [continueListening, setContinueListening] = useState<UnifiedTrack[]>([]);
  const [moodMixes, setMoodMixes] = useState<UnifiedPlaylist[]>([]);

  // Load cached database records & verify connections
  const loadLibraryData = async () => {
    try {
      const tracks = await db.getAll('tracks');
      const playlists = await db.getAll('playlists');
      console.log("IndexedDB playlists read count:", playlists.length);
      if (playlists.length > 0) {
        console.log("First playlist stored in IndexedDB:", playlists[0]);
      }
      setSyncedTracks(tracks);
      setSyncedPlaylists(playlists);

      // Load recommendations based on cached list
      const mix = await personalization.generateDailyMix(tracks);
      const cont = await personalization.generateContinueListening(tracks);
      const moods = await personalization.generateMoodPlaylists(tracks);

      setDailyMix(mix);
      setContinueListening(cont);
      setMoodMixes(moods);
    } catch (e) {
      console.error('Failed to load IndexedDB data:', e);
    }
  };

  const checkConnections = async () => {
    const ytProvider = syncManager.getProvider('youtube');
    const spProvider = syncManager.getProvider('spotify');
    const amProvider = syncManager.getProvider('applemusic');

    setGoogleConnected(!!(await ytProvider?.connect()));
    setSpotifyConnected(!!(await spProvider?.connect()));
    setAppleConnected(!!(await amProvider?.connect()));

    setLastSync(localStorage.getItem('resonate_last_sync_time') 
      ? new Date(Number(localStorage.getItem('resonate_last_sync_time'))).toLocaleString() 
      : 'Never');
    setSyncStatus(localStorage.getItem('resonate_sync_status'));
    setSyncErrors(syncManager.errors);
  };

  useEffect(() => {
    checkConnections();
    loadLibraryData();
  }, []);

  // Connect Providers
  const handleConnectSpotify = () => {
    localStorage.setItem('resonate_spotify_client_id', spotifyClientId.trim());
    const redirectUri = window.location.origin + '/';
    const scopes = 'user-library-read playlist-read-private user-follow-read user-read-recently-played user-top-read';
    
    // Redirect user to Spotify OAuth Consent Popup
    window.location.href = `https://accounts.spotify.com/authorize?client_id=${spotifyClientId.trim()}&redirect_uri=${encodeURIComponent(redirectUri)}&scope=${encodeURIComponent(scopes)}&response_type=token&show_dialog=true`;
  };

  const handleConnectApple = () => {
    if (appleDevToken.trim() && appleUserToken.trim()) {
      localStorage.setItem('resonate_apple_developer_token', appleDevToken.trim());
      localStorage.setItem('resonate_apple_user_token', appleUserToken.trim());
      checkConnections();
      loadLibraryData();
      alert('Apple Music credential config saved!');
    } else {
      alert('Please fill in both Developer and User Token fields');
    }
  };

  const handleDisconnect = async (providerName: 'youtube' | 'spotify' | 'applemusic') => {
    const provider = syncManager.getProvider(providerName);
    if (provider) {
      await provider.disconnect();
      checkConnections();
      loadLibraryData();
    }
  };

  // Sync catalog
  const handleSyncNow = async () => {
    setIsSyncing(true);
    setSyncProgress(10);
    try {
      const interval = setInterval(() => {
        setSyncProgress(syncManager.progress);
      }, 500);

      await syncManager.syncAllConnected();
      clearInterval(interval);
      setSyncProgress(100);
      
      // Reload
      await checkConnections();
      await loadLibraryData();
    } catch (e: any) {
      alert(`Sync failed: ${e.message || e}`);
    } finally {
      setIsSyncing(false);
    }
  };

  const { isMobile } = useBreakpoint();
  const [mobileSubView, setMobileSubView] = useState<'connections' | 'songs' | 'playlists' | 'recommendations' | null>(null);
  const currentTab = isMobile ? mobileSubView : activeTab;

  const displayedPlaylists = showOnlyMusic 
    ? syncedPlaylists.filter(p => p.isMusic !== false)
    : syncedPlaylists;

  return (
    <div style={{ padding: '8px', paddingBottom: isMobile ? '80px' : '24px' }}>
      <h2 style={{ fontSize: '28px', fontWeight: 800, marginBottom: '8px', display: 'flex', alignItems: 'center', gap: '10px' }}>
        <Music size={28} style={{ color: 'var(--yt-accent)' }} /> Universal Library
      </h2>
      <p style={{ color: 'var(--yt-text-secondary)', fontSize: '14px', marginBottom: '24px' }}>
        Unified browse and account synchronizer for Spotify, Google YouTube, and Apple Music.
      </p>

      {isMobile && !mobileSubView ? (
        /* MOBILE VERTICAL CATEGORIES INDEX */
        <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
          {/* Sync Dashboard Status */}
          <div style={{ background: 'rgba(255,255,255,0.03)', padding: '20px', borderRadius: '12px', border: '1px solid rgba(255,255,255,0.06)' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '16px' }}>
              <div>
                <div style={{ fontSize: '11px', color: 'var(--yt-text-secondary)', textTransform: 'uppercase' }}>Last Sync Time</div>
                <div style={{ fontWeight: 600, fontSize: '14px', marginTop: '2px' }}>{lastSync}</div>
              </div>
              <div>
                <div style={{ fontSize: '11px', color: 'var(--yt-text-secondary)', textTransform: 'uppercase' }}>Status</div>
                <div style={{ fontWeight: 600, fontSize: '14px', marginTop: '2px', color: syncStatus === 'success' ? '#2e7d32' : syncStatus === 'warning' ? '#f57c00' : 'var(--yt-text-secondary)' }}>
                  {syncStatus === 'success' ? 'Synchronized' : syncStatus === 'warning' ? 'Warning' : 'Unsynchronized'}
                </div>
              </div>
            </div>
            {isSyncing && (
              <div style={{ width: '100%', backgroundColor: 'rgba(255,255,255,0.05)', borderRadius: '4px', height: '6px', marginBottom: '16px', overflow: 'hidden' }}>
                <div style={{ width: `${syncProgress}%`, backgroundColor: 'var(--yt-accent)', height: '100%', transition: 'width 0.3s ease' }}></div>
              </div>
            )}
            <button 
              className="btn btn-primary" 
              onClick={handleSyncNow} 
              disabled={isSyncing || syncManager.isSyncing}
              style={{ width: '100%', padding: '12px', borderRadius: '12px', fontSize: '14px', fontWeight: 600 }}
            >
              Sync Music Library
            </button>
          </div>

          {/* Categories Groups */}
          <div style={{ display: 'flex', flexDirection: 'column', gap: '8px', marginTop: '12px' }}>
            <div onClick={() => setMobileSubView('connections')} style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '16px', background: 'rgba(255,255,255,0.02)', borderRadius: '12px', border: '1px solid rgba(255,255,255,0.04)', cursor: 'pointer' }}>
              <div style={{ fontWeight: 700, fontSize: '15px' }}>Connections & Profiles</div>
              <ChevronRight size={18} style={{ color: 'var(--yt-text-secondary)' }} />
            </div>
            <div onClick={() => setMobileSubView('playlists')} style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '16px', background: 'rgba(255,255,255,0.02)', borderRadius: '12px', border: '1px solid rgba(255,255,255,0.04)', cursor: 'pointer' }}>
              <div style={{ fontWeight: 700, fontSize: '15px' }}>Playlists ({displayedPlaylists.length})</div>
              <ChevronRight size={18} style={{ color: 'var(--yt-text-secondary)' }} />
            </div>
            <div onClick={() => setMobileSubView('songs')} style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '16px', background: 'rgba(255,255,255,0.02)', borderRadius: '12px', border: '1px solid rgba(255,255,255,0.04)', cursor: 'pointer' }}>
              <div style={{ fontWeight: 700, fontSize: '15px' }}>Songs ({syncedTracks.length})</div>
              <ChevronRight size={18} style={{ color: 'var(--yt-text-secondary)' }} />
            </div>
            <div onClick={() => setMobileSubView('recommendations')} style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '16px', background: 'rgba(255,255,255,0.02)', borderRadius: '12px', border: '1px solid rgba(255,255,255,0.04)', cursor: 'pointer' }}>
              <div style={{ fontWeight: 700, fontSize: '15px' }}>Recommendations & Moods</div>
              <ChevronRight size={18} style={{ color: 'var(--yt-text-secondary)' }} />
            </div>
          </div>
        </div>
      ) : (
        /* DETAIL VIEW OR DESKTOP */
        <>
          {isMobile && (
            <button 
              onClick={() => setMobileSubView(null)} 
              style={{ display: 'flex', alignItems: 'center', gap: '4px', background: 'none', border: 'none', color: 'var(--yt-accent)', cursor: 'pointer', fontWeight: 600, fontSize: '14px', marginBottom: '16px', padding: '4px 0' }}
            >
              <ChevronLeft size={16} /> Back to Library Categories
            </button>
          )}

          {!isMobile && (
            /* Tabs Menu (Desktop) */
            <div style={{ display: 'flex', gap: '8px', borderBottom: '1px solid rgba(255,255,255,0.06)', marginBottom: '24px', paddingBottom: '8px' }}>
              <button className={`pill ${activeTab === 'connections' ? 'active' : ''}`} onClick={() => setActiveTab('connections')}>Connections</button>
              <button className={`pill ${activeTab === 'songs' ? 'active' : ''}`} onClick={() => setActiveTab('songs')}>Unified Songs ({syncedTracks.length})</button>
              <button className={`pill ${activeTab === 'playlists' ? 'active' : ''}`} onClick={() => setActiveTab('playlists')}>Playlists ({syncedPlaylists.length})</button>
              <button className={`pill ${activeTab === 'recommendations' ? 'active' : ''}`} onClick={() => setActiveTab('recommendations')}>Daily Mix & Recommendations</button>
            </div>
          )}

      {/* Connection Panel */}
      {currentTab === 'connections' && (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
          
          {/* Sync Dashboard Status */}
          <div style={{ background: 'rgba(255,255,255,0.03)', padding: '20px', borderRadius: '12px', border: '1px solid rgba(255,255,255,0.06)' }}>
            <h3 style={{ fontSize: '18px', fontWeight: 700, marginBottom: '12px', display: 'flex', alignItems: 'center', gap: '8px' }}>
              <RefreshCw size={18} className={isSyncing ? 'spin-anim' : ''} /> Synchronizer Dashboard
            </h3>
            
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '16px', marginBottom: '16px' }}>
              <div>
                <div style={{ fontSize: '12px', color: 'var(--yt-text-secondary)' }}>LAST SYNC TIME</div>
                <div style={{ fontWeight: 600, marginTop: '2px' }}>{lastSync}</div>
              </div>
              <div>
                <div style={{ fontSize: '12px', color: 'var(--yt-text-secondary)' }}>STATUS LOG</div>
                <div style={{ fontWeight: 600, marginTop: '2px', display: 'flex', alignItems: 'center', gap: '4px' }}>
                  {syncStatus === 'success' ? (
                    <span style={{ color: '#2e7d32', display: 'flex', alignItems: 'center', gap: '4px' }}><CheckCircle size={14} /> Synchronized</span>
                  ) : syncStatus === 'warning' ? (
                    <span style={{ color: '#f57c00', display: 'flex', alignItems: 'center', gap: '4px' }}><AlertTriangle size={14} /> Synced with Warnings</span>
                  ) : (
                    <span style={{ color: 'var(--yt-text-secondary)' }}>Unsynchronized</span>
                  )}
                </div>
              </div>
            </div>

            {isSyncing && (
              <div style={{ width: '100%', backgroundColor: 'rgba(255,255,255,0.05)', borderRadius: '4px', height: '6px', marginBottom: '16px', overflow: 'hidden' }}>
                <div style={{ width: `${syncProgress}%`, backgroundColor: 'var(--yt-accent)', height: '100%', transition: 'width 0.3s ease' }}></div>
              </div>
            )}

            <button 
              className="btn btn-primary" 
              onClick={handleSyncNow} 
              disabled={isSyncing || syncManager.isSyncing || (!googleConnected && !spotifyConnected && !appleConnected)}
              style={{ display: 'flex', alignItems: 'center', gap: '8px' }}
            >
              <RefreshCw size={14} /> {isSyncing ? `Syncing Catalog (${syncProgress}%)` : 'Sync Library Now'}
            </button>

            <div style={{ marginTop: '16px', display: 'flex', alignItems: 'center', gap: '8px' }}>
              <input 
                type="checkbox" 
                id="showOnlyMusicToggle" 
                checked={showOnlyMusic} 
                onChange={handleToggleShowOnlyMusic}
                style={{ cursor: 'pointer', width: '16px', height: '16px' }}
              />
              <label htmlFor="showOnlyMusicToggle" style={{ fontSize: '13px', color: 'var(--yt-text-secondary)', cursor: 'pointer', userSelect: 'none' }}>
                Show only Music Playlists (Heuristic Classification)
              </label>
            </div>

            {syncErrors.length > 0 && (
              <div style={{ marginTop: '16px', padding: '12px', background: 'rgba(244, 67, 54, 0.08)', border: '1px solid rgba(244, 67, 54, 0.2)', borderRadius: '8px', color: '#ff5252', fontSize: '13px' }}>
                <div style={{ fontWeight: 'bold', marginBottom: '4px', display: 'flex', alignItems: 'center', gap: '6px' }}>
                  <AlertTriangle size={14} /> Sync Errors & Warnings:
                </div>
                <ul style={{ paddingLeft: '20px', margin: 0, lineHeight: '1.4' }}>
                  {syncErrors.map((err, i) => <li key={i}>{err}</li>)}
                </ul>
              </div>
            )}
          </div>

          {/* Connection cards */}
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(320px, 1fr))', gap: '16px' }}>
            
            {/* Google / YouTube Account Card */}
            <div className="card" style={{ padding: '20px', borderRadius: '12px', background: 'rgba(255,255,255,0.02)', border: '1px solid rgba(255,255,255,0.05)' }}>
              <div style={{ display: 'flex', justifyItems: 'center', justifyContent: 'space-between', marginBottom: '16px' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                  <Disc size={28} style={{ color: '#ff0000' }} />
                  <div>
                    <h4 style={{ fontWeight: 700 }}>Google YouTube Account</h4>
                    <span style={{ fontSize: '11px', color: '#ff0000' }}>YouTube Playlists & Likes</span>
                  </div>
                </div>
                {googleConnected ? <Shield size={18} style={{ color: '#2e7d32' }} /> : <ShieldAlert size={18} style={{ color: 'var(--yt-text-secondary)' }} />}
              </div>
              
              {googleConnected ? (
                <div>
                  <div style={{ fontSize: '13px', color: 'var(--yt-text-secondary)', marginBottom: '16px' }}>Authorized & connected to fetch YouTube videos.</div>
                  <button className="btn btn-secondary" onClick={() => handleDisconnect('youtube')} style={{ color: '#ff5252' }}><Trash2 size={14} /> Disconnect Account</button>
                </div>
              ) : (
                <div>
                  <p style={{ fontSize: '13px', color: 'var(--yt-text-secondary)', marginBottom: '16px' }}>Official Google login handles this connection. Open profile menu top-right to log in.</p>
                </div>
              )}
            </div>

            {/* Spotify Account Card */}
            <div className="card" style={{ padding: '20px', borderRadius: '12px', background: 'rgba(255,255,255,0.02)', border: '1px solid rgba(255,255,255,0.05)' }}>
              <div style={{ display: 'flex', justifyItems: 'center', justifyContent: 'space-between', marginBottom: '16px' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                  <Music size={28} style={{ color: '#1db954' }} />
                  <div>
                    <h4 style={{ fontWeight: 700 }}>Spotify Web API</h4>
                    <span style={{ fontSize: '11px', color: '#1db954' }}>Spotify Playlists & Likes</span>
                  </div>
                </div>
                {spotifyConnected ? <Shield size={18} style={{ color: '#2e7d32' }} /> : <ShieldAlert size={18} style={{ color: 'var(--yt-text-secondary)' }} />}
              </div>

              {spotifyConnected ? (
                <div>
                  <div style={{ fontSize: '13px', color: 'var(--yt-text-secondary)', marginBottom: '16px' }}>Connected and importing Spotify libraries.</div>
                  <button className="btn btn-secondary" onClick={() => handleDisconnect('spotify')} style={{ color: '#ff5252' }}><Trash2 size={14} /> Disconnect API</button>
                </div>
              ) : (
                <div>
                  <div style={{ marginBottom: '16px' }}>
                    <label style={{ fontSize: '11px', color: 'var(--yt-text-secondary)', display: 'block', marginBottom: '4px' }}>Spotify Developer Client ID:</label>
                    <input 
                      type="text" 
                      className="modal-input" 
                      value={spotifyClientId} 
                      onChange={(e) => setSpotifyClientId(e.target.value)} 
                      style={{ height: '32px', fontSize: '12px', marginBottom: '0' }}
                    />
                  </div>
                  <button className="btn btn-primary" onClick={handleConnectSpotify} style={{ width: '100%' }}>Connect Spotify Web API</button>
                </div>
              )}
            </div>

            {/* Apple Music Account Card */}
            <div className="card" style={{ padding: '20px', borderRadius: '12px', background: 'rgba(255,255,255,0.02)', border: '1px solid rgba(255,255,255,0.05)' }}>
              <div style={{ display: 'flex', justifyItems: 'center', justifyContent: 'space-between', marginBottom: '16px' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                  <Disc size={28} style={{ color: '#fc3c44' }} />
                  <div>
                    <h4 style={{ fontWeight: 700 }}>Apple Music (MusicKit)</h4>
                    <span style={{ fontSize: '11px', color: '#fc3c44' }}>MusicKit SDK Playlists</span>
                  </div>
                </div>
                {appleConnected ? <Shield size={18} style={{ color: '#2e7d32' }} /> : <ShieldAlert size={18} style={{ color: 'var(--yt-text-secondary)' }} />}
              </div>

              {appleConnected ? (
                <div>
                  <div style={{ fontSize: '13px', color: 'var(--yt-text-secondary)', marginBottom: '16px' }}>Connected and importing Apple Music datasets.</div>
                  <button className="btn btn-secondary" onClick={() => handleDisconnect('applemusic')} style={{ color: '#ff5252' }}><Trash2 size={14} /> Disconnect Keys</button>
                </div>
              ) : (
                <div>
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '8px', marginBottom: '12px' }}>
                    <div>
                      <label style={{ fontSize: '10px', color: 'var(--yt-text-secondary)', display: 'block', marginBottom: '2px' }}>Developer Token (Private Key):</label>
                      <input 
                        type="password" 
                        className="modal-input" 
                        placeholder="Developer Key"
                        value={appleDevToken} 
                        onChange={(e) => setAppleDevToken(e.target.value)} 
                        style={{ height: '28px', fontSize: '11px', marginBottom: '0' }}
                      />
                    </div>
                    <div>
                      <label style={{ fontSize: '10px', color: 'var(--yt-text-secondary)', display: 'block', marginBottom: '2px' }}>Music User Token:</label>
                      <input 
                        type="password" 
                        className="modal-input" 
                        placeholder="User Token"
                        value={appleUserToken} 
                        onChange={(e) => setAppleUserToken(e.target.value)} 
                        style={{ height: '28px', fontSize: '11px', marginBottom: '0' }}
                      />
                    </div>
                  </div>
                  <button className="btn btn-primary" onClick={handleConnectApple} style={{ width: '100%' }}>Connect Apple MusicKit</button>
                  <p style={{ fontSize: '10px', color: 'var(--yt-text-secondary)', marginTop: '8px', lineHeight: '1.3' }}>
                    Note: If developer tokens are empty, Apple Music runs in **Mock Development Mode** for preview testing.
                  </p>
                </div>
              )}
            </div>

          </div>
        </div>
      )}

      {/* Unified Songs Tab */}
      {currentTab === 'songs' && (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
          {syncedTracks.length === 0 ? (
            <div style={{ color: 'var(--yt-text-secondary)', fontSize: '14px', padding: '24px 0' }}>
              Your unified music library is empty. Go to connections and sync your accounts!
            </div>
          ) : (
            syncedTracks.map((track) => (
              <div key={track.id} className="track-row" onClick={() => onPlayTrack(track)}>
                <img src={track.thumbnailUrl} className="track-row-img" alt={track.title} />
                <div className="track-row-info">
                  <div className="track-row-title">{track.title}</div>
                  <div className="track-row-subtitle">{track.artist} {track.album && `• ${track.album}`}</div>
                </div>
                <div className="track-row-right">
                  <div style={{ display: 'flex', gap: '4px', marginRight: '16px' }}>
                    {track.availableSources.map(src => {
                      const prefix = src.split(':')[0];
                      return (
                        <span key={src} style={{ 
                          fontSize: '9px', 
                          fontWeight: 'bold', 
                          padding: '2px 6px', 
                          borderRadius: '10px', 
                          backgroundColor: prefix === 'sp' ? 'rgba(29, 185, 84, 0.15)' : prefix === 'am' ? 'rgba(252, 60, 68, 0.15)' : 'rgba(255,0,0,0.15)',
                          color: prefix === 'sp' ? '#1db954' : prefix === 'am' ? '#fc3c44' : '#ff0000'
                        }}>
                          {prefix === 'sp' ? 'Spotify' : prefix === 'am' ? 'Apple' : 'YouTube'}
                        </span>
                      );
                    })}
                  </div>
                  <span style={{ fontSize: '12px' }}>{Math.floor(track.duration / 60)}:{(track.duration % 60).toString().padStart(2, '0')}</span>
                </div>
              </div>
            ))
          )}
        </div>
      )}

      {/* Synced Playlists */}
      {currentTab === 'playlists' && (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
          {displayedPlaylists.length === 0 ? (
            <div style={{ color: 'var(--yt-text-secondary)', fontSize: '14px', padding: '24px 0' }}>
              No synced playlists imported matching criteria. Ensure you sync connected accounts.
            </div>
          ) : (
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(180px, 1fr))', gap: '16px' }}>
              {displayedPlaylists.map((playlist) => (
                <div 
                  key={playlist.id} 
                  style={{ backgroundColor: 'rgba(255,255,255,0.03)', padding: '16px', borderRadius: '12px', cursor: 'pointer', border: '1px solid rgba(255,255,255,0.05)' }}
                  onClick={() => {
                    if (playlist.tracks.length > 0) onPlayTrack(playlist.tracks[0]);
                  }}
                >
                  <div style={{ width: '100%', aspectRatio: '1', borderRadius: '8px', backgroundColor: 'rgba(255,255,255,0.05)', display: 'flex', alignItems: 'center', justifyContent: 'center', overflow: 'hidden', marginBottom: '12px' }}>
                    {playlist.thumbnailUrl ? (
                      <img src={playlist.thumbnailUrl} alt={playlist.name} style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
                    ) : (
                      <Disc size={40} style={{ color: 'var(--yt-text-secondary)' }} />
                    )}
                  </div>
                  <div style={{ fontWeight: 700, fontSize: '15px', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{playlist.name}</div>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginTop: '4px' }}>
                    <span style={{ color: 'var(--yt-text-secondary)', fontSize: '12px' }}>{playlist.tracks.length} Songs</span>
                    <span style={{ 
                      fontSize: '9px', 
                      fontWeight: 'bold', 
                      padding: '2px 6px', 
                      borderRadius: '10px', 
                      backgroundColor: playlist.source === 'spotify' ? 'rgba(29, 185, 84, 0.15)' : playlist.source === 'applemusic' ? 'rgba(252, 60, 68, 0.15)' : 'rgba(255,0,0,0.15)',
                      color: playlist.source === 'spotify' ? '#1db954' : playlist.source === 'applemusic' ? '#fc3c44' : '#ff0000'
                    }}>
                      {playlist.source === 'spotify' ? 'Spotify' : playlist.source === 'applemusic' ? 'Apple' : 'YouTube'}
                    </span>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {/* Recommendations & Mixes */}
      {currentTab === 'recommendations' && (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '24px' }}>
          
          {/* Daily Mix */}
          {dailyMix && dailyMix.tracks.length > 0 && (
            <div>
              <h3 style={{ fontSize: '18px', fontWeight: 700, marginBottom: '12px', display: 'flex', alignItems: 'center', gap: '8px' }}>
                <Sparkles size={18} style={{ color: '#ffb300' }} /> Resonate Daily Mix
              </h3>
              <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                {dailyMix.tracks.slice(0, 5).map((track) => (
                  <div key={track.id} className="track-row" onClick={() => onPlayTrack(track)}>
                    <img src={track.thumbnailUrl} className="track-row-img" alt={track.title} />
                    <div className="track-row-info">
                      <div className="track-row-title">{track.title}</div>
                      <div className="track-row-subtitle">{track.artist}</div>
                    </div>
                    <div className="track-row-right">
                      <Play size={14} fill="#fff" />
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Continue Listening */}
          {continueListening.length > 0 && (
            <div>
              <h3 style={{ fontSize: '18px', fontWeight: 700, marginBottom: '12px', display: 'flex', alignItems: 'center', gap: '8px' }}>
                <RefreshCw size={18} /> Continue Listening
              </h3>
              <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                {continueListening.map((track) => (
                  <div key={track.id} className="track-row" onClick={() => onPlayTrack(track)}>
                    <img src={track.thumbnailUrl} className="track-row-img" alt={track.title} />
                    <div className="track-row-info">
                      <div className="track-row-title">{track.title}</div>
                      <div className="track-row-subtitle" style={{ color: 'var(--yt-accent)', fontWeight: 500 }}>{track.album || track.artist}</div>
                    </div>
                    <div className="track-row-right">
                      <Play size={14} fill="#fff" />
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Mood Mixes */}
          {moodMixes.length > 0 && (
            <div>
              <h3 style={{ fontSize: '18px', fontWeight: 700, marginBottom: '12px', display: 'flex', alignItems: 'center', gap: '8px' }}>
                <FolderHeart size={18} /> Mood Playlists
              </h3>
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(180px, 1fr))', gap: '16px' }}>
                {moodMixes.map((mix) => (
                  <div 
                    key={mix.id} 
                    style={{ backgroundColor: 'rgba(255,255,255,0.03)', padding: '16px', borderRadius: '12px', cursor: 'pointer', border: '1px solid rgba(255,255,255,0.05)' }}
                    onClick={() => {
                      if (mix.tracks.length > 0) onPlayTrack(mix.tracks[0]);
                    }}
                  >
                    <div style={{ width: '100%', aspectRatio: '1', borderRadius: '8px', backgroundColor: 'rgba(255,255,255,0.05)', display: 'flex', alignItems: 'center', justifyContent: 'center', overflow: 'hidden', marginBottom: '12px' }}>
                      <Disc size={40} style={{ color: 'var(--yt-text-secondary)' }} />
                    </div>
                    <div style={{ fontWeight: 700, fontSize: '15px' }}>{mix.name}</div>
                    <div style={{ color: 'var(--yt-text-secondary)', fontSize: '12px', marginTop: '4px' }}>{mix.tracks.length} Songs</div>
                  </div>
                ))}
              </div>
            </div>
          )}

        </div>
      )}
      </>
      )}
    </div>
  );
};
