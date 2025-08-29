import React, { useState, useEffect } from 'react';
import { Switch } from '@/components/ui/switch';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Bot, Zap, Settings } from 'lucide-react';

export function SystemToggle() {
  const [useAgenticRAGv2, setUseAgenticRAGv2] = useState(true);

  useEffect(() => {
    // Load setting from localStorage
    const stored = localStorage.getItem('useAgenticRAGv2');
    setUseAgenticRAGv2(stored !== 'false'); // Default to true
  }, []);

  const handleToggle = (checked: boolean) => {
    setUseAgenticRAGv2(checked);
    localStorage.setItem('useAgenticRAGv2', String(checked));
    
    // Optionally reload to apply changes immediately
    if (window.confirm('Mudança aplicada! Deseja recarregar a página para usar o novo sistema?')) {
      window.location.reload();
    }
  };

  return (
    <Card className="mb-4">
      <CardHeader className="pb-3">
        <CardTitle className="flex items-center gap-2 text-sm">
          <Settings className="h-4 w-4" />
          Sistema de IA
        </CardTitle>
      </CardHeader>
      <CardContent className="pt-0">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <Label htmlFor="system-toggle" className="text-sm font-medium">
              {useAgenticRAGv2 ? (
                <div className="flex items-center gap-2">
                  <Zap className="h-4 w-4 text-orange-500" />
                  Agentic-RAG v3.0
                </div>
              ) : (
                <div className="flex items-center gap-2">
                  <Bot className="h-4 w-4 text-blue-500" />
                  Sistema Legacy
                </div>
              )}
            </Label>
            
            <Badge variant={useAgenticRAGv2 ? "default" : "secondary"} className="text-xs">
              {useAgenticRAGv2 ? 'NOVO' : 'ORIGINAL'}
            </Badge>
          </div>
          
          <Switch
            id="system-toggle"
            checked={useAgenticRAGv2}
            onCheckedChange={handleToggle}
          />
        </div>
        
        <div className="mt-2 text-xs text-muted-foreground">
          {useAgenticRAGv2 ? (
            <>
              <div className="font-medium text-orange-600 mb-1">🚀 Sistema Avançado Ativo</div>
              <ul className="space-y-0.5 text-xs">
                <li>• Agentes especializados autônomos</li>
                <li>• Knowledge Graph com relações jurídicas</li>
                <li>• Auto-validação e refinamento</li>
                <li>• Chunking hierárquico de documentos</li>
              </ul>
            </>
          ) : (
            <>
              <div className="font-medium text-blue-600 mb-1">🤖 Sistema Original</div>
              <ul className="space-y-0.5 text-xs">
                <li>• Pipeline tradicional RAG</li>
                <li>• Busca vetorial simples</li>
                <li>• Processamento sequencial</li>
                <li>• Sem auto-correção</li>
              </ul>
            </>
          )}
        </div>
      </CardContent>
    </Card>
  );
}