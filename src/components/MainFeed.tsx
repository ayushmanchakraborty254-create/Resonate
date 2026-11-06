import React, { useState } from 'react';
import { 
  Play, Trash2, Heart, Music, Sparkles, Flame, Radio, Disc, Compass,
  CheckCircle, ArrowUpDown, MoreVertical, Plus, Cloud, TrendingUp, RefreshCw, Search, List
} from 'lucide-react';
import type { Track, Playlist } from '../types';
import { useBreakpoint } from '../utils/responsive';
import { 
  POPULAR_TRACKS,
  SPEED_DIAL_ITEMS,
  NOSTALGIC_SHELF,
  NEW_RELEASES_SHELF,
  COMMUNITY_PLAYLISTS,
  MUSIC_VIDEOS_SHELF,
  QUICK_PICKS_EXPANDED
} from '../utils/youtube';
import { PlaylistCover } from './PlaylistCover';
import { ArtisticCover } from './ArtisticCover';

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
  onCreatePlaylist?: () => void;
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
  onCreatePlaylist,
}) => {
  const { isMobile } = useBreakpoint();
  const activePlaylist = playlists.find((p) => p.id === selectedPlaylistId);
  const [selectedMood, setSelectedMood] = useState('Podcasts');

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
        {/* Interactive Mood Filter Pills (Reference Match: Image 5) */}
        <div className="pills-container">
          {['Podcasts', 'Romance', 'Relax', 'Feel good', 'Sleep', 'Energize', 'Focus', 'Party'].map((pill) => (
            <div
              key={pill}
              className={`pill ${selectedMood === pill ? 'active' : ''}`}
              onClick={() => setSelectedMood(pill)}
              style={{ cursor: 'pointer', userSelect: 'none' }}
            >
              {pill}
            </div>
          ))}
        </div>

        {/* Speed Dial 3x3 Grid (Reference Match: Image 5) */}
        <div className="home-section" style={{ marginBottom: '24px' }}>
          <div className="section-title" style={{ marginBottom: '12px' }}>
            <span style={{ fontSize: '20px', fontWeight: 800, color: '#93c5fd' }}>
              Speed dial
            </span>
          </div>

          <div
            style={{
              display: 'grid',
              gridTemplateColumns: 'repeat(auto-fill, minmax(115px, 1fr))',
              gap: '12px'
            }}
          >
            {SPEED_DIAL_ITEMS.map((track) => (
              <div
                key={track.id}
                onClick={() => onPlayTrack(track)}
                style={{
                  position: 'relative',
                  aspectRatio: '1',
                  borderRadius: '10px',
                  overflow: 'hidden',
                  cursor: 'pointer',
                  boxShadow: '0 4px 14px rgba(0,0,0,0.5)',
                  border: '1px solid rgba(255,255,255,0.08)',
                  backgroundColor: '#181a20'
                }}
              >
                <img
                  src={track.thumbnailUrl}
                  alt={track.title}
                  style={{ width: '100%', height: '100%', objectFit: 'cover' }}
                />
                <div
                  style={{
                    position: 'absolute',
                    inset: 0,
                    background: 'linear-gradient(to top, rgba(0,0,0,0.85) 0%, rgba(0,0,0,0.1) 60%, transparent 100%)',
                    display: 'flex',
                    alignItems: 'flex-end',
                    padding: '8px 6px'
                  }}
                >
                  <span
                    style={{
                      fontSize: '11px',
                      fontWeight: 700,
                      color: '#fff',
                      lineHeight: '1.25',
                      display: '-webkit-box',
                      WebkitLineClamp: 2,
                      WebkitBoxOrient: 'vertical',
                      overflow: 'hidden'
                    }}
                  >
                    {track.title}
                  </span>
                </div>
              </div>
            ))}
          </div>

          {/* Dots Indicator */}
          <div style={{ display: 'flex', justifyContent: 'center', gap: '6px', marginTop: '12px' }}>
            <div style={{ width: '6px', height: '6px', borderRadius: '50%', background: '#fff' }} />
            <div style={{ width: '6px', height: '6px', borderRadius: '50%', background: 'rgba(255,255,255,0.3)' }} />
            <div style={{ width: '6px', height: '6px', borderRadius: '50%', background: 'rgba(255,255,255,0.3)' }} />
          </div>
        </div>

        {/* Quick picks (Reference Match: Image 5) */}
        <div className="home-section" style={{ marginBottom: '24px' }}>
          <div className="section-title" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '14px', paddingRight: isMobile ? '64px' : '0' }}>
            <span style={{ fontSize: '20px', fontWeight: 800, color: '#93c5fd' }}>
              Quick picks
            </span>
            <button
              onClick={() => onPlayTrack(QUICK_PICKS_EXPANDED[0])}
              style={{
                background: 'rgba(255,255,255,0.08)',
                border: '1px solid rgba(255,255,255,0.15)',
                color: '#fff',
                borderRadius: '16px',
                padding: '5px 12px',
                fontSize: '12px',
                fontWeight: 600,
                cursor: 'pointer'
              }}
            >
              Play all
            </button>
          </div>

          <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
            {QUICK_PICKS_EXPANDED.slice(0, 4).map((track) => (
              <div 
                key={track.id} 
                className="track-row" 
                onClick={() => onPlayTrack(track)}
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: '12px',
                  padding: '8px 10px',
                  borderRadius: '10px',
                  background: 'rgba(255,255,255,0.02)',
                  cursor: 'pointer'
                }}
              >
                <img 
                  src={track.thumbnailUrl} 
                  alt={track.title} 
                  style={{ width: '48px', height: '48px', borderRadius: '6px', objectFit: 'cover' }} 
                />
                <div style={{ flex: 1, minWidth: 0 }}>
                  <div style={{ fontWeight: 600, fontSize: '15px', color: '#fff', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                    {track.title}
                  </div>
                  <div style={{ fontSize: '13px', color: 'rgba(255,255,255,0.55)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                    {track.artist}
                  </div>
                </div>
                <MoreVertical size={18} style={{ color: 'rgba(255,255,255,0.4)' }} />
              </div>
            ))}
          </div>
        </div>

        {/* Listen Again Shelf */}
        <div className="home-section">
          <div className="section-title">
            <span style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
              <Sparkles size={18} style={{ color: '#fbbf24' }} />
              Listen Again
            </span>
          </div>
          <div className="shelf-scroll">
            {POPULAR_TRACKS.slice(0, 5).map((track) => (
              <div key={track.id} className="song-card" onClick={() => onPlayTrack(track)}>
                <ArtisticCover
                  title={track.title}
                  subtitle={track.artist}
                  thumbnailUrl={track.thumbnailUrl}
                  tag="POPULAR"
                  size="100%"
                  rounded="10px"
                  showVinyl={true}
                />
                <div className="card-title">{track.title}</div>
                <div className="card-subtitle">{track.artist}</div>
              </div>
            ))}
          </div>
        </div>

        {/* 1. Brb, Being Nostalgic! (Page 5 of PDF) */}
        <div className="home-section">
          <div className="section-title">
            <span style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
              <Flame size={18} style={{ color: '#f43f5e' }} />
              Brb, Being Nostalgic!
            </span>
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
                    tag: item.tag,
                    gradient: item.gradient,
                    accentColor: item.accentColor,
                    lyrics: `[Enjoy listening to ${item.title} on Resonate!]`
                  });
                }}
              >
                <ArtisticCover
                  title={item.title}
                  subtitle={item.subtitle}
                  thumbnailUrl={item.thumbnailUrl}
                  tag={item.tag}
                  gradient={item.gradient}
                  accentColor={item.accentColor}
                  size="100%"
                  rounded="10px"
                  showVinyl={true}
                />
                <div className="card-title">{item.title}</div>
                <div className="card-subtitle">{item.subtitle}</div>
              </div>
            ))}
          </div>
        </div>

        {/* 2. New Releases (Page 5 of PDF) */}
        <div className="home-section">
          <div className="section-title">
            <span style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
              <Disc size={18} style={{ color: '#38bdf8' }} />
              New releases
            </span>
          </div>
          <div className="shelf-scroll">
            {NEW_RELEASES_SHELF.map((track) => (
              <div key={track.id} className="song-card" onClick={() => onPlayTrack(track)}>
                <ArtisticCover
                  title={track.title}
                  subtitle={track.artist}
                  thumbnailUrl={track.thumbnailUrl}
                  tag={track.tag}
                  gradient={track.gradient}
                  accentColor={track.accentColor}
                  size="100%"
                  rounded="10px"
                  showVinyl={true}
                />
                <div className="card-title">{track.title}</div>
                <div className="card-subtitle">{track.artist}</div>
              </div>
            ))}
          </div>
        </div>

        {/* 3. Trending Community Playlists (Page 6 of PDF with 2x2 Collage Covers) */}
        <div className="home-section">
          <div className="section-title">
            <span style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
              <Radio size={18} style={{ color: '#a855f7' }} />
              Trending community playlists
            </span>
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
                  <PlaylistCover
                    tracks={pl.tracks}
                    name={pl.name}
                    creator={pl.creator}
                    size="100%"
                    rounded="10px"
                  />
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
            <span style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
              <Compass size={18} style={{ color: '#10b981' }} />
              Quick picks
            </span>
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
                <div
                  style={{
                    width: '48px',
                    height: '48px',
                    borderRadius: '6px',
                    overflow: 'hidden',
                    flexShrink: 0,
                    backgroundColor: 'rgba(255, 255, 255, 0.08)',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                  }}
                >
                  <img
                    src={track.thumbnailUrl}
                    className="track-row-img"
                    alt={track.title}
                    style={{ width: '100%', height: '100%', objectFit: 'cover' }}
                    onError={(e) => {
                      (e.currentTarget as HTMLImageElement).style.display = 'none';
                    }}
                  />
                </div>
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
                  <img
                    src={video.thumbnailUrl}
                    alt={video.title}
                    style={{ width: '100%', height: '100%', objectFit: 'cover' }}
                    onError={(e) => {
                      (e.currentTarget as HTMLImageElement).src = 'https://images.unsplash.com/photo-1511671782779-c97d3d27a1d4?w=500&auto=format&fit=crop&q=80';
                    }}
                  />
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
                    <PlaylistCover
                      tracks={playlist.tracks}
                      name={playlist.name}
                      creator={`${playlist.tracks.length} Songs`}
                      size="100%"
                      rounded="10px"
                    />
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
    const libraryFilterChips = ['Playlists', 'Songs', 'Albums', 'Artists', 'Podcasts'];

    const quickActions = [
      { id: 'liked', label: 'Liked', icon: Heart, count: `${likedTracks.length} ${likedTracks.length === 1 ? 'song' : 'songs'}`, color: '#f43f5e' },
      { id: 'downloaded', label: 'Downloaded', icon: CheckCircle, count: '0 offline', color: '#10b981' },
      { id: 'cached', label: 'Cached', icon: RefreshCw, count: '0 cached', color: '#06b6d4' },
      { id: 'top50', label: 'My Top 50', icon: TrendingUp, count: 'Frequently played', color: '#f59e0b' },
      { id: 'uploaded', label: 'Uploaded', icon: Cloud, count: '0 songs', color: '#8b5cf6' },
    ];

    return (
      <div style={{ paddingBottom: '120px' }}>
        {/* Category Filter Chips Carousel (Reference Image 4) */}
        <div className="pills-container" style={{ marginBottom: '16px' }}>
          {libraryFilterChips.map((chip, idx) => (
            <div
              key={chip}
              className={`pill ${idx === 0 ? 'active' : ''}`}
              style={{ cursor: 'pointer', userSelect: 'none' }}
            >
              {chip}
            </div>
          ))}
        </div>

        {/* Sort and View Mode Bar */}
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '4px 0 16px 0', borderBottom: '1px solid rgba(255,255,255,0.06)', marginBottom: '18px' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '6px', fontSize: '14px', fontWeight: 600, color: '#93c5fd', cursor: 'pointer' }}>
            <span>Date added</span>
            <ArrowUpDown size={14} />
          </div>
          <div style={{ display: 'flex', alignItems: 'center', gap: '14px', color: 'rgba(255,255,255,0.6)' }}>
            <Search size={18} style={{ cursor: 'pointer' }} />
            <List size={18} style={{ cursor: 'pointer' }} />
          </div>
        </div>

        {/* Quick Action Cards (Reference Image 4) */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: '10px', marginBottom: '24px' }}>
          {quickActions.map((action) => {
            const Icon = action.icon;
            return (
              <div
                key={action.id}
                onClick={() => {
                  if (action.id === 'liked' && likedTracks.length > 0) {
                    onPlayTrack(likedTracks[0]);
                  }
                }}
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: '16px',
                  padding: '10px 14px',
                  borderRadius: '12px',
                  backgroundColor: 'rgba(255,255,255,0.03)',
                  border: '1px solid rgba(255,255,255,0.06)',
                  cursor: 'pointer'
                }}
              >
                <div
                  style={{
                    width: '44px',
                    height: '44px',
                    borderRadius: '10px',
                    backgroundColor: 'rgba(255,255,255,0.05)',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    color: action.color
                  }}
                >
                  <Icon size={22} fill={action.id === 'liked' ? action.color : 'none'} />
                </div>
                <div style={{ flex: 1 }}>
                  <div style={{ fontWeight: 600, fontSize: '15px', color: '#fff' }}>{action.label}</div>
                  <div style={{ fontSize: '12px', color: 'rgba(255,255,255,0.5)', marginTop: '2px' }}>
                    {action.count}
                  </div>
                </div>
              </div>
            );
          })}
        </div>

        {/* Playlists List with Artwork (Reference Image 4) */}
        <div style={{ marginBottom: '24px' }}>
          {playlists.length === 0 ? (
            <div
              style={{
                textAlign: 'center',
                padding: '36px 16px',
                background: 'rgba(255, 255, 255, 0.02)',
                borderRadius: '14px',
                border: '1px dashed rgba(255, 255, 255, 0.1)',
              }}
            >
              <Music size={32} style={{ color: 'rgba(255, 255, 255, 0.3)', margin: '0 auto 10px auto' }} />
              <div style={{ fontWeight: 600, fontSize: '15px', color: '#fff' }}>No custom playlists yet</div>
              <div
                style={{
                  fontSize: '12px',
                  color: 'rgba(255, 255, 255, 0.5)',
                  marginTop: '4px',
                  maxWidth: '280px',
                  margin: '4px auto 16px auto',
                }}
              >
                Create your first playlist using the + button below or sync with YouTube / Spotify.
              </div>
              {onCreatePlaylist && (
                <button
                  className="btn btn-primary"
                  onClick={onCreatePlaylist}
                  style={{ padding: '8px 20px', borderRadius: '20px', fontSize: '13px', fontWeight: 600 }}
                >
                  Create Playlist
                </button>
              )}
            </div>
          ) : (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
              {playlists.map((playlist) => (
                <div
                  key={playlist.id}
                  onClick={() => onPlayTrack(playlist.tracks[0] || POPULAR_TRACKS[0])}
                  style={{
                    display: 'flex',
                    alignItems: 'center',
                    gap: '14px',
                    padding: '10px 12px',
                    borderRadius: '10px',
                    background: 'rgba(255, 255, 255, 0.02)',
                    cursor: 'pointer',
                  }}
                >
                  <div
                    style={{
                      width: '48px',
                      height: '48px',
                      borderRadius: '8px',
                      overflow: 'hidden',
                      flexShrink: 0,
                      backgroundColor: '#222',
                    }}
                  >
                    <PlaylistCover
                      tracks={
                        playlist.tracks.length > 0
                          ? playlist.tracks
                          : [{ thumbnailUrl: POPULAR_TRACKS[0].thumbnailUrl }]
                      }
                      name={playlist.name}
                      size="100%"
                      rounded="8px"
                    />
                  </div>
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <div
                      style={{
                        fontWeight: 600,
                        fontSize: '15px',
                        color: '#fff',
                        overflow: 'hidden',
                        textOverflow: 'ellipsis',
                        whiteSpace: 'nowrap',
                      }}
                    >
                      {playlist.name}
                    </div>
                    <div style={{ fontSize: '13px', color: 'rgba(255, 255, 255, 0.55)', marginTop: '2px' }}>
                      {playlist.tracks.length} songs
                    </div>
                  </div>
                  <MoreVertical size={18} style={{ color: 'rgba(255, 255, 255, 0.4)' }} />
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Floating Action Button: + Create Playlist (Reference Image 4) */}
        {onCreatePlaylist && (
          <button
            onClick={onCreatePlaylist}
            style={{
              position: 'fixed',
              bottom: '145px',
              right: '20px',
              width: '52px',
              height: '52px',
              borderRadius: '16px',
              backgroundColor: '#3b5478',
              color: '#fff',
              border: 'none',
              boxShadow: '0 8px 24px rgba(0, 0, 0, 0.5)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              cursor: 'pointer',
              zIndex: 60
            }}
            title="Create Playlist"
          >
            <Plus size={24} />
          </button>
        )}
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
