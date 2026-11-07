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

    const prodName = (productName || "").toString().trim();
    const prompt = `
      Buatlah 1 draf naskah suara (Voice-Over) promosi video pendek yang sangat persuasif, kekinian, menggunakan bahasa kasual/gaul Indonesia (seperti kata 'racun banget', 'auto', 'wajib punya', 'checkout').
      Naskah harus sangat ringkas karena target durasi video maksimal 10 detik.

      Informasi Produk:
      - Nama Produk: ${prodName || "Produk ini"}
      - Fitur utama terdeteksi: ${keyFeatures || "kualitas premium"}
      - Target audiens: ${targetAudience || "umum / pencari produk hemat"}
      - Catatan tambahan pengguna: ${userContext || ""}
      - Gaya Tone: ${toneStyle || "Heboh & Persuasif (Racun TikTok)"}
      - Karakter Suara: ${genderLabel}

      Aturan ketat:
      ${prodName ? `- WAJIB & PALING PENTING: naskah HARUS menyebut nama produk "${prodName}" secara JELAS (persis atau nama intinya kalau kepanjangan). DILARANG KERAS mengganti, mengarang, atau memakai nama produk lain — nama di naskah harus produk yang SAMA dengan "${prodName}".` : `- Sebut produknya secara jelas (boleh "produk ini") dan konsisten; jangan mengarang nama merek acak.`}
      - Naskah suara (VO) HARUS maksimal 180 karakter saja agar muat dibacakan dalam 10 detik! Kalau nama produk panjang, boleh pakai nama inti/merek-nya saja asal TETAP produk yang sama (jangan buang nama produknya demi hemat karakter).
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

    // GUARD: pastikan naskah benar-benar menyebut produknya. Kalau AI malah buang/ganti
    // nama produk, ganti dgn template yang dijamin menyebut nama produk (hindari "nama produk tidak sesuai").
    const narr = (parsedData.narrative || "").toString();
    const STOP = new Set(["dan", "atau", "yang", "untuk", "dengan", "pencerah", "wajah", "cream", "the", "pack", "set", "original", "premium", "produk", "warna", "pcs"]);
    const coreTokens = prodName
      .toLowerCase()
      .replace(/[^a-z0-9\s]/g, " ")
      .split(/\s+/)
      .filter((w) => w.length >= 3 && !STOP.has(w));
    const narrLower = narr.toLowerCase();
    const mentionsProduct = !prodName || coreTokens.length === 0 || coreTokens.some((t) => narrLower.includes(t));
    if (!mentionsProduct) {
      const isMaleG = voiceGender === "male";
      const feat = (keyFeatures || "kualitas premium").toString();
      parsedData.narrative = isMaleG
        ? `Bro, ${prodName} ini racun banget! Punya ${feat}. Auto wajib punya, buruan checkout di keranjang kuning!`
        : `Bestie, ${prodName} ini racun banget! Punya ${feat}. Auto wajib punya, buruan checkout di keranjang kuning ya!`;
      parsedData.nameFixed = true;
    }

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
    const { productName, keyFeatures, targetAudience, voiceOverText, creativeAccent, mainTextStyle, imageUrl, hasImage: hasImageFlag, voiceGender, duration } = req.body;
    // Foto produk TIDAK dikirim ke model (Gemini cuma bikin teks). Kita cuma perlu TAHU ada foto
    // supaya instruksi ke Flow/Veo memaksa produk sesuai foto referensi. Jangan pernah inline base64 ke prompt.
    const hasImage = !!hasImageFlag || (typeof imageUrl === "string" && imageUrl.length > 0);
    // Durasi custom (detik). Breakpoint 3 scene: HOOK ~25%, B-ROLL ~42%, CTA ~33%.
    const dur = Number(duration) >= 5 && Number(duration) <= 60 ? Math.round(Number(duration)) : 12;
    const b1 = Math.max(1, Math.round(dur * 0.25));
    const b2 = Math.max(b1 + 1, Math.round(dur * 0.67));
    const fmt = (n: number) => n.toFixed(1) + "s";
    const isMale = voiceGender === "male";
    const creatorDesc = isMale 
      ? "A consistent 24-year-old stylish Indonesian male creator with short neat dark hair, expressive eyes, confident warm smile, wearing a modern stylish shirt" 
      : "A consistent 23-year-old stylish Indonesian female influencer, radiant smiling expression, neat dark hair, friendly approachable look";

    const prompt = `
      Buatlah Blueprint Skenario Video Affiliate 9:16 untuk SATU produk saja (TOTAL DURASI TEPAT ${dur} detik) dalam format JSON.
      Video ini DIRAKIT dari 3 BAHAN MENTAH yang disiapkan pengguna untuk 1 produk (pengguna akan upload bahan ini manual ke Flow/Veo):
      - Foto Statis 1 (foto produk clear/close-up kemasan) → dipakai di HOOK (0-${b1} detik) + teks headline penahan mata.
      - Video Asli Pendek (produk beneran dioles ke kulit / ditetes / unboxing) → dipakai di TENGAH (${b1}-${b2} detik) biar penonton percaya barangnya real.
      - Foto Statis 2 (foto sudut lain / tekstur / klaim BPOM / rating) → dipakai di CTA (${b2}-${dur} detik) + ajakan klik keranjang/link.

      Detail Masukan:
      - Nama Produk: ${productName || "Produk Pilihan"}
      - Fitur Utama: ${keyFeatures || "Desain trendi & bahan premium"}
      - Naskah Suara (Voice-Over): "${voiceOverText || "Sumpah ini racun banget!"}"
      - Karakter Suara / Kreator: ${isMale ? "Pria / Laki-laki (Male)" : "Wanita / Perempuan (Female)"}
      - Aksen Visual: ${creativeAccent ? "Aktif (Aksen Sketsa Kreatif/coretan)" : "Nonaktif"}
      - Gaya Teks: ${mainTextStyle || "Sketch"}

      Aturan Penting Skenario (VEO / FLOW):
      1. SATU VIDEO = SATU PRODUK. Jangan campur produk lain. Produk yang dibahas: ${productName || "produk"}.
      2. Tiap scene WAJIB punya "materialType" = bahan yang dipakai scene itu, persis salah satu dari: "Foto Statis 1 (foto produk clear)", "Video Asli Pendek (B-roll produk dipakai)", "Foto Statis 2 (kemasan/klaim/BPOM)".
      3. KONSISTENSI PRODUK: di setiap visualPrompt sebut produk "${productName || "produk"}" secara konsisten (kemasan, label, warna, bentuk SAMA) — jangan ganti/karang produk lain.
      4. Scene 2 = FOOTAGE ASLI close-up produk BENERAN dipakai (dioles ke kulit / dituang / unboxing), bukan foto statis — tulis visualPrompt-nya sebagai gerakan nyata.
      5. Konsistensi Kreator: kalau ada orang, pakai kreator SAMA di semua scene (e.g. "${creatorDesc}"); tambahkan "keep the same creator's face, hair and outfit consistent".
      6. visualPrompt ditulis BAHASA INGGRIS sinematik (studio lighting, shallow depth of field, photorealistic 8k).

      Susunlah tepat 3 scene yang total durasinya PERSIS ${dur} detik (Scene 1: HOOK ${fmt(0)} - ${fmt(b1)} pakai Foto Statis 1; Scene 2: DEMO B-ROLL ${fmt(b1)} - ${fmt(b2)} pakai Video Asli Pendek; Scene 3: CTA ${fmt(b2)} - ${fmt(dur)} pakai Foto Statis 2) ke dalam JSON dengan properti:
      - visualAesthetic: Penjelasan gaya visual keseluruhan.
      - textOverlayStyle: Detail gaya teks overlay.
      - scenes: Array berisi tepat 3 objek:
         * sceneId (string, e.g., "scene-1", "scene-2", "scene-3")
         * title (string)
         * timestamp (string, e.g., "0.0s - 3.0s", "3.0s - 8.0s", "8.0s - 12.0s")
         * materialType (string, bahan yang dipakai scene ini: "Foto Statis 1 (foto produk clear)" / "Video Asli Pendek (B-roll produk dipakai)" / "Foto Statis 2 (kemasan/klaim/BPOM)")
         * textOverlay (string, teks singkat bombastis Indonesia)
         * visualPrompt (string, deskripsi visual detail Bahasa Inggris; sebut produk konsisten + kreator konsisten)
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
                  materialType: { type: Type.STRING },
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
                  "materialType",
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
    const durFb = Number(req.body.duration) >= 5 && Number(req.body.duration) <= 60 ? Math.round(Number(req.body.duration)) : 12;
    const fb1 = Math.max(1, Math.round(durFb * 0.25));
    const fb2 = Math.max(fb1 + 1, Math.round(durFb * 0.67));
    const ts = (a: number, b: number) => `${a.toFixed(1)}s - ${b.toFixed(1)}s`;
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
      visualAesthetic: `Sinematik, modern, penuh energi. Dirakit dari 3 bahan (foto produk + footage asli pendek + foto klaim) untuk 1 produk: ${productName}. Pencahayaan studio hangat, depth of field tinggi, transisi dinamis.`,
      textOverlayStyle: `Gaya Teks Utama: ${mainTextStyle}. Font modern tebal, animasi pop-up menyala berlatar kontras tinggi.`,
      scenes: [
        {
          sceneId: "scene-1",
          title: `SCENE 1: HOOK (${ts(0, fb1)})`,
          timestamp: ts(0, fb1),
          materialType: "Foto Statis 1 (foto produk clear)",
          textOverlay: isMale ? `RACUN BARU: ${productName.toUpperCase()}! 🔥` : `RACUN TIKTOK: ${productName.toUpperCase()}! 🔥`,
          visualPrompt: `Open on the static clear close-up product photo of ${productName} filling the frame as the hook, slow subtle zoom-in, bold headline text on top. Warm studio background with aesthetic bokeh, soft volumetric lighting, photorealistic 8k, ${accentDesc}. Keep the product packaging, label and colors exactly as the product ${productName} — do not substitute a different product.`,
          audioCue: "Fast Swoosh FX + Pop Beat",
          voiceOverSegment: vo1,
          interactiveAction: "Teks headline besar + elemen penunjuk pada produk",
          colorAccent: "#f43f5e"
        },
        {
          sceneId: "scene-2",
          title: `SCENE 2: DEMO B-ROLL (${ts(fb1, fb2)})`,
          timestamp: ts(fb1, fb2),
          materialType: "Video Asli Pendek (B-roll produk dipakai)",
          visualPrompt: `Transition into the real short B-roll footage of ${productName} actually being used — product being applied to skin / poured / swatched / unboxed in real life, close-up macro with real hand movement (not a static photo), showing texture and ${keyFeatures}. Shallow depth of field, clean studio lighting, smooth real motion, photorealistic 8k. Keep it the same product ${productName}.`,
          audioCue: "Subtle Bass Drop + Upbeat Music",
          voiceOverSegment: vo2,
          interactiveAction: "Zoom lambat pada tekstur produk saat dipakai",
          colorAccent: "#6366f1"
        },
        {
          sceneId: "scene-3",
          title: `SCENE 3: CTA & CHECKOUT (${ts(fb2, durFb)})`,
          timestamp: ts(fb2, durFb),
          materialType: "Foto Statis 2 (kemasan/klaim/BPOM)",
          textOverlay: `KLIK KERANJANG KUNING DI BAWAH! 👇`,
          visualPrompt: `Cut to the second static product photo of ${productName} showing packaging / BPOM claim / rating badge clearly, with a bold CTA text and an arrow pointing down to the shopping bag / yellow cart. Warm cinematic look, friendly inviting atmosphere, extremely clear detail, photorealistic 8k. Same product ${productName}, do not substitute.`,
          audioCue: "Ding Bell FX + Upbeat Outro",
          voiceOverSegment: vo3,
          interactiveAction: "Panah berkedip ke keranjang kuning + teks CTA",
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

// Endpoint 5: Verifikasi Merek Produk (AI brand guide untuk langkah verifikasi Shopee)
app.post("/api/verify-brands", async (req, res) => {
  try {
    const { productName, category, shopeeKeyword } = req.body;

    const prompt = `
      Kamu ahli produk affiliate Indonesia. Untuk produk "${productName || "produk ini"}" (kategori: ${category || "umum"}),
      sebutkan 5 MEREK / VARIAN yang populer & banyak dicari di Shopee/TikTok Shop Indonesia.

      Untuk tiap merek berikan:
      - brandName: nama merek/brand
      - productLabel: nama produk lengkap yang biasa dipakai di marketplace
      - estPrice: kisaran harga realistis (Rupiah)
      - rating: estimasi rating umum (contoh "4.8")
      - note: 1 kalimat kelebihan/karakter produknya
      - recommendation: untuk siapa/kapan produk ini paling cocok (1 kalimat)
      - shopeeKeyword: kata kunci spesifik untuk cari merek ini di Shopee

      PENTING: ini berdasarkan pengetahuan umum & tren, BUKAN data stok/harga real-time. Harga & ketersediaan wajib dicek langsung di Shopee.
      Balas JSON dengan properti 'brands' (array).
    `;

    const response = await generateWithFallback({
      contents: prompt,
      config: {
        responseMimeType: "application/json",
        responseSchema: {
          type: Type.OBJECT,
          properties: {
            brands: {
              type: Type.ARRAY,
              items: {
                type: Type.OBJECT,
                properties: {
                  brandName: { type: Type.STRING },
                  productLabel: { type: Type.STRING },
                  estPrice: { type: Type.STRING },
                  rating: { type: Type.STRING },
                  note: { type: Type.STRING },
                  recommendation: { type: Type.STRING },
                  shopeeKeyword: { type: Type.STRING },
                },
                required: ["brandName", "productLabel", "estPrice", "rating", "note", "recommendation", "shopeeKeyword"],
              },
            },
          },
          required: ["brands"],
        },
      },
    });

    const parsedData = JSON.parse(response.text || "{}");
    return res.json(parsedData);
  } catch (error: any) {
    console.warn("Error verifying brands, using fallback:", error?.message || error);
    const productName = req.body.productName || "Produk";
    const kw = req.body.shopeeKeyword || productName;
    return res.json({
      brands: [
        {
          brandName: "Varian Terlaris",
          productLabel: `${productName} (Best Seller)`,
          estPrice: "Rp25.000 - Rp80.000",
          rating: "4.8",
          note: "Varian paling banyak terjual dengan ulasan positif.",
          recommendation: "Cocok untuk pemula yang cari produk aman & teruji.",
          shopeeKeyword: `${kw} terlaris`,
        },
        {
          brandName: "Varian Official Store",
          productLabel: `${productName} (Official)`,
          estPrice: "Rp40.000 - Rp120.000",
          rating: "4.9",
          note: "Dijual langsung oleh toko resmi, keaslian terjamin.",
          recommendation: "Pilih ini kalau prioritas keaslian & garansi.",
          shopeeKeyword: `${kw} official store`,
        },
        {
          brandName: "Varian Hemat",
          productLabel: `${productName} (Promo)`,
          estPrice: "Rp15.000 - Rp45.000",
          rating: "4.7",
          note: "Harga paling ramah, sering ada promo & gratis ongkir.",
          recommendation: "Untuk yang cari harga termurah dengan kualitas layak.",
          shopeeKeyword: `${kw} murah`,
        },
      ],
      isFallback: true,
      errorDetail: error?.message || "Quota limit exceeded",
    });
  }
});

// Endpoint 7: Strategi AI Affiliate — rencana EKSEKUSI per fase menuju target komisi/bulan.
// Pola: insight → produksi → posting → evaluasi → ulang (ala "Strategi AI" clipper, versi affiliate).
app.post("/api/generate-strategy", async (req, res) => {
  try {
    const { targetRp, platform, niche, insights, accounts } = req.body;
    const target = Number(targetRp) > 0 ? Number(targetRp) : 2000000;
    const connectedAccounts = Number(accounts) > 0 ? Math.min(Number(accounts), 10) : 1;
    const insightList = Array.isArray(insights)
      ? insights.map((x: any) => String(x).trim()).filter(Boolean).slice(0, 15)
      : [];
    const plat = platform || "Shopee Video + Facebook Reels (utama), TikTok & YouTube Shorts (link di bio)";
    const nicheTxt = niche || "produk affiliate viral (skincare, household, gadget murah)";

    const prompt = `
      Kamu AHLI STRATEGI konten affiliate short-form Indonesia. Bikinkan rencana EKSEKUSI realistis & actionable
      (bahasa Indonesia santai, gaya mentor yang jujur) untuk seorang PEMULA SOLO yang mau cuan dari AFFILIATE lewat video pendek AI,
      yang kerja dengan MULTI-AKUN tapi bertahap.

      KONTEKS & REALITA (WAJIB dipakai):
      - Model cuan: KOMISI affiliate (per penjualan/checkout), BUKAN adsense views. Target: Rp ${target.toLocaleString("id-ID")}/bulan.
      - Platform & cara pasang link: Shopee Video (sematkan KERANJANG KUNING langsung), Facebook Reels (tempel link Shopee/Koleksiku di KOMENTAR PERTAMA), TikTok & YouTube Shorts (cukup pasang 1 link Koleksiku di BIO). Niche fokus: ${nicheTxt}.
      - KONDISI AKUN USER: baru ${connectedAccounts} akun yang benar-benar TERHUBUNG & siap pasang link affiliate${connectedAccounts === 1 ? " (1 pasang: Shopee + FB), 2 akun lain belum terhubung/masih baru" : ""}. Tool produksi: app "POS Video AI" + fitur ANTREAN (batch) buat bikin STOK prompt video sekaligus, generator Voice-Over + blueprint 9:16, "Prompt 1 Video" buat Google Flow/Veo, Riset Produk AI, Verifikasi Merek.
      - ATURAN KERAS MULTI-AKUN (WAJIB jadi inti strategi, kebawa ke aksi tiap fase):
        (1) Target posting 2-3 video/hari itu dipatok PER SATU AKUN. TAPI JANGAN langsung eksekusi di semua akun sekaligus kalau akun terhubung baru ${connectedAccounts}.
        (2) Strategi "1 Akun Utama + Warm-up": fokus upload HANYA di akun utama (yang udah terhubung) dulu sampai ritme & komisi kebukti. Akun ke-2 & ke-3 di-"hangatkan" 3-5 hari dulu (isi profil, aktivitas normal/scroll) biar gak kedeteksi bot spam Meta, SAMBIL beresin pendaftaran fitur affiliate/keranjangnya.
        (3) Volume akun utama: 2 video/hari (1 pagi jam 11.00-12.00, 1 malam jam 19.00-20.00). Tiap video di-distribusi ke Shopee Video + FB Reels + TikTok + Shorts dari STOK batch (video sama, upload native dari HP, jeda 3-4 jam).
        (4) Scale ke 2-3 akun (jadi 6 posting/hari) HANYA setelah akun utama kebukti ada komisi & akun 2-3 udah hangat + terhubung. Pas scale: tinggal DUPLIKASI video stok ke akun-akun itu.
        (5) WAJIB pasang link affiliate yang BENAR tiap posting (sesuai aturan per platform di atas). Video tanpa link = komisi nol.
        (6) Evaluasi pakai CTR (klik keranjang) + KONVERSI (checkout), bukan cuma views. Daur ulang = REMIX (ganti hook/angle/VO), jangan re-upload identik.
      - Ramp realistis: Minggu 1 = Rp 0, kuasai ritme 2 video/hari di 1 AKUN UTAMA + mulai warm-up akun 2-3. Minggu 2 = komisi pertama kecil, akun 2-3 mulai siap. Minggu 3 = aktifkan akun ke-2 (duplikasi stok), gandakan produk winner. Minggu 4 = jalan 2-3 akun, panen menuju target.
      ${insightList.length ? `\n      INSIGHT/CATATAN REAL dari user (WAJIB dipertimbangkan & sesuaikan plan-nya): ${insightList.map((x) => '"' + x.slice(0, 140) + '"').join("; ")}.\n` : ""}
      TUGAS: Buat 4 FASE (per minggu). Tiap fase: "week" (cth "Minggu 1"), "title", "focus" (1 kalimat), "targetRp" (angka rupiah kumulatif realistis fase itu), "targetSales" (perkiraan jumlah penjualan/checkout fase itu, angka), "actions" (3-5 aksi), dan "decision" (1 kalimat "kapan putuskan" lanjut/pivot/scale akun).
      TIAP AKSI tandai jenisnya: "harian" = berulang tiap hari (cth upload 1 video pagi + 1 malam ke 4 platform, bales komen) → tulis per-hari, JANGAN kasih angka total minggu. "sekali" = one-time (cth warm-up akun 2-3, daftar affiliate, setup etalase, pasang bio link, isi antrean batch).
      Aksi harus KECIL & FLEKSIBEL (jangan bikin user tertekan) dan SPESIFIK soal akun & platform (cth "upload stok ke Shopee Video + FB Reels di akun utama", "warm-up akun FB ke-2: isi profil + scroll 10 menit"). Sebut tool app ini & fitur Antrean di aksi yang relevan.

      Balas JSON dengan properti 'phases' (array) dan 'tips' (string 1-2 kalimat penutup).
    `;

    const response = await generateWithFallback({
      contents: prompt,
      config: {
        responseMimeType: "application/json",
        responseSchema: {
          type: Type.OBJECT,
          properties: {
            phases: {
              type: Type.ARRAY,
              items: {
                type: Type.OBJECT,
                properties: {
                  week: { type: Type.STRING },
                  title: { type: Type.STRING },
                  focus: { type: Type.STRING },
                  targetRp: { type: Type.NUMBER },
                  targetSales: { type: Type.NUMBER },
                  actions: {
                    type: Type.ARRAY,
                    items: {
                      type: Type.OBJECT,
                      properties: {
                        t: { type: Type.STRING },
                        kind: { type: Type.STRING },
                      },
                      required: ["t", "kind"],
                    },
                  },
                  decision: { type: Type.STRING },
                },
                required: ["week", "title", "focus", "targetRp", "targetSales", "actions", "decision"],
              },
            },
            tips: { type: Type.STRING },
          },
          required: ["phases", "tips"],
        },
      },
    });

    const parsed = JSON.parse(response.text || "{}");
    const phases = (parsed.phases || []).map((p: any) => ({
      ...p,
      actions: (p.actions || []).map((a: any) =>
        typeof a === "string"
          ? { t: a, kind: "sekali" }
          : { t: a.t || a.text || "", kind: a.kind === "harian" ? "harian" : "sekali" }
      ),
    }));
    return res.json({ phases, tips: parsed.tips || "", goalRp: target });
  } catch (error: any) {
    console.warn("Error generating strategy, using fallback:", error?.message || error);
    const target = Number(req.body?.targetRp) > 0 ? Number(req.body.targetRp) : 2000000;
    return res.json({
      goalRp: target,
      tips: "Jangan bebanin diri ngurus 3 akun sekaligus — kuasai ritme 2 video/hari di 1 akun utama dulu, akun 2-3 di-hangatkan sambil jalan. Begitu komisi masuk, tinggal duplikasi stok ke akun lain.",
      isFallback: true,
      errorDetail: error?.message || "Quota limit exceeded",
      phases: [
        {
          week: "Minggu 1",
          title: "Fase Fokus 1 Akun Utama + Warm-up",
          focus: "Kuasai ritme 2 video/hari HANYA di akun utama (Shopee + FB terhubung), sambil hangatkan akun 2-3.",
          targetRp: 0,
          targetSales: 0,
          actions: [
            { t: "Isi Antrean batch: generate stok 10-14 prompt video (2-3 produk, 1 niche) sekali duduk.", kind: "sekali" },
            { t: "Upload akun UTAMA: 1 video pagi (11.00-12.00) + 1 malam (19.00-20.00) ke Shopee Video + FB Reels + TikTok + Shorts.", kind: "harian" },
            { t: "Pasang link bener tiap posting: keranjang kuning di Shopee Video, link di komen pertama FB Reels, link Koleksiku di bio TikTok/Shorts.", kind: "harian" },
            { t: "Warm-up akun FB/Shopee ke-2 & ke-3: isi profil + aktivitas normal 10 menit, JANGAN diisi video affiliate dulu.", kind: "harian" },
            { t: "Beresin pendaftaran fitur affiliate/keranjang buat akun ke-2 & ke-3.", kind: "sekali" },
          ],
          decision: "Akhir Minggu 1: kalau ritme 2 video/hari di akun utama udah lancar & akun 2-3 udah 3-5 hari warm-up → siap lanjut. Jangan buka akun baru kalau ritme akun utama belum stabil.",
        },
        {
          week: "Minggu 2",
          title: "Fase Validasi Pola & Komisi Pertama",
          focus: "Masih fokus akun utama: gandakan hook yang nahan penonton & kejar klik keranjang pertama.",
          targetRp: Math.round(target * 0.1),
          targetSales: 2,
          actions: [
            { t: "Replikasi 3-5 variasi dari video terbaik (remix hook & angle, jangan re-upload identik).", kind: "harian" },
            { t: "Lanjut 2 video/hari di akun utama ke 4 platform + bales komen 'link?' arahkan ke keranjang.", kind: "harian" },
            { t: "Catat CTR (klik keranjang) & konversi per video, bukan cuma views.", kind: "harian" },
            { t: "Pastikan akun ke-2 udah hangat & fitur affiliate-nya aktif (siap dipakai minggu depan).", kind: "sekali" },
          ],
          decision: "Ada klik tapi nol checkout → cek harga/trust produk. Komisi mulai masuk & akun ke-2 siap → minggu depan aktifkan akun ke-2.",
        },
        {
          week: "Minggu 3",
          title: "Fase Aktifkan Akun ke-2 (Duplikasi Stok)",
          focus: "Mulai jalan 2 akun: duplikasi video stok ke akun ke-2 yang udah hangat & terhubung.",
          targetRp: Math.round(target * 0.35),
          targetSales: 8,
          actions: [
            { t: "Duplikasi video winner dari stok ke akun ke-2 (2 video/hari, pasang link sesuai platform).", kind: "harian" },
            { t: "Tetap jalanin akun utama 2 video/hari — total jadi ~4 posting/hari (±10-15 menit).", kind: "harian" },
            { t: "Tambah 1-2 produk baru di niche sama lewat Riset Produk AI → isi Antrean lagi.", kind: "sekali" },
          ],
          decision: "Akhir Minggu 3: kalau 2 akun stabil & komisi naik → siapkan akun ke-3. Kalau kewalahan → tahan di 2 akun dulu, jangan maksa.",
        },
        {
          week: "Minggu 4",
          title: "Fase Panen 2-3 Akun & Optimasi",
          focus: "Jalankan 2-3 akun (duplikasi stok yang sama) + dorong produk winner menuju target bulanan.",
          targetRp: target,
          targetSales: 20,
          actions: [
            { t: "Aktifkan akun ke-3 kalau udah hangat & terhubung: duplikasi stok → 2 video/hari × 3 akun = 6 posting/hari.", kind: "harian" },
            { t: "Dorong produk winner pas momen belanja (tanggal kembar, gajian, flash sale) di semua akun.", kind: "harian" },
            { t: "Evaluasi menyeluruh: akun/produk/hook mana paling banyak komisi → cetak biru SOP bulan depan.", kind: "sekali" },
          ],
          decision: "Nyentuh target → kunci jadi SOP (stok batch → distribusi 6 posting/hari). Belum → fokusin tenaga ke akun & produk yang komisinya paling gede.",
        },
      ],
    });
  }
});

// Endpoint 6: Ambil gambar dari URL (paste link foto produk) -> base64 (hindari CORS browser)
app.post("/api/fetch-image", async (req, res) => {
  try {
    const { url } = req.body;
    if (!url || typeof url !== "string" || !/^https?:\/\//i.test(url)) {
      return res.status(400).json({ error: "URL gambar tidak valid (harus diawali http/https)." });
    }

    const imgResp = await fetch(url, {
      headers: {
        // Sebagian CDN (termasuk Shopee) butuh UA & referer wajar biar ngasih gambar.
        "User-Agent": "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0 Safari/537.36",
        "Accept": "image/avif,image/webp,image/png,image/jpeg,*/*",
      },
    });

    if (!imgResp.ok) {
      return res.status(502).json({ error: `Gagal ambil gambar (HTTP ${imgResp.status}). Pastikan link mengarah langsung ke file gambar.` });
    }

    const contentType = imgResp.headers.get("content-type") || "";
    if (!contentType.startsWith("image/")) {
      return res.status(415).json({ error: "Link bukan gambar langsung. Klik kanan foto produk di Shopee → 'Salin alamat gambar'." });
    }

    const arrayBuf = await imgResp.arrayBuffer();
    const sizeMB = arrayBuf.byteLength / (1024 * 1024);
    if (sizeMB > 12) {
      return res.status(413).json({ error: "Ukuran gambar terlalu besar (maks 12MB)." });
    }

    const base64 = Buffer.from(arrayBuf).toString("base64");
    return res.json({
      base64,
      mimeType: contentType,
      dataUrl: `data:${contentType};base64,${base64}`,
    });
  } catch (error: any) {
    console.warn("Error fetching image:", error?.message || error);
    return res.status(500).json({ error: "Gagal memuat gambar dari URL. Coba upload manual atau pakai link lain." });
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
