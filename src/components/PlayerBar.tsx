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

  const isLiked = currentTrack ? likedTracks.some((t) => t.id === currentTrack.id) : false;

  // Initialize YouTube Iframe Player
  useEffect(() => {
    // Load YouTube Iframe API Script if not already loaded
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
          rel: 0,
          showinfo: 0,
          iv_load_policy: 3,
        },
        events: {
          onReady: (event: any) => {
            event.target.setVolume(volume * 100);
            const savedProgress = Number(localStorage.getItem('yt_music_progress') || 0);
            if (savedProgress > 0 && currentTrack) {
              event.target.seekTo(savedProgress, true);
              event.target.pauseVideo();
            }
          },
          onStateChange: (event: any) => {
            // YT.PlayerState: -1 (unstarted), 0 (ended), 1 (playing), 2 (paused), 3 (buffering), 5 (video cued)
            if (event.data === window.YT.PlayerState.PLAYING) {
              setIsPlaying(true);
              setDuration(event.target.getDuration());
            } else if (event.data === window.YT.PlayerState.PAUSED) {
              setIsPlaying(false);
            } else if (event.data === window.YT.PlayerState.ENDED) {
              handleTrackEnded();
            }
          },
        },
      });
    }

    return () => {
      if (progressIntervalRef.current) {
        clearInterval(progressIntervalRef.current);
      }
    };
  }, []);

  // Handle Track Ends based on Repeat State
  const handleTrackEnded = () => {
    if (isRepeat === 'one') {
      if (playerRef.current) {
        playerRef.current.seekTo(0, true);
        playerRef.current.playVideo();
      }
    } else {
      onNext();
    }
  };

  // Play/Pause YouTube playback based on React State
  useEffect(() => {
    if (!playerRef.current || !playerRef.current.playVideo) return;
    if (isPlaying) {
      playerRef.current.playVideo();
      // Start progress polling
      if (progressIntervalRef.current) clearInterval(progressIntervalRef.current);
      progressIntervalRef.current = setInterval(() => {
        if (playerRef.current && playerRef.current.getCurrentTime) {
          setProgress(Math.floor(playerRef.current.getCurrentTime()));
        }
      }, 500);
    } else {
      playerRef.current.pauseVideo();
      if (progressIntervalRef.current) clearInterval(progressIntervalRef.current);
    }
  }, [isPlaying]);

  // Load new track when currentTrack changes
  useEffect(() => {
    if (!playerRef.current || !currentTrack) return;
    try {
      playerRef.current.loadVideoById({
        videoId: currentTrack.id,
        startSeconds: 0,
      });
      setIsPlaying(true);
      setDuration(currentTrack.duration || 180);
    } catch (error) {
      console.error('Error loading video:', error);
    }
  }, [currentTrack]);

  // Update volume in iframe player
  useEffect(() => {
    if (playerRef.current && playerRef.current.setVolume) {
      playerRef.current.setVolume(isMuted ? 0 : volume * 100);
    }
  }, [volume, isMuted]);

  // Track progress scrubbing
  const handleProgressChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const val = parseFloat(e.target.value);
    setProgress(val);
    if (playerRef.current && playerRef.current.seekTo) {
      playerRef.current.seekTo(val, true);
    }
  };

  // Toggle mute
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

  // Format Time Helper
  const formatTime = (secs: number) => {
    const m = Math.floor(secs / 60);
    const s = Math.floor(secs % 60).toString().padStart(2, '0');
    return `${m}:${s}`;
  };

  return (
    <div className="player-bar">
      {/* Hidden YouTube Iframe */}
      <div style={{ position: 'absolute', left: '-9999px', top: '-9999px' }}>
        <div id={iframeContainerId}></div>
      </div>

      {/* Track Info (Left) */}
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
  );
};
