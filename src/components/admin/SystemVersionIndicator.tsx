import React from 'react';
import { Badge } from '@/components/ui/badge';
import { Info } from 'lucide-react';
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from '@/components/ui/tooltip';

export function SystemVersionIndicator() {
  const useAgenticRAGv2 = localStorage.getItem('useAgenticRAGv2') !== 'false';
  
  return (
    <TooltipProvider>
      <Tooltip>
        <TooltipTrigger asChild>
          <div className="flex items-center gap-2">
            <Badge 
              variant={useAgenticRAGv2 ? "default" : "secondary"}
              className="flex items-center gap-1"
            >
              <Info className="h-3 w-3" />
              {useAgenticRAGv2 ? 'Agentic RAG v2' : 'RAG v1'}
            </Badge>
          </div>
        </TooltipTrigger>
        <TooltipContent>
          <p className="text-sm">
            {useAgenticRAGv2 
              ? 'Usando o novo sistema Agentic RAG v2 com agentes autônomos'
              : 'Usando o sistema RAG v1 tradicional'}
          </p>
          <p className="text-xs text-muted-foreground mt-1">
            {useAgenticRAGv2 
              ? 'Mesmo sistema usado em /chat'
              : 'Sistema legado para compatibilidade'}
          </p>
        </TooltipContent>
      </Tooltip>
    </TooltipProvider>
  );
}