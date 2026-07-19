import { db } from './db';
import type { UnifiedTrack } from '../types';

export interface ClassificationResult {
  id: string; // playlistId
  score: number;
  isMusic: boolean;
  reason: string;
  lastChecked: number;
}

const POSITIVE_KEYWORDS = [
  'music', 'song', 'songs', 'playlist', 'album', 'artist', 'soundtrack', 'ost', 'remix', 'mix', 
  'chill', 'lofi', 'edm', 'rock', 'pop', 'hip hop', 'jazz', 'classical', 'instrumental', 
  'karaoke', 'acoustic', 'live', 'rap', 'bollywood', 'tollywood', 'k-pop', 'j-pop', 
  'punjabi', 'tamil', 'hindi', 'bengali'
];

const NEGATIVE_KEYWORDS = [
  'coding', 'tutorial', 'lecture', 'course', 'class', 'programming', 'study', 'mathematics', 
  'gaming', 'minecraft', 'valorant', 'fortnite', 'podcast', 'interview', 'documentary', 
  'news', 'vlog', 'reaction', 'review'
];

export class PlaylistClassifier {
  
  // Scans metadata text and assigns scores
  private getMetadataScore(title: string, desc: string): { score: number; matchedPositive: string[]; matchedNegative: string[] } {
    const text = `${title} ${desc}`.toLowerCase();
    let score = 0;
    const matchedPositive: string[] = [];
    const matchedNegative: string[] = [];

    POSITIVE_KEYWORDS.forEach(kw => {
      if (text.includes(kw)) {
        score += 15;
        matchedPositive.push(kw);
      }
    });

    NEGATIVE_KEYWORDS.forEach(kw => {
      if (text.includes(kw)) {
        score -= 25;
        matchedNegative.push(kw);
      }
    });

    return { score, matchedPositive, matchedNegative };
  }

  // Classifies a playlist, queries YouTube videos API if necessary, caches result in IndexedDB
  async classify(playlistId: string, title: string, desc: string, sampleTracks: UnifiedTrack[]): Promise<ClassificationResult> {
    try {
      // 1. Check IndexedDB Cache first
      const cached: ClassificationResult | null = await db.get('playlist_classifications', playlistId);
      if (cached) {
        console.log(`Playlist: ${title}\nMusic Score: ${cached.score}\nDecision: ${cached.isMusic ? 'IMPORT' : 'SKIP'}\n[Cached Result]`);
        return cached;
      }
    } catch (e) {
      console.warn("Failed to read classification cache:", e);
    }

    // 2. Perform Metadata Scoring
    const meta = this.getMetadataScore(title, desc);
    let finalScore = meta.score;
    let categoryScore = 0;
    let artistScore = 0;
    const reasons: string[] = [];

    if (meta.matchedPositive.length > 0) {
      reasons.push(`Matched positive terms: [${meta.matchedPositive.join(', ')}]`);
    }
    if (meta.matchedNegative.length > 0) {
      reasons.push(`Matched negative terms: [${meta.matchedNegative.join(', ')}]`);
    }

    // 3. Sample Videos for Category and Channel details
    if (sampleTracks && sampleTracks.length > 0) {
      const token = localStorage.getItem('resonate_google_access_token');
      const videoIds = sampleTracks.map(t => t.id).slice(0, 4);

      if (token && videoIds.length > 0) {
        try {
          const res = await fetch(`https://www.googleapis.com/youtube/v3/videos?id=${videoIds.join(',')}&part=snippet`, {
            headers: { Authorization: `Bearer ${token}` }
          });

          if (res.ok) {
            const data = await res.json();
            if (data.items && data.items.length > 0) {
              let musicVideos = 0;
              let nonMusicVideos = 0;

              data.items.forEach((video: any) => {
                const categoryId = video.snippet?.categoryId;
                const channelTitle = video.snippet?.channelTitle || '';

                // Category ID 10 is Music
                if (categoryId === '10') {
                  musicVideos++;
                  categoryScore += 25;
                } else if (['20', '27'].includes(categoryId)) { // 20: Gaming, 27: Education
                  nonMusicVideos++;
                  categoryScore -= 30;
                }

                // Channel/Artist check
                const cleanChannel = channelTitle.toLowerCase();
                if (cleanChannel.includes('vevo') || cleanChannel.includes('- topic') || cleanChannel.includes('official artist')) {
                  artistScore += 20;
                }
              });

              reasons.push(`Sampled ${data.items.length} videos: ${musicVideos} music categories, ${nonMusicVideos} non-music categories.`);
            }
          }
        } catch (e) {
          console.warn("Failed to query video categories during classification:", e);
        }
      }
    }

    finalScore += categoryScore + artistScore;
    const isMusic = finalScore >= 50;
    const decisionReason = reasons.join('; ') || 'Default metadata checks';

    const result: ClassificationResult = {
      id: playlistId,
      score: finalScore,
      isMusic,
      reason: decisionReason,
      lastChecked: Date.now()
    };

    // Log the decision as requested
    console.log(`Playlist: ${title}\nMusic Score: ${finalScore}\nDecision: ${isMusic ? 'IMPORT' : 'SKIP'}\nReason: ${decisionReason}`);

    // Cache the result
    try {
      await db.put('playlist_classifications', result);
    } catch (e) {
      console.warn("Failed to write classification cache:", e);
    }

    return result;
  }
}

export const playlistClassifier = new PlaylistClassifier();
