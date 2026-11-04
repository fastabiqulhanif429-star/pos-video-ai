---
title: POS Video AI
emoji: 🎬
colorFrom: blue
colorTo: purple
sdk: docker
app_port: 7860
pinned: false
---

# POS Video AI — Blueprint Engine

Analisa foto produk → naskah voice-over + blueprint video (buat dipakai di Google Flow/Veo).

## Deploy (Hugging Face Spaces)

Space ini pakai **Docker SDK**. Hugging Face otomatis build dari `Dockerfile` dan jalanin di port `7860`.

**Wajib set secret:** di tab **Settings → Variables and secrets**, tambahin secret:
- `GEMINI_API_KEY` = (API key Gemini kamu)

Tanpa secret itu, fitur AI-nya nggak jalan.

## Run Locally

**Prasyarat:** Node.js

1. `npm install`
2. Isi `GEMINI_API_KEY` di file `.env`
3. `npm run dev` → buka http://localhost:3000
