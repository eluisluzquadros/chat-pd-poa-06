import React, { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Checkbox } from '@/components/ui/checkbox';
import { Label } from '@/components/ui/label';
import { Play, Settings, Zap } from 'lucide-react';

interface EnhancedBenchmarkExecutorProps {
  onExecute: (config: any) => void;
  isRunning: boolean;
  progress?: any;
}

export function EnhancedBenchmarkExecutor({ onExecute, isRunning, progress }: EnhancedBenchmarkExecutorProps) {
  const [config, setConfig] = useState({
    models: ['openai/gpt-4o-mini'],
    testCount: 20,
    optimizationEnabled: true,
    categories: ['all']
  });

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Zap className="h-5 w-5" />
          Benchmark Avançado - RAG V1
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="space-y-2">
          <Label>Modelos para Teste</Label>
          <Select value={config.models[0]} onValueChange={(value) => setConfig(prev => ({ ...prev, models: [value] }))}>
            <SelectTrigger>
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="openai/gpt-4o-mini">GPT-4O Mini</SelectItem>
              <SelectItem value="openai/gpt-4o">GPT-4O</SelectItem>
              <SelectItem value="anthropic/claude-3-5-sonnet">Claude 3.5 Sonnet</SelectItem>
            </SelectContent>
          </Select>
        </div>

        <div className="space-y-2">
          <Label>Número de Testes</Label>
          <Select 
            value={config.testCount.toString()} 
            onValueChange={(value) => setConfig(prev => ({ ...prev, testCount: parseInt(value) }))}
          >
            <SelectTrigger>
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="20">20 testes</SelectItem>
              <SelectItem value="50">50 testes</SelectItem>
              <SelectItem value="100">100 testes</SelectItem>
            </SelectContent>
          </Select>
        </div>

        <div className="flex items-center space-x-2">
          <Checkbox
            id="optimization"
            checked={config.optimizationEnabled}
            onCheckedChange={(checked) => setConfig(prev => ({ ...prev, optimizationEnabled: !!checked }))}
          />
          <Label htmlFor="optimization">Habilitar otimização automática</Label>
        </div>

        <Button onClick={() => onExecute(config)} disabled={isRunning} className="w-full gap-2">
          <Play className="h-4 w-4" />
          Executar Benchmark V3
        </Button>
      </CardContent>
    </Card>
  );
}