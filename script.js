const promptInput = document.getElementById('prompt');
const ratioSelect = document.getElementById('ratio');
const generateBtn = document.getElementById('generateBtn');
const loading = document.getElementById('loading');
const result = document.getElementById('result');
const generatedImage = document.getElementById('generatedImage');
const downloadBtn = document.getElementById('downloadBtn');
const resetBtn = document.getElementById('resetBtn');

let currentImageUrl = '';

generateBtn.addEventListener('click', async () => {
  const prompt = promptInput.value.trim();
  const ratio = ratioSelect.value;

  if (!prompt) {
    alert('Masukkan prompt dulu ya!');
    return;
  }

  loading.classList.remove('hidden');
  result.classList.add('hidden');
  generateBtn.disabled = true;
  generateBtn.textContent = 'Generating...';

  try {
    const res = await fetch('/api/generate', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ prompt, ratio })
    });

    const data = await res.json();

    if (res.status === 429) {
      alert(`⏳ Cooldown Global Aktif!\nTunggu ${data.remainingSeconds} detik lagi sebelum generate baru.\n(Semua user harus nunggu bareng-bareng)`);
      return;
    }

    if (!data.success) {
      alert('Gagal generate: ' + (data.message || data.error || 'Unknown error'));
      return;
    }

    currentImageUrl = data.imageUrl;
    generatedImage.src = currentImageUrl;
    result.classList.remove('hidden');

  } catch (err) {
    alert('Error koneksi: ' + err.message);
  } finally {
    loading.classList.add('hidden');
    generateBtn.disabled = false;
    generateBtn.textContent = 'Generate';
  }
});

downloadBtn.addEventListener('click', () => {
  if (!currentImageUrl) return;

  const a = document.createElement('a');
  a.href = `/api/download?imageUrl=${encodeURIComponent(currentImageUrl)}`;
  a.download = 'nekopoi-anime.png';
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
});

resetBtn.addEventListener('click', () => {
  result.classList.add('hidden');
  generatedImage.src = '';
  currentImageUrl = '';
});