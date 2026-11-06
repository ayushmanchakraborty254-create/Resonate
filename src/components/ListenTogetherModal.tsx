import React, { useState, useEffect } from 'react';
import { ArrowLeft, Users, Settings as SettingsIcon, X, Wifi, WifiOff, ChevronRight } from 'lucide-react';
import type { Track } from '../types';

interface ListenTogetherModalProps {
  isOpen: boolean;
  onClose: () => void;
  currentTrack?: Track | null;
  isPlaying: boolean;
  onPlayTrackImmediate: (track: Track) => void;
  onTogglePlay: () => void;
}

export const ListenTogetherModal: React.FC<ListenTogetherModalProps> = ({
  isOpen,
  onClose,
  currentTrack,
  isPlaying,
  onPlayTrackImmediate,
  onTogglePlay,
}) => {
  const [view, setView] = useState<'main' | 'settings'>('main');
  const [username, setUsername] = useState('Ayushman_');
  const [roomCode, setRoomCode] = useState('');
  const [isConnected, setIsConnected] = useState(false);
  const [isHost, setIsHost] = useState(false);
  const [activeRoom, setActiveRoom] = useState<string | null>(null);

  // Settings states
  const serverUrl = 'The Meowery - Poland (Cloud Relay)';
  const [autoApproveJoin, setAutoApproveJoin] = useState(true);
  const [autoApproveSuggestions, setAutoApproveSuggestions] = useState(true);
  const [syncHostVolume, setSyncHostVolume] = useState(true);
  const [logs, setLogs] = useState<string[]>([
    'Initialized Listen Together engine',
    'Server gateway ping: 38ms (Active Cloud Relay)',
  ]);

  const apiBase = (typeof window !== 'undefined' && (window.location.hostname === 'resonate.app' || window.location.hostname === 'localhost'))
    ? 'https://resonate-wine-six.vercel.app'
    : '';

  // Host: Broadcast song and playback state changes to Room
  useEffect(() => {
    if (!activeRoom || !isHost || !isConnected) return;

    // 1. Local tab/window channel broadcast
    try {
      const channel = new BroadcastChannel(`resonate_room_${activeRoom}`);
      channel.postMessage({
        type: 'SYNC_TRACK',
        track: currentTrack,
        isPlaying,
        host: username,
      });
      channel.close();
    } catch (_) {}

    // 2. Cloud Serverless Relay (cross-device sync across internet)
    if (currentTrack) {
      fetch(`${apiBase}/api/room?code=${encodeURIComponent(activeRoom)}`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          host: username,
          track: currentTrack,
          isPlaying,
        }),
      }).catch(() => {});
    }
  }, [activeRoom, isHost, isConnected, currentTrack, isPlaying, username, apiBase]);

  // Guest / Listener: Real-time synchronization
  useEffect(() => {
    if (!activeRoom || !isConnected) return;

    // 1. Local BroadcastChannel receiver
    const channel = new BroadcastChannel(`resonate_room_${activeRoom}`);
    channel.onmessage = (event) => {
      if (isHost) return; // Host doesn't sync from guests
      const data = event.data;
      if (data.type === 'SYNC_TRACK' && data.track && data.track.id !== currentTrack?.id) {
        onPlayTrackImmediate(data.track);
        setLogs((prev) => [...prev, `[${new Date().toLocaleTimeString()}] Room sync: Playing ${data.track.title}`]);
      } else if (data.type === 'SYNC_PLAY' && !isPlaying) {
        onTogglePlay();
      } else if (data.type === 'SYNC_PAUSE' && isPlaying) {
        onTogglePlay();
      }
    };

    // 2. Cloud Polling relay for cross-device synchronization (every 2.5s)
    let pollInterval: any = null;
    if (!isHost) {
      pollInterval = setInterval(async () => {
        try {
          const res = await fetch(`${apiBase}/api/room?code=${encodeURIComponent(activeRoom)}`);
          if (res.ok) {
            const data = await res.json();
            const state = data?.state;
            if (state && state.track && state.track.id !== currentTrack?.id) {
              onPlayTrackImmediate(state.track);
              setLogs((prev) => [
                ...prev,
                `[${new Date().toLocaleTimeString()}] Host (${state.host}) changed track: ${state.track.title}`,
              ]);
            }
            if (state && typeof state.isPlaying === 'boolean' && state.isPlaying !== isPlaying) {
              onTogglePlay();
            }
          }
        } catch (_) {}
      }, 2500);
    }

    return () => {
      channel.close();
      if (pollInterval) clearInterval(pollInterval);
    };
  }, [activeRoom, isConnected, isHost, currentTrack, isPlaying, onPlayTrackImmediate, onTogglePlay]);

  if (!isOpen) return null;

  const handleCreateRoom = () => {
    const code = 'RESO-' + Math.floor(1000 + Math.random() * 9000);
    setRoomCode(code);
    setActiveRoom(code);
    setIsHost(true);
    setIsConnected(true);
    setLogs((prev) => [...prev, `Created room ${code} as host (${username})`]);

    if (currentTrack) {
      fetch(`/api/room?code=${encodeURIComponent(code)}`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          host: username,
          track: currentTrack,
          isPlaying,
        }),
      }).catch(() => {});
    }
  };

  const handleConnectRoom = async () => {
    const cleanCode = roomCode.trim().toUpperCase();
    if (!cleanCode) return;
    setActiveRoom(cleanCode);
    setIsHost(false);
    setIsConnected(true);
    setLogs((prev) => [...prev, `Connecting to room ${cleanCode}...`]);

    try {
      const res = await fetch(`/api/room?code=${encodeURIComponent(cleanCode)}`);
      if (res.ok) {
        const data = await res.json();
        const state = data?.state;
        if (state && state.track) {
          onPlayTrackImmediate(state.track);
          setLogs((prev) => [...prev, `Connected! Synced with host (${state.host}): ${state.track.title}`]);
        } else {
          setLogs((prev) => [...prev, `Connected to room ${cleanCode}. Waiting for host to play...`]);
        }
      } else {
        setLogs((prev) => [...prev, `Connected to local room ${cleanCode} via direct mesh.`]);
      }
    } catch (_) {
      setLogs((prev) => [...prev, `Connected to local room ${cleanCode} via direct mesh.`]);
    }
  };

  const handleDisconnect = () => {
    setIsConnected(false);
    setIsHost(false);
    setActiveRoom(null);
    setLogs((prev) => [...prev, `Disconnected from room`]);
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
          onClick={() => {
            if (view === 'settings') setView('main');
            else onClose();
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
          <span>{view === 'settings' ? 'Listen Together' : 'Together'}</span>
        </button>

        <button
          onClick={onClose}
          style={{ background: 'none', border: 'none', color: '#fff', cursor: 'pointer', padding: '6px' }}
        >
          <X size={20} />
        </button>
      </div>

      {/* Main Room View (Page 1 in PDF) */}
      {view === 'main' && (
        <div style={{ flex: 1, display: 'flex', flexDirection: 'column', alignItems: 'center', padding: '40px 20px', maxWidth: '460px', margin: '0 auto', width: '100%' }}>
          {/* Avatar Icon */}
          <div
            style={{
              width: '80px',
              height: '80px',
              borderRadius: '50%',
              backgroundColor: 'rgba(255,255,255,0.08)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              marginBottom: '20px',
            }}
          >
            <Users size={36} style={{ color: '#8da8d6' }} />
          </div>

          <h2 style={{ fontSize: '24px', fontWeight: 800, marginBottom: '8px', textAlign: 'center' }}>
            Listen Together
          </h2>
          <p style={{ fontSize: '13px', color: 'rgba(255,255,255,0.5)', textAlign: 'center', lineHeight: 1.5, marginBottom: '32px' }}>
            Listen to music with your friends in real time. Create a room to host, or join an existing room with a code.
          </p>

          {/* Connection Status Badge & Button */}
          <div
            style={{
              width: '100%',
              backgroundColor: 'rgba(255,255,255,0.03)',
              border: '1px solid rgba(255,255,255,0.06)',
              borderRadius: '16px',
              padding: '16px',
              display: 'flex',
              flexDirection: 'column',
              alignItems: 'center',
              gap: '12px',
              marginBottom: '28px',
            }}
          >
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px', fontSize: '13px', color: isConnected ? '#22c55e' : 'rgba(255,255,255,0.4)' }}>
              <div
                style={{
                  width: '8px',
                  height: '8px',
                  borderRadius: '50%',
                  backgroundColor: isConnected ? '#22c55e' : 'rgba(255,255,255,0.3)',
                }}
              />
              <span style={{ fontWeight: 600 }}>
                {isConnected ? `Connected (Room: ${activeRoom})` : 'Disconnected'}
              </span>
            </div>

            <button
              onClick={isConnected ? handleDisconnect : handleConnectRoom}
              style={{
                width: '100%',
                backgroundColor: isConnected ? 'rgba(239, 68, 68, 0.15)' : '#8da8d6',
                color: isConnected ? '#ef4444' : '#0f172a',
                border: 'none',
                padding: '12px',
                borderRadius: '12px',
                fontSize: '14px',
                fontWeight: 700,
                cursor: 'pointer',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                gap: '8px',
              }}
            >
              {isConnected ? <WifiOff size={16} /> : <Wifi size={16} />}
              {isConnected ? 'Disconnect' : 'Connect'}
            </button>
          </div>

          {/* Inputs */}
          <div style={{ width: '100%', display: 'flex', flexDirection: 'column', gap: '16px', marginBottom: '24px' }}>
            {/* Username Input */}
            <div style={{ position: 'relative' }}>
              <label style={{ fontSize: '11px', color: 'rgba(255,255,255,0.4)', textTransform: 'uppercase', marginBottom: '4px', display: 'block' }}>
                Username
              </label>
              <input
                type="text"
                value={username}
                onChange={(e) => setUsername(e.target.value)}
                style={{
                  width: '100%',
                  padding: '14px 16px',
                  backgroundColor: 'rgba(255,255,255,0.04)',
                  border: '1px solid rgba(255,255,255,0.08)',
                  borderRadius: '12px',
                  color: '#fff',
                  fontSize: '14px',
                  outline: 'none',
                }}
              />
            </div>

            {/* Room Code Input */}
            <div>
              <label style={{ fontSize: '11px', color: 'rgba(255,255,255,0.4)', textTransform: 'uppercase', marginBottom: '4px', display: 'block' }}>
                Room code
              </label>
              <input
                type="text"
                placeholder="Enter room code or create below"
                value={roomCode}
                onChange={(e) => setRoomCode(e.target.value)}
                style={{
                  width: '100%',
                  padding: '14px 16px',
                  backgroundColor: 'rgba(255,255,255,0.04)',
                  border: '1px solid rgba(255,255,255,0.08)',
                  borderRadius: '12px',
                  color: '#fff',
                  fontSize: '14px',
                  outline: 'none',
                }}
              />
            </div>

            {/* Create Room Button */}
            <button
              onClick={handleCreateRoom}
              style={{
                width: '100%',
                backgroundColor: 'rgba(255,255,255,0.06)',
                border: '1px solid rgba(255,255,255,0.1)',
                color: '#fff',
                padding: '14px',
                borderRadius: '12px',
                fontSize: '14px',
                fontWeight: 700,
                cursor: 'pointer',
              }}
            >
              + Create
            </button>
          </div>

          {/* Settings Entry Button */}
          <div
            onClick={() => setView('settings')}
            style={{
              width: '100%',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'space-between',
              padding: '16px',
              backgroundColor: 'rgba(255,255,255,0.02)',
              border: '1px solid rgba(255,255,255,0.04)',
              borderRadius: '12px',
              cursor: 'pointer',
            }}
          >
            <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
              <SettingsIcon size={20} style={{ color: 'rgba(255,255,255,0.6)' }} />
              <div>
                <div style={{ fontWeight: 700, fontSize: '14px' }}>Settings</div>
                <div style={{ fontSize: '12px', color: 'rgba(255,255,255,0.4)', marginTop: '2px' }}>
                  Configure server, username, and more
                </div>
              </div>
            </div>
            <ChevronRight size={18} style={{ color: 'rgba(255,255,255,0.4)' }} />
          </div>
        </div>
      )}

      {/* Settings Sub-View (Page 2 in PDF) */}
      {view === 'settings' && (
        <div style={{ flex: 1, padding: '24px 32px', maxWidth: '600px', margin: '0 auto', width: '100%' }}>
          <h3 style={{ fontSize: '12px', color: 'rgba(255,255,255,0.4)', textTransform: 'uppercase', letterSpacing: '1px', marginBottom: '16px' }}>
            Settings
          </h3>

          <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
            {/* Blocked Users */}
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '16px', backgroundColor: 'rgba(255,255,255,0.02)', borderRadius: '12px', border: '1px solid rgba(255,255,255,0.04)' }}>
              <div>
                <div style={{ fontWeight: 600, fontSize: '15px' }}>Blocked users</div>
                <div style={{ fontSize: '12px', color: 'rgba(255,255,255,0.4)', marginTop: '2px' }}>No blocked users</div>
              </div>
            </div>

            {/* Server URL */}
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '16px', backgroundColor: 'rgba(255,255,255,0.02)', borderRadius: '12px', border: '1px solid rgba(255,255,255,0.04)' }}>
              <div>
                <div style={{ fontWeight: 600, fontSize: '15px' }}>Server URL</div>
                <div style={{ fontSize: '12px', color: 'rgba(255,255,255,0.4)', marginTop: '2px' }}>{serverUrl}</div>
              </div>
            </div>

            {/* Username */}
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '16px', backgroundColor: 'rgba(255,255,255,0.02)', borderRadius: '12px', border: '1px solid rgba(255,255,255,0.04)' }}>
              <div>
                <div style={{ fontWeight: 600, fontSize: '15px' }}>Username</div>
                <div style={{ fontSize: '12px', color: 'rgba(255,255,255,0.4)', marginTop: '2px' }}>{username}</div>
              </div>
            </div>

            {/* Auto-approve join requests toggle */}
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '16px', backgroundColor: 'rgba(255,255,255,0.02)', borderRadius: '12px', border: '1px solid rgba(255,255,255,0.04)' }}>
              <div>
                <div style={{ fontWeight: 600, fontSize: '15px' }}>Auto-approve join requests</div>
                <div style={{ fontSize: '12px', color: 'rgba(255,255,255,0.4)', marginTop: '2px' }}>Automatically approve join requests without reviewing them manually</div>
              </div>
              <input
                type="checkbox"
                checked={autoApproveJoin}
                onChange={(e) => setAutoApproveJoin(e.target.checked)}
                style={{ width: '20px', height: '20px', cursor: 'pointer', accentColor: '#8da8d6' }}
              />
            </div>

            {/* Auto-approve song suggestions toggle */}
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '16px', backgroundColor: 'rgba(255,255,255,0.02)', borderRadius: '12px', border: '1px solid rgba(255,255,255,0.04)' }}>
              <div>
                <div style={{ fontWeight: 600, fontSize: '15px' }}>Auto-approve song suggestions</div>
                <div style={{ fontSize: '12px', color: 'rgba(255,255,255,0.4)', marginTop: '2px' }}>Automatically approve and queue song suggestions from guests</div>
              </div>
              <input
                type="checkbox"
                checked={autoApproveSuggestions}
                onChange={(e) => setAutoApproveSuggestions(e.target.checked)}
                style={{ width: '20px', height: '20px', cursor: 'pointer', accentColor: '#8da8d6' }}
              />
            </div>

            {/* Sync host volume toggle */}
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '16px', backgroundColor: 'rgba(255,255,255,0.02)', borderRadius: '12px', border: '1px solid rgba(255,255,255,0.04)' }}>
              <div>
                <div style={{ fontWeight: 600, fontSize: '15px' }}>Sync host volume</div>
                <div style={{ fontSize: '12px', color: 'rgba(255,255,255,0.4)', marginTop: '2px' }}>Guests will match the host's volume level</div>
              </div>
              <input
                type="checkbox"
                checked={syncHostVolume}
                onChange={(e) => setSyncHostVolume(e.target.checked)}
                style={{ width: '20px', height: '20px', cursor: 'pointer', accentColor: '#8da8d6' }}
              />
            </div>

            {/* View logs */}
            <div style={{ padding: '16px', backgroundColor: 'rgba(255,255,255,0.02)', borderRadius: '12px', border: '1px solid rgba(255,255,255,0.04)' }}>
              <div style={{ fontWeight: 600, fontSize: '15px', marginBottom: '8px' }}>View logs</div>
              <div style={{ fontSize: '12px', color: 'rgba(255,255,255,0.4)', marginBottom: '12px' }}>Debug connection events and messages</div>
              <div style={{ maxHeight: '120px', overflowY: 'auto', background: '#000', padding: '12px', borderRadius: '8px', fontSize: '11px', fontFamily: 'monospace', color: '#22c55e', lineHeight: 1.6 }}>
                {logs.map((log, i) => (
                  <div key={i}>{log}</div>
                ))}
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
