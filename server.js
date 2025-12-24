import express from 'express';
import cors from 'cors';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const app = express();
const PORT = process.env.PORT || 3000;

// Middleware
app.use(cors());
app.use(express.json());
app.use(express.static(__dirname)); // Serve frontend dari root directory

// Cooldown management
const COOLDOWN_FILE = path.join(__dirname, 'cooldown.json');
const COOLDOWN_DURATION = 2 * 60 * 1000; // 2 menit

function getCooldown() {
  try {
    if (fs.existsSync(COOLDOWN_FILE)) {
      const data = fs.readFileSync(COOLDOWN_FILE, 'utf8');
      const cooldownData = JSON.parse(data);

      if (cooldownData.until > Date.now()) {
        return cooldownData.until;
      } else {
        try { fs.unlinkSync(COOLDOWN_FILE); } catch {}
      }
    }
    return null;
  } catch (error) {
    console.error('Error reading cooldown:', error);
    return null;
  }
}

function setCooldown() {
  try {
    const until = Date.now() + COOLDOWN_DURATION;
    fs.writeFileSync(COOLDOWN_FILE, JSON.stringify({ until }), 'utf8');
    return until;
  } catch (error) {
    console.error('Error writing cooldown:', error);
    return null;
  }
}

// Health check endpoint
app.get('/health', (req, res) => {
  res.json({ status: 'ok', timestamp: new Date().toISOString() });
});

// Generate endpoint
app.post('/api/generate', async (req, res) => {
  const { prompt, ratio = '1:1' } = req.body;

  if (!prompt?.trim()) {
    return res.status(400).json({ error: 'Prompt wajib diisi' });
  }

  try {
    // Cek cooldown
    const cooldownUntil = getCooldown();
    if (cooldownUntil) {
      const remainingSeconds = Math.max(0, Math.ceil((cooldownUntil - Date.now()) / 1000));
      return res.status(429).json({
        error: 'Cooldown aktif',
        message: `Tunggu ${remainingSeconds} detik lagi ya bro!`,
        remainingSeconds,
      });
    }

    // Build API URL
    const encodedPrompt = encodeURIComponent(prompt.trim());
    const rawRatio = ratio.trim();
    const apiUrl = `https://api.nekolabs.web.id/img.gen/wai-nsfw-illustrous/v12?prompt=${encodedPrompt}&ratio=${rawRatio}`;

    console.log('[Generate] Starting:', { prompt: prompt.substring(0, 50), ratio });

    // Fetch dengan timeout 90 detik (Railway support lama)
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 90000);

    const response = await fetch(apiUrl, {
      method: 'GET',
      signal: controller.signal,
      headers: { 'Accept': 'application/json' },
    });

    clearTimeout(timeoutId);

    if (!response.ok) {
      const errText = await response.text().catch(() => '');
      console.error('[Generate] Nekolabs Error:', response.status, errText);
      return res.status(502).json({ 
        error: 'Gagal hubungi Nekolabs', 
        details: errText 
      });
    }

    const data = await response.json();

    if (!data.success || !data.result) {
      console.error('[Generate] Failed:', data);
      return res.status(500).json({ 
        error: 'Generate gagal', 
        details: data 
      });
    }

    // Set cooldown setelah sukses
    setCooldown();

    console.log('[Generate] Success:', data.result);

    return res.status(200).json({
      success: true,
      imageUrl: data.result,
      timestamp: new Date().toISOString(),
    });

  } catch (error) {
    if (error.name === 'AbortError') {
      console.error('[Generate] Timeout after 90s');
      return res.status(504).json({ 
        error: 'Generate timeout (90 detik)', 
        message: 'API Nekolabs lagi lambat atau prompt terlalu rumit. Coba lagi atau sederhanakan prompt!' 
      });
    }
    console.error('[Generate] Error:', error);
    return res.status(500).json({ 
      error: 'Server error', 
      message: error.message 
    });
  }
});

// Download/proxy endpoint
app.get('/api/download', async (req, res) => {
  const { imageUrl } = req.query;

  if (!imageUrl) {
    return res.status(400).json({ 
      error: 'Parameter imageUrl wajib diisi' 
    });
  }

  // Validasi URL
  try {
    new URL(imageUrl);
  } catch {
    return res.status(400).json({ 
      error: 'imageUrl harus berupa URL yang valid' 
    });
  }

  try {
    const response = await fetch(imageUrl, {
      headers: {
        'User-Agent': 'Mozilla/5.0 (compatible; NekopoiBot/1.0)',
      },
    });

    if (!response.ok) {
      throw new Error(`Failed to fetch: ${response.status} ${response.statusText}`);
    }

    // Cek apakah benar image
    const contentType = response.headers.get('content-type');
    if (!contentType?.startsWith('image/')) {
      return res.status(400).json({ 
        error: 'URL bukan mengarah ke gambar yang valid' 
      });
    }

    // Konversi ke buffer
    const arrayBuffer = await response.arrayBuffer();
    const buffer = Buffer.from(arrayBuffer);

    // Set headers untuk download
    res.setHeader('Content-Type', contentType || 'image/png');
    res.setHeader('Content-Disposition', `attachment; filename=nekopoi-waifu-${Date.now()}.png`);
    res.setHeader('Content-Length', buffer.length);

    return res.send(buffer);

  } catch (error) {
    console.error('[Download] Error:', error);
    return res.status(500).json({ 
      error: 'Gagal download gambar',
      message: error.message 
    });
  }
});

// 404 handler
app.use((req, res) => {
  res.status(404).json({ error: 'Endpoint not found' });
});

// Start server
app.listen(PORT, () => {
  console.log(`🚀 Server running on port ${PORT}`);
  console.log(`📍 http://localhost:${PORT}`);
});
