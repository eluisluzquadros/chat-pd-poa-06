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
  return (
    <TooltipProvider>
      <Tooltip>
        <TooltipTrigger asChild>
          <div className="flex items-center gap-2">
            <Badge 
              variant="default"
              className="flex items-center gap-1"
            >
              <Info className="h-3 w-3" />
              Agentic RAG
            </Badge>
          </div>
        </TooltipTrigger>
        <TooltipContent>
          <p className="text-sm">
            Sistema Agentic RAG com agentes autônomos
          </p>
          <p className="text-xs text-muted-foreground mt-1">
            Sistema unificado usado em todas as interfaces
          </p>
        </TooltipContent>
      </Tooltip>
    </TooltipProvider>
  );
}