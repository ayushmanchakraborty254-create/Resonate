import React from 'react';
import { Trash2, Disc, Play } from 'lucide-react';
import type { Track } from '../types';
import { KaraokeLyrics } from './KaraokeLyrics';
import { useTrackLyrics } from '../utils/lyrics';

interface LyricsAndQueueProps {
  showLyrics: boolean;
  showQueue: boolean;
  currentTrack: Track | null;
  queue: Track[];
  currentIndex: number;
  onSelectFromQueue: (index: number) => void;
  onClearQueue: () => void;
  progress: number;
  duration?: number;
  onSeek?: (seconds: number) => void;
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
  duration,
  onSeek,
}) => {
  const dynamicLyrics = useTrackLyrics(currentTrack);

  if (!showLyrics && !showQueue) return null;

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
        {showLyrics && (
          <KaraokeLyrics
            lyrics={dynamicLyrics || currentTrack?.lyrics}
            progress={progress}
            duration={duration || currentTrack?.duration || 180}
            onSeek={onSeek}
            compact
            fontSize="small"
          />
        )}

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
