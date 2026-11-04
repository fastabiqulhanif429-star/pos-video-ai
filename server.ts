import express from "express";
import path from "path";
import { createServer as createViteServer } from "vite";
import { GoogleGenAI, Type } from "@google/genai";
import dotenv from "dotenv";

dotenv.config();

const app = express();
// Cloud Run (dan host lain) nyuntik PORT lewat env; lokal default 3000.
const PORT = Number(process.env.PORT) || 3000;

// Set up large limits for base64 image uploads
app.use(express.json({ limit: "15mb" }));
app.use(express.urlencoded({ limit: "15mb", extended: true }));

// Initialize Google Gen AI
const apiKey = process.env.GEMINI_API_KEY;
const ai = new GoogleGenAI({
  apiKey: apiKey,
  httpOptions: {
    headers: {
      "User-Agent": "aistudio-build",
    },
  },
});

// Deteksi error 503 / overload ("high demand", UNAVAILABLE) yang transien & layak di-retry.
// Catatan: 429 (rate limit free-tier per-menit) SENGAJA tidak di-retry karena butuh ~menit untuk pulih.
function is503Overload(err: any): boolean {
  const status = err?.status ?? err?.code ?? err?.response?.status;
  const msg = (err?.message || "").toString().toLowerCase();
  return (
    status === 503 ||
    msg.includes("503") ||
    msg.includes("unavailable") ||
    msg.includes("overloaded") ||
    msg.includes("high demand")
  );
}

// Helper generate content: fallback antar-model + retry KHUSUS 503 (overload) per model.
async function generateWithFallback(params: {
  contents: any;
  config?: any;
}) {
  // HEMAT QUOTA: 2 model. Retry hanya saat 503 (server overload, bukan konsumsi kuota),
  // error lain (404/429/quota) langsung pindah model. Kalau semua gagal -> endpoint pakai template fallback.
  const modelsToTry = ["gemini-3.5-flash", "gemini-flash-latest"];
  const PER_MODEL_TIMEOUT_MS = 20000;
  const MAX_503_RETRIES = 2; // percobaan ulang tambahan khusus 503, per model
  const RETRY_BACKOFF_MS = [1200, 2800];
  let lastError: any = null;

  for (const model of modelsToTry) {
    for (let attempt = 0; attempt <= MAX_503_RETRIES; attempt++) {
      try {
        // Timeout per-model biar satu model yang nge-hang nggak bikin request mentok lama.
        const response = (await Promise.race([
          ai.models.generateContent({
            model,
            contents: params.contents,
            config: params.config,
          }),
          new Promise((_, reject) =>
            setTimeout(() => reject(new Error(`TIMEOUT after ${PER_MODEL_TIMEOUT_MS}ms`)), PER_MODEL_TIMEOUT_MS),
          ),
        ])) as Awaited<ReturnType<typeof ai.models.generateContent>>;
        return response;
      } catch (err: any) {
        lastError = err;
        // Retry model yang sama hanya kalau 503 & masih ada jatah retry.
        if (is503Overload(err) && attempt < MAX_503_RETRIES) {
          const backoff = RETRY_BACKOFF_MS[attempt] ?? 2800;
          console.warn(`Model ${model} overload (503), retry ${attempt + 1}/${MAX_503_RETRIES} dalam ${backoff}ms...`);
          await new Promise((r) => setTimeout(r, backoff));
          continue;
        }
        // Bukan 503, atau jatah retry habis -> pindah ke model berikutnya.
        console.warn(`Model ${model} call failed (${err?.status || err?.message}), coba model berikutnya...`);
        break;
      }
    }
  }

  throw lastError;
}

// Endpoint 1: Analyze Product Photo
app.post("/api/analyze-image", async (req, res) => {
  try {
    const { imageBase64, mimeType } = req.body;

    if (!imageBase64) {
      return res.status(400).json({ error: "Sertakan data foto produk (base64)" });
    }

    const actualMimeType = mimeType || "image/jpeg";
    const imagePart = {
      inlineData: {
        mimeType: actualMimeType,
        data: imageBase64,
      },
    };

    const promptText = `
      Analisislah foto produk yang diberikan secara mendalam untuk konten promosi video affiliate (9:16 vertical video).
      Berikan respon dalam format JSON yang valid dengan properti sebagai berikut:
      - productName: Nama/tipe produk yang ringkas dan menarik (maksimal 4 kata). Contoh: "blazer warna coral", "sepatu running minimalis".
      - targetAudience: Penjelasan singkat siapa target audiens utama yang terdeteksi secara otomatis (maksimal 2 kalimat).
      - keyFeatures: Penjelasan singkat fitur utama, bahan, keunikan, tekstur, atau model yang terdeteksi (maksimal 2 kalimat).
      - colorsDetected: Warna dominan yang terdeteksi (maksimal 3 warna).
    `;

    const response = await generateWithFallback({
      contents: { parts: [imagePart, { text: promptText }] },
      config: {
        responseMimeType: "application/json",
        responseSchema: {
          type: Type.OBJECT,
          properties: {
            productName: { type: Type.STRING },
            targetAudience: { type: Type.STRING },
            keyFeatures: { type: Type.STRING },
            colorsDetected: {
              type: Type.ARRAY,
              items: { type: Type.STRING },
            },
          },
          required: ["productName", "targetAudience", "keyFeatures", "colorsDetected"],
        },
      },
    });

    const parsedData = JSON.parse(response.text || "{}");
    return res.json(parsedData);
  } catch (error: any) {
    console.warn("Error analyzing image, using fallback:", error?.message || error);
    return res.json({
      productName: "Produk Pilihan Premium",
      targetAudience: "Remaja dan dewasa muda yang menyukai fashion estetik & trendi.",
      keyFeatures: "Memiliki material premium berkualitas tinggi, tekstur yang lembut dan nyaman digunakan sehari-hari.",
      colorsDetected: ["Warna Netral", "Kombinasi Estetis"],
      isFallback: true,
      errorDetail: error?.message || "Quota limit exceeded"
    });
  }
});

// Endpoint 2: Generate Narrative Script with AI
app.post("/api/generate-narrative", async (req, res) => {
  try {
    const { productName, keyFeatures, targetAudience, userContext, toneStyle, voiceGender } = req.body;
    const genderLabel = voiceGender === "male" ? "Laki-laki (Pria, maskulin, bersahabat, gaya bro/sob)" : "Perempuan (Wanita, feminin, ceria, gaya bestie/sis)";

    const prompt = `
      Buatlah 1 draf naskah suara (Voice-Over) promosi video pendek yang sangat persuasif, kekinian, menggunakan bahasa kasual/gaul Indonesia (seperti kata 'racun banget', 'auto', 'wajib punya', 'checkout').
      Naskah harus sangat ringkas karena target durasi video maksimal 10 detik.
      
      Informasi Produk:
      - Nama Produk: ${productName || "Produk ini"}
      - Fitur utama terdeteksi: ${keyFeatures || "kualitas premium"}
      - Target audiens: ${targetAudience || "umum / pencari produk hemat"}
      - Catatan tambahan pengguna: ${userContext || ""}
      - Gaya Tone: ${toneStyle || "Heboh & Persuasif (Racun TikTok)"}
      - Karakter Suara: ${genderLabel}
      
      Aturan ketat:
      - Naskah suara (VO) HARUS maksimal 180 karakter saja agar muat dibacakan dalam 10 detik!
      - Sesuaikan gaya sapaan dengan karakter suara (${voiceGender === "male" ? "misal: 'Bro', 'Guys', 'Kalian'" : "misal: 'Bestie', 'Girls', 'Kalian'"}).
      - Berikan respon dalam format JSON dengan properti 'narrative' (string).
    `;

    const response = await generateWithFallback({
      contents: prompt,
      config: {
        responseMimeType: "application/json",
        responseSchema: {
          type: Type.OBJECT,
          properties: {
            narrative: { type: Type.STRING },
          },
          required: ["narrative"],
        },
      },
    });

    const parsedData = JSON.parse(response.text || "{}");
    return res.json(parsedData);
  } catch (error: any) {
    console.warn("Error generating narrative, using fallback:", error?.message || error);
    const productName = req.body.productName || "Produk Pilihan";
    const keyFeatures = req.body.keyFeatures || "Bahan premium & kualitas tinggi";
    const toneStyle = req.body.toneStyle || "Heboh & Persuasif (Racun TikTok)";
    const isMale = req.body.voiceGender === "male";
    
    let narrative = isMale
      ? `Bro, asli ini racun banget! ${productName} punya ${keyFeatures}. Auto ganteng dan keren, buruan checkout sekarang bro!`
      : `Sumpah ini racun banget bestie! ${productName} ini punya ${keyFeatures}. Auto cakep dan wajib punya, langsung checkout sekarang ya!`;
    
    if (toneStyle.includes("Storytelling")) {
      narrative = isMale
        ? `Awalnya ragu beli ${productName}, pas dicoba ternyata ${keyFeatures}. Gokil sih, kalian wajib punya bro!`
        : `Awalnya ragu beli ${productName}, tapi pas dicoba ternyata ${keyFeatures}. Gak nyesel sama sekali, kalian wajib punya sih!`;
    } else if (toneStyle.includes("Hard Selling")) {
      narrative = `Promo terbatas! Dapatkan ${productName} sekarang dengan ${keyFeatures}. Diskon gede-gedean hari ini, klik keranjang kuning!`;
    } else if (toneStyle.includes("Elegis")) {
      narrative = `Rasakan kemewahan nyata dari ${productName}. Dibuat dari ${keyFeatures} untuk kenyamanan elegan Anda sehari-hari.`;
    }

    return res.json({
      narrative,
      isFallback: true,
      errorDetail: error?.message || "Quota limit exceeded"
    });
  }
});

// Endpoint 3: Generate Video Blueprint (JSON Structure for Veo, Flow & Video AI Generator)
app.post("/api/generate-blueprint", async (req, res) => {
  try {
    const { productName, keyFeatures, targetAudience, voiceOverText, creativeAccent, mainTextStyle, imageUrl, voiceGender } = req.body;
    const isMale = voiceGender === "male";
    const creatorDesc = isMale 
      ? "A consistent 24-year-old stylish Indonesian male creator with short neat dark hair, expressive eyes, confident warm smile, wearing a modern stylish shirt" 
      : "A consistent 23-year-old stylish Indonesian female influencer, radiant smiling expression, neat dark hair, friendly approachable look";

    const prompt = `
      Buatlah Blueprint Skenario Video Affiliate 9:16 durasi 10 detik dalam format JSON untuk produk ini.
      
      Detail Masukan:
      - Nama Produk: ${productName || "Produk Pilihan"}
      - Fitur Utama: ${keyFeatures || "Desain trendi & bahan premium"}
      - Naskah Suara (Voice-Over): "${voiceOverText || "Sumpah ini racun banget!"}"
      - Karakter Suara / Kreator: ${isMale ? "Pria / Laki-laki (Male)" : "Wanita / Perempuan (Female)"}
      - Aksen Visual: ${creativeAccent ? "Aktif (Aksen Sketsa Kreatif/coretan)" : "Nonaktif"}
      - Gaya Teks: ${mainTextStyle || "Sketch"}
      ${imageUrl ? `- Referensi Gambar: "${imageUrl}" (Instruksikan 'closely matching the character facial features and product from the provided reference image' di visualPrompt)` : `- Referensi Gambar: Tidak ditentukan`}
      
      Aturan Penting Skenario (VEO / FLOW):
      1. Konsistensi Wajah & Karakter: Tentukan deskripsi fisik model/creator secara detail dan konsisten (e.g. "${creatorDesc}") dan tambahkan klausa "matching the facial identity from the uploaded source image" di visualPrompt.
      2. Demo Produk: Scene 2 wajib berupa close-up macro detail interaksi tangan dengan produk.
      3. visualPrompt ditulis dalam BAHASA INGGRIS yang sangat sinematik (studio lighting, shallow depth of field, photorealistic 8k).
      
      Susunlah 3 scene utama (Scene 1: HOOK (0s-2s), Scene 2: DETAIL VALUE (2s-8s), Scene 3: CTA (8s-10s)) ke dalam JSON dengan properti:
      - visualAesthetic: Penjelasan gaya visual keseluruhan.
      - textOverlayStyle: Detail gaya teks overlay.
      - scenes: Array berisi tepat 3 objek:
         * sceneId (string, e.g., "scene-1", "scene-2", "scene-3")
         * title (string)
         * timestamp (string, e.g., "0.0s - 2.0s", "2.0s - 8.0s", "8.0s - 10.0s")
         * textOverlay (string, teks singkat bombastis Indonesia)
         * visualPrompt (string, deskripsi visual detail Bahasa Inggris dengan anchor wajah model yang konsisten)
         * audioCue (string, e.g. "Swoosh FX")
         * voiceOverSegment (string, potongan voiceOverText sesuai durasi scene)
         * interactiveAction (string, peletakan UI keranjang kuning dll)
         * colorAccent (string, heksadesimal warna overlay)
    `;

    const response = await generateWithFallback({
      contents: prompt,
      config: {
        responseMimeType: "application/json",
        responseSchema: {
          type: Type.OBJECT,
          properties: {
            visualAesthetic: { type: Type.STRING },
            textOverlayStyle: { type: Type.STRING },
            scenes: {
              type: Type.ARRAY,
              items: {
                type: Type.OBJECT,
                properties: {
                  sceneId: { type: Type.STRING },
                  title: { type: Type.STRING },
                  timestamp: { type: Type.STRING },
                  textOverlay: { type: Type.STRING },
                  visualPrompt: { type: Type.STRING },
                  audioCue: { type: Type.STRING },
                  voiceOverSegment: { type: Type.STRING },
                  interactiveAction: { type: Type.STRING },
                  colorAccent: { type: Type.STRING },
                },
                required: [
                  "sceneId",
                  "title",
                  "timestamp",
                  "textOverlay",
                  "visualPrompt",
                  "audioCue",
                  "voiceOverSegment",
                  "interactiveAction",
                  "colorAccent",
                ],
              },
            },
          },
          required: ["visualAesthetic", "textOverlayStyle", "scenes"],
        },
      },
    });

    const parsedData = JSON.parse(response.text || "{}");
    return res.json(parsedData);
  } catch (error: any) {
    console.warn("Error generating blueprint, using fallback:", error?.message || error);
    
    const productName = req.body.productName || "Produk Pilihan";
    const keyFeatures = req.body.keyFeatures || "Desain trendi & bahan premium";
    const voiceOverText = req.body.voiceOverText || "Sumpah ini racun banget! Desainnya cakep parah dan harganya ramah di kantong. Buruan checkout!";
    const mainTextStyle = req.body.mainTextStyle || "Sketch";
    const isMale = req.body.voiceGender === "male";
    const modelDesc = isMale 
      ? "a consistent 24-year-old Indonesian male creator with stylish haircut, expressive friendly eyes" 
      : "a consistent 23-year-old Indonesian female influencer smiling excitedly, radiant look";

    // Split the voiceOverText into roughly three segments
    const voWords = voiceOverText.split(" ");
    const third = Math.ceil(voWords.length / 3);
    const vo1 = voWords.slice(0, Math.max(3, third)).join(" ");
    const vo2 = voWords.slice(Math.max(3, third), Math.max(6, third * 2)).join(" ");
    const vo3 = voWords.slice(Math.max(6, third * 2)).join(" ") || (isMale ? "Buruan checkout sekarang juga bro!" : "Buruan checkout sekarang juga ya!");

    const accentDesc = req.body.creativeAccent ? "with subtle creative sketch/scribble accents and dynamic hand-drawn styling" : "with standard clean fashion style";

    const fallbackData = {
      visualAesthetic: `Sinematik, modern, dan penuh energi. Menggunakan pencahayaan studio yang hangat (warm light) dengan kedalaman ruang (depth of field) yang tinggi. Transisi dinamis antar scene untuk mempertahankan ketertarikan penonton, disesuaikan dengan produk: ${productName}.`,
      textOverlayStyle: `Gaya Teks Utama: ${mainTextStyle}. Menggunakan font modern tebal, dengan animasi pop-up yang menyala berlatar kontras tinggi.`,
      scenes: [
        {
          sceneId: "scene-1",
          title: "SCENE 1: HOOK (0s - 2s)",
          timestamp: "0.0s - 2.0s",
          textOverlay: isMale ? `RACUN BARU: ${productName.toUpperCase()}! 🔥` : `RACUN TIKTOK: ${productName.toUpperCase()}! 🔥`,
          visualPrompt: `A close-up cinematic portrait of ${modelDesc}, holding up ${productName} directly to the camera. Warm cozy studio background with aesthetic bokeh, soft volumetric lighting, high photorealistic 8k, ${accentDesc}.`,
          audioCue: "Fast Swoosh FX + Pop Beat",
          voiceOverSegment: vo1,
          interactiveAction: "Elemen penunjuk melingkar pada produk",
          colorAccent: "#f43f5e"
        },
        {
          sceneId: "scene-2",
          title: "SCENE 2: DETAIL VALUE (2s - 8s)",
          timestamp: "2.0s - 8.0s",
          textOverlay: isMale ? `GOKIL INI KEREN BANGET! 🤩` : `SERIUS INI CAKEP PARAH! 🤩`,
          visualPrompt: `A close-up macro shot of the model's hand interacting with ${productName}, showing off its premium fabric texture, details, and fine ${keyFeatures}. High shallow depth of field, aesthetic clean studio lighting, smooth movement, photorealistic 8k.`,
          audioCue: "Subtle Bass Drop + Upbeat Music",
          voiceOverSegment: vo2,
          interactiveAction: "Animasi zoom lambat pada detail kain/material",
          colorAccent: "#6366f1"
        },
        {
          sceneId: "scene-3",
          title: "SCENE 3: CTA & CHECKOUT (8s - 10s)",
          timestamp: "8.0s - 10.0s",
          textOverlay: `KLIK KERANJANG KUNING DI BAWAH! 👇`,
          visualPrompt: `A medium shot of the same consistent ${isMale ? "Indonesian male creator" : "Indonesian female influencer"} smiling happily, holding ${productName}, pointing downwards towards the shopping bag area. Warm cinematic studio look, friendly inviting atmosphere, extremely clear detail, photorealistic 8k.`,
          audioCue: "Ding Bell FX + Upbeat Outro",
          voiceOverSegment: vo3,
          interactiveAction: "Panah berkedip mengarah ke kiri bawah / keranjang kuning",
          colorAccent: "#f59e0b"
        }
      ],
      isFallback: true,
      errorDetail: error?.message || "Quota limit exceeded"
    };

    return res.json(fallbackData);
  }
});

// Endpoint 4: Riset Produk Affiliate AI (ideation berbasis pengetahuan model)
app.post("/api/research-products", async (req, res) => {
  try {
    const { niche, priceRange, platform } = req.body;

    const prompt = `
      Kamu adalah ahli riset produk affiliate TikTok Shop & Shopee Indonesia.
      Berikan rekomendasi 6 IDE PRODUK affiliate yang punya potensi laris & cocok untuk konten video pendek (9:16, 10 detik).

      Kriteria dari pengguna:
      - Niche / kategori: ${niche || "bebas (produk viral apa saja yang lagi tren)"}
      - Rentang harga incaran: ${priceRange || "Rp30.000 - Rp200.000 (impulse buy)"}
      - Platform utama: ${platform || "TikTok Shop & Shopee"}

      Aturan:
      - Fokus ke produk yang GAMPANG didemokan secara visual di video pendek (efek before-after, tekstur, hasil nyata, reaksi wow).
      - Harga ramah untuk impulse buying.
      - Berikan sudut konten (angle/hook) yang spesifik & kekinian untuk tiap produk.
      - "shopeeKeyword" = kata kunci paling efektif untuk mencari produk itu di Shopee (pengguna akan ambil link affiliate sendiri).
      - PENTING: ini rekomendasi berbasis pengetahuan & tren umum, BUKAN data penjualan real-time.

      Balas dalam JSON dengan properti 'products' (array of object).
    `;

    const response = await generateWithFallback({
      contents: prompt,
      config: {
        responseMimeType: "application/json",
        responseSchema: {
          type: Type.OBJECT,
          properties: {
            products: {
              type: Type.ARRAY,
              items: {
                type: Type.OBJECT,
                properties: {
                  productName: { type: Type.STRING },
                  category: { type: Type.STRING },
                  estPriceRange: { type: Type.STRING },
                  viralScore: { type: Type.NUMBER },
                  whyTrending: { type: Type.STRING },
                  targetAudience: { type: Type.STRING },
                  keyFeatures: { type: Type.STRING },
                  contentAngle: { type: Type.STRING },
                  competition: { type: Type.STRING },
                  shopeeKeyword: { type: Type.STRING },
                  hashtags: { type: Type.ARRAY, items: { type: Type.STRING } },
                },
                required: [
                  "productName",
                  "category",
                  "estPriceRange",
                  "viralScore",
                  "whyTrending",
                  "targetAudience",
                  "keyFeatures",
                  "contentAngle",
                  "competition",
                  "shopeeKeyword",
                  "hashtags",
                ],
              },
            },
          },
          required: ["products"],
        },
      },
    });

    const parsedData = JSON.parse(response.text || "{}");
    return res.json(parsedData);
  } catch (error: any) {
    console.warn("Error researching products, using fallback:", error?.message || error);
    const niche = req.body.niche || "produk viral";
    return res.json({
      products: [
        {
          productName: "Hair Tonic Penumbuh Rambut",
          category: "Hair Care",
          estPriceRange: "Rp25.000 - Rp60.000",
          viralScore: 9,
          whyTrending: "Konten before-after rambut rontok selalu menarik perhatian sepanjang tahun.",
          targetAudience: "Pria & wanita 18-35 yang bermasalah dengan rambut rontok/tipis.",
          keyFeatures: "Serum penumbuh rambut, bersertifikat BPOM, hasil terlihat dalam beberapa minggu.",
          contentAngle: "Timelapse before-after + testimoni jujur 'awalnya ragu...'.",
          competition: "Tinggi",
          shopeeKeyword: "hair tonic penumbuh rambut bpom",
          hashtags: ["#hairtonic", "#rambutrontok", "#racuntiktok", "#haircare"],
        },
        {
          productName: "Pembersih Noda Pakaian (Stain Remover)",
          category: "Household",
          estPriceRange: "Rp20.000 - Rp45.000",
          viralScore: 8,
          whyTrending: "Demo menghilangkan noda membandel memicu pembelian impulsif (efek wow).",
          targetAudience: "Ibu rumah tangga & anak kos yang sering kena noda baju.",
          keyFeatures: "Menghilangkan noda membandel, praktis, hasil instan terlihat di video.",
          contentAngle: "Uji noda ekstrem (kopi, saus, tinta) hilang seketika di depan kamera.",
          competition: "Sedang",
          shopeeKeyword: "penghilang noda baju ampuh",
          hashtags: ["#stainremover", "#tipsrumah", "#racunshopee", "#cleaningtiktok"],
        },
        {
          productName: "Tone Up Cream Pencerah Wajah",
          category: "Skincare",
          estPriceRange: "Rp30.000 - Rp80.000",
          viralScore: 9,
          whyTrending: "Efek glow instan mudah ditonjolkan di kamera, kategori skincare paling besar.",
          targetAudience: "Cewek 18-30 yang mau wajah cerah glowing untuk daily look.",
          keyFeatures: "Pencerah wajah instan, glowing natural tanpa efek abu-abu, ringan.",
          contentAngle: "Split-screen satu sisi wajah dipakai, satu sisi belum.",
          competition: "Tinggi",
          shopeeKeyword: "tone up cream pencerah wajah glowing",
          hashtags: ["#toneupcream", "#glowing", "#skincareviral", "#racuntiktok"],
        },
      ],
      isFallback: true,
      errorDetail: error?.message || "Quota limit exceeded",
    });
  }
});

// Serve Vite in development, static files in production
async function startServer() {
  if (process.env.NODE_ENV !== "production") {
    const vite = await createViteServer({
      // allowedHosts: true -> izinin host apapun (termasuk *.trycloudflare.com tunnel).
      server: { middlewareMode: true, allowedHosts: true },
      appType: "spa",
    });
    app.use(vite.middlewares);
  } else {
    const distPath = path.join(process.cwd(), "dist");
    app.use(express.static(distPath));
    app.get("*", (req, res) => {
      res.sendFile(path.join(distPath, "index.html"));
    });
  }

  app.listen(PORT, "0.0.0.0", () => {
    console.log(`Server running on port ${PORT}`);
  });
}

startServer();
