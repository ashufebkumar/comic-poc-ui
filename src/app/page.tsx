'use client';

import { useState, useEffect } from 'react';
import { Character, Page, Panel, Comic } from '../types';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '../components/ui/tabs';
import { Card, CardContent, CardHeader, CardTitle } from '../components/ui/card';
import CharacterManager from '../components/CharacterManager';
import PanelLayout from '../components/PanelLayout';
import ComicEditor from '../components/ComicEditor';
import ProjectManager from '../components/ProjectManager';
import { generateId } from '../lib/utils';
import { StoredProject, saveProject } from '../lib/storage';

export default function Home() {
  const [currentProject, setCurrentProject] = useState<StoredProject | null>(null);
  const [aiImageUrl, setAiImageUrl] = useState<any>([]);
  const [characterImageMap, setCharacterImageMap] = useState<{ [name: string]: string }>({});

  const [comic, setComic] = useState<Comic>({
    id: generateId(),
    title: 'My Comic',
    description: '',
    characters: [],
    pages: [],
    createdAt: new Date(),
    updatedAt: new Date(),
  });

  const [currentPage, setCurrentPage] = useState<Page>({
    id: generateId(),
    pageNumber: 1,
    panelCount: 3,
    orientation: 'horizontal',
    panels: [],
  });

  useEffect(() => {
    if (currentProject) {
      saveProject(currentProject);
    }
  }, [currentProject]);

  const handleProjectSelect = (project: StoredProject) => {
    setCurrentProject(project);
    setComic(project.comic);
    if (project.comic.pages.length > 0) {
      setCurrentPage(project.comic.pages[0]);
    }
  };

  const updateCharacters = (characters: Character[]) => {
    const updatedComic = { ...comic, characters };
    setComic(updatedComic);
    if (currentProject) {
      setCurrentProject({ ...currentProject, comic: updatedComic });
    }
  };

  const updateCurrentPage = (page: Page) => {
    setCurrentPage(page);
    if (currentProject) {
      const updatedPages = comic.pages.map(p => p.id === page.id ? page : p);
      if (!updatedPages.find(p => p.id === page.id)) {
        updatedPages.push(page);
      }
      const updatedComic = { ...comic, pages: updatedPages };
      setComic(updatedComic);
      setCurrentProject({ ...currentProject, comic: updatedComic });
    }
  };

  return (
    <div className="min-h-screen bg-background">
      <div className="container mx-auto p-6">
        <div className="mb-8">
          <h1 className="text-4xl font-bold mb-2">AI Comic Generator</h1>
          <p className="text-muted-foreground">
            Create comics with AI-generated characters and panel images
          </p>
        </div>

        <Tabs defaultValue="projects" className="space-y-6">
          <TabsList className="grid w-full grid-cols-4">
            <TabsTrigger value="projects">Projects</TabsTrigger>
            <TabsTrigger value="characters">Characters</TabsTrigger>
            <TabsTrigger value="layout">Page Layout</TabsTrigger>
            <TabsTrigger value="editor">Comic Editor</TabsTrigger>
          </TabsList>

          <TabsContent value="projects">
            <Card>
              <CardHeader>
                <CardTitle>Project Management</CardTitle>
              </CardHeader>
              <CardContent>
                <ProjectManager
                  onProjectSelect={handleProjectSelect}
                  currentProject={currentProject}
                />
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="characters">
            <Card>
              <CardHeader>
                <CardTitle>Character Management</CardTitle>
              </CardHeader>
              <CardContent>
                <CharacterManager
                  aiImageUrl={aiImageUrl}
                  setAiImageUrl={setAiImageUrl}
                  characters={comic.characters}
                  onCharactersChange={updateCharacters}
                  characterImageMap={characterImageMap}
                  setCharacterImageMap={setCharacterImageMap}
                />
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="layout">
            <Card>
              <CardHeader>
                <CardTitle>Page Layout Configuration</CardTitle>
              </CardHeader>
              <CardContent>
                <PanelLayout
                  page={currentPage}
                  onPageChange={updateCurrentPage}
                />
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="editor">
            <Card>
              <CardHeader>
                <CardTitle>Comic Panel Editor</CardTitle>
              </CardHeader>
              <CardContent>
                <ComicEditor
                  page={currentPage}
                  characters={comic.characters}
                  onPageChange={updateCurrentPage}
                  characterImageMap={characterImageMap}
                />
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>

        <div className="mt-8 p-4 bg-muted rounded-lg">
          <h3 className="font-semibold mb-2">Instructions:</h3>
          <ol className="list-decimal list-inside space-y-1 text-sm text-muted-foreground">
            <li>Create or select a project in the Projects tab</li>
            <li>Create and configure your characters in the Characters tab</li>
            <li>Set up your page layout and panel configuration in the Page Layout tab</li>
            <li>Add content to each panel and generate images in the Comic Editor tab</li>
            <li>Character images will be used as references for consistent panel generation</li>
            <li>Make sure to add your OpenAI API key to your environment variables</li>
          </ol>
        </div>
      </div>
    </div>
  );
}