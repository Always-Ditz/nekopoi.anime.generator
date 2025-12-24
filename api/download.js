import fetch from 'node-fetch';

export default async function handler(req, res) {
  const { imageUrl } = req.query;

  if (!imageUrl) {
    return res.status(400).send('imageUrl parameter required');
  }

  try {
    const response = await fetch(imageUrl);
    if (!response.ok) throw new Error('Failed to fetch image');

    const buffer = await response.buffer();

    res.setHeader('Content-Type', 'image/png');
    res.setHeader('Content-Disposition', 'attachment; filename=nekopoi-anime.png');
    res.setHeader('Access-Control-Allow-Origin', '*');

    res.send(buffer);
  } catch (error) {
    res.status(500).send('Error downloading image');
  }
}