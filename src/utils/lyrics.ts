import { useState, useEffect } from 'react';
import type { Track } from '../types';

export function useTrackLyrics(currentTrack: Track | null): string {
  const [lyrics, setLyrics] = useState<string>('');

  useEffect(() => {
    if (!currentTrack) {
      setLyrics('');
      return;
    }

    // If pre-seeded real lyrics exist AND contain valid synchronized LRC timestamps
    const hasSyncTimestamps = Boolean(currentTrack.lyrics && /\[\d{2}:\d{2}/.test(currentTrack.lyrics));
    if (hasSyncTimestamps && currentTrack.lyrics) {
      setLyrics(currentTrack.lyrics);
      return;
    }

    // Clean artist and title for LRCLIB search
    const cleanTitle = currentTrack.title
      .replace(/\s*[\(\[](?:Official|Music|Video|Audio|HD|4K|Lyrics|Remix|Cover|Visualizer|Lyric Video|MV)[\)\]]/gi, '')
      .replace(/\s*ft\.?.*$/i, '')
      .replace(/\s*feat\.?.*$/i, '')
      .replace(/\s*\|\s*.*$/i, '')
      .replace(/\s*-\s*.*$/i, '')
      .trim();

    const cleanArtist = currentTrack.artist
      .replace(/\s*-\s*Topic$/i, '')
      .replace(/\s*VEVO$/i, '')
      .replace(/\s*ft\.?.*$/i, '')
      .replace(/\s*feat\.?.*$/i, '')
      .trim();

    let isCancelled = false;
    const targetDuration = Math.round(currentTrack.duration || 0);

    async function fetchLyrics() {
      try {
        // Query LRCLIB search API with clean title and artist
        const query = encodeURIComponent(`${cleanTitle} ${cleanArtist}`);
        const res = await fetch(`https://lrclib.net/api/search?q=${query}`, {
          signal: AbortSignal.timeout(4500),
        });

        if (res.ok) {
          const results = await res.json();
          if (Array.isArray(results) && results.length > 0) {
            // Filter to results that possess true synchronized LRC lyrics
            const withSynced = results.filter((r: any) => Boolean(r.syncedLyrics && r.syncedLyrics.trim()));

            if (withSynced.length > 0) {
              // Rank by closest duration to audio track to ensure millisecond synchrony
              if (targetDuration > 30) {
                withSynced.sort((a, b) => {
                  const diffA = Math.abs((a.duration || targetDuration) - targetDuration);
                  const diffB = Math.abs((b.duration || targetDuration) - targetDuration);
                  return diffA - diffB;
                });
              }
              const bestSynced = withSynced[0].syncedLyrics;
              if (!isCancelled && bestSynced) {
                setLyrics(bestSynced);
                return;
              }
            } else if (results[0].plainLyrics) {
              if (!isCancelled) {
                setLyrics(results[0].plainLyrics);
                return;
              }
            }
          }
        }
      } catch (_) {}

      if (!isCancelled) {
        setLyrics(currentTrack?.lyrics || `[${currentTrack?.title} - ${currentTrack?.artist}]\n(Instrumental / No synced lyrics available)`);
      }
    }

    fetchLyrics();

    return () => {
      isCancelled = true;
    };
  }, [currentTrack]);

  return lyrics;
}

