import React, { useState, useEffect, useRef } from 'react';
import { Search, Music, Disc, LogOut, User as UserIcon } from 'lucide-react';
import type { Track } from '../types';
import { POPULAR_TRACKS } from '../utils/youtube';

interface NavbarProps {
  onSearch: (query: string) => void;
  setView: (view: string) => void;
  onPlayTrackImmediate: (track: Track) => void;
  user: { name: string; email: string; avatar?: string; isGoogle?: boolean } | null;
  onOpenAuth: () => void;
  onLogout: () => void;
}

export const Navbar: React.FC<NavbarProps> = ({
  onSearch,
  setView,
  onPlayTrackImmediate,
  user,
  onOpenAuth,
  onLogout,
}) => {
  const [query, setQuery] = useState('');
  const [showSuggestions, setShowSuggestions] = useState(false);
  const [suggestions, setSuggestions] = useState<Track[]>([]);
  const [showDropdown, setShowDropdown] = useState(false);
  const dropdownRef = useRef<HTMLDivElement>(null);
  const profileRef = useRef<HTMLDivElement>(null);

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

      <div className="nav-right" ref={profileRef}>
        {user ? (
          <div className="profile-dropdown-container">
            <div className="avatar" style={{ cursor: 'pointer' }} onClick={() => setShowDropdown(!showDropdown)}>
              {user.avatar || user.name.charAt(0).toUpperCase()}
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
    </nav>
  );
};
