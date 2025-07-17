export interface Character {
  id: string;
  name: string;
  description: string;
  imageUrl?: string;
  imagePrompt: string;
  traits: string[];
  type: string; // 'generate' | 'upscale' | 'query'
  imageId?: string; // Optional ID for the generated image
}

export interface Panel {
  id: string;
  content: string;
  imageUrl?: string;
  characters: string[];
  position: number;
  size: 'small' | 'medium' | 'large';
  imageData?: any;
  loading?: boolean;
}

export interface Page {
  id: string;
  pageNumber: number;
  panelCount: number;
  orientation: 'horizontal' | 'vertical';
  panels: Panel[];
}

export interface Comic {
  id: string;
  title: string;
  description: string;
  characters: Character[];
  pages: Page[];
  createdAt: Date;
  updatedAt: Date;
}

export interface CharacterDetectionResponse {
  characters: Array<{
    name: string;
    description: string;
    role: string;
  }>;
  scene_description: string;
  mood: string;
  setting: string;
}

export interface ImageGenerationRequest {
  prompt: string;
  referenceImages?: string[];
  quality?: 'low' | 'medium' | 'high';
  size?: '1024x1024' | '1792x1024' | '1024x1792';
}