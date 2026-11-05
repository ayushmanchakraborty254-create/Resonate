import React, { useState, useEffect, useRef } from 'react';
import { Search, Music, Disc, LogOut, User as UserIcon, Mic, Radio, BarChart2, History, Download } from 'lucide-react';
import type { Track } from '../types';
import { POPULAR_TRACKS } from '../utils/youtube';
import { useBreakpoint } from '../utils/responsive';

interface NavbarProps {
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
  const { isMobile } = useBreakpoint();
  const [query, setQuery] = useState('');
  const [showSuggestions, setShowSuggestions] = useState(false);
  const [suggestions, setSuggestions] = useState<Track[]>([]);
  const [showDropdown, setShowDropdown] = useState(false);
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
      alert('To install Resonate as a Desktop App:\n\n• On Chrome/Edge: Look for the Install icon (⤓) in your browser address bar on the right, or go to Menu (⋮) > "Install Resonate".\n• On Windows: You can also pin it to your Taskbar or Start Menu for an instant desktop window!');
    }
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
  };

  return (
    <nav className="navbar">
      <div className="nav-left">
        <a href="#" className="brand" onClick={() => setView('home')}>
          <Disc className="brand-icon" size={28} />
          <span>Resonate</span>
        </a>
      </div>

      {!isMobile && (
        <div className="nav-center" ref={dropdownRef}>
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

      {!isMobile && (
        <div className="nav-right" style={{ display: 'flex', alignItems: 'center', gap: '12px' }} ref={profileRef}>
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
              border: 'none',
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
            title="Listen Together"
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
            title="Stats"
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
            title="History"
          >
            <History size={18} />
          </button>

          {/* Install Desktop / Mobile Standalone App Button */}
          {!isStandalone && (
            <button
              onClick={handleInstallApp}
              style={{
                backgroundColor: 'rgba(255, 255, 255, 0.08)',
                color: '#fff',
                border: '1px solid rgba(255, 255, 255, 0.15)',
                padding: '7px 14px',
                borderRadius: '20px',
                fontSize: '12px',
                fontWeight: 600,
                display: 'flex',
                alignItems: 'center',
                gap: '6px',
                cursor: 'pointer',
                transition: 'all 0.2s',
                whiteSpace: 'nowrap',
              }}
              title="Install Resonate as a Native App on your device"
            >
              <Download size={14} />
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
                  <button className="dropdown-item" onClick={() => { setView('library'); setShowDropdown(false); }}>
                    <UserIcon size={16} />
                    My Library
                  </button>
                  <button className="dropdown-item dropdown-item-danger" onClick={() => { onLogout(); setShowDropdown(false); }}>
                    <LogOut size={16} />
                    Sign Out
                  </button>
                </div>
              )}
            </div>
          ) : (
            <button className="btn btn-primary" onClick={onOpenAuth}>
              Sign In
            </button>
          )}
        </div>
      )}
    </nav>
  );
};
