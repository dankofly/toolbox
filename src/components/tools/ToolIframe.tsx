'use client';

import { useState } from 'react';
import { Loader2, Maximize2, Minimize2 } from 'lucide-react';
import { Button } from '@/components/ui/button';

interface ToolIframeProps {
  htmlFile: string;
  title: string;
}

export function ToolIframe({ htmlFile, title }: ToolIframeProps) {
  const [loading, setLoading] = useState(true);
  const [fullscreen, setFullscreen] = useState(false);

  if (fullscreen) {
    return (
      <div className="fixed inset-0 z-50 bg-background">
        {/* Fullscreen Toolbar */}
        <div className="flex items-center justify-between px-4 py-3 bg-muted/50 border-b border-border">
          <span className="text-sm font-medium tracking-wide">{title}</span>
          <Button
            variant="ghost"
            size="sm"
            onClick={() => setFullscreen(false)}
            className="text-muted-foreground hover:text-foreground"
          >
            <Minimize2 className="h-4 w-4 mr-2" />
            <span className="text-xs uppercase tracking-wide">Beenden</span>
          </Button>
        </div>
        <iframe
          src={`/tools/${htmlFile}`}
          title={title}
          className="w-full h-[calc(100vh-52px)] border-0"
          sandbox="allow-scripts allow-same-origin allow-forms allow-popups allow-downloads"
        />
      </div>
    );
  }

  return (
    <div className="relative border border-border rounded-lg overflow-hidden">
      {/* Toolbar */}
      <div className="flex items-center justify-between px-4 py-2 bg-muted/50 border-b border-border">
        <span className="text-sm font-medium tracking-wide">{title}</span>
        <Button
          variant="ghost"
          size="sm"
          onClick={() => setFullscreen(true)}
          className="text-muted-foreground hover:text-foreground"
        >
          <Maximize2 className="h-4 w-4 mr-2" />
          <span className="text-xs uppercase tracking-wide">Vollbild</span>
        </Button>
      </div>

      {/* Loading indicator */}
      {loading && (
        <div className="absolute inset-0 flex items-center justify-center bg-background/80 z-10 mt-10">
          <Loader2 className="h-8 w-8 animate-spin text-primary" />
        </div>
      )}

      {/* Iframe - responsive height */}
      <iframe
        src={`/tools/${htmlFile}`}
        title={title}
        className="w-full border-0 h-[600px] md:h-[700px] lg:h-[800px]"
        onLoad={() => setLoading(false)}
        sandbox="allow-scripts allow-same-origin allow-forms allow-popups allow-downloads"
      />
    </div>
  );
}
