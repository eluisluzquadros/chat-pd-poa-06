import React from 'react';
import { Badge } from '@/components/ui/badge';

interface AgenticV2ResponseRendererProps {
  content: string;
  isAgenticV2?: boolean;
  isAdmin?: boolean;
  isTestMode?: boolean;
}

export function AgenticV2ResponseRenderer({ content, isAgenticV2 = false, isAdmin = false, isTestMode = false }: AgenticV2ResponseRendererProps) {
  if (!isAgenticV2) {
    // For non-agentic-v2 responses, apply normal markdown processing
    return (
      <div className="prose prose-sm max-w-none dark:prose-invert">
        <div 
          className="whitespace-pre-wrap text-foreground leading-relaxed"
          dangerouslySetInnerHTML={{ __html: content.replace(/\n/g, '<br />') }}
        />
      </div>
    );
  }

  // For agentic-v2 responses, preserve exactly as received
  return (
    <div className="space-y-4">
      {isAdmin && (
        <div className="flex items-center gap-2 mb-3">
          <Badge variant="outline" className="bg-purple-100 text-purple-800 dark:bg-purple-900 dark:text-purple-300">
            agentic-rag-v2
          </Badge>
          {isTestMode && (
            <Badge variant="secondary" className="bg-orange-100 text-orange-800 dark:bg-orange-900 dark:text-orange-300">
              TEST MODE
            </Badge>
          )}
        </div>
      )}
      
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