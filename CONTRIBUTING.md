# Contributing to TARA

Terima kasih udah mau kontribusi ke TARA! 🎓

> **"AI adalah alatmu, bukan penulismu. Lo yang riset, lo yang putuskan, lo yang lulus."**

TARA adalah chatbot TA berbasis web yang berjalan **lokal di komputer user**. Dibangun dengan React + Express + Vectra + SQLite.

**Lisensi:** MIT — bebas dipakai, dimodifikasi, didistribusikan.
**Bahasa UI:** Indonesia
**Target user:** Mahasiswa informatika yang ngerjain TA sendiri

---

## Daftar Isi

- [Cara Mulai](#cara-mulai)
- [Struktur Project](#struktur-project)
- [Development Workflow](#development-workflow)
- [Yang Bisa Dikerjain](#yang-bisa-dikerjain)
- [Arsitektur](#arsitektur)
- [Design Principles](#design-principles)
- [Environment Variables](#environment-variables)

---

## Cara Mulai

### Prasyarat
- **Node.js 18+**
- npm (ikut sama Node.js)
- Git
- API key minimal satu provider LLM (Anthropic / OpenAI / OpenRouter)

### Setup Development

```bash
# Clone repo
git clone https://github.com/your-org/tara-ta.git
cd tara-ta

# Install dependencies
npm install

# Copy .env.example, isi API key kamu
cp .env.example .env
# Edit .env — isi ANTHROPIC_API_KEY, OPENAI_API_KEY, atau OPENROUTER_API_KEY

# Jalankan dev mode (backend + frontend hot reload)
npm run dev
```

Dev mode jalanin Express di `localhost:3000` dan Vite dev server di `localhost:5173` (auto-proxy ke backend via Vite config).

### Production Build

```bash
npm run build     # Build frontend ke dist/
npm start         # Jalankan server production (serve frontend + API)
```

---

## Struktur Project

```
tara-ta/
├── bin/
│   └── tara.js                  # CLI entry point (npx tara-ta)
├── src/
│   ├── server/
│   │   ├── index.js             # Express app entry
│   │   ├── routes/              # API route handlers
│   │   │   ├── chat.js          # Chat agent endpoint
│   │   │   ├── journals.js      # Upload, DOI, list, delete
│   │   │   ├── plagcheck.js     # Plagiarism checker
│   │   │   ├── progress.js      # TA progress tracker
│   │   │   ├── config.js        # Provider config
│   │   │   └── citations.js     # Citation generator
│   │   ├── services/            # Business logic
│   │   │   ├── agent.js         # Chat agent: intent, context, LLM call
│   │   │   ├── vectorStore.js   # Vectra wrapper
│   │   │   ├── embeddings.js    # OpenAI embedding
│   │   │   ├── pdfParser.js     # PDF text extraction
│   │   │   ├── doiFetcher.js    # CrossRef + Unpaywall
│   │   │   ├── plagiarism.js    # Cosine similarity
│   │   │   └── citations.js     # APA/IEEE formatter
│   │   └── db/
│   │       ├── schema.js        # SQLite definitions
│   │       └── queries.js       # DB query helpers
│   └── client/                  # React frontend (Vite)
│       ├── index.html
│       ├── main.jsx
│       ├── App.jsx
│       ├── index.css
│       ├── hooks/               # Custom React hooks
│       ├── utils/               # Utility functions
│       └── components/
│           ├── Chat/            # Chat UI (window, bubbles, input)
│           ├── Journal/         # Journal management
│           ├── PlagCheck/       # Plagiarism report
│           ├── Progress/        # Progress tracker
│           ├── Settings/        # Provider config, model picker
│           └── shared/          # Layout, Sidebar
├── data/                        # Auto-generated (gitignored)
│   ├── tara.db                  # SQLite database
│   ├── vectors/                 # Vectra vector files
│   └── pdfs/                    # Stored PDF files
├── .env.example
├── package.json
├── vite.config.js
└── README.md
```

---

## Development Workflow

### Branching
- `main` — stable, production-ready
- `develop` — integration branch
- `feature/nama-fitur` — fitur baru
- `fix/nama-bug` — bug fix

### Commit Messages
Gunakan format conventional commits (bahasa Indonesia oke!):
```
feat: tambah fitur export daftar pustaka ke Word
fix: perbaiki streaming error saat token habis
docs: update README cara install
refactor: pisah intent detector ke file sendiri
style: perbaiki spacing sidebar
chore: update dependencies
```

### Sebelum PR

```bash
# Build frontend — pastiin gak ada error
npm run build

# Jalankan server — pastiin start tanpa crash
npm start
```

Pastikan juga:
- ✅ Gak ada `console.log` yang nyampah
- ✅ Gak ada API key ke-commit
- ✅ UI masih responsive di mobile
- ✅ Error handling jelas (bukan crash mentah)

---

## Yang Bisa Dikerjain

### Beginner-friendly
- 🐛 Perbaiki teks UI yang typo atau kurang natural
- 📝 Tambah format sitasi baru (Harvard, Chicago, dll)
- 💬 Improve error messages biar lebih jelas
- 🧪 Bikin unit tests buat services (plagiarism, citations, dll)
- 🎨 Improve styling & animations

### Intermediate
- 📄 Tambah export hasil chat ke Markdown / PDF
- ✂️ Improve chunking strategy buat text splitting
- 🗄️ Bikin caching layer buat embeddings
- 📋 Tambah pagination / infinite scroll di journal list
- 🔍 Improve search dengan filter (tahun, penulis, source)
- ⚡ Optimasi loading state & skeleton screens

### Advanced
- 🔌 Support provider embedding lain (Cohere, Voyage, dll)
- 🌐 Implementasi web scraper buat PDF non-open-access
- 🧩 Bikin plugin system buat custom agent behavior
- 📊 Optimasi Vectra index buat koleksi >100 jurnal
- 🤖 Tambah fitur multi-turn conversation dengan memory management
- 📈 Dashboard analytics buat progress tracking

---

## Arsitektur

### Chat Agent Flow

```
User Message
  │
  ├── intent detection (regex-based)
  │   ├── WRITE: generate konten + sitasi
  │   ├── SEARCH: cari jurnal relevan
  │   ├── PLAGCHECK: redirect ke plagcheck endpoint
  │   ├── PROGRESS: tampilkan progress TA
  │   ├── CITATION: generate daftar pustaka
  │   └── GENERAL: obrolan biasa + context jurnal
  │
  ├── (jika WRITE/SEARCH/GENERAL):
  │     embed query → semantic search di Vectra
  │     ambil top-3 jurnal paling relevan
  │     inject context jurnal ke system prompt
  │
  ├── build system prompt + journal context + progress context
  │
  ├── sliding window (8 pesan full + sisanya di-summarize)
  │
  └── call LLM (Anthropic/OpenAI/OpenRouter) + SSE streaming → frontend
```

### Tech Stack Detail

| Layer | Teknologi | Versi |
|-------|-----------|-------|
| Runtime | Node.js | 18+ |
| Frontend | React + Vite | 18 / 5 |
| Backend | Express.js | 4.x |
| Vector DB | Vectra (local, file-based) | 0.15+ |
| Database | SQLite (better-sqlite3) | 12.x |
| LLM | Anthropic Claude / OpenAI / OpenRouter | SDK terbaru |
| Embeddings | OpenAI text-embedding-3-small | - |
| PDF | pdf-parse | 1.x |
| CLI | commander | 12.x |

### API Endpoints

| Method | Endpoint | Fungsi |
|--------|----------|--------|
| POST | `/api/chat` | Kirim pesan → streaming response |
| GET | `/api/chat/history` | Ambil history chat |
| DELETE | `/api/chat/history` | Clear history |
| POST | `/api/journals/upload` | Upload PDF |
| POST | `/api/journals/doi` | Fetch by DOI |
| GET | `/api/journals` | List jurnal |
| DELETE | `/api/journals/:id` | Hapus jurnal |
| POST | `/api/plagcheck` | Cek kemiripan teks |
| GET | `/api/progress` | Lihat progres |
| POST | `/api/progress` | Update progres |
| POST | `/api/citations/generate` | Generate daftar pustaka |
| GET | `/api/config` | Config status |
| POST | `/api/config` | Update config |

---

## Design Principles

1. **AI alat bantu, bukan penulis.** Setiap output harus di-review user. Selalu tampilkan disclaimer.
2. **Data lokal.** Semua data user stay di mesin user sendiri — gak ada telemetry, gak ada cloud.
3. **Bahasa Indonesia first.** UI, system prompt, semua output pake Bahasa Indonesia.
4. **Simpel & fokus.** Tanpa over-engineering, fokus ke value untuk mahasiswa TA.
5. **Error-friendly.** API key invalid, offline, kuota habis — kasih pesan jelas, jangan crash.
6. **Mobile responsive.** Semua fitur harus bisa dipake di HP.

---

## Environment Variables

```env
# Wajib — setidaknya satu provider LLM
OPENROUTER_API_KEY=sk-or-v1-...      # Rekomendasi: akses Claude, GPT, Gemini, dll
ANTHROPIC_API_KEY=sk-ant-...
OPENAI_API_KEY=sk-...

# Opsional
PORT=3000
DATA_DIR=./data
LOG_LEVEL=info
```

> ⚠️ **Jangan commit API key ke repo!** `.env` sudah di `.gitignore`.

---

*Dibuat dengan ❤️ untuk mahasiswa TA Indonesia — MIT License.*
