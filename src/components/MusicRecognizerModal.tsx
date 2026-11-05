import React, { useState, useEffect } from 'react';
import { ArrowLeft, Mic, History, Play, RotateCcw, X, Trash2, Settings, Key, AlertCircle } from 'lucide-react';
import { musicRecognizer, type RecognizedTrack } from '../utils/musicRecognizer';
import type { Track } from '../types';

interface MusicRecognizerModalProps {
  isOpen: boolean;
  onClose: () => void;
  onPlayTrackImmediate: (track: Track) => void;
}

export const MusicRecognizerModal: React.FC<MusicRecognizerModalProps> = ({
  isOpen,
  onClose,
  onPlayTrackImmediate,
}) => {
  const [stage, setStage] = useState<'listening' | 'result' | 'history' | 'settings'>('listening');
  const [result, setResult] = useState<RecognizedTrack | null>(null);
  const [historyList, setHistoryList] = useState<RecognizedTrack[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [volumeLevel, setVolumeLevel] = useState(0);

  // API Tokens
  const [auddKey, setAuddKey] = useState(() => localStorage.getItem('resonate_audd_api_key') || '');
  const [rapidKey, setRapidKey] = useState(() => localStorage.getItem('resonate_rapidapi_key') || '');

  const startListeningSession = async () => {
    setError(null);
    setStage('listening');
    setResult(null);
    setVolumeLevel(0);

    try {
      await musicRecognizer.startListening((vol) => {
        setVolumeLevel(vol);
      });

      // Listen for 5 seconds to capture a clean audio fingerprint
      setTimeout(async () => {
        try {
          const match = await musicRecognizer.stopAndRecognize();
          setResult(match);
          setStage('result');
          setHistoryList(musicRecognizer.getHistory());
        } catch (err: any) {
          setError(err.message || 'Could not recognize music.');
          setStage('listening');
        }
      }, 5000);
    } catch (err: any) {
      setError(err.message || 'Microphone access denied or unavailable.');
    }
  };

  useEffect(() => {
    if (isOpen) {
      setHistoryList(musicRecognizer.getHistory());
      startListeningSession();
    } else {
      musicRecognizer.cancel();
      setStage('listening');
      setResult(null);
      setError(null);
      setVolumeLevel(0);
    }
  }, [isOpen]);

  if (!isOpen) return null;

  const handlePlayRecognized = (track: RecognizedTrack) => {
    onPlayTrackImmediate({
      id: track.id,
      title: track.title,
      artist: track.artist,
      album: track.album,
      duration: 240,
      thumbnailUrl: track.thumbnailUrl,
      youtubeUrl: `https://www.youtube.com/results?search_query=${encodeURIComponent(`${track.title} ${track.artist}`)}`,
      lyrics: `[Enjoy listening to ${track.title} by ${track.artist} on Resonate!]`,
    });
    onClose();
  };

  const handleSaveKeys = () => {
    if (auddKey.trim()) {
      localStorage.setItem('resonate_audd_api_key', auddKey.trim());
    } else {
      localStorage.removeItem('resonate_audd_api_key');
    }
    if (rapidKey.trim()) {
      localStorage.setItem('resonate_rapidapi_key', rapidKey.trim());
    } else {
      localStorage.removeItem('resonate_rapidapi_key');
    }
    alert('Recognizer API keys saved successfully!');
    setStage('listening');
    startListeningSession();
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
      }}
    >
      {/* Top Header */}
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
          onClick={() => {
            if (stage === 'history' || stage === 'settings') {
              setStage(result ? 'result' : 'listening');
            } else {
              musicRecognizer.cancel();
              onClose();
            }
          }}
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
          <span>
            {stage === 'settings'
              ? 'Recognizer Settings'
              : stage === 'history'
              ? 'Recognition History'
              : 'Recognize music'}
          </span>
        </button>

        <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
          <button
            onClick={() => setStage(stage === 'settings' ? 'listening' : 'settings')}
            style={{
              background: stage === 'settings' ? 'rgba(255,255,255,0.15)' : 'none',
              border: 'none',
              color: '#fff',
              cursor: 'pointer',
              padding: '8px',
              borderRadius: '50%',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
            }}
            title="Recognizer Settings / Cloud API Key"
          >
            <Settings size={20} />
          </button>

          <button
            onClick={() => setStage(stage === 'history' ? (result ? 'result' : 'listening') : 'history')}
            style={{
              background: stage === 'history' ? 'rgba(255,255,255,0.15)' : 'none',
              border: 'none',
              color: '#fff',
              cursor: 'pointer',
              padding: '8px',
              borderRadius: '50%',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
            }}
            title="Recognition History"
          >
            <History size={20} />
          </button>
        </div>
      </div>

      {/* Main Body */}
      <div
        style={{
          flex: 1,
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
          justifyContent: 'center',
          padding: '24px',
          overflowY: 'auto',
        }}
      >
        {/* STAGE 1: LISTENING (Matching Screenshot 1 with live audio reactivity) */}
        {stage === 'listening' && (
          <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', textAlign: 'center', maxWidth: '420px', width: '100%' }}>
            {/* Dynamic Pulsing Radar Ring Reactive to Mic Volume */}
            <div
              style={{
                position: 'relative',
                width: '200px',
                height: '200px',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                marginBottom: '40px',
              }}
            >
              {/* Outer Volume Wave 1 */}
              <div
                style={{
                  position: 'absolute',
                  inset: `-${20 + volumeLevel * 40}px`,
                  borderRadius: '50%',
                  background: 'rgba(59, 130, 246, 0.15)',
                  transition: 'inset 0.1s ease-out',
                  pointerEvents: 'none',
                }}
              />
              {/* Outer Volume Wave 2 */}
              <div
                style={{
                  position: 'absolute',
                  inset: `-${40 + volumeLevel * 60}px`,
                  borderRadius: '50%',
                  background: 'rgba(59, 130, 246, 0.08)',
                  transition: 'inset 0.15s ease-out',
                  pointerEvents: 'none',
                }}
              />
              {/* Center Circle Button */}
              <div
                style={{
                  width: `${160 + volumeLevel * 20}px`,
                  height: `${160 + volumeLevel * 20}px`,
                  borderRadius: '50%',
                  backgroundColor: '#8da8d6',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  color: '#1e293b',
                  boxShadow: `0 8px 32px rgba(59, 130, 246, ${0.3 + volumeLevel * 0.4})`,
                  transition: 'all 0.1s ease-out',
                }}
              >
                <Mic size={56} />
              </div>
            </div>

            <h3 style={{ fontSize: '22px', fontWeight: 700, color: '#fff', marginBottom: '8px' }}>
              {error ? 'Could not identify' : 'Listening...'}
            </h3>
            <p style={{ fontSize: '13px', color: 'rgba(255,255,255,0.5)', maxWidth: '340px', marginBottom: '24px', lineHeight: 1.5 }}>
              {error
                ? error
                : 'Listening to ambient audio or music through your microphone in real time...'}
            </p>

            {/* Error / Silence Notice */}
            {error && (
              <div
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: '8px',
                  backgroundColor: 'rgba(239, 68, 68, 0.1)',
                  border: '1px solid rgba(239, 68, 68, 0.25)',
                  color: '#f87171',
                  padding: '12px 16px',
                  borderRadius: '12px',
                  fontSize: '13px',
                  marginBottom: '24px',
                  textAlign: 'left',
                }}
              >
                <AlertCircle size={18} style={{ flexShrink: 0 }} />
                <span>{error}</span>
              </div>
            )}

            <div style={{ display: 'flex', gap: '12px' }}>
              {error && (
                <button
                  onClick={startListeningSession}
                  style={{
                    backgroundColor: '#8da8d6',
                    color: '#0f172a',
                    border: 'none',
                    padding: '12px 28px',
                    borderRadius: '24px',
                    fontSize: '14px',
                    fontWeight: 700,
                    cursor: 'pointer',
                    display: 'flex',
                    alignItems: 'center',
                    gap: '6px',
                  }}
                >
                  <RotateCcw size={16} /> Try Again
                </button>
              )}
              <button
                onClick={() => {
                  musicRecognizer.cancel();
                  onClose();
                }}
                style={{
                  backgroundColor: 'rgba(255,255,255,0.08)',
                  border: 'none',
                  color: '#fff',
                  padding: '12px 28px',
                  borderRadius: '24px',
                  fontSize: '14px',
                  fontWeight: 600,
                  cursor: 'pointer',
                }}
              >
                Cancel
              </button>
            </div>
          </div>
        )}

        {/* STAGE 2: RESULT SCREEN (Matching Screenshot 2) */}
        {stage === 'result' && result && (
          <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', textAlign: 'center', maxWidth: '420px', width: '100%' }}>
            {/* Album Artwork */}
            <div
              style={{
                width: '280px',
                height: '280px',
                borderRadius: '16px',
                overflow: 'hidden',
                boxShadow: '0 16px 48px rgba(0,0,0,0.6)',
                marginBottom: '32px',
              }}
            >
              <img
                src={result.thumbnailUrl}
                alt={result.title}
                style={{ width: '100%', height: '100%', objectFit: 'cover' }}
              />
            </div>

            {/* Title & Artist */}
            <h2 style={{ fontSize: '22px', fontWeight: 800, color: '#fff', marginBottom: '8px', lineHeight: 1.3 }}>
              {result.title}
            </h2>
            <h3 style={{ fontSize: '16px', fontWeight: 600, color: 'rgba(255,255,255,0.7)', marginBottom: '6px' }}>
              {result.artist}
            </h3>
            <p style={{ fontSize: '13px', color: 'rgba(255,255,255,0.4)', marginBottom: '36px' }}>
              {result.album}
            </p>

            {/* Action Buttons */}
            <div style={{ display: 'flex', flexDirection: 'column', gap: '12px', width: '100%' }}>
              <button
                onClick={() => handlePlayRecognized(result)}
                style={{
                  backgroundColor: '#8da8d6',
                  color: '#0f172a',
                  border: 'none',
                  padding: '14px',
                  borderRadius: '24px',
                  fontSize: '15px',
                  fontWeight: 700,
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  gap: '8px',
                  cursor: 'pointer',
                }}
              >
                <Play size={18} fill="#0f172a" />
                Play on Resonate
              </button>

              <button
                onClick={startListeningSession}
                style={{
                  backgroundColor: 'rgba(255,255,255,0.08)',
                  color: '#fff',
                  border: 'none',
                  padding: '14px',
                  borderRadius: '24px',
                  fontSize: '15px',
                  fontWeight: 600,
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  gap: '8px',
                  cursor: 'pointer',
                }}
              >
                <RotateCcw size={18} />
                Re-listen
              </button>

              <button
                onClick={onClose}
                style={{
                  backgroundColor: 'transparent',
                  color: 'rgba(255,255,255,0.6)',
                  border: '1px solid rgba(255,255,255,0.1)',
                  padding: '12px',
                  borderRadius: '24px',
                  fontSize: '14px',
                  fontWeight: 600,
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  gap: '8px',
                  cursor: 'pointer',
                  marginTop: '8px',
                }}
              >
                <X size={16} />
                Close
              </button>
            </div>
          </div>
        )}

        {/* STAGE 3: RECOGNITION HISTORY */}
        {stage === 'history' && (
          <div style={{ width: '100%', maxWidth: '600px', height: '100%', display: 'flex', flexDirection: 'column' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '16px' }}>
              <span style={{ fontSize: '14px', color: 'rgba(255,255,255,0.5)', fontWeight: 600 }}>
                {historyList.length} Identified Songs
              </span>
              {historyList.length > 0 && (
                <button
                  onClick={() => {
                    musicRecognizer.clearHistory();
                    setHistoryList([]);
                  }}
                  style={{
                    background: 'none',
                    border: 'none',
                    color: '#ef4444',
                    fontSize: '13px',
                    display: 'flex',
                    alignItems: 'center',
                    gap: '4px',
                    cursor: 'pointer',
                  }}
                >
                  <Trash2 size={14} /> Clear History
                </button>
              )}
            </div>

            {historyList.length === 0 ? (
              <div style={{ color: 'rgba(255,255,255,0.4)', textAlign: 'center', marginTop: '60px' }}>
                No previously recognized songs found.
              </div>
            ) : (
              <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                {historyList.map((item) => (
                  <div
                    key={item.id}
                    onClick={() => handlePlayRecognized(item)}
                    style={{
                      display: 'flex',
                      alignItems: 'center',
                      gap: '14px',
                      padding: '12px',
                      borderRadius: '12px',
                      backgroundColor: 'rgba(255,255,255,0.03)',
                      border: '1px solid rgba(255,255,255,0.05)',
                      cursor: 'pointer',
                      transition: 'background 0.2s',
                    }}
                  >
                    <img
                      src={item.thumbnailUrl}
                      alt=""
                      style={{ width: '48px', height: '48px', borderRadius: '8px', objectFit: 'cover' }}
                    />
                    <div style={{ flex: 1, minWidth: 0 }}>
                      <div style={{ fontWeight: 700, fontSize: '15px', color: '#fff', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                        {item.title}
                      </div>
                      <div style={{ fontSize: '13px', color: 'rgba(255,255,255,0.5)', marginTop: '2px' }}>
                        {item.artist}
                      </div>
                    </div>
                    <button
                      style={{
                        width: '36px',
                        height: '36px',
                        borderRadius: '50%',
                        backgroundColor: 'rgba(255,255,255,0.1)',
                        border: 'none',
                        color: '#fff',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                      }}
                    >
                      <Play size={16} fill="#fff" />
                    </button>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}

        {/* STAGE 4: SETTINGS / API KEYS */}
        {stage === 'settings' && (
          <div style={{ width: '100%', maxWidth: '480px', display: 'flex', flexDirection: 'column', gap: '20px' }}>
            <div>
              <h3 style={{ fontSize: '18px', fontWeight: 700, marginBottom: '6px' }}>Recognition Service Config</h3>
              <p style={{ fontSize: '13px', color: 'rgba(255,255,255,0.5)', lineHeight: 1.4 }}>
                Resonate connects to AudD and Shazam cloud audio fingerprinting engines to identify songs, musicians, and covers from your microphone.
              </p>
            </div>

            <div>
              <label style={{ fontSize: '12px', color: 'rgba(255,255,255,0.6)', display: 'block', marginBottom: '6px' }}>
                AudD API Token (Free 300 requests from audd.io):
              </label>
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px', backgroundColor: 'rgba(255,255,255,0.04)', border: '1px solid rgba(255,255,255,0.08)', borderRadius: '10px', padding: '0 12px' }}>
                <Key size={16} style={{ color: 'rgba(255,255,255,0.4)' }} />
                <input
                  type="text"
                  placeholder="Paste AudD API token"
                  value={auddKey}
                  onChange={(e) => setAuddKey(e.target.value)}
                  style={{ width: '100%', padding: '12px 0', background: 'none', border: 'none', color: '#fff', fontSize: '13px', outline: 'none' }}
                />
              </div>
            </div>

            <div>
              <label style={{ fontSize: '12px', color: 'rgba(255,255,255,0.6)', display: 'block', marginBottom: '6px' }}>
                RapidAPI Shazam Core Key (Optional):
              </label>
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px', backgroundColor: 'rgba(255,255,255,0.04)', border: '1px solid rgba(255,255,255,0.08)', borderRadius: '10px', padding: '0 12px' }}>
                <Key size={16} style={{ color: 'rgba(255,255,255,0.4)' }} />
                <input
                  type="text"
                  placeholder="Paste RapidAPI Shazam Key"
                  value={rapidKey}
                  onChange={(e) => setRapidKey(e.target.value)}
                  style={{ width: '100%', padding: '12px 0', background: 'none', border: 'none', color: '#fff', fontSize: '13px', outline: 'none' }}
                />
              </div>
            </div>

            <div style={{ display: 'flex', gap: '10px', marginTop: '12px' }}>
              <button
                onClick={handleSaveKeys}
                style={{
                  flex: 1,
                  backgroundColor: '#8da8d6',
                  color: '#0f172a',
                  border: 'none',
                  padding: '14px',
                  borderRadius: '12px',
                  fontSize: '14px',
                  fontWeight: 700,
                  cursor: 'pointer',
                }}
              >
                Save & Test Recognition
              </button>
              <button
                onClick={() => {
                  const demoTrack: RecognizedTrack = {
                    id: `demo-${Date.now()}`,
                    title: 'Hedwig\'s Theme (From "Harry Potter") [Piano Version]',
                    artist: 'Patrik Pietschmann',
                    album: 'Hedwig\'s Theme (From "Harry Potter") [Piano Version] - Single',
                    thumbnailUrl: 'https://images.unsplash.com/photo-1520523839898-50712825e617?w=500&auto=format&fit=crop&q=80',
                    recognizedAt: Date.now(),
                  };
                  musicRecognizer.saveToHistory(demoTrack);
                  setResult(demoTrack);
                  setStage('result');
                }}
                style={{
                  backgroundColor: 'rgba(255,255,255,0.08)',
                  color: '#fff',
                  border: '1px solid rgba(255,255,255,0.12)',
                  padding: '14px 18px',
                  borderRadius: '12px',
                  fontSize: '13px',
                  fontWeight: 600,
                  cursor: 'pointer',
                  whiteSpace: 'nowrap',
                }}
              >
                Preview Demo Result
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};
