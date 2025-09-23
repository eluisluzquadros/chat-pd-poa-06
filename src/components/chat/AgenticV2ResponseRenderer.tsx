import React from 'react';
import { Badge } from '@/components/ui/badge';
import { parseMarkdown } from '@/utils/markdownUtils';

interface AgenticV2ResponseRendererProps {
  content: string;
  isAgenticV2?: boolean;
  isAdmin?: boolean;
  isTestMode?: boolean;
}

export function AgenticV2ResponseRenderer({ content, isAgenticV2 = false, isAdmin = false, isTestMode = false }: AgenticV2ResponseRendererProps) {
  // Apply consistent markdown processing for all responses
  const htmlContent = parseMarkdown(content);

  return (
    <div className="space-y-4">
      {isAgenticV2 && isAdmin && (
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
      
      <div 
        className="text-sm leading-relaxed space-y-0 [&>*:first-child]:mt-0"
        dangerouslySetInnerHTML={{ __html: htmlContent }}
      />
    </div>
  );
}