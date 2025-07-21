import OpenAI from 'openai';
import { CharacterDetectionResponse, ImageGenerationRequest } from '@/types';

const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY || '',
});

export async function generateCharacterImage(prompt: string, quality: 'low' | 'medium' | 'high' = 'low'): Promise<string> {
  try {
    const response = await openai.responses.create({
      model: "gpt-4o",
      input: prompt,
      tools: [{ 
        type: "image_generation",
        quality: quality,
        size: "1024x1024"
      }]
    });

    const imageGenerationCalls = response.output.filter(
      (output: any) => output.type === "image_generation_call"
    );

    if (imageGenerationCalls.length > 0) {
      const call = imageGenerationCalls[0] as any;
      if (typeof call['image_url'] === 'string') return call['image_url'];
      if (typeof call['image'] === 'string') return call['image'];
      if (typeof call['b64_json'] === 'string') return call['b64_json'];
      if (typeof call['result'] === 'string') return call['result'];
      throw new Error('No image property found on image_generation_call output');
    }

    throw new Error('No image generated');
  } catch (error) {
    console.error('Error generating character image:', error);
    throw new Error('Failed to generate character image');
  }
}

export async function detectCharactersInScene(content: string): Promise<CharacterDetectionResponse> {
  try {
    console.log('=== CHARACTER DETECTION (NER) ===');
    console.log('Input scene content:', content);
    
    const response = await openai.chat.completions.create({
      model: "gpt-4o",
      messages: [
        {
          role: "system",
          content: "You are a comic book expert. Analyze the given scene content and extract character information, scene details, and mood."
        },
        {
          role: "user",
          content: `Analyze this comic panel content and extract character information: "${content}"`
        }
      ],
      response_format: {
        type: "json_schema",
        json_schema: {
          name: "character_detection",
          strict: true,
          schema: {
            type: "object",
            properties: {
              characters: {
                type: "array",
                items: {
                  type: "object",
                  properties: {
                    name: { type: "string" },
                    description: { type: "string" },
                    role: { type: "string" }
                  },
                  required: ["name", "description", "role"],
                  additionalProperties: false
                }
              },
              scene_description: { type: "string" },
              mood: { type: "string" },
              setting: { type: "string" }
            },
            required: ["characters", "scene_description", "mood", "setting"],
            additionalProperties: false
          }
        }
      }
    });

    const detectionResult = JSON.parse(response.choices[0].message.content!) as CharacterDetectionResponse;
    
    console.log('NER detected characters:', detectionResult.characters);
    console.log('Scene description:', detectionResult.scene_description);
    console.log('Mood:', detectionResult.mood);
    console.log('Setting:', detectionResult.setting);
    
    return detectionResult;
  } catch (error) {
    console.error('Error detecting characters:', error);
    throw new Error('Failed to detect characters in scene');
  }
}

interface PanelGenerationParams {
  content: string;
  characterData: Array<{name: string, imageBase64: string}>;
  quality?: 'low' | 'medium' | 'high';
  previousPanelImage?: string | null;
  previousPanelScene?: string | null;
}

export async function generatePanelImageWithReferences({
  content,
  characterData,
  quality = 'medium',
  previousPanelImage = null,
  previousPanelScene = null
}: PanelGenerationParams): Promise<string> {
  
  console.log('=== PANEL GENERATION DEBUG ===');
  console.log('Content:', content);
  console.log('Character count:', characterData.length);
  console.log('Quality:', quality);
  console.log('Previous panel image provided:', !!previousPanelImage);
  console.log('Previous panel scene provided:', !!previousPanelScene);
  console.log('Previous panel scene content:', previousPanelScene || 'none');
  
  // Build the main prompt
  let mainPrompt = `Generate a comic book panel illustration for the scene: "${content}".

Style: Professional comic book art with clean lines, vibrant colors, and dynamic composition. Do NOT include any speech bubbles, text bubbles, dialogue, or written text in the image - the user will add these manually later.

Context: You will be provided with reference images of characters that appear in this scene. IMPORTANT: Use these reference images to maintain visual consistency for character faces and body types only. The characters' faces, facial features, hair, skin tone, and body proportions should match the reference images exactly. However, their clothing, poses, actions, and expressions should adapt according to the current scene context and narrative flow.`;

  // Add previous panel context if provided
  const hasPreviousPanel = previousPanelImage && previousPanelScene;
  if (hasPreviousPanel) {
    mainPrompt += `

Previous Context: You will also be provided with the previous panel image from this comic sequence. The previous panel depicted: "${previousPanelScene}". Generate a coherent image for the current scene "${content}" that maintains visual and narrative consistency with the previous panel. Ensure the art style, lighting, and overall visual flow create a smooth transition between panels. Characters should maintain their face and body consistency from reference images, but their clothing, poses, and actions should evolve naturally from the previous scene to the current scene.`;
  }

  // Add reasoning instructions
  mainPrompt += `

REASONING PROCESS: Before generating the image, please think through the following chain of thoughts:
1. ANALYZE the previous scene (if provided): What was happening? What were the character positions, clothing, lighting, and mood?
2. ANALYZE the current scene: What needs to happen now? How should this flow from the previous scene?
3. DETERMINE narrative transitions: How should characters, environment, and mood change between scenes?
4. PLAN visual consistency: How to maintain character faces/bodies while adapting poses, clothing, and expressions?
5. CONSIDER visual flow: What camera angles, lighting, and composition will create smooth narrative progression?

Task: After this reasoning process, create a single comic book style panel image that depicts the described scene using the provided references. Remember: Keep character faces and body types consistent with reference images, but allow clothing, poses, actions, and expressions to change based on the scene requirements and narrative flow.`;

  console.log('=== COMPLETE PROMPT ===');
  console.log(mainPrompt);
  console.log('========================');

  // Build input content array
  const inputContent: any[] = [
    { type: "input_text", text: mainPrompt }
  ];

  // Add previous panel image first if provided
  if (hasPreviousPanel && previousPanelImage) {
    inputContent.push({
      type: "input_text", 
      text: "This is the previous panel image from this comic sequence:"
    });
    inputContent.push({
      type: "input_image",
      image_url: `data:image/png;base64,${previousPanelImage}`
    });
  }

  // Add character reference images
  characterData.forEach(char => {
    inputContent.push({
      type: "input_text", 
      text: `This is ${char.name}'s character reference image:`
    });
    inputContent.push({
      type: "input_image",
      image_url: `data:image/png;base64,${char.imageBase64}`
    });
  });

  console.log('=== INPUT STRUCTURE ===');
  console.log('Total input items:', inputContent.length);
  console.log('Input types:', inputContent.map(item => item.type));
  console.log('=======================');

  try {
    const response = await openai.responses.create({
      model: "gpt-4o",
      input: [
        {
          role: "user",
          content: inputContent
        }
      ],
      tools: [{ 
        type: "image_generation",
        quality: quality,
        size: "1024x1024"
      }]
    });

    console.log('API Response received');
    console.log('Response output length:', response.output.length);
    console.log('Response types:', response.output.map((item: any) => item.type));
    
    const imageGenerationCalls = response.output.filter(
      (output: any) => output.type === "image_generation_call"
    );

    console.log('Image generation calls found:', imageGenerationCalls.length);

    if (imageGenerationCalls.length > 0) {
      const call = imageGenerationCalls[0] as any;
      if (typeof call['image_url'] === 'string') return call['image_url'];
      if (typeof call['image'] === 'string') return call['image'];
      if (typeof call['b64_json'] === 'string') return call['b64_json'];
      if (typeof call['result'] === 'string') return call['result'];
      throw new Error('No image property found on image_generation_call output');
    }

    throw new Error('No image generation calls found in response');
    
  } catch (error) {
    console.error('Error in generatePanelImageWithReferences:', error);
    throw new Error('Failed to generate panel image');
  }
}

// Legacy function for backward compatibility
export async function generatePanelImage({
  prompt,
  referenceImages = [],
  quality = 'low',
  size = '1024x1024'
}: ImageGenerationRequest): Promise<string> {
  try {
    const response = await openai.images.generate({
      model: "dall-e-3",
      prompt: prompt,
      n: 1,
      size: size as any,
      quality: "standard",
      response_format: "b64_json",
    });

    const imageData = response.data[0];
    
    if (imageData.b64_json) {
      return imageData.b64_json;
    }

    throw new Error('No image data returned from OpenAI');
  } catch (error) {
    console.error('Error generating panel image:', error);
    throw new Error('Failed to generate panel image');
  }
}