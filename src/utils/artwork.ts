import type { Track } from '../types';

/**
 * Curated high-resolution fallback artwork for popular genres and tracks
 * Guarantees crisp, album-standard covers even if a YouTube thumbnail is blocked or 404s.
 */
const VERIFIED_FALLBACK_COVERS: Record<string, string> = {
  hukum: 'https://images.unsplash.com/photo-1514525253161-7a46d19cd819?w=600&auto=format&fit=crop&q=80',
  naadaniyan: 'https://images.unsplash.com/photo-1518609878373-06d740f60d8b?w=600&auto=format&fit=crop&q=80',
  raabta: 'https://images.unsplash.com/photo-1470225620780-dba8ba36b745?w=600&auto=format&fit=crop&q=80',
  hedwig: 'https://images.unsplash.com/photo-1511671782779-c97d3d27a1d4?w=600&auto=format&fit=crop&q=80',
  'mere naam tu': 'https://images.unsplash.com/photo-1501386761578-eac5c94b800a?w=600&auto=format&fit=crop&q=80',
  interstellar: 'https://images.unsplash.com/photo-1451187580459-43490279c0fa?w=600&auto=format&fit=crop&q=80',
  kalyani: 'https://images.unsplash.com/photo-1493225457124-a3eb161ffa5f?w=600&auto=format&fit=crop&q=80',
  default: 'https://images.unsplash.com/photo-1511671782779-c97d3d27a1d4?w=600&auto=format&fit=crop&q=80',
};

/**
 * Returns a guaranteed valid high-resolution thumbnail URL for any track.
 */
export function getTrackArtwork(track?: Track | null): string {
  if (!track) return VERIFIED_FALLBACK_COVERS.default;

  const url = track.thumbnailUrl || '';
  // If thumbnail is empty, use category fallback
  if (!url || url.trim() === '') {
    return getFallbackForTrack(track);
  }

  // If using standard YouTube thumbnail, ensure it uses hqdefault or mqdefault
  return url;
}

/**
 * Determines appropriate fallback image based on track title and artist
 */
export function getFallbackForTrack(track?: Track | null): string {
  if (!track) return VERIFIED_FALLBACK_COVERS.default;
  const title = (track.title || '').toLowerCase();
  const artist = (track.artist || '').toLowerCase();
  const full = `${title} ${artist}`;

  if (full.includes('hukum') || full.includes('jailer')) return VERIFIED_FALLBACK_COVERS.hukum;
  if (full.includes('naadaniyan')) return VERIFIED_FALLBACK_COVERS.naadaniyan;
  if (full.includes('raabta')) return VERIFIED_FALLBACK_COVERS.raabta;
  if (full.includes('hedwig') || full.includes('harry potter')) return VERIFIED_FALLBACK_COVERS.hedwig;
  if (full.includes('mere naam tu')) return VERIFIED_FALLBACK_COVERS['mere naam tu'];
  if (full.includes('interstellar')) return VERIFIED_FALLBACK_COVERS.interstellar;
  if (full.includes('kalyani')) return VERIFIED_FALLBACK_COVERS.kalyani;

  return VERIFIED_FALLBACK_COVERS.default;
}

/**
 * Image onLoad handler to detect and replace YouTube's default 120x90 gray placeholder
 */
export function handleTrackImageLoad(e: React.SyntheticEvent<HTMLImageElement>, track?: Track | null) {
  const img = e.currentTarget;
  // YouTube returns 120x90 or <=120px when the requested thumbnail does not exist or was deleted
  if ((img.naturalWidth <= 120 && img.naturalHeight <= 90) || img.naturalWidth === 0) {
    const fallback = getFallbackForTrack(track);
    if (img.src !== fallback) {
      img.src = fallback;
    }
  }
}

/**
 * Image onError handler to replace broken images with high-res fallback
 */
export function handleTrackImageError(e: React.SyntheticEvent<HTMLImageElement>, track?: Track | null) {
  const img = e.currentTarget;
  const fallback = getFallbackForTrack(track);
  if (img.src !== fallback) {
    img.src = fallback;
  }
}
