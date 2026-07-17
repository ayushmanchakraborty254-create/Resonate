import React from 'react';
import { Trash2, Disc, Play } from 'lucide-react';
import type { Track } from '../types';

interface LyricsAndQueueProps {
  showLyrics: boolean;
  showQueue: boolean;
  currentTrack: Track | null;
  queue: Track[];
  currentIndex: number;
  onSelectFromQueue: (index: number) => void;
  onClearQueue: () => void;
  progress: number;
}

export const LyricsAndQueue: React.FC<LyricsAndQueueProps> = ({
  showLyrics,
  showQueue,
  currentTrack,
  queue,
  currentIndex,
  onSelectFromQueue,
  onClearQueue,
  progress,
}) => {
  if (!showLyrics && !showQueue) return null;

  // Simple parser to display scrollable lines for lyrics
  const renderLyrics = () => {
    if (!currentTrack || !currentTrack.lyrics) {
      return (
        <div style={{ color: 'var(--yt-text-secondary)', textAlign: 'center', marginTop: '40px' }}>
          No lyrics available for this song.
        </div>
      );
    }

    const lines = currentTrack.lyrics.split('\n');
    return (
      <div style={{ padding: '8px 0' }}>
        {lines.map((line, index) => {
          // Highlight mock synchronized lines based on song play-time ranges
          const isHeader = line.startsWith('[') && line.endsWith(']');
          const isHighlighted =
            !isHeader &&
            index === Math.floor((progress / (currentTrack.duration || 180)) * lines.length);

          return (
            <div
              key={index}
              className={`lyrics-line ${isHighlighted ? 'active' : ''}`}
              style={{
                color: isHeader
                  ? 'var(--yt-accent)'
                  : isHighlighted
                  ? 'var(--yt-text-primary)'
                  : 'var(--yt-text-secondary)',
                opacity: isHeader ? 0.7 : 1,
                fontSize: isHeader ? '13px' : undefined,
                fontWeight: isHeader ? 'bold' : undefined,
                letterSpacing: isHeader ? '0.5px' : undefined,
                textAlign: isHeader ? 'center' : 'left',
              }}
            >
              {line}
            </div>
          );
        })}
      </div>
    );
  };

  return (
    <div className="right-drawer">
      <div className="drawer-tabs">
        <div className={`drawer-tab ${showLyrics ? 'active' : ''}`}>
          Lyrics
        </div>
        <div className={`drawer-tab ${showQueue ? 'active' : ''}`}>
          Queue
        </div>
      </div>

      <div className="drawer-content">
        {showLyrics && renderLyrics()}

        {showQueue && (
          <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <span style={{ fontSize: '13px', color: 'var(--yt-text-secondary)', fontWeight: 500 }}>
                {queue.length} Songs in Queue
              </span>
              <button
                onClick={onClearQueue}
                style={{
                  background: 'none',
                  border: 'none',
                  color: 'var(--yt-text-secondary)',
                  cursor: 'pointer',
                  display: 'flex',
                  alignItems: 'center',
                  gap: '4px',
                  fontSize: '12px',
                }}
              >
                <Trash2 size={14} /> Clear
              </button>
            </div>

            <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
              {queue.map((track, index) => {
                const isActive = index === currentIndex;
                return (
                  <div
                    key={`${track.id}-${index}`}
                    className="track-row"
                    onClick={() => onSelectFromQueue(index)}
                    style={{
                      backgroundColor: isActive ? 'rgba(255, 255, 255, 0.05)' : undefined,
                      borderLeft: isActive ? '3px solid var(--yt-accent)' : '3px solid transparent',
                    }}
                  >
                    <img src={track.thumbnailUrl} className="track-row-img" alt={track.title} />
                    <div className="track-row-info">
                      <div className="track-row-title" style={{ color: isActive ? 'var(--yt-accent)' : undefined }}>
                        {track.title}
                      </div>
                      <div className="track-row-subtitle">{track.artist}</div>
                    </div>
                    <div className="track-row-right">
                      {isActive ? (
                        <Disc size={14} className="spinning" style={{ color: 'var(--yt-accent)' }} />
                      ) : (
                        <Play size={12} />
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        )}
      </div>
    </div>
  );
};
