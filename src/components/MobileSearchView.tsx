import React, { useState, useEffect, useRef } from 'react';
import { ArrowLeft, Search, Clock, X, ArrowUpRight, Globe, Mic } from 'lucide-react';
import type { Track } from '../types';
import { searchYouTube, getSearchSuggestions } from '../utils/youtube';

interface MobileSearchViewProps {
  onBack: () => void;
  onPlayTrackImmediate: (track: Track) => void;
  onOpenRecognizer?: () => void;
}

const DEFAULT_RECENT_SEARCHES = [
  "hedwig's theme piano",
  "hedwig's theme",
  "golden hour on piano",
  "golden hour",
  "tout donner guitar remix slowed",
  "haaland song",
  "carol of the bells keyboard",
  "saiyara song",
  "sad song"
];

export const MobileSearchView: React.FC<MobileSearchViewProps> = ({
  onBack,
  onPlayTrackImmediate,
  onOpenRecognizer,
}) => {
  const [query, setQuery] = useState('');
  const [recentSearches, setRecentSearches] = useState<string[]>(() => {
    try {
      const saved = localStorage.getItem('resonate_recent_searches');
      return saved ? JSON.parse(saved) : DEFAULT_RECENT_SEARCHES;
    } catch {
      return DEFAULT_RECENT_SEARCHES;
    }
  });
  const [suggestions, setSuggestions] = useState<string[]>([]);
  const [results, setResults] = useState<Track[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [hasSearched, setHasSearched] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);

  // Debounced suggestions as user types
  useEffect(() => {
    if (!query.trim()) {
      setSuggestions([]);
      return;
    }

    const timer = setTimeout(async () => {
      try {
        const sugg = await getSearchSuggestions(query);
        setSuggestions(sugg);
      } catch (_) {}
    }, 250);

    return () => clearTimeout(timer);
  }, [query]);

  const saveRecentSearch = (term: string) => {
    const trimmed = term.trim();
    if (!trimmed) return;
    const updated = [trimmed, ...recentSearches.filter((s) => s.toLowerCase() !== trimmed.toLowerCase())].slice(0, 15);
    setRecentSearches(updated);
    try {
      localStorage.setItem('resonate_recent_searches', JSON.stringify(updated));
    } catch (_) {}
  };

  const removeRecentSearch = (e: React.MouseEvent, term: string) => {
    e.stopPropagation();
    const updated = recentSearches.filter((s) => s !== term);
    setRecentSearches(updated);
    try {
      localStorage.setItem('resonate_recent_searches', JSON.stringify(updated));
    } catch (_) {}
  };

  const executeSearch = async (searchTerm: string) => {
    if (!searchTerm.trim()) return;
    setQuery(searchTerm);
    saveRecentSearch(searchTerm);
    setIsLoading(true);
    setHasSearched(true);
    try {
      const res = await searchYouTube(searchTerm);
      setResults(res);
    } catch (err) {
      console.warn('Search failed:', err);
    } finally {
      setIsLoading(false);
    }
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (query.trim()) {
      executeSearch(query);
    }
  };

  return (
    <div className="mobile-search-page" style={{ minHeight: '100%', background: '#0a0a0a', color: '#fff', paddingBottom: '140px' }}>
      {/* Top Search Bar (Reference: Image 3) */}
      <div
        style={{
          display: 'flex',
          alignItems: 'center',
          gap: '12px',
          padding: '12px 16px',
          borderBottom: '1px solid rgba(255, 255, 255, 0.08)',
          background: 'rgba(15, 15, 17, 0.95)',
          position: 'sticky',
          top: 0,
          zIndex: 40,
        }}
      >
        <button
          onClick={onBack}
          style={{
            background: 'none',
            border: 'none',
            color: '#fff',
            cursor: 'pointer',
            padding: '4px',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
          }}
        >
          <ArrowLeft size={22} />
        </button>

        <form onSubmit={handleSubmit} style={{ flex: 1, display: 'flex', alignItems: 'center' }}>
          <input
            ref={inputRef}
            type="text"
            placeholder="Search YouTube Music..."
            value={query}
            onChange={(e) => {
              setQuery(e.target.value);
              setHasSearched(false);
            }}
            style={{
              width: '100%',
              background: 'transparent',
              border: 'none',
              outline: 'none',
              color: '#fff',
              fontSize: '16px',
              fontFamily: 'inherit',
            }}
          />
        </form>

        {query ? (
          <button
            onClick={() => {
              setQuery('');
              setResults([]);
              setHasSearched(false);
              inputRef.current?.focus();
            }}
            style={{
              background: 'none',
              border: 'none',
              color: 'rgba(255, 255, 255, 0.6)',
              cursor: 'pointer',
              padding: '4px',
              display: 'flex',
              alignItems: 'center',
            }}
          >
            <X size={20} />
          </button>
        ) : (
          <button
            style={{
              background: 'none',
              border: 'none',
              color: 'rgba(255, 255, 255, 0.6)',
              cursor: 'pointer',
              padding: '4px',
              display: 'flex',
              alignItems: 'center',
            }}
          >
            <Globe size={20} />
          </button>
        )}
      </div>

      {/* When results are loaded */}
      {hasSearched ? (
        <div style={{ padding: '16px' }}>
          {isLoading ? (
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', height: '200px', color: 'rgba(255,255,255,0.5)' }}>
              Searching YouTube Music...
            </div>
          ) : results.length === 0 ? (
            <div style={{ padding: '32px 16px', textAlign: 'center', color: 'rgba(255,255,255,0.5)' }}>
              No results found for "{query}".
            </div>
          ) : (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
              {results.map((track) => (
                <div
                  key={track.id}
                  onClick={() => onPlayTrackImmediate(track)}
                  style={{
                    display: 'flex',
                    alignItems: 'center',
                    gap: '14px',
                    padding: '8px 10px',
                    borderRadius: '10px',
                    background: 'rgba(255, 255, 255, 0.02)',
                    cursor: 'pointer',
                  }}
                >
                  <img
                    src={track.thumbnailUrl}
                    alt={track.title}
                    style={{ width: '48px', height: '48px', borderRadius: '6px', objectFit: 'cover' }}
                    onError={(e) => {
                      (e.target as HTMLElement).style.display = 'none';
                    }}
                  />
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <div style={{ fontWeight: 600, fontSize: '15px', color: '#fff', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                      {track.title}
                    </div>
                    <div style={{ fontSize: '13px', color: 'rgba(255, 255, 255, 0.55)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                      {track.artist}
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      ) : query.trim() && suggestions.length > 0 ? (
        /* Autocomplete suggestions */
        <div style={{ padding: '8px 0' }}>
          {suggestions.map((sugg, idx) => (
            <div
              key={idx}
              onClick={() => executeSearch(sugg)}
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: '16px',
                padding: '14px 20px',
                cursor: 'pointer',
                borderBottom: '1px solid rgba(255, 255, 255, 0.03)',
              }}
            >
              <Search size={18} style={{ color: 'rgba(255, 255, 255, 0.45)' }} />
              <div style={{ flex: 1, fontSize: '15px', color: '#fff', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                {sugg}
              </div>
              <button
                onClick={(e) => {
                  e.stopPropagation();
                  setQuery(sugg);
                }}
                style={{
                  background: 'none',
                  border: 'none',
                  color: 'rgba(255, 255, 255, 0.45)',
                  cursor: 'pointer',
                  padding: '4px',
                }}
              >
                <ArrowUpRight size={18} />
              </button>
            </div>
          ))}
        </div>
      ) : (
        /* Recent Searches List (Exact Match to Reference Image 3) */
        <div style={{ padding: '8px 0' }}>
          {recentSearches.map((item, idx) => (
            <div
              key={idx}
              onClick={() => executeSearch(item)}
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: '16px',
                padding: '14px 20px',
                cursor: 'pointer',
                borderBottom: '1px solid rgba(255, 255, 255, 0.03)',
              }}
            >
              <Clock size={18} style={{ color: 'rgba(255, 255, 255, 0.45)' }} />
              <div
                style={{
                  flex: 1,
                  fontSize: '15px',
                  color: '#fff',
                  overflow: 'hidden',
                  textOverflow: 'ellipsis',
                  whiteSpace: 'nowrap',
                }}
              >
                {item}
              </div>
              <button
                onClick={(e) => removeRecentSearch(e, item)}
                style={{
                  background: 'none',
                  border: 'none',
                  color: 'rgba(255, 255, 255, 0.45)',
                  cursor: 'pointer',
                  padding: '4px',
                }}
              >
                <X size={18} />
              </button>
              <button
                onClick={(e) => {
                  e.stopPropagation();
                  setQuery(item);
                }}
                style={{
                  background: 'none',
                  border: 'none',
                  color: 'rgba(255, 255, 255, 0.45)',
                  cursor: 'pointer',
                  padding: '4px',
                }}
              >
                <ArrowUpRight size={18} />
              </button>
            </div>
          ))}
        </div>
      )}

      {/* Floating Action Button (Mic / Recognizer) */}
      <button
        onClick={onOpenRecognizer}
        style={{
          position: 'fixed',
          bottom: '145px',
          right: '20px',
          width: '52px',
          height: '52px',
          borderRadius: '16px',
          backgroundColor: '#3b5478',
          color: '#fff',
          border: 'none',
          boxShadow: '0 8px 24px rgba(0, 0, 0, 0.5)',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          cursor: 'pointer',
          zIndex: 60,
        }}
        title="Voice Search / Music Recognizer"
      >
        <Mic size={22} />
      </button>
    </div>
  );
};
