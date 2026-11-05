import React, { useState } from 'react';
import { ArrowLeft, Search, MoreVertical, X } from 'lucide-react';
import type { Track } from '../types';

interface HistoryModalProps {
  isOpen: boolean;
  onClose: () => void;
  onPlayTrackImmediate: (track: Track) => void;
}

export const HistoryModal: React.FC<HistoryModalProps> = ({
  isOpen,
  onClose,
  onPlayTrackImmediate,
}) => {
  const [activeTab, setActiveTab] = useState<'Local' | 'Remote'>('Local');

  if (!isOpen) return null;

  // History sample tracks matching Page 3 of PDF
  const yesterdayTracks: Track[] = [
    {
      id: 'hist-1',
      title: 'Jugraafiya (feat. Hrithik Roshan & Mrunal Thakur)',
      artist: 'Jigar Saraiya, Priya Saraiya',
      duration: 275,
      thumbnailUrl: 'https://images.unsplash.com/photo-1511671782779-c97d3d27a1d4?w=200&auto=format&fit=crop&q=80',
      lyrics: '[Enjoy listening to Jugraafiya on Resonate!]',
    },
    {
      id: 'hist-2',
      title: 'nadaaniyan',
      artist: 'Akshath',
      duration: 172,
      thumbnailUrl: 'https://images.unsplash.com/photo-1470225620780-dba8ba36b745?w=200&auto=format&fit=crop&q=80',
      lyrics: '[Enjoy listening to nadaaniyan on Resonate!]',
    },
    {
      id: 'hist-3',
      title: 'Dhun (Movie: Saiyaara)',
      artist: 'Arijit Singh and Mithoon',
      duration: 277,
      thumbnailUrl: 'https://images.unsplash.com/photo-1514525253161-7a46d19cd819?w=200&auto=format&fit=crop&q=80',
      lyrics: '[Enjoy listening to Dhun on Resonate!]',
    },
    {
      id: 'hist-4',
      title: 'Khat',
      artist: 'Jigar Saraiya, Priya Saraiya',
      duration: 297,
      thumbnailUrl: 'https://images.unsplash.com/photo-1465847899084-d164df4dedc6?w=200&auto=format&fit=crop&q=80',
      lyrics: '[Enjoy listening to Khat on Resonate!]',
    },
    {
      id: 'hist-5',
      title: 'Tere Bina',
      artist: 'Jigar Saraiya, Priya Saraiya',
      duration: 252,
      thumbnailUrl: 'https://images.unsplash.com/photo-1520523839898-50712825e617?w=200&auto=format&fit=crop&q=80',
      lyrics: '[Enjoy listening to Tere Bina on Resonate!]',
    },
  ];

  const thisWeekTracks: Track[] = [
    {
      id: 'hist-6',
      title: 'Raabta',
      artist: 'Arijit Singh',
      duration: 244,
      thumbnailUrl: 'https://images.unsplash.com/photo-1518609878373-06d740f60d8b?w=200&auto=format&fit=crop&q=80',
      lyrics: '[Enjoy listening to Raabta on Resonate!]',
    },
    {
      id: 'hist-7',
      title: 'Perfect (with Beyoncé) (feat. Beyoncé)',
      artist: 'Ed Sheeran',
      duration: 259,
      thumbnailUrl: 'https://images.unsplash.com/photo-1501386761578-eac5c94b800a?w=200&auto=format&fit=crop&q=80',
      lyrics: '[Enjoy listening to Perfect on Resonate!]',
    },
    {
      id: 'hist-8',
      title: 'Finding Her',
      artist: 'Kushagra, Bharath and Saaheal',
      duration: 207,
      thumbnailUrl: 'https://images.unsplash.com/photo-1451187580459-43490279c0fa?w=200&auto=format&fit=crop&q=80',
      lyrics: '[Enjoy listening to Finding Her on Resonate!]',
    },
  ];

  const formatDuration = (secs: number) => {
    const m = Math.floor(secs / 60);
    const s = Math.floor(secs % 60).toString().padStart(2, '0');
    return `${m}:${s}`;
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
          <span>History</span>
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
      <div style={{ flex: 1, padding: '24px 32px', maxWidth: '800px', margin: '0 auto', width: '100%' }}>
        {/* Local vs Remote Segmented Pills */}
        <div style={{ display: 'flex', gap: '8px', marginBottom: '28px' }}>
          <button
            onClick={() => setActiveTab('Local')}
            style={{
              backgroundColor: activeTab === 'Local' ? '#8da8d6' : 'rgba(255,255,255,0.05)',
              color: activeTab === 'Local' ? '#0f172a' : '#fff',
              border: 'none',
              padding: '8px 20px',
              borderRadius: '20px',
              fontSize: '13px',
              fontWeight: 600,
              cursor: 'pointer',
            }}
          >
            Local
          </button>
          <button
            onClick={() => setActiveTab('Remote')}
            style={{
              backgroundColor: activeTab === 'Remote' ? '#8da8d6' : 'rgba(255,255,255,0.05)',
              color: activeTab === 'Remote' ? '#0f172a' : '#fff',
              border: 'none',
              padding: '8px 20px',
              borderRadius: '20px',
              fontSize: '13px',
              fontWeight: 600,
              cursor: 'pointer',
            }}
          >
            Remote
          </button>
        </div>

        {/* Yesterday Section */}
        <div style={{ marginBottom: '36px' }}>
          <h3 style={{ fontSize: '18px', fontWeight: 700, marginBottom: '16px', color: '#fff' }}>
            Yesterday
          </h3>
          <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
            {yesterdayTracks.map((track) => (
              <div
                key={track.id}
                onClick={() => onPlayTrackImmediate(track)}
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: '16px',
                  padding: '12px 16px',
                  borderRadius: '12px',
                  backgroundColor: 'rgba(255,255,255,0.02)',
                  border: '1px solid rgba(255,255,255,0.04)',
                  cursor: 'pointer',
                  transition: 'background 0.2s',
                }}
              >
                <div style={{ position: 'relative', width: '48px', height: '48px', borderRadius: '8px', overflow: 'hidden', flexShrink: 0 }}>
                  <img src={track.thumbnailUrl} alt={track.title} style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
                </div>
                <div style={{ flex: 1, minWidth: 0 }}>
                  <div style={{ fontWeight: 700, fontSize: '15px', color: '#fff', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                    {track.title}
                  </div>
                  <div style={{ fontSize: '13px', color: 'rgba(255,255,255,0.5)', marginTop: '2px' }}>
                    {track.artist} • {formatDuration(track.duration)}
                  </div>
                </div>
                <button
                  onClick={(e) => {
                    e.stopPropagation();
                  }}
                  style={{ background: 'none', border: 'none', color: 'rgba(255,255,255,0.4)', cursor: 'pointer', padding: '6px' }}
                >
                  <MoreVertical size={18} />
                </button>
              </div>
            ))}
          </div>
        </div>

        {/* This Week Section */}
        <div>
          <h3 style={{ fontSize: '18px', fontWeight: 700, marginBottom: '16px', color: '#fff' }}>
            This week
          </h3>
          <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
            {thisWeekTracks.map((track) => (
              <div
                key={track.id}
                onClick={() => onPlayTrackImmediate(track)}
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: '16px',
                  padding: '12px 16px',
                  borderRadius: '12px',
                  backgroundColor: 'rgba(255,255,255,0.02)',
                  border: '1px solid rgba(255,255,255,0.04)',
                  cursor: 'pointer',
                  transition: 'background 0.2s',
                }}
              >
                <div style={{ position: 'relative', width: '48px', height: '48px', borderRadius: '8px', overflow: 'hidden', flexShrink: 0 }}>
                  <img src={track.thumbnailUrl} alt={track.title} style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
                </div>
                <div style={{ flex: 1, minWidth: 0 }}>
                  <div style={{ fontWeight: 700, fontSize: '15px', color: '#fff', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                    {track.title}
                  </div>
                  <div style={{ fontSize: '13px', color: 'rgba(255,255,255,0.5)', marginTop: '2px' }}>
                    {track.artist} • {formatDuration(track.duration)}
                  </div>
                </div>
                <button
                  onClick={(e) => {
                    e.stopPropagation();
                  }}
                  style={{ background: 'none', border: 'none', color: 'rgba(255,255,255,0.4)', cursor: 'pointer', padding: '6px' }}
                >
                  <MoreVertical size={18} />
                </button>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
};
