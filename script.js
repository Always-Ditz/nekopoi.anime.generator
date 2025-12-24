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
    alert('🖊️ Masukkan prompt dulu dong bro!');
    return;
  }

  // UI: sedang generate
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

    // Handle cooldown (status 429)
    if (res.status === 429) {
      const remaining = data.remainingSeconds || 120;
      const minutes = Math.floor(remaining / 60);
      const seconds = remaining % 60;

      alert(
        `⏳ Cooldown Global Aktif Bro!\n\n` +
        `Tunggu ${minutes > 0 ? minutes + ' menit ' : ''}${seconds} detik lagi ya.\n` +
        `Ini berlaku buat semua user bareng-bareng. Sabar dulu! 😅`
      );
      return;
    }

    // Handle error lain (400, 500, dll)
    if (!res.ok || !data.success) {
      const errorMsg = data.message || data.error || 'Gagal generate gambar';
      alert('❌ Gagal generate:\n' + errorMsg);
      return;
    }

    // Sukses!
    currentImageUrl = data.imageUrl;
    generatedImage.src = currentImageUrl + '?t=' + new Date().getTime(); // prevent cache jika perlu
    result.classList.remove('hidden');

    // Scroll ke hasil
    result.scrollIntoView({ behavior: 'smooth' });

  } catch (err) {
    console.error(err);
    alert('🌐 Error koneksi atau server:\n' + err.message);
  } finally {
    // Reset UI
    loading.classList.add('hidden');
    generateBtn.disabled = false;
    generateBtn.textContent = 'Generate';
  }
});

// Download langsung dari URL gambar (lebih simple & cepat)
downloadBtn.addEventListener('click', () => {
  if (!currentImageUrl) {
    alert('Belum ada gambar yang digenerate!');
    return;
  }

  const a = document.createElement('a');
  a.href = currentImageUrl;
  a.download = 'nekopoi-waifu-' + Date.now() + '.png'; // nama file unik
  a.target = '_blank'; // biar ga ganti tab
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
});

// Reset hasil
resetBtn.addEventListener('click', () => {
  result.classList.add('hidden');
  generatedImage.src = '';
  currentImageUrl = '';
  promptInput.focus(); // bonus: langsung fokus ke input
});
