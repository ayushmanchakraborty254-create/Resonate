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
  Trash2,
  Disc,
  Plus,
} from 'lucide-react';
import type { Track } from '../types';
import { useSwipeGesture } from '../hooks/useSwipeGesture';
import { useBreakpoint } from '../utils/responsive';
import { floatingPlayer } from '../utils/floatingPlayer';
import { KaraokeLyrics } from './KaraokeLyrics';
import { useTrackLyrics } from '../utils/lyrics';
import { handleTrackImageLoad, handleTrackImageError, getTrackArtwork } from '../utils/artwork';

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
  onSelectFromQueue?: (index: number) => void;
  onRemoveFromQueue?: (index: number) => void;
  onAddToQueue?: (track: Track) => void;
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
  onSelectFromQueue,
  onRemoveFromQueue,
  onAddToQueue,
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
    disabled: isDragging,
    onSwipeDown: () => {
      if (mobilePlayerState === 'full') setMobilePlayerState('mini');
      else if (mobilePlayerState === 'half') setMobilePlayerState('mini');
    },
    onSwipeLeft: () => onNext(),
    onSwipeRight: () => onPrev(),
  });

  const isLiked = currentTrack ? likedTracks.some((t) => t.id === currentTrack.id) : false;

  // Player State Architecture: reflects real YouTube player status, never assumed
  const [playerStatus, setPlayerStatus] = useState<'idle' | 'loading' | 'playing' | 'paused' | 'buffering' | 'interrupted' | 'error'>('idle');
  const [statusMessage, setStatusMessage] = useState<string | null>(null);
  const [needsResumeGesture, setNeedsResumeGesture] = useState<boolean>(false);

  const isPlayingRef = useRef(isPlaying);
  useEffect(() => {
    isPlayingRef.current = isPlaying;
  }, [isPlaying]);

  const onNextRef = useRef(onNext);
  useEffect(() => {
    onNextRef.current = onNext;
  }, [onNext]);

  const onPrevRef = useRef(onPrev);
  useEffect(() => {
    onPrevRef.current = onPrev;
  }, [onPrev]);

  const handleCoverLoad = (e: React.SyntheticEvent<HTMLImageElement>) => {
    handleTrackImageLoad(e, currentTrack);
  };

  const handleCoverError = (e: React.SyntheticEvent<HTMLImageElement>) => {
    handleTrackImageError(e, currentTrack);
  };

  // Explicit user-gesture playback controller (complies with browser & YouTube autoplay policy)
  const togglePlayback = () => {
    if (!playerRef.current) return;
    if (isPlaying) {
      if (typeof playerRef.current.pauseVideo === 'function') {
        playerRef.current.pauseVideo();
      }
    } else {
      setNeedsResumeGesture(false);
      setStatusMessage(null);
      if (typeof playerRef.current.playVideo === 'function') {
        playerRef.current.playVideo();
      } else if (currentTrack && typeof playerRef.current.loadVideoById === 'function') {
        playerRef.current.loadVideoById(currentTrack.id, progress);
      }
    }
  };

  // Initialize YouTube Iframe Player (Compliant with official 200x200 min viewport)
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
        height: '240',
        width: '240',
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
          playsinline: 1,
          origin: window.location.origin
        },
        events: {
          onReady: (event: any) => {
            setPlayerStatus('idle');
            if (currentTrack?.id) {
              try {
                // Cue saved position without forcing unprompted autoplay
                event.target.cueVideoById(currentTrack.id, progress);
              } catch (_) {}
            }
          },
          onStateChange: (event: any) => {
            const state = event.data;
            // YouTube Player States:
            // -1: UNSTARTED, 0: ENDED, 1: PLAYING, 2: PAUSED, 3: BUFFERING, 5: CUED
            if (state === 1) { // PLAYING
              setPlayerStatus('playing');
              setIsPlaying(true);
              setNeedsResumeGesture(false);
              setStatusMessage(null);
            } else if (state === 2) { // PAUSED
              setPlayerStatus('paused');
              setIsPlaying(false);
              // Respect pause; do NOT attempt aggressive restart loops
            } else if (state === 3) { // BUFFERING
              setPlayerStatus('buffering');
            } else if (state === 0) { // ENDED
              setPlayerStatus('idle');
              setIsPlaying(false);
              onNextRef.current();
            } else if (state === 5) { // CUED
              setPlayerStatus('idle');
              setIsPlaying(false);
            }
          },
          onError: (event: any) => {
            console.warn('[Resonate] YouTube Player error:', event.data);
            setPlayerStatus('error');
            setIsPlaying(false);
            if (event.data === 150 || event.data === 101) {
              setStatusMessage('Embedded playback restricted by video owner. Skipping...');
              setTimeout(() => onNextRef.current(), 1500);
            } else if (event.data === 100 || event.data === 2) {
              setStatusMessage('Track unavailable on YouTube. Skipping...');
              setTimeout(() => onNextRef.current(), 1500);
            } else {
              setStatusMessage('Playback error occurred.');
            }
          },
        },
      });
    }
  }, []);

  // Sync Video Loading with currentTrack (cues/loads on explicit track selection)
  useEffect(() => {
    if (playerRef.current && typeof playerRef.current.loadVideoById === 'function' && currentTrack?.id) {
      playerRef.current.loadVideoById(currentTrack.id, 0);
      setNeedsResumeGesture(false);
      setStatusMessage(null);
    }
  }, [currentTrack?.id]);

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
  }, [currentTrack, isPlaying, progress, dragProgress, isDragging, duration]);

  // Native & Web MediaSession OS Integration (Lock screen, Quick Settings media tile, Android notification)
  // Only updates on Track, Play state, or Duration change - NOT on every 100ms progress tick to prevent Android IPC flooding
  useEffect(() => {
    if (currentTrack && typeof window !== 'undefined') {
      const totalDur = duration || currentTrack.duration || 180;
      const currentPos = progress;

      const trackArtwork = getTrackArtwork(currentTrack);

      // 1. Android Native Notification Bridge
      try {
        if ((window as any).ResonateNative?.updateMediaNotification) {
          (window as any).ResonateNative.updateMediaNotification(
            currentTrack.title,
            currentTrack.artist,
            currentTrack.album || 'Resonate Music',
            trackArtwork,
            isPlaying,
            totalDur,
            currentPos
          );
        }
      } catch (_) {}

      // 2. Standard Web navigator.mediaSession
      if ('mediaSession' in navigator) {
        try {
          navigator.mediaSession.metadata = new MediaMetadata({
            title: currentTrack.title,
            artist: currentTrack.artist,
            album: currentTrack.album || 'Resonate Music',
            artwork: [
              { src: trackArtwork, sizes: '96x96', type: 'image/jpeg' },
              { src: trackArtwork, sizes: '128x128', type: 'image/jpeg' },
              { src: trackArtwork, sizes: '256x256', type: 'image/jpeg' },
              { src: trackArtwork, sizes: '512x512', type: 'image/jpeg' },
            ],
          });

          navigator.mediaSession.playbackState = isPlaying ? 'playing' : 'paused';

          navigator.mediaSession.setActionHandler('play', () => {
            setIsPlaying(true);
            if (playerRef.current?.playVideo) playerRef.current.playVideo();
          });

          navigator.mediaSession.setActionHandler('pause', () => {
            setIsPlaying(false);
            if (playerRef.current?.pauseVideo) playerRef.current.pauseVideo();
          });

          navigator.mediaSession.setActionHandler('previoustrack', () => {
            onPrev();
          });

          navigator.mediaSession.setActionHandler('nexttrack', () => {
            onNext();
          });

          navigator.mediaSession.setActionHandler('seekto', (details) => {
            if (details.seekTime != null) {
              setProgress(details.seekTime);
              if (playerRef.current?.seekTo) {
                playerRef.current.seekTo(details.seekTime, true);
              }
            }
          });

          if (totalDur > 0 && typeof (navigator.mediaSession as any).setPositionState === 'function') {
            try {
              (navigator.mediaSession as any).setPositionState({
                duration: totalDur,
                playbackRate: 1,
                position: Math.min(totalDur, Math.max(0, currentPos)),
              });
            } catch (_) {}
          }
        } catch (_) {}
      }
    }
  }, [currentTrack?.id, isPlaying, duration, onNext, onPrev]);

  // Two-way Remote Control Dispatcher (invoked by Native Android Notification Actions & App Lifecycle)
  useEffect(() => {
    (window as any).resonateRemoteControl = (action: string, param?: number) => {
      if (!playerRef.current) return;
      if (action === 'play') {
        if (typeof playerRef.current.playVideo === 'function') {
          playerRef.current.playVideo();
        }
      } else if (action === 'pause') {
        if (typeof playerRef.current.pauseVideo === 'function') {
          playerRef.current.pauseVideo();
        }
      } else if (action === 'toggle') {
        togglePlayback();
      } else if (action === 'next') {
        onNextRef.current();
      } else if (action === 'prev') {
        onPrevRef.current();
      } else if (action === 'seek' && typeof param === 'number') {
        setProgress(param);
        if (playerRef.current?.seekTo) playerRef.current.seekTo(param, true);
      } else if (action === 'appPaused') {
        // App minimized: continue uninterrupted background playback
      } else if (action === 'appResumed') {
        // App returned to foreground: smoothly resume if it was actively playing
        if (isPlayingRef.current && playerRef.current) {
          try {
            if (typeof playerRef.current.getPlayerState === 'function') {
              const st = playerRef.current.getPlayerState();
              if (st !== 1 && typeof playerRef.current.playVideo === 'function') {
                playerRef.current.playVideo();
              }
            }
          } catch (_) {}
        }
        setNeedsResumeGesture(false);
        setStatusMessage(null);
      }
    };

    return () => {
      delete (window as any).resonateRemoteControl;
    };
  }, []);

  // Track progress updates (poll at 500ms strictly for seeker reading, zero aggressive restart loops)
  useEffect(() => {
    if (isPlaying) {
      progressIntervalRef.current = setInterval(() => {
        if (!isDragging && playerRef.current && typeof playerRef.current.getCurrentTime === 'function') {
          try {
            const curr = playerRef.current.getCurrentTime();
            const dur = playerRef.current.getDuration?.() || currentTrack?.duration || 0;
            if (typeof curr === 'number' && !isNaN(curr)) {
              setProgress(curr);
            }
            if (dur > 0) setDuration(Math.floor(dur));
          } catch (_) {}
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

  const effectiveProgress = isDragging ? dragProgress : progress;
  const totalDuration = duration || currentTrack?.duration || 180;
  const progressPercent = Math.min(100, Math.max(0, (effectiveProgress / Math.max(1, totalDuration)) * 100));
  const progressFillStyle = {
    background: `linear-gradient(to right, #ff3366 0%, #e50914 ${progressPercent}%, rgba(255, 255, 255, 0.18) ${progressPercent}%, rgba(255, 255, 255, 0.18) 100%)`,
  };

  return (
    <>
      {/* Official YouTube Embed Player Stage (Fully compliant with 200x200 min viewport) */}
      <div 
        style={{ 
          position: mobilePlayerState === 'full' ? 'relative' : 'fixed', 
          bottom: mobilePlayerState === 'full' ? 'auto' : '84px', 
          right: mobilePlayerState === 'full' ? 'auto' : '16px', 
          width: mobilePlayerState === 'full' ? 'min(78vw, 320px)' : '240px', 
          height: mobilePlayerState === 'full' ? 'min(78vw, 320px)' : '240px', 
          borderRadius: '16px',
          overflow: 'hidden',
          backgroundColor: '#0a0a0a',
          boxShadow: '0 8px 32px rgba(0,0,0,0.6)',
          zIndex: mobilePlayerState === 'full' ? 5 : -1,
          pointerEvents: mobilePlayerState === 'full' ? 'auto' : 'none',
          visibility: currentTrack ? 'visible' : 'hidden',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
        }} 
      >
        <div id={iframeContainerId} style={{ width: '100%', height: '100%' }}></div>
      </div>

      {!isMobile ? (
        /* DESKTOP LAYOUT */
        <div className="player-bar">
          {/* Track details (Left) */}
          <div className="player-left">
            {currentTrack ? (
              <>
                <img
                  src={getTrackArtwork(currentTrack)}
                  alt={currentTrack.title}
                  className="player-img"
                  onLoad={handleCoverLoad}
                  onError={handleCoverError}
                />
                <div className="player-track-info">
                  <div className="player-title">{currentTrack.title}</div>
                  <div className="player-artist">
                    {currentTrack.artist}
                    {playerStatus === 'buffering' ? ' • Buffering...' : ''}
                  </div>
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
                onClick={togglePlayback}
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
                style={progressFillStyle}
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

                <div style={{ display: 'flex', alignItems: 'center', gap: '12px', flex: 1, minWidth: 0 }}>
                  {/* Song Cover Artwork with Play/Pause button directly over the cover */}
                  <div 
                    style={{
                      width: '42px',
                      height: '42px',
                      borderRadius: '50%',
                      position: 'relative',
                      overflow: 'hidden',
                      flexShrink: 0,
                      boxShadow: '0 4px 12px rgba(0,0,0,0.5)',
                      border: '1.5px solid rgba(255,255,255,0.18)',
                    }}
                  >
                    <img 
                      src={getTrackArtwork(currentTrack)} 
                      alt={currentTrack.title} 
                      onLoad={handleCoverLoad}
                      onError={handleCoverError}
                      style={{ 
                        width: '100%', 
                        height: '100%', 
                        objectFit: 'cover',
                        animation: isPlaying ? 'spin 12s linear infinite' : 'none'
                      }} 
                    />
                    {/* Play/Pause Button centered directly above the song cover */}
                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        togglePlayback();
                      }}
                      style={{
                        position: 'absolute',
                        inset: 0,
                        background: 'rgba(0, 0, 0, 0.42)',
                        border: 'none',
                        color: '#fff',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        cursor: 'pointer',
                        padding: 0,
                        zIndex: 2,
                        transition: 'background 0.2s ease',
                      }}
                      title={isPlaying ? 'Pause' : 'Play'}
                      aria-label={isPlaying ? 'Pause' : 'Play'}
                    >
                      {isPlaying ? (
                        <Pause size={17} fill="#fff" />
                      ) : (
                        <Play size={17} fill="#fff" style={{ transform: 'translateX(1px)' }} />
                      )}
                    </button>
                  </div>

                  <div style={{ minWidth: 0 }}>
                    <div style={{ fontWeight: 600, fontSize: '14px', color: '#fff', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                      {currentTrack.title}
                    </div>
                    <div style={{ color: needsResumeGesture ? '#93c5fd' : 'rgba(255, 255, 255, 0.55)', fontSize: '11px', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', fontWeight: needsResumeGesture ? 600 : 400 }}>
                      {needsResumeGesture ? 'Tap to resume' : currentTrack.artist}
                    </div>
                  </div>
                </div>

                {/* Right controls: Heart and Next track */}
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
                    title="Like"
                  >
                    <Heart size={18} fill={likedTracks.some(t => t.id === currentTrack.id) ? '#e50914' : 'none'} />
                  </button>

                  <button 
                    onClick={(e) => {
                      e.stopPropagation();
                      onNext();
                    }} 
                    style={{ 
                      background: 'none', 
                      border: 'none', 
                      color: 'rgba(255, 255, 255, 0.8)', 
                      cursor: 'pointer', 
                      padding: '6px', 
                      display: 'flex', 
                      alignItems: 'center' 
                    }}
                    title="Next track"
                  >
                    <SkipForward size={20} />
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
                      <div>
                        <h3 style={{ fontSize: '18px', fontWeight: 800, margin: 0 }}>Up Next</h3>
                        <span style={{ fontSize: '11px', color: 'var(--yt-text-secondary)' }}>{queue.length} songs in queue</span>
                      </div>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                        {onAddToQueue && (
                          <button
                            onClick={() => {
                              if (currentTrack) onAddToQueue(currentTrack);
                            }}
                            style={{
                              background: 'rgba(255,255,255,0.08)',
                              border: '1px solid rgba(255,255,255,0.12)',
                              color: '#fff',
                              borderRadius: '12px',
                              padding: '5px 10px',
                              fontSize: '11px',
                              fontWeight: 600,
                              display: 'flex',
                              alignItems: 'center',
                              gap: '4px',
                              cursor: 'pointer',
                            }}
                            title="Duplicate or append to queue"
                          >
                            <Plus size={13} /> Add
                          </button>
                        )}
                        <button onClick={() => setMobilePlayerState('full')} style={{ background: 'rgba(255,255,255,0.06)', border: 'none', color: '#fff', borderRadius: '12px', padding: '6px 12px', fontSize: '12px', fontWeight: 600, cursor: 'pointer' }}>Expand Full</button>
                      </div>
                    </div>
                    <div style={{ flex: 1, overflowY: 'auto', marginBottom: '16px' }}>
                      {queue.length === 0 ? (
                        <div style={{ color: 'var(--yt-text-secondary)', textAlign: 'center', padding: '32px 0', fontSize: '13px' }}>
                          Queue is empty.
                        </div>
                      ) : (
                        queue.map((track, i) => {
                          const isActive = currentTrack?.id === track.id;
                          return (
                            <div 
                              key={track.id + '-' + i} 
                              onClick={() => onSelectFromQueue && onSelectFromQueue(i)}
                              style={{ 
                                display: 'flex', 
                                alignItems: 'center', 
                                gap: '10px', 
                                padding: '10px 8px', 
                                borderRadius: '8px',
                                background: isActive ? 'rgba(255,255,255,0.06)' : 'transparent',
                                borderLeft: isActive ? '3px solid var(--yt-accent)' : '3px solid transparent',
                                borderBottom: '1px solid rgba(255,255,255,0.03)',
                                cursor: 'pointer'
                              }}
                            >
                              <span style={{ fontSize: '12px', color: isActive ? 'var(--yt-accent)' : 'var(--yt-text-secondary)', width: '20px', fontWeight: isActive ? 700 : 400 }}>
                                {isActive ? <Disc size={13} className="spinning" /> : i + 1}
                              </span>
                              <img 
                                src={getTrackArtwork(track)} 
                                alt={track.title} 
                                onLoad={handleCoverLoad}
                                onError={handleCoverError}
                                style={{ width: '38px', height: '38px', borderRadius: '6px', objectFit: 'cover' }} 
                              />
                              <div style={{ flex: 1, minWidth: 0 }}>
                                <div style={{ fontSize: '13px', fontWeight: 600, color: isActive ? 'var(--yt-accent)' : '#fff', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{track.title}</div>
                                <div style={{ fontSize: '11px', color: 'var(--yt-text-secondary)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{track.artist}</div>
                              </div>
                              {onRemoveFromQueue && (
                                <button
                                  onClick={(e) => {
                                    e.stopPropagation();
                                    onRemoveFromQueue(i);
                                  }}
                                  style={{
                                    background: 'none',
                                    border: 'none',
                                    color: 'rgba(255,255,255,0.35)',
                                    padding: '6px',
                                    cursor: 'pointer',
                                    display: 'flex',
                                    alignItems: 'center',
                                  }}
                                  title="Remove from queue"
                                >
                                  <Trash2 size={15} />
                                </button>
                              )}
                            </div>
                          );
                        })
                      )}
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
                          src={getTrackArtwork(currentTrack)} 
                          alt={currentTrack.title} 
                          onLoad={handleCoverLoad}
                          onError={handleCoverError}
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
                      data-no-swipe="true"
                      style={{ marginBottom: '24px', touchAction: 'none' }}
                      onMouseDown={(e) => e.stopPropagation()}
                      onMouseMove={(e) => e.stopPropagation()}
                      onMouseUp={(e) => e.stopPropagation()}
                      onTouchStart={(e) => e.stopPropagation()}
                      onTouchMove={(e) => e.stopPropagation()}
                      onTouchEnd={(e) => e.stopPropagation()}
                      onTouchCancel={(e) => e.stopPropagation()}
                    >
                      <input 
                        type="range" 
                        className="slider"
                        data-no-swipe="true"
                        min={0} 
                        max={duration || currentTrack.duration || 180} 
                        value={isDragging ? dragProgress : progress} 
                        onMouseDown={handleSliderMouseDown}
                        onTouchStart={handleSliderMouseDown}
                        onChange={handleSliderChange}
                        onMouseUp={handleSliderMouseUp}
                        onTouchEnd={handleSliderMouseUp}
                        style={{ width: '100%', marginBottom: '8px', touchAction: 'none', ...progressFillStyle }} 
                      />
                      <div style={{ display: 'flex', justifyItems: 'center', justifyContent: 'space-between', fontSize: '11px', color: 'var(--yt-text-secondary)', userSelect: 'none' }}>
                        <span>{formatTime(isDragging ? dragProgress : progress)}</span>
                        <span>{formatTime(duration || currentTrack.duration || 0)}</span>
                      </div>
                    </div>

                    {needsResumeGesture && (
                      <div 
                        onClick={togglePlayback}
                        style={{
                          marginBottom: '16px',
                          padding: '10px 16px',
                          background: 'rgba(59, 130, 246, 0.15)',
                          border: '1px solid rgba(59, 130, 246, 0.35)',
                          borderRadius: '12px',
                          display: 'flex',
                          alignItems: 'center',
                          justifyContent: 'space-between',
                          cursor: 'pointer'
                        }}
                      >
                        <span style={{ fontSize: '13px', color: '#bfdbfe', fontWeight: 600 }}>
                          {statusMessage || 'Playback paused • Tap to resume'}
                        </span>
                        <div style={{ background: '#2563eb', color: '#fff', padding: '4px 12px', borderRadius: '16px', fontSize: '12px', fontWeight: 700 }}>
                          Resume
                        </div>
                      </div>
                    )}

                    <div style={{ display: 'flex', justifyItems: 'center', justifyContent: 'space-between', alignItems: 'center', marginBottom: '24px' }}>
                      <button className={`icon-btn ${isShuffle ? 'active' : ''}`} onClick={() => setIsShuffle(!isShuffle)}>
                        <Shuffle size={18} />
                      </button>
                      <button className="icon-btn" onClick={onPrev}>
                        <SkipBack size={24} />
                      </button>
                      <button className="icon-btn" onClick={() => seekRelative(-10)} title="Rewind 10s">
                        <RotateCcw size={20} />
                      </button>
                      <button 
                        onClick={togglePlayback} 
                        style={{ width: '60px', height: '60px', borderRadius: '50%', background: '#fff', color: '#000', border: 'none', display: 'flex', alignItems: 'center', justifyContent: 'center', boxShadow: '0 8px 24px rgba(255,255,255,0.1)' }}
                      >
                        {isPlaying ? <Pause size={26} fill="#000" /> : <Play size={26} fill="#000" style={{ transform: 'translateX(2px)' }} />}
                      </button>
                      <button className="icon-btn" onClick={() => seekRelative(10)} title="Forward 10s">
                        <RotateCw size={20} />
                      </button>
                      <button className="icon-btn" onClick={onNext} title="Next track">
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
