import React, { useState, useEffect } from 'react';
import { ArrowLeft, Search, Play, X, TrendingUp } from 'lucide-react';
import { PlaylistCover } from './PlaylistCover';
import { db } from '../utils/db';
import { POPULAR_TRACKS } from '../utils/youtube';
import type { Track, Playlist } from '../types';

interface StatsModalProps {
  isOpen: boolean;
  onClose: () => void;
  onPlayTrackImmediate: (track: Track) => void;
  playlists?: Playlist[];
  likedTracks?: Track[];
}

interface ComputedSongStat {
  rank: number;
  track: Track;
  plays: number;
  listenTime: string;
}

interface ComputedArtistStat {
  rank: number;
  name: string;
  plays: string;
  avatarUrl: string;
}

export const StatsModal: React.FC<StatsModalProps> = ({
  isOpen,
  onClose,
  onPlayTrackImmediate,
  playlists = [],
}) => {
  const [timeframe, setTimeframe] = useState<'Continuous' | '1 week' | '1 month' | '3 months' | '6 months'>('Continuous');
  const [topSongs, setTopSongs] = useState<ComputedSongStat[]>([]);
  const [topArtists, setTopArtists] = useState<ComputedArtistStat[]>([]);
  const [topPlaylists, setTopPlaylists] = useState<Array<{ id: string; name: string; tracks: Track[] }>>([]);

  const [totalListeningMinutes, setTotalListeningMinutes] = useState(0);

  // Calculate dynamic stats based on chosen timeframe and user listening history
  const loadStats = async () => {
    try {
      const history: Array<{ trackId: string; timestamp: number; duration: number }> = await db.getAll('history');
      const metrics: Array<{ id: string; playCount: number; totalListeningTime: number; lastPlayed: number }> = await db.getAll('metrics');
      const allCachedTracks: Track[] = await db.getAll('tracks');

      // Also incorporate localStorage history for real-time immediate updates
      const rawLocal = localStorage.getItem('resonate_history');
      const localHistory: Array<Track & { playedAt?: number }> = rawLocal ? JSON.parse(rawLocal) : [];

      // 1. Timeframe Cutoff Filter
      const now = Date.now();
      let cutoffTime = 0;
      if (timeframe === '1 week') cutoffTime = now - 7 * 86400 * 1000;
      else if (timeframe === '1 month') cutoffTime = now - 30 * 86400 * 1000;
      else if (timeframe === '3 months') cutoffTime = now - 90 * 86400 * 1000;
      else if (timeframe === '6 months') cutoffTime = now - 180 * 86400 * 1000;

      // Filter history sessions within cutoff
      const filteredHistory = history.filter((h) => h.timestamp >= cutoffTime);

      // Track play frequency map
      const trackPlayMap: Record<string, { plays: number; totalTime: number; trackMeta?: Track }> = {};
      
      // Merge IndexedDB history
      filteredHistory.forEach((item) => {
        if (!trackPlayMap[item.trackId]) {
          trackPlayMap[item.trackId] = { plays: 0, totalTime: 0 };
        }
        trackPlayMap[item.trackId].plays += 1;
        trackPlayMap[item.trackId].totalTime += item.duration || 180;
      });

      // Merge localStorage real played tracks
      localHistory.forEach((t) => {
        if (!t.playedAt || t.playedAt >= cutoffTime) {
          if (!trackPlayMap[t.id]) {
            trackPlayMap[t.id] = { plays: 1, totalTime: t.duration || 180, trackMeta: t };
          } else {
            trackPlayMap[t.id].plays += 1;
            trackPlayMap[t.id].totalTime += t.duration || 180;
            if (!trackPlayMap[t.id].trackMeta) trackPlayMap[t.id].trackMeta = t;
          }
        }
      });

      // Also merge all-time metrics if continuous or if history is fresh
      metrics.forEach((m) => {
        if (m.lastPlayed >= cutoffTime) {
          if (!trackPlayMap[m.id]) {
            trackPlayMap[m.id] = { plays: m.playCount || 1, totalTime: m.totalListeningTime || 180 };
          } else {
            trackPlayMap[m.id].plays = Math.max(trackPlayMap[m.id].plays, m.playCount || 1);
            trackPlayMap[m.id].totalTime = Math.max(trackPlayMap[m.id].totalTime, m.totalListeningTime || 180);
          }
        }
      });

      // Calculate total listening minutes
      let totalSecs = 0;
      Object.values(trackPlayMap).forEach((st) => { totalSecs += st.totalTime; });
      setTotalListeningMinutes(Math.round(totalSecs / 60));

      // Find Track Metadata lookup
      const findTrack = (id: string): Track => {
        if (trackPlayMap[id]?.trackMeta) return trackPlayMap[id].trackMeta!;
        const found = allCachedTracks.find((t) => t.id === id || t.id.endsWith(id)) ||
                      localHistory.find((t) => t.id === id) ||
                      POPULAR_TRACKS.find((t) => t.id === id);
        if (found) return found;
        return {
          id,
          title: `Track #${id.slice(0, 8)}`,
          artist: 'Popular Artist',
          duration: 210,
          thumbnailUrl: 'https://images.unsplash.com/photo-1514525253161-7a46d19cd819?w=300&auto=format&fit=crop&q=80',
          lyrics: `[Enjoy listening on Resonate!]`
        };
      };

      const formatDuration = (secs: number) => {
        const m = Math.floor(secs / 60);
        const s = Math.floor(secs % 60).toString().padStart(2, '0');
        return `${m}:${s}`;
      };

      // 2. Compute Top Songs
      const sortedTrackIds = Object.keys(trackPlayMap).sort(
        (a, b) => trackPlayMap[b].plays - trackPlayMap[a].plays
      );

      let computedSongs: ComputedSongStat[] = sortedTrackIds.slice(0, 10).map((id, index) => {
        const tr = findTrack(id);
        const stat = trackPlayMap[id];
        return {
          rank: index + 1,
          track: tr,
          plays: stat.plays,
          listenTime: formatDuration(stat.totalTime),
        };
      });

      // If user is brand new and has played few tracks, merge with popular listening tracks so charts are active
      if (computedSongs.length < 3) {
        const sampleTracks = POPULAR_TRACKS.slice(0, 6);
        const baseline = sampleTracks.map((tr, idx) => ({
          rank: computedSongs.length + idx + 1,
          track: tr,
          plays: Math.max(1, 5 - idx),
          listenTime: formatDuration(tr.duration * Math.max(1, 5 - idx)),
        }));
        computedSongs = [...computedSongs, ...baseline].slice(0, 6);
      }

      setTopSongs(computedSongs);

      // 3. Compute Top Artists
      const artistMap: Record<string, { plays: number; totalTime: number; avatar: string }> = {};
      computedSongs.forEach((item) => {
        const artist = item.track.artist || 'Unknown Artist';
        if (!artistMap[artist]) {
          artistMap[artist] = { plays: 0, totalTime: 0, avatar: item.track.thumbnailUrl };
        }
        artistMap[artist].plays += item.plays;
        artistMap[artist].totalTime += item.track.duration * item.plays;
      });

      const sortedArtists = Object.keys(artistMap)
        .sort((a, b) => artistMap[b].plays - artistMap[a].plays)
        .slice(0, 6);

      const computedArtists: ComputedArtistStat[] = sortedArtists.map((name, idx) => ({
        rank: idx + 1,
        name,
        plays: `${artistMap[name].plays} times • ${formatDuration(artistMap[name].totalTime)}`,
        avatarUrl: artistMap[name].avatar,
      }));

      setTopArtists(computedArtists);

      // 4. Compute Top Playlists with 2x2 Collage Covers
      const userAndTopPlaylists: Array<{ id: string; name: string; tracks: Track[] }> = [];

      // Include user's playlists if available
      if (playlists.length > 0) {
        playlists.slice(0, 3).forEach((pl) => {
          userAndTopPlaylists.push({
            id: pl.id,
            name: pl.name,
            tracks: pl.tracks,
          });
        });
      }

      // Add Weekly Most & Monthly Most (matching Page 4 of PDF)
      userAndTopPlaylists.push(
        {
          id: 'weekly-most',
          name: 'Weekly Most',
          tracks: computedSongs.slice(0, 4).map((s) => s.track),
        },
        {
          id: 'monthly-most',
          name: 'Monthly Most',
          tracks: POPULAR_TRACKS.slice(2, 6),
        }
      );

      setTopPlaylists(userAndTopPlaylists.slice(0, 4));
    } catch (e) {
      console.warn('Failed to compute listening stats:', e);
    }
  };

  useEffect(() => {
    if (isOpen) {
      loadStats();
    }
  }, [isOpen, timeframe, playlists]);

  if (!isOpen) return null;

  const timeframes: Array<'Continuous' | '1 week' | '1 month' | '3 months' | '6 months'> = [
    'Continuous',
    '1 week',
    '1 month',
    '3 months',
    '6 months',
  ];

  const handlePlayAll = () => {
    if (topSongs.length > 0) {
      onPlayTrackImmediate(topSongs[0].track);
      onClose();
    }
  };

  return (
    <div
      style={{
        position: 'fixed',
        inset: 0,
        zIndex: 1000,
        backgroundColor: '#0a0a0a',
        display: 'flex',
        flexDirection: 'column',
        color: '#fff',
        userSelect: 'none',
        overflowY: 'auto',
      }}
    >
      {/* Header */}
      <div
        style={{
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          padding: '20px 24px',
          borderBottom: '1px solid rgba(255,255,255,0.05)',
        }}
      >
        <button
          onClick={onClose}
          style={{
            background: 'none',
            border: 'none',
            color: '#fff',
            cursor: 'pointer',
            display: 'flex',
            alignItems: 'center',
            gap: '12px',
            fontSize: '18px',
            fontWeight: 700,
          }}
        >
          <ArrowLeft size={22} />
          <span>Stats & Insights</span>
        </button>

        <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
          <button style={{ background: 'none', border: 'none', color: '#fff', cursor: 'pointer', padding: '6px' }}>
            <Search size={18} />
          </button>
          <button onClick={onClose} style={{ background: 'none', border: 'none', color: '#fff', cursor: 'pointer', padding: '6px' }}>
            <X size={20} />
          </button>
        </div>
      </div>

      {/* Main Container */}
      <div style={{ flex: 1, padding: '24px 32px', maxWidth: '880px', margin: '0 auto', width: '100%' }}>
        {/* Timeframe Filter Pills */}
        <div style={{ display: 'flex', gap: '8px', overflowX: 'auto', paddingBottom: '16px', marginBottom: '28px' }}>
          {timeframes.map((tf) => (
            <button
              key={tf}
              onClick={() => setTimeframe(tf)}
              style={{
                backgroundColor: timeframe === tf ? '#8da8d6' : 'rgba(255,255,255,0.05)',
                color: timeframe === tf ? '#0f172a' : '#fff',
                border: 'none',
                padding: '8px 18px',
                borderRadius: '20px',
                fontSize: '13px',
                fontWeight: 700,
                cursor: 'pointer',
                whiteSpace: 'nowrap',
                transition: 'all 0.2s',
              }}
            >
              {tf}
            </button>
          ))}
        </div>

        {/* Listening Highlight Badges / Summary Cards */}
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr))', gap: '14px', marginBottom: '32px' }}>
          <div style={{ background: 'linear-gradient(135deg, rgba(141,168,214,0.15), rgba(255,255,255,0.02))', border: '1px solid rgba(141,168,214,0.25)', borderRadius: '16px', padding: '16px 20px' }}>
            <div style={{ fontSize: '12px', fontWeight: 600, color: '#8da8d6', textTransform: 'uppercase', letterSpacing: '0.5px' }}>Listening Time</div>
            <div style={{ fontSize: '24px', fontWeight: 800, marginTop: '4px', color: '#fff' }}>{totalListeningMinutes} mins</div>
            <div style={{ fontSize: '11px', color: 'rgba(255,255,255,0.45)', marginTop: '2px' }}>Filtered by {timeframe}</div>
          </div>

          <div style={{ background: 'linear-gradient(135deg, rgba(255,75,75,0.12), rgba(255,255,255,0.02))', border: '1px solid rgba(255,75,75,0.2)', borderRadius: '16px', padding: '16px 20px' }}>
            <div style={{ fontSize: '12px', fontWeight: 600, color: '#ff6b6b', textTransform: 'uppercase', letterSpacing: '0.5px' }}>Top Track</div>
            <div style={{ fontSize: '16px', fontWeight: 700, marginTop: '4px', color: '#fff', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
              {topSongs[0]?.track?.title || 'None yet'}
            </div>
            <div style={{ fontSize: '11px', color: 'rgba(255,255,255,0.45)', marginTop: '2px' }}>
              {topSongs[0] ? `${topSongs[0].plays} plays` : 'Start listening'}
            </div>
          </div>

          <div style={{ background: 'linear-gradient(135deg, rgba(168,85,247,0.12), rgba(255,255,255,0.02))', border: '1px solid rgba(168,85,247,0.2)', borderRadius: '16px', padding: '16px 20px' }}>
            <div style={{ fontSize: '12px', fontWeight: 600, color: '#c084fc', textTransform: 'uppercase', letterSpacing: '0.5px' }}>Top Artist</div>
            <div style={{ fontSize: '16px', fontWeight: 700, marginTop: '4px', color: '#fff', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
              {topArtists[0]?.name || 'None yet'}
            </div>
            <div style={{ fontSize: '11px', color: 'rgba(255,255,255,0.45)', marginTop: '2px' }}>
              {topArtists[0]?.plays || 'Most played'}
            </div>
          </div>
        </div>

        {/* 1. Playlists Shelf (with 2x2 collage covers) */}
        <div style={{ marginBottom: '36px' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '16px' }}>
            <TrendingUp size={18} style={{ color: '#8da8d6' }} />
            <h3 style={{ fontSize: '18px', fontWeight: 700 }}>
              {topPlaylists.length} Playlists • {timeframe}
            </h3>
          </div>
          <div style={{ display: 'flex', gap: '20px', overflowX: 'auto', paddingBottom: '12px' }}>
            {topPlaylists.map((pl) => (
              <div 
                key={pl.id} 
                style={{ width: '160px', flexShrink: 0, cursor: 'pointer' }}
                onClick={() => {
                  if (pl.tracks.length > 0) {
                    onPlayTrackImmediate(pl.tracks[0]);
                    onClose();
                  }
                }}
              >
                <PlaylistCover tracks={pl.tracks} size={160} rounded="12px" />
                <div style={{ fontWeight: 700, fontSize: '14px', marginTop: '10px', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                  {pl.name}
                </div>
                <div style={{ fontSize: '12px', color: 'rgba(255,255,255,0.5)', marginTop: '2px' }}>
                  {pl.tracks.length} Songs
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* 2. Top Songs Shelf */}
        <div style={{ marginBottom: '36px' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '16px' }}>
            <h3 style={{ fontSize: '18px', fontWeight: 700 }}>
              Top Songs • {timeframe}
            </h3>
            <button
              onClick={handlePlayAll}
              style={{
                background: 'rgba(255,255,255,0.08)',
                border: 'none',
                color: '#fff',
                padding: '8px 18px',
                borderRadius: '16px',
                fontSize: '12px',
                fontWeight: 700,
                cursor: 'pointer',
                display: 'flex',
                alignItems: 'center',
                gap: '6px',
              }}
            >
              <Play size={14} fill="#fff" /> Play all
            </button>
          </div>

          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(240px, 1fr))', gap: '16px' }}>
            {topSongs.map(({ rank, track, plays, listenTime }) => (
              <div
                key={track.id}
                onClick={() => {
                  onPlayTrackImmediate(track);
                  onClose();
                }}
                style={{
                  backgroundColor: 'rgba(255,255,255,0.03)',
                  border: '1px solid rgba(255,255,255,0.05)',
                  borderRadius: '14px',
                  padding: '16px',
                  display: 'flex',
                  flexDirection: 'column',
                  gap: '12px',
                  cursor: 'pointer',
                  position: 'relative',
                  transition: 'transform 0.2s, background 0.2s',
                }}
                onMouseEnter={(e) => (e.currentTarget.style.backgroundColor = 'rgba(255,255,255,0.06)')}
                onMouseLeave={(e) => (e.currentTarget.style.backgroundColor = 'rgba(255,255,255,0.03)')}
              >
                <div style={{ position: 'relative', width: '100%', aspectRatio: '1', borderRadius: '10px', overflow: 'hidden' }}>
                  <img src={track.thumbnailUrl} alt={track.title} style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
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
                    <Play size={24} fill="#fff" />
                  </div>
                </div>
                <div>
                  <div style={{ fontWeight: 700, fontSize: '14px', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                    {rank}. {track.title}
                  </div>
                  <div style={{ fontSize: '12px', color: 'rgba(255,255,255,0.5)', marginTop: '4px' }}>
                    {plays} plays • {listenTime}
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* 3. Top Artists Shelf */}
        <div>
          <h3 style={{ fontSize: '18px', fontWeight: 700, marginBottom: '16px' }}>
            Top Artists • {timeframe}
          </h3>
          <div style={{ display: 'flex', gap: '28px', overflowX: 'auto', paddingBottom: '16px' }}>
            {topArtists.map((artist) => (
              <div key={artist.name} style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', textAlign: 'center', width: '120px', flexShrink: 0 }}>
                <img
                  src={artist.avatarUrl}
                  alt={artist.name}
                  style={{
                    width: '100px',
                    height: '100px',
                    borderRadius: '50%',
                    objectFit: 'cover',
                    marginBottom: '10px',
                    boxShadow: '0 8px 24px rgba(0,0,0,0.5)',
                  }}
                />
                <div style={{ fontWeight: 700, fontSize: '13px', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis', width: '100%' }}>
                  {artist.rank}. {artist.name}
                </div>
                <div style={{ fontSize: '11px', color: 'rgba(255,255,255,0.4)', marginTop: '2px' }}>
                  {artist.plays}
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
};
