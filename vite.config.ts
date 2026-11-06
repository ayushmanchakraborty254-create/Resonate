import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

// https://vite.dev/config/
export default defineConfig({
  base: './',
  plugins: [
    react(),
    {
      name: 'api-search-dev-middleware',
      configureServer(server) {
        server.middlewares.use(async (req, res, next) => {
          if (req.url && req.url.startsWith('/api/search')) {
            const urlObj = new URL(req.url, 'http://localhost');
            const query = urlObj.searchParams.get('q') || '';
            res.setHeader('Content-Type', 'application/json');
            res.setHeader('Access-Control-Allow-Origin', '*');

            if (!query.trim()) {
              res.end(JSON.stringify([]));
              return;
            }

            try {
              const ytUrl = `https://www.youtube.com/results?search_query=${encodeURIComponent(query)}`;
              const response = await fetch(ytUrl, {
                headers: {
                  'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/122.0.0.0 Safari/537.36',
                  'Accept-Language': 'en-US,en;q=0.9',
                },
              });

              if (!response.ok) {
                res.statusCode = 500;
                res.end(JSON.stringify({ error: `YouTube responded with ${response.status}` }));
                return;
              }

              const html = await response.text();
              const match = html.match(/ytInitialData\s*=\s*({.+?});<\/script>/s) || html.match(/var ytInitialData\s*=\s*({.+?});/);
              if (!match) {
                res.end(JSON.stringify([]));
                return;
              }

              const data = JSON.parse(match[1]);
              const sections = data?.contents?.twoColumnSearchResultsRenderer?.primaryContents?.sectionListRenderer?.contents;
              const tracks = [];

              if (Array.isArray(sections)) {
                for (const sec of sections) {
                  const contents = sec?.itemSectionRenderer?.contents;
                  if (Array.isArray(contents)) {
                    for (const item of contents) {
                      const vr = item.videoRenderer;
                      if (vr && vr.videoId) {
                        const title = vr.title?.runs?.[0]?.text || 'Untitled Song';
                        const artist = vr.ownerText?.runs?.[0]?.text || vr.longBylineText?.runs?.[0]?.text || 'Artist';
                        const durationText = vr.lengthText?.simpleText || '3:30';
                        const parts = durationText.split(':').map(Number);
                        const duration = parts.length === 2 ? parts[0] * 60 + parts[1] : 210;
                        const thumb = vr.thumbnail?.thumbnails?.slice(-1)[0]?.url || `https://img.youtube.com/vi/${vr.videoId}/hqdefault.jpg`;

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

              res.end(JSON.stringify(tracks.slice(0, 25)));
            } catch (err: any) {
              res.statusCode = 500;
              res.end(JSON.stringify({ error: err.message }));
            }
            return;
          }
          next();
        });
      },
    },
  ],
})
