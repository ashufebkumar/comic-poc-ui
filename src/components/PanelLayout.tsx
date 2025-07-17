'use client';

import { Panel, Page } from '@/types';
import { Button } from '../components/ui/button';
import { Input } from '../components/ui/input';
import { Card, CardContent } from '../components/ui/card';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '../components/ui/select';

interface PanelLayoutProps {
  page: Page;
  onPageChange: (page: Page) => void;
}

export default function PanelLayout({ page, onPageChange }: PanelLayoutProps) {
  const updatePanelCount = (count: number) => {
    const newPanels = Array.from({ length: count }, (_, i) => {
      const existingPanel = page.panels[i];
      return existingPanel || {
        id: `panel-${i}`,
        content: '',
        characters: [],
        position: i,
        size: 'medium' as const,
      };
    });

    onPageChange({
      ...page,
      panelCount: count,
      panels: newPanels,
    });
  };

  const updateOrientation = (orientation: 'horizontal' | 'vertical') => {
    onPageChange({
      ...page,
      orientation,
    });
  };

  const getGridLayout = () => {
    const { panelCount, orientation } = page;
    
    if (panelCount <= 2) {
      return orientation === 'horizontal' 
        ? 'grid-cols-2 grid-rows-1' 
        : 'grid-cols-1 grid-rows-2';
    }
    
    if (panelCount === 3) {
      return orientation === 'horizontal'
        ? 'grid-cols-3 grid-rows-1'
        : 'grid-cols-1 grid-rows-3';
    }
    
    if (panelCount === 4) {
      return 'grid-cols-2 grid-rows-2';
    }
    
    if (panelCount <= 6) {
      return orientation === 'horizontal'
        ? 'grid-cols-3 grid-rows-2'
        : 'grid-cols-2 grid-rows-3';
    }
    
    return 'grid-cols-3 grid-rows-3';
  };

  const getPanelSize = (index: number) => {
    if (page.panelCount % 2 === 1 && index === page.panelCount - 1) {
      return 'col-span-2';
    }
    return '';
  };

  return (
    <div className="space-y-6">
      <div className="flex gap-4 items-center">
        <div className="flex items-center gap-2">
          <label className="text-sm font-medium">Panel Count:</label>
          <Input
            type="number"
            min="1"
            max="9"
            value={page.panelCount}
            onChange={(e) => updatePanelCount(parseInt(e.target.value) || 1)}
            className="w-20"
          />
        </div>
        
        {page.panelCount % 2 === 1 && page.panelCount > 1 && (
          <div className="flex items-center gap-2">
            <label className="text-sm font-medium">Orientation:</label>
            <Select value={page.orientation} onValueChange={updateOrientation}>
              <SelectTrigger className="w-32">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="horizontal">Horizontal</SelectItem>
                <SelectItem value="vertical">Vertical</SelectItem>
              </SelectContent>
            </Select>
          </div>
        )}
      </div>

      <div className={`grid gap-4 ${getGridLayout()}`}>
        {page.panels.map((panel: Panel, index: number) => {
          // Determine the latest image to show: upscaled if available, otherwise generated
          let imageUrl = undefined;
          if (panel.imageData && panel.imageData.images && panel.imageData.images.length > 1) {
            imageUrl = panel.imageData.images[panel.imageData.images.length - 1].url;
          } else if (panel.imageData && panel.imageData.images && panel.imageData.images.length > 0) {
            imageUrl = panel.imageData.images[0].url;
          } else if (panel.imageUrl) {
            imageUrl = panel.imageUrl;
          }
          return (
            <Card key={panel.id} className={`${getPanelSize(index)} min-h-[200px]`}>
              <CardContent className="p-4 h-full flex items-center justify-center">
                {imageUrl ? (
                  <img
                    src={imageUrl}
                    alt={`Panel ${index + 1}`}
                    className="w-full h-full object-cover rounded border"
                  />
                ) : null}
              </CardContent>
            </Card>
          );
        })}
      </div>
    </div>
  );
}