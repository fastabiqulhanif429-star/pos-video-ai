export interface ProductTemplate {
  id: string;
  name: string;
  category: string;
  imageUrl: string;
  analysis: {
    productName: string;
    targetAudience: string;
    keyFeatures: string;
    colorsDetected: string[];
  };
  draftVoiceOver: string;
  blueprint: {
    visualAesthetic: string;
    textOverlayStyle: string;
    scenes: {
      sceneId: string;
      title: string;
      timestamp: string;
      textOverlay: string;
      visualPrompt: string;
      audioCue: string;
      voiceOverSegment: string;
      interactiveAction: string;
      colorAccent: string;
    }[];
  };
}

export const PRODUCT_TEMPLATES: ProductTemplate[] = [
  {
    id: "coral-blazer",
    name: "Blazer Warna Coral",
    category: "Fashion Wanita",
    imageUrl: "https://images.unsplash.com/photo-1591047139829-d91aecb6caea?w=600&auto=format&fit=crop&q=80",
    analysis: {
      productName: "Blazer Warna Coral",
      targetAudience: "Wanita muda hingga dewasa, berhijab, yang mencari blazer modis untuk tampilan profesional atau smart casual, serta menyukai warna cerah dan desain stylish.",
      keyFeatures: "Blazer dengan warna coral yang cerah dan menonjol, memiliki tekstur bahan yang unik, serta didesain dengan potongan longgar (oversized) dan kancing emas di manset.",
      colorsDetected: ["Coral Orange", "Gold Accent", "Soft Pearl"]
    },
    draftVoiceOver: "Sumpah ini blazer warna coral racun banget! Bikin outfit kamu auto stylish dan makin ceria. Desain longgar dan bahannya nyaman seharian. Wajib punya, buruan checkout!",
    blueprint: {
      visualAesthetic: "Pencahayaan studio cerah, kontras tinggi dengan palet warna hangat (coral/emas). Transisi cepat bergaya pop-up dengan efek transparan ceria.",
      textOverlayStyle: "Gaya Sketch: Font Space Grotesk tebal dengan coretan tangan estetik bergaya kreatif di sekeliling teks.",
      scenes: [
        {
          sceneId: "scene-1",
          title: "SCENE 1: HOOK",
          timestamp: "0.0s - 3.0s",
          textOverlay: "OOTD Spill! ✨",
          visualPrompt: "Close up shot of a stylish woman wearing a bright coral oversized blazer, smiling confidently at the camera, light background, high fashion editorial style, 9:16 vertical ratio.",
          audioCue: "Swoosh FX",
          voiceOverSegment: "Sumpah ini blazer warna coral racun banget! Bikin outfit kamu auto stylish...",
          interactiveAction: "Pop-up stiker jempol atas di pojok kanan bawah",
          colorAccent: "#f43f5e"
        },
        {
          sceneId: "scene-2",
          title: "SCENE 2: DETAIL VALUE",
          timestamp: "3.0s - 12.0s",
          textOverlay: "Premium Fabric & Gold Button 🧵",
          visualPrompt: "Macro detailed pan shot showing the unique texture of the coral fabric and shining gold buttons on the blazer cuff, organic hand movement, cinematic soft lighting, 9:16 vertical ratio.",
          audioCue: "Fitur Dinamik",
          voiceOverSegment: "...dan makin ceria. Desain longgar dan bahannya nyaman seharian. Wajib punya...",
          interactiveAction: "Highlight teks 'Bahan Premium' dengan efek berkilau",
          colorAccent: "#fbbf24"
        },
        {
          sceneId: "scene-3",
          title: "SCENE 3: CTA",
          timestamp: "12.0s - 15.0s",
          textOverlay: "Klik Keranjang! 🛒",
          visualPrompt: "Model pointing down towards the shopping bag overlay with an energetic expression, text overlay 'Checkout Sekarang' appears on screen, vibrant warm atmosphere, 9:16 vertical ratio.",
          audioCue: "Ding FX",
          voiceOverSegment: "...buruan checkout sekarang juga!",
          interactiveAction: "Keranjang Kuning Affiliate berkedip-kedip",
          colorAccent: "#10b981"
        }
      ]
    }
  },
  {
    id: "stainless-tumbler",
    name: "Tumbler Aesthetic Minimalis",
    category: "Perlengkapan Rumah",
    imageUrl: "https://images.unsplash.com/photo-1602143407151-7111542de6e8?w=600&auto=format&fit=crop&q=80",
    analysis: {
      productName: "Tumbler Stainless Aesthetic",
      targetAudience: "Pelajar, mahasiswa, pekerja kantor, dan pencinta gaya hidup ramah lingkungan serta praktis namun tetap mementingkan estetika visual.",
      keyFeatures: "Botol minum stainless steel dengan lapisan powder coating dove anti-gores, segel anti-bocor silikon, dan kemampuan menjaga suhu dingin/panas hingga 12 jam.",
      colorsDetected: ["Beige Pastel", "Matte Off-white", "Silver Metallic"]
    },
    draftVoiceOver: "Tumbler aesthetic ini beneran penyelamat dehidrasi! Desainnya minimalis, anti bocor, dan dinginnya awet seharian. Pas banget buat nemenin nugas atau kerja. Cek keranjang sekarang!",
    blueprint: {
      visualAesthetic: "Gaya bersih, minimalis Jepang, pencahayaan soft alami dari jendela, transisi lembar halaman (wipe) lambat dengan nuansa tenang.",
      textOverlayStyle: "Gaya Cyber: Font monospaced modern dengan pancaran lampu neon tipis di sisi luar teks.",
      scenes: [
        {
          sceneId: "scene-1",
          title: "SCENE 1: HOOK",
          timestamp: "0.0s - 3.0s",
          textOverlay: "Estetik Parah! 🧊",
          visualPrompt: "Cinematic flat lay of a matte beige tumbler standing elegantly on a wooden desk next to a green plant, soft morning sunshine, modern minimalist kitchen, vertical 9:16.",
          audioCue: "Ice Clinking Sound",
          voiceOverSegment: "Tumbler aesthetic ini beneran penyelamat dehidrasi! Desainnya minimalis...",
          interactiveAction: "Stiker dingin/es di layar",
          colorAccent: "#38bdf8"
        },
        {
          sceneId: "scene-2",
          title: "SCENE 2: DETAIL VALUE",
          timestamp: "3.0s - 12.0s",
          textOverlay: "12H Cold Insulation ❄️",
          visualPrompt: "Close-up of cold water being poured into the tumbler, slow motion water droplets on the matte surface, showcasing the anti-leak silicone seal lock mechanism, high quality 9:16.",
          audioCue: "Water Pouring FX",
          voiceOverSegment: "...anti bocor, dan dinginnya awet seharian. Pas banget buat nemenin nugas atau kerja.",
          interactiveAction: "Indikator temperatur dingin digital berkedip",
          colorAccent: "#60a5fa"
        },
        {
          sceneId: "scene-3",
          title: "SCENE 3: CTA",
          timestamp: "12.0s - 15.0s",
          textOverlay: "Diskon 50% Hari Ini! 🛍️",
          visualPrompt: "A hand grabbing the tumbler and taking a sip happily, transitioning into a bright layout showing a limited flash sale countdown and direct click sign, vertical 9:16.",
          audioCue: "Cash Register Chime",
          voiceOverSegment: "Yuk amankan warna favoritmu, cek keranjang kuning sekarang juga!",
          interactiveAction: "Keranjang Kuning Affiliate menyala jingga",
          colorAccent: "#f43f5e"
        }
      ]
    }
  },
  {
    id: "retro-running-shoes",
    name: "Sepatu Running Retro",
    category: "Olahraga & Sepatu",
    imageUrl: "https://images.unsplash.com/photo-1542291026-7eec264c27ff?w=600&auto=format&fit=crop&q=80",
    analysis: {
      productName: "Sepatu Running Retro",
      targetAudience: "Pencinta gaya hidup aktif, pelaku olahraga lari kasual, dan pemuda pengikut tren fashion retro street-style modern.",
      keyFeatures: "Sepatu lari ringan dengan sol berbusa empuk bermaterial breathable mesh, jahitan retro klasik, dan cengkeraman karet karet anti slip yang kuat.",
      colorsDetected: ["Crimson Red", "Creamy White", "Carbon Black"]
    },
    draftVoiceOver: "Gak usah pusing nyari sepatu kece buat lari! Sepatu running retro ini super empuk, gak bikin kaki capek, dan desainnya stylish parah buat nongkrong. Sikat sebelum kehabisan!",
    blueprint: {
      visualAesthetic: "Gaya retro jalanan kota malam hari, berpasir (grainy), gerakan kamera dinamis berguncang (shaky cam), transisi potong cepat (hard cuts).",
      textOverlayStyle: "Gaya Punch: Font sans-serif ekstra tebal dengan stroke luar hitam pekat bergaya komik/manga pop.",
      scenes: [
        {
          sceneId: "scene-1",
          title: "SCENE 1: HOOK",
          timestamp: "0.0s - 3.0s",
          textOverlay: "Auto Ganteng/Cantik! 👟",
          visualPrompt: "Low angle slow-motion shot of a runner taking off from a concrete city pavement, wearing retro red and cream sneakers, camera following the foot movement, urban street vibe, 9:16.",
          audioCue: "Bass Drop FX",
          voiceOverSegment: "Gak usah pusing nyari sepatu kece buat lari! Sepatu running retro ini super empuk...",
          interactiveAction: "Teks pop-up 'Retro Vibe' di sebelah sepatu",
          colorAccent: "#ef4444"
        },
        {
          sceneId: "scene-2",
          title: "SCENE 2: DETAIL VALUE",
          timestamp: "3.0s - 12.0s",
          textOverlay: "Ultra-Soft Cushioning ☁️",
          visualPrompt: "Extreme close-up showing a hand pressing the ultra-bouncy shoe sole, demonstrating the high flexibility and mesh breathing holes of the upper shoe, bright daylight, 9:16.",
          audioCue: "Air Puff FX",
          voiceOverSegment: "...gak bikin kaki capek, dan desainnya stylish parah buat nongkrong. Sikat...",
          interactiveAction: "Efek visual gelombang memantul dari sol",
          colorAccent: "#f59e0b"
        },
        {
          sceneId: "scene-3",
          title: "SCENE 3: CTA",
          timestamp: "12.0s - 15.0s",
          textOverlay: "Amankan Ukuranmu! 🛒",
          visualPrompt: "Side profile shot of a person confidently stepping onto a skateboard or curb, with dynamic typography popping on the screen calling to action, fast transition to buy, 9:16.",
          audioCue: "Rewind Scratch FX",
          voiceOverSegment: "...sebelum kehabisan stok, langsung klik keranjang kuning sekarang!",
          interactiveAction: "Keranjang Kuning Affiliate berdetak (pulse)",
          colorAccent: "#10b981"
        }
      ]
    }
  }
];
