import React, { useState, useEffect } from 'react';
import { ArrowLeft, Search, X, Trash2, Clock, Play, Music } from 'lucide-react';
import type { Track } from '../types';
import type { HistoryEntry } from '../utils/offlineCache';
import { db } from '../utils/db';

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
  const [historyTracks, setHistoryTracks] = useState<HistoryEntry[]>([]);
  const [searchQuery, setSearchQuery] = useState('');
  const [isSearchActive, setIsSearchActive] = useState(false);

  const loadHistory = () => {
    try {
      const raw = localStorage.getItem('resonate_history');
      if (raw) {
        const parsed: HistoryEntry[] = JSON.parse(raw);
        setHistoryTracks(Array.isArray(parsed) ? parsed : []);
      } else {
        setHistoryTracks([]);
      }
    } catch {
      setHistoryTracks([]);
    }
  };

  useEffect(() => {
    if (isOpen) {
      loadHistory();
    }
  }, [isOpen]);

  useEffect(() => {
    const handleUpdate = () => loadHistory();
    window.addEventListener('resonate-history-updated', handleUpdate);
    return () => window.removeEventListener('resonate-history-updated', handleUpdate);
  }, []);

  if (!isOpen) return null;

  const handleClearHistory = async () => {
    if (window.confirm('Clear your listening history?')) {
      localStorage.removeItem('resonate_history');
      setHistoryTracks([]);
      try {
        await db.clear('history');
      } catch (_) {}
      window.dispatchEvent(new CustomEvent('resonate-history-updated'));
    }
  };

  const handleRemoveTrack = (e: React.MouseEvent, trackId: string, playedAt: number) => {
    e.stopPropagation();
    const updated = historyTracks.filter((t) => !(t.id === trackId && t.playedAt === playedAt));
    setHistoryTracks(updated);
    try {
      localStorage.setItem('resonate_history', JSON.stringify(updated));
    } catch (_) {}
  };

  const formatRelativeTime = (timestamp?: number): string => {
    if (!timestamp) return '';
    const diffMs = Date.now() - timestamp;
    const diffSec = Math.floor(diffMs / 1000);
    if (diffSec < 60) return 'Just now';
    const diffMin = Math.floor(diffSec / 60);
    if (diffMin < 60) return `${diffMin}m ago`;
    const diffHr = Math.floor(diffMin / 60);
    if (diffHr < 24) return `${diffHr}h ago`;
    const diffDays = Math.floor(diffHr / 24);
    if (diffDays === 1) return 'Yesterday';
    if (diffDays < 7) return `${diffDays}d ago`;
    return new Date(timestamp).toLocaleDateString(undefined, { month: 'short', day: 'numeric' });
  };

  const formatDuration = (secs: number) => {
    const m = Math.floor(secs / 60);
    const s = Math.floor(secs % 60).toString().padStart(2, '0');
    return `${m}:${s}`;
  };

  // Filter based on search query
  const filtered = historyTracks.filter((t) => {
    if (!searchQuery.trim()) return true;
    const q = searchQuery.toLowerCase();
    return t.title.toLowerCase().includes(q) || t.artist.toLowerCase().includes(q);
  });

  // Group into Today, Yesterday, Earlier
  const now = new Date();
  const startOfToday = new Date(now.getFullYear(), now.getMonth(), now.getDate()).getTime();
  const startOfYesterday = startOfToday - 86400000;

  const todayTracks = filtered.filter((t) => (t.playedAt || 0) >= startOfToday);
  const yesterdayTracks = filtered.filter(
    (t) => (t.playedAt || 0) >= startOfYesterday && (t.playedAt || 0) < startOfToday
  );
  const earlierTracks = filtered.filter((t) => (t.playedAt || 0) < startOfYesterday);

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
          padding: '16px 20px',
          borderBottom: '1px solid rgba(255,255,255,0.06)',
          position: 'sticky',
          top: 0,
          background: 'rgba(10,10,10,0.95)',
          backdropFilter: 'blur(20px)',
          zIndex: 20,
        }}
      >
        <div style={{ display: 'flex', alignItems: 'center', gap: '14px' }}>
          <button
            onClick={onClose}
            style={{
              background: 'none',
              border: 'none',
              color: '#fff',
              cursor: 'pointer',
              padding: '6px',
              display: 'flex',
              alignItems: 'center',
            }}
          >
            <ArrowLeft size={22} />
          </button>
          <span style={{ fontSize: '18px', fontWeight: 700 }}>Listening History</span>
        </div>

        <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
          <button
            onClick={() => setIsSearchActive(!isSearchActive)}
            style={{
              background: isSearchActive ? 'rgba(255,255,255,0.1)' : 'none',
              border: 'none',
              color: '#fff',
              cursor: 'pointer',
              padding: '8px',
              borderRadius: '50%',
              display: 'flex',
              alignItems: 'center',
            }}
            title="Search history"
          >
            <Search size={18} />
          </button>
          {historyTracks.length > 0 && (
            <button
              onClick={handleClearHistory}
              style={{
                background: 'none',
                border: 'none',
                color: 'rgba(255,255,255,0.6)',
                cursor: 'pointer',
                padding: '8px',
                borderRadius: '50%',
                display: 'flex',
                alignItems: 'center',
              }}
              title="Clear all history"
            >
              <Trash2 size={18} />
            </button>
          )}
          <button
            onClick={onClose}
            style={{
              background: 'none',
              border: 'none',
              color: '#fff',
              cursor: 'pointer',
              padding: '8px',
              borderRadius: '50%',
              display: 'flex',
              alignItems: 'center',
            }}
          >
            <X size={20} />
          </button>
        </div>
      </div>

      {/* Optional Search Bar Input */}
      {isSearchActive && (
        <div style={{ padding: '12px 20px', borderBottom: '1px solid rgba(255,255,255,0.06)' }}>
          <input
            type="text"
            placeholder="Search songs or artists in history..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            autoFocus
            style={{
              width: '100%',
              background: 'rgba(255,255,255,0.06)',
              border: '1px solid rgba(255,255,255,0.1)',
              borderRadius: '10px',
              padding: '10px 14px',
              color: '#fff',
              fontSize: '14px',
              outline: 'none',
            }}
          />
        </div>
      )}

      {/* Main Container */}
      <div style={{ flex: 1, padding: '20px', maxWidth: '800px', margin: '0 auto', width: '100%', paddingBottom: '120px' }}>
        {/* Local vs Remote Segmented Pills */}
        <div style={{ display: 'flex', gap: '8px', marginBottom: '24px' }}>
          <button
            onClick={() => setActiveTab('Local')}
            style={{
              backgroundColor: activeTab === 'Local' ? '#fff' : 'rgba(255,255,255,0.06)',
              color: activeTab === 'Local' ? '#0a0a0a' : '#fff',
              border: 'none',
              padding: '8px 20px',
              borderRadius: '20px',
              fontSize: '13px',
              fontWeight: 600,
              cursor: 'pointer',
            }}
          >
            Local ({historyTracks.length})
          </button>
          <button
            onClick={() => setActiveTab('Remote')}
            style={{
              backgroundColor: activeTab === 'Remote' ? '#fff' : 'rgba(255,255,255,0.06)',
              color: activeTab === 'Remote' ? '#0a0a0a' : '#fff',
              border: 'none',
              padding: '8px 20px',
              borderRadius: '20px',
              fontSize: '13px',
              fontWeight: 600,
              cursor: 'pointer',
            }}
          >
            Cloud Synced
          </button>
        </div>

        {/* Empty State */}
        {filtered.length === 0 ? (
          <div style={{ textAlign: 'center', padding: '60px 20px', color: 'rgba(255,255,255,0.5)' }}>
            <Music size={48} style={{ opacity: 0.3, marginBottom: '16px' }} />
            <div style={{ fontSize: '17px', fontWeight: 600, color: '#fff', marginBottom: '8px' }}>
              {searchQuery ? 'No matching songs found' : 'No Listening History Yet'}
            </div>
            <div style={{ fontSize: '13px', maxWidth: '300px', margin: '0 auto' }}>
              {searchQuery
                ? 'Try searching with another keyword.'
                : 'Songs you play will automatically appear here with exact timestamps and offline streaming availability.'}
            </div>
          </div>
        ) : (
          <>
            {/* Today Section */}
            {todayTracks.length > 0 && (
              <div style={{ marginBottom: '32px' }}>
                <h3 style={{ fontSize: '16px', fontWeight: 700, marginBottom: '12px', color: '#fff', display: 'flex', alignItems: 'center', gap: '8px' }}>
                  <Clock size={16} style={{ color: 'var(--yt-accent)' }} /> Today
                </h3>
                <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                  {todayTracks.map((track) => renderTrackItem(track))}
                </div>
              </div>
            )}

            {/* Yesterday Section */}
            {yesterdayTracks.length > 0 && (
              <div style={{ marginBottom: '32px' }}>
                <h3 style={{ fontSize: '16px', fontWeight: 700, marginBottom: '12px', color: '#fff' }}>
                  Yesterday
                </h3>
                <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                  {yesterdayTracks.map((track) => renderTrackItem(track))}
                </div>
              </div>
            )}

            {/* Earlier Section */}
            {earlierTracks.length > 0 && (
              <div style={{ marginBottom: '32px' }}>
                <h3 style={{ fontSize: '16px', fontWeight: 700, marginBottom: '12px', color: '#fff' }}>
                  Earlier
                </h3>
                <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                  {earlierTracks.map((track) => renderTrackItem(track))}
                </div>
              </div>
            )}
          </>
        )}
      </div>
    </div>
  );

  function renderTrackItem(track: HistoryEntry) {
    return (
      <div
        key={`${track.id}-${track.playedAt}`}
        onClick={() => onPlayTrackImmediate(track)}
        style={{
          display: 'flex',
          alignItems: 'center',
          gap: '14px',
          padding: '10px 14px',
          borderRadius: '12px',
          backgroundColor: 'rgba(255,255,255,0.03)',
          border: '1px solid rgba(255,255,255,0.04)',
          cursor: 'pointer',
          transition: 'all 0.2s ease',
        }}
        onMouseEnter={(e) => {
          (e.currentTarget as HTMLElement).style.backgroundColor = 'rgba(255,255,255,0.07)';
        }}
        onMouseLeave={(e) => {
          (e.currentTarget as HTMLElement).style.backgroundColor = 'rgba(255,255,255,0.03)';
        }}
      >
        <div style={{ position: 'relative', width: '48px', height: '48px', borderRadius: '8px', overflow: 'hidden', flexShrink: 0 }}>
          <img
            src={track.thumbnailUrl}
            alt={track.title}
            style={{ width: '100%', height: '100%', objectFit: 'cover' }}
            onError={(e) => {
              (e.target as HTMLElement).style.display = 'none';
            }}
          />
          <div
            style={{
              position: 'absolute',
              inset: 0,
              background: 'rgba(0,0,0,0.3)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              opacity: 0,
              transition: 'opacity 0.2s',
            }}
            onMouseEnter={(e) => {
              (e.currentTarget as HTMLElement).style.opacity = '1';
            }}
            onMouseLeave={(e) => {
              (e.currentTarget as HTMLElement).style.opacity = '0';
            }}
          >
            <Play size={18} fill="#fff" />
          </div>
        </div>

        <div style={{ flex: 1, minWidth: 0 }}>
          <div style={{ fontWeight: 600, fontSize: '15px', color: '#fff', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
            {track.title}
          </div>
          <div style={{ fontSize: '13px', color: 'rgba(255,255,255,0.5)', marginTop: '2px', display: 'flex', alignItems: 'center', gap: '6px' }}>
            <span>{track.artist}</span>
            <span>•</span>
            <span>{formatDuration(track.duration || 180)}</span>
            {track.playedAt && (
              <>
                <span>•</span>
                <span style={{ color: 'rgba(255,255,255,0.4)', fontSize: '12px' }}>
                  {formatRelativeTime(track.playedAt)}
                </span>
              </>
            )}
          </div>
        </div>

        <button
          onClick={(e) => handleRemoveTrack(e, track.id, track.playedAt)}
          style={{
            background: 'none',
            border: 'none',
            color: 'rgba(255,255,255,0.35)',
            cursor: 'pointer',
            padding: '8px',
            borderRadius: '50%',
            display: 'flex',
            alignItems: 'center',
          }}
          title="Remove from history"
        >
          <Trash2 size={16} />
        </button>
      </div>
    );
  }
};
