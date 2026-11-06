import React, { useEffect, useRef, useState } from 'react';
import {
  Play,
  Pause,
  SkipForward,
  SkipBack,
  Shuffle,
  Repeat,
  Volume2,
  VolumeX,
  ListMusic,
  FileText,
  Heart,
  PictureInPicture2,
  RotateCcw,
  RotateCw,
} from 'lucide-react';
import type { Track } from '../types';
import { useSwipeGesture } from '../hooks/useSwipeGesture';
import { useBreakpoint } from '../utils/responsive';
import { floatingPlayer } from '../utils/floatingPlayer';
import { KaraokeLyrics } from './KaraokeLyrics';
import { useTrackLyrics } from '../utils/lyrics';

interface PlayerBarProps {
  currentTrack: Track | null;
  isPlaying: boolean;
  setIsPlaying: (playing: boolean) => void;
  progress: number;
  setProgress: (progress: number) => void;
  volume: number;
  setVolume: (volume: number) => void;
  queue: Track[];
  onNext: () => void;
  onPrev: () => void;
  isShuffle: boolean;
  setIsShuffle: (shuffle: boolean) => void;
  isRepeat: 'none' | 'one' | 'all';
  setIsRepeat: (repeat: 'none' | 'one' | 'all') => void;
  showLyrics: boolean;
  setShowLyrics: (show: boolean) => void;
  showQueue: boolean;
  setShowQueue: (show: boolean) => void;
  likedTracks: Track[];
  onToggleLike: (track: Track) => void;
}

declare global {
  interface Window {
    onYouTubeIframeAPIReady?: () => void;
    YT: any;
  }
}

export const PlayerBar: React.FC<PlayerBarProps> = ({
  currentTrack,
  isPlaying,
  setIsPlaying,
  progress,
  setProgress,
  volume,
  setVolume,
  queue,
  onNext,
  onPrev,
  isShuffle,
  setIsShuffle,
  isRepeat,
  setIsRepeat,
  showLyrics,
  setShowLyrics,
  showQueue,
  setShowQueue,
  likedTracks,
  onToggleLike,
}) => {
  const playerRef = useRef<any>(null);
  const iframeContainerId = 'youtube-iframe-player';
  const progressIntervalRef = useRef<any>(null);
  const [duration, setDuration] = useState(0);
  const [isMuted, setIsMuted] = useState(false);
  const [prevVolume, setPrevVolume] = useState(0.5);

  // Smooth dragging slider states (fixes jumping / unresponsive slider bug)
  const [isDragging, setIsDragging] = useState(false);
  const [dragProgress, setDragProgress] = useState(0);

  const { isMobile } = useBreakpoint();
  const [mobilePlayerState, setMobilePlayerState] = useState<'mini' | 'half' | 'full'>('mini');
  const [localShowLyrics, setLocalShowLyrics] = useState(false);
  const dynamicLyrics = useTrackLyrics(currentTrack);

  const swipeHandlers = useSwipeGesture({
    onSwipeDown: () => {
      if (mobilePlayerState === 'full') setMobilePlayerState('mini');
      else if (mobilePlayerState === 'half') setMobilePlayerState('mini');
    },
    onSwipeLeft: () => onNext(),
    onSwipeRight: () => onPrev(),
  });

  const isLiked = currentTrack ? likedTracks.some((t) => t.id === currentTrack.id) : false;

  // Initialize YouTube Iframe Player
  useEffect(() => {
    if (!window.YT) {
      const tag = document.createElement('script');
      tag.src = 'https://www.youtube.com/iframe_api';
      const firstScriptTag = document.getElementsByTagName('script')[0];
      firstScriptTag.parentNode?.insertBefore(tag, firstScriptTag);

      window.onYouTubeIframeAPIReady = () => {
        initPlayer();
      };
    } else {
      initPlayer();
    }

    function initPlayer() {
      if (playerRef.current) return;
      playerRef.current = new window.YT.Player(iframeContainerId, {
        height: '1',
        width: '1',
        videoId: currentTrack?.id || '',
        playerVars: {
          autoplay: 0,
          controls: 0,
          disablekb: 1,
          fs: 0,
          modestbranding: 1,
          rel: 0,
          showinfo: 0,
          iv_load_policy: 3,
        },
        events: {
          onReady: () => {
            if (currentTrack) {
              playerRef.current.loadVideoById(currentTrack.id, progress);
              if (isPlaying) {
                playerRef.current.playVideo();
              } else {
                playerRef.current.pauseVideo();
              }
            }
          },
          onStateChange: (event: any) => {
            // YT.PlayerState.ENDED = 0
            if (event.data === 0) {
              onNext();
            }
          },
        },
      });
    }
  }, []);

  // Sync Video Loading with currentTrack
  useEffect(() => {
    if (playerRef.current && playerRef.current.loadVideoById && currentTrack) {
      playerRef.current.loadVideoById(currentTrack.id);
      if (isPlaying) {
        playerRef.current.playVideo();
      } else {
        playerRef.current.pauseVideo();
      }
    }
  }, [currentTrack]);

  // Sync Player Volume
  useEffect(() => {
    if (playerRef.current && playerRef.current.setVolume) {
      playerRef.current.setVolume(isMuted ? 0 : volume * 100);
    }
  }, [volume, isMuted]);

  // Sync Playing state
  useEffect(() => {
    if (playerRef.current) {
      if (isPlaying) {
        if (playerRef.current.playVideo) playerRef.current.playVideo();
      } else {
        if (playerRef.current.pauseVideo) playerRef.current.pauseVideo();
      }
    }
  }, [isPlaying]);

  // Synchronize duration when track changes
  useEffect(() => {
    if (currentTrack?.duration) {
      setDuration(currentTrack.duration);
    }
  }, [currentTrack]);

  // Synchronize with Floating Player (PiP)
  useEffect(() => {
    floatingPlayer.setActions({
      onTogglePlay: () => setIsPlaying(!isPlaying),
      onNext,
      onPrev,
      onSeek: (seconds: number) => {
        setProgress(seconds);
        if (playerRef.current && playerRef.current.seekTo) {
          playerRef.current.seekTo(seconds, true);
        }
      },
    });
  }, [isPlaying, onNext, onPrev]);

  useEffect(() => {
    floatingPlayer.updateState({
      currentTrack,
      isPlaying,
      progress: isDragging ? dragProgress : progress,
      duration: duration || currentTrack?.duration || 180,
    });
  }, [currentTrack, isPlaying, progress, duration, isDragging, dragProgress]);

  // Track progress updates (only update display if user is not actively dragging the thumb)
  useEffect(() => {
    if (isPlaying) {
      progressIntervalRef.current = setInterval(() => {
        if (!isDragging && playerRef.current && playerRef.current.getCurrentTime && playerRef.current.getDuration) {
          const curr = Math.floor(playerRef.current.getCurrentTime());
          const dur = Math.floor(playerRef.current.getDuration() || currentTrack?.duration || 0);
          setProgress(curr);
          if (dur > 0) setDuration(dur);
        }
      }, 500);
    } else {
      if (progressIntervalRef.current) {
        clearInterval(progressIntervalRef.current);
      }
    }

    return () => {
      if (progressIntervalRef.current) {
        clearInterval(progressIntervalRef.current);
      }
    };
  }, [isPlaying, isDragging, currentTrack]);

  // Smooth seeker drag handlers & immediate seek execution (isolated from swipe gesture)
  const handleSliderMouseDown = (e?: React.MouseEvent | React.TouchEvent) => {
    if (e && e.stopPropagation) e.stopPropagation();
    setIsDragging(true);
    setDragProgress(progress);
  };

  const handleSliderChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    e.stopPropagation();
    const val = parseInt(e.target.value, 10);
    setDragProgress(val);
    setProgress(val);
    if (playerRef.current && playerRef.current.seekTo) {
      playerRef.current.seekTo(val, true);
    }
  };

  const handleSliderMouseUp = (e?: React.MouseEvent | React.TouchEvent) => {
    if (e && e.stopPropagation) e.stopPropagation();
    setIsDragging(false);
    setProgress(dragProgress);
    if (playerRef.current && playerRef.current.seekTo) {
      playerRef.current.seekTo(dragProgress, true);
    }
  };

  const seekRelative = (deltaSeconds: number) => {
    const dur = duration || currentTrack?.duration || 180;
    const target = Math.max(0, Math.min(dur, (isDragging ? dragProgress : progress) + deltaSeconds));
    setProgress(target);
    setDragProgress(target);
    if (playerRef.current && playerRef.current.seekTo) {
      playerRef.current.seekTo(target, true);
    }
  };

  const toggleMute = () => {
    if (isMuted) {
      setIsMuted(false);
      setVolume(prevVolume);
    } else {
      setPrevVolume(volume);
      setIsMuted(true);
      setVolume(0);
    }
  };

  const formatTime = (secs: number) => {
    const m = Math.floor(secs / 60);
    const s = Math.floor(secs % 60);
    return `${m}:${s < 10 ? '0' : ''}${s}`;
  };

  return (
    <>
      {/* Hidden YouTube player container */}
      <div style={{ display: 'none' }}>
        <div id={iframeContainerId}></div>
      </div>

      {!isMobile ? (
        /* DESKTOP LAYOUT */
        <div className="player-bar">
          {/* Track details (Left) */}
          <div className="player-left">
            {currentTrack ? (
              <>
                <img
                  src={currentTrack.thumbnailUrl}
                  alt={currentTrack.title}
                  className="player-img"
                />
                <div className="player-track-info">
                  <div className="player-title">{currentTrack.title}</div>
                  <div className="player-artist">{currentTrack.artist}</div>
                </div>
                <button
                  className={`icon-btn ${isLiked ? 'active' : ''}`}
                  onClick={() => onToggleLike(currentTrack)}
                  style={{ marginLeft: '8px' }}
                >
                  <Heart size={16} fill={isLiked ? 'var(--yt-accent)' : 'none'} />
                </button>
              </>
            ) : (
              <div style={{ fontSize: '13px', color: 'var(--yt-text-secondary)' }}>
                No song playing
              </div>
            )}
          </div>

          {/* Main Controls (Center) */}
          <div className="player-center">
            <div className="player-controls">
              <button
                className={`icon-btn ${isShuffle ? 'active' : ''}`}
                onClick={() => setIsShuffle(!isShuffle)}
              >
                <Shuffle size={16} />
              </button>

              <button className="icon-btn" onClick={onPrev} disabled={queue.length <= 1}>
                <SkipBack size={20} />
              </button>

              <button className="icon-btn" onClick={() => seekRelative(-10)} disabled={!currentTrack} title="Rewind 10s">
                <RotateCcw size={16} />
              </button>

              <button
                className="icon-btn icon-btn-large"
                onClick={() => setIsPlaying(!isPlaying)}
                disabled={!currentTrack}
              >
                {isPlaying ? <Pause size={20} fill="#000" /> : <Play size={20} fill="#000" style={{ transform: 'translateX(1px)' }} />}
              </button>

              <button className="icon-btn" onClick={() => seekRelative(10)} disabled={!currentTrack} title="Forward 10s">
                <RotateCw size={16} />
              </button>

              <button className="icon-btn" onClick={onNext} disabled={queue.length <= 1}>
                <SkipForward size={20} />
              </button>

              <button
                className={`icon-btn ${isRepeat !== 'none' ? 'active' : ''}`}
                onClick={() => {
                  if (isRepeat === 'none') setIsRepeat('all');
                  else if (isRepeat === 'all') setIsRepeat('one');
                  else setIsRepeat('none');
                }}
              >
                <Repeat size={16} />
                {isRepeat === 'one' && (
                  <span style={{ fontSize: '9px', position: 'absolute', marginTop: '14px', fontWeight: 'bold' }}>
                    1
                  </span>
                )}
              </button>
            </div>

            <div className="progress-container">
              <span>{formatTime(isDragging ? dragProgress : progress)}</span>
              <input
                type="range"
                className="slider"
                min={0}
                max={duration || currentTrack?.duration || 180}
                value={isDragging ? dragProgress : progress}
                onMouseDown={handleSliderMouseDown}
                onTouchStart={handleSliderMouseDown}
                onChange={handleSliderChange}
                onMouseUp={handleSliderMouseUp}
                onTouchEnd={handleSliderMouseUp}
                disabled={!currentTrack}
                title="Seek track position"
              />
              <span>{formatTime(duration || currentTrack?.duration || 0)}</span>
            </div>
          </div>

          {/* Extra Controls (Right) */}
          <div className="player-right">
            {/* Float Mini-Player button (Picture-in-Picture) */}
            <button
              className="icon-btn"
              onClick={() => floatingPlayer.toggle()}
              disabled={!currentTrack}
              title="Float Mini Player (Picture-in-Picture on tab/window switch)"
            >
              <PictureInPicture2 size={18} />
            </button>

            <button
              className={`icon-btn ${showLyrics ? 'active' : ''}`}
              onClick={() => {
                setShowLyrics(!showLyrics);
                if (!showLyrics) setShowQueue(false);
              }}
              disabled={!currentTrack}
              title="Full-Screen Ambient Lyrics"
            >
              <FileText size={18} />
            </button>

            <button
              className={`icon-btn ${showQueue ? 'active' : ''}`}
              onClick={() => {
                setShowQueue(!showQueue);
                if (!showQueue) setShowLyrics(false);
              }}
              title="Up Next Queue"
            >
              <ListMusic size={18} />
            </button>

            <div className="volume-container">
              <button className="icon-btn" onClick={toggleMute} style={{ width: '28px', height: '28px' }}>
                {isMuted || volume === 0 ? <VolumeX size={16} /> : <Volume2 size={16} />}
              </button>
              <input
                type="range"
                className="slider"
                min={0}
                max={1}
                step={0.01}
                value={isMuted ? 0 : volume}
                onChange={(e) => {
                  const v = parseFloat(e.target.value);
                  setVolume(v);
                  if (v > 0) setIsMuted(false);
                  if (playerRef.current && playerRef.current.setVolume) {
                    playerRef.current.setVolume(Math.round(v * 100));
                  }
                }}
              />
            </div>
          </div>
        </div>
      ) : (
        /* MOBILE 3-STATE PLAYER LAYOUT */
        currentTrack && (
          <>
            {/* MINI STATE (Floating Pill - Reference Match) */}
            {mobilePlayerState === 'mini' && (
              <div 
                className="mobile-mini-player-pill" 
                onClick={() => setMobilePlayerState('full')}
                onTouchStart={swipeHandlers.onTouchStart}
                onTouchMove={swipeHandlers.onTouchMove}
                onTouchEnd={swipeHandlers.onTouchEnd}
                style={{
                  position: 'fixed',
                  bottom: '60px',
                  left: '12px',
                  right: '12px',
                  height: '56px',
                  background: 'rgba(22, 23, 28, 0.97)',
                  backdropFilter: 'blur(24px)',
                  WebkitBackdropFilter: 'blur(24px)',
                  border: '1px solid rgba(255, 255, 255, 0.12)',
                  borderRadius: '32px',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'space-between',
                  padding: '0 12px 0 8px',
                  zIndex: 99,
                  cursor: 'pointer',
                  boxShadow: '0 8px 32px rgba(0, 0, 0, 0.65)',
                  overflow: 'hidden'
                }}
              >
                {/* Thin bottom progress line indicator */}
                <div 
                  style={{
                    position: 'absolute',
                    bottom: 0,
                    left: 0,
                    height: '2.5px',
                    width: `${Math.min(100, ((progress / (duration || currentTrack.duration || 180)) * 100))}%`,
                    background: 'linear-gradient(90deg, #e50914, #ff3366)',
                    boxShadow: '0 0 8px rgba(229, 9, 20, 0.6)',
                    transition: 'width 0.25s linear'
                  }}
                />

                <div style={{ display: 'flex', alignItems: 'center', gap: '10px', flex: 1, minWidth: 0 }}>
                  {/* Circular Vinyl Disk Artwork */}
                  <div 
                    style={{
                      width: '40px',
                      height: '40px',
                      borderRadius: '50%',
                      position: 'relative',
                      overflow: 'hidden',
                      flexShrink: 0,
                      boxShadow: '0 4px 10px rgba(0,0,0,0.5)',
                      border: '1px solid rgba(255,255,255,0.15)',
                      animation: isPlaying ? 'spin 12s linear infinite' : 'none'
                    }}
                  >
                    <img 
                      src={currentTrack.thumbnailUrl} 
                      alt={currentTrack.title} 
                      style={{ width: '100%', height: '100%', objectFit: 'cover' }} 
                    />
                    <div 
                      style={{
                        position: 'absolute',
                        top: '50%',
                        left: '50%',
                        transform: 'translate(-50%, -50%)',
                        width: '8px',
                        height: '8px',
                        borderRadius: '50%',
                        background: '#111',
                        border: '1.5px solid rgba(255,255,255,0.4)'
                      }} 
                    />
                  </div>

                  <div style={{ minWidth: 0 }}>
                    <div style={{ fontWeight: 600, fontSize: '14px', color: '#fff', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                      {currentTrack.title}
                    </div>
                    <div style={{ color: 'rgba(255, 255, 255, 0.55)', fontSize: '11px', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                      {currentTrack.artist}
                    </div>
                  </div>
                </div>

                {/* Right controls */}
                <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }} onClick={(e) => e.stopPropagation()}>
                  <button 
                    onClick={() => onToggleLike(currentTrack)} 
                    style={{ 
                      background: 'none', 
                      border: 'none', 
                      color: likedTracks.some(t => t.id === currentTrack.id) ? '#e50914' : 'rgba(255,255,255,0.65)', 
                      cursor: 'pointer', 
                      padding: '6px', 
                      display: 'flex', 
                      alignItems: 'center' 
                    }}
                  >
                    <Heart size={18} fill={likedTracks.some(t => t.id === currentTrack.id) ? '#e50914' : 'none'} />
                  </button>

                  <button 
                    onClick={() => setIsPlaying(!isPlaying)} 
                    style={{ 
                      background: 'rgba(255, 255, 255, 0.1)', 
                      border: '1px solid rgba(255, 255, 255, 0.15)', 
                      color: '#fff', 
                      cursor: 'pointer', 
                      width: '34px', 
                      height: '34px', 
                      borderRadius: '50%',
                      display: 'flex', 
                      alignItems: 'center', 
                      justifyContent: 'center' 
                    }}
                  >
                    {isPlaying ? <Pause size={16} /> : <Play size={16} style={{ marginLeft: '2px' }} />}
                  </button>

                  <button 
                    onClick={onNext} 
                    style={{ 
                      background: 'none', 
                      border: 'none', 
                      color: 'rgba(255, 255, 255, 0.8)', 
                      cursor: 'pointer', 
                      padding: '6px', 
                      display: 'flex', 
                      alignItems: 'center' 
                    }}
                  >
                    <SkipForward size={18} />
                  </button>
                </div>
              </div>
            )}

            {/* FULL / HALF STATES */}
            {(mobilePlayerState === 'full' || mobilePlayerState === 'half') && (
              <div 
                className={`mobile-full-player ${mobilePlayerState === 'half' ? 'half' : ''}`}
                onTouchStart={swipeHandlers.onTouchStart}
                onTouchMove={swipeHandlers.onTouchMove}
                onTouchEnd={swipeHandlers.onTouchEnd}
                style={{
                  position: 'fixed',
                  top: 0,
                  left: 0,
                  right: 0,
                  bottom: 0,
                  background: 'var(--yt-bg-deep)',
                  zIndex: 1000,
                  display: 'flex',
                  flexDirection: 'column',
                  padding: '24px 20px',
                  paddingTop: 'calc(24px + env(safe-area-inset-top))',
                  paddingBottom: 'calc(24px + env(safe-area-inset-bottom))',
                  boxSizing: 'border-box'
                }}
              >
                <div 
                  onClick={() => setMobilePlayerState('mini')} 
                  style={{ width: '40px', height: '5px', borderRadius: '3px', background: 'rgba(255,255,255,0.2)', margin: '0 auto 24px auto', cursor: 'pointer' }}
                ></div>

                {mobilePlayerState === 'half' ? (
                  <div style={{ flex: 1, display: 'flex', flexDirection: 'column', minHeight: 0 }}>
                    <div style={{ display: 'flex', justifyItems: 'center', justifyContent: 'space-between', alignItems: 'center', marginBottom: '16px' }}>
                      <h3 style={{ fontSize: '18px', fontWeight: 800 }}>Up Next</h3>
                      <button onClick={() => setMobilePlayerState('full')} style={{ background: 'rgba(255,255,255,0.06)', border: 'none', color: '#fff', borderRadius: '12px', padding: '6px 12px', fontSize: '12px', fontWeight: 600 }}>Expand Full</button>
                    </div>
                    <div style={{ flex: 1, overflowY: 'auto', marginBottom: '16px' }}>
                      {queue.map((track, i) => (
                        <div key={track.id + '-' + i} style={{ display: 'flex', alignItems: 'center', gap: '10px', padding: '8px 0', borderBottom: '1px solid rgba(255,255,255,0.03)' }}>
                          <span style={{ fontSize: '12px', color: 'var(--yt-text-secondary)', width: '20px' }}>{i + 1}</span>
                          <img src={track.thumbnailUrl} alt={track.title} style={{ width: '36px', height: '36px', borderRadius: '4px' }} />
                          <div style={{ flex: 1, minWidth: 0 }}>
                            <div style={{ fontSize: '13px', fontWeight: 600, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{track.title}</div>
                            <div style={{ fontSize: '11px', color: 'var(--yt-text-secondary)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{track.artist}</div>
                          </div>
                        </div>
                      ))}
                    </div>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '10px', background: 'rgba(255,255,255,0.03)', padding: '12px', borderRadius: '12px' }}>
                      <Volume2 size={16} />
                      <input 
                        type="range" 
                        min={0} 
                        max={1} 
                        step={0.05} 
                        value={volume} 
                        onChange={(e) => setVolume(parseFloat(e.target.value))} 
                        style={{ flex: 1 }} 
                      />
                    </div>
                  </div>
                ) : (
                  <div style={{ flex: 1, display: 'flex', flexDirection: 'column', justifyContent: 'space-between', minHeight: 0 }}>
                    <div style={{ display: 'flex', justifyItems: 'center', justifyContent: 'space-between', alignItems: 'center' }}>
                      <button onClick={() => setMobilePlayerState('mini')} style={{ background: 'none', border: 'none', color: '#fff' }}>
                        <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="m6 9 6 6 6-6"/></svg>
                      </button>
                      <div style={{ fontSize: '12px', fontWeight: 700, letterSpacing: '1px', textTransform: 'uppercase', color: 'var(--yt-text-secondary)' }}>
                        Playing from {((currentTrack as any).source || 'youtube') === 'youtube' ? 'YouTube' : ((currentTrack as any).source || 'youtube') === 'spotify' ? 'Spotify' : 'Apple Music'}
                      </div>
                      <button onClick={() => setMobilePlayerState('half')} style={{ background: 'none', border: 'none', color: '#fff' }}>
                        <ListMusic size={20} />
                      </button>
                    </div>

                    <div style={{ flex: 1, display: 'flex', alignItems: 'center', justifyContent: 'center', margin: '24px 0', minHeight: 0, position: 'relative' }}>
                      {localShowLyrics ? (
                        <div style={{ width: '100%', height: '100%', background: 'rgba(0,0,0,0.5)', borderRadius: '16px', overflow: 'hidden', display: 'flex', flexDirection: 'column' }}>
                          <KaraokeLyrics
                            lyrics={dynamicLyrics || currentTrack.lyrics}
                            progress={isDragging ? dragProgress : progress}
                            duration={duration || currentTrack.duration || 180}
                            onSeek={(secs) => {
                              setProgress(secs);
                              setDragProgress(secs);
                              if (playerRef.current && playerRef.current.seekTo) {
                                playerRef.current.seekTo(secs, true);
                              }
                            }}
                            compact
                            fontSize="medium"
                          />
                        </div>
                      ) : (
                        <img 
                          src={currentTrack.thumbnailUrl} 
                          alt={currentTrack.title} 
                          style={{ width: '80vw', maxHeight: '80vw', aspectRatio: '1', borderRadius: '16px', objectFit: 'cover', boxShadow: '0 12px 48px rgba(0,0,0,0.6)' }} 
                        />
                      )}
                    </div>

                    <div style={{ marginBottom: '16px' }}>
                      <div style={{ display: 'flex', justifyItems: 'center', justifyContent: 'space-between', alignItems: 'center' }}>
                        <div style={{ minWidth: 0, flex: 1 }}>
                          <h2 style={{ fontSize: '22px', fontWeight: 800, color: '#fff', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{currentTrack.title}</h2>
                          <p style={{ fontSize: '14px', color: 'var(--yt-text-secondary)', marginTop: '4px', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{currentTrack.artist}</p>
                        </div>
                        <button onClick={() => onToggleLike(currentTrack)} style={{ background: 'none', border: 'none', color: isLiked ? 'var(--yt-accent)' : '#fff', padding: '8px' }}>
                          <Heart size={24} fill={isLiked ? 'var(--yt-accent)' : 'none'} />
                        </button>
                      </div>
                    </div>

                    <div 
                      style={{ marginBottom: '24px' }}
                      onTouchStart={(e) => e.stopPropagation()}
                      onTouchMove={(e) => e.stopPropagation()}
                      onTouchEnd={(e) => e.stopPropagation()}
                    >
                      <input 
                        type="range" 
                        className="slider"
                        min={0} 
                        max={duration || currentTrack.duration || 180} 
                        value={isDragging ? dragProgress : progress} 
                        onMouseDown={handleSliderMouseDown}
                        onTouchStart={handleSliderMouseDown}
                        onChange={handleSliderChange}
                        onMouseUp={handleSliderMouseUp}
                        onTouchEnd={handleSliderMouseUp}
                        style={{ width: '100%', marginBottom: '8px', touchAction: 'none' }} 
                      />
                      <div style={{ display: 'flex', justifyItems: 'center', justifyContent: 'space-between', fontSize: '11px', color: 'var(--yt-text-secondary)' }}>
                        <span>{formatTime(isDragging ? dragProgress : progress)}</span>
                        <span>{formatTime(duration || currentTrack.duration || 0)}</span>
                      </div>
                    </div>

                    <div style={{ display: 'flex', justifyItems: 'center', justifyContent: 'space-between', alignItems: 'center', marginBottom: '24px' }}>
                      <button className={`icon-btn ${isShuffle ? 'active' : ''}`} onClick={() => setIsShuffle(!isShuffle)}>
                        <Shuffle size={18} />
                      </button>
                      <button className="icon-btn" onClick={onPrev} disabled={queue.length <= 1}>
                        <SkipBack size={24} />
                      </button>
                      <button className="icon-btn" onClick={() => seekRelative(-10)} title="Rewind 10s">
                        <RotateCcw size={20} />
                      </button>
                      <button 
                        onClick={() => setIsPlaying(!isPlaying)} 
                        style={{ width: '60px', height: '60px', borderRadius: '50%', background: '#fff', color: '#000', border: 'none', display: 'flex', alignItems: 'center', justifyContent: 'center', boxShadow: '0 8px 24px rgba(255,255,255,0.1)' }}
                      >
                        {isPlaying ? <Pause size={26} fill="#000" /> : <Play size={26} fill="#000" style={{ transform: 'translateX(2px)' }} />}
                      </button>
                      <button className="icon-btn" onClick={() => seekRelative(10)} title="Forward 10s">
                        <RotateCw size={20} />
                      </button>
                      <button className="icon-btn" onClick={onNext} disabled={queue.length <= 1}>
                        <SkipForward size={24} />
                      </button>
                      <button 
                        className={`icon-btn ${isRepeat !== 'none' ? 'active' : ''}`} 
                        onClick={() => {
                          if (isRepeat === 'none') setIsRepeat('all');
                          else if (isRepeat === 'all') setIsRepeat('one');
                          else setIsRepeat('none');
                        }}
                      >
                        <Repeat size={18} />
                      </button>
                    </div>

                    {/* Volume Slider in Mobile Full Player */}
                    <div style={{ display: 'flex', alignItems: 'center', gap: '12px', padding: '0 8px', marginBottom: '20px' }}>
                      <button
                        onClick={toggleMute}
                        style={{ background: 'none', border: 'none', color: isMuted || volume === 0 ? 'var(--yt-accent)' : 'rgba(255,255,255,0.7)', cursor: 'pointer', padding: 0, display: 'flex', alignItems: 'center' }}
                      >
                        {isMuted || volume === 0 ? <VolumeX size={18} /> : <Volume2 size={18} />}
                      </button>
                      <input
                        type="range"
                        className="slider"
                        min={0}
                        max={1}
                        step={0.01}
                        value={isMuted ? 0 : volume}
                        onChange={(e) => {
                          const v = parseFloat(e.target.value);
                          setVolume(v);
                          if (v > 0) setIsMuted(false);
                          if (playerRef.current && playerRef.current.setVolume) {
                            playerRef.current.setVolume(Math.round(v * 100));
                          }
                        }}
                        style={{ flex: 1, touchAction: 'none' }}
                      />
                    </div>

                    <div style={{ display: 'flex', justifyItems: 'center', justifyContent: 'space-around', alignItems: 'center', borderTop: '1px solid rgba(255,255,255,0.06)', paddingTop: '16px' }}>
                      <button 
                        onClick={() => setLocalShowLyrics(!localShowLyrics)} 
                        style={{ background: 'none', border: 'none', color: localShowLyrics ? 'var(--yt-accent)' : 'var(--yt-text-secondary)', fontSize: '12px', display: 'flex', alignItems: 'center', gap: '6px', fontWeight: 600, cursor: 'pointer' }}
                      >
                        <FileText size={16} /> Lyrics
                      </button>
                      <button 
                        onClick={() => {
                          setMobilePlayerState('mini');
                          setShowLyrics(true);
                        }} 
                        style={{ background: 'none', border: 'none', color: showLyrics ? 'var(--yt-accent)' : 'var(--yt-text-secondary)', fontSize: '12px', display: 'flex', alignItems: 'center', gap: '6px', fontWeight: 600, cursor: 'pointer' }}
                        title="Full-Screen Ambient Lyrics"
                      >
                        <FileText size={16} /> Ambient
                      </button>
                      <button 
                        onClick={() => floatingPlayer.toggle()} 
                        style={{ background: 'none', border: 'none', color: 'var(--yt-text-secondary)', fontSize: '12px', display: 'flex', alignItems: 'center', gap: '6px', fontWeight: 600, cursor: 'pointer' }}
                        title="Picture-in-Picture Float Player"
                      >
                        <PictureInPicture2 size={16} /> Float
                      </button>
                      <button 
                        onClick={() => setMobilePlayerState('half')} 
                        style={{ background: 'none', border: 'none', color: 'var(--yt-text-secondary)', fontSize: '12px', display: 'flex', alignItems: 'center', gap: '6px', fontWeight: 600, cursor: 'pointer' }}
                      >
                        <ListMusic size={16} /> Queue
                      </button>
                      <button 
                        onClick={() => {
                          const shareText = `Listening to ${currentTrack.title} by ${currentTrack.artist} on Resonate!`;
                          if (navigator.share) {
                            navigator.share({ title: 'Resonate Music', text: shareText, url: window.location.origin });
                          } else {
                            alert(shareText);
                          }
                        }}
                        style={{ background: 'none', border: 'none', color: 'var(--yt-text-secondary)', fontSize: '12px', display: 'flex', alignItems: 'center', gap: '6px', fontWeight: 600 }}
                      >
                        Share
                      </button>
                    </div>
                  </div>
                )}
              </div>
            )}
          </>
        )
      )}
    </>
  );
};
