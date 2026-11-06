import { useState, useEffect } from 'react';
import type { Track } from '../types';

export function useTrackLyrics(currentTrack: Track | null): string {
  const [lyrics, setLyrics] = useState<string>('');

  useEffect(() => {
    if (!currentTrack) {
      setLyrics('');
      return;
    }

    // If pre-seeded real lyrics exist and are not placeholder text
    if (currentTrack.lyrics && !currentTrack.lyrics.includes('Enjoy listening to')) {
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

    async function fetchLyrics() {
      try {
        const query = encodeURIComponent(`${cleanTitle} ${cleanArtist}`);
        const res = await fetch(`https://lrclib.net/api/search?q=${query}`, {
          signal: AbortSignal.timeout(4000),
        });

        if (res.ok) {
          const results = await res.json();
          if (Array.isArray(results) && results.length > 0) {
            const best = results.find((r: any) => r.syncedLyrics) || results[0];
            const fetched = best.syncedLyrics || best.plainLyrics;
            if (!isCancelled && fetched) {
              setLyrics(fetched);
              return;
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

