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
  generateBtn.textContent = 'Generating... (bisa sampai 90 detik)';

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

    // Handle timeout (status 504)
    if (res.status === 504) {
      alert(
        `⏱️ Generate Timeout (90 detik)\n\n` +
        `${data.message || 'API Nekolabs lagi lambat atau prompt terlalu rumit.'}\n\n` +
        `Coba:\n` +
        `• Sederhanakan prompt\n` +
        `• Coba lagi beberapa saat\n` +
        `• Gunakan prompt yang lebih pendek`
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
    generatedImage.src = currentImageUrl + '?t=' + new Date().getTime();
    result.classList.remove('hidden');

    // Scroll ke hasil
    result.scrollIntoView({ behavior: 'smooth' });

  } catch (err) {
    console.error(err);
    
    // Handle network error atau fetch timeout
    if (err.name === 'AbortError' || err.message.includes('timeout')) {
      alert(
        `⏱️ Koneksi Timeout\n\n` +
        `Generate memakan waktu terlalu lama.\n` +
        `Coba refresh halaman dan generate ulang dengan prompt yang lebih simple.`
      );
    } else {
      alert('🌐 Error koneksi atau server:\n' + err.message);
    }
  } finally {
    // Reset UI
    loading.classList.add('hidden');
    generateBtn.disabled = false;
    generateBtn.textContent = 'Generate';
  }
});

// Download via proxy endpoint (lebih reliable)
downloadBtn.addEventListener('click', async () => {
  if (!currentImageUrl) {
    alert('Belum ada gambar yang digenerate!');
    return;
  }

  try {
    // Disable button sementara
    downloadBtn.disabled = true;
    downloadBtn.textContent = 'Downloading...';

    // Download via proxy endpoint
    const downloadUrl = `/api/download?imageUrl=${encodeURIComponent(currentImageUrl)}`;
    
    const response = await fetch(downloadUrl);
    
    if (!response.ok) {
      throw new Error('Gagal download gambar');
    }

    // Convert to blob
    const blob = await response.blob();
    
    // Create download link
    const url = window.URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `nekopoi-waifu-${Date.now()}.png`;
    document.body.appendChild(a);
    a.click();
    
    // Cleanup
    window.URL.revokeObjectURL(url);
    document.body.removeChild(a);

  } catch (err) {
    console.error('Download error:', err);
    alert('❌ Gagal download gambar:\n' + err.message);
  } finally {
    // Reset button
    downloadBtn.disabled = false;
    downloadBtn.textContent = 'Download';
  }
});

// Reset hasil
resetBtn.addEventListener('click', () => {
  result.classList.add('hidden');
  generatedImage.src = '';
  currentImageUrl = '';
  promptInput.value = '';
  promptInput.focus();
});
