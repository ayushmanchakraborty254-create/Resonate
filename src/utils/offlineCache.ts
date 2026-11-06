import { db } from './db';
import type { Track } from '../types';

const CACHE_NAME = 'resonate-audio-cache-v1';

/**
 * Metrolist-Style Automatic Offline Streaming Cache
 * Caches songs the user listens to so they can be replayed offline without downloading.
 */
export async function cacheTrackForOffline(track: Track): Promise<void> {
  if (!track || !track.id) return;
  try {
    // 1. Persist Track metadata to IndexedDB
    await db.put('tracks', {
      ...track,
      cachedAt: Date.now(),
      isOfflineAvailable: true,
    });

    // 2. Pre-cache Artwork into Browser CacheStorage
    if (typeof window !== 'undefined' && 'caches' in window && track.thumbnailUrl) {
      try {
        const cache = await caches.open(CACHE_NAME);
        const match = await cache.match(track.thumbnailUrl);
        if (!match) {
          const res = await fetch(track.thumbnailUrl, { mode: 'no-cors' });
          if (res) {
            await cache.put(track.thumbnailUrl, res);
          }
        }
      } catch (_) {}
    }

    if (typeof window !== 'undefined') {
      window.dispatchEvent(new CustomEvent('resonate-offline-cache-updated', { detail: track }));
    }
  } catch (err) {
    console.warn('[OfflineCache] Failed to cache track:', err);
  }
}

/**
 * Retrieves all tracks cached for offline listening
 */
export async function getCachedTracks(): Promise<Track[]> {
  try {
    const list: Track[] = await db.getAll('tracks');
    return Array.isArray(list) ? list.reverse() : [];
  } catch (err) {
    console.warn('[OfflineCache] Failed to fetch cached tracks:', err);
    return [];
  }
}

/**
 * Checks if a track is cached for offline listening
 */
export async function isTrackCached(trackId: string): Promise<boolean> {
  if (!trackId) return false;
  try {
    const item = await db.get('tracks', trackId);
    return Boolean(item);
  } catch {
    return false;
  }
}

/**
 * Removes a track from offline cache
 */
export async function removeCachedTrack(trackId: string): Promise<void> {
  if (!trackId) return;
  try {
    await db.delete('tracks', trackId);
    if (typeof window !== 'undefined') {
      window.dispatchEvent(new CustomEvent('resonate-offline-cache-updated', { detail: { id: trackId } }));
    }
  } catch (err) {
    console.warn('[OfflineCache] Failed to remove cached track:', err);
  }
}

export interface HistoryEntry extends Track {
  playedAt: number;
}

/**
 * Records listening history and stats, and automatically caches the track (Metrolist feature)
 */
export async function recordTrackListening(track: Track): Promise<void> {
  if (!track || !track.id) return;

  const now = Date.now();
  const entry: HistoryEntry = {
    ...track,
    playedAt: now,
  };

  // 1. Update localStorage History (instant sync across tabs & components)
  try {
    const raw = localStorage.getItem('resonate_history');
    let history: HistoryEntry[] = raw ? JSON.parse(raw) : [];
    // Filter out previous entry if within 15 seconds to avoid duplicate spam
    history = history.filter((h) => !(h.id === track.id && now - h.playedAt < 15000));
    // Prepend latest play
    history.unshift(entry);
    // Limit to 150 recent tracks
    history = history.slice(0, 150);
    localStorage.setItem('resonate_history', JSON.stringify(history));

    window.dispatchEvent(new CustomEvent('resonate-history-updated', { detail: history }));
  } catch (_) {}

  // 2. Persist to IndexedDB history & metrics
  try {
    await db.put('history', {
      trackId: track.id,
      timestamp: now,
      duration: track.duration || 180,
      title: track.title,
      artist: track.artist,
      thumbnailUrl: track.thumbnailUrl,
    });

    const existingMetric = await db.get('metrics', track.id);
    const playCount = (existingMetric?.playCount || 0) + 1;
    const totalListeningTime = (existingMetric?.totalListeningTime || 0) + (track.duration || 180);

    await db.put('metrics', {
      id: track.id,
      playCount,
      totalListeningTime,
      lastPlayed: now,
    });
  } catch (_) {}

  // 3. Auto-cache for Metrolist offline streaming
  await cacheTrackForOffline(track);
}

