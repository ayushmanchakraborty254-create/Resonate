import type { VercelRequest, VercelResponse } from '@vercel/node';

interface Track {
  id: string;
  title: string;
  artist: string;
  album: string;
  duration: number;
  thumbnailUrl: string;
  youtubeUrl: string;
  lyrics: string;
}

function parseInnerTubeTracks(data: any): Track[] {
  const tracks: Track[] = [];
  const visited = new Set<string>();

  function walk(node: any) {
    if (!node || typeof node !== 'object') return;
    if (node.musicResponsiveListItemRenderer) {
      const item = node.musicResponsiveListItemRenderer;
      const flexColumns = item.flexColumns || [];
      const titleRun = flexColumns[0]?.musicResponsiveListItemFlexColumnRenderer?.text?.runs?.[0];
      const title = titleRun?.text;
      const navEndpoint = titleRun?.navigationEndpoint || item.navigationEndpoint;
      const videoId = navEndpoint?.watchEndpoint?.videoId;
      const artistRuns = flexColumns[1]?.musicResponsiveListItemFlexColumnRenderer?.text?.runs || [];
      const artist = artistRuns.map((r: any) => r.text).join('') || 'YouTube Music';
      const thumbs = item.thumbnail?.musicThumbnailRenderer?.thumbnail?.thumbnails;
      const thumb = thumbs ? thumbs[thumbs.length - 1].url : (videoId ? `https://i.ytimg.com/vi/${videoId}/hqdefault.jpg` : '');

      if (videoId && title && !visited.has(videoId)) {
        visited.add(videoId);
        tracks.push({
          id: videoId,
          title,
          artist,
          album: 'YouTube Music',
          duration: 210,
          thumbnailUrl: thumb,
          youtubeUrl: `https://www.youtube.com/watch?v=${videoId}`,
          lyrics: `[Enjoy listening to ${title} on Resonate!]`
        });
      }
    }
    if (Array.isArray(node)) {
      for (const it of node) walk(it);
    } else {
      for (const key of Object.keys(node)) {
        walk(node[key]);
      }
    }
  }

  walk(data);
  return tracks;
}

function extractVideosFromHtml(html: string): Track[] {
  const tracks: Track[] = [];
  const startIdx = html.indexOf('ytInitialData');
  if (startIdx === -1) return tracks;

  const firstBrace = html.indexOf('{', startIdx);
  if (firstBrace === -1) return tracks;

  let depth = 0;
  let endIdx = -1;
  let inString = false;
  let escape = false;

  for (let i = firstBrace; i < html.length; i++) {
    const c = html[i];
    if (escape) { escape = false; continue; }
    if (c === '\\') { escape = true; continue; }
    if (c === '"') { inString = !inString; continue; }
    if (!inString) {
      if (c === '{') depth++;
      else if (c === '}') {
        depth--;
        if (depth === 0) {
          endIdx = i + 1;
          break;
        }
      }
    }
  }

  if (endIdx === -1) return tracks;

  try {
    const data = JSON.parse(html.substring(firstBrace, endIdx));
    const visited = new Set<string>();

    function walk(node: any) {
      if (!node || typeof node !== 'object') return;
      if (node.videoRenderer && node.videoRenderer.videoId) {
        const vr = node.videoRenderer;
        if (!visited.has(vr.videoId)) {
          visited.add(vr.videoId);
          const title = vr.title?.runs?.[0]?.text || vr.headline?.simpleText || 'Untitled Song';
          const artist = vr.ownerText?.runs?.[0]?.text || vr.longBylineText?.runs?.[0]?.text || 'Artist';
          const durationText = vr.lengthText?.simpleText || '3:30';
          const parts = durationText.split(':').map(Number);
          const duration = parts.length === 2 ? parts[0] * 60 + parts[1] : parts.length === 3 ? parts[0] * 3600 + parts[1] * 60 + parts[2] : 210;
          const thumb = vr.thumbnail?.thumbnails?.slice(-1)[0]?.url || `https://i.ytimg.com/vi/${vr.videoId}/hqdefault.jpg`;
          tracks.push({
            id: vr.videoId,
            title,
            artist,
            album: 'YouTube Music',
            duration,
            thumbnailUrl: thumb,
            youtubeUrl: `https://www.youtube.com/watch?v=${vr.videoId}`,
            lyrics: `[Enjoy listening to ${title} on Resonate!]`
          });
        }
      }
      if (Array.isArray(node)) {
        for (const it of node) walk(it);
      } else {
        for (const k of Object.keys(node)) {
          if (k !== 'videoRenderer') walk(node[k]);
        }
      }
    }

    walk(data);
  } catch (_) {}

  return tracks;
}

export default async function handler(req: VercelRequest, res: VercelResponse) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization');

  if (req.method === 'OPTIONS') {
    return res.status(200).end();
  }

  const query = ((req.query.q as string) || '').trim();
  if (!query) {
    return res.status(200).json([]);
  }

  // 1. Try YouTube Music InnerTube API (High quality official music metadata)
  try {
    const innerTubeRes = await fetch('https://music.youtube.com/youtubei/v1/search', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/122.0.0.0 Safari/537.36',
        'Origin': 'https://music.youtube.com',
        'Referer': 'https://music.youtube.com/',
      },
      body: JSON.stringify({
        context: {
          client: {
            clientName: 'WEB_REMIX',
            clientVersion: '1.20240318.01.00',
            hl: 'en',
            gl: 'US'
          }
        },
        query
      }),
      signal: AbortSignal.timeout(5000)
    });

    if (innerTubeRes.ok) {
      const itData = await innerTubeRes.json();
      const tracks = parseInnerTubeTracks(itData);
      if (tracks.length > 0) {
        return res.status(200).json(tracks.slice(0, 30));
      }
    }
  } catch (_) {}

  // 2. Fallback to YouTube Search HTML with exact brace matching
  try {
    const ytUrl = `https://www.youtube.com/results?search_query=${encodeURIComponent(query)}`;
    const response = await fetch(ytUrl, {
      headers: {
        'User-Agent':
          'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/122.0.0.0 Safari/537.36',
        'Accept-Language': 'en-US,en;q=0.9',
      },
      signal: AbortSignal.timeout(6000)
    });

    if (response.ok) {
      const html = await response.text();
      const tracks = extractVideosFromHtml(html);
      if (tracks.length > 0) {
        return res.status(200).json(tracks.slice(0, 30));
      }
    }
  } catch (_) {}

  return res.status(200).json([]);
}
