import type { UnifiedTrack } from '../types';

// Noise cleaning regex list
const NOISE_PATTERNS = [
  /\(official\s+video\)/gi,
  /\[official\s+video\]/gi,
  /\(official\s+audio\)/gi,
  /\[official\s+audio\]/gi,
  /\(lyrics\)/gi,
  /\[lyrics\]/gi,
  /\(visualizer\)/gi,
  /\[visualizer\]/gi,
  /\bhd\b/gi,
  /\b4k\b/gi,
  /\b1080p\b/gi,
  /\(remastered\)/gi,
  /\[remastered\]/gi,
  /\bremastered\b/gi,
  /\bremaster\b/gi,
  /\blive\b/gi,
  /\(feat\..*?\)/gi,
  /\[feat\..*?\]/gi,
  /\bft\..*?\b/gi,
];

export class Deduplicator {
  
  // Normalizes text by removing noise tags, lowercase, and removing special characters
  normalizeText(text: string): string {
    let clean = text.toLowerCase();
    
    // Apply noise regex patterns
    NOISE_PATTERNS.forEach(pattern => {
      clean = clean.replace(pattern, '');
    });
    
    // Remove punctuation & extra whitespace
    return clean
      .replace(/[^\w\s]/gi, '')
      .replace(/\s+/g, ' ')
      .trim();
  }

  // Returns true if track A and B are duplicates
  isDuplicate(trackA: any, trackB: any): boolean {
    // 1. ISRC code match (highest priority, precise match)
    if (trackA.isrc && trackB.isrc && trackA.isrc === trackB.isrc) {
      return true;
    }

    // 2. Metadata Fuzzy Matching
    const normTitleA = this.normalizeText(trackA.title);
    const normTitleB = this.normalizeText(trackB.title);

    // If normalized titles match
    if (normTitleA === normTitleB) {
      const normArtistA = this.normalizeText(trackA.artist);
      const normArtistB = this.normalizeText(trackB.artist);

      // Check if artists share at least one keyword (e.g. "Bruno Mars" vs "Bruno Mars & Mark Ronson")
      const keywordsA = new Set(normArtistA.split(' '));
      const keywordsB = new Set(normArtistB.split(' '));
      const hasArtistOverlap = [...keywordsA].some(kw => keywordsB.has(kw) && kw.length > 2);

      if (hasArtistOverlap) {
        // Duration tolerance (+/- 15 seconds)
        const durationDiff = Math.abs(trackA.duration - trackB.duration);
        if (durationDiff <= 15) {
          return true;
        }
      }
    }

    return false;
  }

  // Consolidates a list of tracks from multiple providers, filtering duplicates
  deduplicate(tracks: any[]): UnifiedTrack[] {
    const deduplicated: UnifiedTrack[] = [];

    tracks.forEach((track) => {
      // Find existing match in our deduplicated catalog
      const matchIndex = deduplicated.findIndex((item) => this.isDuplicate(item, track));

      const sourceId = `${track.source.charAt(0)}${track.source.charAt(1)}:${track.id}`; // e.g. "sp:123", "yt:abc"

      if (matchIndex !== -1) {
        // Add current track's source identifier to the match's available sources
        const match = deduplicated[matchIndex];
        if (!match.availableSources.includes(sourceId)) {
          match.availableSources.push(sourceId);
        }
        // If current source has higher quality metadata (e.g. Spotify over YouTube), update matching track info
        if (track.source === 'spotify' && match.source !== 'spotify') {
          match.title = track.title;
          match.artist = track.artist;
          if (track.album) match.album = track.album;
          match.thumbnailUrl = track.thumbnailUrl;
          match.isrc = track.isrc || match.isrc;
        }
      } else {
        // Add new track to catalog
        deduplicated.push({
          id: sourceId,
          title: track.title,
          artist: track.artist,
          album: track.album,
          duration: track.duration,
          thumbnailUrl: track.thumbnailUrl,
          source: track.source,
          externalUrl: track.externalUrl,
          isrc: track.isrc,
          availableSources: [sourceId]
        });
      }
    });

    return deduplicated;
  }
}

export const deduplicator = new Deduplicator();
