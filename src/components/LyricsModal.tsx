import React, { useEffect, useRef } from 'react';
import { X, Play, Pause, SkipBack, SkipForward } from 'lucide-react';
import type { Track } from '../types';

interface LyricsModalProps {
  isOpen: boolean;
  onClose: () => void;
  currentTrack: Track | null;
  isPlaying: boolean;
  onTogglePlay: () => void;
  onNext: () => void;
  onPrev: () => void;
  progress: number;
  duration: number;
  onSeek: (secs: number) => void;
}

export const LyricsModal: React.FC<LyricsModalProps> = ({
  isOpen,
  onClose,
  currentTrack,
  isPlaying,
  onTogglePlay,
  onNext,
  onPrev,
  progress,
  duration,
  onSeek,
}) => {
  const activeLineRef = useRef<HTMLDivElement | null>(null);
  const scrollContainerRef = useRef<HTMLDivElement | null>(null);

  // Close on Escape key
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose();
      if (e.key === ' ' && e.target === document.body) {
        e.preventDefault();
        onTogglePlay();
      }
    };
    if (isOpen) {
      window.addEventListener('keydown', handleKeyDown);
    }
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isOpen, onClose, onTogglePlay]);

  // Smoothly auto-scroll to the active lyric line
  useEffect(() => {
    if (activeLineRef.current && scrollContainerRef.current) {
      activeLineRef.current.scrollIntoView({
        behavior: 'smooth',
        block: 'center',
      });
    }
  }, [progress]);

  if (!isOpen || !currentTrack) return null;

  const lines = currentTrack.lyrics ? currentTrack.lyrics.split('\n') : [];
  const trackDuration = duration || currentTrack.duration || 180;
  const activeLineIndex = lines.length > 0
    ? Math.floor((progress / trackDuration) * lines.length)
    : -1;

  const formatTime = (secs: number) => {
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
        display: 'flex',
        flexDirection: 'column',
        backgroundColor: '#0a0a0a',
        overflow: 'hidden',
      }}
    >
      {/* Dynamic blurred ambient album backdrop */}
      <div
        style={{
          position: 'absolute',
          inset: '-40px',
          backgroundImage: `url(${currentTrack.thumbnailUrl})`,
          backgroundSize: 'cover',
          backgroundPosition: 'center',
          filter: 'blur(70px) saturate(220%) brightness(0.35)',
          transform: 'scale(1.15)',
          pointerEvents: 'none',
          transition: 'background-image 0.8s ease-in-out',
        }}
      />
      <div
        style={{
          position: 'absolute',
          inset: 0,
          background: 'linear-gradient(180deg, rgba(10,10,10,0.6) 0%, rgba(10,10,10,0.85) 100%)',
          pointerEvents: 'none',
        }}
      />

      {/* Top Bar with Close button */}
      <div
        style={{
          position: 'relative',
          zIndex: 10,
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          padding: '24px 36px',
        }}
      >
        <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
          <span style={{ fontSize: '13px', fontWeight: 700, letterSpacing: '1px', textTransform: 'uppercase', color: 'rgba(255,255,255,0.6)' }}>
            Playing From Resonate
          </span>
        </div>
        <button
          onClick={onClose}
          style={{
            background: 'rgba(255,255,255,0.1)',
            border: 'none',
            color: '#fff',
            width: '40px',
            height: '40px',
            borderRadius: '50%',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            cursor: 'pointer',
            transition: 'background 0.2s',
          }}
          title="Close Lyrics (Esc)"
        >
          <X size={20} />
        </button>
      </div>

      {/* Main Content: Left Track Display, Right Scrollable Lyrics */}
      <div
        style={{
          position: 'relative',
          zIndex: 10,
          flex: 1,
          display: 'grid',
          gridTemplateColumns: 'minmax(320px, 420px) 1fr',
          gap: '48px',
          padding: '0 48px',
          overflow: 'hidden',
          alignItems: 'center',
        }}
      >
        {/* Left Side: Album Artwork & Info */}
        <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', textAlign: 'center' }}>
          <div
            style={{
              width: '320px',
              height: '320px',
              borderRadius: '24px',
              overflow: 'hidden',
              boxShadow: '0 20px 60px rgba(0,0,0,0.8), 0 0 40px rgba(255,255,255,0.05)',
              marginBottom: '28px',
            }}
          >
            <img
              src={currentTrack.thumbnailUrl}
              alt={currentTrack.title}
              style={{ width: '100%', height: '100%', objectFit: 'cover' }}
            />
          </div>
          <h1 style={{ fontSize: '26px', fontWeight: 800, color: '#fff', marginBottom: '8px', lineHeight: 1.2 }}>
            {currentTrack.title}
          </h1>
          <h2 style={{ fontSize: '18px', fontWeight: 600, color: 'rgba(255,255,255,0.7)', marginBottom: '4px' }}>
            {currentTrack.artist}
          </h2>
          {currentTrack.album && (
            <p style={{ fontSize: '14px', color: 'rgba(255,255,255,0.4)' }}>{currentTrack.album}</p>
          )}
        </div>

        {/* Right Side: Fluid Lyrics Stream */}
        <div
          ref={scrollContainerRef}
          style={{
            height: '100%',
            overflowY: 'auto',
            paddingRight: '24px',
            scrollBehavior: 'smooth',
            display: 'flex',
            flexDirection: 'column',
            justifyContent: lines.length === 0 ? 'center' : 'flex-start',
            paddingTop: '60px',
            paddingBottom: '120px',
          }}
        >
          {lines.length === 0 ? (
            <div style={{ color: 'rgba(255,255,255,0.5)', fontSize: '20px', textAlign: 'center' }}>
              Lyrics aren't available for this track yet. Enjoy the music!
            </div>
          ) : (
            lines.map((line, idx) => {
              const isHeader = line.startsWith('[') && line.endsWith(']');
              const isActive = idx === activeLineIndex;
              const isPast = idx < activeLineIndex;

              return (
                <div
                  key={idx}
                  ref={isActive ? activeLineRef : null}
                  onClick={() => {
                    if (!isHeader && lines.length > 0) {
                      const seekTarget = Math.floor((idx / lines.length) * trackDuration);
                      onSeek(seekTarget);
                    }
                  }}
                  style={{
                    padding: isHeader ? '16px 0 8px 0' : '12px 0',
                    fontSize: isHeader ? '15px' : isActive ? '32px' : '24px',
                    fontWeight: isHeader ? 700 : isActive ? 800 : 600,
                    color: isHeader
                      ? 'var(--yt-accent)'
                      : isActive
                      ? '#ffffff'
                      : isPast
                      ? 'rgba(255,255,255,0.5)'
                      : 'rgba(255,255,255,0.25)',
                    transform: isActive ? 'scale(1.03) translateX(8px)' : 'scale(1)',
                    transformOrigin: 'left center',
                    transition: 'all 0.35s cubic-bezier(0.2, 0.8, 0.2, 1)',
                    cursor: isHeader ? 'default' : 'pointer',
                    userSelect: 'none',
                    lineHeight: 1.4,
                    textShadow: isActive ? '0 0 30px rgba(255,255,255,0.4)' : 'none',
                  }}
                >
                  {line}
                </div>
              );
            })
          )}
        </div>
      </div>

      {/* Bottom Floating Control Bar */}
      <div
        style={{
          position: 'relative',
          zIndex: 10,
          background: 'rgba(0,0,0,0.5)',
          backdropFilter: 'blur(20px)',
          borderTop: '1px solid rgba(255,255,255,0.08)',
          padding: '16px 48px',
          display: 'flex',
          alignItems: 'center',
          gap: '24px',
        }}
      >
        <span style={{ fontSize: '13px', color: 'rgba(255,255,255,0.6)', width: '45px', textAlign: 'right' }}>
          {formatTime(progress)}
        </span>

        {/* Progress Slider */}
        <input
          type="range"
          className="slider"
          min={0}
          max={trackDuration}
          value={progress}
          onChange={(e) => onSeek(parseInt(e.target.value, 10))}
          style={{ flex: 1, cursor: 'pointer' }}
        />

        <span style={{ fontSize: '13px', color: 'rgba(255,255,255,0.6)', width: '45px' }}>
          {formatTime(trackDuration)}
        </span>

        {/* Controls */}
        <div style={{ display: 'flex', alignItems: 'center', gap: '16px', marginLeft: '16px' }}>
          <button
            onClick={onPrev}
            style={{ background: 'none', border: 'none', color: '#fff', cursor: 'pointer', padding: '6px' }}
            title="Previous track"
          >
            <SkipBack size={22} />
          </button>
          <button
            onClick={onTogglePlay}
            style={{
              width: '48px',
              height: '48px',
              borderRadius: '50%',
              backgroundColor: '#fff',
              color: '#000',
              border: 'none',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              cursor: 'pointer',
              boxShadow: '0 4px 16px rgba(255,255,255,0.2)',
            }}
            title={isPlaying ? 'Pause' : 'Play'}
          >
            {isPlaying ? <Pause size={22} fill="#000" /> : <Play size={22} fill="#000" style={{ transform: 'translateX(1px)' }} />}
          </button>
          <button
            onClick={onNext}
            style={{ background: 'none', border: 'none', color: '#fff', cursor: 'pointer', padding: '6px' }}
            title="Next track"
          >
            <SkipForward size={22} />
          </button>
        </div>
      </div>
    </div>
  );
};
