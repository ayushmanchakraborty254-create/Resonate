import React from 'react';
import { Home, Compass, Library, Plus, ListMusic, Heart, RefreshCw } from 'lucide-react';
import type { Playlist } from '../types';

interface SidebarProps {
  currentView: string;
  setView: (view: string) => void;
  playlists: Playlist[];
  onCreatePlaylist: () => void;
  setSelectedPlaylistId: (id: string | null) => void;
  user: { name: string; email: string; avatar?: string; isGoogle?: boolean } | null;
  onSyncPlaylists: () => void;
}

export const Sidebar: React.FC<SidebarProps> = ({
  currentView,
  setView,
  playlists,
  onCreatePlaylist,
  setSelectedPlaylistId,
  user,
  onSyncPlaylists,
}) => {
  const customPlaylists = playlists.filter((p) => !p.id.startsWith('yt-sync-'));
  const syncedPlaylists = playlists.filter((p) => p.id.startsWith('yt-sync-'));

  return (
    <aside className="sidebar">
      <div
        className={`sidebar-item ${currentView === 'home' ? 'active' : ''}`}
        onClick={() => setView('home')}
      >
        <Home size={20} />
        <span>Home</span>
      </div>

      <div
        className={`sidebar-item ${currentView === 'explore' ? 'active' : ''}`}
        onClick={() => setView('explore')}
      >
        <Compass size={20} />
        <span>Explore</span>
      </div>

      <div
        className={`sidebar-item ${currentView === 'library' ? 'active' : ''}`}
        onClick={() => setView('library')}
      >
        <Library size={20} />
        <span>Library</span>
      </div>

      <div className="sidebar-divider" />

      {/* Playlists Section Header */}
      <div className="sidebar-header sync-section-header">
        <span>Playlists</span>
        {user?.isGoogle && (
          <button className="sync-btn" onClick={onSyncPlaylists} title="Sync Playlists from Google/YouTube">
            <RefreshCw size={14} />
          </button>
        )}
      </div>

      {/* Permanent Favourites Section */}
      <div
        className={`sidebar-item ${currentView === 'favourites' ? 'active' : ''}`}
        onClick={() => setView('favourites')}
      >
        <Heart size={20} fill={currentView === 'favourites' ? 'var(--yt-accent)' : 'none'} style={{ color: 'var(--yt-accent)' }} />
        <span>Favourites</span>
      </div>

      <div className="sidebar-item" onClick={onCreatePlaylist}>
        <Plus size={20} />
        <span>New Playlist</span>
      </div>

      {/* Custom Playlists */}
      {customPlaylists.map((playlist) => (
        <div
          key={playlist.id}
          className={`sidebar-item ${
            currentView === 'playlist' && playlist.id === playlist.id ? '' : ''
          }`}
          onClick={() => {
            setSelectedPlaylistId(playlist.id);
            setView('playlist');
          }}
        >
          <ListMusic size={20} />
          <span style={{ textOverflow: 'ellipsis', overflow: 'hidden', whiteSpace: 'nowrap' }}>
            {playlist.name}
          </span>
        </div>
      ))}

      {/* Synced Playlists Section */}
      {syncedPlaylists.length > 0 && (
        <>
          <div className="sidebar-divider" />
          <div className="sidebar-header">YouTube Synced</div>
          {syncedPlaylists.map((playlist) => (
            <div
              key={playlist.id}
              className="sidebar-item"
              onClick={() => {
                setSelectedPlaylistId(playlist.id);
                setView('playlist');
              }}
            >
              <ListMusic size={20} style={{ color: '#ff0000' }} />
              <span style={{ textOverflow: 'ellipsis', overflow: 'hidden', whiteSpace: 'nowrap' }}>
                {playlist.name}
              </span>
            </div>
          ))}
        </>
      )}
    </aside>
  );
};
