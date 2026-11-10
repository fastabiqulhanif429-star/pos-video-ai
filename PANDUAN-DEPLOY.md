# Panduan Push + Deploy (langkah gampang)

Perubahan terakhir: **badge "Pengaturan API • AKTIF" sudah dihapus**, sudah di-commit lokal.
Tinggal 2 hal: (1) push ke GitHub, (2) deploy ke Cloud Run.

---

## LANGKAH 1 — Push ke GitHub

Buka **PowerShell** (ikon di taskbar), lalu jalankan:

```powershell
cd C:\Users\p\Documents\pos-video-ai
git push origin main
```

> Pas muncul window / tab browser **"Sign in to GitHub"**, selesaikan login sampai muncul
> **"Authentication Succeeded"**. Token-nya otomatis tersimpan, jadi next push nggak akan nanya lagi.

Cek berhasil: jalankan `git status` → harus muncul `Your branch is up to date with 'origin/main'`.

---

## LANGKAH 2 — Deploy ke Cloud Run

Perlu `gcloud` CLI. Cek dulu udah ada belum:

```powershell
gcloud --version
```

### Kalau "gcloud tidak dikenali" → install dulu
1. Download installer: https://cloud.google.com/sdk/docs/install  (pilih **Windows 64-bit**)
2. Jalankan installer, centang **"Run gcloud init"** di akhir.
3. `gcloud init` → login pakai akun Google: **fastabiqulhanif429@gmail.com**, lalu pilih project.

### Setelah gcloud siap → deploy
Jalankan dari folder project (ganti `ISI_KEY_LU` dengan GEMINI_API_KEY kamu — ada di file `.env`):

```powershell
cd C:\Users\p\Documents\pos-video-ai
gcloud services enable run.googleapis.com cloudbuild.googleapis.com
gcloud run deploy pos-video-ai --source . --region asia-southeast2 --allow-unauthenticated --set-env-vars NODE_ENV=production,GEMINI_API_KEY=ISI_KEY_LU
```

Selesai → dapat URL publik `https://pos-video-ai-xxxxx.run.app`. Buka URL itu, badge sudah hilang.

> **Catatan:** kalau Cloud Run kamu di-set **auto-deploy dari GitHub** (Cloud Build trigger),
> maka cukup LANGKAH 1 (push) — deploy jalan otomatis, nggak perlu LANGKAH 2.

---

## Kalau mau aku bantuin lagi
Setelah push berhasil, bilang ke aku — aku cek commit-nya sudah masuk GitHub dan bantu cek deploy-nya.
