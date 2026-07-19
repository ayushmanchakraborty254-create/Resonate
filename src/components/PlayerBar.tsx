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
} from 'lucide-react';
import type { Track } from '../types';
import { useSwipeGesture } from '../hooks/useSwipeGesture';
import { useBreakpoint } from '../utils/responsive';

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

  const { isMobile } = useBreakpoint();
  const [mobilePlayerState, setMobilePlayerState] = useState<'mini' | 'half' | 'full'>('mini');
  const [localShowLyrics, setLocalShowLyrics] = useState(false);

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

  // Track progress updates
  useEffect(() => {
    if (isPlaying) {
      progressIntervalRef.current = setInterval(() => {
        if (playerRef.current && playerRef.current.getCurrentTime && playerRef.current.getDuration) {
          const curr = Math.floor(playerRef.current.getCurrentTime());
          const dur = Math.floor(playerRef.current.getDuration());
          setProgress(curr);
          setDuration(dur);
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
  }, [isPlaying]);

  const handleProgressChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const val = parseInt(e.target.value);
    setProgress(val);
    if (playerRef.current && playerRef.current.seekTo) {
      playerRef.current.seekTo(val, true);
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

              <button
                className="icon-btn icon-btn-large"
                onClick={() => setIsPlaying(!isPlaying)}
                disabled={!currentTrack}
              >
                {isPlaying ? <Pause size={20} fill="#000" /> : <Play size={20} fill="#000" style={{ transform: 'translateX(1px)' }} />}
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
              <span>{formatTime(progress)}</span>
              <input
                type="range"
                className="slider"
                min={0}
                max={duration || 180}
                value={progress}
                onChange={handleProgressChange}
                disabled={!currentTrack}
              />
              <span>{formatTime(duration)}</span>
            </div>
          </div>

          {/* Extra Controls (Right) */}
          <div className="player-right">
            <button
              className={`icon-btn ${showLyrics ? 'active' : ''}`}
              onClick={() => {
                setShowLyrics(!showLyrics);
                if (!showLyrics) setShowQueue(false);
              }}
              disabled={!currentTrack}
              title="Lyrics"
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
                step={0.05}
                value={volume}
                onChange={(e) => {
                  const v = parseFloat(e.target.value);
                  setVolume(v);
                  if (v > 0) setIsMuted(false);
                }}
              />
            </div>
          </div>
        </div>
      ) : (
        /* MOBILE 3-STATE PLAYER LAYOUT */
        currentTrack && (
          <>
            {/* MINI STATE */}
            {mobilePlayerState === 'mini' && (
              <div 
                className="mobile-mini-player" 
                onClick={() => setMobilePlayerState('full')}
                onTouchStart={swipeHandlers.onTouchStart}
                onTouchMove={swipeHandlers.onTouchMove}
                onTouchEnd={swipeHandlers.onTouchEnd}
                style={{
                  position: 'fixed',
                  bottom: '56px',
                  left: 0,
                  right: 0,
                  height: '60px',
                  background: 'rgba(20, 20, 20, 0.95)',
                  backdropFilter: 'blur(20px)',
                  borderTop: '1px solid rgba(255,255,255,0.06)',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'space-between',
                  padding: '0 16px',
                  zIndex: 99,
                  cursor: 'pointer'
                }}
              >
                <div style={{ display: 'flex', alignItems: 'center', gap: '10px', flex: 1, minWidth: 0 }}>
                  <img src={currentTrack.thumbnailUrl} alt={currentTrack.title} style={{ width: '40px', height: '40px', borderRadius: '4px', objectFit: 'cover' }} />
                  <div style={{ minWidth: 0 }}>
                    <div style={{ fontWeight: 600, fontSize: '14px', color: '#fff', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{currentTrack.title}</div>
                    <div style={{ color: 'var(--yt-text-secondary)', fontSize: '11px', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{currentTrack.artist}</div>
                  </div>
                </div>
                <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }} onClick={(e) => e.stopPropagation()}>
                  <button onClick={() => setIsPlaying(!isPlaying)} style={{ background: 'none', border: 'none', color: '#fff', cursor: 'pointer', width: '36px', height: '36px', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                    {isPlaying ? <Pause size={20} /> : <Play size={20} />}
                  </button>
                  <button onClick={onNext} style={{ background: 'none', border: 'none', color: '#fff', cursor: 'pointer', width: '36px', height: '36px', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
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
                        <div style={{ width: '100%', height: '100%', overflowY: 'auto', background: 'rgba(0,0,0,0.4)', borderRadius: '16px', padding: '20px', textAlign: 'center', fontSize: '18px', lineHeight: '2', color: '#fff' }}>
                          <h4 style={{ fontSize: '14px', color: 'var(--yt-text-secondary)', marginBottom: '16px' }}>LYRICS</h4>
                          <div style={{ whiteSpace: 'pre-line' }}>
                            {currentTrack.lyrics || "[No lyrics available for this track]"}
                          </div>
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

                    <div style={{ marginBottom: '24px' }}>
                      <input 
                        type="range" 
                        className="slider"
                        min={0} 
                        max={duration || 180} 
                        value={progress} 
                        onChange={handleProgressChange} 
                        style={{ width: '100%', marginBottom: '8px' }} 
                      />
                      <div style={{ display: 'flex', justifyItems: 'center', justifyContent: 'space-between', fontSize: '11px', color: 'var(--yt-text-secondary)' }}>
                        <span>{formatTime(progress)}</span>
                        <span>{formatTime(duration)}</span>
                      </div>
                    </div>

                    <div style={{ display: 'flex', justifyItems: 'center', justifyContent: 'space-between', alignItems: 'center', marginBottom: '24px' }}>
                      <button className={`icon-btn ${isShuffle ? 'active' : ''}`} onClick={() => setIsShuffle(!isShuffle)}>
                        <Shuffle size={20} />
                      </button>
                      <button className="icon-btn" onClick={onPrev} disabled={queue.length <= 1}>
                        <SkipBack size={28} />
                      </button>
                      <button 
                        onClick={() => setIsPlaying(!isPlaying)} 
                        style={{ width: '64px', height: '64px', borderRadius: '50%', background: '#fff', color: '#000', border: 'none', display: 'flex', alignItems: 'center', justifyContent: 'center', boxShadow: '0 8px 24px rgba(255,255,255,0.1)' }}
                      >
                        {isPlaying ? <Pause size={28} fill="#000" /> : <Play size={28} fill="#000" style={{ transform: 'translateX(2px)' }} />}
                      </button>
                      <button className="icon-btn" onClick={onNext} disabled={queue.length <= 1}>
                        <SkipForward size={28} />
                      </button>
                      <button 
                        className={`icon-btn ${isRepeat !== 'none' ? 'active' : ''}`} 
                        onClick={() => {
                          if (isRepeat === 'none') setIsRepeat('all');
                          else if (isRepeat === 'all') setIsRepeat('one');
                          else setIsRepeat('none');
                        }}
                      >
                        <Repeat size={20} />
                      </button>
                    </div>

                    <div style={{ display: 'flex', justifyItems: 'center', justifyContent: 'space-around', alignItems: 'center', borderTop: '1px solid rgba(255,255,255,0.06)', paddingTop: '16px' }}>
                      <button 
                        onClick={() => setLocalShowLyrics(!localShowLyrics)} 
                        style={{ background: 'none', border: 'none', color: localShowLyrics ? 'var(--yt-accent)' : 'var(--yt-text-secondary)', fontSize: '12px', display: 'flex', alignItems: 'center', gap: '6px', fontWeight: 600 }}
                      >
                        <FileText size={16} /> Lyrics
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
