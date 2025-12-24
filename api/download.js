export default async function handler(req, res) {
  // CORS headers
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');

  if (req.method === 'OPTIONS') {
    return res.status(200).end();
  }

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
    console.error('Proxy download error:', error);
    return res.status(500).json({ 
      error: 'Gagal download gambar',
      message: error.message 
    });
  }
      }
