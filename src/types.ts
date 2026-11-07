export interface Scene {
  sceneId: string;
  title: string;
  timestamp: string;
  textOverlay: string;
  visualPrompt: string;
  visualPromptID?: string;
  materialType?: string;
  audioCue: string;
  voiceOverSegment: string;
  interactiveAction: string;
  colorAccent: string;
}

export interface VideoBlueprint {
  visualAesthetic: string;
  textOverlayStyle: string;
  scenes: Scene[];
}

export interface ProductAnalysis {
  productName: string;
  targetAudience: string;
  keyFeatures: string;
  colorsDetected: string[];
}
