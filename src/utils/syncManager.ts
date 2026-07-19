import type { UnifiedTrack, UnifiedPlaylist } from '../types';
import { db } from './db';
import { deduplicator } from './deduplicator';
import { playlistClassifier } from './classifier';


export interface UnifiedSyncResult {
  playlists: UnifiedPlaylist[];
  likedSongs: UnifiedTrack[];
}

export interface MusicProvider {
  name: 'youtube' | 'spotify' | 'applemusic';
  connect(): Promise<boolean>;
  disconnect(): Promise<void>;
  syncLibrary(): Promise<UnifiedSyncResult>;
  getPlaylists(): Promise<UnifiedPlaylist[]>;
  getLikedSongs(): Promise<UnifiedTrack[]>;
  search(query: string): Promise<UnifiedTrack[]>;
}

// -------------------------------------------------------------
// YouTube Data API Provider
// -------------------------------------------------------------
export class YouTubeProvider implements MusicProvider {
  name = 'youtube' as const;
  private categoryMusicId = '10';

  async connect(): Promise<boolean> {
    const token = localStorage.getItem('resonate_google_access_token');
    const expiry = localStorage.getItem('resonate_google_token_expiry');
    return !!token && !!expiry && Date.now() < Number(expiry);
  }

  async disconnect(): Promise<void> {
    localStorage.removeItem('resonate_google_access_token');
    localStorage.removeItem('resonate_google_token_expiry');
  }

  private isMusicMetadata(title: string, desc: string): boolean {
    const text = `${title} ${desc}`.toLowerCase();
    const excludeKeywords = ['tutorial', 'coding', 'programming', 'lecture', 'gaming', 'podcast', 'course', 'news'];
    const includeKeywords = ['music', 'song', 'lofi', 'beats', 'mix', 'remix', 'playlist', 'album', 'ost'];
    if (excludeKeywords.some(kw => text.includes(kw))) return false;
    return includeKeywords.some(kw => text.includes(kw));
  }

  async getPlaylists(): Promise<UnifiedPlaylist[]> {
    const token = localStorage.getItem('resonate_google_access_token');
    if (!token) throw new Error('Missing Google Auth Token');

    const url = `https://www.googleapis.com/youtube/v3/playlists?mine=true&part=snippet&maxResults=50`;

    try {
      const res = await fetch(url, {
        headers: { Authorization: `Bearer ${token}` }
      });

      if (!res.ok) {
        let errMsg = `HTTP Status: ${res.status}`;
        try {
          const errData = await res.json();
          errMsg = errData.error?.message || JSON.stringify(errData);
        } catch (_) {}

        console.log("Google returned: Error payload");
        console.error("YouTube Playlists Request Failed:", {
          url,
          status: res.status,
          error: errMsg
        });

        // Detect if API is disabled or not configured
        if (res.status === 403) {
          throw new Error(`YouTube API Configuration Error (HTTP 403): ${errMsg}. Please verify that the 'YouTube Data API v3' is enabled inside your Google Cloud Developer Console.`);
        }
        throw new Error(`YouTube API Playlists Fetch Failed: ${errMsg}`);
      }

      const data = await res.json();
      
      // If Google returns zero playlists, print response and throw warning
      if (!data.items || data.items.length === 0) {
        console.log("Google returned: Empty response list", data);
        console.log("YouTube Playlists Request Returned Empty Response:", {
          url,
          status: res.status,
          response: data
        });
        throw new Error("No YouTube playlists found in this account. Please verify that your account has playlists or that the YouTube Data API is active.");
      }

      // Logging details as requested
      console.log("Google returned:");
      console.log("Playlist count:", data.items.length);
      console.log("Playlist IDs:", data.items.map((i: any) => i.id));
      console.log("Total playlists returned by Google:", data.items.length);
      console.log("Playlist names:", data.items.map((i: any) => i.snippet?.title));
      console.log("Before filtering count:", data.items.length);
      
      const list: UnifiedPlaylist[] = [];
      let totalTracksImported = 0;
      let musicPlaylistsImported = 0;
      let playlistsSkipped = 0;
      const skippedPlaylistsSummary: { name: string; reason: string }[] = [];

      for (const item of data.items) {
        const title = item.snippet?.title || '';
        const desc = item.snippet?.description || '';
        const tracks = await this.getPlaylistTracks(item.id);
        
        // Query heuristic classifier
        const classification = await playlistClassifier.classify(item.id, title, desc, tracks);
        
        if (classification.isMusic) {
          musicPlaylistsImported++;
        } else {
          playlistsSkipped++;
          skippedPlaylistsSummary.push({ name: title, reason: classification.reason });
        }

        totalTracksImported += tracks.length;
        list.push({
          id: `yt-playlist-${item.id}`,
          name: title,
          description: desc,
          tracks,
          source: 'youtube',
          createdAt: item.snippet?.publishedAt || new Date().toISOString(),
          thumbnailUrl: item.snippet?.thumbnails?.medium?.url || item.snippet?.thumbnails?.default?.url,
          isMusic: classification.isMusic
        });
      }

      console.log("After filtering count:", list.length);
      console.log("YouTube Playlists Import Classification Complete:", {
        totalFetched: data.items.length,
        musicPlaylistsImported,
        playlistsSkipped,
        skippedSummary: skippedPlaylistsSummary
      });

      return list;
    } catch (e: any) {
      console.error('Error fetching YouTube playlists:', e);
      throw e;
    }
  }

  private async getPlaylistTracks(playlistId: string): Promise<UnifiedTrack[]> {
    const token = localStorage.getItem('resonate_google_access_token');
    if (!token) return [];
    const url = `https://www.googleapis.com/youtube/v3/playlistItems?playlistId=${playlistId}&part=snippet&maxResults=25`;

    try {
      const res = await fetch(url, {
        headers: { Authorization: `Bearer ${token}` }
      });

      if (!res.ok) {
        let errMsg = `HTTP Status: ${res.status}`;
        try {
          const errData = await res.json();
          errMsg = errData.error?.message || JSON.stringify(errData);
        } catch (_) {}
        console.error("YouTube PlaylistItems Request Failed:", { url, status: res.status, error: errMsg });
        throw new Error(`YouTube PlaylistItems API Error: ${errMsg}`);
      }

      const data = await res.json();
      const tracks = data.items ? data.items.map((item: any) => {
        const videoId = item.snippet?.resourceId?.videoId || '';
        return {
          id: videoId,
          title: item.snippet?.title || 'Unknown Title',
          artist: item.snippet?.videoOwnerChannelTitle || item.snippet?.channelTitle || 'Unknown Artist',
          duration: 240,
          thumbnailUrl: item.snippet?.thumbnails?.medium?.url || item.snippet?.thumbnails?.default?.url || `https://img.youtube.com/vi/${videoId}/0.jpg`,
          source: 'youtube',
          externalUrl: `https://www.youtube.com/watch?v=${videoId}`,
          availableSources: [`yo:${videoId}`]
        };
      }).filter((t: UnifiedTrack) => t.id !== '') : [];

      console.log("YouTube PlaylistItems Request Succeeded:", {
        url,
        playlistId,
        status: res.status,
        tracksImported: tracks.length
      });

      return tracks;
    } catch (e: any) {
      console.error(`Error fetching playlistTracks for ${playlistId}:`, e);
      throw e;
    }
  }

  async getLikedSongs(): Promise<UnifiedTrack[]> {
    const token = localStorage.getItem('resonate_google_access_token');
    if (!token) return [];
    const url = `https://www.googleapis.com/youtube/v3/videos?myRating=like&part=snippet&maxResults=25`;

    try {
      const res = await fetch(url, {
        headers: { Authorization: `Bearer ${token}` }
      });

      if (!res.ok) {
        let errMsg = `HTTP Status: ${res.status}`;
        try {
          const errData = await res.json();
          errMsg = errData.error?.message || JSON.stringify(errData);
        } catch (_) {}
        console.error("YouTube LikedVideos Request Failed:", { url, status: res.status, error: errMsg });
        throw new Error(`YouTube LikedVideos API Error: ${errMsg}`);
      }

      const data = await res.json();
      const likes = data.items ? data.items.filter((video: any) => {
        return video.snippet?.categoryId === this.categoryMusicId || this.isMusicMetadata(video.snippet?.title, video.snippet?.description);
      }).map((video: any) => {
        const videoId = video.id;
        return {
          id: videoId,
          title: video.snippet?.title || 'Unknown Title',
          artist: video.snippet?.channelTitle || 'Unknown Artist',
          duration: 240,
          thumbnailUrl: video.snippet?.thumbnails?.medium?.url || video.snippet?.thumbnails?.default?.url || `https://img.youtube.com/vi/${videoId}/0.jpg`,
          source: 'youtube',
          externalUrl: `https://www.youtube.com/watch?v=${videoId}`,
          availableSources: [`yo:${videoId}`]
        };
      }) : [];

      console.log("YouTube LikedVideos Request Succeeded:", {
        url,
        status: res.status,
        likesImported: likes.length
      });

      return likes;
    } catch (e: any) {
      console.error('Error fetching YouTube Liked songs:', e);
      throw e;
    }
  }

  async search(query: string): Promise<UnifiedTrack[]> {
    const token = localStorage.getItem('resonate_google_access_token');
    if (!token) return [];
    try {
      const res = await fetch(`https://www.googleapis.com/youtube/v3/search?q=${encodeURIComponent(query)}&part=snippet&type=video&videoCategoryId=10&maxResults=10`, {
        headers: { Authorization: `Bearer ${token}` }
      });
      if (!res.ok) return [];
      const data = await res.json();
      if (!data.items) return [];

      return data.items.map((item: any) => {
        const videoId = item.id?.videoId || '';
        return {
          id: videoId,
          title: item.snippet?.title || 'Unknown Title',
          artist: item.snippet?.channelTitle || 'Unknown Artist',
          duration: 240,
          thumbnailUrl: item.snippet?.thumbnails?.medium?.url || item.snippet?.thumbnails?.default?.url || `https://img.youtube.com/vi/${videoId}/0.jpg`,
          source: 'youtube',
          externalUrl: `https://www.youtube.com/watch?v=${videoId}`,
          availableSources: [`yo:${videoId}`]
        };
      });
    } catch (e) {
      return [];
    }
  }

  async syncLibrary(): Promise<UnifiedSyncResult> {
    const playlists = await this.getPlaylists();
    const likedSongs = await this.getLikedSongs();
    console.log("Fetched playlists:", playlists.length);
    console.log(playlists);
    return { playlists, likedSongs };
  }
}

// -------------------------------------------------------------
// Spotify Provider (OAuth Web API)
// -------------------------------------------------------------
export class SpotifyProvider implements MusicProvider {
  name = 'spotify' as const;

  async connect(): Promise<boolean> {
    const token = localStorage.getItem('resonate_spotify_access_token');
    const expiry = localStorage.getItem('resonate_spotify_token_expiry');
    return !!token && !!expiry && Date.now() < Number(expiry);
  }

  async disconnect(): Promise<void> {
    localStorage.removeItem('resonate_spotify_access_token');
    localStorage.removeItem('resonate_spotify_token_expiry');
  }

  // Fetch helper handles token checking & API errors
  private async fetchSpotify(endpoint: string, options: RequestInit = {}): Promise<Response> {
    const token = localStorage.getItem('resonate_spotify_access_token');
    if (!token) throw new Error('Missing Spotify Auth Token');

    const headers = {
      ...options.headers,
      Authorization: `Bearer ${token}`
    };

    const res = await fetch(`https://api.spotify.com/v1/${endpoint}`, { ...options, headers });
    
    // Automatically throw for re-authentication prompting on expired credentials (401 status)
    if (res.status === 401) {
      localStorage.removeItem('resonate_spotify_access_token');
      localStorage.removeItem('resonate_spotify_token_expiry');
      throw new Error('Spotify Credentials expired. Please reconnect.');
    }
    return res;
  }

  async getPlaylists(): Promise<UnifiedPlaylist[]> {
    try {
      const res = await this.fetchSpotify('me/playlists?limit=50');
      if (!res.ok) return [];
      const data = await res.json();
      if (!data.items) return [];

      const list: UnifiedPlaylist[] = [];
      for (const item of data.items) {
        const tracks = await this.getPlaylistTracks(item.id);
        list.push({
          id: `sp-playlist-${item.id}`,
          name: item.name,
          description: item.description || 'Synced playlist from Spotify',
          tracks,
          source: 'spotify',
          createdAt: new Date().toISOString(),
          thumbnailUrl: item.images?.[0]?.url
        });
      }
      return list;
    } catch (e) {
      console.error(e);
      return [];
    }
  }

  private async getPlaylistTracks(playlistId: string): Promise<UnifiedTrack[]> {
    try {
      const res = await this.fetchSpotify(`playlists/${playlistId}/tracks?limit=30`);
      if (!res.ok) return [];
      const data = await res.json();
      if (!data.items) return [];

      return data.items.map((item: any) => {
        const track = item.track;
        if (!track) return null;
        return {
          id: track.id,
          title: track.name,
          artist: track.artists?.map((a: any) => a.name).join(', ') || 'Unknown Artist',
          album: track.album?.name,
          duration: Math.floor(track.duration_ms / 1000),
          thumbnailUrl: track.album?.images?.[0]?.url || '',
          source: 'spotify',
          externalUrl: track.external_urls?.spotify,
          isrc: track.external_ids?.isrc,
          availableSources: [`sp:${track.id}`]
        };
      }).filter(Boolean) as UnifiedTrack[];
    } catch (e) {
      return [];
    }
  }

  async getLikedSongs(): Promise<UnifiedTrack[]> {
    try {
      const res = await this.fetchSpotify('me/tracks?limit=50');
      if (!res.ok) return [];
      const data = await res.json();
      if (!data.items) return [];

      return data.items.map((item: any) => {
        const track = item.track;
        return {
          id: track.id,
          title: track.name,
          artist: track.artists?.map((a: any) => a.name).join(', ') || 'Unknown Artist',
          album: track.album?.name,
          duration: Math.floor(track.duration_ms / 1000),
          thumbnailUrl: track.album?.images?.[0]?.url || '',
          source: 'spotify',
          externalUrl: track.external_urls?.spotify,
          isrc: track.external_ids?.isrc,
          availableSources: [`sp:${track.id}`]
        };
      });
    } catch (e) {
      return [];
    }
  }

  async search(query: string): Promise<UnifiedTrack[]> {
    try {
      const res = await this.fetchSpotify(`search?q=${encodeURIComponent(query)}&type=track&limit=10`);
      if (!res.ok) return [];
      const data = await res.json();
      if (!data.tracks?.items) return [];

      return data.tracks.items.map((track: any) => ({
        id: track.id,
        title: track.name,
        artist: track.artists?.map((a: any) => a.name).join(', ') || 'Unknown Artist',
        album: track.album?.name,
        duration: Math.floor(track.duration_ms / 1000),
        thumbnailUrl: track.album?.images?.[0]?.url || '',
        source: 'spotify',
        externalUrl: track.external_urls?.spotify,
        isrc: track.external_ids?.isrc,
        availableSources: [`sp:${track.id}`]
      }));
    } catch (e) {
      return [];
    }
  }

  async syncLibrary(): Promise<UnifiedSyncResult> {
    const playlists = await this.getPlaylists();
    const likedSongs = await this.getLikedSongs();
    return { playlists, likedSongs };
  }
}

// -------------------------------------------------------------
// Apple Music Provider (MusicKit JS)
// -------------------------------------------------------------
export class AppleMusicProvider implements MusicProvider {
  name = 'applemusic' as const;

  async connect(): Promise<boolean> {
    const userToken = localStorage.getItem('resonate_apple_user_token');
    const devToken = localStorage.getItem('resonate_apple_developer_token');
    return !!userToken && !!devToken;
  }

  async disconnect(): Promise<void> {
    localStorage.removeItem('resonate_apple_user_token');
    localStorage.removeItem('resonate_apple_developer_token');
  }

  async getPlaylists(): Promise<UnifiedPlaylist[]> {
    // Falls back to premium mock data if no real MusicKit credentials are configured
    const isMock = !(await this.connect());
    if (isMock) {
      return [
        {
          id: 'am-playlist-mock1',
          name: 'My Apple Music Chill (Mock)',
          description: 'A mock synced playlist from Apple Music',
          tracks: [
            {
              id: 'am-track-mock1',
              title: 'Count Stars (Apple Version)',
              artist: 'OneRepublic',
              duration: 283,
              thumbnailUrl: 'https://img.youtube.com/vi/hT_nvWreIhg/0.jpg',
              source: 'applemusic',
              availableSources: ['am:track-mock1', 'yo:hT_nvWreIhg']
            }
          ],
          source: 'applemusic',
          createdAt: new Date().toISOString()
        }
      ];
    }
    // Apple Music SDK library logic would bind window.MusicKit here
    return [];
  }

  async getLikedSongs(): Promise<UnifiedTrack[]> {
    return [];
  }

  async search(_query: string): Promise<UnifiedTrack[]> {
    return [];
  }

  async syncLibrary(): Promise<UnifiedSyncResult> {
    const playlists = await this.getPlaylists();
    const likedSongs = await this.getLikedSongs();
    return { playlists, likedSongs };
  }
}

// -------------------------------------------------------------
// Central Registry & Sync Manager
// -------------------------------------------------------------
export class SyncManager {
  private providers: Record<string, MusicProvider> = {};
  public isSyncing = false;
  public progress = 0;
  public errors: string[] = [];
  private activeSyncPromise: Promise<{ playlists: UnifiedPlaylist[]; tracks: UnifiedTrack[] }> | null = null;

  constructor() {
    this.registerProvider(new YouTubeProvider());
    this.registerProvider(new SpotifyProvider());
    this.registerProvider(new AppleMusicProvider());
  }

  registerProvider(provider: MusicProvider) {
    this.providers[provider.name] = provider;
  }

  getProvider(name: string): MusicProvider | undefined {
    return this.providers[name];
  }

  async syncAllConnected(): Promise<{ playlists: UnifiedPlaylist[]; tracks: UnifiedTrack[] }> {
    if (this.activeSyncPromise) {
      console.log("Duplicate sync request ignored");
      return this.activeSyncPromise;
    }

    this.activeSyncPromise = this.executeSyncAll();
    
    try {
      const result = await this.activeSyncPromise;
      return result;
    } finally {
      this.activeSyncPromise = null;
    }
  }

  private async executeSyncAll(): Promise<{ playlists: UnifiedPlaylist[]; tracks: UnifiedTrack[] }> {
    console.log("Sync started");
    this.isSyncing = true;
    this.progress = 0;
    this.errors = [];

    const rawPlaylists: UnifiedPlaylist[] = [];
    const rawTracks: UnifiedTrack[] = [];
    const connectedProviders: string[] = [];

    try {
      const activeProviders = Object.values(this.providers);
      let stepCount = 0;

      for (const provider of activeProviders) {
        const isConnected = await provider.connect();
        if (isConnected) {
          connectedProviders.push(provider.name);
          try {
            this.progress = Math.floor((stepCount / activeProviders.length) * 100);
            console.log(`${provider.constructor.name}.syncLibrary() entered`);
            const results = await provider.syncLibrary();
            rawPlaylists.push(...results.playlists);
            rawTracks.push(...results.likedSongs);
            
            // Collect all tracks inside the playlists to cache them as well
            results.playlists.forEach(pl => {
              rawTracks.push(...pl.tracks);
            });
          } catch (err: any) {
            console.warn(`${provider.name} provider sync failed:`, err);
            this.errors.push(`${provider.name}: ${err.message || err}`);
          }
        }
        stepCount++;
      }

      this.progress = 70;

      // 1. Deduplicate Catalog
      const deduplicatedTracks = deduplicator.deduplicate(rawTracks);

      this.progress = 90;

      // 2. Cache in IndexedDB for offline support
      await db.clear('tracks');
      for (const track of deduplicatedTracks) {
        await db.put('tracks', track);
      }

      await db.clear('playlists');
      for (const pl of rawPlaylists) {
        // Map the playlist tracks to their deduplicated counterparts
        pl.tracks = pl.tracks.map(t => {
          const match = deduplicatedTracks.find(dt => dt.availableSources.some(s => s.endsWith(t.id)));
          return match || t;
        });
        await db.put('playlists', pl);
      }

      // Record Sync Status in localStorage
      localStorage.setItem('resonate_last_sync_time', Date.now().toString());
      localStorage.setItem('resonate_sync_status', this.errors.length > 0 ? 'warning' : 'success');

      this.progress = 100;
      console.log("Sync finished");
      return { playlists: rawPlaylists, tracks: deduplicatedTracks };
    } catch (error) {
      console.log("Sync cancelled due to error:", error);
      throw error;
    } finally {
      this.isSyncing = false;
    }
  }
}

export const syncManager = new SyncManager();
