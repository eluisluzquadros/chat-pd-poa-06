import React, { useState, useEffect } from 'react';
import { Switch } from '@/components/ui/switch';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Bot, Zap, Settings } from 'lucide-react';

export function SystemToggle() {
  return (
    <Card className="mb-4">
      <CardHeader className="pb-3">
        <CardTitle className="flex items-center gap-2 text-sm">
          <Zap className="h-4 w-4" />
          Sistema Agentic RAG
        </CardTitle>
      </CardHeader>
      <CardContent className="pt-0">
        <div className="flex items-center gap-3">
          <Badge variant="default" className="text-xs flex items-center gap-1">
            <Bot className="h-3 w-3" />
            ATIVO
          </Badge>
          <div className="text-sm font-medium text-muted-foreground">
            Sistema unificado com agentes autônomos
          </div>
        </div>
        
        <div className="mt-3 text-xs text-muted-foreground">
          <div className="font-medium text-primary mb-1">🚀 Funcionalidades Ativas</div>
          <ul className="space-y-0.5 text-xs">
            <li>• Agentes especializados autônomos</li>
            <li>• Knowledge Graph com relações jurídicas</li>
            <li>• Auto-validação e refinamento</li>
            <li>• Chunking hierárquico de documentos</li>
          </ul>
        </div>
      </CardContent>
    </Card>
  );
}