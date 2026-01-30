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

  return (
    <div className={`relative ${fullscreen ? 'fixed inset-0 z-50 bg-background' : 'border border-border'}`}>
      {/* Toolbar */}
      <div className="flex items-center justify-between px-4 py-3 bg-muted/50 border-b border-border">
        <span className="text-sm font-medium tracking-wide">{title}</span>
        <div className="flex items-center gap-2">
          <Button
            variant="ghost"
            size="sm"
            onClick={() => setFullscreen(!fullscreen)}
            aria-label={fullscreen ? 'Vollbild beenden' : 'Vollbild'}
            className="text-muted-foreground hover:text-foreground"
          >
            {fullscreen ? (
              <>
                <Minimize2 className="h-4 w-4 mr-2" />
                <span className="text-xs uppercase tracking-wide">Beenden</span>
              </>
            ) : (
              <>
                <Maximize2 className="h-4 w-4 mr-2" />
                <span className="text-xs uppercase tracking-wide">Vollbild</span>
              </>
            )}
          </Button>
        </div>
      </div>

      {/* Loading indicator */}
      {loading && (
        <div className="absolute inset-0 flex items-center justify-center bg-background/80 z-10 mt-12">
          <Loader2 className="h-8 w-8 animate-spin text-primary" />
        </div>
      )}

      {/* Iframe */}
      <iframe
        src={`/tools/${htmlFile}`}
        title={title}
        className={`w-full border-0 ${fullscreen ? 'h-[calc(100vh-52px)]' : 'min-h-[700px]'}`}
        onLoad={() => setLoading(false)}
        sandbox="allow-scripts allow-same-origin allow-forms allow-popups allow-downloads"
      />
    </div>
  );
}
