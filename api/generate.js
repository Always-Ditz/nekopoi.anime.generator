import fs from 'fs';

const COOLDOWN_FILE = '/tmp/nekopoi_cooldown.json';
const COOLDOWN_DURATION = 2 * 60 * 1000; // 2 menit dalam ms

function getCooldown() {
  try {
    if (fs.existsSync(COOLDOWN_FILE)) {
      const data = fs.readFileSync(COOLDOWN_FILE, 'utf8');
      const cooldownData = JSON.parse(data);

      // Kalau belum expired, return waktu expired-nya
      if (cooldownData.until > Date.now()) {
        return cooldownData.until;
      } else {
        // Udah expired, hapus file biar bersih
        try { fs.unlinkSync(COOLDOWN_FILE); } catch {}
      }
    }
    return null;
  } catch (error) {
    console.error('Error reading cooldown file:', error);
    return null;
  }
}

function setCooldown() {
  try {
    const until = Date.now() + COOLDOWN_DURATION;
    fs.writeFileSync(COOLDOWN_FILE, JSON.stringify({ until }), 'utf8');
    return until;
  } catch (error) {
    console.error('Error writing cooldown file:', error);
    return null;
  }
}

export default async function handler(req, res) {
  // CORS
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');

  if (req.method === 'OPTIONS') {
    return res.status(200).end();
  }

  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  const { prompt, ratio = '1:1' } = req.body;

  if (!prompt?.trim()) {
    return res.status(400).json({ error: 'Prompt wajib diisi' });
  }

  try {
    // Cek cooldown
    const cooldownUntil = getCooldown();

    if (cooldownUntil) {
      const remainingMs = cooldownUntil - Date.now();
      const remainingSeconds = Math.max(0, Math.ceil(remainingMs / 1000));

      return res.status(429).json({
        error: 'Cooldown aktif',
        message: `Generate baru bisa lagi dalam ${remainingSeconds} detik ya bro!`,
        remainingSeconds,
      });
    }

    // Build URL dengan benar (ini yang sebelumnya error parah)
    const encodedPrompt = encodeURIComponent(prompt.trim());
    const encodedRatio = encodeURIComponent(ratio);
    const apiUrl = `https://api.nekolabs.web.id/img.gen/wai-nsfw-illustrous/v12?prompt=\( {encodedPrompt}&ratio= \){encodedRatio}`;

    // Fetch dengan timeout aman
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 30000); // 30 detik

    const response = await fetch(apiUrl, {
      method: 'GET',
      signal: controller.signal,
      headers: {
        'Accept': 'application/json',
      },
    });

    clearTimeout(timeoutId);

    if (!response.ok) {
      const errText = await response.text().catch(() => '');
      console.error('Nekolabs API error:', response.status, errText);
      return res.status(502).json({
        error: 'Gagal hubungi API Nekolabs',
        status: response.status,
      });
    }

    const data = await response.json();

    if (!data.success || !data.result) {
      return res.status(500).json({
        error: 'Generate gagal dari API',
        details: data,
      });
    }

    // Set cooldown baru SETELAH sukses generate
    setCooldown();

    return res.status(200).json({
      success: true,
      imageUrl: data.result,
      timestamp: new Date().toISOString(),
    });

  } catch (error) {
    if (error.name === 'AbortError') {
      return res.status(504).json({ error: 'Timeout ke API Nekolabs' });
    }

    console.error('Generate error:', error);
    return res.status(500).json({
      error: 'Server error',
      message: error.message || 'Unknown error',
    });
  }
}

export const config = {
  api: {
    bodyParser: true,
  },
};
