# TA-helper (TARA) — Project Context

## Ringkasan

TARA — Tugas Akhir Research Agent. Chatbot riset yang berjalan **lokal** di komputer pengguna untuk
membantu menyusun tugas akhir: mengobrol dengan model, mengambil kutipan dari koleksi jurnal yang
diunggah sendiri, dan memeriksa kesamaan teks. Draf dan jurnal tidak dikirim ke layanan penyimpanan
mana pun; yang keluar dari mesin hanya permintaan ke API model yang dipilih.

## Arsitektur

Server Express dan klien React (Vite) berjalan di proses terpisah saat `npm run dev`
(`concurrently`). Data disimpan di SQLite lewat `better-sqlite3`, lokasinya diatur `DATA_DIR`.

Alur retrieval:

```
PDF → pdfParser → potongan teks → embeddings → vectorStore (SQLite)
                                        ↓
pertanyaan → siapkan konteks → agent + provider LLM → jawaban + rujukan
```

Provider model dipilih dari variabel lingkungan: `OPENROUTER_API_KEY` (satu kunci untuk banyak
model, disarankan), `ANTHROPIC_API_KEY`, atau `OPENAI_API_KEY`. Minimal satu harus terisi.

## Rute & layanan

| Rute | Fungsi |
| :--- | :--- |
| `chat` | Percakapan berbasis konteks jurnal |
| `citations` | Daftar rujukan, dilengkapi `doiFetcher` |
| `journals` | Unggah dan kelola koleksi PDF |
| `plagcheck` | Cek kesamaan draf terhadap koleksi |
| `progress` | Catatan progres pengerjaan |
| `config` | Konfigurasi provider dan preferensi |

## Struktur

```
bin/tara.js           CLI (commander), default `start`
src/server/index.js   Server Express
src/server/routes/    chat, citations, config, journals, plagcheck, progress
src/server/services/  agent, embeddings, vectorStore, pdfParser, plagiarism, doiFetcher, citations
src/server/db/        schema.js, queries.js
src/client/           Antarmuka React + Vite
```

## Menjalankan

```bash
npm install
cp .env.example .env     # isi minimal satu API key
npm run dev              # server + Vite
npm test                 # vitest
```

CLI: `npx tara-ta start`.

## Jebakan yang diketahui

- `better-sqlite3` adalah modul native; kalau Node baru di-upgrade, `npm rebuild` mungkin diperlukan.
- Tanpa satu pun API key, server tetap jalan tetapi semua permintaan chat gagal.
- Folder `data/` berisi basis data pengguna dan tidak boleh ikut di-commit.
