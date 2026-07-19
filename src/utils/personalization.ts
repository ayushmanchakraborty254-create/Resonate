import { db } from './db';
import type { UnifiedTrack, UnifiedPlaylist } from '../types';

export interface PlayMetric {
  id: string; // trackId
  playCount: number;
  skipCount: number;
  repeatCount: number;
  totalListeningTime: number; // in seconds
  completionPercentage: number; // max percentage reached (0-100)
  lastPlayed: number; // timestamp
  listeningHour: number[]; // hours of day played (0-23)
  weekday: number[]; // days of week played (0-6)
  partiallyPlayedPosition?: number; // seek position in seconds
}

export class PersonalizationEngine {
  
  // Track starts playing
  async trackPlayStart(trackId: string) {
    try {
      const metric: PlayMetric = (await db.get('metrics', trackId)) || {
        id: trackId,
        playCount: 0,
        skipCount: 0,
        repeatCount: 0,
        totalListeningTime: 0,
        completionPercentage: 0,
        lastPlayed: 0,
        listeningHour: [],
        weekday: []
      };

      const now = new Date();
      metric.lastPlayed = now.getTime();
      metric.listeningHour.push(now.getHours());
      metric.weekday.push(now.getDay());

      await db.put('metrics', metric);
    } catch (e) {
      console.warn('Failed to log play start:', e);
    }
  }

  // Track finished playing or was paused (saves position/listening stats)
  async trackPlaySession(trackId: string, durationPlayed: number, totalDuration: number, isCompleted: boolean) {
    try {
      const metric: PlayMetric = (await db.get('metrics', trackId)) || {
        id: trackId,
        playCount: 0,
        skipCount: 0,
        repeatCount: 0,
        totalListeningTime: 0,
        completionPercentage: 0,
        lastPlayed: Date.now(),
        listeningHour: [new Date().getHours()],
        weekday: [new Date().getDay()]
      };

      metric.totalListeningTime += durationPlayed;
      const percentage = Math.min(100, Math.floor((durationPlayed / totalDuration) * 100));
      metric.completionPercentage = Math.max(metric.completionPercentage, percentage);

      if (isCompleted || percentage > 85) {
        metric.playCount += 1;
        delete metric.partiallyPlayedPosition; // cleared if completed
      } else if (durationPlayed < 15) {
        metric.skipCount += 1;
      } else {
        metric.partiallyPlayedPosition = durationPlayed; // save pause seek position
      }

      await db.put('metrics', metric);
      
      // Log event in general history
      await db.put('history', {
        trackId,
        timestamp: Date.now(),
        duration: durationPlayed
      });
    } catch (e) {
      console.warn('Failed to log play session:', e);
    }
  }

  // Get Daily Mix
  async generateDailyMix(allTracks: UnifiedTrack[]): Promise<UnifiedPlaylist> {
    const metrics: PlayMetric[] = await db.getAll('metrics');
    // Sort by play count descending
    const topTracks = metrics
      .filter(m => m.playCount > 0)
      .sort((a, b) => b.playCount - a.playCount)
      .slice(0, 15);

    const mixTracks: UnifiedTrack[] = [];
    topTracks.forEach(metric => {
      const track = allTracks.find(t => t.id === metric.id);
      if (track) mixTracks.push(track);
    });

    // Fallback if not enough listening history
    if (mixTracks.length < 5) {
      const fallbacks = allTracks.slice(0, 10);
      fallbacks.forEach(t => {
        if (!mixTracks.some(mt => mt.id === t.id)) {
          mixTracks.push(t);
        }
      });
    }

    return {
      id: 'resonate-mix-daily',
      name: 'Daily Mix',
      description: 'Your top played and personal favorites combined.',
      tracks: mixTracks,
      source: 'unified',
      createdAt: new Date().toISOString()
    };
  }

  // Get Continue Listening list (partially played or recently played)
  async generateContinueListening(allTracks: UnifiedTrack[]): Promise<UnifiedTrack[]> {
    const metrics: PlayMetric[] = await db.getAll('metrics');
    
    // Find tracks with saved seek position or played in last 24 hours
    const candidateMetrics = metrics
      .filter(m => m.partiallyPlayedPosition !== undefined || (Date.now() - m.lastPlayed) < 24 * 60 * 60 * 1000)
      .sort((a, b) => b.lastPlayed - a.lastPlayed)
      .slice(0, 10);

    const list: UnifiedTrack[] = [];
    candidateMetrics.forEach(m => {
      const track = allTracks.find(t => t.id === m.id);
      if (track) {
        // Carry seek info over
        list.push({
          ...track,
          album: m.partiallyPlayedPosition ? `Paused at ${Math.floor(m.partiallyPlayedPosition)}s` : track.album
        });
      }
    });

    return list;
  }

  // Get Mood Playlists (Chill, Energy, Focus)
  async generateMoodPlaylists(allTracks: UnifiedTrack[]): Promise<UnifiedPlaylist[]> {
    const chillTracks: UnifiedTrack[] = [];
    const energyTracks: UnifiedTrack[] = [];
    const focusTracks: UnifiedTrack[] = [];

    const chillKeywords = ['chill', 'lofi', 'relax', 'calm', 'sleep', 'acoustic', 'jazz', 'night'];
    const energyKeywords = ['workout', 'energy', 'gym', 'run', 'power', 'rock', 'dance', 'trap', 'club'];
    const focusKeywords = ['study', 'focus', 'ambient', 'classical', 'piano', 'concentration', 'work'];

    allTracks.forEach(track => {
      const text = `${track.title} ${track.album || ''}`.toLowerCase();
      if (chillKeywords.some(kw => text.includes(kw))) {
        chillTracks.push(track);
      } else if (energyKeywords.some(kw => text.includes(kw))) {
        energyTracks.push(track);
      } else if (focusKeywords.some(kw => text.includes(kw))) {
        focusTracks.push(track);
      }
    });

    return [
      {
        id: 'resonate-mix-chill',
        name: 'Chill & Relax Mix',
        description: 'Mellow vibes for your down time.',
        tracks: chillTracks.slice(0, 20),
        source: 'unified',
        createdAt: new Date().toISOString()
      },
      {
        id: 'resonate-mix-energy',
        name: 'Workout Energy Mix',
        description: 'High-tempo tracks to fuel your performance.',
        tracks: energyTracks.slice(0, 20),
        source: 'unified',
        createdAt: new Date().toISOString()
      },
      {
        id: 'resonate-mix-focus',
        name: 'Focus & Study Mix',
        description: 'Ambient, instrumental beats for deep work.',
        tracks: focusTracks.slice(0, 20),
        source: 'unified',
        createdAt: new Date().toISOString()
      }
    ];
  }
}

export const personalization = new PersonalizationEngine();
