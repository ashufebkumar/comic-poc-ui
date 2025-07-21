	'use client';

	import { useState } from 'react';
	import { Comic, Character, Panel } from '../types';
	import { Button } from '../components/ui/button';
	import { Textarea } from '../components/ui/textarea';
	import { Card, CardContent, CardHeader, CardTitle } from '../components/ui/card';
	import { Play, Save } from 'lucide-react';

	interface ComicEditorProps {
	page: any;
	characters: Character[];
	onPageChange: (page: any) => void;
	characterImageMap: { [name: string]: string };
	}

	// Required env: NEXT_PUBLIC_MIDJOURNEY_TOKEN
	const MIDJOURNEY_TOKEN = process.env.NEXT_PUBLIC_MIDJOURNEY_TOKEN || '';

	export default function ComicEditor({ page, characters, onPageChange, characterImageMap }: ComicEditorProps) {
	const [isGeneratingPanels, setIsGeneratingPanels] = useState(false);

	const updatePanelContent = (panelIndex: number, content: string) => {
		const updatedPanels = page.panels.map((panel: Panel, index: number) =>
		index === panelIndex ? { ...panel, content } : panel
		);
		onPageChange({ ...page, panels: updatedPanels });
	};


	const upscalePanelImage = async (panelIndex: number, indexNumber: number, imageData: any) => {
		console.log('upscalePanelImage called with:');
		console.log('typeof imageData:', typeof imageData);
		console.log('imageData:', imageData);
		if (!imageData || !Array.isArray(imageData.images) || !imageData.images[0]) {
		alert('Image data is not available for upscaling.');
		return;
		}
		const { image_hash, message_id } = imageData.images[0];
		const response = await fetch('https://backend.build.mugafi.com/v1/external/midjourney', {
		method: 'POST',
		headers: {
			'Content-Type': 'application/json',
			'Authorization': MIDJOURNEY_TOKEN
		},
		body: JSON.stringify({
			type: "upscale",
			payload: {
			index: indexNumber,
			image_hash,
			message_id
			}
		})
		});
	
		const result = await response.json();
		if (result.status !== 0) return;
	
		for (let attempt = 0; attempt < 20; attempt++) {
		await new Promise(resolve => setTimeout(resolve, 5000));
	
		const pollRes = await fetch('https://backend.build.mugafi.com/v1/external/midjourney', {
			method: 'POST',
			headers: {
			'Content-Type': 'application/json',
			'Authorization': MIDJOURNEY_TOKEN
			},
			body: JSON.stringify({
			type: 'query',
			payload: { id: imageData.id }
			})
		});
	
		const pollData = await pollRes.json();
		if (pollData?.data?.status === 'ready' && Array.isArray(pollData?.data?.images) && pollData.data.images.length > 1) {
			const images = pollData.data.images;
			const upscaledImageUrl = images[images.length - 1]?.url || '';
			console.log('first image ==>>',images[0].url)
			console.log('recent image ==>>',images[images.length - 1]?.url)
			console.log('pollData.data.images before update:', pollData.data.images);
			const updatedPanels = page.panels.map((p: Panel, idx: number) => {
				console.log('Checking panel update:', { idx, panelIndex });
				return idx === panelIndex
					? { 
						...p, 
						imageUrl: upscaledImageUrl, 
						imageData: pollData.data, 
						loading: false 
					}
					: p
			});			

			console.log(panelIndex, "_panelIndex");
			
			console.log(page.panels, pollData.data, updatedPanels, "___updatedPanels");
			onPageChange({ ...page, panels: updatedPanels });
			break;
		}
		}
	};
	

	const generatePanelImages = async () => {
		console.log('🚀 NEW SEQUENTIAL GENERATION STARTED');
		if (page.panels.some((panel: Panel) => !panel.content.trim())) {
		alert('Please fill in content for all panels before generating images');
		return;
		}

		setIsGeneratingPanels(true);
		try {
		const updatedPanels = [];
		const previousPanels: Array<{scene: string, image: string}> = [];

		for (let i = 0; i < page.panels.length; i++) {
			const panel = page.panels[i];
			console.log(`=== GENERATING PANEL ${i + 1} ===`);

			// Find the first character name in the map that appears in the panel content
			const matchedCharacterName = Object.keys(characterImageMap).find(name =>
				panel.content.toLowerCase().includes(name.toLowerCase())
			);
			let crefArg = '';
			let srefArg = '';
			if (matchedCharacterName) {
				crefArg = ` --cref ${characterImageMap[matchedCharacterName]}`;
				srefArg = ` --sref ${characterImageMap[matchedCharacterName]}`;
			}

			const matchedCharacter = characters.find(char =>
				panel.content.toLowerCase().includes(char.name.toLowerCase())
			);
			console.log('Matched character:', matchedCharacter);
			console.log('Image URL used for cref:', matchedCharacter?.imageUrl);
			const prompt = panel.content;
			const panelId = panel.id;

			const requestPayload: any = {
			type: 'generate',
			payload: {
				prompt: prompt,
				args: `--iw 1.5 --v 6 --ar 2:3${crefArg} ${srefArg}`
			}
			};


			const generateRes = await fetch('https://backend.build.mugafi.com/v1/external/midjourney', {
			method: 'POST',
			headers: {
				'Content-Type': 'application/json',
				'Authorization': MIDJOURNEY_TOKEN
			},
			body: JSON.stringify(requestPayload)
			});

			if (!generateRes.ok) throw new Error(`Failed to generate panel ${panelId}`);

			const { data } = await generateRes.json();
			const imageId = data.id;

			let finalImageUrl = null;
			let imageGridData = null;

			// Polling logic
			for (let attempt = 0; attempt < 20; attempt++) {
			await new Promise(resolve => setTimeout(resolve, 5000));

			const pollRes = await fetch('https://backend.build.mugafi.com/v1/external/midjourney', {
				method: 'POST',
				headers: {
				'Content-Type': 'application/json',
				'Authorization': MIDJOURNEY_TOKEN
				},
				body: JSON.stringify({
				type: 'query',
				payload: { id: imageId }
				})
			});

			const pollData = await pollRes.json();
			if (pollData?.data?.status === 'ready') {
				finalImageUrl = pollData.data?.images?.[0]?.url; // assuming url is present
				imageGridData = pollData.data;
				break;
			}
			}
			
			if (!finalImageUrl) throw new Error('Image generation timed out');

			const updatedPanel = {
			...panel,
			imageData: imageGridData,        // full data: grid + hashes + messageId
			imageUrl: finalImageUrl,         // no final image yet
			loading: false,
			};
			updatedPanels.push(updatedPanel);

			previousPanels.push({
			scene: panel.content,
			image: finalImageUrl
			});

			if (previousPanels.length > 2) {
			previousPanels.shift();
			}
		}

		onPageChange({ ...page, panels: updatedPanels });
		} catch (error) {
		console.error('Error generating panel images:', error);
		alert('Failed to generate some panel images. Please try again.');
		} finally {
		setIsGeneratingPanels(false);
		}
	};


	return (
		<div className="space-y-6">
		<div className="flex justify-between items-center">
			<h2 className="text-2xl font-bold">Comic Editor - Page {page.pageNumber}</h2>
			<div className="flex gap-2">
			<Button onClick={generatePanelImages} disabled={isGeneratingPanels}>
				<Play className="w-4 h-4 mr-2" />
				{isGeneratingPanels ? 'Generating...' : 'Generate All Panels'}
			</Button>
			</div>
		</div>

		<div className="grid gap-4">
			{page.panels.map((panel: Panel, index: number) => (
			<Card key={panel.id}>
				<CardHeader>
				<CardTitle>Panel {index + 1}</CardTitle>
				</CardHeader>
				<CardContent className="space-y-4">
				<Textarea
					placeholder="Describe what happens in this panel (e.g., 'The hero stands on a cliff overlooking the valley')"
					value={panel.content}
					onChange={(e) => updatePanelContent(index, e.target.value)}
					rows={3}
				/>
				
				{(panel.imageUrl || panel.imageData) && (
					<>
					{console.log('panel content ==>>', panel.imageData.images)}
					<img
						src={panel.imageUrl || (panel.imageData.images[1].url || panel.imageData.images[0].url)}
						style={{ maxWidth: '256px', height: 'auto' }}
						className="rounded border"
					/>
					{panel.imageData && panel.imageData.images && panel.imageData.images.length === 1 && (
						<div className="flex gap-2 mt-2">
						{[1, 2, 3, 4].map((btnIdx) => (
							<Button
							key={btnIdx}
							className="bg-[#262222] text-white px-3 py-1 rounded-md"
							onClick={() => upscalePanelImage(index, btnIdx, panel.imageData)}
							>
							U{btnIdx}
							</Button>
						))}
						</div>
					)}
					</>
				)}

				</CardContent>
			</Card>
			))}
		</div>

		{page.panels.length === 0 && (
			<div className="text-center py-12 text-muted-foreground">
			<p>Configure your page layout first to start editing panels.</p>
			</div>
		)}
		</div>
	);
	}