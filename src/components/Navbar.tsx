import React, { useState, useEffect, useRef } from 'react';
import {
  Search, Music, LogOut, User as UserIcon, Mic, Radio,
  BarChart2, History, Download, X, Smartphone
} from 'lucide-react';
import type { Track } from '../types';
import { POPULAR_TRACKS } from '../utils/youtube';
import { useBreakpoint } from '../utils/responsive';
import { AppDownloadModal } from './AppDownloadModal';
import { isNativeAndroidApp } from '../utils/appPlatform';
import logoImg from '../assets/logo.png';

interface NavbarProps {
  currentView?: string;
  onSearch: (query: string) => void;
  setView: (view: string) => void;
  onPlayTrackImmediate: (track: Track) => void;
  user: { name: string; email: string; avatar?: string; isGoogle?: boolean } | null;
  onOpenAuth: () => void;
  onLogout: () => void;
  onOpenListenTogether?: () => void;
  onOpenStats?: () => void;
  onOpenHistory?: () => void;
  onOpenRecognizer?: () => void;
}

export const Navbar: React.FC<NavbarProps> = ({
  currentView,
  onSearch,
  setView,
  onPlayTrackImmediate,
  user,
  onOpenAuth,
  onLogout,
  onOpenListenTogether,
  onOpenStats,
  onOpenHistory,
  onOpenRecognizer,
}) => {
  const { isMobile, isTablet } = useBreakpoint();
  const [query, setQuery] = useState('');
  const [showSuggestions, setShowSuggestions] = useState(false);
  const [suggestions, setSuggestions] = useState<Track[]>([]);
  const [showDropdown, setShowDropdown] = useState(false);
  const [isMobileSearchOpen, setIsMobileSearchOpen] = useState(false);
  const [showMobileMenu, setShowMobileMenu] = useState(false);
  const [showDownloadModal, setShowDownloadModal] = useState(false);

  const dropdownRef = useRef<HTMLDivElement>(null);
  const profileRef = useRef<HTMLDivElement>(null);

  // PWA Install prompt state
  const [deferredPrompt, setDeferredPrompt] = useState<any>(null);
  const [isStandalone, setIsStandalone] = useState(false);

  useEffect(() => {
    // Check if already running in standalone app mode
    if (window.matchMedia('(display-mode: standalone)').matches || (window.navigator as any).standalone) {
      setIsStandalone(true);
    }

    const handleBeforeInstall = (e: Event) => {
      e.preventDefault();
      setDeferredPrompt(e);
    };

    const handleAppInstalled = () => {
      setIsStandalone(true);
      setDeferredPrompt(null);
    };

    window.addEventListener('beforeinstallprompt', handleBeforeInstall);
    window.addEventListener('appinstalled', handleAppInstalled);

    return () => {
      window.removeEventListener('beforeinstallprompt', handleBeforeInstall);
      window.removeEventListener('appinstalled', handleAppInstalled);
    };
  }, []);

  const handleInstallApp = async () => {
    if (deferredPrompt) {
      deferredPrompt.prompt();
      const { outcome } = await deferredPrompt.userChoice;
      if (outcome === 'accepted') {
        setDeferredPrompt(null);
      }
    } else {
      alert('To install Resonate as a Standalone App:\n\n• On Chrome/Edge: Look for the Install icon (⤓) in your browser address bar on the right, or choose Menu (⋮) > "Install Resonate" / "Add to Home screen".\n• On Android: Choose browser menu > "Add to Home screen" or download the APK directly!');
    }
  };

  const handleDownloadApk = () => {
    setShowDownloadModal(true);
  };

  // Close suggestions and profile dropdown when clicking outside
  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
        setShowSuggestions(false);
      }
      if (profileRef.current && !profileRef.current.contains(event.target as Node)) {
        setShowDropdown(false);
      }
    }
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  // Filter suggestions based on local database queries
  useEffect(() => {
    if (query.trim() === '') {
      setSuggestions([]);
      return;
    }
    const filtered = POPULAR_TRACKS.filter(
      (track) =>
        track.title.toLowerCase().includes(query.toLowerCase()) ||
        track.artist.toLowerCase().includes(query.toLowerCase())
    ).slice(0, 5);
    setSuggestions(filtered);
  }, [query]);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    onSearch(query);
    setView('search');
    setShowSuggestions(false);
    setIsMobileSearchOpen(false);
  };

  return (
    <>
      <nav className="navbar" style={{ position: 'relative' }}>
        {/* If Mobile Search is open, expand mobile search bar full-width */}
        {isMobile && isMobileSearchOpen ? (
          <div style={{ display: 'flex', alignItems: 'center', width: '100%', gap: '8px' }}>
            <form onSubmit={handleSubmit} style={{ flex: 1 }}>
              <div className="search-box" style={{ width: '100%', borderRadius: '24px', backgroundColor: 'rgba(255,255,255,0.08)' }}>
                <Search size={18} className="search-icon" style={{ color: 'var(--yt-text-secondary)' }} />
                <input
                  type="text"
                  className="search-input"
                  placeholder="Search songs, artists..."
                  value={query}
                  onChange={(e) => {
                    setQuery(e.target.value);
                    setShowSuggestions(true);
                  }}
                />
              </div>
            </form>
            <button
              onClick={() => {
                setIsMobileSearchOpen(false);
                setShowSuggestions(false);
              }}
              style={{
                background: 'none',
                border: 'none',
                color: '#fff',
                padding: '8px',
                cursor: 'pointer',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
              }}
            >
              <X size={20} />
            </button>
          </div>
        ) : (
          <>
            {/* Top Left Brand: Resonate Logo + Text at top-left of window (YouTube Music style) */}
            <div
              className="nav-left"
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: isMobile ? '8px' : '10px',
                minWidth: isMobile ? 'auto' : '200px',
                cursor: 'pointer',
                flexShrink: 0,
              }}
              onClick={() => setView('home')}
            >
              <img
                src={logoImg}
                alt="Resonate"
                style={{
                  width: isMobile ? '26px' : '30px',
                  height: isMobile ? '26px' : '30px',
                  borderRadius: '8px',
                  objectFit: 'cover',
                  boxShadow: '0 4px 12px rgba(0,0,0,0.4)',
                }}
              />
              <span
                style={{
                  fontSize: isMobile ? '22px' : '20px',
                  fontWeight: 800,
                  color: '#fff',
                  letterSpacing: '-0.4px',
                  fontFamily: "'Outfit', sans-serif",
                }}
              >
                {isMobile
                  ? currentView === 'library'
                    ? 'Library'
                    : currentView === 'favourites'
                    ? 'Favourites'
                    : 'Home'
                  : 'Resonate'}
              </span>
            </div>

            {/* Search shifted to the side next to logo (YT Music desktop style) */}
            {!isMobile && (
              <div
                className="nav-center"
                ref={dropdownRef}
                style={{
                  maxWidth: isTablet ? '320px' : '480px',
                  margin: '0 0 0 16px',
                  flex: 1,
                }}
              >
                <form onSubmit={handleSubmit}>
                  <div className="search-box">
                    <Search size={18} className="search-icon" style={{ color: 'var(--yt-text-secondary)' }} />
                    <input
                      type="text"
                      className="search-input"
                      placeholder="Search songs, albums, artists"
                      value={query}
                      onChange={(e) => {
                        setQuery(e.target.value);
                        setShowSuggestions(true);
                      }}
                      onFocus={() => setShowSuggestions(true)}
                    />
                  </div>
                </form>

                {showSuggestions && suggestions.length > 0 && (
                  <div className="search-suggestions">
                    {suggestions.map((track) => (
                      <div
                        key={track.id}
                        className="suggestion-item"
                        onClick={() => {
                          onPlayTrackImmediate(track);
                          setQuery(track.title);
                          setShowSuggestions(false);
                        }}
                      >
                        <Music size={14} style={{ color: 'var(--yt-text-secondary)' }} />
                        <div>
                          <div style={{ fontWeight: 500 }}>{track.title}</div>
                          <div style={{ fontSize: '11px', color: 'var(--yt-text-secondary)' }}>
                            {track.artist}
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            )}

            {/* Right Buttons on Desktop & Tablet */}
            {!isMobile && (
              <div className="nav-right" style={{ display: 'flex', alignItems: 'center', gap: isTablet ? '8px' : '12px' }} ref={profileRef}>
                {/* Music Recognizer Button (Shazam / Metrolist Engine) */}
                <button
                  onClick={onOpenRecognizer}
                  className="icon-btn"
                  style={{
                    backgroundColor: 'rgba(141, 168, 214, 0.15)',
                    color: '#8da8d6',
                    width: '38px',
                    height: '38px',
                    borderRadius: '50%',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    cursor: 'pointer',
                    border: '1px solid rgba(141, 168, 214, 0.3)',
                    transition: 'transform 0.2s',
                  }}
                  title="Recognize Music (Metrolist / Shazam Engine)"
                >
                  <Mic size={18} />
                </button>

                {/* Listen Together Button */}
                <button
                  onClick={onOpenListenTogether}
                  className="icon-btn"
                  style={{
                    backgroundColor: 'rgba(255, 255, 255, 0.05)',
                    color: '#fff',
                    width: '38px',
                    height: '38px',
                    borderRadius: '50%',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    cursor: 'pointer',
                    border: 'none',
                    transition: 'transform 0.2s',
                  }}
                  title="Listen Together (Rooms)"
                >
                  <Radio size={18} />
                </button>

                {/* Stats Button */}
                <button
                  onClick={onOpenStats}
                  className="icon-btn"
                  style={{
                    backgroundColor: 'rgba(255, 255, 255, 0.05)',
                    color: '#fff',
                    width: '38px',
                    height: '38px',
                    borderRadius: '50%',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    cursor: 'pointer',
                    border: 'none',
                    transition: 'transform 0.2s',
                  }}
                  title="Listening Stats"
                >
                  <BarChart2 size={18} />
                </button>

                {/* History Button */}
                <button
                  onClick={onOpenHistory}
                  className="icon-btn"
                  style={{
                    backgroundColor: 'rgba(255, 255, 255, 0.05)',
                    color: '#fff',
                    width: '38px',
                    height: '38px',
                    borderRadius: '50%',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    cursor: 'pointer',
                    border: 'none',
                    transition: 'transform 0.2s',
                  }}
                  title="Listening History"
                >
                  <History size={18} />
                </button>

                {/* Single Install App Button (QR Code + GitHub APK download modal) - Only on Web */}
                {!isNativeAndroidApp() && (
                  <button
                    onClick={() => setShowDownloadModal(true)}
                    style={{
                      backgroundColor: 'rgba(196, 181, 253, 0.14)',
                      color: '#c4b5fd',
                      border: '1px solid rgba(196, 181, 253, 0.32)',
                      boxShadow: '0 2px 14px rgba(167, 139, 250, 0.25)',
                      padding: '7px 14px',
                      borderRadius: '20px',
                      fontSize: '13px',
                      fontWeight: 600,
                      display: 'flex',
                      alignItems: 'center',
                      gap: '7px',
                      cursor: 'pointer',
                      transition: 'all 0.2s',
                      whiteSpace: 'nowrap',
                    }}
                    title="Install Resonate App (Scan QR Code, Download APK, or Desktop)"
                  >
                    <Smartphone size={15} />
                    <span>Install App</span>
                  </button>
                )}

                {user ? (
                  <div className="profile-dropdown-container">
                    <div className="avatar" style={{ cursor: 'pointer', overflow: 'hidden', display: 'flex', alignItems: 'center', justifyContent: 'center' }} onClick={() => setShowDropdown(!showDropdown)}>
                      {user.avatar && (user.avatar.startsWith('http://') || user.avatar.startsWith('https://')) ? (
                        <img src={user.avatar} alt={user.name} style={{ width: '100%', height: '100%', objectFit: 'cover', borderRadius: '50%' }} />
                      ) : (
                        user.avatar || user.name.charAt(0).toUpperCase()
                      )}
                    </div>
                    {showDropdown && (
                      <div className="profile-dropdown">
                        <div className="profile-info">
                          <div className="profile-name">{user.name}</div>
                          <div className="profile-email">{user.email}</div>
                        </div>
                        <button className="dropdown-item" onClick={() => { setView('profile'); setShowDropdown(false); }}>
                          <UserIcon size={16} />
                          Account & Updates
                        </button>
                        <button className="dropdown-item" onClick={() => { setView('library'); setShowDropdown(false); }}>
                          <Music size={16} />
                          My Library
                        </button>
                        <button className="dropdown-item" onClick={() => { onOpenStats?.(); setShowDropdown(false); }}>
                          <BarChart2 size={16} />
                          Stats
                        </button>
                        <button className="dropdown-item" onClick={() => { onOpenHistory?.(); setShowDropdown(false); }}>
                          <History size={16} />
                          History
                        </button>
                        <button className="dropdown-item dropdown-item-danger" onClick={() => { onLogout(); setShowDropdown(false); }}>
                          <LogOut size={16} />
                          Sign Out
                        </button>
                      </div>
                    )}
                  </div>
                ) : (
                  <button className="btn btn-primary" onClick={onOpenAuth} style={{ padding: '7px 16px', fontSize: '13px' }}>
                    Sign In
                  </button>
                )}
              </div>
            )}

            {/* Mobile Top Actions */}
            {isMobile && (
              <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                {/* Listening History */}
                <button
                  onClick={onOpenHistory}
                  style={{
                    background: 'none',
                    border: 'none',
                    color: 'rgba(255, 255, 255, 0.85)',
                    padding: '4px',
                    cursor: 'pointer',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                  }}
                  title="History"
                >
                  <History size={19} />
                </button>

                {/* Stats / Trends */}
                <button
                  onClick={onOpenStats}
                  style={{
                    background: 'none',
                    border: 'none',
                    color: 'rgba(255, 255, 255, 0.85)',
                    padding: '4px',
                    cursor: 'pointer',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                  }}
                  title="Stats"
                >
                  <BarChart2 size={19} />
                </button>

                {/* Profile Avatar / Sign In */}
                {user ? (
                  <div
                    onClick={() => setView('profile')}
                    style={{
                      width: '32px',
                      height: '32px',
                      borderRadius: '50%',
                      overflow: 'hidden',
                      cursor: 'pointer',
                      border: '1.5px solid rgba(255, 255, 255, 0.25)',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      marginLeft: '2px',
                    }}
                    title="Account & Updates"
                  >
                    {user.avatar && (user.avatar.startsWith('http://') || user.avatar.startsWith('https://')) ? (
                      <img src={user.avatar} alt={user.name} style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
                    ) : (
                      <div
                        style={{
                          width: '100%',
                          height: '100%',
                          background: '#e50914',
                          color: '#fff',
                          fontSize: '13px',
                          fontWeight: 700,
                          display: 'flex',
                          alignItems: 'center',
                          justifyContent: 'center',
                        }}
                      >
                        {user.avatar || user.name.charAt(0).toUpperCase()}
                      </div>
                    )}
                  </div>
                ) : (
                  <button
                    onClick={() => setView('profile')}
                    style={{
                      background: 'rgba(255, 255, 255, 0.08)',
                      border: '1px solid rgba(255, 255, 255, 0.15)',
                      color: '#fff',
                      width: '32px',
                      height: '32px',
                      borderRadius: '50%',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      cursor: 'pointer',
                      marginLeft: '2px',
                    }}
                    title="Account & Updates"
                  >
                    <UserIcon size={16} />
                  </button>
                )}
              </div>
            )}
          </>
        )}
      </nav>

      {/* Mobile Quick Actions Hub Bottom Sheet / Drawer */}
      {showMobileMenu && (
        <div
          style={{
            position: 'fixed',
            inset: 0,
            zIndex: 1100,
            backgroundColor: 'rgba(0, 0, 0, 0.75)',
            backdropFilter: 'blur(8px)',
            display: 'flex',
            flexDirection: 'column',
            justifyContent: 'flex-end',
          }}
          onClick={() => setShowMobileMenu(false)}
        >
          <div
            style={{
              backgroundColor: '#121212',
              borderRadius: '24px 24px 0 0',
              padding: '24px 20px',
              paddingBottom: 'calc(24px + env(safe-area-inset-bottom))',
              display: 'flex',
              flexDirection: 'column',
              gap: '16px',
              borderTop: '1px solid rgba(255,255,255,0.1)',
              boxShadow: '0 -10px 40px rgba(0,0,0,0.8)',
            }}
            onClick={(e) => e.stopPropagation()}
          >
            {/* Header / User Profile */}
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', borderBottom: '1px solid rgba(255,255,255,0.06)', paddingBottom: '16px' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                <div style={{ width: '48px', height: '48px', borderRadius: '50%', backgroundColor: 'var(--yt-accent)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontWeight: 700, fontSize: '18px', color: '#fff', overflow: 'hidden' }}>
                  {user ? (
                    user.avatar ? <img src={user.avatar} alt={user.name} style={{ width: '100%', height: '100%', objectFit: 'cover' }} /> : user.name[0].toUpperCase()
                  ) : (
                    <UserIcon size={24} />
                  )}
                </div>
                <div>
                  <div style={{ fontWeight: 700, fontSize: '16px', color: '#fff' }}>
                    {user ? user.name : 'Guest Listener'}
                  </div>
                  <div style={{ fontSize: '12px', color: 'var(--yt-text-secondary)', marginTop: '2px' }}>
                    {user ? user.email : 'Sign in to sync your music'}
                  </div>
                </div>
              </div>
              <button
                onClick={() => setShowMobileMenu(false)}
                style={{ background: 'none', border: 'none', color: 'var(--yt-text-secondary)', padding: '6px', cursor: 'pointer' }}
              >
                <X size={20} />
              </button>
            </div>

            {/* Hub Menu Grid / List */}
            <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
              {/* Listening Stats */}
              <button
                onClick={() => {
                  setShowMobileMenu(false);
                  onOpenStats?.();
                }}
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: '14px',
                  padding: '12px 14px',
                  borderRadius: '12px',
                  backgroundColor: 'rgba(255,255,255,0.03)',
                  border: '1px solid rgba(255,255,255,0.05)',
                  color: '#fff',
                  fontSize: '14px',
                  fontWeight: 600,
                  cursor: 'pointer',
                  textAlign: 'left',
                }}
              >
                <div style={{ width: '32px', height: '32px', borderRadius: '8px', backgroundColor: 'rgba(59, 130, 246, 0.15)', color: '#60a5fa', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                  <BarChart2 size={18} />
                </div>
                <div style={{ flex: 1 }}>
                  <div>Listening Stats</div>
                  <div style={{ fontSize: '11px', color: 'var(--yt-text-secondary)', fontWeight: 400 }}>Insights, top artists & play count</div>
                </div>
              </button>

              {/* Listening History */}
              <button
                onClick={() => {
                  setShowMobileMenu(false);
                  onOpenHistory?.();
                }}
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: '14px',
                  padding: '12px 14px',
                  borderRadius: '12px',
                  backgroundColor: 'rgba(255,255,255,0.03)',
                  border: '1px solid rgba(255,255,255,0.05)',
                  color: '#fff',
                  fontSize: '14px',
                  fontWeight: 600,
                  cursor: 'pointer',
                  textAlign: 'left',
                }}
              >
                <div style={{ width: '32px', height: '32px', borderRadius: '8px', backgroundColor: 'rgba(245, 158, 11, 0.15)', color: '#fbbf24', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                  <History size={18} />
                </div>
                <div style={{ flex: 1 }}>
                  <div>Listening History</div>
                  <div style={{ fontSize: '11px', color: 'var(--yt-text-secondary)', fontWeight: 400 }}>Recently played tracks</div>
                </div>
              </button>

              {/* Direct Android APK Download (Graphite Style) */}
              <button
                onClick={() => {
                  setShowMobileMenu(false);
                  handleDownloadApk();
                }}
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: '14px',
                  padding: '12px 14px',
                  borderRadius: '12px',
                  backgroundColor: 'rgba(34, 197, 94, 0.08)',
                  border: '1px solid rgba(34, 197, 94, 0.2)',
                  color: '#4ade80',
                  fontSize: '14px',
                  fontWeight: 600,
                  cursor: 'pointer',
                  textAlign: 'left',
                }}
              >
                <div style={{ width: '32px', height: '32px', borderRadius: '8px', backgroundColor: 'rgba(34, 197, 94, 0.2)', color: '#4ade80', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                  <Download size={18} />
                </div>
                <div style={{ flex: 1 }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                    <span>Download Android App (.apk)</span>
                    <span style={{ fontSize: '10px', backgroundColor: '#22c55e', color: '#000', padding: '2px 6px', borderRadius: '10px', fontWeight: 800 }}>LATEST</span>
                  </div>
                  <div style={{ fontSize: '11px', color: 'rgba(255,255,255,0.6)', fontWeight: 400 }}>Auto-built on GitHub without Android Studio</div>
                </div>
              </button>

              {/* Install PWA App */}
              {!isStandalone && (
                <button
                  onClick={() => {
                    setShowMobileMenu(false);
                    handleInstallApp();
                  }}
                  style={{
                    display: 'flex',
                    alignItems: 'center',
                    gap: '14px',
                    padding: '12px 14px',
                    borderRadius: '12px',
                    backgroundColor: 'rgba(255,255,255,0.03)',
                    border: '1px solid rgba(255,255,255,0.05)',
                    color: '#fff',
                    fontSize: '14px',
                    fontWeight: 600,
                    cursor: 'pointer',
                    textAlign: 'left',
                  }}
                >
                  <div style={{ width: '32px', height: '32px', borderRadius: '8px', backgroundColor: 'rgba(168, 85, 247, 0.15)', color: '#c084fc', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                    <Smartphone size={18} />
                  </div>
                  <div style={{ flex: 1 }}>
                    <div>Install Web App (PWA)</div>
                    <div style={{ fontSize: '11px', color: 'var(--yt-text-secondary)', fontWeight: 400 }}>Add to device home screen</div>
                  </div>
                </button>
              )}

              {/* Universal Library */}
              <button
                onClick={() => {
                  setShowMobileMenu(false);
                  setView('universal_library');
                }}
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: '14px',
                  padding: '12px 14px',
                  borderRadius: '12px',
                  backgroundColor: 'rgba(255,255,255,0.03)',
                  border: '1px solid rgba(255,255,255,0.05)',
                  color: '#fff',
                  fontSize: '14px',
                  fontWeight: 600,
                  cursor: 'pointer',
                  textAlign: 'left',
                }}
              >
                <div style={{ width: '32px', height: '32px', borderRadius: '8px', backgroundColor: 'rgba(236, 72, 153, 0.15)', color: '#f472b6', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                  <Music size={18} />
                </div>
                <div style={{ flex: 1 }}>
                  <div>Universal Library & Sync</div>
                  <div style={{ fontSize: '11px', color: 'var(--yt-text-secondary)', fontWeight: 400 }}>Spotify, YouTube & cloud playlists</div>
                </div>
              </button>
            </div>

            {/* Auth Button */}
            <div style={{ marginTop: '8px', paddingTop: '12px', borderTop: '1px solid rgba(255,255,255,0.06)' }}>
              {user ? (
                <button
                  onClick={() => {
                    setShowMobileMenu(false);
                    onLogout();
                  }}
                  style={{
                    width: '100%',
                    padding: '12px',
                    borderRadius: '12px',
                    backgroundColor: 'rgba(239, 68, 68, 0.1)',
                    border: '1px solid rgba(239, 68, 68, 0.2)',
                    color: '#f87171',
                    fontSize: '14px',
                    fontWeight: 700,
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    gap: '8px',
                    cursor: 'pointer',
                  }}
                >
                  <LogOut size={16} /> Sign Out Account
                </button>
              ) : (
                <button
                  onClick={() => {
                    setShowMobileMenu(false);
                    onOpenAuth();
                  }}
                  className="btn btn-primary"
                  style={{ width: '100%', padding: '14px', borderRadius: '12px', fontSize: '14px', fontWeight: 700 }}
                >
                  Sign In to Resonate
                </button>
              )}
            </div>
          </div>
        </div>
      )}

      {/* APK & App Download Hub Modal */}
      <AppDownloadModal
        isOpen={showDownloadModal}
        onClose={() => setShowDownloadModal(false)}
        onInstallPwa={handleInstallApp}
      />
    </>
  );
};
