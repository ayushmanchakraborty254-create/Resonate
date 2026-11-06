import type { VercelRequest, VercelResponse } from '@vercel/node';

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

  try {
    const ytUrl = `https://www.youtube.com/results?search_query=${encodeURIComponent(query)}`;
    const response = await fetch(ytUrl, {
      headers: {
        'User-Agent':
          'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/122.0.0.0 Safari/537.36',
        'Accept-Language': 'en-US,en;q=0.9',
      },
    });

    if (!response.ok) {
      throw new Error(`YouTube returned status ${response.status}`);
    }

    const html = await response.text();
    const match =
      html.match(/ytInitialData\s*=\s*({.+?});<\/script>/s) ||
      html.match(/var ytInitialData\s*=\s*({.+?});/);

    if (!match) {
      return res.status(200).json([]);
    }

    const data = JSON.parse(match[1]);
    const sections =
      data?.contents?.twoColumnSearchResultsRenderer?.primaryContents?.sectionListRenderer?.contents;
    const tracks: any[] = [];

    if (Array.isArray(sections)) {
      for (const sec of sections) {
        const contents = sec?.itemSectionRenderer?.contents;
        if (Array.isArray(contents)) {
          for (const item of contents) {
            const vr = item.videoRenderer;
            if (vr && vr.videoId) {
              const title = vr.title?.runs?.[0]?.text || 'Untitled Song';
              const artist =
                vr.ownerText?.runs?.[0]?.text ||
                vr.longBylineText?.runs?.[0]?.text ||
                'Artist';
              const durationText = vr.lengthText?.simpleText || '3:30';
              const parts = durationText.split(':').map(Number);
              const duration =
                parts.length === 2
                  ? parts[0] * 60 + parts[1]
                  : parts.length === 3
                  ? parts[0] * 3600 + parts[1] * 60 + parts[2]
                  : 210;
              const thumb =
                vr.thumbnail?.thumbnails?.slice(-1)[0]?.url ||
                `https://img.youtube.com/vi/${vr.videoId}/hqdefault.jpg`;

              tracks.push({
                id: vr.videoId,
                title,
                artist,
                album: 'YouTube Music',
                duration,
                thumbnailUrl: thumb,
                youtubeUrl: `https://www.youtube.com/watch?v=${vr.videoId}`,
                lyrics: `[Enjoy listening to ${title} on Resonate!]`,
              });
            }
          }
        }
      }
    }

    return res.status(200).json(tracks.slice(0, 25));
  } catch (err: any) {
    return res.status(500).json({ error: err.message || 'Search failed' });
  }
}

