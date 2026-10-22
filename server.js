const express = require('express');
const cors = require('cors');
const path = require('path');
const axios = require('axios');

const app = express();
const PORT = process.env.PORT || process.env.SERVER_PORT || 3000;

app.use(cors());
app.use(express.json());

// Hanya izinkan unduhan dari host TikWM/TikTok (mencegah server dipakai sebagai proxy bebas)
const ALLOWED_HOSTS = ['tikwm.com', 'tiktokcdn.com', 'tiktokcdn-us.com', 'tiktokv.com', 'byteoversea.com', 'muscdn.com'];

function absoluteUrl(u) {
  if (!u) return u;
  return u.startsWith('/') ? 'https://www.tikwm.com' + u : u;
}

function isAllowed(u) {
  try {
    const parsed = new URL(u);
    if (parsed.protocol !== 'https:') return false;
    return ALLOWED_HOSTS.some(d => parsed.hostname === d || parsed.hostname.endsWith('.' + d));
  } catch (e) {
    return false;
  }
}

function proxyLink(u, name) {
  return `/api/file?name=${encodeURIComponent(name)}&url=${encodeURIComponent(absoluteUrl(u))}`;
}

// Meneruskan file MP4 ke browser sebagai unduhan langsung
app.get('/api/file', async (req, res) => {
  const { url, name } = req.query;
  if (!url || !isAllowed(url)) {
    return res.status(400).send('Link tidak valid.');
  }
  const filename = String(name || 'tiktok-video.mp4').replace(/[^a-zA-Z0-9._-]/g, '_');

  try {
    const upstream = await axios.get(url, {
      responseType: 'stream',
      timeout: 30000,
      headers: { 'User-Agent': 'Mozilla/5.0' }
    });
    res.setHeader('Content-Type', 'video/mp4');
    res.setHeader('Content-Disposition', `attachment; filename="${filename}"`);
    if (upstream.headers['content-length']) {
      res.setHeader('Content-Length', upstream.headers['content-length']);
    }
    upstream.data.on('error', () => res.end());
    upstream.data.pipe(res);
  } catch (error) {
    console.error('Error downloading file:', error.message);
    res.status(502).send('Gagal mengunduh video. Silakan proses ulang videonya.');
  }
});

// Endpoint API untuk memproses URL TikTok
app.post('/api/download', async (req, res) => {
  const { url } = req.body;

  if (!url || !url.includes('tiktok.com')) {
    return res.status(400).json({ success: false, message: 'URL TikTok tidak valid.' });
  }

  try {
    const apiUrl = `https://tikwm.com/api/?url=${encodeURIComponent(url)}`;
    const response = await axios.get(apiUrl);
    const data = response.data;

    if (data && data.code === 0 && data.data) {
      return res.json({
        success: true,
        title: data.data.title || 'Video TikTok',
        author: `@${data.data.author.unique_id || 'user'}`,
        cover: data.data.cover,
        downloadUrl: proxyLink(data.data.play, 'tiktok-video.mp4'),
        hdUrl: proxyLink(data.data.hdplay || data.data.play, 'tiktok-video-hd.mp4'),
        wmUrl: proxyLink(data.data.wmplay || data.data.play, 'tiktok-video-watermark.mp4'),
        hasHd: Boolean(data.data.hdplay) && data.data.hdplay !== data.data.play
      });
    } else {
      return res.status(400).json({ success: false, message: 'Gagal mengambil video dari link tersebut.' });
    }
  } catch (error) {
    console.error('Error fetching TikTok video:', error.message);
    res.status(500).json({ success: false, message: 'Terjadi kesalahan pada server saat mengolah video.' });
  }
});

// Verifikasi Google Search Console
app.get('/google890d9bd65a720228.html', (req, res) => {
  res.type('text/html').send('google-site-verification: google890d9bd65a720228.html');
});

app.get('/robots.txt', (req, res) => {
  res.type('text/plain').send('User-agent: *\nAllow: /\nDisallow: /api/\n\nSitemap: https://tiktok-downloader-9u61.onrender.com/sitemap.xml\n');
});

app.get('/sitemap.xml', (req, res) => {
  res.type('application/xml').send(
    '<?xml version="1.0" encoding="UTF-8"?>\n' +
    '<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">\n' +
    '  <url><loc>https://tiktok-downloader-9u61.onrender.com/</loc><changefreq>weekly</changefreq><priority>1.0</priority></url>\n' +
    '</urlset>\n'
  );
});

app.get('*', (req, res) => {
  res.sendFile(path.join(__dirname, 'index.html'));
});

app.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
});
