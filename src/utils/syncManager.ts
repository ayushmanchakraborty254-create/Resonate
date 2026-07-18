
export interface SyncedTrack {
  id: string;
  title: string;
  artist: string;
  duration: number;
  thumbnailUrl: string;
  youtubeUrl: string;
}

export interface SyncedPlaylist {
  id: string;
  name: string;
  description?: string;
  tracks: SyncedTrack[];
  createdAt: string;
}

export interface MusicProvider {
  name: string;
  fetchPlaylists(accessToken: string): Promise<SyncedPlaylist[]>;
  fetchLikedSongs(accessToken: string): Promise<SyncedTrack[]>;
}

// Category ID 10 is designated for "Music" on YouTube
const YOUTUBE_MUSIC_CATEGORY_ID = "10";

// Keyword lists for basic classification filtering
const MUSIC_KEYWORDS = [
  'music', 'song', 'songs', 'album', 'lofi', 'beats', 'beat', 'rap', 'pop', 
  'playlist', 'karaoke', 'jazz', 'rock', 'synthwave', 'chill', 'gym', 'workout',
  'instrumental', 'soundtrack', 'ost', 'mix', 'remix', 'concert', 'live', 'covers'
];

const NON_MUSIC_KEYWORDS = [
  'tutorial', 'coding', 'programming', 'lecture', 'gaming', 'walkthrough', 
  'gameplay', 'podcast', 'movie', 'episode', 'course', 'shorts', 'news', 
  'education', 'react', 'javascript', 'learn', 'how to', 'review'
];

export class YouTubeProvider implements MusicProvider {
  name = "YouTube";

  // Checks if a playlist title/desc is music-related
  private isMusicMetadata(title: string, desc: string): boolean {
    const text = `${title} ${desc}`.toLowerCase();
    
    // Check strong exclusions first
    const hasExcludeKeyword = NON_MUSIC_KEYWORDS.some(kw => text.includes(kw));
    if (hasExcludeKeyword) return false;

    // Check positive matches
    return MUSIC_KEYWORDS.some(kw => text.includes(kw));
  }

  // Verifies if the videos inside a playlist belong to category 10 (Music)
  private async verifyPlaylistIsMusic(playlistId: string, accessToken: string): Promise<boolean> {
    try {
      // 1. Fetch first 10 items from the playlist
      const response = await fetch(
        `https://www.googleapis.com/youtube/v3/playlistItems?playlistId=${playlistId}&part=snippet&maxResults=10`,
        {
          headers: { Authorization: `Bearer ${accessToken}` }
        }
      );
      if (!response.ok) return false;

      const data = await response.json();
      if (!data.items || data.items.length === 0) return false;

      const videoIds = data.items.map((item: any) => item.snippet?.resourceId?.videoId).filter(Boolean);
      if (videoIds.length === 0) return false;

      // 2. Fetch video details to verify categoryId
      const videoResponse = await fetch(
        `https://www.googleapis.com/youtube/v3/videos?id=${videoIds.join(',')}&part=snippet`,
        {
          headers: { Authorization: `Bearer ${accessToken}` }
        }
      );
      if (!videoResponse.ok) return false;

      const videoData = await videoResponse.json();
      if (!videoData.items) return false;

      // Check if any of the videos are categorized under Category 10 (Music)
      const musicVideosCount = videoData.items.filter(
        (video: any) => video.snippet?.categoryId === YOUTUBE_MUSIC_CATEGORY_ID
      ).length;

      // If at least 40% of the videos are categorized as music, classify it as music
      return (musicVideosCount / videoIds.length) >= 0.4;
    } catch (error) {
      console.warn(`Error verifying playlist ${playlistId} content:`, error);
      return false;
    }
  }

  // Fetch playlist tracks from YouTube
  private async fetchPlaylistTracks(playlistId: string, accessToken: string): Promise<SyncedTrack[]> {
    try {
      const response = await fetch(
        `https://www.googleapis.com/youtube/v3/playlistItems?playlistId=${playlistId}&part=snippet&maxResults=30`,
        {
          headers: { Authorization: `Bearer ${accessToken}` }
        }
      );
      if (!response.ok) return [];

      const data = await response.json();
      if (!data.items) return [];

      return data.items.map((item: any) => {
        const snippet = item.snippet;
        const videoId = snippet?.resourceId?.videoId;
        return {
          id: videoId || '',
          title: snippet?.title || 'Unknown Title',
          artist: snippet?.videoOwnerChannelTitle || snippet?.channelTitle || 'Unknown Artist',
          duration: 240, // YouTube Data API v3 does not return durations in snippet; default to standard 4 mins
          thumbnailUrl: snippet?.thumbnails?.medium?.url || snippet?.thumbnails?.default?.url || `https://img.youtube.com/vi/${videoId}/0.jpg`,
          youtubeUrl: `https://www.youtube.com/watch?v=${videoId}`,
        };
      }).filter((t: SyncedTrack) => t.id !== '');
    } catch (e) {
      console.error(`Error fetching tracks for playlist ${playlistId}:`, e);
      return [];
    }
  }

  // Fetch User's playlists from YouTube
  async fetchPlaylists(accessToken: string): Promise<SyncedPlaylist[]> {
    try {
      const response = await fetch(
        `https://www.googleapis.com/youtube/v3/playlists?mine=true&part=snippet,contentDetails&maxResults=50`,
        {
          headers: { Authorization: `Bearer ${accessToken}` }
        }
      );

      if (!response.ok) {
        throw new Error(`YouTube API returned status: ${response.status}`);
      }

      const data = await response.json();
      if (!data.items) return [];

      const musicPlaylists: SyncedPlaylist[] = [];

      for (const item of data.items) {
        const snippet = item.snippet;
        const playlistId = item.id;
        const title = snippet?.title || '';
        const desc = snippet?.description || '';

        // Match metadata keywords or verify through video category analysis
        const isMusicMeta = this.isMusicMetadata(title, desc);
        const isMusicContent = isMusicMeta || (await this.verifyPlaylistIsMusic(playlistId, accessToken));

        if (isMusicContent) {
          // Fetch the tracks for this playlist
          const tracks = await this.fetchPlaylistTracks(playlistId, accessToken);
          if (tracks.length > 0) {
            musicPlaylists.push({
              id: `yt-sync-${playlistId}`, // sync identifier
              name: title,
              description: desc || 'Synced playlist from YouTube',
              tracks,
              createdAt: snippet?.publishedAt || new Date().toISOString(),
            });
          }
        }
      }

      return musicPlaylists;
    } catch (error) {
      console.error('Error fetching YouTube playlists:', error);
      throw error;
    }
  }

  // Fetch User's Liked videos (filtering for Category 10 / Music)
  async fetchLikedSongs(accessToken: string): Promise<SyncedTrack[]> {
    try {
      const response = await fetch(
        `https://www.googleapis.com/youtube/v3/videos?myRating=like&part=snippet&maxResults=50`,
        {
          headers: { Authorization: `Bearer ${accessToken}` }
        }
      );

      if (!response.ok) {
        throw new Error(`YouTube Liked videos returned status: ${response.status}`);
      }

      const data = await response.json();
      if (!data.items) return [];

      // Filter liked videos for Music Category ID (10) or metadata keywords
      const musicLikes = data.items.filter((video: any) => {
        const categoryId = video.snippet?.categoryId;
        if (categoryId === YOUTUBE_MUSIC_CATEGORY_ID) return true;

        const title = video.snippet?.title || '';
        const desc = video.snippet?.description || '';
        return this.isMusicMetadata(title, desc);
      });

      return musicLikes.map((video: any) => {
        const snippet = video.snippet;
        const videoId = video.id;
        return {
          id: videoId || '',
          title: snippet?.title || 'Unknown Title',
          artist: snippet?.channelTitle || 'Unknown Artist',
          duration: 240,
          thumbnailUrl: snippet?.thumbnails?.medium?.url || snippet?.thumbnails?.default?.url || `https://img.youtube.com/vi/${videoId}/0.jpg`,
          youtubeUrl: `https://www.youtube.com/watch?v=${videoId}`,
        };
      });
    } catch (error) {
      console.error('Error fetching YouTube Liked songs:', error);
      return [];
    }
  }
}
