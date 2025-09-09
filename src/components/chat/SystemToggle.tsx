import React from 'react';
import { Badge } from '@/components/ui/badge';
import { Bot, Zap } from 'lucide-react';

export function SystemToggle() {
  return (
    <div className="px-1 py-2 mb-3">
      <div className="flex items-center gap-2 p-2 rounded-lg bg-accent/30 border border-accent/50">
        <div className="flex items-center gap-1.5">
          <Zap className="h-3.5 w-3.5 text-primary" />
          <span className="text-xs font-medium text-foreground">Sistema Agentic RAG</span>
        </div>
        <Badge variant="default" className="text-[10px] px-1.5 py-0.5 h-auto flex items-center gap-1">
          <Bot className="h-2.5 w-2.5" />
          ATIVO
        </Badge>
      </div>
      
      <div className="mt-2 px-2">
        <div className="text-[10px] text-muted-foreground">
          <div className="font-medium text-primary mb-1">🚀 Funcionalidades Ativas</div>
          <ul className="space-y-0.5 text-[10px] leading-tight">
            <li>• Agentes especializados autônomos</li>
            <li>• Legal Knowledge Graph</li>
            <li>• Auto-validação e refinamento</li>
            <li>• Chunking hierárquico de documentos</li>
          </ul>
        </div>
      </div>
    </div>
  );
}