'use client';

import { useState } from 'react';
import { Character } from '../types';
import React from 'react';
import { Button } from './ui/button';
import { Input } from './ui/input';
import { Textarea } from '../components/ui/textarea';
import { Card, CardContent, CardHeader, CardTitle } from '../components/ui/card';
import { generateId, generateCharacterTemplate } from '../lib/utils';
import { Plus, Trash2, Image, Wand2 } from 'lucide-react';

interface CharacterManagerProps {
  characters: Character[];
  onCharactersChange: (characters: Character[]) => void;
  aiImageUrl: any,
  setAiImageUrl: any,
  characterImageMap: { [name: string]: string },
  setCharacterImageMap: React.Dispatch<React.SetStateAction<{ [name: string]: string }>>,
}

let brakeImage = false;

let pollingTimeout: NodeJS.Timeout | null = null;


export default function CharacterManager({ characters, onCharactersChange, aiImageUrl, setAiImageUrl, characterImageMap, setCharacterImageMap }: CharacterManagerProps) {
  const [isGenerating, setIsGenerating] = useState<string | null>(null);
  const [imageLoader, setImageLoader] = useState<boolean>(false);
  const [ashu, setAshu] = useState<any>(null);
  const sleep = (ms: number) => new Promise(resolve => setTimeout(resolve, ms));
  const isOperation = aiImageUrl?.find((img: any) => img?.image_type === 'operation');


  console.log("test_1", aiImageUrl)

  const addCharacter = () => {
    const newCharacter: Character = {
      id: generateId(),
      name: '',
      description: '',
      imagePrompt: '',
      traits: [],
      type: '',
    };
    onCharactersChange([...characters, newCharacter]);
  };

  const updateCharacter = (id: string, updates: Partial<Character>) => {
    onCharactersChange(
      characters.map(char => 
        char.id === id ? { ...char, ...updates } : char
      )
    );
  };

  const generateTemplatePrompt = (character: Character) => {
    if (character.name && character.description) {
      const template = generateCharacterTemplate(character.name, character.description);
      updateCharacter(character.id, { imagePrompt: template });
    }
  };

  const deleteCharacter = (id: string) => {
    onCharactersChange(characters.filter(char => char.id !== id));
  };

  let getCharacterImage = async ({imageId, characterId}: { imageId: string, characterId: string }) => {
    console.log('Inside getCharacterImage Fetching character image with ID: test__id', imageId);
    const response = await fetch('https://backend.build.mugafi.com/v1/external/midjourney', {
        method: 'POST',
        headers: { 
          'Content-Type': 'application/json',
          'Authorization': 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJleHAiOjE3NTUwNjY4MDMsInN1YiI6IjY3NTAwNmMwZWY3OWQxMDE3ZGU0ZjVmMiIsInBheWxvYWQiOnsidXNlcl9pZCI6IjY3NTAwNmMwZWY3OWQxMDE3ZGU0ZjVmMiJ9fQ.-dY65rp8puRbaTDz4InRBtHkQEjs_dJhQSIFPu0WanU',
         },
        body: JSON.stringify({
            type: "query",
            payload: {
               id: imageId
            }
        })
      });

      if (!response.ok) {
         setImageLoader(false);
         brakeImage = true;
         throw new Error('Failed to generate image');
      }
        const result = await response.json();
        console.log('Image generation response:', result);

        const { data } = result;

        if (data.status === 'ready') {
          setImageLoader(false);
          const isNew = aiImageUrl.length === 0 || !!!(aiImageUrl.find((img: any) => img._id === data._id));
          console.log('test__isNew', data);
          if (isNew) {
            console.log('test__aiImageUrl', [...aiImageUrl, data]);
            setAiImageUrl((e: any)=> [...e, data]);
          } else {
            const replaced = aiImageUrl.map((img: any) => img._id === data._id ? data : img);
            console.log('test__replaced', replaced);
            setAiImageUrl(replaced);
          }

          updateCharacter(characterId, { imageUrl: data?.images?.[0]?.url || '' });
          // Update characterImageMap with the character name and CDN image URL
          const character = characters.find(char => char.id === characterId);
          if (character && data?.images?.[1]?.url) {
            setCharacterImageMap((prev: { [name: string]: string }) => ({ ...prev, [character.name]: data.images[1].url }));
          } else if (character && data?.images?.[0]?.url) {
            setCharacterImageMap((prev: { [name: string]: string }) => ({ ...prev, [character.name]: data.images[0].url }));
          }

          setAshu(data);
          brakeImage = true; // Stop further requests once image is ready
          return;
        }


  }

  const upscaleImage = async (cData: any) => {
    setImageLoader(true)
    console.log('Upscaling image with data:', cData);
    const {indexNumber, imageHash, msgId, imageId} = cData;

      // ✅ Find characterId by matching imageId
    const matchedCharacter = characters.find((char) => char.imageId === imageId);
    const characterId = matchedCharacter?.id || '';

    const response = await fetch('https://backend.build.mugafi.com/v1/external/midjourney', {
        method: 'POST',
        headers: { 
          'Content-Type': 'application/json',
          'Authorization': 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJleHAiOjE3NTUwNjY4MDMsInN1YiI6IjY3NTAwNmMwZWY3OWQxMDE3ZGU0ZjVmMiIsInBheWxvYWQiOnsidXNlcl9pZCI6IjY3NTAwNmMwZWY3OWQxMDE3ZGU0ZjVmMiJ9fQ.-dY65rp8puRbaTDz4InRBtHkQEjs_dJhQSIFPu0WanU',
         },
        body: JSON.stringify({
            type: "upscale",
            payload: {
              index: indexNumber,
              image_hash: imageHash,
              message_id: msgId
            }
        })
      });

      if (!response.ok) {
         setImageLoader(false);
         brakeImage = true;
         throw new Error('Failed to generate image');
      }
      const result = await response.json();
      console.log('Image generation response:', result);

      if (result.status === 0){
        await sleep(5000);
        getCharacterImage({imageId, characterId})
      }
  }
  

  const startImagePolling = ({ imageId, characterId }: { imageId: string, characterId: string }) => {
    if (pollingTimeout) clearTimeout(pollingTimeout); // Clear any previous poll

    const poll = async () => {
      if (brakeImage) return;

      console.log("Polling imageId:", imageId);
      await getCharacterImage({ imageId, characterId });

      pollingTimeout = setTimeout(poll, 5000); // Recursive poll
    };

    poll(); // Initial call
  };

  const generateCharacterImage = async (character: Character) => {
    setImageLoader(true);
    brakeImage = false; // Stop further requests once image is ready

    if (!character.imagePrompt.trim()) {
      alert('Please provide an image prompt for the character');
      return;
    }

    setIsGenerating(character.id);
    try {
      const response = await fetch('https://backend.build.mugafi.com/v1/external/midjourney', {
        method: 'POST',
        headers: { 
          'Content-Type': 'application/json',
          'Authorization': 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJleHAiOjE3NTUwNjY4MDMsInN1YiI6IjY3NTAwNmMwZWY3OWQxMDE3ZGU0ZjVmMiIsInBheWxvYWQiOnsidXNlcl9pZCI6IjY3NTAwNmMwZWY3OWQxMDE3ZGU0ZjVmMiJ9fQ.-dY65rp8puRbaTDz4InRBtHkQEjs_dJhQSIFPu0WanU',
         },
        body: JSON.stringify({
            type: 'generate',
            payload: {
                prompt: character.imagePrompt,
                args: "--v 7 --ar 2:3" 
            }
        })
      });

      if (!response.ok) {
        setImageLoader(false);
        alert('Failed to generate image');
        throw new Error('Failed to generate image');
      }
        const result = await response.json();
        console.log('Image generation response:', result);

        const { data } = result;
        const imageId = data?.id;
        console.log('Generated image ID: test__data', data);

        // startImagePolling({imageId: data?.id, test: true});

        startImagePolling({ imageId: data?.id, characterId: character.id });

        
        if (!imageId) throw new Error('Image ID not found in response');
        updateCharacter(character.id, { imageId });
    } catch (error) {
      console.error('Error generating character image:', error);
      alert('Failed to generate character image');
    } finally {
      setIsGenerating(null);
    }
  };
  

  return (
    <div className="space-y-4">
      <div className="flex justify-between items-center">
        <h2 className="text-2xl font-bold">Character Management</h2>
        <Button onClick={addCharacter}>
          <Plus className="w-4 h-4 mr-2" />
          Add Character
        </Button>
      </div>

      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
        {characters.map((character) => (
          <Card key={character.id}>
            <CardHeader>
              <CardTitle className="flex justify-between items-center">
                <Input
                  placeholder="Character name"
                  value={character.name}
                  onChange={(e) => updateCharacter(character.id, { name: e.target.value })}
                  className="font-semibold"
                />
                <Button
                  variant="destructive"
                  size="icon"
                  onClick={() => deleteCharacter(character.id)}
                >
                  <Trash2 className="w-4 h-4" />
                </Button>
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <Textarea
                placeholder="Character description"
                value={character.description}
                onChange={(e) => updateCharacter(character.id, { description: e.target.value })}
                rows={3}
              />
              
              <div className="space-y-2">
                <div className="flex justify-between items-center">
                  <label className="text-sm font-medium">Image Generation Prompt</label>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => generateTemplatePrompt(character)}
                    disabled={!character.name || !character.description}
                  >
                    <Wand2 className="w-3 h-3 mr-1" />
                    Use Template
                  </Button>
                </div>
                <Textarea
                  placeholder="Image generation prompt (e.g., 'A tall knight in shining armor with blue eyes') or click 'Use Template' to generate from name/description"
                  value={character.imagePrompt}
                  onChange={(e) => updateCharacter(character.id, { imagePrompt: e.target.value })}
                  rows={3}
                />
              </div>

              <div className="flex gap-2">
                <Button
                  onClick={() => generateCharacterImage(character)}
                  disabled={isGenerating === character.id || !character.imagePrompt.trim() || imageLoader}
                  className="flex-1"
                >
                  <Image className="w-4 h-4 mr-2" />
                  {(isGenerating === character.id || imageLoader) ? 'Generating...' : 'Generate Image'}
                </Button>
              </div>

              {character.imageUrl && (
                <div className="mt-4">
                  <img
                    src={`data:image/png;base64,${character.imageUrl}`}
                    alt={character.name}
                    className="w-full h-auto max-h-96 object-contain rounded-md border"
                  />
                </div>
              )}
            </CardContent>
          </Card>
        ))}
      </div>

      <div className='flex gap-2'>
        {aiImageUrl?.map((data: any, index: number) => <div key={index} className='w-fit'>
          <div>
            <img src={data?.images?.[1]?.url || data?.images?.[0]?.url} className="w-full h-auto max-h-96 object-contain rounded-md border mb-4" />
          </div>

          {!(data?.images?.[1]?.url) && !data?.loading && <div className="flex flex-row w-full items-center mt-4 gap-2 justify-center">
                <Button
                  className="bg-[#262222] text-white px-4 py-2 rounded-md text-sm font-medium"
                   onClick={() => upscaleImage({indexNumber: 1, imageHash: data?.images?.[0].image_hash, msgId: data?.images?.[0].message_id, imageId:data?._id})}
                >
                  U1
                </Button>
                <Button
                  className="bg-[#262222] text-white px-4 py-2 rounded-md text-sm font-medium"
                   onClick={() => upscaleImage({indexNumber: 2, imageHash: data?.images?.[0].image_hash, msgId: data?.images?.[0].message_id, imageId:data?._id})}
                >
                  U2
                </Button>
                <Button
                  className="bg-[#262222] text-white px-4 py-2 rounded-md text-sm font-medium"
                   onClick={() => upscaleImage({indexNumber: 3, imageHash: data?.images?.[0].image_hash, msgId: data?.images?.[0].message_id, imageId:data?._id})}
                >
                  U3
                </Button>
                <Button
                  className="bg-[#262222] text-white px-4 py-2 rounded-md text-sm font-medium"
                  onClick={() => upscaleImage({indexNumber: 4, imageHash: data?.images?.[0].image_hash, msgId: data?.images?.[0].message_id, imageId:data?._id})}
                >
                  U4
                </Button>
              </div>}
              {data?.loading && <div className='w-full flex justify-center iterm-center'>Loading...</div>}
      </div>)}
      </div>

      {characters.length === 0 && (
        <div className="text-center py-12 text-muted-foreground">
          <p>No characters created yet. Add your first character to get started!</p>
        </div>
      )}
    </div>
  );
}