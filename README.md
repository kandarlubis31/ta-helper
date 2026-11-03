# TARA — Tugas Akhir Research Agent

Chatbot riset yang berjalan **di komputer sendiri**. Semua koleksi jurnal, percakapan, dan hasil
pemeriksaan tersimpan lokal di SQLite. Kunci API tetap di `.env` milikmu, tidak pernah dikirim ke
server pihak ketiga selain penyedia model yang kamu pilih.

> AI adalah alatmu, bukan penulismu. Lo yang riset, lo yang putuskan, lo yang lulus.

## Kenapa lokal

Skripsi adalah dokumen yang belum dipublikasikan. Mengunggah draf dan sumbernya ke layanan awan
berarti menyerahkan naskah yang belum tentu boleh beredar. TARA dirancang supaya draf, jurnal, dan
catatan tidak pernah keluar dari mesin sendiri.

## Fitur

- **Koleksi jurnal** — unggah PDF, teks diekstrak (`pdf-parse`), dipecah, lalu di-embed ke vector
  store lokal.
- **Chat berbasis sumber** — jawaban diambil dari jurnal yang kamu unggah, bukan dari pengetahuan
  umum model (`embeddings`, `vectorStore`, `agent`).
- **Sitasi** — metadata dan DOI diambil otomatis (`doiFetcher`, `citations`) supaya daftar pustaka
  tidak diketik ulang.
- **Cek kesamaan teks** — `plagcheck` membandingkan draf dengan koleksi jurnal yang tersimpan.
- **Progres** — catatan perkembangan bab dan target.
- **Multi-provider** — OpenRouter (satu kunci untuk Claude, GPT, Gemini, DeepSeek), atau kunci
  Anthropic/OpenAI langsung.

## Menjalankan

```bash
npm install
cp .env.example .env      # isi minimal satu API key
npm run dev               # server + klien Vite
```

Atau lewat CLI:

```bash
npx tara-ta start         # menjalankan server
npx tara-ta               # perintah default = start
```

## Lingkungan

| Variabel | Wajib | Keterangan |
| :--- | :--- | :--- |
| `OPENROUTER_API_KEY` | salah satu | Satu kunci untuk banyak model (disarankan) |
| `ANTHROPIC_API_KEY` | salah satu | Akses langsung Claude |
| `OPENAI_API_KEY` | salah satu | Akses langsung GPT |
| `PORT` | tidak | Default `3000` |
| `DATA_DIR` | tidak | Lokasi basis data, default `./data` |
| `LOG_LEVEL` | tidak | Default `info` |

## Struktur

```
bin/tara.js           CLI (commander)
src/server/index.js   Server Express
src/server/routes/    chat · citations · config · journals · plagcheck · progress
src/server/services/  agent · embeddings · vectorStore · pdfParser · plagiarism · doiFetcher
src/server/db/        skema & query SQLite (better-sqlite3)
src/client/           Antarmuka React + Vite
```

## Stack

Node.js · Express · better-sqlite3 · React + Vite · Anthropic SDK · OpenAI SDK · `pdf-parse` ·
`commander`

## Lisensi

MIT — lihat `LICENSE`.
