import { kv } from '@vercel/kv';

const COOLDOWN_SECONDS = 120; // 2 menit
const COOLDOWN_KEY = 'nekopoi_global_cooldown';

export default async function handler(req, res) {
  // CORS headers
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
    // Cek cooldown global
    const lastTime = await kv.get(COOLDOWN_KEY);

    if (lastTime) {
      const now = Date.now();
      const elapsed = (now - lastTime) / 1000;
      const remaining = Math.max(0, COOLDOWN_SECONDS - Math.floor(elapsed));

      if (remaining > 0) {
        return res.status(429).json({
          error: 'Cooldown aktif',
          message: `Generate baru bisa dilakukan lagi dalam ${remaining} detik.`,
          remainingSeconds: remaining
        });
      }
    }

    // Panggil API Nekolabs
    const apiUrl = `https://api.nekolabs.web.id/img.gen/wai-nsfw-illustrous/v12?prompt=\( {encodeURIComponent(prompt.trim())}&ratio= \){encodeURIComponent(ratio)}`;

    const response = await fetch(apiUrl, { timeout: 30000 });
    const data = await response.json();

    if (!data.success || !data.result) {
      return res.status(500).json({
        error: 'Gagal generate dari API',
        details: data
      });
    }

    // Set cooldown baru setelah sukses
    await kv.set(COOLDOWN_KEY, Date.now(), { ex: COOLDOWN_SECONDS });

    return res.status(200).json({
      success: true,
      imageUrl: data.result,
      timestamp: new Date().toISOString()
    });

  } catch (error) {
    console.error('Generate error:', error);
    return res.status(500).json({ error: 'Server error', message: error.message });
  }
}

export const config = {
  api: {
    bodyParser: true,
  },
};
