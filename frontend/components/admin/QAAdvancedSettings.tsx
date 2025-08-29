import React, { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Label } from '@/components/ui/label';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Switch } from '@/components/ui/switch';
import { Button } from '@/components/ui/button';
import { Separator } from '@/components/ui/separator';
import { Badge } from '@/components/ui/badge';
import { AlertTriangle, Clock, Zap, DollarSign } from 'lucide-react';

interface QAAdvancedSettingsProps {
  onSettingsChange: (settings: QAAdvancedConfig) => void;
}

export interface QAAdvancedConfig {
  timeout: number;
  retryAttempts: number;
  concurrency: number;
  enableRealTimeUpdates: boolean;
  compareWithBaseline: boolean;
  generateDetailedReport: boolean;
  costLimit: number;
  priority: 'quality' | 'speed' | 'cost' | 'balanced';
  alertThreshold: number;
  enableNotifications: boolean;
}

export function QAAdvancedSettings({ onSettingsChange }: QAAdvancedSettingsProps) {
  const [config, setConfig] = useState<QAAdvancedConfig>({
    timeout: 30000,
    retryAttempts: 3,
    concurrency: 5,
    enableRealTimeUpdates: true,
    compareWithBaseline: false,
    generateDetailedReport: true,
    costLimit: 10,
    priority: 'balanced',
    alertThreshold: 80,
    enableNotifications: true
  });

  const updateConfig = (updates: Partial<QAAdvancedConfig>) => {
    const newConfig = { ...config, ...updates };
    setConfig(newConfig);
    onSettingsChange(newConfig);
  };

  const presets = {
    performance: {
      timeout: 60000,
      retryAttempts: 5,
      concurrency: 10,
      priority: 'quality' as const,
      costLimit: 50
    },
    speed: {
      timeout: 15000,
      retryAttempts: 1,
      concurrency: 15,
      priority: 'speed' as const,
      costLimit: 5
    },
    economy: {
      timeout: 30000,
      retryAttempts: 2,
      concurrency: 3,
      priority: 'cost' as const,
      costLimit: 2
    }
  };

  const applyPreset = (preset: keyof typeof presets) => {
    updateConfig(presets[preset]);
  };

  const getPriorityIcon = (priority: string) => {
    switch (priority) {
      case 'quality': return <AlertTriangle className="h-4 w-4" />;
      case 'speed': return <Zap className="h-4 w-4" />;
      case 'cost': return <DollarSign className="h-4 w-4" />;
      default: return <Clock className="h-4 w-4" />;
    }
  };

  const getPriorityColor = (priority: string) => {
    switch (priority) {
      case 'quality': return 'bg-green-100 text-green-800';
      case 'speed': return 'bg-blue-100 text-blue-800';
      case 'cost': return 'bg-yellow-100 text-yellow-800';
      default: return 'bg-gray-100 text-gray-800';
    }
  };

  return (
    <div className="space-y-6">
      {/* Presets Rápidos */}
      <Card>
        <CardHeader>
          <CardTitle className="text-lg">Configurações Predefinidas</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <Button 
              variant="outline" 
              onClick={() => applyPreset('performance')}
              className="h-auto p-4 flex flex-col items-start space-y-2"
            >
              <div className="flex items-center space-x-2">
                <AlertTriangle className="h-4 w-4" />
                <span className="font-medium">Performance</span>
              </div>
              <span className="text-xs text-muted-foreground">
                Máxima qualidade, mais tempo e custo
              </span>
            </Button>
            
            <Button 
              variant="outline" 
              onClick={() => applyPreset('speed')}
              className="h-auto p-4 flex flex-col items-start space-y-2"
            >
              <div className="flex items-center space-x-2">
                <Zap className="h-4 w-4" />
                <span className="font-medium">Velocidade</span>
              </div>
              <span className="text-xs text-muted-foreground">
                Execução rápida, qualidade adequada
              </span>
            </Button>
            
            <Button 
              variant="outline" 
              onClick={() => applyPreset('economy')}
              className="h-auto p-4 flex flex-col items-start space-y-2"
            >
              <div className="flex items-center space-x-2">
                <DollarSign className="h-4 w-4" />
                <span className="font-medium">Economia</span>
              </div>
              <span className="text-xs text-muted-foreground">
                Menor custo, execução conservadora
              </span>
            </Button>
          </div>
        </CardContent>
      </Card>

      {/* Configurações de Execução */}
      <Card>
        <CardHeader>
          <CardTitle className="text-lg">Configurações de Execução</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="timeout">Timeout (ms)</Label>
              <Input
                id="timeout"
                type="number"
                value={config.timeout}
                onChange={(e) => updateConfig({ timeout: parseInt(e.target.value) })}
                min="5000"
                max="120000"
                step="5000"
              />
              <span className="text-xs text-muted-foreground">
                Tempo limite para cada teste
              </span>
            </div>

            <div className="space-y-2">
              <Label htmlFor="retryAttempts">Tentativas de Retry</Label>
              <Input
                id="retryAttempts"
                type="number"
                value={config.retryAttempts}
                onChange={(e) => updateConfig({ retryAttempts: parseInt(e.target.value) })}
                min="0"
                max="10"
              />
              <span className="text-xs text-muted-foreground">
                Número de tentativas em caso de erro
              </span>
            </div>

            <div className="space-y-2">
              <Label htmlFor="concurrency">Concorrência</Label>
              <Input
                id="concurrency"
                type="number"
                value={config.concurrency}
                onChange={(e) => updateConfig({ concurrency: parseInt(e.target.value) })}
                min="1"
                max="20"
              />
              <span className="text-xs text-muted-foreground">
                Testes executados simultaneamente
              </span>
            </div>

            <div className="space-y-2">
              <Label htmlFor="costLimit">Limite de Custo ($)</Label>
              <Input
                id="costLimit"
                type="number"
                value={config.costLimit}
                onChange={(e) => updateConfig({ costLimit: parseFloat(e.target.value) })}
                min="0.1"
                max="1000"
                step="0.1"
              />
              <span className="text-xs text-muted-foreground">
                Limite máximo de custo por execução
              </span>
            </div>
          </div>

          <Separator />

          <div className="space-y-4">
            <div>
              <Label htmlFor="priority">Prioridade de Execução</Label>
              <Select 
                value={config.priority} 
                onValueChange={(value: QAAdvancedConfig['priority']) => updateConfig({ priority: value })}
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="quality">
                    <div className="flex items-center space-x-2">
                      <AlertTriangle className="h-4 w-4" />
                      <span>Qualidade</span>
                    </div>
                  </SelectItem>
                  <SelectItem value="speed">
                    <div className="flex items-center space-x-2">
                      <Zap className="h-4 w-4" />
                      <span>Velocidade</span>
                    </div>
                  </SelectItem>
                  <SelectItem value="cost">
                    <div className="flex items-center space-x-2">
                      <DollarSign className="h-4 w-4" />
                      <span>Custo</span>
                    </div>
                  </SelectItem>
                  <SelectItem value="balanced">
                    <div className="flex items-center space-x-2">
                      <Clock className="h-4 w-4" />
                      <span>Balanceado</span>
                    </div>
                  </SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <Label htmlFor="alertThreshold">Limite de Alerta (%)</Label>
              <Input
                id="alertThreshold"
                type="number"
                value={config.alertThreshold}
                onChange={(e) => updateConfig({ alertThreshold: parseInt(e.target.value) })}
                min="50"
                max="100"
              />
              <span className="text-xs text-muted-foreground">
                Porcentagem mínima de acerto para alertas
              </span>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Opções Avançadas */}
      <Card>
        <CardHeader>
          <CardTitle className="text-lg">Opções Avançadas</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="flex items-center justify-between">
            <div className="space-y-0.5">
              <Label>Atualizações em Tempo Real</Label>
              <p className="text-xs text-muted-foreground">
                Mostrar progresso em tempo real durante execução
              </p>
            </div>
            <Switch
              checked={config.enableRealTimeUpdates}
              onCheckedChange={(checked) => updateConfig({ enableRealTimeUpdates: checked })}
            />
          </div>

          <div className="flex items-center justify-between">
            <div className="space-y-0.5">
              <Label>Comparar com Baseline</Label>
              <p className="text-xs text-muted-foreground">
                Comparar resultados com execuções anteriores
              </p>
            </div>
            <Switch
              checked={config.compareWithBaseline}
              onCheckedChange={(checked) => updateConfig({ compareWithBaseline: checked })}
            />
          </div>

          <div className="flex items-center justify-between">
            <div className="space-y-0.5">
              <Label>Relatório Detalhado</Label>
              <p className="text-xs text-muted-foreground">
                Gerar relatório completo com análises
              </p>
            </div>
            <Switch
              checked={config.generateDetailedReport}
              onCheckedChange={(checked) => updateConfig({ generateDetailedReport: checked })}
            />
          </div>

          <div className="flex items-center justify-between">
            <div className="space-y-0.5">
              <Label>Notificações</Label>
              <p className="text-xs text-muted-foreground">
                Receber alertas sobre execuções
              </p>
            </div>
            <Switch
              checked={config.enableNotifications}
              onCheckedChange={(checked) => updateConfig({ enableNotifications: checked })}
            />
          </div>
        </CardContent>
      </Card>

      {/* Status Atual */}
      <Card>
        <CardHeader>
          <CardTitle className="text-lg">Configuração Atual</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex flex-wrap gap-2">
            <Badge className={getPriorityColor(config.priority)}>
              {getPriorityIcon(config.priority)}
              <span className="ml-1 capitalize">{config.priority}</span>
            </Badge>
            <Badge variant="outline">
              <Clock className="h-3 w-3 mr-1" />
              {config.timeout / 1000}s timeout
            </Badge>
            <Badge variant="outline">
              {config.retryAttempts} retries
            </Badge>
            <Badge variant="outline">
              {config.concurrency} concurrent
            </Badge>
            <Badge variant="outline">
              <DollarSign className="h-3 w-3 mr-1" />
              ${config.costLimit} limit
            </Badge>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}