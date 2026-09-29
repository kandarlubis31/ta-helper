import React from 'react';

export default function SetupGuide() {
  return (
    <div className="settings-section">
      <h3>📖 Cara Setup</h3>
      <ol className="setup-steps">
        <li><strong>Pilih provider</strong> — klik tab OpenRouter (rekomendasi), Anthropic, atau OpenAI</li>
        <li><strong>Dapatkan API key</strong> — klik <em>Dapatkan Key</em>, daftar/buat key di dashboard</li>
        <li><strong>Paste & simpan</strong> — copy-paste key, klik <em>Simpan</em></li>
        <li><strong>Pilih model</strong> — pilih dari daftar yang muncul</li>
        <li><strong>Done!</strong> — langsung chat di tab 💬</li>
      </ol>
      <p className="setup-note">
        💡 <strong>Rekomendasi OpenRouter:</strong> satu key akses SEMUA model — Claude, GPT, Gemini, DeepSeek, Llama, dll — dari satu tempat. Lebih murah &amp; praktis!
      </p>
    </div>
  );
}
