import React from 'react';
import { Play, Trash2, Heart, Music, Sparkles } from 'lucide-react';
import type { Track, Playlist } from '../types';
import { 
  POPULAR_TRACKS,
  NOSTALGIC_SHELF,
  NEW_RELEASES_SHELF,
  COMMUNITY_PLAYLISTS,
  MUSIC_VIDEOS_SHELF,
  QUICK_PICKS_EXPANDED
} from '../utils/youtube';
import { PlaylistCover } from './PlaylistCover';

interface MainFeedProps {
  view: string;
  searchQuery: string;
  searchResults: Track[];
  playlists: Playlist[];
  selectedPlaylistId: string | null;
  likedTracks: Track[];
  onPlayTrack: (track: Track) => void;
  onAddTrackToPlaylist: (track: Track, playlistId: string) => void;
  onRemovePlaylist: (playlistId: string) => void;
  onRemoveTrackFromPlaylist: (playlistId: string, trackId: string) => void;
}

export const MainFeed: React.FC<MainFeedProps> = ({
  view,
  searchQuery,
  searchResults,
  playlists,
  selectedPlaylistId,
  likedTracks,
  onPlayTrack,
  onAddTrackToPlaylist,
  onRemovePlaylist,
  onRemoveTrackFromPlaylist,
}) => {
  const activePlaylist = playlists.find((p) => p.id === selectedPlaylistId);

  // Explore categories
  const exploreCategories = [
    { title: 'Chill & Relax', color: '#1db954' },
    { title: 'Workout Energy', color: '#ff5500' },
    { title: 'Focus & Study', color: '#0055ff' },
    { title: 'Classical Calm', color: '#aa3bff' },
  ];

  // Helper to format track duration
  const formatSecs = (secs: number) => {
    const m = Math.floor(secs / 60);
    const s = Math.floor(secs % 60).toString().padStart(2, '0');
    return `${m}:${s}`;
  };

  if (view === 'favourites') {
    return (
      <div>
        <div className="playlist-header">
          <div
            style={{
              width: '200px',
              height: '200px',
              backgroundColor: 'rgba(255, 228, 230, 0.05)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              borderRadius: '8px',
              boxShadow: '0 8px 24px rgba(225, 29, 72, 0.25)',
              border: '1px solid rgba(225, 29, 72, 0.15)',
            }}
          >
            <Heart size={72} fill="var(--yt-accent)" style={{ color: 'var(--yt-accent)' }} />
          </div>
          <div className="playlist-details">
            <div className="playlist-tag">Collection</div>
            <div className="playlist-name">Favourites</div>
            <div className="playlist-desc">Your personal list of liked tracks.</div>
            <div className="playlist-stats">
              {likedTracks.length} songs
            </div>
            <div style={{ marginTop: '16px', display: 'flex', gap: '12px' }}>
              <button
                className="btn btn-primary"
                onClick={() => {
                  if (likedTracks.length > 0) {
                    onPlayTrack(likedTracks[0]);
                  }
                }}
                disabled={likedTracks.length === 0}
              >
                Play
              </button>
            </div>
          </div>
        </div>

        <div className="home-section">
          {likedTracks.length === 0 ? (
            <div style={{ color: 'var(--yt-text-secondary)', fontSize: '14px', padding: '24px 0' }}>
              No liked tracks yet. Click the heart icon on any song to save it here!
            </div>
          ) : (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
              {likedTracks.map((track) => (
                <div key={track.id} className="track-row" onClick={() => onPlayTrack(track)}>
                  <img
                    src={track.thumbnailUrl}
                    className="track-row-img"
                    alt={track.title}
                  />
                  <div className="track-row-info">
                    <div className="track-row-title">{track.title}</div>
                    <div className="track-row-subtitle">{track.artist}</div>
                  </div>
                  <div className="track-row-right">
                    <Heart size={16} fill="var(--yt-accent)" style={{ color: 'var(--yt-accent)' }} />
                    <span style={{ fontSize: '12px', marginLeft: '8px' }}>{formatSecs(track.duration)}</span>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    );
  }

  if (view === 'home') {
    return (
      <div style={{ width: '100%', maxWidth: '100%' }}>
        {/* Pills container */}
        <div className="pills-container">
          <div className="pill active">Energize</div>
          <div className="pill">Relax</div>
          <div className="pill">Focus</div>
          <div className="pill">Commute</div>
          <div className="pill">Party</div>
        </div>

        {/* Listen Again Shelf */}
        <div className="home-section">
          <div className="section-title">
            <span>Listen Again</span>
          </div>
          <div className="shelf-scroll">
            {POPULAR_TRACKS.slice(0, 5).map((track) => (
              <div key={track.id} className="song-card" onClick={() => onPlayTrack(track)}>
                <div className="card-img-container">
                  <img src={track.thumbnailUrl} className="card-img" alt={track.title} />
                  <div className="play-hover-btn">
                    <Play size={20} fill="#fff" style={{ transform: 'translateX(1px)' }} />
                  </div>
                </div>
                <div className="card-title">{track.title}</div>
                <div className="card-subtitle">{track.artist}</div>
              </div>
            ))}
          </div>
        </div>

        {/* 1. Brb, Being Nostalgic! (Page 5 of PDF) */}
        <div className="home-section">
          <div className="section-title">
            <span>Brb, Being Nostalgic!</span>
          </div>
          <div className="shelf-scroll">
            {NOSTALGIC_SHELF.map((item) => (
              <div 
                key={item.id} 
                className="song-card"
                onClick={() => {
                  onPlayTrack({
                    id: item.id,
                    title: item.title,
                    artist: item.subtitle,
                    album: 'Nostalgic Classics',
                    duration: 260,
                    thumbnailUrl: item.thumbnailUrl,
                    lyrics: `[Enjoy listening to ${item.title} on Resonate!]`
                  });
                }}
              >
                <div className="card-img-container">
                  <img src={item.thumbnailUrl} className="card-img" alt={item.title} />
                  <div className="play-hover-btn">
                    <Play size={20} fill="#fff" style={{ transform: 'translateX(1px)' }} />
                  </div>
                </div>
                <div className="card-title">{item.title}</div>
                <div className="card-subtitle">{item.subtitle}</div>
              </div>
            ))}
          </div>
        </div>

        {/* 2. New Releases (Page 5 of PDF) */}
        <div className="home-section">
          <div className="section-title">
            <span>New releases</span>
          </div>
          <div className="shelf-scroll">
            {NEW_RELEASES_SHELF.map((track) => (
              <div key={track.id} className="song-card" onClick={() => onPlayTrack(track)}>
                <div className="card-img-container">
                  <img src={track.thumbnailUrl} className="card-img" alt={track.title} />
                  <div className="play-hover-btn">
                    <Play size={20} fill="#fff" style={{ transform: 'translateX(1px)' }} />
                  </div>
                </div>
                <div className="card-title">{track.title}</div>
                <div className="card-subtitle">{track.artist}</div>
              </div>
            ))}
          </div>
        </div>

        {/* 3. Trending Community Playlists (Page 6 of PDF with 2x2 Collage Covers) */}
        <div className="home-section">
          <div className="section-title">
            <span>Trending community playlists</span>
          </div>
          <div className="shelf-scroll">
            {COMMUNITY_PLAYLISTS.map((pl) => (
              <div 
                key={pl.id} 
                className="song-card"
                onClick={() => {
                  onPlayTrack({
                    id: pl.id,
                    title: pl.name,
                    artist: pl.creator,
                    duration: 240,
                    thumbnailUrl: pl.tracks[0].thumbnailUrl,
                    lyrics: `[Enjoy listening to ${pl.name}!]`
                  });
                }}
              >
                <div style={{ width: '100%', aspectRatio: '1', marginBottom: '10px' }}>
                  <PlaylistCover tracks={pl.tracks} size="100%" rounded="8px" />
                </div>
                <div className="card-title">{pl.name}</div>
                <div className="card-subtitle">{pl.creator}</div>
              </div>
            ))}
          </div>
        </div>

        {/* 4. Quick Picks (Page 7 of PDF) */}
        <div className="home-section">
          <div className="section-title">
            <span>Quick picks</span>
          </div>
          <div 
            style={{
              display: 'grid',
              gridTemplateColumns: 'repeat(auto-fill, minmax(280px, 1fr))',
              gap: '12px'
            }}
          >
            {QUICK_PICKS_EXPANDED.map((track) => (
              <div key={track.id} className="track-row" onClick={() => onPlayTrack(track)}>
                <img src={track.thumbnailUrl} className="track-row-img" alt={track.title} />
                <div className="track-row-info">
                  <div className="track-row-title">{track.title}</div>
                  <div className="track-row-subtitle">{track.artist}</div>
                </div>
                <div className="track-row-right">
                  <span style={{ fontSize: '12px' }}>{formatSecs(track.duration)}</span>
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* 5. Music Videos For You (Page 8 of PDF) */}
        <div className="home-section">
          <div className="section-title">
            <span>Music videos for you</span>
          </div>
          <div className="shelf-scroll">
            {MUSIC_VIDEOS_SHELF.map((video) => (
              <div 
                key={video.id} 
                style={{ width: '280px', flexShrink: 0, cursor: 'pointer' }}
                onClick={() => {
                  onPlayTrack({
                    id: video.id,
                    title: video.title,
                    artist: video.artist,
                    duration: video.duration,
                    thumbnailUrl: video.thumbnailUrl,
                    lyrics: `[Video Soundtrack: ${video.title}]`
                  });
                }}
              >
                <div style={{ position: 'relative', width: '100%', height: '160px', borderRadius: '12px', overflow: 'hidden', marginBottom: '10px', boxShadow: '0 8px 24px rgba(0,0,0,0.5)' }}>
                  <img src={video.thumbnailUrl} alt={video.title} style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
                  <div
                    style={{
                      position: 'absolute',
                      inset: 0,
                      backgroundColor: 'rgba(0,0,0,0.3)',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                    }}
                  >
                    <div style={{ width: '48px', height: '48px', borderRadius: '50%', backgroundColor: 'rgba(0,0,0,0.7)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                      <Play size={20} fill="#fff" style={{ transform: 'translateX(2px)' }} />
                    </div>
                  </div>
                  <div style={{ position: 'absolute', bottom: '8px', right: '8px', backgroundColor: 'rgba(0,0,0,0.8)', padding: '2px 6px', borderRadius: '4px', fontSize: '11px', fontWeight: 600 }}>
                    {formatSecs(video.duration)}
                  </div>
                </div>
                <div style={{ fontWeight: 700, fontSize: '14px', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                  {video.title}
                </div>
                <div style={{ fontSize: '12px', color: 'var(--yt-text-secondary)', marginTop: '2px' }}>
                  {video.artist} • {video.views}
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* 6. From Your Library (Page 7 of PDF) */}
        {playlists.length > 0 && (
          <div className="home-section">
            <div className="section-title">
              <span>From your library</span>
            </div>
            <div className="shelf-scroll">
              {playlists.map((playlist) => (
                <div 
                  key={playlist.id} 
                  className="song-card"
                  onClick={() => {
                    if (playlist.tracks.length > 0) onPlayTrack(playlist.tracks[0]);
                  }}
                >
                  <div style={{ width: '100%', aspectRatio: '1', marginBottom: '10px' }}>
                    <PlaylistCover tracks={playlist.tracks} size="100%" rounded="8px" />
                  </div>
                  <div className="card-title">{playlist.name}</div>
                  <div className="card-subtitle">{playlist.tracks.length} Songs</div>
                </div>
              ))}
            </div>
          </div>
        )}
      </div>
    );
  }

  if (view === 'explore') {
    return (
      <div>
        <h2 style={{ fontSize: '28px', marginBottom: '24px', fontWeight: 800 }}>Explore</h2>

        <div className="home-section">
          <div className="section-title">Moods & Genres</div>
          <div
            style={{
              display: 'grid',
              gridTemplateColumns: 'repeat(auto-fill, minmax(200px, 1fr))',
              gap: '16px',
            }}
          >
            {exploreCategories.map((cat, idx) => (
              <div
                key={idx}
                style={{
                  height: '110px',
                  borderRadius: '10px',
                  background: `linear-gradient(135deg, ${cat.color}, rgba(0,0,0,0.4))`,
                  padding: '16px',
                  cursor: 'pointer',
                  display: 'flex',
                  flexDirection: 'column',
                  justifyContent: 'space-between',
                  boxShadow: '0 4px 10px rgba(0,0,0,0.3)',
                  transition: 'transform 0.2s',
                }}
                className="category-card"
                onMouseEnter={(e) => (e.currentTarget.style.transform = 'scale(1.03)')}
                onMouseLeave={(e) => (e.currentTarget.style.transform = 'scale(1)')}
                onClick={() => {
                  // Play a random song from popular tracks as a mock for this genre
                  const randTrack = POPULAR_TRACKS[Math.floor(Math.random() * POPULAR_TRACKS.length)];
                  onPlayTrack(randTrack);
                }}
              >
                <Sparkles size={20} style={{ color: 'rgba(255,255,255,0.8)' }} />
                <div style={{ fontSize: '18px', fontWeight: 700 }}>{cat.title}</div>
              </div>
            ))}
          </div>
        </div>

        <div className="home-section">
          <div className="section-title">Trending Global Hits</div>
          <div className="quick-picks-grid">
            {POPULAR_TRACKS.map((track) => (
              <div key={track.id} className="track-row" onClick={() => onPlayTrack(track)}>
                <img src={track.thumbnailUrl} className="track-row-img" alt={track.title} />
                <div className="track-row-info">
                  <div className="track-row-title">{track.title}</div>
                  <div className="track-row-subtitle">{track.artist}</div>
                </div>
                <div className="track-row-right">
                  <span style={{ fontSize: '12px' }}>{formatSecs(track.duration)}</span>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>
    );
  }

  if (view === 'library') {
    return (
      <div>
        <h2 style={{ fontSize: '28px', marginBottom: '24px', fontWeight: 800 }}>Library</h2>

        <div className="home-section">
          <div className="section-title">
            <span>Liked Songs ({likedTracks.length})</span>
          </div>
          {likedTracks.length === 0 ? (
            <div style={{ color: 'var(--yt-text-secondary)', fontSize: '14px' }}>
              Your liked songs will show up here.
            </div>
          ) : (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
              {likedTracks.map((track) => (
                <div key={track.id} className="track-row" onClick={() => onPlayTrack(track)}>
                  <img src={track.thumbnailUrl} className="track-row-img" alt={track.title} />
                  <div className="track-row-info">
                    <div className="track-row-title">{track.title}</div>
                    <div className="track-row-subtitle">{track.artist}</div>
                  </div>
                  <div className="track-row-right">
                    <Heart size={16} fill="var(--yt-accent)" style={{ color: 'var(--yt-accent)' }} />
                    <span style={{ fontSize: '12px', marginLeft: '8px' }}>
                      {formatSecs(track.duration)}
                    </span>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        <div className="home-section">
          <div className="section-title">Playlists</div>
          {playlists.length === 0 ? (
            <div style={{ color: 'var(--yt-text-secondary)', fontSize: '14px' }}>
              No custom playlists created. Use "New Playlist" to create one.
            </div>
          ) : (
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(180px, 1fr))', gap: '16px' }}>
              {playlists.map((playlist) => (
                <div
                  key={playlist.id}
                  style={{
                    backgroundColor: 'rgba(255,255,255,0.03)',
                    padding: '16px',
                    borderRadius: '8px',
                    cursor: 'pointer',
                    boxShadow: '0 4px 10px rgba(0,0,0,0.2)',
                  }}
                  onClick={() => {
                    // Navigate to playlist detail view
                    onPlayTrack(playlist.tracks[0] || POPULAR_TRACKS[0]);
                  }}
                >
                  <div
                    style={{
                      width: '100%',
                      aspectRatio: '1',
                      borderRadius: '4px',
                      backgroundColor: '#2a2a2a',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      marginBottom: '12px',
                    }}
                  >
                    <Music size={40} style={{ color: 'var(--yt-text-secondary)' }} />
                  </div>
                  <div style={{ fontWeight: 600, fontSize: '15px' }}>{playlist.name}</div>
                  <div style={{ color: 'var(--yt-text-secondary)', fontSize: '12px', marginTop: '2px' }}>
                    {playlist.tracks.length} Songs
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    );
  }

  if (view === 'search') {
    return (
      <div>
        <h2 style={{ fontSize: '20px', marginBottom: '18px', color: 'var(--yt-text-secondary)' }}>
          Search results for "<span style={{ color: '#fff' }}>{searchQuery}</span>"
        </h2>

        {searchResults.length === 0 ? (
          <div style={{ color: 'var(--yt-text-secondary)', fontSize: '14px' }}>
            No songs found. Try querying another artist or title.
          </div>
        ) : (
          <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
            {searchResults.map((track) => (
              <div key={track.id} className="track-row">
                <img
                  src={track.thumbnailUrl}
                  className="track-row-img"
                  alt={track.title}
                  onClick={() => onPlayTrack(track)}
                />
                <div className="track-row-info" onClick={() => onPlayTrack(track)}>
                  <div className="track-row-title">{track.title}</div>
                  <div className="track-row-subtitle">{track.artist}</div>
                </div>

                <div className="track-row-right">
                  {playlists.length > 0 && (
                    <div style={{ position: 'relative' }}>
                      <select
                        onChange={(e) => {
                          if (e.target.value) {
                            onAddTrackToPlaylist(track, e.target.value);
                            e.target.value = '';
                          }
                        }}
                        style={{
                          background: 'rgba(255,255,255,0.08)',
                          color: '#fff',
                          border: 'none',
                          padding: '6px 12px',
                          borderRadius: '16px',
                          fontSize: '12px',
                          cursor: 'pointer',
                          outline: 'none',
                        }}
                      >
                        <option value="">Add to playlist...</option>
                        {playlists.map((p) => (
                          <option key={p.id} value={p.id}>
                            {p.name}
                          </option>
                        ))}
                      </select>
                    </div>
                  )}
                  <span style={{ fontSize: '12px' }}>{formatSecs(track.duration)}</span>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    );
  }

  if (view === 'playlist' && activePlaylist) {
    return (
      <div>
        <div className="playlist-header">
          <div
            style={{
              width: '200px',
              height: '200px',
              backgroundColor: 'rgba(255,255,255,0.05)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              borderRadius: '8px',
              boxShadow: '0 8px 24px rgba(0,0,0,0.4)',
            }}
          >
            <Music size={72} style={{ color: 'var(--yt-accent)' }} />
          </div>
          <div className="playlist-details">
            <div className="playlist-tag">Playlist</div>
            <div className="playlist-name">{activePlaylist.name}</div>
            <div className="playlist-desc">{activePlaylist.description || 'Custom playlist'}</div>
            <div className="playlist-stats">
              {activePlaylist.tracks.length} songs • Created {new Date(activePlaylist.createdAt).toLocaleDateString()}
            </div>
            <div style={{ marginTop: '16px', display: 'flex', gap: '12px' }}>
              <button
                className="btn btn-primary"
                onClick={() => {
                  if (activePlaylist.tracks.length > 0) {
                    onPlayTrack(activePlaylist.tracks[0]);
                  }
                }}
                disabled={activePlaylist.tracks.length === 0}
              >
                Play
              </button>
              <button
                className="btn btn-secondary"
                onClick={() => onRemovePlaylist(activePlaylist.id)}
                style={{ display: 'flex', alignItems: 'center', gap: '6px' }}
              >
                <Trash2 size={16} /> Delete Playlist
              </button>
            </div>
          </div>
        </div>

        <div className="home-section">
          {activePlaylist.tracks.length === 0 ? (
            <div style={{ color: 'var(--yt-text-secondary)', fontSize: '14px', padding: '24px 0' }}>
              No tracks in this playlist. Search for songs and click "Add to playlist..." to fill it!
            </div>
          ) : (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
              {activePlaylist.tracks.map((track) => (
                <div key={track.id} className="track-row">
                  <img
                    src={track.thumbnailUrl}
                    className="track-row-img"
                    alt={track.title}
                    onClick={() => onPlayTrack(track)}
                  />
                  <div className="track-row-info" onClick={() => onPlayTrack(track)}>
                    <div className="track-row-title">{track.title}</div>
                    <div className="track-row-subtitle">{track.artist}</div>
                  </div>
                  <div className="track-row-right">
                    <button
                      className="icon-btn"
                      onClick={() => onRemoveTrackFromPlaylist(activePlaylist.id, track.id)}
                      style={{ color: 'rgba(255,255,255,0.4)' }}
                    >
                      <Trash2 size={14} />
                    </button>
                    <span style={{ fontSize: '12px' }}>{formatSecs(track.duration)}</span>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    );
  }

  return null;
};
