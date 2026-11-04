# Deploy POS Video AI ke Google Cloud Run (akun PRIBADI)

Tujuan: hosting gratis (free-tier), **kepisah total dari VPS kantor**.

## Prasyarat
- Akun Google **pribadi** (jangan akun kantor)
- **Billing account** aktif di Google Cloud — WAJIB terpasang walaupun free-tier.
  Nggak akan kena charge selama pemakaian di bawah kuota gratis (buat tool pribadi = aman).
- `gcloud` CLI terinstall → https://cloud.google.com/sdk/docs/install

---

## Opsi A — Tombol Deploy di AI Studio (paling gampang)
1. Buka app di https://ai.studio (akun pribadi lu)
2. Klik **Deploy** → pilih **Cloud Run**
3. Isi `GEMINI_API_KEY` di panel **Secrets**, lalu deploy.

⚠️ **Catatan:** ini deploy versi ASLI yang ada di AI Studio — **TANPA** 3 perbaikan lokal kita
(gerbang password nyala lagi, retry boros quota). Cocok kalau nggak masalah soal itu.

---

## Opsi B — Deploy versi LOKAL kita (bawa semua perbaikan) ⭐ direkomendasikan
Perbaikan yang kebawa: gerbang password MATI, hemat retry (maks 2 panggilan), model fix buat key baru.

Jalanin dari dalam folder `ai-video-blueprint-engine/`:

```bash
# 1. Login + pilih project (ganti PROJECT_ID punya lu)
gcloud auth login
gcloud config set project PROJECT_ID

# 2. Nyalain API yang dibutuhin
gcloud services enable run.googleapis.com cloudbuild.googleapis.com

# 3. Deploy (region asia-southeast2 = Jakarta)
gcloud run deploy pos-video-ai \
  --source . \
  --region asia-southeast2 \
  --allow-unauthenticated \
  --set-env-vars NODE_ENV=production,GEMINI_API_KEY=ISI_KEY_LU_DISINI
```

Selesai → dapet URL publik: `https://pos-video-ai-xxxxx.run.app`

### (Opsional) Simpan key lebih aman pakai Secret Manager
Daripada naro key di env var polos:
```bash
# bikin secret sekali aja
echo -n "ISI_KEY_LU" | gcloud secrets create gemini-key --data-file=-

# pas deploy, ganti baris --set-env-vars jadi:
#   --set-env-vars NODE_ENV=production \
#   --set-secrets GEMINI_API_KEY=gemini-key:latest
```

---

## Biaya
- Cloud Run free-tier: ~2 juta request/bulan + 360.000 GB-detik. Buat tool pribadi = **praktis Rp 0**.
- Gemini: tetep free-tier key lu (atau link billing kalau mau limit gede).
- Billing account wajib nyala sebagai syarat, tapi di bawah kuota = nggak ditagih.

## Keamanan key
`.env` & `.dockerignore` udah diset biar key LOKAL **nggak ikut ke-bundle** ke image Docker.
Key dikasih ke Cloud Run lewat env var / Secret Manager pas deploy — bukan dari file.
