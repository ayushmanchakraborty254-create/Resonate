import React, { useState, useEffect } from 'react';
import { 
  User as UserIcon, RefreshCw, Download, ArrowUpRight, CheckCircle2, 
  Sparkles, ExternalLink, LogOut, ArrowLeft, Trash2, Volume2, Play, Pause
} from 'lucide-react';
import { isNativeAndroidApp, checkGitHubReleaseUpdate, openExternalUrl, CURRENT_APP_VERSION, type UpdateInfo } from '../utils/appPlatform';

interface ProfileViewProps {
  user: { name: string; email: string; avatar?: string; isGoogle?: boolean } | null;
  onOpenAuth: () => void;
  onLogout: () => void;
  onNavigateToUniversal: () => void;
  onOpenDownloadModal: () => void;
  onBack?: () => void;
}

export const ProfileView: React.FC<ProfileViewProps> = ({
  user,
  onOpenAuth,
  onLogout,
  onNavigateToUniversal,
  onOpenDownloadModal,
  onBack
}) => {
  const isNative = isNativeAndroidApp();
  const [updateInfo, setUpdateInfo] = useState<UpdateInfo | null>(null);
  const [isCheckingUpdate, setIsCheckingUpdate] = useState(false);
  const [updateCheckStatus, setUpdateCheckStatus] = useState<'idle' | 'up-to-date' | 'update-available' | 'error'>('idle');

  // Check for updates automatically on view load
  useEffect(() => {
    handleCheckUpdate();
  }, []);

  const [nativeTestStatus, setNativeTestStatus] = useState<string | null>(null);
  const [isNativePlaying, setIsNativePlaying] = useState<boolean>(false);
  const [notifGranted, setNotifGranted] = useState<boolean>(true);

  useEffect(() => {
    if (isNative && (window as any).ResonateNative?.areNotificationsEnabled) {
      try {
        setNotifGranted((window as any).ResonateNative.areNotificationsEnabled());
      } catch (_) {}
    }
  }, [isNative]);

  useEffect(() => {
    if (!isNativePlaying) return;
    const interval = setInterval(() => {
      try {
        if ((window as any).ResonateNative?.getNativePlaybackStatus) {
          const raw = (window as any).ResonateNative.getNativePlaybackStatus();
          const st = JSON.parse(raw);
          if (st.isPlaying) {
            const curSec = Math.floor((st.positionMs || 0) / 1000);
            const durSec = Math.floor((st.durationMs || 0) / 1000);
            const curMin = `${Math.floor(curSec / 60)}:${(curSec % 60).toString().padStart(2, '0')}`;
            const durMin = durSec > 0 ? `${Math.floor(durSec / 60)}:${(durSec % 60).toString().padStart(2, '0')}` : '--:--';
            setNativeTestStatus(`Playing: Jazz In Paris (${curMin} / ${durMin}) • Media3 Active`);
          } else if (st.playbackState === 4) {
            setNativeTestStatus('Finished playback (Jazz In Paris)');
            setIsNativePlaying(false);
          }
        }
      } catch (_) {}
    }, 1000);
    return () => clearInterval(interval);
  }, [isNativePlaying]);

  const handleRunNativeSelfTest = () => {
    try {
      if ((window as any).ResonateNative?.runNativeAudioSelfTest) {
        const raw = (window as any).ResonateNative.runNativeAudioSelfTest();
        const resp = JSON.parse(raw);
        if (resp.success) {
          setNativeTestStatus(`Starting: ${resp.track} • Engine: ${resp.engine}`);
          setIsNativePlaying(true);
        } else {
          setNativeTestStatus(`Failed to start: ${resp.error || 'Unknown error'}`);
        }
      } else {
        setNativeTestStatus('ResonateNative bridge unavailable (Only active on Android APK)');
      }
    } catch (err: any) {
      setNativeTestStatus(`Error: ${err.message}`);
    }
  };

  const handleToggleNativeTest = () => {
    try {
      if (isNativePlaying) {
        (window as any).ResonateNative?.pauseNative?.();
        setIsNativePlaying(false);
        setNativeTestStatus('Paused native test stream');
      } else {
        (window as any).ResonateNative?.resumeNative?.();
        setIsNativePlaying(true);
        setNativeTestStatus('Resumed native test stream');
      }
    } catch (err: any) {
      setNativeTestStatus(`Error: ${err.message}`);
    }
  };

  const handleRequestNotifPermission = () => {
    try {
      (window as any).ResonateNative?.requestNotificationPermission?.();
      setTimeout(() => {
        if ((window as any).ResonateNative?.areNotificationsEnabled) {
          setNotifGranted((window as any).ResonateNative.areNotificationsEnabled());
        }
      }, 2000);
    } catch (_) {}
  };

  const handleCheckUpdate = async () => {
    setIsCheckingUpdate(true);
    try {
      const info = await checkGitHubReleaseUpdate();
      setUpdateInfo(info);
      if (info.hasUpdate) {
        setUpdateCheckStatus('update-available');
      } else {
        setUpdateCheckStatus('up-to-date');
      }
    } catch (_) {
      setUpdateCheckStatus('error');
    } finally {
      setIsCheckingUpdate(false);
    }
  };

  const handleDismissUpdate = () => {
    if (updateInfo?.releaseCommit) {
      localStorage.setItem('resonate_dismissed_update', updateInfo.releaseCommit);
    } else {
      localStorage.setItem('resonate_dismissed_update', 'latest');
    }
    setUpdateCheckStatus('up-to-date');
  };

  const handleUpdateNow = () => {
    if (!updateInfo) return;
    const targetUrl = updateInfo.downloadUrl || updateInfo.htmlUrl;
    // Mark this release as acknowledged
    try {
      const commitMatch = updateInfo.releaseName.match(/\(([a-f0-9]{7,40})\)/i);
      if (commitMatch && commitMatch[1]) {
        localStorage.setItem('resonate_installed_commit', commitMatch[1]);
      }
    } catch (_) {}
    openExternalUrl(targetUrl);
  };

  const handleClearCache = () => {
    if (confirm('Clear local audio cache and temporary app data?')) {
      try {
        if ('caches' in window) {
          caches.keys().then((names) => {
            names.forEach((name) => caches.delete(name));
          });
        }
        localStorage.removeItem('yt_music_progress');
        alert('App cache cleared successfully!');
        window.location.reload();
      } catch (_) {}
    }
  };

  return (
    <div className="profile-view-container" style={{ padding: '16px 16px 140px 16px', maxWidth: '640px', margin: '0 auto', color: '#fff' }}>
      {/* Top back button for mobile */}
      {onBack && (
        <div style={{ marginBottom: '16px', display: 'flex', alignItems: 'center', gap: '8px' }}>
          <button
            onClick={onBack}
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
          <span style={{ fontSize: '18px', fontWeight: 700 }}>Account & Settings</span>
        </div>
      )}

      {/* Profile Header */}
      <div
        style={{
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
          textAlign: 'center',
          padding: '24px 16px',
          marginBottom: '20px',
        }}
      >
        <div
          style={{
            width: '84px',
            height: '84px',
            borderRadius: '50%',
            backgroundColor: '#e50914',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            boxShadow: '0 8px 28px rgba(229, 9, 20, 0.4)',
            marginBottom: '14px',
            overflow: 'hidden',
            border: '2px solid rgba(255, 255, 255, 0.2)',
          }}
        >
          {user ? (
            user.avatar && (user.avatar.startsWith('http://') || user.avatar.startsWith('https://')) ? (
              <img src={user.avatar} alt={user.name} style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
            ) : (
              <span style={{ fontSize: '32px', fontWeight: 800 }}>{user.name.charAt(0).toUpperCase()}</span>
            )
          ) : (
            <UserIcon size={44} style={{ color: '#fff' }} />
          )}
        </div>

        <h2 style={{ fontSize: '22px', fontWeight: 800, margin: '0 0 4px 0' }}>
          {user ? user.name : 'Guest Listener'}
        </h2>
        <p style={{ fontSize: '13px', color: 'rgba(255, 255, 255, 0.55)', margin: '0 0 16px 0', maxWidth: '280px' }}>
          {user ? user.email : 'Sign in to sync your library and playlists across devices'}
        </p>

        {user ? (
          <button
            className="btn btn-secondary"
            onClick={onLogout}
            style={{
              padding: '8px 20px',
              borderRadius: '20px',
              fontSize: '13px',
              fontWeight: 600,
              display: 'flex',
              alignItems: 'center',
              gap: '6px',
            }}
          >
            <LogOut size={14} />
            <span>Sign Out</span>
          </button>
        ) : (
          <button
            className="btn btn-primary"
            onClick={onOpenAuth}
            style={{
              padding: '10px 24px',
              borderRadius: '24px',
              fontSize: '14px',
              fontWeight: 700,
              boxShadow: '0 4px 16px rgba(229, 9, 20, 0.35)',
            }}
          >
            Sign In to Resonate
          </button>
        )}
      </div>

      {/* CORE FEATURES (Universal Library & Updates) */}
      <div style={{ display: 'flex', flexDirection: 'column', gap: '12px', marginBottom: '24px' }}>
        <div style={{ fontSize: '12px', fontWeight: 700, textTransform: 'uppercase', color: 'rgba(255,255,255,0.45)', letterSpacing: '0.8px', paddingLeft: '4px' }}>
          Library & System
        </div>

        {/* 1. Universal Library & Sync */}
        <div
          onClick={onNavigateToUniversal}
          style={{
            display: 'flex',
            alignItems: 'center',
            gap: '14px',
            padding: '14px 16px',
            borderRadius: '14px',
            backgroundColor: 'rgba(236, 72, 153, 0.08)',
            border: '1px solid rgba(236, 72, 153, 0.22)',
            cursor: 'pointer',
            transition: 'background 0.2s',
          }}
        >
          <div
            style={{
              width: '42px',
              height: '42px',
              borderRadius: '12px',
              backgroundColor: 'rgba(236, 72, 153, 0.2)',
              color: '#f472b6',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              flexShrink: 0,
            }}
          >
            <RefreshCw size={20} />
          </div>
          <div style={{ flex: 1, minWidth: 0 }}>
            <div style={{ fontWeight: 700, fontSize: '15px', color: '#fff' }}>Universal Library & Sync</div>
            <div style={{ fontSize: '12px', color: 'rgba(255,255,255,0.6)', marginTop: '2px' }}>
              Connect Spotify, YouTube & Cloud playlists
            </div>
          </div>
          <ArrowUpRight size={18} style={{ color: 'rgba(255,255,255,0.4)' }} />
        </div>

        {/* 2. Download APK Button - ONLY ON WEB VERSIONS (HIDDEN INSIDE ANDROID APP) */}
        {!isNative && (
          <div
            onClick={onOpenDownloadModal}
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: '14px',
              padding: '14px 16px',
              borderRadius: '14px',
              backgroundColor: 'rgba(34, 197, 94, 0.08)',
              border: '1px solid rgba(34, 197, 94, 0.22)',
              cursor: 'pointer',
              transition: 'background 0.2s',
            }}
          >
            <div
              style={{
                width: '42px',
                height: '42px',
                borderRadius: '12px',
                backgroundColor: 'rgba(34, 197, 94, 0.18)',
                color: '#4ade80',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                flexShrink: 0,
              }}
            >
              <Download size={20} />
            </div>
            <div style={{ flex: 1, minWidth: 0 }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                <span style={{ fontWeight: 700, fontSize: '15px', color: '#fff' }}>Download Android App (.apk)</span>
                <span style={{ background: 'rgba(34, 197, 94, 0.2)', color: '#4ade80', fontSize: '11px', fontWeight: 700, padding: '2px 8px', borderRadius: '10px' }}>
                  {CURRENT_APP_VERSION}
                </span>
              </div>
              <div style={{ fontSize: '12px', color: 'rgba(255,255,255,0.6)', marginTop: '2px' }}>
                Download directly from GitHub releases without Android Studio
              </div>
            </div>
            <ArrowUpRight size={18} style={{ color: 'rgba(255,255,255,0.4)' }} />
          </div>
        )}

        {/* 3. GitHub Update Detection & Update Now Card */}
        <div
          style={{
            padding: '16px',
            borderRadius: '14px',
            backgroundColor: updateCheckStatus === 'update-available' ? 'rgba(245, 158, 11, 0.08)' : 'rgba(255, 255, 255, 0.03)',
            border: updateCheckStatus === 'update-available' ? '1px solid rgba(245, 158, 11, 0.3)' : '1px solid rgba(255, 255, 255, 0.08)',
          }}
        >
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '12px' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
              <Sparkles size={18} style={{ color: updateCheckStatus === 'update-available' ? '#fbbf24' : '#38bdf8' }} />
              <span style={{ fontWeight: 700, fontSize: '15px', color: '#fff' }}>App Version & Updates</span>
            </div>

            <button
              onClick={handleCheckUpdate}
              disabled={isCheckingUpdate}
              style={{
                background: 'rgba(255, 255, 255, 0.06)',
                border: '1px solid rgba(255, 255, 255, 0.1)',
                color: '#fff',
                padding: '6px 12px',
                borderRadius: '16px',
                fontSize: '12px',
                fontWeight: 600,
                display: 'flex',
                alignItems: 'center',
                gap: '6px',
                cursor: 'pointer',
              }}
            >
              <RefreshCw size={13} style={{ animation: isCheckingUpdate ? 'spin 1s linear infinite' : 'none' }} />
              <span>{isCheckingUpdate ? 'Checking...' : 'Check'}</span>
            </button>
          </div>

          <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '8px' }}>
            <span style={{ fontSize: '13px', color: 'rgba(255, 255, 255, 0.6)' }}>Current Version:</span>
            <span style={{ fontSize: '13px', fontWeight: 700, color: '#fff', background: 'rgba(255,255,255,0.08)', padding: '2px 8px', borderRadius: '6px' }}>
              {CURRENT_APP_VERSION}
            </span>
            {isNative && (
              <span style={{ fontSize: '11px', fontWeight: 600, color: '#38bdf8', background: 'rgba(56, 189, 248, 0.12)', padding: '2px 8px', borderRadius: '6px' }}>
                Android APK Native
              </span>
            )}
          </div>

          {/* Status Message */}
          {updateCheckStatus === 'update-available' && updateInfo ? (
            <div style={{ marginTop: '12px', padding: '12px', borderRadius: '10px', background: 'rgba(245, 158, 11, 0.12)', border: '1px solid rgba(245, 158, 11, 0.25)' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '6px', color: '#fbbf24', fontWeight: 700, fontSize: '13px', marginBottom: '4px' }}>
                <span>✨ New Update Available: {updateInfo.latestVersion}</span>
              </div>
              <div style={{ fontSize: '12px', color: 'rgba(255, 255, 255, 0.8)', marginBottom: '12px' }}>
                {updateInfo.releaseName || 'A new version with performance improvements is available on GitHub.'}
              </div>
              <div style={{ display: 'flex', gap: '8px' }}>
                <button
                  onClick={handleUpdateNow}
                  style={{
                    flex: 1,
                    padding: '10px 16px',
                    borderRadius: '12px',
                    background: 'linear-gradient(135deg, #c4b5fd 0%, #a78bfa 100%)',
                    color: '#1e1b4b',
                    border: '1px solid rgba(255, 255, 255, 0.3)',
                    fontWeight: 700,
                    fontSize: '13px',
                    cursor: 'pointer',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    gap: '8px',
                    boxShadow: '0 4px 20px rgba(167, 139, 250, 0.38)',
                  }}
                >
                  <Download size={15} />
                  <span>Update Now</span>
                </button>
                <button
                  onClick={handleDismissUpdate}
                  style={{
                    padding: '10px 14px',
                    borderRadius: '12px',
                    backgroundColor: 'rgba(255, 255, 255, 0.08)',
                    color: 'rgba(255, 255, 255, 0.8)',
                    border: '1px solid rgba(255, 255, 255, 0.15)',
                    fontWeight: 600,
                    fontSize: '13px',
                    cursor: 'pointer',
                  }}
                  title="Mark as current"
                >
                  Dismiss
                </button>
              </div>
            </div>
          ) : updateCheckStatus === 'error' ? (
            <div style={{ marginTop: '8px' }}>
              <div style={{ color: '#f87171', fontSize: '12px', marginBottom: '8px' }}>
                Unable to check automatic updates. You can download the latest APK directly from GitHub.
              </div>
              <button
                onClick={() => openExternalUrl(updateInfo?.downloadUrl || 'https://github.com/ayushmanchakraborty254-create/Resonate/releases/latest')}
                style={{
                  padding: '7px 14px',
                  borderRadius: '12px',
                  background: 'rgba(196, 181, 253, 0.16)',
                  border: '1px solid rgba(196, 181, 253, 0.35)',
                  boxShadow: '0 2px 12px rgba(167, 139, 250, 0.25)',
                  color: '#c4b5fd',
                  fontSize: '12px',
                  fontWeight: 600,
                  cursor: 'pointer',
                  display: 'flex',
                  alignItems: 'center',
                  gap: '6px',
                }}
              >
                <Download size={13} />
                <span>Download Latest APK</span>
              </button>
            </div>
          ) : updateCheckStatus === 'up-to-date' ? (
            <div style={{ display: 'flex', alignItems: 'center', gap: '6px', color: '#4ade80', fontSize: '12px', marginTop: '6px' }}>
              <CheckCircle2 size={15} />
              <span>You have the latest version installed.</span>
            </div>
          ) : (
            <div style={{ fontSize: '12px', color: 'rgba(255, 255, 255, 0.5)', marginTop: '4px' }}>
              Connected to GitHub Releases. Tap 'Check' to verify latest builds.
            </div>
          )}
        </div>
      </div>

      {/* STORAGE & SETTINGS UTILITIES */}
      <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
        <div style={{ fontSize: '12px', fontWeight: 700, textTransform: 'uppercase', color: 'rgba(255,255,255,0.45)', letterSpacing: '0.8px', paddingLeft: '4px' }}>
          Maintenance & Storage
        </div>

        <button
          onClick={handleClearCache}
          style={{
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            padding: '12px 16px',
            borderRadius: '12px',
            backgroundColor: 'rgba(255, 255, 255, 0.03)',
            border: '1px solid rgba(255, 255, 255, 0.06)',
            color: '#fff',
            cursor: 'pointer',
            textAlign: 'left',
          }}
        >
          <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
            <Trash2 size={16} style={{ color: 'rgba(255,255,255,0.5)' }} />
            <span style={{ fontSize: '14px', fontWeight: 500 }}>Clear App Cache & Data</span>
          </div>
          <span style={{ fontSize: '12px', color: 'rgba(255, 255, 255, 0.4)' }}>Free storage</span>
        </button>

        <a
          href="https://github.com/ayushmanchakraborty254-create/Resonate"
          target="_blank"
          rel="noopener noreferrer"
          onClick={(e) => {
            e.preventDefault();
            openExternalUrl('https://github.com/ayushmanchakraborty254-create/Resonate');
          }}
          style={{
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            padding: '12px 16px',
            borderRadius: '12px',
            backgroundColor: 'rgba(255, 255, 255, 0.03)',
            border: '1px solid rgba(255, 255, 255, 0.06)',
            color: '#fff',
            textDecoration: 'none',
          }}
        >
          <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
            <ExternalLink size={16} style={{ color: 'rgba(255,255,255,0.5)' }} />
            <span style={{ fontSize: '14px', fontWeight: 500 }}>Resonate GitHub Repository</span>
          </div>
          <span style={{ fontSize: '12px', color: 'rgba(255, 255, 255, 0.4)' }}>v1.0.0</span>
        </a>

        {/* Media3 Native Playback Test Card (Phase 3 Diagnostic Tool) */}
        {isNative && (
          <div style={{
            marginTop: '12px',
            padding: '16px',
            borderRadius: '14px',
            backgroundColor: 'rgba(196, 181, 253, 0.08)',
            border: '1px solid rgba(196, 181, 253, 0.25)',
          }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '8px' }}>
              <Volume2 size={18} style={{ color: '#c4b5fd' }} />
              <div style={{ fontWeight: 700, fontSize: '14px', color: '#c4b5fd' }}>
                Media3 Native Audio Engine (Phase 3 Test)
              </div>
            </div>
            <div style={{ fontSize: '12px', color: 'rgba(255, 255, 255, 0.7)', marginBottom: '12px', lineHeight: 1.5 }}>
              Tests Google's authorized royalty-free test stream (Jazz In Paris) directly through native AndroidX Media3 ExoPlayer & MediaSessionService.
            </div>
            <div style={{ display: 'flex', gap: '8px', flexWrap: 'wrap' }}>
              <button
                onClick={handleRunNativeSelfTest}
                style={{
                  padding: '8px 14px',
                  borderRadius: '10px',
                  background: 'linear-gradient(135deg, #c4b5fd 0%, #a78bfa 100%)',
                  color: '#1e1b4b',
                  border: 'none',
                  fontSize: '12px',
                  fontWeight: 700,
                  cursor: 'pointer',
                  display: 'flex',
                  alignItems: 'center',
                  gap: '6px',
                }}
              >
                <Play size={13} fill="#1e1b4b" />
                <span>Start Royalty-Free Stream</span>
              </button>
              {isNativePlaying && (
                <button
                  onClick={handleToggleNativeTest}
                  style={{
                    padding: '8px 14px',
                    borderRadius: '10px',
                    background: 'rgba(255, 255, 255, 0.1)',
                    color: '#fff',
                    border: '1px solid rgba(255, 255, 255, 0.2)',
                    fontSize: '12px',
                    fontWeight: 600,
                    cursor: 'pointer',
                    display: 'flex',
                    alignItems: 'center',
                    gap: '6px',
                  }}
                >
                  <Pause size={13} fill="#fff" />
                  <span>Pause Stream</span>
                </button>
              )}
            </div>
            {!notifGranted && (
              <div style={{
                marginTop: '10px',
                padding: '8px 12px',
                borderRadius: '8px',
                background: 'rgba(245, 158, 11, 0.15)',
                border: '1px solid rgba(245, 158, 11, 0.3)',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'space-between',
                gap: '8px',
              }}>
                <span style={{ fontSize: '11px', color: '#fbbf24' }}>
                  ⚠️ Notifications disabled. Lock-screen controls require notification permission.
                </span>
                <button
                  onClick={handleRequestNotifPermission}
                  style={{
                    background: '#fbbf24',
                    color: '#1e1b4b',
                    border: 'none',
                    borderRadius: '6px',
                    padding: '4px 8px',
                    fontSize: '11px',
                    fontWeight: 700,
                    cursor: 'pointer',
                    whiteSpace: 'nowrap',
                  }}
                >
                  Enable
                </button>
              </div>
            )}
            {nativeTestStatus && (
              <div style={{ marginTop: '10px', fontSize: '12px', color: '#c4b5fd', fontFamily: 'monospace' }}>
                {nativeTestStatus}
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
};
