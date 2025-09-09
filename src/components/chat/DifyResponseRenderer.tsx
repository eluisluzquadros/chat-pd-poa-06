import React from 'react';
import { Badge } from '@/components/ui/badge';

interface DifyResponseRendererProps {
  content: string;
  isDify?: boolean;
}

export function DifyResponseRenderer({ content, isDify = false }: DifyResponseRendererProps) {
  if (!isDify) {
    // For non-Dify responses, apply normal markdown processing
    return (
      <div className="prose prose-sm max-w-none dark:prose-invert">
        <div 
          className="whitespace-pre-wrap text-foreground leading-relaxed"
          dangerouslySetInnerHTML={{ __html: content.replace(/\n/g, '<br />') }}
        />
      </div>
    );
  }

  // For Dify responses, preserve exactly as received
  return (
    <div className="space-y-4">
      <div className="flex items-center gap-2 mb-3">
        <Badge variant="outline" className="bg-purple-100 text-purple-800 dark:bg-purple-900 dark:text-purple-300">
          Powered by Dify
        </Badge>
      </div>
      
      <div className="prose prose-sm max-w-none dark:prose-invert">
        <div 
          className="whitespace-pre-wrap text-foreground leading-relaxed"
          style={{
            fontSize: '14px',
            lineHeight: '1.6',
            fontFamily: 'inherit'
          }}
        >
          {content}
        </div>
      </div>
    </div>
  );
}