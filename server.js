const express = require('express');
const cors = require('cors');
const path = require('path');
const axios = require('axios');

const app = express();
const PORT = process.env.PORT || process.env.SERVER_PORT || 3000;

app.use(cors());
app.use(express.json());

// Endpoint API untuk memproses URL TikTok
app.post('/api/download', async (req, res) => {
  const { url } = req.body;

  if (!url || !url.includes('tiktok.com')) {
    return res.status(400).json({ success: false, message: 'URL TikTok tidak valid.' });
  }

  try {
    const apiUrl = `https://tikwm.com/api/?url=${encodeURIComponent(url)}&hd=1`;
    const response = await axios.get(apiUrl);
    const data = response.data;

    if (data && data.code === 0 && data.data) {
      return res.json({
        success: true,
        title: data.data.title || 'Video TikTok',
        author: `@${data.data.author.unique_id || 'user'}`,
        cover: data.data.cover,
        downloadUrl: data.data.play,
        hdUrl: data.data.hdplay || data.data.play,
        wmUrl: data.data.wmplay || data.data.play
      });
    } else {
      return res.status(400).json({ success: false, message: 'Gagal mengambil video dari link tersebut.' });
    }
  } catch (error) {
    console.error('Error fetching TikTok video:', error.message);
    res.status(500).json({ success: false, message: 'Terjadi kesalahan pada server saat mengolah video.' });
  }
});

app.get('*', (req, res) => {
  res.sendFile(path.join(__dirname, 'index.html'));
});

app.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
});
