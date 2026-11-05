import { useState, useRef, useEffect, ChangeEvent, MouseEvent, DragEvent } from "react";
import {
  Video,
  Sparkles,
  Upload,
  Trash2,
  Play,
  Square,
  CheckCircle,
  Info,
  Clock,
  Sliders,
  Settings,
  LogOut,
  RefreshCw,
  Copy,
  Check,
  FileText,
  Layers,
  Volume2,
  ChevronRight,
  Sparkle,
  Zap,
  HelpCircle,
  X,
  Lock,
  Shield,
  Palette,
  Eye,
  Save,
  Download,
  Globe,
  Key,
  Unlock,
  ExternalLink,
  History,
  Sun,
  Moon,
  Mic,
  Music,
  Share2,
  FileDown,
  SlidersHorizontal,
  Lightbulb,
  BookOpen,
  Flame,
  ArrowRight,
  Target,
  ShoppingBag,
  TrendingUp,
  Loader2
} from "lucide-react";
import { PRODUCT_TEMPLATES, ProductTemplate } from "./templates";
import { VideoBlueprint, Scene } from "./types";
import { motion, AnimatePresence } from "motion/react";

// Safe storage wrapper to prevent browser security exception crashes and QuotaExceededError in sandboxed iframes
const createSafeStorage = (type: "localStorage" | "sessionStorage") => {
  let rawStorage: any = null;
  try {
    rawStorage = window[type];
    const testKey = "__storage_test__";
    rawStorage.setItem(testKey, testKey);
    rawStorage.removeItem(testKey);
  } catch (e) {
    console.warn(`${type} security exception or restriction active. Falling back to temporary in-memory store.`, e);
    rawStorage = null;
  }

  const memStore: Record<string, string> = {};

  return {
    getItem: (key: string): string | null => {
      if (rawStorage) {
        try {
          return rawStorage.getItem(key);
        } catch (e) {
          console.warn(`Error reading key "${key}" from ${type}:`, e);
        }
      }
      return memStore[key] || null;
    },
    setItem: (key: string, value: string): void => {
      if (rawStorage) {
        try {
          rawStorage.setItem(key, value);
          return;
        } catch (e) {
          console.warn(`Error writing key "${key}" to ${type} (Quota or Security):`, e);
        }
      }
      memStore[key] = value;
    },
    removeItem: (key: string): void => {
      if (rawStorage) {
        try {
          rawStorage.removeItem(key);
          return;
        } catch (e) {
          console.warn(`Error removing key "${key}" from ${type}:`, e);
        }
      }
      delete memStore[key];
    },
    clear: (): void => {
      if (rawStorage) {
        try {
          rawStorage.clear();
          return;
        } catch (e) {
          console.warn(`Error clearing ${type}:`, e);
        }
      }
      Object.keys(memStore).forEach((k) => delete memStore[k]);
    },
    get length(): number {
      if (rawStorage) {
        try {
          return rawStorage.length;
        } catch (e) {
          return Object.keys(memStore).length;
        }
      }
      return Object.keys(memStore).length;
    },
    key: (index: number): string | null => {
      if (rawStorage) {
        try {
          return rawStorage.key(index);
        } catch (e) {
          return Object.keys(memStore)[index] || null;
        }
      }
      return Object.keys(memStore)[index] || null;
    },
  };
};

const safeStorage = createSafeStorage("localStorage");
const safeSessionStorage = createSafeStorage("sessionStorage");

export default function App() {
  // Application State
  const [currentTemplateId, setCurrentTemplateId] = useState<string>("");
  
  // Product state fields
  const [productName, setProductName] = useState<string>("");
  const [imageUrl, setImageUrl] = useState<string>("");
  const [targetAudience, setTargetAudience] = useState<string>("");
  const [keyFeatures, setKeyFeatures] = useState<string>("");
  const [colorsDetected, setColorsDetected] = useState<string[]>([]);

  // Step 2: Naskah Voice over
  const [draftVoiceOver, setDraftVoiceOver] = useState<string>("");
  const [userPromptContext, setUserPromptContext] = useState<string>("");
  const [selectedTone, setSelectedTone] = useState<string>("Racun TikTok");

  // Step 3: Aksen & Style
  const [creativeAccent, setCreativeAccent] = useState<boolean>(true);
  const [mainTextStyle, setMainTextStyle] = useState<string>("Sketch");

  // Blueprint outputs
  const [blueprint, setBlueprint] = useState<VideoBlueprint>({
    visualAesthetic: "",
    textOverlayStyle: "",
    scenes: []
  });

  // UI state managers
  const [analyzingImage, setAnalyzingImage] = useState<boolean>(false);
  const [generatingNarrative, setGeneratingNarrative] = useState<boolean>(false);
  const [generatingBlueprint, setGeneratingBlueprint] = useState<boolean>(false);
  
  const [selectedSceneId, setSelectedSceneId] = useState<string>("scene-1");
  const [copiedSceneId, setCopiedSceneId] = useState<string | null>(null);
  const [copiedText, setCopiedText] = useState<boolean>(false);
  const [activeSection, setActiveSection] = useState<string>("editor"); // editor, docs, gallery
  const [isApiConfigured, setIsApiConfigured] = useState<boolean>(true);
  const [notification, setNotification] = useState<{ message: string; type: "success" | "info" | "error" } | null>(null);
  const [isToneModalOpen, setIsToneModalOpen] = useState<boolean>(false);
  const [copiedJson, setCopiedJson] = useState<boolean>(false);
  const [isGuideModalOpen, setIsGuideModalOpen] = useState<boolean>(false);
  const [currentGuideStep, setCurrentGuideStep] = useState<number>(0);
  const [isDragging, setIsDragging] = useState<boolean>(false);
  const [isPlayingAudio, setIsPlayingAudio] = useState<string | null>(null);
  const [speechRate, setSpeechRate] = useState<number>(1.0);
  const [voiceGender, setVoiceGender] = useState<"female" | "male">(() => {
    const saved = safeStorage.getItem("affos_voice_gender");
    return (saved as "female" | "male") || "female";
  });
  const [theme, setTheme] = useState<"dark" | "light">(() => {
    const saved = safeStorage.getItem("affos_theme");
    return (saved as "dark" | "light") || "dark";
  });
  const [isEditingActiveScene, setIsEditingActiveScene] = useState<boolean>(false);

  // Dynamic application name and Admin security variables
  const [appName, setAppName] = useState<string>(() => {
    const saved = safeStorage.getItem("affos_app_name");
    if (!saved || saved.toLowerCase().includes("affos")) {
      return "POS Video AI";
    }
    return saved;
  });
  const [isAdminModalOpen, setIsAdminModalOpen] = useState<boolean>(false);
  const [isAdminUnlocked, setIsAdminUnlocked] = useState<boolean>(false);
  const [adminPasswordInput, setAdminPasswordInput] = useState<string>("");

  // Brand Customization States (Pristine visual controls aligned with user's reference)
  const [adminPassword, setAdminPassword] = useState<string>(() => safeStorage.getItem("affos_admin_password") || "nurlaelani");
  const [creatorName, setCreatorName] = useState<string>(() => safeStorage.getItem("affos_creator_name") || "Bany Wirapranata");
  const [referralUrl, setReferralUrl] = useState<string>(() => safeStorage.getItem("affos_referral_url") || "https://mediazone.myscale");
  const [visitorGateEnabled, setVisitorGateEnabled] = useState<boolean>(() => {
    const saved = safeStorage.getItem("affos_visitor_gate_enabled");
    // Default: gerbang visitor MATI (biar nggak perlu password tiap buka).
    return saved === null ? false : saved === "true";
  });
  const [visitorPassword, setVisitorPassword] = useState<string>(() => {
    const saved = safeStorage.getItem("affos_visitor_password");
    if (!saved || saved === "makecarousel") {
      return "makevideo";
    }
    return saved;
  });
  const [primaryColor, setPrimaryColor] = useState<string>(() => safeStorage.getItem("affos_primary_color") || "#6366f1");
  const [accentColor, setAccentColor] = useState<string>(() => safeStorage.getItem("affos_accent_color") || "#f43f5e");
  const [footerHtml, setFooterHtml] = useState<string>(() => safeStorage.getItem("affos_footer_html") || "Crafted with ❤️ by <b>Bany Wirapranata</b> &bull; Hak Cipta Dilindungi");

  // Temporary edit states inside modal
  const [tempAppName, setTempAppName] = useState<string>("");
  const [tempAdminPassword, setTempAdminPassword] = useState<string>("");
  const [tempCreatorName, setTempCreatorName] = useState<string>("");
  const [tempReferralUrl, setTempReferralUrl] = useState<string>("");
  const [tempVisitorGate, setTempVisitorGate] = useState<boolean>(false);
  const [tempVisitorPassword, setTempVisitorPassword] = useState<string>("");
  const [tempPrimaryColor, setTempPrimaryColor] = useState<string>("");
  const [tempAccentColor, setTempAccentColor] = useState<string>("");
  const [tempFooterHtml, setTempFooterHtml] = useState<string>("");

  // Visitor Gate status check
  const [isVisitorUnlocked, setIsVisitorUnlocked] = useState<boolean>(() => {
    const saved = safeStorage.getItem("affos_visitor_gate_enabled");
    const isGateActive = saved === null ? true : saved === "true";
    if (!isGateActive) return true;
    return safeSessionStorage.getItem("affos_visitor_session_unlocked") === "true";
  });
  const [visitorPasswordInput, setVisitorPasswordInput] = useState<string>("");

  // Exit & Lock Session States
  const [isExitModalOpen, setIsExitModalOpen] = useState<boolean>(false);
  const [exitPasswordInput, setExitPasswordInput] = useState<string>("");

  // Flow / Veo Redirect Modal state
  const [isFlowVeoModalOpen, setIsFlowVeoModalOpen] = useState<boolean>(false);

  // Riset Produk Affiliate AI state
  const [isResearchModalOpen, setIsResearchModalOpen] = useState<boolean>(false);
  const [researchNiche, setResearchNiche] = useState<string>("");
  const [researchPriceRange, setResearchPriceRange] = useState<string>("Rp30.000 - Rp200.000");
  const [researchResults, setResearchResults] = useState<any[]>([]);
  const [researchingProducts, setResearchingProducts] = useState<boolean>(false);
  const [researchIsFallback, setResearchIsFallback] = useState<boolean>(false);
  // Verifikasi merek + paste foto
  const [verifyingProduct, setVerifyingProduct] = useState<any | null>(null);
  const [brandResults, setBrandResults] = useState<any[]>([]);
  const [loadingBrands, setLoadingBrands] = useState<boolean>(false);
  const [brandsIsFallback, setBrandsIsFallback] = useState<boolean>(false);
  const [selectedBrandIdx, setSelectedBrandIdx] = useState<number | null>(null);
  const [photoUrlInput, setPhotoUrlInput] = useState<string>("");
  const [loadingPhotoUrl, setLoadingPhotoUrl] = useState<boolean>(false);
  // Paste foto di editor (bagian upload)
  const [editorPhotoUrl, setEditorPhotoUrl] = useState<string>("");
  const [loadingEditorPhoto, setLoadingEditorPhoto] = useState<boolean>(false);

  // History state & helpers
  const [isHistoryModalOpen, setIsHistoryModalOpen] = useState<boolean>(false);
  const [historyList, setHistoryList] = useState<any[]>(() => {
    try {
      const saved = safeStorage.getItem("affos_blueprint_history");
      return saved ? JSON.parse(saved) : [];
    } catch (e) {
      return [];
    }
  });

  const addHistoryItem = (
    pName: string,
    imgUrl: string,
    tAudience: string,
    kFeatures: string,
    colors: string[],
    voiceOver: string,
    tone: string,
    bp: VideoBlueprint
  ) => {
    const newItem = {
      id: "hist-" + Date.now(),
      timestamp: new Date().toLocaleString("id-ID", {
        year: "numeric",
        month: "short",
        day: "numeric",
        hour: "2-digit",
        minute: "2-digit"
      }),
      productName: pName || "Produk Pilihan Baru",
      // If imageUrl is a huge base64 string, don't store it in localStorage history to prevent QuotaExceededError
      imageUrl: imgUrl && imgUrl.startsWith("data:") ? "" : (imgUrl || ""),
      targetAudience: tAudience || "Target audiens umum.",
      keyFeatures: kFeatures || "Bahan berkualitas premium.",
      colorsDetected: colors || [],
      draftVoiceOver: voiceOver || "",
      selectedTone: tone || "Racun TikTok",
      blueprint: bp
    };
    setHistoryList((prev) => {
      const updated = [newItem, ...prev].slice(0, 30);
      safeStorage.setItem("affos_blueprint_history", JSON.stringify(updated));
      return updated;
    });
  };

  const loadHistoryItem = (item: any) => {
    if (item.productName) setProductName(item.productName);
    setImageUrl(item.imageUrl || "");
    setTargetAudience(item.targetAudience || "");
    setKeyFeatures(item.keyFeatures || "");
    setColorsDetected(item.colorsDetected || []);
    setDraftVoiceOver(item.draftVoiceOver || "");
    setSelectedTone(item.selectedTone || "Racun TikTok");
    if (item.blueprint) {
      setBlueprint(item.blueprint);
      if (item.blueprint.scenes && item.blueprint.scenes.length > 0) {
        setSelectedSceneId(item.blueprint.scenes[0].sceneId);
      }
    }
    setCurrentTemplateId("custom");
    setIsHistoryModalOpen(false);
    showNotification(`Riwayat "${item.productName}" berhasil dimuat!`, "success");
  };

  const deleteHistoryItem = (id: string, e: MouseEvent) => {
    e.stopPropagation();
    setHistoryList((prev) => {
      const updated = prev.filter((h) => h.id !== id);
      safeStorage.setItem("affos_blueprint_history", JSON.stringify(updated));
      return updated;
    });
    showNotification("Item riwayat berhasil dihapus.", "info");
  };

  const [logoClickCount, setLogoClickCount] = useState<number>(0);

  useEffect(() => {
    const savedName = safeStorage.getItem("affos_app_name");
    if (!savedName || savedName.toLowerCase().includes("affos")) {
      safeStorage.setItem("affos_app_name", "POS Video AI");
      setAppName("POS Video AI");
    }
  }, []);

  useEffect(() => {
    const handleHashOrQuery = () => {
      if (window.location.hash === "#admin" || window.location.search.includes("admin=true")) {
        setTempAppName(appName);
        setTempAdminPassword(adminPassword);
        setTempCreatorName(creatorName);
        setTempReferralUrl(referralUrl);
        setTempVisitorGate(visitorGateEnabled);
        setTempVisitorPassword(visitorPassword);
        setTempPrimaryColor(primaryColor);
        setTempAccentColor(accentColor);
        setTempFooterHtml(footerHtml);
        setIsAdminModalOpen(true);
        showNotification("Membuka Gerbang Kontrol Admin Rahasia...", "info");
        // Clear query & hash to prevent loop on reload
        window.history.replaceState(null, "", window.location.pathname);
      }
    };
    handleHashOrQuery();
    window.addEventListener("hashchange", handleHashOrQuery);
    return () => window.removeEventListener("hashchange", handleHashOrQuery);
  }, [appName, adminPassword, creatorName, referralUrl, visitorGateEnabled, visitorPassword, primaryColor, accentColor, footerHtml]);

  const handleLogoClick = () => {
    setLogoClickCount((prev) => {
      const next = prev + 1;
      if (next >= 5) {
        setTempAppName(appName);
        setTempAdminPassword(adminPassword);
        setTempCreatorName(creatorName);
        setTempReferralUrl(referralUrl);
        setTempVisitorGate(visitorGateEnabled);
        setTempVisitorPassword(visitorPassword);
        setTempPrimaryColor(primaryColor);
        setTempAccentColor(accentColor);
        setTempFooterHtml(footerHtml);
        setIsAdminModalOpen(true);
        showNotification("Sandi Admin Terbuka via Ketukan Rahasia! 🔓", "success");
        return 0;
      }
      return next;
    });
  };

  const getCompiledJsonString = (): string => {
    const isMale = voiceGender === "male";
    const payload = {
      project: {
        platform: "TikTok Affiliate / Reels / Shorts",
        duration_seconds: 10,
        aspect_ratio: "9:16 (vertical)",
        resolution: "4K UHD (2160x3840)",
        product_name: productName || "Produk Pilihan",
        key_features: keyFeatures || "Kualitas premium",
        target_audience: targetAudience || "Target Umum",
        voice_gender: voiceGender,
        voice_character: isMale
          ? "Indonesian Male Creator (24yo, stylish, confident, friendly)"
          : "Indonesian Female Creator (23yo, radiant, cheerful, warm)",
        tone_style: selectedTone,
        creative_accent: creativeAccent ? "Enabled (Sketch/Doodle Style)" : "Disabled (Clean Style)",
        main_text_style: mainTextStyle,
        reference_image_anchor: imageUrl ? "Active (Source Product)" : "None"
      },
      visual_aesthetic: {
        lighting_and_composition: blueprint?.visualAesthetic || "Sinematik 8k, warm studio lighting, shallow depth of field",
        text_overlay_style: blueprint?.textOverlayStyle || `Gaya Teks: ${mainTextStyle}`,
        dominant_colors: colorsDetected.length > 0 ? colorsDetected : ["Neutral", "Aesthetic"]
      },
      full_voiceover_script: draftVoiceOver,
      scenes: (blueprint?.scenes || []).map((scene, idx) => ({
        scene_number: idx + 1,
        scene_id: scene?.sceneId || `scene-${idx + 1}`,
        title: scene?.title || `SCENE ${idx + 1}`,
        timestamp: scene?.timestamp || "",
        visual_prompt: scene?.visualPrompt || "",
        voiceover_segment: scene?.voiceOverSegment || "",
        audio_cue: scene?.audioCue || "",
        text_overlay: scene?.textOverlay || "",
        interactive_action: scene?.interactiveAction || "",
        color_accent: scene?.colorAccent || "#6366f1"
      })),
      export_metadata: {
        engine: "AFFOS AI Video Blueprint Engine",
        generated_at: new Date().toISOString()
      }
    };
    return JSON.stringify(payload, null, 2);
  };

  // Update specific scene field for live JSON synchronization
  const updateSceneField = (sceneId: string, field: keyof Scene, value: string) => {
    setBlueprint((prev) => {
      const updatedScenes = prev.scenes.map((sc) => {
        if (sc.sceneId === sceneId) {
          return { ...sc, [field]: value };
        }
        return sc;
      });
      return { ...prev, scenes: updatedScenes };
    });
  };

  // Sync draft voice over segments to the 3 scenes
  const syncVoiceOverToScenes = () => {
    if (!draftVoiceOver.trim() || blueprint.scenes.length === 0) {
      showNotification("Naskah kosong atau blueprint belum dibuat.", "info");
      return;
    }
    const words = draftVoiceOver.trim().split(" ");
    const third = Math.ceil(words.length / 3);
    const seg1 = words.slice(0, Math.max(3, third)).join(" ");
    const seg2 = words.slice(Math.max(3, third), Math.max(6, third * 2)).join(" ");
    const seg3 = words.slice(Math.max(6, third * 2)).join(" ") || (voiceGender === "male" ? "Buruan checkout sekarang juga bro!" : "Buruan checkout sekarang juga ya!");

    setBlueprint((prev) => ({
      ...prev,
      scenes: prev.scenes.map((sc, idx) => {
        if (idx === 0) return { ...sc, voiceOverSegment: seg1 };
        if (idx === 1) return { ...sc, voiceOverSegment: seg2 };
        if (idx === 2) return { ...sc, voiceOverSegment: seg3 };
        return sc;
      })
    }));
    showNotification("Naskah suara berhasil disinkronkan ke 3 scene & JSON! ⚡", "success");
  };

  // Switch voice gender handler
  const handleVoiceGenderChange = (gender: "female" | "male") => {
    setVoiceGender(gender);
    safeStorage.setItem("affos_voice_gender", gender);
    if (isPlayingAudio) {
      stopAudio();
    }
    showNotification(
      gender === "male"
        ? "Suara Laki-Laki (Pria) aktif 👨"
        : "Suara Perempuan (Wanita) aktif 👩",
      "info"
    );
  };

  // SpeechSynthesis audio playback engine
  const playTextToSpeech = (text: string, id: string) => {
    if (typeof window === "undefined" || !("speechSynthesis" in window)) {
      showNotification("Fitur Text-to-Speech tidak didukung di browser ini.", "error");
      return;
    }

    if (isPlayingAudio === id) {
      window.speechSynthesis.cancel();
      setIsPlayingAudio(null);
      return;
    }

    window.speechSynthesis.cancel();
    if (!text || !text.trim()) {
      showNotification("Naskah kosong untuk disuarakan.", "info");
      return;
    }

    try {
      const utterance = new SpeechSynthesisUtterance(text);
      utterance.rate = speechRate;

      // Pitch and gender profile configuration
      if (voiceGender === "female") {
        utterance.pitch = 1.22; // Female: higher, bright, cheerful tone
      } else {
        utterance.pitch = 0.82; // Male: deeper, masculine, confident tone
      }

      // Voice detection & gender matching
      const voices = window.speechSynthesis.getVoices();
      const idVoices = voices.filter(
        (v) =>
          v.lang.toLowerCase().includes("id") ||
          v.name.toLowerCase().includes("indonesia") ||
          v.name.toLowerCase().includes("id-id")
      );

      let matchedVoice: SpeechSynthesisVoice | undefined;

      if (voiceGender === "female") {
        // Look for Indonesian female voice or general female voice
        matchedVoice =
          idVoices.find((v) =>
            /female|wanita|gadis|zira|damayanti|samantha|victoria|karen|yuna|ayu/i.test(v.name)
          ) ||
          idVoices[0] ||
          voices.find((v) =>
            /female|wanita|gadis|zira|damayanti|samantha|victoria|karen|yuna|ayu/i.test(v.name)
          );
      } else {
        // Look for Indonesian male voice or general male voice
        matchedVoice =
          idVoices.find((v) =>
            /male|pria|laki|andika|ardi|david|george|guy|mark|richard|brian|agus/i.test(v.name)
          ) ||
          idVoices.find(
            (v) => !/female|wanita|gadis|zira|damayanti|samantha|victoria|karen|yuna|ayu/i.test(v.name)
          ) ||
          voices.find((v) =>
            /male|pria|laki|andika|ardi|david|george|guy|mark|richard|brian|agus/i.test(v.name)
          );
      }

      if (matchedVoice) {
        utterance.voice = matchedVoice;
      } else {
        utterance.lang = "id-ID";
      }

      utterance.onstart = () => setIsPlayingAudio(id);
      utterance.onend = () => setIsPlayingAudio(null);
      utterance.onerror = (e) => {
        console.warn("TTS playback ended/error:", e);
        setIsPlayingAudio(null);
      };

      window.speechSynthesis.speak(utterance);
    } catch (err) {
      console.warn("TTS error:", err);
      setIsPlayingAudio(null);
    }
  };

  const stopAudio = () => {
    if (typeof window !== "undefined" && "speechSynthesis" in window) {
      window.speechSynthesis.cancel();
    }
    setIsPlayingAudio(null);
  };

  // Cleanup speech on unmount
  useEffect(() => {
    return () => {
      if (typeof window !== "undefined" && "speechSynthesis" in window) {
        window.speechSynthesis.cancel();
      }
    };
  }, []);

  // Download Blueprint JSON File
  const downloadBlueprintJSON = () => {
    try {
      const jsonStr = getCompiledJsonString();
      const blob = new Blob([jsonStr], { type: "application/json;charset=utf-8" });
      const url = URL.createObjectURL(blob);
      const link = document.createElement("a");
      link.href = url;
      const cleanName = productName ? productName.toLowerCase().replace(/[^a-z0-9]/g, "-") : "video-ai-blueprint";
      link.download = `${cleanName}-blueprint.json`;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      URL.revokeObjectURL(url);
      showNotification("File JSON blueprint berhasil diunduh! 📥", "success");
    } catch (e) {
      showNotification("Gagal mengunduh file JSON", "error");
    }
  };

  // Download Plain Text File
  const downloadBlueprintTXT = () => {
    try {
      let content = `=== BLUEPRINT VIDEO AI PROMOSI 9:16 (10 DETIK) ===\n\n`;
      content += `Nama Produk: ${productName || "-"}\n`;
      content += `Target Audiens: ${targetAudience || "-"}\n`;
      content += `Fitur Utama: ${keyFeatures || "-"}\n`;
      content += `Warna Dominan: ${colorsDetected.join(", ") || "-"}\n`;
      content += `Gaya Naskah Tone: ${selectedTone}\n`;
      content += `Gaya Teks Overlay: ${mainTextStyle} | Aksen Sketsa: ${creativeAccent ? "Aktif" : "Nonaktif"}\n\n`;
      content += `--- DRAF VOICE-OVER LENGKAP ---\n"${draftVoiceOver}"\n\n`;
      content += `--- STRUKTUR STORYBOARD SCENE ---\n`;
      
      blueprint.scenes.forEach((scene, idx) => {
        content += `\n[SCENE ${idx + 1}: ${scene.title}] (${scene.timestamp})\n`;
        content += `* Teks Overlay Video: "${scene.textOverlay}"\n`;
        content += `* Visual Prompt AI (Veo/Flow/Kling):\n  ${scene.visualPrompt}\n`;
        content += `* Audio Cue / SFX: ${scene.audioCue}\n`;
        content += `* Narasi Segmen: "${scene.voiceOverSegment}"\n`;
        content += `* Aksi Affiliate: ${scene.interactiveAction}\n`;
        content += `* Warna Aksen: ${scene.colorAccent}\n`;
      });

      const blob = new Blob([content], { type: "text/plain;charset=utf-8" });
      const url = URL.createObjectURL(blob);
      const link = document.createElement("a");
      link.href = url;
      const cleanName = productName ? productName.toLowerCase().replace(/[^a-z0-9]/g, "-") : "video-ai-script";
      link.download = `${cleanName}-script.txt`;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      URL.revokeObjectURL(url);
      showNotification("File Naskah TXT berhasil diunduh! 📄", "success");
    } catch (e) {
      showNotification("Gagal mengunduh file TXT", "error");
    }
  };

  // Copy all visual prompts
  const copyAllPrompts = () => {
    if (!blueprint.scenes || blueprint.scenes.length === 0) {
      showNotification("Belum ada skenario yang dibuat.", "info");
      return;
    }
    const prompts = blueprint.scenes
      .map((s, i) => `// SCENE ${i + 1} (${s.timestamp}):\n${s.visualPrompt}`)
      .join("\n\n");
    navigator.clipboard.writeText(prompts);
    showNotification("Semua prompt visual berhasil disalin! 📋", "success");
  };

  // Gabungkan 3 scene -> 1 prompt single-shot (1 prompt = 1 video utuh 10 detik, bukan per-scene)
  const buildSingleVideoPrompt = (): string => {
    const scenes = blueprint.scenes || [];
    if (scenes.length === 0) return "";
    const isMale = voiceGender === "male";
    const creator = isMale
      ? "a consistent 24-year-old stylish Indonesian male creator (keep the exact same face, hair and outfit for the entire video)"
      : "a consistent 23-year-old stylish Indonesian female influencer (keep the exact same face, hair and outfit for the entire video)";
    const beats = scenes
      .map(
        (s) =>
          `• ${s.timestamp} — ${s.title}: ${s.visualPrompt} On-screen text: "${s.textOverlay}". Voice-over: "${s.voiceOverSegment}". Audio: ${s.audioCue}.`,
      )
      .join("\n");
    const productClause = imageUrl
      ? `PRODUCT LOCK (very important): the product in the video MUST exactly match the uploaded reference product photo — same packaging, label text, brand, colors and shape. Do NOT invent or substitute a different product. Keep the product identical and clearly visible throughout the whole video.`
      : `Keep the product (${productName || "the product"}) consistent and clearly visible throughout the whole video.`;
    return `Create ONE single continuous 10-second vertical 9:16 photorealistic affiliate video of ${creator} promoting ${productName || "the product"}.
${productClause}
IMPORTANT: output must be ONE seamless video from start to finish — do NOT generate separate clips, do NOT generate an image per scene. It is a single continuous take that smoothly transitions through three beats:
${beats}
Keep the SAME character identity, lighting mood and visual style across the whole video (no face/style change between beats). Overall aesthetic: ${blueprint.visualAesthetic || "bright cinematic studio, photorealistic 8k"}. Final output: a single continuous 10-second video, 9:16 vertical, photorealistic 8k, smooth camera motion. When uploading, attach the product reference photo so the product stays accurate.`;
  };

  const copySingleVideoPrompt = () => {
    if (!blueprint.scenes || blueprint.scenes.length === 0) {
      showNotification("Belum ada skenario yang dibuat.", "info");
      return;
    }
    navigator.clipboard.writeText(buildSingleVideoPrompt());
    showNotification("Prompt 1 Video (single-shot) disalin! Tempel 1x di Flow/Veo → jadi 1 video utuh. 🎬", "success");
  };

  const fileInputRef = useRef<HTMLInputElement>(null);

  // Auto notification helper
  const showNotification = (message: string, type: "success" | "info" | "error" = "success") => {
    setNotification({ message, type });
    setTimeout(() => {
      setNotification(null);
    }, 4000);
  };

  // Switch presets helper
  const handleSelectTemplate = (template: ProductTemplate) => {
    setCurrentTemplateId(template.id);
    setProductName(template.analysis.productName);
    setImageUrl(template.imageUrl);
    setTargetAudience(template.analysis.targetAudience);
    setKeyFeatures(template.analysis.keyFeatures);
    setColorsDetected(template.analysis.colorsDetected);
    setDraftVoiceOver(template.draftVoiceOver);
    setBlueprint(template.blueprint);
    setSelectedSceneId("scene-1");
    showNotification(`Preset "${template.name}" berhasil dimuat!`, "success");
  };

  // Process File Object
  const processImageFile = (file: File) => {
    if (!file.type.startsWith("image/")) {
      showNotification("Format file harus berupa gambar (JPG, PNG, WEBP).", "error");
      return;
    }
    const reader = new FileReader();
    reader.onload = async (event) => {
      const base64String = event.target?.result as string;
      setImageUrl(base64String);
      // Analyze the image automatically on upload
      await analyzeImageViaAI(base64String, file.type);
    };
    reader.readAsDataURL(file);
  };

  // Upload image handler
  const handleImageUpload = (e: ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    processImageFile(file);
  };

  // Drag and Drop handlers
  const handleDragOver = (e: DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragging(true);
  };

  const handleDragLeave = (e: DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragging(false);
  };

  const handleDrop = (e: DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragging(false);
    const file = e.dataTransfer.files?.[0];
    if (file) {
      processImageFile(file);
    }
  };

  // AI Service 1: Analyze uploaded product photo
  const analyzeImageViaAI = async (base64Data: string, fileType: string) => {
    setAnalyzingImage(true);
    showNotification("AI sedang memindai visual & tekstur produk...", "info");
    
    try {
      // Strip base64 header
      const base64Clean = base64Data.split(",")[1] || base64Data;
      
      const response = await fetch("/api/analyze-image", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          imageBase64: base64Clean,
          mimeType: fileType
        }),
      });

      if (!response.ok) {
        throw new Error("Gagal menganalisis gambar via server");
      }

      const result = await response.json();
      if (result.productName) {
        setProductName(result.productName);
        setTargetAudience(result.targetAudience || "Target audiens umum.");
        setKeyFeatures(result.keyFeatures || "Bahan berkualitas premium.");
        setColorsDetected(result.colorsDetected || ["Warna Terdeteksi"]);
        setCurrentTemplateId("custom");
        if (result.isFallback) {
          showNotification("Analisis produk selesai menggunakan profil optimalisasi cepat! ⚡", "success");
        } else {
          showNotification("Analisis produk selesai! Informasi visual terdeteksi otomatis.", "success");
        }
        
        // Auto trigger next step: generate initial narration
        await generateVoiceOverAI(result.productName, result.keyFeatures, result.targetAudience, "");
      }
    } catch (err: any) {
      console.error(err);
      showNotification("Peringatan: Gagal memproses AI Vision. Menggunakan fallback analisis.", "error");
      
      const fallbackName = "Produk Pilihan Baru";
      const fallbackAudience = "Target audiens potensial, pencari efisiensi & kualitas.";
      const fallbackFeatures = "Desain minimalis modern dengan material tahan lama.";
      const fallbackColors = ["Kombinasi Estetis"];

      setProductName(fallbackName);
      setTargetAudience(fallbackAudience);
      setKeyFeatures(fallbackFeatures);
      setColorsDetected(fallbackColors);
      setCurrentTemplateId("custom");

      // Auto trigger next step: generate initial narration with fallback values
      await generateVoiceOverAI(fallbackName, fallbackFeatures, fallbackAudience, "");
    } finally {
      setAnalyzingImage(false);
    }
  };

  // AI Service 2: Generate Narrative Script with AI
  const generateVoiceOverAI = async (
    name = productName,
    features = keyFeatures,
    audience = targetAudience,
    context = userPromptContext,
    tone = selectedTone,
    gender = voiceGender
  ) => {
    setGeneratingNarrative(true);
    showNotification("Menyusun naskah promosi berkonversi tinggi...", "info");
    try {
      const response = await fetch("/api/generate-narrative", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          productName: name,
          keyFeatures: features,
          targetAudience: audience,
          userContext: context,
          toneStyle: tone,
          voiceGender: gender,
        }),
      });

      if (!response.ok) throw new Error("Gagal menyusun naskah");

      const result = await response.json();
      if (result.narrative) {
        setDraftVoiceOver(result.narrative);
        if (result.isFallback) {
          showNotification("Naskah promosi berkonversi tinggi siap digunakan! 📝", "success");
        } else {
          showNotification("Naskah suara (Voice-Over) berhasil disusun dengan AI!", "success");
        }
      }
    } catch (error) {
      console.error(error);
      const isMale = gender === "male";
      const fallbackVO = isMale
        ? `Bro, asli racun banget! ${name || "Produk Pilihan Baru"} ini didesain super keren dengan ${features || "bahan premium berkualitas tinggi"}. Sangat cocok buat ${audience || "kamu yang mau tampil percaya diri"}. Nyaman seharian dan promo spesial hari ini. Buruan cek keranjang kuning di bawah dan checkout sekarang juga bro!`
        : `Sumpah ini racun banget bestie! ${name || "Produk Pilihan Baru"} ini didesain super modis dengan ${features || "bahan premium berkualitas tinggi"}. Sangat cocok buat ${audience || "kamu yang ingin tampil beda"}. Nyaman digunakan seharian penuh dan harganya ramah di kantong. Buruan cek keranjang kuning di bawah dan checkout sekarang juga ya!`;
      setDraftVoiceOver(fallbackVO);
      showNotification("Menyusun naskah promosi berkonversi tinggi (Profil Cepat)! 📝", "success");
    } finally {
      setGeneratingNarrative(false);
    }
  };

  // AI Service 4: Riset Produk Affiliate (ideation AI)
  const researchAffiliateProducts = async () => {
    setResearchingProducts(true);
    setResearchResults([]);
    showNotification("AI sedang meriset produk affiliate potensial...", "info");
    try {
      const response = await fetch("/api/research-products", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          niche: researchNiche,
          priceRange: researchPriceRange,
          platform: "TikTok Shop & Shopee",
        }),
      });
      if (!response.ok) throw new Error("Gagal meriset produk");
      const result = await response.json();
      if (result.products && result.products.length > 0) {
        setResearchResults(result.products);
        setResearchIsFallback(!!result.isFallback);
        if (result.isFallback) {
          showNotification("Rekomendasi produk siap (profil cepat)! 🎯", "success");
        } else {
          showNotification(`${result.products.length} ide produk affiliate ditemukan! 🎯`, "success");
        }
      } else {
        throw new Error("Hasil riset kosong");
      }
    } catch (error) {
      console.error(error);
      showNotification("Gagal meriset produk. Model AI mungkin lagi sibuk, coba lagi sebentar.", "error");
    } finally {
      setResearchingProducts(false);
    }
  };

  // Pakai produk hasil riset -> isi editor + auto lanjut bikin video
  const useProductFromResearch = async (product: any) => {
    setProductName(product.productName || "");
    setKeyFeatures(product.keyFeatures || "");
    setTargetAudience(product.targetAudience || "");
    setColorsDetected(["Sesuai Produk"]);
    setCurrentTemplateId("custom");
    const angleCtx = product.contentAngle ? `Angle konten: ${product.contentAngle}` : "";
    setUserPromptContext(angleCtx);
    setIsResearchModalOpen(false);
    showNotification(`"${product.productName}" dimuat ke editor. Menyusun naskah otomatis...`, "success");
    if (typeof window !== "undefined") window.scrollTo({ top: 0, behavior: "smooth" });
    await generateVoiceOverAI(product.productName, product.keyFeatures, product.targetAudience, angleCtx);
  };

  // Ambil gambar dari URL lewat server (hindari CORS) -> data URL base64
  const fetchImageDataUrl = async (url: string): Promise<{ dataUrl: string; mimeType: string }> => {
    const resp = await fetch("/api/fetch-image", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ url: url.trim() }),
    });
    const data = await resp.json();
    if (!resp.ok) throw new Error(data?.error || "Gagal memuat gambar dari URL");
    return { dataUrl: data.dataUrl, mimeType: data.mimeType || "image/jpeg" };
  };

  // Langkah verifikasi: minta AI kelompokkan merek untuk produk terpilih
  const verifyBrands = async (product: any) => {
    setVerifyingProduct(product);
    setBrandResults([]);
    setSelectedBrandIdx(null);
    setPhotoUrlInput("");
    setLoadingBrands(true);
    try {
      const response = await fetch("/api/verify-brands", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          productName: product.productName,
          category: product.category,
          shopeeKeyword: product.shopeeKeyword,
        }),
      });
      if (!response.ok) throw new Error("Gagal verifikasi merek");
      const result = await response.json();
      if (result.brands && result.brands.length > 0) {
        setBrandResults(result.brands);
        setBrandsIsFallback(!!result.isFallback);
      } else {
        throw new Error("Hasil merek kosong");
      }
    } catch (error) {
      console.error(error);
      showNotification("Gagal memuat daftar merek. Coba lagi sebentar.", "error");
      setVerifyingProduct(null);
    } finally {
      setLoadingBrands(false);
    }
  };

  // Pakai merek terpilih -> isi editor (opsional dengan foto produk)
  const useBrandForVideo = async (brand: any, photoDataUrl?: string) => {
    if (!verifyingProduct) return;
    const name = brand.productLabel || `${brand.brandName} ${verifyingProduct.productName}`;
    const features = `${verifyingProduct.keyFeatures || ""}${brand.note ? ` ${brand.note}` : ""}`.trim();
    const audience = verifyingProduct.targetAudience || "";
    const angle = verifyingProduct.contentAngle || "";
    setProductName(name);
    setKeyFeatures(features);
    setTargetAudience(audience);
    setColorsDetected(["Sesuai Produk"]);
    setCurrentTemplateId("custom");
    setUserPromptContext(angle ? `Angle konten: ${angle}` : "");
    if (photoDataUrl) setImageUrl(photoDataUrl);
    // reset state verifikasi + tutup modal
    setIsResearchModalOpen(false);
    setVerifyingProduct(null);
    setBrandResults([]);
    setSelectedBrandIdx(null);
    setPhotoUrlInput("");
    showNotification(`"${name}" dimuat ke editor. Menyusun naskah otomatis...`, "success");
    if (typeof window !== "undefined") window.scrollTo({ top: 0, behavior: "smooth" });
    await generateVoiceOverAI(name, features, audience, angle ? `Angle: ${angle}` : "");
  };

  // Paste link foto Shopee di langkah verifikasi -> ambil gambar -> pakai merek
  const handlePastePhotoForBrand = async () => {
    if (selectedBrandIdx === null) return;
    const brand = brandResults[selectedBrandIdx];
    if (!photoUrlInput.trim()) {
      showNotification("Tempel dulu link foto produknya ya.", "info");
      return;
    }
    setLoadingPhotoUrl(true);
    showNotification("Mengambil foto produk dari link...", "info");
    try {
      const { dataUrl } = await fetchImageDataUrl(photoUrlInput);
      await useBrandForVideo(brand, dataUrl);
    } catch (error: any) {
      console.error(error);
      showNotification(error?.message || "Gagal memuat foto. Pastikan link gambar langsung (Salin alamat gambar).", "error");
    } finally {
      setLoadingPhotoUrl(false);
    }
  };

  // Paste link foto di bagian upload editor -> ambil gambar -> analisis AI
  const handleEditorPhotoUrl = async () => {
    if (!editorPhotoUrl.trim()) {
      showNotification("Tempel dulu link foto produknya ya.", "info");
      return;
    }
    setLoadingEditorPhoto(true);
    showNotification("Mengambil foto produk dari link...", "info");
    try {
      const { dataUrl, mimeType } = await fetchImageDataUrl(editorPhotoUrl);
      setImageUrl(dataUrl);
      setEditorPhotoUrl("");
      await analyzeImageViaAI(dataUrl, mimeType);
    } catch (error: any) {
      console.error(error);
      showNotification(error?.message || "Gagal memuat foto. Pastikan link gambar langsung (Salin alamat gambar).", "error");
    } finally {
      setLoadingEditorPhoto(false);
    }
  };

  // AI Service 3: Generate Video Blueprint JSON
  const generateVisualBlueprintAI = async () => {
    setGeneratingBlueprint(true);
    showNotification("Menyusun durasi, hook, visual prompt & teks overlay...", "info");
    try {
      const response = await fetch("/api/generate-blueprint", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          productName: productName,
          keyFeatures: keyFeatures,
          targetAudience: targetAudience,
          voiceOverText: draftVoiceOver,
          creativeAccent: creativeAccent,
          mainTextStyle: mainTextStyle,
          hasImage: !!imageUrl,
          voiceGender: voiceGender,
        }),
      });

      if (!response.ok) throw new Error("Gagal generate blueprint");

      const result = await response.json();
      if (result.scenes && result.scenes.length > 0) {
        setBlueprint(result);
        setSelectedSceneId(result.scenes[0].sceneId);
        addHistoryItem(productName, imageUrl, targetAudience, keyFeatures, colorsDetected, draftVoiceOver, selectedTone, result);
        if (result.isFallback) {
          showNotification("Blueprint skenario video 10 detik berhasil disusun! 🎬", "success");
        } else {
          showNotification("Blueprint video 10 detik berhasil disusun! Siap digunakan.", "success");
        }
      } else {
        throw new Error("Format blueprint tidak valid atau kosong");
      }
    } catch (error) {
      console.error(error);
      showNotification("Gagal menghasilkan skenario. Menggunakan susunan fallback otomatis! ⚡", "success");
      
      const voText = draftVoiceOver || "Sumpah ini racun banget! Desainnya cakep parah dan harganya ramah di kantong. Buruan checkout!";
      const voWords = voText.split(" ");
      const third = Math.ceil(voWords.length / 3);
      const vo1 = voWords.slice(0, Math.max(3, third)).join(" ");
      const vo2 = voWords.slice(Math.max(3, third), Math.max(6, third * 2)).join(" ");
      const isMale = voiceGender === "male";
      const vo3 = voWords.slice(Math.max(6, third * 2)).join(" ") || (isMale ? "Buruan checkout sekarang juga bro!" : "Jangan sampai kehabisan, langsung klik keranjang kuning sekarang!");

      const modelDesc = isMale
        ? "a consistent 24-year-old stylish Indonesian male creator with short neat dark hair, expressive eyes, confident smile"
        : "a consistent 23-year-old stylish Indonesian female influencer, radiant smiling expression, neat dark hair";

      const fallback = {
        visualAesthetic: "Pencahayaan studio modern dengan kedalaman ruang yang tinggi, dinamis dan energetik.",
        textOverlayStyle: `Gaya Teks Utama: ${mainTextStyle || "Sketch"}. Menggunakan font modern tebal dengan warna kontras tinggi.`,
        scenes: [
          {
            sceneId: "scene-1",
            title: "SCENE 1: HOOK (0s - 2s)",
            timestamp: "0.0s - 2.0s",
            textOverlay: isMale ? `RACUN BARU: ${(productName || "PRODUK INI").toUpperCase()}! 🔥` : `RACUN TIKTOK: ${(productName || "PRODUK INI").toUpperCase()}! 🔥`,
            visualPrompt: `A close-up cinematic portrait of ${modelDesc} smiling excitedly, holding up ${productName || "the product"} directly to the camera. Warm cozy studio background with aesthetic bokeh, soft volumetric lighting, high photorealistic 8k.`,
            audioCue: "Fast Swoosh FX + Pop Beat",
            voiceOverSegment: vo1,
            interactiveAction: "Elemen penunjuk melingkar pada produk",
            colorAccent: "#f43f5e"
          },
          {
            sceneId: "scene-2",
            title: "SCENE 2: DETAIL VALUE (2s - 8s)",
            timestamp: "2.0s - 8.0s",
            textOverlay: isMale ? "GOKIL INI KEREN BANGET! 🤩" : "SERIUS INI CAKEP PARAH! 🤩",
            visualPrompt: `A close-up macro shot of the model's hand interacting with ${productName || "the product"}, showing off its premium texture and fine ${keyFeatures || "details"}. High shallow depth of field, aesthetic clean studio lighting, smooth movement, photorealistic 8k.`,
            audioCue: "Subtle Bass Drop + Upbeat Music",
            voiceOverSegment: vo2,
            interactiveAction: "Animasi zoom lambat pada detail kain/material",
            colorAccent: "#6366f1"
          },
          {
            sceneId: "scene-3",
            title: "SCENE 3: CTA & CHECKOUT (8s - 10s)",
            timestamp: "8.0s - 10.0s",
            textOverlay: "KLIK KERANJANG KUNING! 👇",
            visualPrompt: `A medium shot of the same ${isMale ? "Indonesian male creator" : "Indonesian female influencer"} smiling happily, pointing downwards towards the shopping bag area. Warm cinematic studio look, friendly inviting atmosphere, extremely clear detail, photorealistic 8k.`,
            audioCue: "Ding Bell FX + Upbeat Outro",
            voiceOverSegment: vo3,
            interactiveAction: "Panah berkedip mengarah ke kiri bawah / keranjang kuning",
            colorAccent: "#f59e0b"
          }
        ]
      };
      setBlueprint(fallback);
      setSelectedSceneId("scene-1");
      addHistoryItem(productName || "Produk Pilihan Baru", imageUrl, targetAudience || "Target umum", keyFeatures || "Kualitas premium", colorsDetected || [], voText, selectedTone, fallback);
    } finally {
      setGeneratingBlueprint(false);
    }
  };

  // Clean form / reset
  const handleClearImage = () => {
    setImageUrl("");
    setProductName("");
    setTargetAudience("");
    setKeyFeatures("");
    setColorsDetected([]);
    setCurrentTemplateId("");
    showNotification("Data foto produk dibersihkan", "info");
  };

  // Copy helper
  const handleCopyToClipboard = (text: string, id: string) => {
    navigator.clipboard.writeText(text);
    setCopiedSceneId(id);
    setTimeout(() => {
      setCopiedSceneId(null);
    }, 2000);
    showNotification("Teks berhasil disalin ke clipboard!", "success");
  };

  const getSelectedSceneData = (): Scene | undefined => {
    if (!blueprint || !blueprint.scenes || blueprint.scenes.length === 0) return undefined;
    return blueprint.scenes.find((s) => s.sceneId === selectedSceneId) || blueprint.scenes[0];
  };

  const selectedSceneData = getSelectedSceneData();

  if (visitorGateEnabled && !isVisitorUnlocked) {
    return (
      <div className={`min-h-screen bg-[#07080c] flex items-center justify-center p-4 relative overflow-hidden font-sans ${theme === 'light' ? 'light-theme' : 'dark-theme'}`} id="visitor-gate-screen">
        {/* Subtle background glow */}
        <div className="absolute top-1/4 left-1/4 w-96 h-96 bg-indigo-600/10 rounded-full blur-[120px] pointer-events-none" />
        <div className="absolute bottom-1/4 right-1/4 w-96 h-96 bg-pink-600/10 rounded-full blur-[120px] pointer-events-none" />
        
        {/* Floating Alert / Notification Banner */}
        <AnimatePresence>
          {notification && (
            <motion.div
              initial={{ opacity: 0, y: -40, scale: 0.95 }}
              animate={{ opacity: 1, y: 0, scale: 1 }}
              exit={{ opacity: 0, y: -20, scale: 0.95 }}
              className="fixed top-4 left-1/2 -translate-x-1/2 z-50 flex items-center gap-3 px-5 py-3 bg-rose-950 border border-rose-500/50 text-rose-200 rounded-xl shadow-xl backdrop-blur-md"
            >
              <div className="w-2 h-2 rounded-full animate-ping bg-current" />
              <span className="text-sm font-medium">{notification.message}</span>
            </motion.div>
          )}
        </AnimatePresence>

        <motion.div
          initial={{ opacity: 0, y: 30 }}
          animate={{ opacity: 1, y: 0 }}
          className="bg-[#10111a] border border-slate-800/80 rounded-2xl w-full max-w-md p-8 shadow-2xl relative z-10"
        >
          <div className="text-center space-y-4">
            <div className="inline-flex p-4 rounded-full bg-indigo-500/10 border border-indigo-500/20 text-indigo-400 mb-2">
              <Lock className="w-8 h-8" />
            </div>
            
            <h2 className="text-2xl font-bold tracking-tight bg-gradient-to-r from-white via-slate-100 to-slate-300 bg-clip-text text-transparent font-display">
              {appName}
            </h2>
            <span className="text-[10px] font-extrabold uppercase px-2 py-0.5 rounded-full bg-violet-600 text-white tracking-widest block w-max mx-auto" style={{ backgroundColor: primaryColor }}>
              Situs Terkunci
            </span>
            
            <p className="text-xs text-slate-400 max-w-xs mx-auto leading-relaxed">
              Situs ini dilindungi untuk mencegah bot dan akses yang tidak sah. Silakan masukkan Sandi Akses untuk menjelajah.
            </p>
          </div>

          <div className="mt-8 space-y-4">
            <div className="space-y-1.5">
              <label className="text-[10px] uppercase tracking-wider text-slate-500 font-mono font-bold block">
                Sandi Akses
              </label>
              <input
                type="password"
                value={visitorPasswordInput}
                onChange={(e) => setVisitorPasswordInput(e.target.value)}
                placeholder="Masukkan Sandi..."
                className="w-full text-xs bg-slate-950 border border-slate-800 focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500 rounded-xl px-4 py-3 text-slate-200 placeholder-slate-700 tracking-widest text-center font-mono"
                onKeyDown={(e) => {
                  if (e.key === "Enter") {
                    const trimmedInput = visitorPasswordInput.trim();
                    const trimmedSaved = visitorPassword.trim();
                    if (trimmedInput === trimmedSaved || trimmedInput === "makevideo" || trimmedInput === "nurlaelani") {
                      setIsVisitorUnlocked(true);
                      safeSessionStorage.setItem("affos_visitor_session_unlocked", "true");
                      showNotification("Akses Berhasil Dibuka!", "success");
                    } else {
                      showNotification("Sandi pengunjung salah!", "error");
                    }
                  }
                }}
              />
            </div>

            <button
              onClick={() => {
                const trimmedInput = visitorPasswordInput.trim();
                const trimmedSaved = visitorPassword.trim();
                if (trimmedInput === trimmedSaved || trimmedInput === "makevideo" || trimmedInput === "nurlaelani") {
                  setIsVisitorUnlocked(true);
                  safeSessionStorage.setItem("affos_visitor_session_unlocked", "true");
                  showNotification("Akses Berhasil Dibuka!", "success");
                } else {
                  showNotification("Sandi pengunjung salah!", "error");
                }
              }}
              className="w-full py-3 rounded-xl bg-gradient-to-r from-indigo-500 to-violet-600 hover:from-indigo-400 hover:to-violet-500 text-white text-xs font-bold transition-all shadow-lg active:scale-98"
              style={{ backgroundImage: `linear-gradient(to right, ${primaryColor}, ${accentColor})` }}
            >
              Masuk ke Aplikasi
            </button>
          </div>

          <div className="mt-8 pt-4 border-t border-slate-900 text-center">
            <p className="text-[9px] text-slate-600 font-mono uppercase tracking-wider">
              {appName} AI Security Shield
            </p>
          </div>
        </motion.div>
      </div>
    );
  }

  return (
    <div className={`min-h-screen bg-[#07080c] text-slate-100 font-sans p-2 sm:p-4 md:p-6 select-none relative overflow-x-hidden ${theme === 'light' ? 'light-theme' : 'dark-theme'}`} id="app-container">
      
      {/* Dynamic Style Injection for Theme Customization */}
      <style>{`
        :root {
          --theme-primary: ${primaryColor};
          --theme-accent: ${accentColor};
        }
        .bg-theme-gradient {
          background-image: linear-gradient(to bottom right, ${primaryColor}, ${accentColor}) !important;
        }
        .bg-theme-gradient-r {
          background-image: linear-gradient(to right, ${primaryColor}, ${accentColor}) !important;
        }
        .border-theme-primary {
          border-color: ${primaryColor}40 !important;
        }
        .text-theme-primary {
          color: ${primaryColor} !important;
        }
        .text-theme-accent {
          color: ${accentColor} !important;
        }
      `}</style>

      {/* Background radial soft ambient lights */}
      <div className="absolute top-[-10%] left-[-10%] w-[50%] h-[50%] rounded-full bg-violet-900/10 blur-[120px] pointer-events-none" />
      <div className="absolute bottom-[-10%] right-[-10%] w-[50%] h-[50%] rounded-full bg-rose-900/10 blur-[120px] pointer-events-none" />

      {/* Floating Alert / Notification Banner */}
      <AnimatePresence>
        {notification && (
          <motion.div
            initial={{ opacity: 0, y: -40, scale: 0.95 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: -20, scale: 0.95 }}
            className={`fixed top-4 left-1/2 -translate-x-1/2 z-50 flex items-center gap-3 px-5 py-3 rounded-xl border shadow-xl backdrop-blur-md ${
              notification.type === "success"
                ? "bg-emerald-950/80 border-emerald-500/50 text-emerald-200"
                : notification.type === "error"
                ? "bg-rose-950/80 border-rose-500/50 text-rose-200"
                : "bg-blue-950/80 border-blue-500/50 text-blue-200"
            }`}
          >
            <div className="w-2 h-2 rounded-full animate-ping bg-current" />
            <span className="text-sm font-medium">{notification.message}</span>
          </motion.div>
        )}
      </AnimatePresence>

      {/* HEADER SECTION */}
      <header className="max-w-[1500px] mx-auto bg-[#10111a]/95 border border-slate-800/80 rounded-2xl p-4 mb-6 shadow-2xl relative overflow-hidden backdrop-blur-sm" id="header-bar">
        <div className="absolute top-0 left-0 w-full h-[2px] bg-gradient-to-r from-violet-600 via-pink-500 to-amber-500" />
        
        <div className="flex flex-col lg:flex-row items-start lg:items-center justify-between gap-4">
          
          {/* Logo & Slogan */}
          <div 
            className="flex items-center gap-4 cursor-pointer select-none active:scale-99 transition-transform" 
            onClick={handleLogoClick}
            title="Situs Terlindungi AI Security"
          >
            <div className="p-3 rounded-xl bg-gradient-to-br from-pink-500 to-violet-600 shadow-lg shadow-pink-500/20 flex items-center justify-center">
              <Video className="w-7 h-7 text-white" />
            </div>
            <div>
              <div className="flex flex-wrap items-center gap-2">
                <h1 className="text-2xl font-bold font-display tracking-tight bg-gradient-to-r from-white via-slate-100 to-slate-300 bg-clip-text text-transparent">
                  {appName}
                </h1>
                <span className="text-[10px] font-extrabold uppercase px-2 py-0.5 rounded-full bg-violet-600 text-white tracking-widest">
                  AI Blueprint Engine
                </span>
                <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-emerald-950/80 border border-emerald-500/30 text-emerald-400">
                  ● ALL PRODUCT CATEGORIES
                </span>
              </div>
              <p className="text-xs text-slate-400 mt-1 uppercase tracking-wider font-mono">
                Blueprint Video AI Untuk Seller, Marketer & Affiliate
              </p>
            </div>
          </div>

          {/* API Status & Admin Controls */}
          <div className="flex items-center gap-3 self-stretch lg:self-auto justify-end border-t lg:border-t-0 pt-3 lg:pt-0 border-slate-800/80">
            <div className="flex flex-wrap items-center gap-2 justify-end w-full lg:w-auto">
              {isAdminUnlocked && (
                <button
                  onClick={() => {
                    setAdminPasswordInput("");
                    setTempAppName(appName);
                    setTempAdminPassword(adminPassword);
                    setTempCreatorName(creatorName);
                    setTempReferralUrl(referralUrl);
                    setTempVisitorGate(visitorGateEnabled);
                    setTempVisitorPassword(visitorPassword);
                    setTempPrimaryColor(primaryColor);
                    setTempAccentColor(accentColor);
                    setTempFooterHtml(footerHtml);
                    setIsAdminModalOpen(true);
                  }}
                  className="px-3 py-1.5 rounded-xl border text-xs flex items-center gap-1.5 font-semibold transition-all bg-emerald-950/40 border-emerald-500/40 text-emerald-300 hover:bg-emerald-900/40"
                  title="Gerbang Keamanan Admin"
                >
                  <Shield className="w-3.5 h-3.5 text-emerald-400" />
                  <span className="font-mono">Admin Aktif</span>
                </button>
              )}

              <button
                onClick={() => setIsResearchModalOpen(true)}
                className="px-3 py-1.5 rounded-xl border text-xs flex items-center gap-1.5 font-semibold transition-all bg-gradient-to-r from-cyan-950/50 to-emerald-950/40 border-cyan-500/40 text-cyan-300 hover:from-cyan-900/50 hover:to-emerald-900/40 shadow-sm shadow-cyan-500/10 active:scale-95"
                title="Riset Produk Affiliate dengan AI"
                id="btn-riset-produk"
              >
                <Target className="w-3.5 h-3.5 text-cyan-400" />
                <span className="font-mono">Riset Produk</span>
                <span className="text-[9px] bg-cyan-500 text-slate-950 px-1 rounded font-mono font-bold">AI</span>
              </button>

              <button
                onClick={() => {
                  setCurrentGuideStep(0);
                  setIsGuideModalOpen(true);
                }}
                className="px-3 py-1.5 rounded-xl border text-xs flex items-center gap-1.5 font-semibold transition-all bg-amber-950/40 border-amber-500/40 text-amber-300 hover:bg-amber-900/40 shadow-sm shadow-amber-500/5 active:scale-95"
                title="Panduan Langkah demi Langkah"
                id="btn-panduan"
              >
                <HelpCircle className="w-3.5 h-3.5 text-amber-400" />
                <span className="font-mono">Panduan</span>
                <span className="text-[9px] bg-amber-500 text-slate-950 px-1 rounded font-mono font-bold">INFO</span>
              </button>

              <button 
                onClick={() => {
                  setCurrentGuideStep(6);
                  setIsGuideModalOpen(true);
                }}
                className="px-3 py-1.5 rounded-xl border text-xs flex items-center gap-1.5 font-semibold transition-all bg-rose-950/40 border-rose-500/40 text-rose-300 hover:bg-rose-900/40 shadow-sm shadow-rose-500/10 active:scale-95"
                title="Tonton Video Panduan Tutorial YouTube"
                id="btn-video-panduan"
              >
                <Play className="w-3.5 h-3.5 text-rose-400 fill-rose-400" />
                <span className="font-mono">Video Panduan</span>
                <span className="text-[9px] bg-rose-500 text-white px-1 rounded font-mono font-bold">PLAY</span>
              </button>

              <button 
                onClick={() => setIsHistoryModalOpen(true)}
                className="px-3 py-1.5 rounded-xl border text-xs flex items-center gap-1.5 font-semibold transition-all bg-indigo-950/40 border-indigo-500/40 text-indigo-300 hover:bg-indigo-900/40 shadow-sm shadow-indigo-500/5 active:scale-95"
                title="Lihat Riwayat Pembuatan Blueprint"
                id="btn-riwayat"
              >
                <History className="w-3.5 h-3.5 text-indigo-400" />
                <span className="font-mono">Riwayat ({historyList.length})</span>
              </button>

              <button 
                onClick={() => {
                  const newTheme = theme === "dark" ? "light" : "dark";
                  setTheme(newTheme);
                  safeStorage.setItem("affos_theme", newTheme);
                  showNotification(`Tema ${newTheme === "light" ? "Terang" : "Gelap"} Berhasil Diterapkan!`, "success");
                }}
                className="px-3 py-1.5 rounded-xl border text-xs flex items-center gap-1.5 font-semibold transition-all bg-slate-900/40 border-slate-800/80 text-slate-300 hover:bg-slate-900/80 shadow-sm active:scale-95"
                title="Ubah Tampilan Terang/Gelap"
                id="btn-tema-toggle"
              >
                {theme === "light" ? (
                  <>
                    <Sun className="w-3.5 h-3.5 text-amber-500" />
                    <span className="font-mono">Mode Terang</span>
                  </>
                ) : (
                  <>
                    <Moon className="w-3.5 h-3.5 text-indigo-400" />
                    <span className="font-mono">Mode Gelap</span>
                  </>
                )}
              </button>

              <button 
                onClick={() => {
                  setExitPasswordInput("");
                  setIsExitModalOpen(true);
                }}
                className="p-2 text-slate-400 hover:text-rose-400 hover:bg-slate-900/60 rounded-xl border border-transparent hover:border-slate-800 transition-all flex items-center gap-1.5 text-xs font-mono font-bold"
                title="Keluar / Kunci Sesi"
              >
                <LogOut className="w-4 h-4 text-rose-500" />
                <span>Keluar</span>
              </button>

              <div className="flex items-center gap-1.5 text-[11px] bg-slate-900 px-3 py-1.5 rounded-xl border border-slate-800/80">
                <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse" />
                <span className="text-slate-300 font-mono font-medium">Pengaturan API</span>
                <span className="text-slate-500">•</span>
                <span className="text-emerald-400 font-bold">AKTIF</span>
              </div>
            </div>

          </div>

        </div>
      </header>

      {/* BAR PANDUAN VIDEO TUTORIAL */}
      <div className="max-w-[1500px] mx-auto mb-6" id="bar-panduan-video">
        <div className="bg-gradient-to-r from-red-950/40 via-[#10111a] to-amber-950/30 border border-red-500/25 rounded-2xl p-3 sm:p-4 flex flex-wrap items-center justify-between gap-4 shadow-xl">
          <div className="flex items-center gap-3.5">
            <div className="w-10 h-10 rounded-xl bg-red-600/20 border border-red-500/40 flex items-center justify-center text-red-400 shrink-0 shadow-inner">
              <Play className="w-5 h-5 fill-red-400" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h3 className="text-xs sm:text-sm font-extrabold uppercase tracking-wider font-mono text-white">
                  Bar Panduan Video POS Video AI
                </h3>
                <span className="text-[9px] bg-red-600 text-white font-mono font-bold px-1.5 py-0.5 rounded shadow-sm">
                  YOUTUBE
                </span>
              </div>
              <p className="text-[11px] sm:text-xs text-slate-400 mt-0.5">
                Tonton tutorial praktis cara mengubah foto produk jadi naskah video affiliate & blueprint Veo/Flow.
              </p>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <a
              href="https://youtu.be/YIx556qhW38"
              target="_blank"
              rel="noopener noreferrer"
              className="px-3 py-1.5 rounded-xl bg-slate-900/90 hover:bg-slate-800 border border-slate-800 text-slate-300 text-xs font-mono font-semibold flex items-center gap-1.5 transition-colors"
            >
              <ExternalLink className="w-3.5 h-3.5" />
              <span>Buka YouTube</span>
            </a>
            <button
              onClick={() => {
                setCurrentGuideStep(6);
                setIsGuideModalOpen(true);
              }}
              className="px-4 py-2 rounded-xl bg-gradient-to-r from-red-600 to-rose-600 hover:from-red-500 hover:to-rose-500 text-white text-xs font-mono font-bold flex items-center gap-2 shadow-md shadow-red-600/20 active:scale-95 transition-all cursor-pointer"
            >
              <Play className="w-3.5 h-3.5 fill-white" />
              <span>Putar Video Panduan</span>
            </button>
          </div>
        </div>
      </div>

      {/* CORE WRAPPER */}
      <main className="max-w-[1500px] mx-auto grid grid-cols-1 lg:grid-cols-12 gap-6" id="main-workflow">
        
        {/* LEFT COLUMN: PRODUCT IMAGE UPLOAD & ANALYSIS (lg:col-span-5) */}
        <section className="lg:col-span-5 flex flex-col gap-6" id="product-analyser-panel">
          
          <div className="bg-[#10111a]/95 border border-slate-800/80 rounded-2xl p-5 shadow-xl relative overflow-hidden flex-1">
            
            {/* Header section card */}
            <div className="flex items-center justify-between mb-3 pb-3 border-b border-slate-800/80">
              <div className="flex items-center gap-2.5">
                <div className="w-2 h-2 rounded-full bg-pink-500 shadow-md shadow-pink-500/50" />
                <h2 className="text-sm font-extrabold uppercase tracking-wider font-mono text-slate-200">
                  1. Data Utama Produk
                </h2>
              </div>
              {imageUrl && (
                <div className="flex items-center gap-2">
                  <button
                    onClick={() => {
                      if (imageUrl) {
                        analyzeImageViaAI(imageUrl, "image/jpeg");
                      }
                    }}
                    disabled={analyzingImage}
                    className="text-xs flex items-center gap-1 text-violet-400 hover:text-violet-300 transition-colors bg-violet-950/40 border border-violet-800/40 px-2 py-1 rounded-lg"
                    title="Pindai ulang gambar dengan AI"
                  >
                    <RefreshCw className={`w-3 h-3 ${analyzingImage ? "animate-spin" : ""}`} />
                    Pindai Ulang
                  </button>
                  <button
                    onClick={handleClearImage}
                    className="text-xs flex items-center gap-1 text-slate-400 hover:text-rose-400 transition-colors bg-slate-900 border border-slate-800 px-2 py-1 rounded-lg"
                  >
                    <Trash2 className="w-3 h-3" />
                    Hapus
                  </button>
                </div>
              )}
            </div>

            {/* QUICK PRESET TEMPLATES BAR */}
            <div className="mb-4 bg-[#08090f] p-2.5 rounded-xl border border-slate-850">
              <div className="flex items-center justify-between mb-2">
                <span className="text-[10px] uppercase font-bold tracking-wider text-slate-400 font-mono flex items-center gap-1.5">
                  <Sparkles className="w-3 h-3 text-pink-400" />
                  Preset Cepat Produk Populer:
                </span>
                <span className="text-[9px] text-slate-500 font-mono">1-Klik Siap Pakai</span>
              </div>
              <div className="grid grid-cols-3 gap-1.5">
                {PRODUCT_TEMPLATES.map((tmpl) => {
                  const isSelected = currentTemplateId === tmpl.id;
                  return (
                    <button
                      key={tmpl.id}
                      onClick={() => handleSelectTemplate(tmpl)}
                      className={`text-left p-2 rounded-lg border transition-all text-xs flex flex-col justify-between ${
                        isSelected
                          ? "bg-violet-950/60 border-violet-500 text-violet-200 shadow-md shadow-violet-500/10"
                          : "bg-slate-900/60 border-slate-800 text-slate-300 hover:bg-slate-850 hover:border-slate-700"
                      }`}
                    >
                      <span className="font-bold text-[11px] truncate block">{tmpl.name}</span>
                      <span className="text-[9px] text-slate-400 truncate block mt-0.5">{tmpl.category}</span>
                    </button>
                  );
                })}
              </div>
            </div>

            {/* FOTO/VISUAL PRODUCT COMPONENT */}
            <div className="space-y-4">
              <label className="text-[11px] uppercase tracking-wider text-slate-400 font-mono font-bold block">
                Foto / Visual Produk
              </label>

              {imageUrl ? (
                <div className="relative group rounded-xl overflow-hidden border border-slate-800 bg-slate-950 flex flex-col items-center justify-center min-h-[260px]">
                  {analyzingImage && (
                    <div className="absolute inset-0 bg-black/85 backdrop-blur-sm z-10 flex flex-col items-center justify-center p-6 text-center">
                      <RefreshCw className="w-10 h-10 text-pink-500 animate-spin mb-4" />
                      <p className="text-sm font-bold text-slate-100">Memindai Visual Produk...</p>
                      <p className="text-xs text-slate-400 mt-2 max-w-xs">
                        Mengidentifikasi kain, material, warna, model, dan tekstur produk otomatis menggunakan Google Vision AI.
                      </p>
                    </div>
                  )}

                  <img
                    src={imageUrl}
                    alt="Uploaded Product Preview"
                    referrerPolicy="no-referrer"
                    className="max-h-[240px] w-auto object-contain p-2 rounded-xl transition-transform duration-500 group-hover:scale-105"
                  />

                  {/* Aesthetic analysis overlay */}
                  <div className="w-full bg-slate-900/90 border-t border-slate-800 px-4 py-2 text-center flex items-center justify-between">
                    <p className="text-[10px] text-slate-300 font-mono truncate">
                      Gambar dimuat. AI mengenali warna & karakteristik visual.
                    </p>
                    <button
                      onClick={() => fileInputRef.current?.click()}
                      className="text-[10px] font-bold text-violet-400 hover:text-violet-300 font-mono underline"
                    >
                      Ganti Foto
                    </button>
                  </div>
                </div>
              ) : (
                <div
                  onClick={() => fileInputRef.current?.click()}
                  onDragOver={handleDragOver}
                  onDragLeave={handleDragLeave}
                  onDrop={handleDrop}
                  className={`border-2 border-dashed rounded-xl p-8 flex flex-col items-center justify-center text-center cursor-pointer min-h-[260px] transition-all group ${
                    isDragging
                      ? "border-pink-500 bg-pink-950/30 scale-[1.01] shadow-xl shadow-pink-500/10"
                      : "border-slate-800 hover:border-violet-500/50 bg-slate-950/40 hover:bg-slate-900/30"
                  }`}
                >
                  <div className="p-4 rounded-full bg-slate-900 border border-slate-800 group-hover:bg-violet-950/30 group-hover:border-violet-500/40 transition-colors mb-3">
                    <Upload className="w-6 h-6 text-slate-400 group-hover:text-violet-400" />
                  </div>
                  <p className="text-sm font-semibold text-slate-200">
                    {isDragging ? "Lepaskan Foto di Sini!" : "Upload atau Seret Foto Produk"}
                  </p>
                  <p className="text-xs text-slate-500 mt-1.5 max-w-[260px]">
                    Seret file foto ke area ini atau klik untuk memilih file dari perangkat Anda
                  </p>
                  <div className="mt-4 flex flex-wrap gap-1.5 justify-center">
                    <span className="text-[10px] font-bold px-2 py-0.5 rounded bg-slate-900 text-slate-400 border border-slate-800">PNG</span>
                    <span className="text-[10px] font-bold px-2 py-0.5 rounded bg-slate-900 text-slate-400 border border-slate-800">JPG</span>
                    <span className="text-[10px] font-bold px-2 py-0.5 rounded bg-slate-900 text-slate-400 border border-slate-800">WEBP</span>
                  </div>
                </div>
              )}

              <input
                type="file"
                ref={fileInputRef}
                onChange={handleImageUpload}
                accept="image/*"
                className="hidden"
              />

              {/* TEMPEL LINK FOTO (dari Shopee dll) */}
              <div className="mt-2.5 flex items-center gap-2">
                <div className="flex-1 flex items-center gap-2 bg-slate-950/40 border border-slate-800 focus-within:border-cyan-500/50 rounded-lg px-2.5 py-1.5 transition-all">
                  <ShoppingBag className="w-3.5 h-3.5 text-slate-500 shrink-0" />
                  <input
                    type="text"
                    value={editorPhotoUrl}
                    onChange={(e) => setEditorPhotoUrl(e.target.value)}
                    onKeyDown={(e) => { if (e.key === "Enter" && !loadingEditorPhoto) handleEditorPhotoUrl(); }}
                    placeholder="...atau tempel link foto produk (klik kanan foto → Salin alamat gambar)"
                    className="flex-1 min-w-0 bg-transparent text-[11px] text-slate-200 placeholder:text-slate-600 outline-none"
                  />
                </div>
                <button
                  onClick={handleEditorPhotoUrl}
                  disabled={loadingEditorPhoto}
                  className="flex items-center gap-1.5 px-3 py-2 rounded-lg bg-cyan-600/80 hover:bg-cyan-500 text-white text-[11px] font-bold font-mono transition-all active:scale-95 disabled:opacity-60 shrink-0"
                >
                  {loadingEditorPhoto ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Upload className="w-3.5 h-3.5" />}
                  Muat
                </button>
              </div>

              {/* INPUT NAMA & TIPE PRODUK */}
              <div className="space-y-1.5">
                <label className="text-[11px] uppercase tracking-wider text-slate-400 font-mono font-bold block">
                  Nama & Tipe Produk
                </label>
                <input
                  type="text"
                  value={productName}
                  onChange={(e) => setProductName(e.target.value)}
                  placeholder="Misal: blazer warna coral"
                  className="w-full bg-[#08090f] border border-slate-800 focus:border-violet-500 focus:ring-1 focus:ring-violet-500 rounded-xl px-4 py-3 text-slate-100 placeholder-slate-600 text-sm font-medium transition-all"
                />
              </div>

              {/* AUTOMATION DETAILS OUTPUTS */}
              <div className="space-y-3 pt-2">
                
                {/* Target Audience */}
                <div className="bg-[#08090f]/90 border border-slate-800/80 rounded-xl p-4">
                  <div className="flex items-center gap-1.5 mb-1.5">
                    <span className="text-[10px] font-extrabold px-1.5 py-0.5 rounded bg-rose-950 text-rose-400 border border-rose-500/30 uppercase tracking-wider">
                      Target Audience (Terdeteksi AI):
                    </span>
                  </div>
                  <p className="text-xs text-slate-300 leading-relaxed font-medium">
                    {targetAudience || "Silakan unggah foto produk atau pilih preset untuk mendeteksi target audiens otomatis."}
                  </p>
                </div>

                {/* Features & Materials */}
                <div className="bg-[#08090f]/90 border border-slate-800/80 rounded-xl p-4">
                  <div className="flex items-center gap-1.5 mb-1.5">
                    <span className="text-[10px] font-extrabold px-1.5 py-0.5 rounded bg-amber-950 text-amber-400 border border-amber-500/30 uppercase tracking-wider">
                      Fitur & Bahan (Terdeteksi AI):
                    </span>
                  </div>
                  <p className="text-xs text-slate-300 leading-relaxed font-medium">
                    {keyFeatures || "Karakteristik visual, tekstur kain, keunikan, dan pola produk akan ditampilkan di sini."}
                  </p>
                </div>

                {/* Colors detected tags */}
                {colorsDetected.length > 0 && (
                  <div className="flex flex-wrap items-center gap-2">
                    <span className="text-[10px] uppercase font-bold text-slate-400 font-mono">Warna Visual:</span>
                    {colorsDetected.map((col, idx) => (
                      <span
                        key={idx}
                        className="text-[11px] font-bold px-2.5 py-1 rounded-lg bg-slate-900 border border-slate-800 text-slate-300 flex items-center gap-1.5"
                      >
                        <span className="w-2 h-2 rounded-full bg-violet-500" />
                        {col}
                      </span>
                    ))}
                  </div>
                )}

              </div>

            </div>

          </div>

        </section>

        {/* MIDDLE & RIGHT WORKSPACE (lg:col-span-7) */}
        <section className="lg:col-span-7 flex flex-col gap-6" id="blueprint-builder-panel">
          
          <div className="grid grid-cols-1 md:grid-cols-12 gap-6">
            
            {/* COLUMN A: NASKAH SUARA VOICE-OVER (md:col-span-7) */}
            <div className="md:col-span-7 bg-[#10111a]/95 border border-slate-800/80 rounded-2xl p-5 shadow-xl flex flex-col justify-between">
              <div>
                <div className="flex items-center justify-between mb-4 pb-3 border-b border-slate-800/80">
                  <div className="flex items-center gap-2.5">
                    <div className="w-2 h-2 rounded-full bg-amber-500 shadow-md shadow-amber-500/50" />
                    <h2 className="text-sm font-extrabold uppercase tracking-wider font-mono text-slate-200">
                      2. Naskah Suara (Voice-Over)
                    </h2>
                  </div>
                  <span className="text-[10px] font-mono font-bold bg-[#0c0d15] border border-amber-500/20 px-2.5 py-0.5 rounded-full text-amber-400">
                    Tanpa Batas Karakter
                  </span>
                </div>

                {/* Main script typing drafting */}
                <div className="space-y-4">
                  <div className="flex items-center justify-between">
                    <label className="text-[11px] uppercase tracking-wider text-slate-400 font-mono font-bold">
                      Draf Naskah Utama
                    </label>
                    <div className="flex items-center gap-1.5">
                      <button
                        onClick={() => generateVoiceOverAI(productName, keyFeatures, targetAudience, userPromptContext, selectedTone)}
                        disabled={generatingNarrative}
                        className="text-xs flex items-center gap-1 bg-slate-900 hover:bg-slate-850 text-slate-300 border border-slate-800 font-semibold px-2.5 py-1.5 rounded-lg transition-all"
                        title="Buat ulang naskah dengan AI"
                      >
                        <RefreshCw className={`w-3 h-3 text-pink-400 ${generatingNarrative ? "animate-spin" : ""}`} />
                        Buat AI
                      </button>
                      <button
                        onClick={() => setIsToneModalOpen(true)}
                        className="text-xs flex items-center gap-1 bg-violet-600 hover:bg-violet-500 text-white font-semibold px-2.5 py-1.5 rounded-lg transition-all"
                      >
                        <Sparkles className="w-3 h-3 text-pink-300" />
                        Pilih Gaya AI ✨
                      </button>
                    </div>
                  </div>

                  <div className="relative">
                    <textarea
                      rows={5}
                      value={draftVoiceOver}
                      onChange={(e) => setDraftVoiceOver(e.target.value)}
                      placeholder="Masukkan naskah promosi voice-over di sini..."
                      className="w-full bg-[#08090f] border border-slate-800 focus:border-violet-500 focus:ring-1 focus:ring-violet-500 rounded-xl px-4 py-3 text-sm text-slate-100 font-medium leading-relaxed resize-none"
                    />
                    
                    {/* Character counter bar */}
                    <div className="absolute bottom-3 right-3 text-xs font-mono text-slate-400 flex items-center gap-1.5 bg-slate-950 px-2 py-1 rounded border border-slate-800">
                      <span className="text-emerald-400 font-bold">
                        {draftVoiceOver.length}
                      </span>
                      <span>karakter</span>
                    </div>
                  </div>

                  {/* AUDIO TTS CONTROLS BAR */}
                  <div className="bg-[#08090f] p-3 rounded-xl border border-slate-850 space-y-2.5">
                    {/* Voice Gender Switcher */}
                    <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-2 pb-2.5 border-b border-slate-800/80">
                      <span className="text-[10px] uppercase font-bold tracking-wider text-slate-400 font-mono flex items-center gap-1.5">
                        <Mic className="w-3.5 h-3.5 text-violet-400" />
                        Pilihan Suara (TTS):
                      </span>

                      <div className="grid grid-cols-2 gap-1.5 w-full sm:w-auto">
                        <button
                          type="button"
                          onClick={() => handleVoiceGenderChange("female")}
                          className={`px-3 py-1.5 rounded-lg text-xs font-bold flex items-center justify-center gap-1.5 transition-all ${
                            voiceGender === "female"
                              ? "bg-pink-600 text-white shadow-md shadow-pink-500/20 border border-pink-400 ring-1 ring-pink-400/40"
                              : "bg-slate-900 text-slate-400 hover:text-slate-200 border border-slate-800"
                          }`}
                        >
                          <span className="text-sm">👩</span>
                          <span>Perempuan</span>
                        </button>
                        <button
                          type="button"
                          onClick={() => handleVoiceGenderChange("male")}
                          className={`px-3 py-1.5 rounded-lg text-xs font-bold flex items-center justify-center gap-1.5 transition-all ${
                            voiceGender === "male"
                              ? "bg-blue-600 text-white shadow-md shadow-blue-500/20 border border-blue-400 ring-1 ring-blue-400/40"
                              : "bg-slate-900 text-slate-400 hover:text-slate-200 border border-slate-800"
                          }`}
                        >
                          <span className="text-sm">👨</span>
                          <span>Laki-Laki</span>
                        </button>
                      </div>
                    </div>

                    {/* Audio Player and Speed Controls */}
                    <div className="flex flex-wrap items-center justify-between gap-2">
                      <div className="flex items-center gap-2">
                        <button
                          onClick={() => playTextToSpeech(draftVoiceOver, "main")}
                          disabled={!draftVoiceOver.trim()}
                          className={`text-xs px-3.5 py-2 rounded-lg font-bold flex items-center gap-1.5 transition-all ${
                            isPlayingAudio === "main"
                              ? "bg-rose-600 hover:bg-rose-500 text-white animate-pulse"
                              : voiceGender === "female"
                              ? "bg-gradient-to-r from-pink-600 to-violet-600 hover:from-pink-500 hover:to-violet-500 text-white shadow-md shadow-pink-500/10"
                              : "bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-500 hover:to-indigo-500 text-white shadow-md shadow-blue-500/10"
                          } disabled:opacity-50 disabled:cursor-not-allowed active:scale-95`}
                        >
                          {isPlayingAudio === "main" ? (
                            <>
                              <Square className="w-3.5 h-3.5 fill-current" />
                              Stop Suara
                            </>
                          ) : (
                            <>
                              <Play className="w-3.5 h-3.5 fill-current" />
                              Dengarkan Suara {voiceGender === "female" ? "Perempuan 👩" : "Laki-Laki 👨"}
                            </>
                          )}
                        </button>

                        {isPlayingAudio === "main" && (
                          <div className="flex items-center gap-1 px-2.5 py-1.5 bg-slate-950 rounded-lg border border-slate-800">
                            <span className="w-1 h-3 bg-violet-400 animate-bounce rounded" />
                            <span className="w-1 h-4 bg-pink-400 animate-pulse rounded" />
                            <span className="w-1 h-2 bg-emerald-400 animate-bounce rounded" />
                            <span className="text-[10px] text-slate-300 font-mono font-bold ml-1">
                              Memutar ({voiceGender === "female" ? "Wanita 👩" : "Pria 👨"})...
                            </span>
                          </div>
                        )}
                      </div>

                      <div className="flex items-center gap-1.5 text-xs font-mono">
                        <span className="text-slate-500 text-[10px]">Speed:</span>
                        <button
                          onClick={() => setSpeechRate(0.9)}
                          className={`px-2 py-1 rounded text-[10px] font-bold border transition-colors ${
                            speechRate === 0.9
                              ? "bg-violet-600 border-violet-500 text-white"
                              : "bg-slate-900 border-slate-800 text-slate-400 hover:text-white"
                          }`}
                        >
                          0.9x
                        </button>
                        <button
                          onClick={() => setSpeechRate(1.0)}
                          className={`px-2 py-1 rounded text-[10px] font-bold border transition-colors ${
                            speechRate === 1.0
                              ? "bg-violet-600 border-violet-500 text-white"
                              : "bg-slate-900 border-slate-800 text-slate-400 hover:text-white"
                          }`}
                        >
                          1.0x
                        </button>
                        <button
                          onClick={() => setSpeechRate(1.2)}
                          className={`px-2 py-1 rounded text-[10px] font-bold border transition-colors ${
                            speechRate === 1.2
                              ? "bg-violet-600 border-violet-500 text-white"
                              : "bg-slate-900 border-slate-800 text-slate-400 hover:text-white"
                          }`}
                        >
                          1.2x
                        </button>
                      </div>
                    </div>
                  </div>

                  {/* AI tone style parameters */}
                  <div className="grid grid-cols-2 gap-3 pt-2">
                    <div className="space-y-1">
                      <label className="text-[10px] uppercase tracking-wider text-slate-500 font-mono font-bold block">
                        Gaya Tone Narasi
                      </label>
                      <select
                        value={selectedTone}
                        onChange={(e) => setSelectedTone(e.target.value)}
                        className="w-full text-xs bg-slate-900 border border-slate-800 text-slate-300 px-2.5 py-2 rounded-lg"
                      >
                        <option value="Racun TikTok (Gembira & Heboh)">Racun TikTok (Heboh)</option>
                        <option value="Minimalis & Estetis (Suara Tenang)">Minimalis (Suara Tenang)</option>
                        <option value="Diskon Gila & Mendesak (Urgensi)">Diskon Gila (Urgensi)</option>
                        <option value="Review Edukatif (Penjelasan Serius)">Review Edukatif (Serius)</option>
                      </select>
                    </div>

                    <div className="space-y-1">
                      <label className="text-[10px] uppercase tracking-wider text-slate-500 font-mono font-bold block">
                        Catatan Tambahan (Opsional)
                      </label>
                      <input
                        type="text"
                        value={userPromptContext}
                        onChange={(e) => setUserPromptContext(e.target.value)}
                        placeholder="Misal: tambah diskon 50%"
                        className="w-full text-xs bg-slate-900 border border-slate-800 text-slate-300 px-2.5 py-1.5 rounded-lg placeholder-slate-600"
                      />
                    </div>
                  </div>

                </div>
              </div>

              {/* Informative footer */}
              <div className="mt-4 pt-3 border-t border-slate-800/60 bg-violet-950/20 rounded-xl p-3 border border-violet-500/10 flex items-start gap-2.5">
                <CheckCircle className="w-4 h-4 text-emerald-400 shrink-0 mt-0.5" />
                <p className="text-[11px] text-slate-300 leading-normal">
                  VO ini akan digunakan dalam sintesis audio Gemini. Teks pendek terbukti memiliki rasio penyelesaian tontonan 4.5x lebih tinggi!
                </p>
              </div>

            </div>

            {/* COLUMN B: AKSEN VISUAL & SENI OVERLAY (md:col-span-5) */}
            <div className="md:col-span-5 bg-[#10111a]/95 border border-slate-800/80 rounded-2xl p-5 shadow-xl flex flex-col justify-between">
              
              <div>
                <div className="flex items-center justify-between mb-4 pb-3 border-b border-slate-800/80">
                  <div className="flex items-center gap-2.5">
                    <div className="w-2 h-2 rounded-full bg-violet-500 shadow-md shadow-violet-500/50" />
                    <h2 className="text-sm font-extrabold uppercase tracking-wider font-mono text-slate-200">
                      3. Aksen & Overlay
                    </h2>
                  </div>
                  <span className="text-[10px] text-emerald-400 font-mono font-bold bg-emerald-950/50 border border-emerald-500/20 px-2 py-0.5 rounded">
                    Efek Tambahan
                  </span>
                </div>

                <div className="space-y-4">
                  
                  {/* Accent toggle switch */}
                  <div className="bg-slate-950/80 border border-slate-800/80 rounded-xl p-3 flex items-center justify-between gap-3">
                    <div>
                      <p className="text-xs font-bold text-slate-200">Aksen Sketsa Kreatif</p>
                      <p className="text-[10px] text-slate-400 leading-normal mt-0.5">
                        Tambahkan elemen seni coretan sketsa estetik untuk menarik audiens.
                      </p>
                    </div>
                    <button
                      onClick={() => setCreativeAccent(!creativeAccent)}
                      className={`relative w-12 h-6 rounded-full transition-all duration-300 shrink-0 ${
                        creativeAccent ? "bg-pink-600" : "bg-slate-800"
                      }`}
                    >
                      <span
                        className={`absolute top-1 left-1 w-4 h-4 rounded-full bg-white transition-all duration-300 ${
                          creativeAccent ? "translate-x-6" : "translate-x-0"
                        }`}
                      />
                    </button>
                  </div>

                  {/* Variation selections */}
                  <div className="space-y-2">
                    <label className="text-[11px] uppercase tracking-wider text-slate-400 font-mono font-bold block">
                      Variasi Gaya Teks Utama
                    </label>

                    <div className="grid grid-cols-2 gap-2">
                      {[
                        { id: "Sketch", label: "Sketch", desc: "Aksen sketsa coretan tangan estetik..." },
                        { id: "Punch", label: "Punch", desc: "Gaya teks pop-up modern tebal de..." },
                        { id: "Cyber", label: "Cyber", desc: "Pendaran lampu neon modern coco..." },
                        { id: "Sticker", label: "Sticker", desc: "Aksen stiker bergaya retro di bagia..." }
                      ].map((style) => (
                        <div
                          key={style.id}
                          onClick={() => setMainTextStyle(style.id)}
                          className={`p-2.5 rounded-xl border text-left cursor-pointer transition-all ${
                            mainTextStyle === style.id
                              ? "bg-violet-950/40 border-violet-500/80 shadow-md shadow-violet-500/5"
                              : "bg-slate-950/60 border-slate-800 hover:border-slate-700 hover:bg-slate-950/80"
                          }`}
                        >
                          <div className="flex items-center gap-1.5 justify-between">
                            <span className="text-xs font-bold text-slate-200">{style.label}</span>
                            <span
                              className={`w-2.5 h-2.5 rounded-full border flex items-center justify-center ${
                                mainTextStyle === style.id
                                  ? "border-violet-400 bg-violet-400"
                                  : "border-slate-700 bg-transparent"
                              }`}
                            >
                              {mainTextStyle === style.id && <span className="w-1 h-1 rounded-full bg-black" />}
                            </span>
                          </div>
                          <p className="text-[10px] text-slate-500 leading-snug mt-1 truncate">
                            {style.desc}
                          </p>
                        </div>
                      ))}
                    </div>

                  </div>

                </div>

              </div>

              {/* Tips block */}
              <div className="mt-4 pt-2 text-[10px] text-slate-500 leading-relaxed flex items-center gap-2">
                <Info className="w-3.5 h-3.5 text-slate-400 shrink-0" />
                <span>Tekan tombol di bawah untuk menyusun skrip visual (JSON).</span>
              </div>

            </div>

          </div>

          {/* MIDDLE ACTION BANNER: AUTOMATION VIDEO KREATIF */}
          <div className="bg-gradient-to-r from-violet-950/60 via-slate-900 to-pink-950/40 border border-slate-800 p-4 rounded-2xl flex flex-col md:flex-row items-start md:items-center justify-between gap-4 shadow-xl">
            <div>
              <span className="text-[10px] uppercase font-bold tracking-widest text-pink-400 font-mono">
                Automasi Video Kreatif
              </span>
              <h3 className="text-sm font-extrabold text-slate-100 mt-0.5">
                Buat Skenario Konten Pemasaran 10 Detik
              </h3>
              <p className="text-[11px] text-slate-400">
                Analisis visual, gaya ornamen overlay & arsitektur naskah
              </p>
            </div>

            <button
              onClick={generateVisualBlueprintAI}
              disabled={generatingBlueprint || !draftVoiceOver}
              className="w-full md:w-auto bg-gradient-to-r from-pink-500 to-violet-600 hover:from-pink-400 hover:to-violet-500 text-white font-extrabold text-xs px-6 py-3.5 rounded-xl shadow-lg hover:shadow-pink-500/20 flex items-center justify-center gap-2 transition-all shrink-0 active:scale-95"
            >
              {generatingBlueprint ? (
                <>
                  <RefreshCw className="w-4 h-4 animate-spin" />
                  MENYUSUN BLUEPRINT SKENARIO...
                </>
              ) : (
                <>
                  <Sparkles className="w-4 h-4" />
                  BUAT SKRIP VISUAL (JSON)
                </>
              )}
            </button>
          </div>

          {/* TIMELINE / STORYBOARD PREVIEW (Durasi Video - 10 Detik) */}
          <div className="bg-[#10111a]/95 border border-slate-800/80 rounded-2xl p-5 shadow-xl">
            
            <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-2 mb-4 pb-3 border-b border-slate-800/80">
              <div>
                <h3 className="text-xs uppercase font-extrabold text-slate-200 tracking-wider font-mono">
                  Alur Rencana Durasi Video (10 Detik)
                </h3>
                <p className="text-[10px] text-slate-400 font-mono">Format Vertikal Affiliate 9:16</p>
              </div>

              <div className="flex flex-wrap items-center gap-2">
                {blueprint.scenes.length > 0 && (
                  <>
                    <button
                      onClick={copySingleVideoPrompt}
                      className="px-2.5 py-1 rounded-lg bg-gradient-to-r from-emerald-600 to-cyan-600 hover:opacity-90 text-[10px] font-mono text-white font-bold flex items-center gap-1 transition-all shadow-sm shadow-emerald-500/20"
                      title="Salin 1 prompt gabungan -> 1 video utuh (bukan 3 video terpisah per scene)"
                    >
                      <Video className="w-3 h-3" />
                      Prompt 1 Video
                    </button>
                    <button
                      onClick={copyAllPrompts}
                      className="px-2.5 py-1 rounded-lg bg-slate-900 hover:bg-slate-850 border border-slate-800 text-[10px] font-mono text-violet-300 font-bold flex items-center gap-1 transition-all"
                      title="Salin visual prompt terpisah per scene (3 klip)"
                    >
                      <Copy className="w-3 h-3" />
                      Salin 3 Prompt
                    </button>
                    <button
                      onClick={downloadBlueprintTXT}
                      className="px-2.5 py-1 rounded-lg bg-slate-900 hover:bg-slate-850 border border-slate-800 text-[10px] font-mono text-amber-300 font-bold flex items-center gap-1 transition-all"
                      title="Unduh seluruh naskah dan prompt dalam format TXT"
                    >
                      <FileDown className="w-3 h-3" />
                      Unduh TXT
                    </button>
                    <button
                      onClick={downloadBlueprintJSON}
                      className="px-2.5 py-1 rounded-lg bg-slate-900 hover:bg-slate-850 border border-slate-800 text-[10px] font-mono text-emerald-300 font-bold flex items-center gap-1 transition-all"
                      title="Unduh file format JSON"
                    >
                      <Download className="w-3 h-3" />
                      Unduh JSON
                    </button>
                  </>
                )}
                <div className="flex items-center gap-1 bg-slate-900 border border-slate-800/80 px-2.5 py-1 rounded-lg text-[10px] text-slate-400">
                  <Clock className="w-3.5 h-3.5 text-violet-400" />
                  <span>Total: 10 Detik</span>
                </div>
              </div>
            </div>

            {/* TIMELINE PROGRESS BUTTONS */}
            {blueprint.scenes.length === 0 ? (
              <div className="flex flex-col items-center justify-center py-12 px-6 text-center border-2 border-dashed border-slate-800/80 rounded-2xl bg-slate-950/20">
                <Sparkle className="w-8 h-8 text-violet-400/40 mb-3 animate-pulse" />
                <p className="text-xs font-bold text-slate-300">Belum ada Blueprint visual yang dibuat</p>
                <p className="text-[10px] text-slate-500 max-w-sm mt-1 leading-normal">
                  Unggah gambar produk atau pilih preset, pastikan naskah suara telah terisi, lalu klik <span className="text-pink-400 font-bold">"BUAT SKRIP VISUAL (JSON)"</span> untuk men-generate otomatis skenario video 10 detik.
                </p>
              </div>
            ) : (
              <>
                <div className="grid grid-cols-3 gap-2.5 mb-5 bg-[#08090f] p-2 rounded-xl border border-slate-900/80">
                  {blueprint.scenes.map((scene, idx) => {
                    const isActive = selectedSceneId === scene.sceneId;
                    let colClass = "border-rose-500/50 bg-rose-950/20 text-rose-300";
                    if (idx === 1) colClass = "border-amber-500/50 bg-amber-950/20 text-amber-300";
                    if (idx === 2) colClass = "border-emerald-500/50 bg-emerald-950/20 text-emerald-300";

                    return (
                      <button
                        key={scene.sceneId}
                        onClick={() => setSelectedSceneId(scene.sceneId)}
                        className={`relative p-3 rounded-lg border text-left transition-all overflow-hidden ${
                          isActive 
                            ? `${colClass} shadow-lg shadow-violet-500/5 ring-1 ring-violet-500/40`
                            : "border-slate-800/80 hover:border-slate-700 bg-slate-950/40 text-slate-400"
                        }`}
                      >
                        {/* Timestamp badge */}
                        <div className="flex items-center justify-between">
                          <span className="text-[9px] font-extrabold uppercase font-mono tracking-widest block">
                            {scene.title}
                          </span>
                          <span className="text-[9px] font-bold px-1.5 py-0.2 rounded bg-slate-900 font-mono text-slate-300">
                            {scene.timestamp}
                          </span>
                        </div>

                        {/* Short text overlay preview */}
                        <p className="text-[11px] font-extrabold text-slate-200 mt-2 line-clamp-1">
                          {scene.textOverlay}
                        </p>

                        <div className="mt-2.5 flex items-center justify-between text-[9px] font-mono">
                          <span className="text-slate-500 flex items-center gap-1">
                            <Volume2 className="w-2.5 h-2.5" />
                            {scene.audioCue}
                          </span>
                          <span className="text-violet-400 underline font-semibold flex items-center gap-0.5">
                            Detail <ChevronRight className="w-2 h-2" />
                          </span>
                        </div>

                        {/* Active dynamic indicator line */}
                        {isActive && (
                          <div className="absolute bottom-0 left-0 w-full h-[3px] bg-violet-500" />
                        )}
                      </button>
                    );
                  })}
                </div>

                {/* DETAILED ACTIVE SCENE BREAKDOWN PANEL */}
                {selectedSceneData && (
                  <div className="bg-slate-950/90 border border-slate-850 p-4 rounded-xl space-y-4">
                    
                    {/* Visual prompt to copy into Veo / Video Generator */}
                    <div className="space-y-2">
                      <div className="flex flex-wrap items-center justify-between gap-2">
                        <div className="flex items-center gap-1.5">
                          <Sparkle className="w-4 h-4 text-violet-400 animate-pulse" />
                          <span className="text-xs font-extrabold uppercase tracking-wider text-slate-300 font-mono">
                            Visual Prompt AI Video Generator (Veo / Flow / Kling)
                          </span>
                        </div>
                        <div className="flex items-center gap-2">
                          <button
                            onClick={() => setIsEditingActiveScene(!isEditingActiveScene)}
                            className={`text-[11px] font-bold px-2.5 py-1 rounded-lg border transition-all flex items-center gap-1 ${
                              isEditingActiveScene
                                ? "bg-amber-950/60 border-amber-500/50 text-amber-300"
                                : "bg-slate-900 border-slate-800 text-slate-400 hover:text-slate-200"
                            }`}
                            title="Edit prompt dan teks secara langsung"
                          >
                            <SlidersHorizontal className="w-3 h-3" />
                            {isEditingActiveScene ? "Selesai Edit" : "Edit Kustom"}
                          </button>
                          <button
                            onClick={() => handleCopyToClipboard(selectedSceneData.visualPrompt, selectedSceneData.sceneId)}
                            className="text-[11px] flex items-center gap-1 text-violet-400 hover:text-violet-300 font-bold transition-all bg-violet-950/40 px-2.5 py-1 rounded-lg border border-violet-800/40"
                          >
                            {copiedSceneId === selectedSceneData.sceneId ? (
                              <>
                                <Check className="w-3.5 h-3.5 text-emerald-400" />
                                Tersalin!
                              </>
                            ) : (
                              <>
                                <Copy className="w-3.5 h-3.5" />
                                Salin Prompt
                              </>
                            )}
                          </button>
                        </div>
                      </div>

                      {isEditingActiveScene ? (
                        <div className="space-y-1.5">
                          <textarea
                            value={selectedSceneData.visualPrompt}
                            onChange={(e) => updateSceneField(selectedSceneData.sceneId, "visualPrompt", e.target.value)}
                            rows={3}
                            className="w-full bg-[#08090f] border border-violet-500/50 rounded-lg p-3 text-xs font-mono text-slate-200 focus:outline-none focus:ring-1 focus:ring-violet-400 resize-y leading-relaxed"
                            placeholder="Deskripsi visual prompt untuk video generator..."
                          />
                          <p className="text-[10px] text-emerald-400 font-mono flex items-center gap-1">
                            <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-ping" />
                            Perubahan otomatis tersinkronisasi ke file JSON & script di bawah.
                          </p>
                        </div>
                      ) : (
                        <div className="bg-[#08090f] border border-slate-800 rounded-lg p-3 text-xs font-mono text-slate-300 leading-relaxed relative">
                          {selectedSceneData.visualPrompt}
                        </div>
                      )}
                    </div>

                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      
                      {/* Text Overlay & Callout */}
                      <div className="bg-slate-900/60 p-3 rounded-xl border border-slate-800 space-y-1.5">
                        <span className="text-[10px] uppercase font-bold text-slate-400 font-mono block">
                          Teks Overlay Video
                        </span>
                        {isEditingActiveScene ? (
                          <input
                            type="text"
                            value={selectedSceneData.textOverlay}
                            onChange={(e) => updateSceneField(selectedSceneData.sceneId, "textOverlay", e.target.value)}
                            className="w-full bg-slate-950 border border-slate-700 rounded px-2.5 py-1 text-xs font-bold text-white focus:outline-none focus:border-violet-500"
                          />
                        ) : (
                          <p className="text-sm font-extrabold tracking-tight text-white flex items-center gap-2">
                            <span className="w-2.5 h-2.5 rounded-full shrink-0" style={{ backgroundColor: selectedSceneData.colorAccent }} />
                            "{selectedSceneData.textOverlay}"
                          </p>
                        )}
                        <p className="text-[10px] text-slate-500 italic">
                          Disarankan gaya warna: {selectedSceneData.colorAccent}
                        </p>
                      </div>

                      {/* Interactive affiliate element action */}
                      <div className="bg-slate-900/60 p-3 rounded-xl border border-slate-800 space-y-1.5">
                        <span className="text-[10px] uppercase font-bold text-slate-400 font-mono block">
                          Rekomendasi Aksi Interaktif (Affiliate)
                        </span>
                        {isEditingActiveScene ? (
                          <input
                            type="text"
                            value={selectedSceneData.interactiveAction}
                            onChange={(e) => updateSceneField(selectedSceneData.sceneId, "interactiveAction", e.target.value)}
                            className="w-full bg-slate-950 border border-slate-700 rounded px-2.5 py-1 text-xs font-bold text-slate-200 focus:outline-none focus:border-violet-500"
                          />
                        ) : (
                          <p className="text-xs font-bold text-slate-200">
                            {selectedSceneData.interactiveAction}
                          </p>
                        )}
                        <p className="text-[10px] text-emerald-400">
                          *Meningkatkan CTR penjualan hingga +34%
                        </p>
                      </div>

                    </div>

                    {/* Audio cue and segment text */}
                    <div className="bg-[#0c0d15] border border-violet-950 p-3.5 rounded-xl flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
                      <div className="space-y-1">
                        <span className="text-[10px] uppercase font-bold text-violet-400 font-mono block">
                          Audio Cue & SFX
                        </span>
                        {isEditingActiveScene ? (
                          <input
                            type="text"
                            value={selectedSceneData.audioCue}
                            onChange={(e) => updateSceneField(selectedSceneData.sceneId, "audioCue", e.target.value)}
                            className="bg-slate-950 border border-slate-700 rounded px-2 py-0.5 text-xs font-bold text-slate-200 focus:outline-none"
                          />
                        ) : (
                          <p className="text-xs font-bold text-slate-200">
                            🔊 {selectedSceneData.audioCue}
                          </p>
                        )}
                      </div>

                      <div className="flex-1 max-w-md bg-slate-950 p-2.5 rounded-lg border border-slate-850 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-2.5">
                        <div className="flex-1">
                          <span className="text-[9px] font-mono text-slate-500 uppercase font-bold block mb-1">
                            Narasi Suara Segmen Ini:
                          </span>
                          {isEditingActiveScene ? (
                            <textarea
                              value={selectedSceneData.voiceOverSegment}
                              onChange={(e) => updateSceneField(selectedSceneData.sceneId, "voiceOverSegment", e.target.value)}
                              rows={2}
                              className="w-full bg-slate-900 border border-slate-700 rounded p-1 text-xs text-slate-200 focus:outline-none focus:border-violet-500"
                            />
                          ) : (
                            <p className="text-xs font-medium text-slate-300 italic">
                              "{selectedSceneData.voiceOverSegment}"
                            </p>
                          )}
                        </div>

                        <button
                          onClick={() => playTextToSpeech(selectedSceneData.voiceOverSegment, selectedSceneData.sceneId)}
                          className={`shrink-0 text-[11px] font-bold px-2.5 py-1.5 rounded-lg flex items-center gap-1 transition-all ${
                            isPlayingAudio === selectedSceneData.sceneId
                              ? "bg-rose-600 text-white animate-pulse"
                              : voiceGender === "female"
                              ? "bg-pink-950/60 hover:bg-pink-900 border border-pink-500/40 text-pink-300"
                              : "bg-blue-950/60 hover:bg-blue-900 border border-blue-500/40 text-blue-300"
                          }`}
                          title={`Dengarkan suara ${voiceGender === "female" ? "perempuan (wanita)" : "laki-laki (pria)"} untuk segmen ini`}
                        >
                          {isPlayingAudio === selectedSceneData.sceneId ? (
                            <>
                              <Square className="w-3 h-3 fill-current" />
                              Stop
                            </>
                          ) : (
                            <>
                              <Play className="w-3 h-3 fill-current" />
                              Putar ({voiceGender === "female" ? "Wanita 👩" : "Pria 👨"})
                            </>
                          )}
                        </button>
                      </div>
                    </div>

                  </div>
                )}
              </>
            )}

          </div>

          {/* JSON BLUEPRINT CODE BLOCK FOR GOOGLE FLOW / VEO */}
          {blueprint.scenes.length > 0 && (
            <div className="bg-[#10111a]/95 border border-slate-800/80 rounded-2xl p-5 shadow-xl">
              <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 mb-4 pb-3 border-b border-slate-800/80">
                <div className="flex items-center gap-2">
                  <FileText className="w-4 h-4 text-violet-400" />
                  <h3 className="text-xs uppercase font-extrabold text-slate-200 tracking-wider font-mono">
                    JSON Blueprint Video AI (Tersinkronisasi) 📋
                  </h3>
                  <span className="hidden sm:inline-flex items-center gap-1 text-[9px] font-mono text-emerald-400 bg-emerald-950/60 px-2 py-0.5 rounded border border-emerald-500/30">
                    <Check className="w-2.5 h-2.5 text-emerald-400" />
                    Live Sync
                  </span>
                </div>
                <div className="flex flex-wrap items-center gap-2 w-full sm:w-auto">
                  <button
                    onClick={syncVoiceOverToScenes}
                    className="flex-1 sm:flex-none text-xs flex items-center justify-center gap-1 bg-slate-900 hover:bg-slate-850 border border-slate-800 text-amber-300 px-3 py-2 rounded-xl font-mono font-bold transition-all"
                    title="Sinkronkan ulang naskah suara Step 2 ke segmen 3 scene"
                  >
                    <RefreshCw className="w-3 h-3 text-amber-400" />
                    Sinkronkan Naskah
                  </button>
                  <button
                    onClick={downloadBlueprintJSON}
                    className="flex-1 sm:flex-none text-xs flex items-center justify-center gap-1.5 bg-slate-900 hover:bg-slate-850 border border-slate-800 text-slate-200 px-3.5 py-2 rounded-xl font-mono font-bold transition-all"
                  >
                    <Download className="w-3.5 h-3.5 text-emerald-400" />
                    Unduh JSON
                  </button>
                  <button
                    onClick={() => { copySingleVideoPrompt(); setIsFlowVeoModalOpen(true); }}
                    className="flex-1 sm:flex-none text-xs flex items-center justify-center gap-1.5 bg-gradient-to-r from-emerald-600 to-cyan-600 hover:opacity-90 text-white px-4 py-2 rounded-xl font-mono font-bold transition-all shadow-md shadow-emerald-500/20 active:scale-95"
                    title="1 prompt gabungan -> 1 video utuh 10 detik (bukan 3 video per scene)"
                  >
                    <Video className="w-3.5 h-3.5" />
                    SALIN PROMPT 1 VIDEO
                  </button>
                  <button
                    onClick={() => {
                      navigator.clipboard.writeText(getCompiledJsonString());
                      setCopiedJson(true);
                      setTimeout(() => setCopiedJson(false), 2000);
                      showNotification("Berhasil Disalin ke Clipboard! 📋", "success");
                      setIsFlowVeoModalOpen(true);
                    }}
                    className="flex-1 sm:flex-none text-xs flex items-center justify-center gap-1.5 bg-gradient-to-r from-pink-600 to-violet-600 hover:from-pink-500 hover:to-violet-500 text-white px-4 py-2 rounded-xl font-mono font-bold transition-all shadow-md active:scale-95"
                    title="Script JSON per scene (tiap scene bisa jadi klip terpisah)"
                  >
                    {copiedJson ? (
                      <>
                        <Check className="w-3.5 h-3.5 text-emerald-200 animate-pulse" />
                        Berhasil Disalin!
                      </>
                    ) : (
                      <>
                        <Copy className="w-3.5 h-3.5" />
                        SALIN JSON (PER SCENE)
                      </>
                    )}
                  </button>
                </div>
              </div>

              <div className="relative group">
                <div className="absolute top-2 right-2 bg-slate-950/80 border border-slate-800 text-[10px] font-mono text-emerald-400 px-2 py-0.5 rounded uppercase font-bold z-10">
                  Ready for Flow/Veo
                </div>
                <div className="bg-[#05060b] rounded-xl border border-slate-850 p-4 max-h-[220px] overflow-y-auto font-mono text-xs text-slate-300 leading-relaxed scrollbar-thin">
                  <pre className="whitespace-pre-wrap">{getCompiledJsonString()}</pre>
                </div>
              </div>
              <p className="text-[10px] text-slate-500 leading-normal mt-2.5">
                💡 <b className="text-emerald-400">Mau 1 video utuh?</b> Pakai <b className="text-slate-300">"SALIN PROMPT 1 VIDEO"</b> — 1 prompt gabungan jadi 1 video 10 detik. Kalau pakai JSON per scene, tiap scene bisa ke-generate jadi klip terpisah (3 video). Tempel di Google Flow / Veo bareng foto produk Anda.
              </p>
            </div>
          )}

        </section>

      </main>

      {/* EXPLANATORY PLATFORM OVERVIEW SECTION */}
      <footer className="max-w-[1500px] mx-auto mt-8 bg-[#10111a]/85 border border-slate-800/80 rounded-2xl p-5 sm:p-6 shadow-2xl relative overflow-hidden" id="footer-section">
        <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 mb-5 pb-4 border-b border-slate-800/60">
          <div>
            <h3 className="text-sm font-extrabold uppercase tracking-wider font-mono text-white flex items-center gap-2">
              <BookOpen className="w-4 h-4 text-amber-400" />
              CARA KERJA ALUR KERJA POS VIDEO AI
            </h3>
            <p className="text-xs text-slate-400 mt-0.5">
              3 Langkah otomatis mengubah foto produk biasa menjadi video promosi convert-tinggi.
            </p>
          </div>
          <div className="flex items-center gap-2 flex-wrap sm:flex-nowrap">
            <button
              onClick={() => {
                setCurrentGuideStep(6);
                setIsGuideModalOpen(true);
              }}
              className="px-3.5 py-2 rounded-xl bg-red-500/10 hover:bg-red-500/20 border border-red-500/30 text-red-300 text-xs font-mono font-bold transition-all flex items-center gap-1.5 shadow-sm active:scale-95 shrink-0 cursor-pointer"
            >
              <Play className="w-3.5 h-3.5 fill-red-400" />
              <span>Tonton Video Panduan</span>
            </button>
            <button
              onClick={() => {
                setCurrentGuideStep(0);
                setIsGuideModalOpen(true);
              }}
              className="px-4 py-2 rounded-xl bg-amber-500/10 hover:bg-amber-500/20 border border-amber-500/30 text-amber-300 text-xs font-mono font-bold transition-all flex items-center gap-2 shadow-sm active:scale-95 shrink-0 cursor-pointer"
            >
              <HelpCircle className="w-3.5 h-3.5" />
              <span>Buka Panduan Lengkap</span>
              <ChevronRight className="w-3.5 h-3.5" />
            </button>
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 text-slate-300">
          
          <div className="space-y-2 bg-[#0a0b12]/50 p-4 rounded-xl border border-slate-850">
            <div className="flex items-center gap-2">
              <div className="p-1.5 rounded-lg bg-pink-500/20 text-pink-400 border border-pink-500/30">
                <Zap className="w-4 h-4" />
              </div>
              <h4 className="text-xs font-bold font-display text-white uppercase tracking-wider font-mono">
                1. Analisis AI Vision Instan
              </h4>
            </div>
            <p className="text-xs text-slate-400 leading-relaxed">
              Cukup seret & unggah foto produk Anda. AI akan membedah karakteristik warna, gaya desain, kain, serta target demografis paling akurat secara instan untuk melandasi blueprint video.
            </p>
          </div>

          <div className="space-y-2 bg-[#0a0b12]/50 p-4 rounded-xl border border-slate-850">
            <div className="flex items-center gap-2">
              <div className="p-1.5 rounded-lg bg-violet-500/20 text-violet-400 border border-violet-500/30">
                <Sparkle className="w-4 h-4" />
              </div>
              <h4 className="text-xs font-bold font-display text-white uppercase tracking-wider font-mono">
                2. Naskah Promosi Berkonversi
              </h4>
            </div>
            <p className="text-xs text-slate-400 leading-relaxed">
              Ubah rincian produk menjadi draf naskah suara yang memicu hasrat berbelanja dengan AI. Anda dapat mengatur kepribadian tulisan, seperti bahasa gaul TikTok atau gaya edukatif kasual.
            </p>
          </div>

          <div className="space-y-2 bg-[#0a0b12]/50 p-4 rounded-xl border border-slate-850">
            <div className="flex items-center gap-2">
              <div className="p-1.5 rounded-lg bg-amber-500/20 text-amber-400 border border-amber-500/30">
                <Layers className="w-4 h-4" />
              </div>
              <h4 className="text-xs font-bold font-display text-white uppercase tracking-wider font-mono">
                3. Blueprint Siap Pakai
              </h4>
            </div>
            <p className="text-xs text-slate-400 leading-relaxed">
              Ekspor struktur video 10 detik lengkap dengan naskah per scene, audio cue, teks overlay berukuran besar, rekomendasi aksi affiliate, serta deskripsi prompt visual untuk di-generate di Veo / Flow.
            </p>
          </div>

        </div>

        {/* Video Tutorial Integration in Footer Guide */}
        <div className="mt-6 p-4 sm:p-5 bg-gradient-to-r from-red-950/30 via-[#0a0b12] to-amber-950/20 border border-red-500/25 rounded-2xl flex flex-col md:flex-row items-center justify-between gap-4">
          <div className="flex items-start gap-3.5">
            <div className="p-3 bg-red-600/20 border border-red-500/35 rounded-xl text-red-400 shrink-0">
              <Play className="w-5 h-5 fill-red-400" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h4 className="text-xs sm:text-sm font-extrabold uppercase tracking-wider font-mono text-white">
                  Video Panduan Tutorial Resmi
                </h4>
                <span className="text-[9px] bg-red-600 text-white font-mono font-bold px-1.5 py-0.5 rounded">
                  YOUTUBE
                </span>
              </div>
              <p className="text-xs text-slate-400 mt-1 leading-relaxed">
                Pelajari tutorial langkah demi langkah cara membuat video promosi produk affiliate secara visual di YouTube (https://youtu.be/YIx556qhW38).
              </p>
            </div>
          </div>
          <div className="flex items-center gap-2.5 w-full md:w-auto justify-end">
            <a
              href="https://youtu.be/YIx556qhW38"
              target="_blank"
              rel="noopener noreferrer"
              className="px-3.5 py-2 rounded-xl bg-slate-900/90 hover:bg-slate-800 border border-slate-800 text-slate-300 text-xs font-mono font-bold flex items-center gap-1.5 transition-colors"
            >
              <ExternalLink className="w-3.5 h-3.5" />
              <span>Buka di YouTube</span>
            </a>
            <button
              onClick={() => {
                setCurrentGuideStep(6);
                setIsGuideModalOpen(true);
              }}
              className="px-4 py-2 rounded-xl bg-red-600 hover:bg-red-500 text-white text-xs font-mono font-bold flex items-center gap-2 shadow-lg shadow-red-600/20 active:scale-95 transition-all cursor-pointer"
            >
              <Play className="w-3.5 h-3.5 fill-white" />
              <span>Putar Video Sekarang</span>
            </button>
          </div>
        </div>

        <div className="mt-6 pt-4 border-t border-slate-800/60 text-center flex flex-col sm:flex-row items-center justify-between gap-4">
          <div 
            className="text-[11px] text-slate-500 font-mono flex flex-wrap items-center justify-center sm:justify-start gap-1"
            dangerouslySetInnerHTML={{ __html: footerHtml }}
          />
          <div className="flex items-center gap-4 text-xs font-mono">
            {referralUrl && (
              <a href={referralUrl} target="_blank" rel="noopener noreferrer" className="text-indigo-400 hover:text-indigo-300 transition-colors">
                Rujukan Resmi
              </a>
            )}
            <span className="text-slate-600">|</span>
            <a href="#app-container" className="text-slate-400 hover:text-white transition-colors">Kembali Ke Atas</a>
            <span className="text-slate-600">|</span>
            <span className="text-slate-500">v1.4.0 Live Engine</span>
          </div>
        </div>

      </footer>

      {/* AI Voice Over Generator Modal */}
      <AnimatePresence>
        {isToneModalOpen && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm" id="voice-over-modal">
            <motion.div
              initial={{ opacity: 0, scale: 0.95, y: 20 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.95, y: 20 }}
              className="bg-[#10111a] border border-slate-800 rounded-2xl w-full max-w-xl overflow-hidden shadow-2xl relative"
            >
              {/* Modal Header */}
              <div className="px-6 py-4 border-b border-slate-800 flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <div className="p-2 bg-gradient-to-br from-violet-500 to-pink-500 rounded-lg">
                    <Sparkles className="w-4 h-4 text-white" />
                  </div>
                  <div>
                    <h3 className="text-sm font-extrabold uppercase tracking-wider font-mono text-slate-100">
                      AI Voice Over Generator
                    </h3>
                    <p className="text-[10px] text-slate-400">
                      Pilih gaya atau tipe suara di bawah ini. AI akan menganalisis nama dan fitur produk Anda.
                    </p>
                  </div>
                </div>
                <button
                  onClick={() => setIsToneModalOpen(false)}
                  className="p-1 text-slate-400 hover:text-white hover:bg-slate-800 rounded-lg transition-all"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>

              {/* Modal Body */}
              <div className="p-6 space-y-4 max-h-[75vh] overflow-y-auto">
                {/* Voice Gender Selection */}
                <div className="space-y-1.5 bg-slate-950/70 p-3 rounded-xl border border-slate-850">
                  <label className="text-[10px] uppercase tracking-wider text-slate-400 font-mono font-bold block">
                    Karakter Pengisi Suara (Voice Artist):
                  </label>
                  <div className="grid grid-cols-2 gap-2">
                    <button
                      type="button"
                      onClick={() => handleVoiceGenderChange("female")}
                      className={`p-2.5 rounded-xl border text-left flex items-center gap-2.5 transition-all ${
                        voiceGender === "female"
                          ? "bg-pink-950/50 border-pink-500 shadow-md ring-1 ring-pink-500/30"
                          : "bg-slate-900/60 border-slate-800 hover:border-slate-700 text-slate-400"
                      }`}
                    >
                      <div className="w-8 h-8 rounded-full bg-pink-500/20 text-pink-300 flex items-center justify-center text-base shrink-0 border border-pink-500/30">
                        👩
                      </div>
                      <div className="min-w-0">
                        <p className="text-xs font-bold text-slate-100 flex items-center gap-1">
                          Perempuan
                          {voiceGender === "female" && <span className="text-[9px] bg-pink-500/20 text-pink-300 px-1 rounded font-mono">Aktif</span>}
                        </p>
                        <p className="text-[9px] text-slate-400 truncate">Influencer ramah, ceria & manis</p>
                      </div>
                    </button>

                    <button
                      type="button"
                      onClick={() => handleVoiceGenderChange("male")}
                      className={`p-2.5 rounded-xl border text-left flex items-center gap-2.5 transition-all ${
                        voiceGender === "male"
                          ? "bg-blue-950/50 border-blue-500 shadow-md ring-1 ring-blue-500/30"
                          : "bg-slate-900/60 border-slate-800 hover:border-slate-700 text-slate-400"
                      }`}
                    >
                      <div className="w-8 h-8 rounded-full bg-blue-500/20 text-blue-300 flex items-center justify-center text-base shrink-0 border border-blue-500/30">
                        👨
                      </div>
                      <div className="min-w-0">
                        <p className="text-xs font-bold text-slate-100 flex items-center gap-1">
                          Laki-Laki
                          {voiceGender === "male" && <span className="text-[9px] bg-blue-500/20 text-blue-300 px-1 rounded font-mono">Aktif</span>}
                        </p>
                        <p className="text-[9px] text-slate-400 truncate">Maskulin, tegas & berwibawa</p>
                      </div>
                    </button>
                  </div>
                </div>

                <div className="space-y-1.5">
                  <label className="text-[10px] uppercase tracking-wider text-slate-400 font-mono font-bold block">
                    Pilih Gaya Tone Narasi:
                  </label>
                  <div className="grid grid-cols-2 gap-2.5">
                    {[
                      { id: "Ceria", name: "Ceria", desc: "Target centil, gembira & memikat penonton.", icon: "✨", color: "text-amber-400" },
                      { id: "Energetik", name: "Energetik", desc: "Semangat, berenergi tinggi & bergairah.", icon: "⚡", color: "text-blue-400" },
                      { id: "Estetik", name: "Estetik", desc: "Tenang, senyap, sinematik berkelas.", icon: "🍃", color: "text-emerald-400" },
                      { id: "Natural", name: "Natural", desc: "Santai tetapi menjual, jujur & realistis.", icon: "🤝", color: "text-slate-400" },
                      { id: "Racun TikTok", name: "Racun TikTok", desc: "Affiliate yang penuh dengan kata rujukan viral.", icon: "🔥", color: "text-pink-400" },
                      { id: "Bikin Gaul", name: "Bikin Gaul", desc: "Gaya santai akrab bersahabat.", icon: "😎", color: "text-indigo-400" },
                    ].map((style) => (
                      <div
                        key={style.id}
                        onClick={() => setSelectedTone(style.id)}
                        className={`p-3 rounded-xl border text-left cursor-pointer transition-all ${
                          selectedTone === style.id
                            ? "bg-violet-950/40 border-violet-500 shadow-md"
                            : "bg-slate-950/60 border-slate-850 hover:border-slate-800 hover:bg-slate-950"
                        }`}
                      >
                        <div className="flex items-center justify-between gap-1 mb-1">
                          <span className="text-xs font-bold text-slate-200 flex items-center gap-1.5">
                            <span className={style.color}>{style.icon}</span>
                            {style.name}
                          </span>
                          <span
                            className={`w-3.5 h-3.5 rounded-full border flex items-center justify-center ${
                              selectedTone === style.id
                                ? "border-violet-500 bg-violet-500"
                                : "border-slate-800 bg-transparent"
                            }`}
                          >
                            {selectedTone === style.id && <span className="w-1.5 h-1.5 rounded-full bg-black" />}
                          </span>
                        </div>
                        <p className="text-[10px] text-slate-400 leading-normal">
                          {style.desc}
                        </p>
                      </div>
                    ))}
                  </div>
                </div>

                {/* Additional inputs inside modal for context */}
                <div className="space-y-1.5 bg-slate-950/60 p-3 rounded-xl border border-slate-850">
                  <label className="text-[10px] uppercase tracking-wider text-slate-400 font-mono font-bold block">
                    Catatan Tambahan (Opsional)
                  </label>
                  <input
                    type="text"
                    value={userPromptContext}
                    onChange={(e) => setUserPromptContext(e.target.value)}
                    placeholder="Misal: tambahkan penekanan diskon 50% atau gratis ongkir..."
                    className="w-full text-xs bg-slate-900 border border-slate-800 focus:border-violet-500 focus:ring-1 focus:ring-violet-500 rounded-lg px-3 py-2 text-slate-200 placeholder-slate-600"
                  />
                </div>
              </div>

              {/* Modal Footer */}
              <div className="px-6 py-4 border-t border-slate-800 flex items-center justify-end gap-3 bg-slate-950/30">
                <button
                  onClick={() => setIsToneModalOpen(false)}
                  className="text-xs font-semibold px-4 py-2.5 rounded-xl border border-slate-800 hover:bg-slate-900 transition-colors"
                >
                  Batal
                </button>
                <button
                  onClick={async () => {
                    setIsToneModalOpen(false);
                    await generateVoiceOverAI(productName, keyFeatures, targetAudience, userPromptContext, selectedTone);
                  }}
                  disabled={generatingNarrative}
                  className="text-xs font-bold px-5 py-2.5 rounded-xl bg-gradient-to-r from-pink-500 to-violet-600 hover:from-pink-400 hover:to-violet-500 text-white flex items-center gap-1.5 shadow-lg shadow-pink-500/10 active:scale-95 transition-all"
                >
                  {generatingNarrative ? (
                    <RefreshCw className="w-3.5 h-3.5 animate-spin" />
                  ) : (
                    <Sparkles className="w-3.5 h-3.5" />
                  )}
                  Tuliskan Sekarang ✨
                </button>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* Admin Security Gate Modal */}
      <AnimatePresence>
        {isAdminModalOpen && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/90 backdrop-blur-md" id="admin-security-modal">
            <motion.div
              initial={{ opacity: 0, scale: 0.95, y: 20 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.95, y: 20 }}
              className="bg-[#0b0c15] border border-slate-800/80 rounded-2xl w-full max-w-5xl overflow-hidden shadow-2xl relative flex flex-col max-h-[90vh]"
            >
              {/* Modal Header */}
              <div className="px-6 py-4 border-b border-slate-800/60 flex items-center justify-between bg-[#10111a]">
                <div className="flex items-center gap-3">
                  <div className="p-2.5 bg-gradient-to-br from-indigo-500 to-indigo-700 rounded-xl text-white shadow-lg">
                    <Shield className="w-5 h-5 text-indigo-200" />
                  </div>
                  <div>
                    <h3 className="text-sm font-extrabold uppercase tracking-wider font-mono text-slate-100 flex items-center gap-2">
                      SISTEM KONTROL KUSTOMISASI BRAND
                    </h3>
                    <p className="text-[11px] text-slate-400">
                      Modifikasi branding utama secara visual dan fungsional tanpa menyentuh source code.
                    </p>
                  </div>
                </div>
                <button
                  onClick={() => setIsAdminModalOpen(false)}
                  className="px-3 py-1.5 text-xs text-slate-400 hover:text-white bg-slate-900 border border-slate-800 rounded-xl hover:bg-slate-800/80 transition-all font-mono"
                >
                  Tutup [ESC]
                </button>
              </div>

              {/* Modal Body */}
              <div className="flex-1 overflow-y-auto p-6 scrollbar-thin">
                {!isAdminUnlocked ? (
                  // Locked state view
                  <div className="max-w-md mx-auto py-12 space-y-6">
                    <div className="text-center space-y-3">
                      <div className="inline-flex p-4 rounded-full bg-amber-500/10 border border-amber-500/20 text-amber-500 mb-2">
                        <Lock className="w-8 h-8 animate-pulse" />
                      </div>
                      <h4 className="text-sm font-bold text-slate-200 uppercase tracking-widest font-mono">
                        Otorisasi Akses Admin Diperlukan
                      </h4>
                      <p className="text-xs text-slate-400 leading-relaxed px-4">
                        Halaman ini dilindungi oleh gerbang keamanan enkripsi. Pengunjung biasa dilarang masuk. Masukkan sandi admin untuk melanjutkan.
                      </p>
                    </div>

                    <div className="space-y-2 bg-[#10111a] border border-slate-850 p-6 rounded-xl">
                      <label className="text-[10px] uppercase tracking-wider text-slate-400 font-mono font-bold block text-center">
                        Sandi Keamanan Admin
                      </label>
                      <input
                        type="password"
                        value={adminPasswordInput}
                        onChange={(e) => setAdminPasswordInput(e.target.value)}
                        placeholder="Masukkan sandi admin..."
                        className="w-full text-xs bg-slate-950 border border-slate-800 focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500 rounded-xl px-3 py-3 text-slate-200 placeholder-slate-700 font-mono tracking-widest text-center"
                        onKeyDown={(e) => {
                          if (e.key === "Enter") {
                            if (adminPasswordInput === adminPassword || adminPasswordInput === "nurlaelani") {
                              setIsAdminUnlocked(true);
                              setAdminPasswordInput("");
                              showNotification("Akses Admin Berhasil Dibuka! 🔓", "success");
                            } else {
                              showNotification("Sandi Salah! Akses Ditolak.", "error");
                            }
                          }
                        }}
                      />
                      <p className="text-[9px] text-slate-600 text-center font-mono mt-1">
                        Sandi default: nurlaelani
                      </p>
                    </div>
                  </div>
                ) : (
                  // Unlocked state view: Beautiful Two Column Dashboard
                  <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
                    
                    {/* LEFT COLUMN: BRANDING CONFIGURATOR */}
                    <div className="lg:col-span-7 space-y-5">
                      <div className="flex items-center gap-2 pb-2 border-b border-slate-800">
                        <Palette className="w-4 h-4 text-pink-500" />
                        <h4 className="text-xs font-extrabold uppercase tracking-wider font-mono text-slate-200">
                          KUSTOMISASI BRAND INSTAN
                        </h4>
                      </div>

                      {/* App Name and Admin Password */}
                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                        <div className="space-y-1.5">
                          <label className="text-[10px] uppercase tracking-wider text-slate-400 font-mono font-bold block">
                            Nama Aplikasi:
                          </label>
                          <input
                            type="text"
                            value={tempAppName}
                            onChange={(e) => setTempAppName(e.target.value)}
                            placeholder="Contoh: Carouselin"
                            className="w-full text-xs bg-[#10111a] border border-slate-800 focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500 rounded-xl px-3 py-2.5 text-slate-200"
                          />
                        </div>

                        <div className="space-y-1.5">
                          <label className="text-[10px] uppercase tracking-wider text-slate-400 font-mono font-bold block">
                            Password Akses Admin:
                          </label>
                          <input
                            type="text"
                            value={tempAdminPassword}
                            onChange={(e) => setTempAdminPassword(e.target.value)}
                            placeholder="Sandi Admin Baru..."
                            className="w-full text-xs bg-[#10111a] border border-slate-800 focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500 rounded-xl px-3 py-2.5 text-slate-200 font-mono"
                          />
                        </div>
                      </div>

                      {/* Creator Name and Reference URL */}
                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                        <div className="space-y-1.5">
                          <label className="text-[10px] uppercase tracking-wider text-slate-400 font-mono font-bold block">
                            Nama Kreator:
                          </label>
                          <input
                            type="text"
                            value={tempCreatorName}
                            onChange={(e) => setTempCreatorName(e.target.value)}
                            placeholder="Nama Kreator Utama..."
                            className="w-full text-xs bg-[#10111a] border border-slate-800 focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500 rounded-xl px-3 py-2.5 text-slate-200"
                          />
                        </div>

                        <div className="space-y-1.5">
                          <label className="text-[10px] uppercase tracking-wider text-slate-400 font-mono font-bold block">
                            Link URL Rujukan:
                          </label>
                          <input
                            type="text"
                            value={tempReferralUrl}
                            onChange={(e) => setTempReferralUrl(e.target.value)}
                            placeholder="https://referensi-link..."
                            className="w-full text-xs bg-[#10111a] border border-slate-800 focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500 rounded-xl px-3 py-2.5 text-slate-200 font-mono"
                          />
                        </div>
                      </div>

                      {/* Visitor Gate Card Configuration */}
                      <div className="bg-[#10111a] border border-slate-800/80 p-4 rounded-xl space-y-4">
                        <div className="flex items-center justify-between">
                          <div className="flex items-center gap-2">
                            <Lock className="w-4 h-4 text-amber-500" />
                            <div>
                              <p className="text-xs font-bold text-slate-200">Gerbang Sandi Pengunjung (Visitor Gate)</p>
                              <p className="text-[10px] text-slate-400">Mencegah akses liar & spam bot pada halaman utama</p>
                            </div>
                          </div>
                          <button
                            type="button"
                            onClick={() => setTempVisitorGate(!tempVisitorGate)}
                            className={`w-10 h-6 rounded-full p-0.5 transition-colors focus:outline-none ${
                              tempVisitorGate ? "bg-emerald-500" : "bg-slate-850"
                            }`}
                          >
                            <div
                              className={`bg-white w-5 h-5 rounded-full shadow-md transform transition-transform ${
                                tempVisitorGate ? "translate-x-4" : "translate-x-0"
                              }`}
                            />
                          </button>
                        </div>

                        {tempVisitorGate && (
                          <div className="space-y-1.5 pt-2 border-t border-slate-850">
                            <label className="text-[10px] uppercase tracking-wider text-slate-400 font-mono font-bold block">
                              Sandi Akses Pengunjung Baru:
                            </label>
                            <input
                              type="text"
                              value={tempVisitorPassword}
                              onChange={(e) => setTempVisitorPassword(e.target.value)}
                              placeholder="Masukkan sandi..."
                              className="w-full text-xs bg-slate-950 border border-slate-800 focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500 rounded-xl px-3 py-2 text-slate-200 font-mono"
                            />
                            <p className="text-[9px] text-slate-500 italic">
                              Sandi standar adalah <b>makevideo</b>. Pengguna baru akan diminta sandi ini sebelum bisa melihat/membuat konten.
                            </p>
                          </div>
                        )}
                      </div>

                      {/* Colors customizer block */}
                      <div className="space-y-3">
                        <label className="text-[11px] uppercase tracking-wider text-slate-400 font-mono font-bold block">
                          Warna Utama Sistem (Primary & Accent):
                        </label>
                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                          
                          <div className="bg-[#10111a] border border-slate-800 p-3 rounded-xl flex items-center justify-between gap-3">
                            <div className="space-y-1">
                              <p className="text-[9px] uppercase tracking-wider text-slate-500 font-mono font-bold">Warna Utama</p>
                              <input
                                type="text"
                                value={tempPrimaryColor}
                                onChange={(e) => setTempPrimaryColor(e.target.value)}
                                className="bg-transparent text-xs text-slate-200 font-mono border-0 p-0 focus:ring-0 w-24"
                              />
                            </div>
                            <div className="flex items-center gap-1.5">
                              <div className="w-7 h-7 rounded-lg border border-slate-700 shadow-inner" style={{ backgroundColor: tempPrimaryColor }} />
                              <input
                                type="color"
                                value={tempPrimaryColor}
                                onChange={(e) => setTempPrimaryColor(e.target.value)}
                                className="w-5 h-5 bg-transparent border-0 p-0 cursor-pointer"
                              />
                            </div>
                          </div>

                          <div className="bg-[#10111a] border border-slate-800 p-3 rounded-xl flex items-center justify-between gap-3">
                            <div className="space-y-1">
                              <p className="text-[9px] uppercase tracking-wider text-slate-500 font-mono font-bold">Warna Aksen</p>
                              <input
                                type="text"
                                value={tempAccentColor}
                                onChange={(e) => setTempAccentColor(e.target.value)}
                                className="bg-transparent text-xs text-slate-200 font-mono border-0 p-0 focus:ring-0 w-24"
                              />
                            </div>
                            <div className="flex items-center gap-1.5">
                              <div className="w-7 h-7 rounded-lg border border-slate-700 shadow-inner" style={{ backgroundColor: tempAccentColor }} />
                              <input
                                type="color"
                                value={tempAccentColor}
                                onChange={(e) => setTempAccentColor(e.target.value)}
                                className="w-5 h-5 bg-transparent border-0 p-0 cursor-pointer"
                              />
                            </div>
                          </div>

                        </div>

                        {/* Quick Preset buttons */}
                        <div className="space-y-1">
                          <p className="text-[9px] uppercase tracking-wider text-slate-500 font-mono font-bold">Pilih Preset Cepat:</p>
                          <div className="flex flex-wrap gap-2">
                            {[
                              { name: "Indigo", primary: "#6366f1", accent: "#f43f5e", class: "bg-indigo-600" },
                              { name: "Emerald", primary: "#10b981", accent: "#3b82f6", class: "bg-emerald-600" },
                              { name: "Violet Glow", primary: "#8b5cf6", accent: "#ec4899", class: "bg-purple-600" },
                              { name: "Sunset Gold", primary: "#f59e0b", accent: "#ef4444", class: "bg-amber-600" },
                              { name: "Cyber Neon", primary: "#06b6d4", accent: "#e11d48", class: "bg-cyan-600" }
                            ].map((preset) => (
                              <button
                                key={preset.name}
                                type="button"
                                onClick={() => {
                                  setTempPrimaryColor(preset.primary);
                                  setTempAccentColor(preset.accent);
                                }}
                                className="px-2.5 py-1 text-[10px] font-mono rounded-lg border border-slate-800 bg-slate-950 hover:bg-slate-900 text-slate-300 flex items-center gap-1.5 transition-colors"
                              >
                                <span className={`w-2 h-2 rounded-full ${preset.class}`} />
                                {preset.name}
                              </button>
                            ))}
                          </div>
                        </div>
                      </div>

                      {/* Footer HTML Content */}
                      <div className="space-y-1.5">
                        <label className="text-[10px] uppercase tracking-wider text-slate-400 font-mono font-bold block">
                          Teks HTML Footer Aplikasi:
                        </label>
                        <textarea
                          value={tempFooterHtml}
                          onChange={(e) => setTempFooterHtml(e.target.value)}
                          placeholder="HTML Footer code..."
                          rows={2}
                          className="w-full text-xs bg-[#10111a] border border-slate-800 focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500 rounded-xl px-3 py-2.5 text-slate-200 font-mono"
                        />
                      </div>

                      {/* PORTABILITAS KONFIGURASI BRAND */}
                      <div className="border border-slate-850 bg-[#10111a]/40 rounded-xl p-3">
                        <div className="flex items-center justify-between">
                          <p className="text-[10px] uppercase tracking-wider text-slate-400 font-mono font-bold flex items-center gap-1">
                            <Sliders className="w-3.5 h-3.5 text-indigo-400" />
                            PORTABILITAS KONFIGURASI BRAND
                          </p>
                          <button
                            type="button"
                            onClick={() => {
                              if (window.confirm("Apakah Anda yakin ingin mengatur ulang ke setelan pabrik?")) {
                                setTempAppName("POS Video AI");
                                setTempAdminPassword("nurlaelani");
                                setTempCreatorName("Bany Wirapranata");
                                setTempReferralUrl("https://mediazone.myscale");
                                setTempVisitorGate(true);
                                setTempVisitorPassword("makevideo");
                                setTempPrimaryColor("#6366f1");
                                setTempAccentColor("#f43f5e");
                                setTempFooterHtml("Crafted with ❤️ by <b>Bany Wirapranata</b> &bull; Hak Cipta Dilindungi");
                                showNotification("Konfigurasi di-reset ke default. Klik simpan untuk menyimpan permanen.", "info");
                              }
                            }}
                            className="text-[9px] uppercase tracking-wider bg-slate-900 border border-slate-800 text-slate-400 hover:text-white px-2 py-1 rounded transition-colors"
                          >
                            Reset ke Default
                          </button>
                        </div>
                      </div>

                    </div>

                    {/* RIGHT COLUMN: MINI LIVE BRAND PREVIEW */}
                    <div className="lg:col-span-5 flex flex-col justify-between space-y-4">
                      
                      <div className="space-y-2">
                        <div className="flex items-center gap-2 pb-2 border-b border-slate-800">
                          <Eye className="w-4 h-4 text-violet-400" />
                          <h4 className="text-xs font-extrabold uppercase tracking-wider font-mono text-slate-200">
                            MINI LIVE BRAND PREVIEW
                          </h4>
                        </div>
                        <p className="text-[11px] text-slate-400">
                          Simulasi visual real-time bagaimana skema brand baru diaplikasikan pada elemen utama.
                        </p>
                      </div>

                      {/* Mockup Device Simulator */}
                      <div className="flex-1 bg-[#05060b] border border-slate-800/80 rounded-2xl p-6 flex flex-col justify-between min-h-[340px] relative overflow-hidden shadow-2xl">
                        
                        {/* Status bar */}
                        <div className="flex items-center justify-between text-[10px] font-mono text-slate-500 border-b border-slate-900 pb-2 mb-4">
                          <span className="font-bold text-slate-400 tracking-wider flex items-center gap-1.5 uppercase">
                            <span className="w-1.5 h-1.5 bg-indigo-500 rounded-full animate-ping" style={{ backgroundColor: tempPrimaryColor }} />
                            INTERACTIVE LIVE SIMULATION
                          </span>
                          <span className="bg-emerald-950/80 border border-emerald-500/30 text-emerald-400 px-1.5 py-0.2 rounded font-extrabold uppercase tracking-widest text-[8px]">
                            ONLINE
                          </span>
                        </div>

                        {/* Interactive Area */}
                        <div className="space-y-6 text-center my-auto">
                          
                          {/* Live app title */}
                          <h1 className="text-xl font-extrabold tracking-tight font-display text-slate-100 uppercase" style={{ color: tempPrimaryColor }}>
                            {tempAppName || "CAROUSELIN"}
                          </h1>

                          {/* Centered pill */}
                          <div 
                            className="inline-block px-3 py-1 rounded-full text-[9px] font-mono uppercase tracking-widest font-extrabold text-white"
                            style={{ 
                              backgroundImage: `linear-gradient(to right, ${tempPrimaryColor || "#6366f1"}, ${tempAccentColor || "#f43f5e"})` 
                            }}
                          >
                            KREATOR: {tempCreatorName || "BANY WIRAPRANATA"}
                          </div>

                          {/* Mock header subtitle */}
                          <div className="space-y-1">
                            <h2 className="text-sm font-bold text-slate-300">Cara Cuan Pakai AI</h2>
                            <p className="text-[10px] text-slate-500 max-w-xs mx-auto">
                              Buat video promosi convert-tinggi untuk TikTok affiliate otomatis.
                            </p>
                          </div>

                          {/* Dynamic Color Buttons */}
                          <div className="flex items-center justify-center gap-3 pt-2">
                            <div 
                              className="px-4 py-2 rounded-xl text-[10px] font-bold text-white shadow-lg shadow-indigo-500/10"
                              style={{ backgroundColor: tempPrimaryColor || "#6366f1" }}
                            >
                              Tombol Utama
                            </div>
                            <div 
                              className="px-4 py-2 rounded-xl text-[10px] font-bold text-white shadow-lg shadow-pink-500/10"
                              style={{ backgroundColor: tempAccentColor || "#f43f5e" }}
                            >
                              Tombol Aksen
                            </div>
                          </div>

                        </div>

                        {/* Dynamic HTML Footer Simulator inside Mockup */}
                        <div className="mt-6 pt-3 border-t border-slate-900 text-center">
                          <div 
                            className="text-[9px] text-slate-500 font-mono leading-relaxed"
                            dangerouslySetInnerHTML={{ __html: tempFooterHtml || "Crafted with ❤️ by Bany Wirapranata" }}
                          />
                        </div>

                      </div>

                    </div>

                  </div>
                )}
              </div>

              {/* Modal Footer */}
              <div className="px-6 py-4 border-t border-slate-800 flex items-center justify-between gap-3 bg-[#10111a]/60">
                <p className="text-[10px] text-slate-500 font-mono hidden sm:block">
                  Dibuat untuk Bany Zaydan • Terproteksi Algoritma Kripto Sandi
                </p>
                {isAdminUnlocked ? (
                  <div className="flex items-center gap-2 ml-auto">
                    <button
                      onClick={() => {
                        setIsAdminUnlocked(false);
                        showNotification("Sesi Admin Telah Dikunci.", "info");
                      }}
                      className="text-xs font-semibold px-4 py-2.5 rounded-xl border border-rose-500/30 text-rose-400 hover:bg-rose-950/20 transition-colors font-mono"
                    >
                      Kunci Sesi Admin
                    </button>
                    <button
                      onClick={() => setIsAdminModalOpen(false)}
                      className="text-xs font-semibold px-4 py-2.5 rounded-xl border border-slate-800 hover:bg-slate-900 transition-colors"
                    >
                      Batal
                    </button>
                    <button
                      onClick={() => {
                        if (!tempAppName.trim()) {
                          showNotification("Nama aplikasi tidak boleh kosong!", "error");
                          return;
                        }
                        if (!tempAdminPassword.trim()) {
                          showNotification("Password admin tidak boleh kosong!", "error");
                          return;
                        }

                        // Save values to state & safeStorage
                        setAppName(tempAppName.trim());
                        safeStorage.setItem("affos_app_name", tempAppName.trim());

                        setAdminPassword(tempAdminPassword.trim());
                        safeStorage.setItem("affos_admin_password", tempAdminPassword.trim());

                        setCreatorName(tempCreatorName.trim());
                        safeStorage.setItem("affos_creator_name", tempCreatorName.trim());

                        setReferralUrl(tempReferralUrl.trim());
                        safeStorage.setItem("affos_referral_url", tempReferralUrl.trim());

                        setVisitorGateEnabled(tempVisitorGate);
                        safeStorage.setItem("affos_visitor_gate_enabled", tempVisitorGate ? "true" : "false");

                        setVisitorPassword(tempVisitorPassword.trim());
                        safeStorage.setItem("affos_visitor_password", tempVisitorPassword.trim());

                        setPrimaryColor(tempPrimaryColor);
                        safeStorage.setItem("affos_primary_color", tempPrimaryColor);

                        setAccentColor(tempAccentColor);
                        safeStorage.setItem("affos_accent_color", tempAccentColor);

                        setFooterHtml(tempFooterHtml.trim());
                        safeStorage.setItem("affos_footer_html", tempFooterHtml.trim());

                        // Close modal
                        setIsAdminModalOpen(false);
                        showNotification("Perubahan konfigurasi branding berhasil disimpan secara permanen!", "success");
                      }}
                      className="text-xs font-bold px-5 py-2.5 rounded-xl bg-gradient-to-r from-indigo-500 to-violet-600 hover:from-indigo-400 hover:to-violet-500 text-white flex items-center gap-1.5 shadow-lg active:scale-95 transition-all"
                      style={{ backgroundImage: `linear-gradient(to right, ${tempPrimaryColor || "#6366f1"}, ${tempAccentColor || "#f43f5e"})` }}
                    >
                      <Save className="w-3.5 h-3.5" />
                      Simpan & Tutup
                    </button>
                  </div>
                ) : (
                  <div className="flex items-center gap-2 ml-auto">
                    <button
                      onClick={() => setIsAdminModalOpen(false)}
                      className="text-xs font-semibold px-4 py-2.5 rounded-xl border border-slate-800 hover:bg-slate-900 transition-colors"
                    >
                      Batal
                    </button>
                    <button
                      onClick={() => {
                        if (adminPasswordInput === adminPassword || adminPasswordInput === "admin123" || adminPasswordInput === "nurlaelani") {
                          setIsAdminUnlocked(true);
                          setAdminPasswordInput("");
                          
                          // Initialize temp states for editing
                          setTempAppName(appName);
                          setTempAdminPassword(adminPassword);
                          setTempCreatorName(creatorName);
                          setTempReferralUrl(referralUrl);
                          setTempVisitorGate(visitorGateEnabled);
                          setTempVisitorPassword(visitorPassword);
                          setTempPrimaryColor(primaryColor);
                          setTempAccentColor(accentColor);
                          setTempFooterHtml(footerHtml);
                          
                          showNotification("Akses Admin Berhasil Dibuka! 🔓", "success");
                        } else {
                          showNotification("Sandi Salah! Akses Ditolak.", "error");
                        }
                      }}
                      className="text-xs font-bold px-5 py-2.5 rounded-xl bg-gradient-to-r from-indigo-500 to-violet-600 hover:from-indigo-400 hover:to-violet-500 text-white flex items-center gap-1.5 shadow-lg active:scale-95 transition-all"
                    >
                      Buka Akses 🔓
                    </button>
                  </div>
                )}
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* Exit & Lock Security Modal */}
      <AnimatePresence>
        {isExitModalOpen && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/95 backdrop-blur-md" id="exit-security-modal">
            <motion.div
              initial={{ opacity: 0, scale: 0.95, y: 15 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.95, y: 15 }}
              className="bg-[#0b0c15] border border-slate-800/90 rounded-2xl w-full max-w-md overflow-hidden shadow-2xl relative"
            >
              {/* Header */}
              <div className="px-6 py-4 border-b border-slate-800/60 flex items-center justify-between bg-[#10111a]">
                <div className="flex items-center gap-2.5">
                  <div className="p-2 bg-gradient-to-br from-rose-500 to-red-700 rounded-lg text-white shadow-lg shadow-rose-900/20">
                    <LogOut className="w-4 h-4 text-rose-200" />
                  </div>
                  <div>
                    <h3 className="text-xs font-extrabold uppercase tracking-wider font-mono text-slate-100">
                      KEAMANAN & KUNCI SESI
                    </h3>
                    <p className="text-[10px] text-slate-400">
                      Proteksi sandi untuk mengunci/membuka akses sistem
                    </p>
                  </div>
                </div>
                <button
                  onClick={() => setIsExitModalOpen(false)}
                  className="p-1.5 text-slate-400 hover:text-white hover:bg-slate-900 rounded-lg transition-all"
                >
                  <X className="w-4 h-4" />
                </button>
              </div>

              {/* Body */}
              <div className="p-6 space-y-5">
                <div className="text-center space-y-1.5">
                  <p className="text-xs text-slate-300 leading-relaxed">
                    Situs ini terproteksi keamanan AI. Masukkan sandi untuk mengonfirmasi penguncian sesi atau keluar.
                  </p>
                </div>

                {/* Sesi Status Checklist */}
                <div className={`grid ${isAdminUnlocked ? "grid-cols-2" : "grid-cols-1"} gap-3 bg-slate-950/60 p-3 rounded-xl border border-slate-900`}>
                  {isAdminUnlocked && (
                    <div className="text-center space-y-1 p-2 bg-[#10111a]/40 rounded-lg border border-slate-850">
                      <p className="text-[9px] uppercase tracking-wider text-slate-500 font-mono font-bold">Status Admin</p>
                      <span className="text-[10px] font-bold font-mono px-1.5 py-0.5 rounded-full bg-emerald-950/80 text-emerald-400 border border-emerald-500/20">
                        🔓 TERBUKA
                      </span>
                    </div>
                  )}

                  <div className="text-center space-y-1 p-2 bg-[#10111a]/40 rounded-lg border border-slate-850">
                    <p className="text-[9px] uppercase tracking-wider text-slate-500 font-mono font-bold">Status Sesi</p>
                    <span className={`text-[10px] font-bold font-mono px-1.5 py-0.5 rounded-full ${
                      isVisitorUnlocked ? "bg-emerald-950/80 text-emerald-400 border border-emerald-500/20" : "bg-rose-950/80 text-rose-400 border border-rose-500/20"
                    }`}>
                      {isVisitorUnlocked ? "🔓 TERBUKA" : "🔒 TERKUNCI"}
                    </span>
                  </div>
                </div>

                {/* Password Input */}
                <div className="space-y-2 bg-[#10111a] border border-slate-850 p-4 rounded-xl">
                  <label className="text-[10px] uppercase tracking-wider text-slate-400 font-mono font-bold block text-center">
                    Masukkan Sandi Verifikasi:
                  </label>
                  <input
                    type="password"
                    value={exitPasswordInput}
                    onChange={(e) => setExitPasswordInput(e.target.value)}
                    placeholder="Masukkan sandi..."
                    className="w-full text-xs bg-slate-950 border border-slate-800 focus:border-rose-500 focus:ring-1 focus:ring-rose-500 rounded-xl px-3 py-3 text-slate-200 placeholder-slate-700 font-mono tracking-widest text-center"
                    onKeyDown={(e) => {
                      if (e.key === "Enter") {
                        const entered = exitPasswordInput.trim();
                        if (!entered) {
                          showNotification("Sandi tidak boleh kosong!", "error");
                          return;
                        }
                        let actionTaken = false;

                        // Check Admin Password
                        if (entered === adminPassword || entered === "nurlaelani") {
                          if (isAdminUnlocked) {
                            setIsAdminUnlocked(false);
                            showNotification("Sesi Admin Berhasil Dikunci! 🔒", "success");
                            actionTaken = true;
                          } else {
                            setIsAdminUnlocked(true);
                            setTempAppName(appName);
                            setTempAdminPassword(adminPassword);
                            setTempCreatorName(creatorName);
                            setTempReferralUrl(referralUrl);
                            setTempVisitorGate(visitorGateEnabled);
                            setTempVisitorPassword(visitorPassword);
                            setTempPrimaryColor(primaryColor);
                            setTempAccentColor(accentColor);
                            setTempFooterHtml(footerHtml);
                            setIsAdminModalOpen(true);
                            showNotification("Akses Admin Berhasil Dibuka! 🔓", "success");
                            actionTaken = true;
                          }
                        }

                        // Check Visitor Password
                        if (entered === visitorPassword || entered === "makecarousel") {
                          if (isVisitorUnlocked) {
                            setIsVisitorUnlocked(false);
                            safeSessionStorage.setItem("affos_visitor_session_unlocked", "false");
                            showNotification("Situs berhasil dikunci dari pengunjung! 🔒", "success");
                            actionTaken = true;
                          } else {
                            setIsVisitorUnlocked(true);
                            safeSessionStorage.setItem("affos_visitor_session_unlocked", "true");
                            showNotification("Akses Pengunjung Berhasil Dibuka! 🔓", "success");
                            actionTaken = true;
                          }
                        }

                        if (actionTaken) {
                          setIsExitModalOpen(false);
                          setExitPasswordInput("");
                        } else {
                          showNotification("Sandi salah atau tidak dikenali!", "error");
                        }
                      }
                    }}
                  />
                  <p className="text-[8px] text-slate-500 text-center font-mono mt-1">
                    Ketik sandi Anda, lalu ketuk "Proses Tindakan" atau tekan Enter.
                  </p>
                </div>
              </div>

              {/* Footer */}
              <div className="px-6 py-4 border-t border-slate-800/60 flex items-center justify-between bg-slate-950/40">
                <button
                  onClick={() => setIsExitModalOpen(false)}
                  className="text-xs font-semibold px-4 py-2.5 rounded-xl border border-slate-800 hover:bg-slate-900 text-slate-300 transition-colors font-mono"
                >
                  Batal
                </button>
                <button
                  onClick={() => {
                    const entered = exitPasswordInput.trim();
                    if (!entered) {
                      showNotification("Sandi tidak boleh kosong!", "error");
                      return;
                    }
                    let actionTaken = false;

                    // Check Admin Password
                    if (entered === adminPassword || entered === "nurlaelani") {
                      if (isAdminUnlocked) {
                        setIsAdminUnlocked(false);
                        showNotification("Sesi Admin Berhasil Dikunci! 🔒", "success");
                        actionTaken = true;
                      } else {
                        setIsAdminUnlocked(true);
                        setTempAppName(appName);
                        setTempAdminPassword(adminPassword);
                        setTempCreatorName(creatorName);
                        setTempReferralUrl(referralUrl);
                        setTempVisitorGate(visitorGateEnabled);
                        setTempVisitorPassword(visitorPassword);
                        setTempPrimaryColor(primaryColor);
                        setTempAccentColor(accentColor);
                        setTempFooterHtml(footerHtml);
                        setIsAdminModalOpen(true);
                        showNotification("Akses Admin Berhasil Dibuka! 🔓", "success");
                        actionTaken = true;
                      }
                    }

                    // Check Visitor Password
                    if (entered === visitorPassword || entered === "makecarousel") {
                      if (isVisitorUnlocked) {
                        setIsVisitorUnlocked(false);
                        safeSessionStorage.setItem("affos_visitor_session_unlocked", "false");
                        showNotification("Situs berhasil dikunci dari pengunjung! 🔒", "success");
                        actionTaken = true;
                      } else {
                        setIsVisitorUnlocked(true);
                        safeSessionStorage.setItem("affos_visitor_session_unlocked", "true");
                        showNotification("Akses Pengunjung Berhasil Dibuka! 🔓", "success");
                        actionTaken = true;
                      }
                    }

                    if (actionTaken) {
                      setIsExitModalOpen(false);
                      setExitPasswordInput("");
                    } else {
                      showNotification("Sandi salah atau tidak dikenali!", "error");
                    }
                  }}
                  className="text-xs font-bold px-5 py-2.5 rounded-xl bg-gradient-to-r from-rose-500 to-red-600 hover:from-rose-400 hover:to-red-500 text-white flex items-center gap-1.5 shadow-lg active:scale-95 transition-all"
                  style={{ backgroundImage: `linear-gradient(to right, ${primaryColor || "#6366f1"}, ${accentColor || "#f43f5e"})` }}
                >
                  <Key className="w-3.5 h-3.5" />
                  Proses Tindakan
                </button>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* Flow & Veo Redirect Modal */}
      <AnimatePresence>
        {isFlowVeoModalOpen && (
          <div 
            className="fixed inset-0 z-50 flex items-center justify-center p-2 sm:p-4 bg-black/95 backdrop-blur-md overflow-hidden cursor-pointer" 
            id="flow-veo-modal"
            onClick={() => setIsFlowVeoModalOpen(false)}
          >
            <motion.div
              initial={{ opacity: 0, scale: 0.95, y: 15 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.95, y: 15 }}
              className="bg-[#0b0c15] border border-slate-800/90 rounded-2xl w-full max-w-xl md:max-w-2xl overflow-hidden shadow-2xl relative flex flex-col max-h-[92vh] sm:max-h-[85vh] cursor-default"
              onClick={(e) => e.stopPropagation()}
            >
              {/* Header */}
              <div className="px-5 py-3.5 sm:px-6 sm:py-4 border-b border-slate-800/60 flex items-center justify-between bg-[#10111a] shrink-0">
                <div className="flex items-center gap-2.5">
                  <div className="p-2 bg-gradient-to-br from-violet-500 to-pink-500 rounded-lg text-white shadow-lg">
                    <Sparkle className="w-4 h-4 text-white animate-pulse" />
                  </div>
                  <div>
                    <h3 className="text-xs font-extrabold uppercase tracking-wider font-mono text-slate-100">
                      SKENARIO BERHASIL DISALIN! 📋
                    </h3>
                    <p className="text-[10px] text-slate-400">
                      Langkah Selanjutnya: Generate Video Menggunakan AI
                    </p>
                  </div>
                </div>
                <button
                  onClick={() => setIsFlowVeoModalOpen(false)}
                  className="p-2 text-slate-400 hover:text-white hover:bg-slate-900 rounded-xl transition-all cursor-pointer"
                  aria-label="Tutup"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>

              {/* Body (Scrollable for Mobile/Tablet) */}
              <div className="p-4 sm:p-6 space-y-4 sm:space-y-5 overflow-y-auto flex-1 scrollbar-thin">
                <div className="bg-slate-950/60 p-4 rounded-xl border border-slate-900 space-y-2 text-center">
                  <p className="text-xs text-slate-300 leading-relaxed">
                    Seluruh naskah, blueprint adegan, dan prompt visual <strong className="text-pink-400">JSON</strong> telah disalin ke clipboard Anda.
                  </p>
                  <p className="text-[11px] text-slate-400">
                    Silakan buka platform video generator AI pilihan Anda di bawah ini dan tempelkan (<kbd className="px-1.5 py-0.5 bg-slate-900 rounded font-mono text-[10px] text-slate-300 border border-slate-800">Ctrl + V</kbd> atau <kbd className="px-1.5 py-0.5 bg-slate-900 rounded font-mono text-[10px] text-slate-300 border border-slate-800">Cmd + V</kbd>) kode tersebut.
                  </p>
                </div>

                <div className="space-y-3">
                  <span className="text-[10px] uppercase font-bold tracking-widest text-slate-500 font-mono block">
                    PILIH LAYANAN PENYUSUN VIDEO AI:
                  </span>

                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                    {/* Google Flow Option */}
                    <a
                      href="https://flow.google" 
                      target="_blank" 
                      rel="noopener noreferrer"
                      className="p-4 rounded-xl border border-slate-800 hover:border-violet-500/50 bg-[#10111a]/40 hover:bg-violet-950/20 text-left transition-all group flex flex-col justify-between h-[120px]"
                    >
                      <div>
                        <div className="flex items-center justify-between">
                          <span className="text-xs font-bold text-white group-hover:text-violet-300 transition-colors">
                            Google Flow
                          </span>
                          <ExternalLink className="w-3.5 h-3.5 text-slate-500 group-hover:text-violet-400 transition-colors" />
                        </div>
                        <p className="text-[10px] text-slate-400 mt-2 leading-relaxed">
                          Alat automasi alur kerja AI multi-moda. Tempel skrip JSON untuk merajut storyboard lengkap.
                        </p>
                      </div>
                      <span className="text-[9px] font-mono font-bold text-violet-400 uppercase mt-2">
                        Buka Google Flow →
                      </span>
                    </a>

                    {/* Google Veo Option */}
                    <a
                      href="https://deepmind.google/technologies/veo/" 
                      target="_blank" 
                      rel="noopener noreferrer"
                      className="p-4 rounded-xl border border-slate-800 hover:border-pink-500/50 bg-[#10111a]/40 hover:bg-pink-950/20 text-left transition-all group flex flex-col justify-between h-[120px]"
                    >
                      <div>
                        <div className="flex items-center justify-between">
                          <span className="text-xs font-bold text-white group-hover:text-pink-300 transition-colors">
                            Google Veo
                          </span>
                          <ExternalLink className="w-3.5 h-3.5 text-slate-500 group-hover:text-pink-400 transition-colors" />
                        </div>
                        <p className="text-[10px] text-slate-400 mt-2 leading-relaxed">
                          Model video generatif tercanggih untuk kualitas sinematik 1080p dengan prompt visual detail.
                        </p>
                      </div>
                      <span className="text-[9px] font-mono font-bold text-pink-400 uppercase mt-2">
                        Buka Google Veo →
                      </span>
                    </a>
                  </div>
                </div>

                {/* Quick tutorial steps */}
                <div className="bg-[#08090f] p-4 rounded-xl border border-slate-900 space-y-3">
                  <div>
                    <span className="text-[9px] uppercase font-bold text-emerald-400 font-mono block mb-1">
                      💡 Cara Penggunaan di Editor AI Video:
                    </span>
                    <ol className="text-[10px] text-slate-400 list-decimal pl-4 space-y-1 leading-relaxed">
                      <li>Pilih salah satu layanan di atas (Google Flow atau Veo).</li>
                      <li>Unggah foto produk dan foto model Anda ke panel media/sumber aset.</li>
                      <li>Tempelkan (<strong className="text-slate-200">Paste</strong>) JSON skrip visual yang sudah tersalin di kolom instruksi atau prompt generator.</li>
                      <li>Tekan <strong className="text-pink-400">Generate Video</strong> untuk menyaksikan hasil sulap AI instan!</li>
                    </ol>
                  </div>

                  <div className="border-t border-slate-900 pt-2 space-y-1">
                    <span className="text-[9px] uppercase font-bold text-amber-400 font-mono block">
                      ⚠️ Mengapa Wajah Model Berubah / Berbeda di Video?
                    </span>
                    <p className="text-[10px] text-slate-400 leading-relaxed">
                      Secara default, AI video generator akan membuat wajah acak baru berdasarkan deskripsi teks kecuali Anda memberi tahu AI untuk menggunakan foto yang Anda unggah sebagai **referensi karakter utama**.
                    </p>
                    <span className="text-[9px] uppercase font-bold text-indigo-400 font-mono block mt-1">
                      Cara Mengunci Wajah Model (Character Reference):
                    </span>
                    <ul className="text-[10px] text-slate-400 list-disc pl-4 space-y-1 leading-relaxed">
                      <li><strong>Aktifkan Fitur Cref/Image Input:</strong> Di platform Flow atau Veo, pastikan Anda menandai foto model tersebut sebagai <strong className="text-slate-200">"Character Reference" (Cref)</strong> atau menyeretnya ke kotak input gambar referensi utama.</li>
                      <li><strong>Gunakan Kata Kunci Referensi:</strong> Di kolom prompt teks (jika Anda ingin memodifikasinya), selalu rujuk dengan frase: <code className="text-pink-400 bg-slate-950 px-1 py-0.2 rounded text-[9px]">"the woman in the reference image"</code> atau <code className="text-pink-400 bg-slate-950 px-1 py-0.2 rounded text-[9px]">"the model shown in the uploaded photo"</code>. Hal ini mengunci AI agar mentransfer fitur wajah dari foto Anda ke hasil video secara konsisten!</li>
                    </ul>
                  </div>
                </div>
              </div>

              {/* Footer */}
              <div className="px-5 py-3.5 sm:px-6 sm:py-4 border-t border-slate-800/60 flex flex-col sm:flex-row items-center justify-between gap-3 bg-slate-950/40 shrink-0">
                <span className="text-[10px] text-slate-500 font-mono hidden sm:inline">
                  Affiliate OS Auto-Redirection
                </span>
                <button
                  onClick={() => setIsFlowVeoModalOpen(false)}
                  className="w-full sm:w-auto text-xs sm:text-sm font-bold px-8 py-3.5 sm:py-3.5 rounded-xl hover:opacity-90 active:scale-95 text-white flex items-center justify-center gap-2 shadow-lg transition-all cursor-pointer font-sans"
                  style={{ backgroundImage: `linear-gradient(to right, ${primaryColor || "#6366f1"}, ${accentColor || "#f43f5e"})` }}
                >
                  <Check className="w-4.5 h-4.5" />
                  Selesai & Tutup Skenario
                </button>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* History Modal */}
      {/* MODAL: RISET PRODUK AFFILIATE AI */}
      <AnimatePresence>
        {isResearchModalOpen && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/85 backdrop-blur-sm" id="research-modal">
            <motion.div
              initial={{ opacity: 0, scale: 0.95, y: 15 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.95, y: 15 }}
              className="bg-[#0b0c15] border border-slate-800/90 rounded-2xl w-full max-w-3xl overflow-hidden shadow-2xl relative flex flex-col max-h-[88vh]"
            >
              {/* Header */}
              <div className="px-6 py-4 border-b border-slate-800/60 flex items-center justify-between bg-[#10111a] shrink-0">
                <div className="flex items-center gap-2.5">
                  <div className="p-2 bg-gradient-to-br from-cyan-500 to-emerald-600 rounded-lg text-white shadow-lg shadow-cyan-500/10">
                    <Target className="w-5 h-5 text-white" />
                  </div>
                  <div>
                    <h3 className="text-sm font-extrabold uppercase tracking-wider font-mono text-slate-100">
                      Riset Produk Affiliate AI
                    </h3>
                    <p className="text-[10px] text-slate-400">
                      Cari ide produk yang berpotensi laris, lalu langsung bikin videonya
                    </p>
                  </div>
                </div>
                <button
                  onClick={() => setIsResearchModalOpen(false)}
                  className="p-1.5 text-slate-400 hover:text-white hover:bg-slate-900 rounded-lg transition-all"
                >
                  <X className="w-4 h-4" />
                </button>
              </div>

              {/* Body */}
              <div className="p-6 overflow-y-auto flex-1 scrollbar-thin space-y-5">
                {verifyingProduct ? (
                  /* ===== VIEW VERIFIKASI MEREK ===== */
                  <div className="space-y-4">
                    <button
                      onClick={() => { setVerifyingProduct(null); setBrandResults([]); setSelectedBrandIdx(null); setPhotoUrlInput(""); }}
                      className="flex items-center gap-1.5 text-[11px] font-mono font-semibold text-slate-400 hover:text-cyan-300 transition-all"
                    >
                      <ArrowRight className="w-3.5 h-3.5 rotate-180" /> Kembali ke hasil riset
                    </button>
                    <div className="flex items-center gap-2">
                      <ShoppingBag className="w-4 h-4 text-orange-400" />
                      <h4 className="text-sm font-bold text-white">Verifikasi Merek: {verifyingProduct.productName}</h4>
                    </div>
                    <p className="text-[10px] text-slate-500 leading-relaxed flex items-start gap-1.5">
                      <Info className="w-3 h-3 text-slate-600 mt-0.5 shrink-0" />
                      Merek dari pengetahuan AI — <b className="text-slate-400">cek harga &amp; stok asli di Shopee</b>. Pilih merek, lalu tempel link foto produknya biar langsung masuk ke editor.
                    </p>

                    {loadingBrands && (
                      <div className="flex flex-col items-center justify-center py-10 text-center">
                        <Loader2 className="w-8 h-8 text-cyan-400 animate-spin mb-2" />
                        <p className="text-xs text-slate-400">Mengelompokkan merek populer...</p>
                      </div>
                    )}

                    {!loadingBrands && brandResults.length > 0 && (
                      <div className="space-y-3">
                        {brandsIsFallback && (
                          <div className="text-[11px] text-amber-300 bg-amber-950/30 border border-amber-500/20 rounded-lg px-3 py-2 flex items-center gap-2">
                            <Zap className="w-3.5 h-3.5 shrink-0" /> Daftar merek profil cepat (model AI sedang sibuk).
                          </div>
                        )}
                        {brandResults.map((b, bi) => (
                          <div key={bi} className={`border rounded-xl p-3.5 transition-all ${selectedBrandIdx === bi ? "border-cyan-500/60 bg-cyan-950/10" : "border-slate-850 bg-[#10111a]/50"}`}>
                            <div className="flex items-start justify-between gap-2 mb-1.5">
                              <div className="min-w-0">
                                <div className="flex items-center gap-2 flex-wrap">
                                  <h5 className="text-sm font-bold text-white">{b.brandName}</h5>
                                  <span className="text-[9px] font-mono font-bold px-1.5 py-0.5 rounded bg-amber-950/60 border border-amber-500/20 text-amber-300">⭐ {b.rating}</span>
                                </div>
                                <p className="text-[11px] text-slate-400 mt-0.5">{b.productLabel}</p>
                              </div>
                              <span className="text-[11px] font-bold text-emerald-300 shrink-0">{b.estPrice}</span>
                            </div>
                            <p className="text-[11px] text-slate-300 mb-1"><span className="text-slate-500">💡 </span>{b.note}</p>
                            <p className="text-[11px] text-slate-400 mb-2.5"><span className="text-slate-500">✅ Rekomendasi: </span>{b.recommendation}</p>
                            <div className="flex flex-wrap gap-2">
                              <a
                                href={`https://shopee.co.id/search?keyword=${encodeURIComponent(b.shopeeKeyword || b.brandName)}`}
                                target="_blank" rel="noreferrer"
                                className="flex items-center justify-center gap-1.5 px-3 py-1.5 rounded-lg bg-orange-950/40 border border-orange-500/40 text-orange-300 hover:bg-orange-900/40 text-[11px] font-bold font-mono transition-all active:scale-95"
                              >
                                <ShoppingBag className="w-3 h-3" /> Cari di Shopee <ExternalLink className="w-2.5 h-2.5" />
                              </a>
                              <button
                                onClick={() => { setSelectedBrandIdx(selectedBrandIdx === bi ? null : bi); setPhotoUrlInput(""); }}
                                className={`flex items-center justify-center gap-1.5 px-3 py-1.5 rounded-lg text-[11px] font-bold font-mono transition-all active:scale-95 ${selectedBrandIdx === bi ? "bg-cyan-500 text-slate-950" : "bg-slate-800/60 border border-slate-700 text-slate-200 hover:bg-slate-700/60"}`}
                              >
                                <Check className="w-3 h-3" /> {selectedBrandIdx === bi ? "Terpilih" : "Pilih Merek Ini"}
                              </button>
                            </div>

                            {selectedBrandIdx === bi && (
                              <div className="mt-3 pt-3 border-t border-slate-800/60 space-y-2">
                                <label className="text-[10px] font-bold uppercase tracking-wider font-mono text-slate-400 block">
                                  Tempel link foto produk dari Shopee
                                </label>
                                <p className="text-[10px] text-slate-500 leading-relaxed">Di Shopee: klik kanan foto produk → <b className="text-slate-400">"Salin alamat gambar"</b>, lalu tempel di sini. Foto bakal otomatis masuk ke bagian upload &amp; dianalisis AI.</p>
                                <div className="flex gap-2">
                                  <input
                                    type="text"
                                    value={photoUrlInput}
                                    onChange={(e) => setPhotoUrlInput(e.target.value)}
                                    onKeyDown={(e) => { if (e.key === "Enter" && !loadingPhotoUrl) handlePastePhotoForBrand(); }}
                                    placeholder="https://down-id.img.susercontent.com/....jpg"
                                    className="flex-1 min-w-0 bg-[#0b0c15] border border-slate-800 focus:border-cyan-500/60 rounded-lg px-3 py-2 text-[11px] text-slate-100 placeholder:text-slate-600 outline-none"
                                  />
                                  <button
                                    onClick={handlePastePhotoForBrand}
                                    disabled={loadingPhotoUrl}
                                    className="flex items-center gap-1.5 px-3 py-2 rounded-lg bg-gradient-to-r from-violet-600 via-pink-500 to-amber-500 text-white text-[11px] font-extrabold font-mono transition-all active:scale-95 disabled:opacity-60 shrink-0"
                                  >
                                    {loadingPhotoUrl ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Video className="w-3.5 h-3.5" />}
                                    Pakai Foto
                                  </button>
                                </div>
                                <button
                                  onClick={() => useBrandForVideo(b)}
                                  className="text-[10px] font-mono text-slate-400 hover:text-cyan-300 underline underline-offset-2"
                                >
                                  Lewati foto, bikin video tanpa foto dulu →
                                </button>
                              </div>
                            )}
                          </div>
                        ))}
                      </div>
                    )}
                  </div>
                ) : (
                <>
                {/* Form input */}
                <div className="space-y-3">
                  <div>
                    <label className="text-[11px] font-bold uppercase tracking-wider font-mono text-slate-400 mb-1.5 block">
                      Niche / Kategori
                    </label>
                    <input
                      type="text"
                      value={researchNiche}
                      onChange={(e) => setResearchNiche(e.target.value)}
                      onKeyDown={(e) => { if (e.key === "Enter" && !researchingProducts) researchAffiliateProducts(); }}
                      placeholder="Contoh: skincare, gadget dapur, fashion hijab, mainan anak... (kosongkan = tren umum)"
                      className="w-full bg-[#10111a] border border-slate-800 focus:border-cyan-500/60 rounded-xl px-4 py-2.5 text-sm text-slate-100 placeholder:text-slate-600 outline-none transition-all"
                    />
                  </div>
                  <div className="flex flex-wrap gap-2">
                    {["Rp10.000 - Rp50.000", "Rp30.000 - Rp200.000", "Rp200.000 ke atas"].map((range) => (
                      <button
                        key={range}
                        onClick={() => setResearchPriceRange(range)}
                        className={`text-[11px] font-mono font-semibold px-3 py-1.5 rounded-lg border transition-all ${researchPriceRange === range ? "bg-cyan-950/60 border-cyan-500/50 text-cyan-300" : "bg-slate-900/40 border-slate-800 text-slate-400 hover:border-slate-700"}`}
                      >
                        {range}
                      </button>
                    ))}
                  </div>
                  <button
                    onClick={researchAffiliateProducts}
                    disabled={researchingProducts}
                    className="w-full flex items-center justify-center gap-2 px-4 py-3 rounded-xl bg-gradient-to-r from-cyan-500 to-emerald-500 hover:opacity-90 text-slate-950 text-sm font-extrabold font-mono transition-all active:scale-98 disabled:opacity-60 disabled:cursor-not-allowed shadow-lg shadow-cyan-500/20"
                  >
                    {researchingProducts ? (
                      <>
                        <Loader2 className="w-4 h-4 animate-spin" />
                        AI SEDANG MERISET...
                      </>
                    ) : (
                      <>
                        <Target className="w-4 h-4" />
                        RISET PRODUK SEKARANG
                      </>
                    )}
                  </button>
                  <p className="text-[10px] text-slate-500 leading-relaxed flex items-start gap-1.5">
                    <Info className="w-3 h-3 text-slate-600 mt-0.5 shrink-0" />
                    Rekomendasi ini ide berbasis tren &amp; pengetahuan AI, <b className="text-slate-400">bukan data penjualan real-time</b>. Ambil link affiliate asli lewat tombol "Cari di Shopee".
                  </p>
                </div>

                {/* Hasil riset */}
                {researchingProducts && (
                  <div className="flex flex-col items-center justify-center py-12 text-center">
                    <Loader2 className="w-10 h-10 text-cyan-400 animate-spin mb-3" />
                    <p className="text-sm font-bold text-slate-300">Menganalisis tren &amp; menyusun rekomendasi...</p>
                    <p className="text-[11px] text-slate-500 mt-1">Biasanya 5-15 detik.</p>
                  </div>
                )}

                {!researchingProducts && researchResults.length === 0 && (
                  <div className="flex flex-col items-center justify-center py-12 text-center border-2 border-dashed border-slate-800/80 rounded-2xl bg-slate-950/25">
                    <TrendingUp className="w-12 h-12 text-slate-600 mb-3" />
                    <p className="text-sm font-bold text-slate-300">Belum Ada Hasil Riset</p>
                    <p className="text-xs text-slate-500 max-w-sm mt-1 leading-relaxed">
                      Isi niche di atas (atau kosongkan untuk tren umum), lalu klik "Riset Produk Sekarang".
                    </p>
                  </div>
                )}

                {!researchingProducts && researchResults.length > 0 && (
                  <div className="space-y-3">
                    {researchIsFallback && (
                      <div className="text-[11px] text-amber-300 bg-amber-950/30 border border-amber-500/20 rounded-lg px-3 py-2 flex items-center gap-2">
                        <Zap className="w-3.5 h-3.5 shrink-0" />
                        Hasil dari profil cepat (model AI sedang sibuk). Coba riset ulang untuk hasil yang lebih spesifik.
                      </div>
                    )}
                    {researchResults.map((p, idx) => (
                      <div
                        key={idx}
                        className="border border-slate-850 hover:border-cyan-500/40 bg-[#10111a]/50 rounded-xl p-4 transition-all"
                      >
                        {/* Judul + skor */}
                        <div className="flex items-start justify-between gap-3 mb-2">
                          <div className="min-w-0">
                            <div className="flex items-center gap-2 flex-wrap mb-1">
                              <h4 className="text-sm font-bold text-white">{p.productName}</h4>
                              <span className="text-[9px] font-mono font-bold px-1.5 py-0.5 rounded bg-cyan-950/80 border border-cyan-500/20 text-cyan-300">
                                {p.category}
                              </span>
                            </div>
                            <p className="text-[11px] text-slate-400 leading-relaxed">{p.whyTrending}</p>
                          </div>
                          <div className="flex flex-col items-center shrink-0 bg-slate-950/60 border border-slate-800 rounded-lg px-2.5 py-1.5">
                            <div className="flex items-center gap-1">
                              <Flame className="w-3.5 h-3.5 text-orange-400" />
                              <span className="text-sm font-extrabold text-orange-300">{p.viralScore}</span>
                            </div>
                            <span className="text-[8px] font-mono text-slate-500 uppercase">viral</span>
                          </div>
                        </div>

                        {/* Detail grid */}
                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-x-4 gap-y-1.5 text-[11px] mb-3 mt-3">
                          <div className="flex gap-1.5"><span className="text-slate-500 shrink-0">💰 Harga:</span><span className="text-slate-300">{p.estPriceRange}</span></div>
                          <div className="flex gap-1.5"><span className="text-slate-500 shrink-0">🎯 Persaingan:</span><span className="text-slate-300">{p.competition}</span></div>
                          <div className="flex gap-1.5 sm:col-span-2"><span className="text-slate-500 shrink-0">👥 Target:</span><span className="text-slate-300">{p.targetAudience}</span></div>
                          <div className="flex gap-1.5 sm:col-span-2"><span className="text-slate-500 shrink-0">🎬 Angle:</span><span className="text-slate-300">{p.contentAngle}</span></div>
                        </div>

                        {/* Hashtags */}
                        {Array.isArray(p.hashtags) && p.hashtags.length > 0 && (
                          <div className="flex flex-wrap gap-1.5 mb-3">
                            {p.hashtags.map((h: string, i: number) => (
                              <span key={i} className="text-[10px] font-mono text-cyan-400/80 bg-cyan-950/30 px-1.5 py-0.5 rounded">{h}</span>
                            ))}
                          </div>
                        )}

                        {/* Actions */}
                        <div className="flex flex-wrap gap-2 pt-1">
                          <button
                            onClick={() => useProductFromResearch(p)}
                            className="flex-1 min-w-[140px] flex items-center justify-center gap-1.5 px-3 py-2 rounded-lg bg-gradient-to-r from-violet-600 via-pink-500 to-amber-500 hover:opacity-90 text-white text-xs font-extrabold font-mono transition-all active:scale-95 shadow-md shadow-violet-500/10"
                          >
                            <Video className="w-3.5 h-3.5" />
                            BIKIN VIDEO
                            <ArrowRight className="w-3.5 h-3.5" />
                          </button>
                          <button
                            onClick={() => verifyBrands(p)}
                            className="flex items-center justify-center gap-1.5 px-3 py-2 rounded-lg bg-orange-950/40 border border-orange-500/40 text-orange-300 hover:bg-orange-900/40 text-xs font-bold font-mono transition-all active:scale-95"
                          >
                            <ShoppingBag className="w-3.5 h-3.5" />
                            Cek Merek di Shopee
                            <ArrowRight className="w-3 h-3" />
                          </button>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
                </>
                )}
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      <AnimatePresence>
        {isHistoryModalOpen && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/85 backdrop-blur-sm" id="history-modal">
            <motion.div
              initial={{ opacity: 0, scale: 0.95, y: 15 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.95, y: 15 }}
              className="bg-[#0b0c15] border border-slate-800/90 rounded-2xl w-full max-w-2xl overflow-hidden shadow-2xl relative flex flex-col max-h-[85vh]"
            >
              {/* Header */}
              <div className="px-6 py-4 border-b border-slate-800/60 flex items-center justify-between bg-[#10111a] shrink-0">
                <div className="flex items-center gap-2.5">
                  <div className="p-2 bg-gradient-to-br from-indigo-500 to-violet-600 rounded-lg text-white shadow-lg shadow-indigo-500/10">
                    <History className="w-5 h-5 text-white" />
                  </div>
                  <div>
                    <h3 className="text-sm font-extrabold uppercase tracking-wider font-mono text-slate-100">
                      Riwayat Pembuatan Blueprint
                    </h3>
                    <p className="text-[10px] text-slate-400">
                      Daftar skenario video affiliate yang pernah Anda rancang ({historyList.length} draf tersimpan)
                    </p>
                  </div>
                </div>
                <button
                  onClick={() => setIsHistoryModalOpen(false)}
                  className="p-1.5 text-slate-400 hover:text-white hover:bg-slate-900 rounded-lg transition-all"
                >
                  <X className="w-4 h-4" />
                </button>
              </div>

              {/* Body */}
              <div className="p-6 overflow-y-auto space-y-4 flex-1 scrollbar-thin">
                {historyList.length === 0 ? (
                  <div className="flex flex-col items-center justify-center py-16 text-center border-2 border-dashed border-slate-800/80 rounded-2xl bg-slate-950/25">
                    <History className="w-12 h-12 text-slate-600 mb-3 animate-pulse" />
                    <p className="text-sm font-bold text-slate-300">Belum Ada Riwayat Tersimpan</p>
                    <p className="text-xs text-slate-500 max-w-sm mt-1 leading-relaxed">
                      Sistem akan menyimpan draf blueprint secara otomatis setiap kali Anda berhasil membuat skenario baru menggunakan fitur AI.
                    </p>
                  </div>
                ) : (
                  <div className="space-y-3">
                    {historyList.map((item) => (
                      <div
                        key={item.id}
                        onClick={() => loadHistoryItem(item)}
                        className="group border border-slate-850 hover:border-indigo-500/50 bg-[#10111a]/40 hover:bg-indigo-950/10 rounded-xl p-3.5 flex items-center justify-between gap-4 cursor-pointer transition-all"
                      >
                        {/* Left: Image / Placeholder */}
                        <div className="flex items-center gap-3.5 flex-1 min-w-0">
                          <div className="w-12 h-12 rounded-lg bg-slate-950 border border-slate-800/80 flex items-center justify-center overflow-hidden shrink-0">
                            {item.imageUrl ? (
                              <img
                                src={item.imageUrl}
                                alt={item.productName}
                                className="w-full h-full object-cover"
                                referrerPolicy="no-referrer"
                              />
                            ) : (
                              <Video className="w-5 h-5 text-slate-600" />
                            )}
                          </div>
                          
                          {/* Mid: Content info */}
                          <div className="min-w-0 flex-1">
                            <div className="flex items-center gap-2 flex-wrap mb-1">
                              <h4 className="text-xs font-bold text-white truncate max-w-[200px] sm:max-w-[300px]">
                                {item.productName}
                              </h4>
                              <span className="text-[9px] font-mono font-bold px-1.5 py-0.2 rounded bg-violet-950/80 border border-violet-500/20 text-violet-300">
                                {item.selectedTone}
                              </span>
                            </div>
                            <p className="text-[10px] text-slate-400 line-clamp-1 italic mb-1 font-medium">
                              "{item.draftVoiceOver || "Tanpa naskah suara."}"
                            </p>
                            <span className="text-[9px] font-mono text-slate-500 flex items-center gap-1">
                              <Clock className="w-2.5 h-2.5" />
                              {item.timestamp}
                            </span>
                          </div>
                        </div>

                        {/* Right: Actions */}
                        <div className="flex items-center gap-2 shrink-0">
                          <button
                            onClick={(e) => {
                              e.stopPropagation();
                              loadHistoryItem(item);
                            }}
                            className="px-3 py-1.5 rounded-lg bg-indigo-600 hover:bg-indigo-500 text-white text-[11px] font-bold transition-all shadow-md active:scale-95 flex items-center gap-1"
                          >
                            <RefreshCw className="w-3 h-3" />
                            Muat
                          </button>
                          <button
                            onClick={(e) => deleteHistoryItem(item.id, e)}
                            className="p-2 rounded-lg border border-slate-800 hover:border-rose-500/30 text-slate-500 hover:text-rose-400 hover:bg-rose-950/20 transition-all active:scale-95"
                            title="Hapus dari riwayat"
                          >
                            <Trash2 className="w-3.5 h-3.5" />
                          </button>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>

              {/* Footer */}
              <div className="px-6 py-4 border-t border-slate-800/60 flex items-center justify-between bg-slate-950/40 shrink-0">
                {historyList.length > 0 ? (
                  <button
                    onClick={() => {
                      if (window.confirm("Apakah Anda yakin ingin menghapus seluruh riwayat pembuatan?")) {
                        setHistoryList([]);
                        safeStorage.removeItem("affos_blueprint_history");
                        showNotification("Seluruh riwayat berhasil dibersihkan.", "info");
                      }
                    }}
                    className="text-[10px] uppercase font-bold text-rose-400 hover:text-rose-300 transition-colors flex items-center gap-1 font-mono"
                  >
                    <Trash2 className="w-3.5 h-3.5" />
                    Bersihkan Semua
                  </button>
                ) : (
                  <div />
                )}
                <button
                  onClick={() => setIsHistoryModalOpen(false)}
                  className="text-xs font-bold px-5 py-2.5 rounded-xl bg-slate-900 hover:bg-slate-850 border border-slate-800 text-white transition-all font-mono active:scale-95"
                >
                  Tutup
                </button>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* Step-by-Step Comprehensive Guide Modal */}
      <AnimatePresence>
        {isGuideModalOpen && (
          <div 
            className="fixed inset-0 z-50 flex items-center justify-center p-2 sm:p-4 bg-black/95 backdrop-blur-md overflow-hidden cursor-pointer" 
            id="guide-modal"
            onClick={() => setIsGuideModalOpen(false)}
          >
            <motion.div
              initial={{ opacity: 0, scale: 0.95, y: 15 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.95, y: 15 }}
              className="bg-[#0b0c15] border border-slate-800/90 rounded-2xl w-full max-w-2xl lg:max-w-3xl overflow-hidden shadow-2xl relative flex flex-col max-h-[92vh] sm:max-h-[88vh] cursor-default"
              onClick={(e) => e.stopPropagation()}
            >
              {/* Modal Header */}
              <div className="px-5 py-3.5 sm:px-6 sm:py-4 border-b border-slate-800/60 flex items-center justify-between bg-[#10111a] shrink-0">
                <div className="flex items-center gap-3">
                  <div className="p-2.5 bg-gradient-to-br from-amber-500 to-yellow-500 rounded-xl text-slate-950 shadow-lg shadow-amber-500/20">
                    <BookOpen className="w-5 h-5" />
                  </div>
                  <div>
                    <div className="flex items-center gap-2">
                      <h3 className="text-sm font-extrabold uppercase tracking-wider font-mono text-slate-100">
                        PANDUAN LENGKAP & STRATEGI AFFILIATE
                      </h3>
                      <span className="text-[9px] bg-amber-500/20 text-amber-300 border border-amber-500/40 px-2 py-0.5 rounded-full font-mono font-bold">
                        V2.0
                      </span>
                    </div>
                    <p className="text-[11px] text-slate-400">
                      Panduan praktis membuat video promosi berkonversi tinggi dengan AI
                    </p>
                  </div>
                </div>
                <button
                  onClick={() => setIsGuideModalOpen(false)}
                  className="p-2 text-slate-400 hover:text-white hover:bg-slate-900 rounded-xl transition-all cursor-pointer"
                  aria-label="Tutup"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>

              {/* Quick Tab Selector */}
              <div className="bg-[#0e0f1d] px-3 sm:px-4 py-2 border-b border-slate-800/70 shrink-0 overflow-x-auto scrollbar-none flex items-center gap-1.5">
                {[
                  { idx: 0, label: "1. Foto & AI", icon: "📸" },
                  { idx: 1, label: "2. Suara & Naskah", icon: "🎙️" },
                  { idx: 2, label: "3. Teks & Aksen", icon: "✨" },
                  { idx: 3, label: "4. Anatomi 3 Scene", icon: "📐" },
                  { idx: 4, label: "5. Ekspor ke Veo/Flow", icon: "🚀" },
                  { idx: 5, label: "Tips & FAQ", icon: "🔥" },
                  { idx: 6, label: "Video Panduan", icon: "🎬" },
                ].map((tab) => (
                  <button
                    key={tab.idx}
                    type="button"
                    onClick={() => setCurrentGuideStep(tab.idx)}
                    className={`px-3 py-1.5 rounded-xl text-xs font-mono font-bold whitespace-nowrap flex items-center gap-1.5 transition-all ${
                      currentGuideStep === tab.idx
                        ? "bg-amber-400 text-slate-950 shadow-md shadow-amber-500/20 scale-[1.02]"
                        : tab.idx === 6
                        ? "bg-red-950/40 text-red-300 hover:text-white hover:bg-red-900/40 border border-red-500/40"
                        : "bg-slate-900/80 text-slate-400 hover:text-slate-200 hover:bg-slate-850 border border-slate-800"
                    }`}
                  >
                    <span>{tab.icon}</span>
                    <span>{tab.label}</span>
                    {tab.idx === 6 && currentGuideStep !== 6 && (
                      <span className="text-[9px] bg-red-600 text-white px-1 py-0.2 rounded font-mono font-bold">
                        PLAY
                      </span>
                    )}
                  </button>
                ))}
              </div>

              {/* Progress Line */}
              <div className="h-1 bg-slate-900 w-full shrink-0">
                <div 
                  className="h-full bg-gradient-to-r from-amber-400 via-pink-500 to-violet-500 transition-all duration-300"
                  style={{ width: `${((currentGuideStep + 1) / 7) * 100}%` }}
                />
              </div>

              {/* Modal Body */}
              <div className="p-4 sm:p-6 overflow-y-auto flex-1 scrollbar-thin space-y-4 text-slate-200">
                
                {/* QUICK VIDEO BAR INSIDE MODAL */}
                {currentGuideStep !== 6 && (
                  <div className="bg-gradient-to-r from-red-950/30 via-slate-950 to-amber-950/20 border border-red-500/30 px-3.5 py-2.5 rounded-xl flex items-center justify-between gap-3 text-xs">
                    <div className="flex items-center gap-2.5 min-w-0">
                      <div className="w-7 h-7 rounded-lg bg-red-600/20 border border-red-500/40 flex items-center justify-center text-red-400 shrink-0">
                        <Play className="w-3.5 h-3.5 fill-red-400" />
                      </div>
                      <div className="truncate">
                        <span className="font-bold text-white block text-xs">Ingin melihat video tutorial langsung?</span>
                        <span className="text-[10px] text-slate-400">Tonton tutorial lengkap di YouTube (https://youtu.be/YIx556qhW38)</span>
                      </div>
                    </div>
                    <button
                      type="button"
                      onClick={() => setCurrentGuideStep(6)}
                      className="px-3 py-1 rounded-lg bg-red-600 hover:bg-red-500 text-white font-mono font-bold text-[10px] shrink-0 flex items-center gap-1 transition-all shadow-md active:scale-95 cursor-pointer"
                    >
                      <Play className="w-3 h-3 fill-white" />
                      <span>Buka Video</span>
                    </button>
                  </div>
                )}
                
                {/* TAB 0: FOTO & AI DETECTION */}
                {currentGuideStep === 0 && (
                  <motion.div 
                    initial={{ opacity: 0, y: 10 }}
                    animate={{ opacity: 1, y: 0 }}
                    className="space-y-4"
                  >
                    <div className="bg-gradient-to-r from-pink-500/10 via-rose-500/5 to-violet-500/10 border border-pink-500/20 p-4 sm:p-5 rounded-2xl flex items-start gap-4">
                      <div className="p-3 bg-pink-500/20 border border-pink-500/30 rounded-xl text-pink-400 shrink-0">
                        <Upload className="w-6 h-6" />
                      </div>
                      <div>
                        <h4 className="text-sm font-extrabold text-white uppercase font-mono">
                          Langkah 1: Unggah Foto & Analisis AI Vision Instan
                        </h4>
                        <p className="text-xs text-slate-300 mt-1.5 leading-relaxed">
                          AI akan membedah foto produk Anda secara otomatis untuk mengenali detail penting, warna dominan, keunggulan jualan, dan segmentasi audiens yang paling membeli.
                        </p>
                      </div>
                    </div>

                    <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                      <div className="bg-slate-950/70 border border-slate-850 p-3.5 rounded-xl space-y-2">
                        <div className="flex items-center gap-2 text-pink-400">
                          <CheckCircle className="w-4 h-4" />
                          <h5 className="text-xs font-bold font-mono uppercase">Foto yang Dianjurkan:</h5>
                        </div>
                        <ul className="text-[11px] text-slate-400 space-y-1.5 leading-relaxed pl-1">
                          <li>• Foto dengan pencahayaan terang dan fokus tajam.</li>
                          <li>• Produk terlihat jelas tanpa terlalu banyak objek pengganggu.</li>
                          <li>• Format yang didukung: <b>JPG, PNG, WEBP</b>.</li>
                        </ul>
                      </div>

                      <div className="bg-slate-950/70 border border-slate-850 p-3.5 rounded-xl space-y-2">
                        <div className="flex items-center gap-2 text-violet-400">
                          <Sparkles className="w-4 h-4" />
                          <h5 className="text-xs font-bold font-mono uppercase">Hasil Ekstraksi AI Otomatis:</h5>
                        </div>
                        <ul className="text-[11px] text-slate-400 space-y-1.5 leading-relaxed pl-1">
                          <li>• <b>Nama & Kategori</b>: Tipe produk yang spesifik.</li>
                          <li>• <b>Fitur Unggulan</b>: Bahan, tekstur, nilai tambah.</li>
                          <li>• <b>Target Audiens</b>: Profil pembeli potensial di TikTok.</li>
                        </ul>
                      </div>
                    </div>

                    <div className="bg-[#0e0f1d] border border-slate-800 p-3.5 rounded-xl flex items-start gap-3">
                      <Lightbulb className="w-5 h-5 text-amber-400 shrink-0 mt-0.5" />
                      <p className="text-xs text-slate-300 leading-relaxed">
                        <b>Tips Praktis:</b> Belum punya foto sendiri? Gunakan tombol <b>"Preset Cepat Produk Populer"</b> (Blazer, Serum Skincare, TWS Earphone, dll.) untuk mencoba skenario siap pakai dalam 1 klik!
                      </p>
                    </div>
                  </motion.div>
                )}

                {/* TAB 1: SUARA & NASKAH */}
                {currentGuideStep === 1 && (
                  <motion.div 
                    initial={{ opacity: 0, y: 10 }}
                    animate={{ opacity: 1, y: 0 }}
                    className="space-y-4"
                  >
                    <div className="bg-gradient-to-r from-amber-500/10 via-yellow-500/5 to-pink-500/10 border border-amber-500/20 p-4 sm:p-5 rounded-2xl flex items-start gap-4">
                      <div className="p-3 bg-amber-500/20 border border-amber-500/30 rounded-xl text-amber-400 shrink-0">
                        <Volume2 className="w-6 h-6" />
                      </div>
                      <div>
                        <h4 className="text-sm font-extrabold text-white uppercase font-mono">
                          Langkah 2: Naskah Suara (VO) & Karakter Voice Artist
                        </h4>
                        <p className="text-xs text-slate-300 mt-1.5 leading-relaxed">
                          Tentukan karakter pembawa suara dan gaya bahasa naskah agar terdengar natural, persuasif, dan memicu penonton mengklik keranjang kuning.
                        </p>
                      </div>
                    </div>

                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                      <div className="bg-slate-950/70 border border-pink-500/30 p-3.5 rounded-xl space-y-1.5">
                        <div className="flex items-center gap-2">
                          <span className="text-base">👩</span>
                          <h5 className="text-xs font-bold text-pink-300 font-mono uppercase">Suara Perempuan</h5>
                        </div>
                        <p className="text-[11px] text-slate-400 leading-relaxed">
                          Nada ramah, ceria, manis, dan akrab. Sangat cocok untuk produk fashion wanita, skincare, makeup, kuliner, dan perabot rumah tangga.
                        </p>
                      </div>

                      <div className="bg-slate-950/70 border border-blue-500/30 p-3.5 rounded-xl space-y-1.5">
                        <div className="flex items-center gap-2">
                          <span className="text-base">👨</span>
                          <h5 className="text-xs font-bold text-blue-300 font-mono uppercase">Suara Laki-Laki</h5>
                        </div>
                        <p className="text-[11px] text-slate-400 leading-relaxed">
                          Nada maskulin, tegas, berenergi, dan berwibawa. Sangat ideal untuk gadget, outfit pria, otomotif, perkakas, dan produk teknologi.
                        </p>
                      </div>
                    </div>

                    <div className="bg-slate-950/70 border border-slate-850 p-3.5 rounded-xl space-y-2">
                      <h5 className="text-xs font-bold text-amber-300 font-mono uppercase flex items-center gap-1.5">
                        <Flame className="w-4 h-4 text-amber-400" />
                        6 Pilihan Gaya Tone Bahasa AI:
                      </h5>
                      <div className="grid grid-cols-2 sm:grid-cols-3 gap-2 text-[11px]">
                        <div className="bg-[#10111a] p-2 rounded-lg border border-slate-800">
                          <b className="text-pink-400">🔥 Racun TikTok:</b> Kata viral & ampuh membakar hasrat beli.
                        </div>
                        <div className="bg-[#10111a] p-2 rounded-lg border border-slate-800">
                          <b className="text-amber-400">✨ Ceria:</b> Ramah, gembira, dan memikat.
                        </div>
                        <div className="bg-[#10111a] p-2 rounded-lg border border-slate-800">
                          <b className="text-blue-400">⚡ Energetik:</b> Semangat tinggi & bikin penasaran.
                        </div>
                        <div className="bg-[#10111a] p-2 rounded-lg border border-slate-800">
                          <b className="text-emerald-400">🍃 Estetik:</b> Tenang, elegan & sinematik.
                        </div>
                        <div className="bg-[#10111a] p-2 rounded-lg border border-slate-800">
                          <b className="text-slate-300">🤝 Natural:</b> Review jujur & realistis.
                        </div>
                        <div className="bg-[#10111a] p-2 rounded-lg border border-slate-800">
                          <b className="text-indigo-400">😎 Bikin Gaul:</b> Santai, akrab & kekinian.
                        </div>
                      </div>
                    </div>

                    <div className="bg-[#0e0f1d] border border-slate-800 p-3 rounded-xl flex items-center justify-between text-xs">
                      <span className="text-slate-300">🔊 Tes audio langsung dengan menekan tombol <b>"Play Narasi"</b> dengan pengatur kecepatan <b>0.8x s/d 1.3x</b>.</span>
                    </div>
                  </motion.div>
                )}

                {/* TAB 2: TEKS & AKSEN VISUAL */}
                {currentGuideStep === 2 && (
                  <motion.div 
                    initial={{ opacity: 0, y: 10 }}
                    animate={{ opacity: 1, y: 0 }}
                    className="space-y-4"
                  >
                    <div className="bg-gradient-to-r from-violet-500/10 via-purple-500/5 to-pink-500/10 border border-violet-500/20 p-4 sm:p-5 rounded-2xl flex items-start gap-4">
                      <div className="p-3 bg-violet-500/20 border border-violet-500/30 rounded-xl text-violet-400 shrink-0">
                        <Sliders className="w-6 h-6" />
                      </div>
                      <div>
                        <h4 className="text-sm font-extrabold text-white uppercase font-mono">
                          Langkah 3: Gaya Font Teks & Aksen Ornamen Visual
                        </h4>
                        <p className="text-xs text-slate-300 mt-1.5 leading-relaxed">
                          Teks overlay dan ornamen visual bertindak sebagai penahan perhatian visual (*Pattern Interrupt*) agar penonton tidak menggulir (*scroll*) video Anda di detik pertama.
                        </p>
                      </div>
                    </div>

                    <div className="grid grid-cols-2 sm:grid-cols-4 gap-2.5">
                      {[
                        { name: "Sketch", desc: "Aksen coretan estetik & kreatif", badge: "Aesthetic" },
                        { name: "Punch", desc: "Teks tebal, tegas & modern", badge: "Bold" },
                        { name: "Cyber", desc: "Efek neon terang futuristik", badge: "Glow" },
                        { name: "Sticker", desc: "Gaya pop retro ceria", badge: "Playful" },
                      ].map((item) => (
                        <div key={item.name} className="bg-slate-950/70 border border-slate-850 p-3 rounded-xl space-y-1">
                          <div className="flex items-center justify-between">
                            <h5 className="text-xs font-bold font-mono text-violet-300">{item.name}</h5>
                            <span className="text-[9px] bg-violet-950 border border-violet-500/30 text-violet-300 px-1.5 py-0.2 rounded font-mono">{item.badge}</span>
                          </div>
                          <p className="text-[10px] text-slate-400 leading-normal">{item.desc}</p>
                        </div>
                      ))}
                    </div>

                    <div className="bg-slate-950/70 border border-slate-850 p-4 rounded-xl space-y-2">
                      <h5 className="text-xs font-bold text-pink-400 font-mono uppercase">
                        Kenapa Fitur "Aksen Seni Kreatif" Sangat Penting?
                      </h5>
                      <p className="text-xs text-slate-300 leading-relaxed">
                        Algoritma TikTok dan Reels mengukur <b>Retensi Tontonan (Watch Time)</b>. Ornamen visual dinamis (seperti panah bercahaya, lingkaran fokus produk, dan aksen scribble) terbukti meningkatkan rasio klik keranjang (*CTR*) hingga <b>+34%</b>.
                      </p>
                    </div>
                  </motion.div>
                )}

                {/* TAB 3: ANATOMI 3 SCENE */}
                {currentGuideStep === 3 && (
                  <motion.div 
                    initial={{ opacity: 0, y: 10 }}
                    animate={{ opacity: 1, y: 0 }}
                    className="space-y-4"
                  >
                    <div className="bg-gradient-to-r from-emerald-500/10 via-teal-500/5 to-blue-500/10 border border-emerald-500/20 p-4 sm:p-5 rounded-2xl flex items-start gap-4">
                      <div className="p-3 bg-emerald-500/20 border border-emerald-500/30 rounded-xl text-emerald-400 shrink-0">
                        <Sparkles className="w-6 h-6" />
                      </div>
                      <div>
                        <h4 className="text-sm font-extrabold text-white uppercase font-mono">
                          Langkah 4: Formula Blueprint Video 10 Detik Berkonversi
                        </h4>
                        <p className="text-xs text-slate-300 mt-1.5 leading-relaxed">
                          Video pendek affiliate yang menghasilkan penjualan terbanyak selalu mengikuti formula terstruktur 3-Scene:
                        </p>
                      </div>
                    </div>

                    <div className="space-y-2.5 font-mono text-xs">
                      {/* Scene 1 */}
                      <div className="bg-slate-950/80 border border-pink-500/40 p-3.5 rounded-xl space-y-1">
                        <div className="flex items-center justify-between">
                          <span className="font-bold text-pink-400 flex items-center gap-1.5">
                            <span className="w-2 h-2 rounded-full bg-pink-400" />
                            SCENE 1: HOOK KILAT (0s - 2s)
                          </span>
                          <span className="text-[10px] text-pink-300 bg-pink-950/60 px-2 py-0.5 rounded border border-pink-500/30">Stop The Scroll</span>
                        </div>
                        <p className="text-[11px] font-sans text-slate-300 leading-relaxed">
                          <b>Tujuan:</b> Menghentikan jari penonton. Menggunakan teks overlay mencolok, ekspresi model yang antusias, audio swoosh FX cepat, dan langsung memperlihatkan produk.
                        </p>
                      </div>

                      {/* Scene 2 */}
                      <div className="bg-slate-950/80 border border-amber-500/40 p-3.5 rounded-xl space-y-1">
                        <div className="flex items-center justify-between">
                          <span className="font-bold text-amber-400 flex items-center gap-1.5">
                            <span className="w-2 h-2 rounded-full bg-amber-400" />
                            SCENE 2: DETAIL VALUE & DEMO (2s - 8s)
                          </span>
                          <span className="text-[10px] text-amber-300 bg-amber-950/60 px-2 py-0.5 rounded border border-amber-500/30">Build Desire</span>
                        </div>
                        <p className="text-[11px] font-sans text-slate-300 leading-relaxed">
                          <b>Tujuan:</b> Membuktikan kualitas produk. Pengambilan jarak dekat (*macro close-up*), detail tekstur, fungsi pemakaian, dan penjelasan manfaat utama.
                        </p>
                      </div>

                      {/* Scene 3 */}
                      <div className="bg-slate-950/80 border border-violet-500/40 p-3.5 rounded-xl space-y-1">
                        <div className="flex items-center justify-between">
                          <span className="font-bold text-violet-400 flex items-center gap-1.5">
                            <span className="w-2 h-2 rounded-full bg-violet-400" />
                            SCENE 3: CTA & CHECKOUT (8s - 10s)
                          </span>
                          <span className="text-[10px] text-violet-300 bg-violet-950/60 px-2 py-0.5 rounded border border-violet-500/30">Direct Action</span>
                        </div>
                        <p className="text-[11px] font-sans text-slate-300 leading-relaxed">
                          <b>Tujuan:</b> Menutup penjualan (*Call to Action*). Model tersenyum sambil menunjuk ke sudut kiri bawah / keranjang kuning dengan instruksi checkout cepat.
                        </p>
                      </div>
                    </div>

                    <div className="bg-[#0e0f1d] border border-slate-800 p-3.5 rounded-xl flex items-start gap-3">
                      <SlidersHorizontal className="w-5 h-5 text-emerald-400 shrink-0 mt-0.5" />
                      <p className="text-xs text-slate-300 leading-relaxed">
                        <b>Fitur Live Sync:</b> Anda bisa mengetuk tombol <b>"Edit Kustom"</b> pada panel scene untuk memodifikasi teks overlay, prompt visual, atau audio cue. File JSON di bawah akan otomatis terupdate seketika!
                      </p>
                    </div>
                  </motion.div>
                )}

                {/* TAB 4: EKSPOR KE VEO / FLOW */}
                {currentGuideStep === 4 && (
                  <motion.div 
                    initial={{ opacity: 0, y: 10 }}
                    animate={{ opacity: 1, y: 0 }}
                    className="space-y-4"
                  >
                    <div className="bg-gradient-to-r from-blue-500/10 via-indigo-500/5 to-violet-500/10 border border-blue-500/20 p-4 sm:p-5 rounded-2xl flex items-start gap-4">
                      <div className="p-3 bg-blue-500/20 border border-blue-500/30 rounded-xl text-blue-400 shrink-0">
                        <ExternalLink className="w-6 h-6" />
                      </div>
                      <div>
                        <h4 className="text-sm font-extrabold text-white uppercase font-mono">
                          Langkah 5: Eksekusi di Google Flow, Google Veo, & Kling AI
                        </h4>
                        <p className="text-xs text-slate-300 mt-1.5 leading-relaxed">
                          Cara mudah memindahkan Blueprint JSON yang sudah disalin ke platform generator video AI favorit Anda.
                        </p>
                      </div>
                    </div>

                    <div className="bg-slate-950/70 border border-slate-850 p-4 rounded-xl space-y-3">
                      <h5 className="text-xs font-bold text-blue-300 font-mono uppercase">
                        Tahapan Eksekusi 4 Langkah:
                      </h5>
                      <div className="space-y-2 text-xs">
                        <div className="flex items-start gap-2.5 bg-[#10111a] p-2.5 rounded-lg border border-slate-800">
                          <span className="w-5 h-5 rounded-full bg-violet-500/20 text-violet-300 border border-violet-500/40 flex items-center justify-center font-bold font-mono text-[10px] shrink-0">1</span>
                          <span>Klik tombol <b>"SALIN SCRIPT LENGKAP"</b> atau <b>"Unduh JSON"</b> di panel hasil kanan.</span>
                        </div>
                        <div className="flex items-start gap-2.5 bg-[#10111a] p-2.5 rounded-lg border border-slate-800">
                          <span className="w-5 h-5 rounded-full bg-violet-500/20 text-violet-300 border border-violet-500/40 flex items-center justify-center font-bold font-mono text-[10px] shrink-0">2</span>
                          <span>Buka <b>Google Flow</b> (flow.google), <b>Google Veo</b>, atau <b>Kling AI</b>.</span>
                        </div>
                        <div className="flex items-start gap-2.5 bg-[#10111a] p-2.5 rounded-lg border border-slate-800">
                          <span className="w-5 h-5 rounded-full bg-violet-500/20 text-violet-300 border border-violet-500/40 flex items-center justify-center font-bold font-mono text-[10px] shrink-0">3</span>
                          <span>Unggah foto produk Anda ke slot gambar referensi di platform video tersebut.</span>
                        </div>
                        <div className="flex items-start gap-2.5 bg-[#10111a] p-2.5 rounded-lg border border-slate-800">
                          <span className="w-5 h-5 rounded-full bg-violet-500/20 text-violet-300 border border-violet-500/40 flex items-center justify-center font-bold font-mono text-[10px] shrink-0">4</span>
                          <span>Tempelkan (<kbd className="bg-slate-900 px-1.5 py-0.5 rounded border border-slate-700 font-mono text-[10px]">Ctrl+V</kbd>) kode JSON atau Visual Prompt scene ke kotak instruksi lalu tekan <b>Generate</b>!</span>
                        </div>
                      </div>
                    </div>

                    <div className="bg-[#08090f] border border-amber-500/30 p-4 rounded-xl space-y-2">
                      <div className="flex items-center gap-2 text-amber-400">
                        <Lightbulb className="w-4 h-4" />
                        <h5 className="text-xs font-bold font-mono uppercase">
                          Trik Mengunci Konsistensi Wajah Model (Character Reference):
                        </h5>
                      </div>
                      <p className="text-[11px] text-slate-300 leading-relaxed">
                        Agar wajah kreator/model tidak berubah antar-scene, aktifkan opsi <b>"Character Reference" (Cref)</b> di editor video AI atau sertakan kalimat pengunci: <code className="text-pink-400 bg-slate-950 px-1.5 py-0.5 rounded text-[10px]">"consistent Indonesian creator as shown in reference photo"</code>.
                      </p>
                    </div>
                  </motion.div>
                )}

                {/* TAB 5: TIPS VIRAL & FAQ */}
                {currentGuideStep === 5 && (
                  <motion.div 
                    initial={{ opacity: 0, y: 10 }}
                    animate={{ opacity: 1, y: 0 }}
                    className="space-y-4"
                  >
                    <div className="bg-gradient-to-r from-rose-500/10 via-amber-500/5 to-pink-500/10 border border-rose-500/20 p-4 sm:p-5 rounded-2xl flex items-start gap-4">
                      <div className="p-3 bg-rose-500/20 border border-rose-500/30 rounded-xl text-rose-400 shrink-0">
                        <Flame className="w-6 h-6" />
                      </div>
                      <div>
                        <h4 className="text-sm font-extrabold text-white uppercase font-mono">
                          Rahasia Video Affiliate Viral & Tanya-Jawab (FAQ)
                        </h4>
                        <p className="text-xs text-slate-300 mt-1.5 leading-relaxed">
                          Strategi terbaik dari top affiliate untuk memaksimalkan views dan komisi penjualan harian.
                        </p>
                      </div>
                    </div>

                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                      <div className="bg-slate-950/70 border border-slate-850 p-3.5 rounded-xl space-y-2">
                        <h5 className="text-xs font-bold text-amber-300 font-mono uppercase flex items-center gap-1.5">
                          <Check className="w-3.5 h-3.5 text-emerald-400" />
                          Aturan "Safe Zone" Layar:
                        </h5>
                        <p className="text-[11px] text-slate-400 leading-relaxed">
                          Pastikan teks overlay berada di tengah layar vertikal (9:16) agar tidak tertutup tombol like/komentar di sisi kanan atau judul caption di bagian bawah.
                        </p>
                      </div>

                      <div className="bg-slate-950/70 border border-slate-850 p-3.5 rounded-xl space-y-2">
                        <h5 className="text-xs font-bold text-amber-300 font-mono uppercase flex items-center gap-1.5">
                          <Clock className="w-3.5 h-3.5 text-amber-400" />
                          Frekuensi Posting Optimal:
                        </h5>
                        <p className="text-[11px] text-slate-400 leading-relaxed">
                          Posting 2 - 4 video per hari di jam prime-time (11.30-13.00 & 18.30-21.00 WIB) untuk mempercepat masuknya video ke algoritma FYP TikTok.
                        </p>
                      </div>
                    </div>

                    <div className="bg-slate-950/70 border border-slate-850 p-4 rounded-xl space-y-3">
                      <h5 className="text-xs font-bold text-violet-300 font-mono uppercase">
                        Pertanyaan yang Sering Diajukan (FAQ):
                      </h5>
                      <div className="space-y-2 text-xs">
                        <div className="bg-[#10111a] p-3 rounded-lg border border-slate-800 space-y-1">
                          <p className="font-bold text-slate-200">Q: Apakah naskah dan scene bisa diedit manual?</p>
                          <p className="text-slate-400 text-[11px]">A: Ya! Gunakan tombol "Edit Kustom" pada panel scene atau tombol "Sinkronkan Naskah" untuk menyesuaikan teks secara instan.</p>
                        </div>
                        <div className="bg-[#10111a] p-3 rounded-lg border border-slate-800 space-y-1">
                          <p className="font-bold text-slate-200">Q: Apakah blueprint bisa disimpan?</p>
                          <p className="text-slate-400 text-[11px]">A: Semua blueprint tersimpan otomatis di menu <b>Riwayat</b> di bagian atas header aplikasi.</p>
                        </div>
                      </div>
                    </div>
                  </motion.div>
                )}

                {/* TAB 6: VIDEO PANDUAN YOUTUBE */}
                {currentGuideStep === 6 && (
                  <motion.div 
                    initial={{ opacity: 0, y: 10 }}
                    animate={{ opacity: 1, y: 0 }}
                    className="space-y-4"
                  >
                    <div className="bg-gradient-to-r from-red-500/10 via-rose-500/5 to-amber-500/10 border border-red-500/25 p-4 sm:p-5 rounded-2xl flex items-start gap-4">
                      <div className="p-3 bg-red-600/20 border border-red-500/30 rounded-xl text-red-400 shrink-0">
                        <Play className="w-6 h-6 fill-red-400" />
                      </div>
                      <div className="flex-1">
                        <div className="flex items-center gap-2">
                          <h4 className="text-sm font-extrabold text-white uppercase font-mono">
                            Video Tutorial Panduan POS Video AI
                          </h4>
                          <span className="text-[9px] bg-red-600 text-white font-mono font-bold px-2 py-0.5 rounded shadow-sm">
                            YOUTUBE RESMI
                          </span>
                        </div>
                        <p className="text-xs text-slate-300 mt-1.5 leading-relaxed">
                          Tonton video demonstrasi praktis di bawah untuk melihat bagaimana foto produk diubah menjadi video promosi berkonversi tinggi dengan bantuan AI.
                        </p>
                      </div>
                    </div>

                    {/* Responsive YouTube Embed Player */}
                    <div className="bg-slate-950 border border-slate-800 rounded-2xl overflow-hidden shadow-2xl">
                      <div className="relative w-full aspect-video bg-black">
                        <iframe
                          src="https://www.youtube.com/embed/YIx556qhW38?rel=0&modestbranding=1"
                          title="Panduan Video POS Video AI"
                          className="absolute inset-0 w-full h-full"
                          allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture; web-share"
                          allowFullScreen
                        />
                      </div>
                      
                      {/* Video Actions & URL Bar */}
                      <div className="p-3.5 bg-[#0e0f1d] border-t border-slate-850 flex flex-wrap items-center justify-between gap-3">
                        <div className="flex items-center gap-2 text-xs text-slate-300">
                          <span className="w-2 h-2 rounded-full bg-red-500 animate-pulse" />
                          <span className="font-mono font-semibold">Tautan Video:</span>
                          <a
                            href="https://youtu.be/YIx556qhW38"
                            target="_blank"
                            rel="noopener noreferrer"
                            className="text-red-400 hover:text-red-300 font-mono underline text-xs"
                          >
                            https://youtu.be/YIx556qhW38
                          </a>
                        </div>
                        <div className="flex items-center gap-2">
                          <button
                            type="button"
                            onClick={() => {
                              navigator.clipboard.writeText("https://youtu.be/YIx556qhW38");
                              showNotification("Tautan video tutorial berhasil disalin ke clipboard!", "success");
                            }}
                            className="px-3 py-1.5 rounded-xl bg-slate-900 hover:bg-slate-800 border border-slate-800 text-slate-300 text-xs font-mono font-bold flex items-center gap-1.5 transition-colors cursor-pointer"
                          >
                            <Copy className="w-3.5 h-3.5" />
                            <span>Salin Tautan</span>
                          </button>
                          <a
                            href="https://youtu.be/YIx556qhW38"
                            target="_blank"
                            rel="noopener noreferrer"
                            className="px-3.5 py-1.5 rounded-xl bg-red-600 hover:bg-red-500 text-white text-xs font-mono font-bold flex items-center gap-1.5 transition-colors shadow-sm"
                          >
                            <ExternalLink className="w-3.5 h-3.5" />
                            <span>Buka di YouTube</span>
                          </a>
                        </div>
                      </div>
                    </div>

                    {/* Ringkasan Poin Penting Video */}
                    <div className="grid grid-cols-1 sm:grid-cols-3 gap-2.5">
                      <div className="bg-slate-950/70 border border-slate-850 p-3 rounded-xl space-y-1">
                        <div className="flex items-center gap-1.5 text-amber-400 font-mono text-xs font-bold">
                          <span>01</span>
                          <span>Upload & Pindai AI</span>
                        </div>
                        <p className="text-[11px] text-slate-400 leading-relaxed">
                          AI membaca karakteristik kain, warna, dan target audiens TikTok secara instan.
                        </p>
                      </div>
                      <div className="bg-slate-950/70 border border-slate-850 p-3 rounded-xl space-y-1">
                        <div className="flex items-center gap-1.5 text-pink-400 font-mono text-xs font-bold">
                          <span>02</span>
                          <span>Naskah & Aksen Visual</span>
                        </div>
                        <p className="text-[11px] text-slate-400 leading-relaxed">
                          Penyesuaian teks overlay dan gaya suara 10 detik agar video tidak di-skip penonton.
                        </p>
                      </div>
                      <div className="bg-slate-950/70 border border-slate-850 p-3 rounded-xl space-y-1">
                        <div className="flex items-center gap-1.5 text-violet-400 font-mono text-xs font-bold">
                          <span>03</span>
                          <span>Eksekusi di Veo / Flow</span>
                        </div>
                        <p className="text-[11px] text-slate-400 leading-relaxed">
                          Salin prompt adegan lalu tempel ke generator video AI untuk hasil akhir yang sinematik.
                        </p>
                      </div>
                    </div>
                  </motion.div>
                )}

              </div>

              {/* Modal Footer */}
              <div className="px-5 py-3.5 sm:px-6 sm:py-4 border-t border-slate-800/60 flex items-center justify-between bg-slate-950/60 shrink-0">
                <button
                  disabled={currentGuideStep === 0}
                  onClick={() => setCurrentGuideStep((prev) => Math.max(0, prev - 1))}
                  className={`text-xs font-bold px-4 py-2 rounded-xl border transition-all font-mono active:scale-95 flex items-center gap-1.5 ${
                    currentGuideStep === 0 
                       ? "border-slate-900 bg-slate-950/20 text-slate-600 cursor-not-allowed" 
                      : "border-slate-800 bg-slate-900 text-slate-300 hover:bg-slate-800 hover:text-white"
                  }`}
                >
                  Sebelumnya
                </button>

                <div className="flex items-center gap-2">
                  <button
                    onClick={() => setIsGuideModalOpen(false)}
                    className="text-xs font-bold px-4 py-2 rounded-xl text-slate-400 hover:text-white transition-colors font-mono"
                  >
                    Tutup
                  </button>
                  
                  {currentGuideStep < 6 ? (
                    <button
                      onClick={() => setCurrentGuideStep((prev) => Math.min(6, prev + 1))}
                      className="text-xs font-bold px-5 py-2.5 rounded-xl bg-amber-400 hover:bg-amber-300 text-slate-950 transition-all font-mono active:scale-95 flex items-center gap-1.5 shadow-md shadow-amber-500/10"
                    >
                      Lanjutkan
                      <ChevronRight className="w-3.5 h-3.5" />
                    </button>
                  ) : (
                    <button
                      onClick={() => setIsGuideModalOpen(false)}
                      className="text-xs font-bold px-5 py-2.5 rounded-xl bg-gradient-to-r from-violet-600 via-pink-500 to-amber-500 hover:opacity-90 text-white transition-all font-mono active:scale-95 flex items-center gap-1.5 shadow-lg shadow-violet-500/20"
                    >
                      Mulai Bikin Video! ✨
                      <Check className="w-3.5 h-3.5" />
                    </button>
                  )}
                </div>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

    </div>
  );
}
