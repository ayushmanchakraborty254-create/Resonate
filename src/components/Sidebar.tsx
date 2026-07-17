import React from 'react';
import { Home, Compass, Library, Plus, ListMusic } from 'lucide-react';
import type { Playlist } from '../types';

interface SidebarProps {
  currentView: string;
  setView: (view: string) => void;
  playlists: Playlist[];
  onCreatePlaylist: () => void;
  setSelectedPlaylistId: (id: string | null) => void;
}

export const Sidebar: React.FC<SidebarProps> = ({
  currentView,
  setView,
  playlists,
  onCreatePlaylist,
  setSelectedPlaylistId,
}) => {
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

      <div className="sidebar-header">Playlists</div>

      <div className="sidebar-item" onClick={onCreatePlaylist}>
        <Plus size={20} />
        <span>New Playlist</span>
      </div>

      {playlists.map((playlist) => (
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
    </aside>
  );
};
