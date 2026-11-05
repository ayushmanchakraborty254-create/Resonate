import React, { useState } from 'react';
import { ArrowLeft, Search, Play, X } from 'lucide-react';
import { PlaylistCover } from './PlaylistCover';
import type { Track } from '../types';

interface StatsModalProps {
  isOpen: boolean;
  onClose: () => void;
  onPlayTrackImmediate: (track: Track) => void;
}

export const StatsModal: React.FC<StatsModalProps> = ({
  isOpen,
  onClose,
  onPlayTrackImmediate,
}) => {
  const [timeframe, setTimeframe] = useState<'Continuous' | '1 week' | '1 month' | '3 months' | '6 months'>('Continuous');

  if (!isOpen) return null;

  // Stat sample playlists matching PDF Page 4 with real thumbnail assets
  const topPlaylists = [
    {
      id: 'stat-pl-1',
      name: 'Weekly Most',
      tracks: [
        { thumbnailUrl: 'https://images.unsplash.com/photo-1514525253161-7a46d19cd819?w=300&auto=format&fit=crop&q=80' },
        { thumbnailUrl: 'https://images.unsplash.com/photo-1511671782779-c97d3d27a1d4?w=300&auto=format&fit=crop&q=80' },
        { thumbnailUrl: 'https://images.unsplash.com/photo-1465847899084-d164df4dedc6?w=300&auto=format&fit=crop&q=80' },
        { thumbnailUrl: 'https://images.unsplash.com/photo-1520523839898-50712825e617?w=300&auto=format&fit=crop&q=80' },
      ],
    },
    {
      id: 'stat-pl-2',
      name: 'Monthly Most',
      tracks: [
        { thumbnailUrl: 'https://images.unsplash.com/photo-1470225620780-dba8ba36b745?w=300&auto=format&fit=crop&q=80' },
        { thumbnailUrl: 'https://images.unsplash.com/photo-1518609878373-06d740f60d8b?w=300&auto=format&fit=crop&q=80' },
        { thumbnailUrl: 'https://images.unsplash.com/photo-1501386761578-eac5c94b800a?w=300&auto=format&fit=crop&q=80' },
        { thumbnailUrl: 'https://images.unsplash.com/photo-1514525253161-7a46d19cd819?w=300&auto=format&fit=crop&q=80' },
      ],
    },
  ];

  // Top Songs matching Page 4
  const topSongs: Array<{ rank: number; track: Track; plays: number; listenTime: string }> = [
    {
      rank: 1,
      track: {
        id: 'khat-track',
        title: 'Khat',
        artist: 'Jigar Saraiya, Priya Saraiya',
        album: 'Khat - Single',
        duration: 297,
        thumbnailUrl: 'https://images.unsplash.com/photo-1514525253161-7a46d19cd819?w=300&auto=format&fit=crop&q=80',
        lyrics: '[Enjoy listening to Khat!]',
      },
      plays: 4,
      listenTime: '19:25',
    },
    {
      rank: 2,
      track: {
        id: 'dhun-track',
        title: 'Dhun (Movie: Saiyaara)',
        artist: 'Arijit Singh and Mithoon',
        album: 'Saiyaara Soundtrack',
        duration: 277,
        thumbnailUrl: 'https://images.unsplash.com/photo-1511671782779-c97d3d27a1d4?w=300&auto=format&fit=crop&q=80',
        lyrics: '[Enjoy listening to Dhun!]',
      },
      plays: 3,
      listenTime: '13:51',
    },
    {
      rank: 3,
      track: {
        id: 'tere-bina-track',
        title: 'Tere Bina',
        artist: 'Jigar Saraiya, Priya Saraiya',
        album: '1921',
        duration: 252,
        thumbnailUrl: 'https://images.unsplash.com/photo-1465847899084-d164df4dedc6?w=300&auto=format&fit=crop&q=80',
        lyrics: '[Enjoy listening to Tere Bina!]',
      },
      plays: 3,
      listenTime: '12:38',
    },
  ];

  // Top Artists matching Page 4
  const topArtists = [
    {
      rank: 1,
      name: 'Arijit Singh',
      plays: '4 times • 17:54',
      avatarUrl: 'https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?w=300&auto=format&fit=crop&q=80',
    },
    {
      rank: 2,
      name: 'Mithoon',
      plays: '3 times • 13:51',
      avatarUrl: 'https://images.unsplash.com/photo-1500648767791-00dcc994a43e?w=300&auto=format&fit=crop&q=80',
    },
    {
      rank: 3,
      name: 'Bruno Mars',
      plays: '5 times • 11:30',
      avatarUrl: 'https://images.unsplash.com/photo-1492562080023-ab3db95bfbce?w=300&auto=format&fit=crop&q=80',
    },
  ];

  const timeframes: Array<'Continuous' | '1 week' | '1 month' | '3 months' | '6 months'> = [
    'Continuous',
    '1 week',
    '1 month',
    '3 months',
    '6 months',
  ];

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
          <span>Stats</span>
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
                padding: '8px 16px',
                borderRadius: '20px',
                fontSize: '13px',
                fontWeight: 600,
                cursor: 'pointer',
                whiteSpace: 'nowrap',
              }}
            >
              {tf}
            </button>
          ))}
        </div>

        {/* 1. Playlists Shelf (with 2x2 collage covers) */}
        <div style={{ marginBottom: '36px' }}>
          <h3 style={{ fontSize: '18px', fontWeight: 700, marginBottom: '16px' }}>2 playlists</h3>
          <div style={{ display: 'flex', gap: '20px' }}>
            {topPlaylists.map((pl) => (
              <div key={pl.id} style={{ width: '160px', cursor: 'pointer' }}>
                <PlaylistCover tracks={pl.tracks} size={160} rounded="12px" />
                <div style={{ fontWeight: 700, fontSize: '14px', marginTop: '10px' }}>{pl.name}</div>
              </div>
            ))}
          </div>
        </div>

        {/* 2. Top Songs Shelf */}
        <div style={{ marginBottom: '36px' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '16px' }}>
            <h3 style={{ fontSize: '18px', fontWeight: 700 }}>16 Songs</h3>
            <button
              onClick={() => onPlayTrackImmediate(topSongs[0].track)}
              style={{
                background: 'rgba(255,255,255,0.08)',
                border: 'none',
                color: '#fff',
                padding: '6px 14px',
                borderRadius: '16px',
                fontSize: '12px',
                fontWeight: 600,
                cursor: 'pointer',
              }}
            >
              Play all
            </button>
          </div>

          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(240px, 1fr))', gap: '16px' }}>
            {topSongs.map(({ rank, track, plays, listenTime }) => (
              <div
                key={track.id}
                onClick={() => onPlayTrackImmediate(track)}
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
                }}
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
                    {plays} times • {listenTime}
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* 3. Top Artists Shelf */}
        <div>
          <h3 style={{ fontSize: '18px', fontWeight: 700, marginBottom: '16px' }}>15 Artists</h3>
          <div style={{ display: 'flex', gap: '28px', overflowX: 'auto', paddingBottom: '16px' }}>
            {topArtists.map((artist) => (
              <div key={artist.name} style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', textAlign: 'center', width: '120px' }}>
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
