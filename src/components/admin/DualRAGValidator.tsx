import React, { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Checkbox } from '@/components/ui/checkbox';
import { Badge } from '@/components/ui/badge';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { 
  GitCompare, Play, Settings, Info,
  CheckCircle, XCircle, Clock
} from 'lucide-react';

interface DualRAGValidatorProps {
  onExecute: (config: any) => void;
  isRunning: boolean;
  progress?: {
    v1Complete: boolean;
    v2Complete: boolean;
    comparisonComplete: boolean;
    percentage: number;
  };
}

export function DualRAGValidator({ onExecute, isRunning, progress }: DualRAGValidatorProps) {
  const [config, setConfig] = useState({
    testCount: 20,
    categories: [] as string[],
    includeSQL: true,
    compareResponses: true,
    analyzeConsistency: true,
    generateInsights: true
  });

  const availableCategories = [
    'regime_urbanistico',
    'certificacao',
    'artigos_legais',
    'procedimentos',
    'consultas_gerais'
  ];

  const handleExecute = () => {
    onExecute({
      ...config,
      mode: 'dual_validation',
      ragVersions: ['v1', 'v2']
    });
  };

  return (
    <div className="space-y-6">
      {/* Configuração */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <GitCompare className="h-5 w-5" />
            Configuração de Validação Dual
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="testCount">Número de Testes</Label>
              <Select
                value={config.testCount.toString()}
                onValueChange={(value) => setConfig(prev => ({ ...prev, testCount: parseInt(value) }))}
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="10">10 testes</SelectItem>
                  <SelectItem value="20">20 testes</SelectItem>
                  <SelectItem value="50">50 testes</SelectItem>
                  <SelectItem value="100">100 testes</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <Label>Categorias de Teste</Label>
              <div className="space-y-2">
                {availableCategories.map((category) => (
                  <div key={category} className="flex items-center space-x-2">
                    <Checkbox
                      id={category}
                      checked={config.categories.includes(category)}
                      onCheckedChange={(checked) => {
                        if (checked) {
                          setConfig(prev => ({
                            ...prev,
                            categories: [...prev.categories, category]
                          }));
                        } else {
                          setConfig(prev => ({
                            ...prev,
                            categories: prev.categories.filter(c => c !== category)
                          }));
                        }
                      }}
                    />
                    <Label htmlFor={category} className="text-sm">
                      {category.replace('_', ' ').toUpperCase()}
                    </Label>
                  </div>
                ))}
              </div>
            </div>
          </div>

          <div className="space-y-3">
            <div className="flex items-center space-x-2">
              <Checkbox
                id="includeSQL"
                checked={config.includeSQL}
                onCheckedChange={(checked) => setConfig(prev => ({ ...prev, includeSQL: !!checked }))}
              />
              <Label htmlFor="includeSQL">Incluir casos de teste SQL</Label>
            </div>

            <div className="flex items-center space-x-2">
              <Checkbox
                id="compareResponses"
                checked={config.compareResponses}
                onCheckedChange={(checked) => setConfig(prev => ({ ...prev, compareResponses: !!checked }))}
              />
              <Label htmlFor="compareResponses">Comparar respostas lado a lado</Label>
            </div>

            <div className="flex items-center space-x-2">
              <Checkbox
                id="analyzeConsistency"
                checked={config.analyzeConsistency}
                onCheckedChange={(checked) => setConfig(prev => ({ ...prev, analyzeConsistency: !!checked }))}
              />
              <Label htmlFor="analyzeConsistency">Analisar consistência entre versões</Label>
            </div>

            <div className="flex items-center space-x-2">
              <Checkbox
                id="generateInsights"
                checked={config.generateInsights}
                onCheckedChange={(checked) => setConfig(prev => ({ ...prev, generateInsights: !!checked }))}
              />
              <Label htmlFor="generateInsights">Gerar insights automáticos</Label>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Informações sobre os sistemas */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-blue-600">
              <Badge variant="outline">V1</Badge>
              agentic-rag (Local)
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-2 text-sm">
              <p>• Sistema local com controle total</p>
              <p>• Configurações otimizáveis</p>
              <p>• Latência controlada</p>
              <p>• Acesso direto ao knowledge base</p>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-purple-600">
              <Badge variant="outline">V2</Badge>
              agentic-rag-dify (External)
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-2 text-sm">
              <p>• Sistema externo via Dify</p>
              <p>• Configurações fixas</p>
              <p>• Latência variável</p>
              <p>• Interface API padronizada</p>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Status de Execução */}
      {progress && (
        <Card>
          <CardHeader>
            <CardTitle>Status da Validação Dual</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-3 gap-4">
              <div className="flex items-center gap-2">
                {progress.v1Complete ? (
                  <CheckCircle className="h-4 w-4 text-green-500" />
                ) : (
                  <Clock className="h-4 w-4 text-yellow-500" />
                )}
                <span className="text-sm">RAG V1</span>
              </div>
              <div className="flex items-center gap-2">
                {progress.v2Complete ? (
                  <CheckCircle className="h-4 w-4 text-green-500" />
                ) : (
                  <Clock className="h-4 w-4 text-yellow-500" />
                )}
                <span className="text-sm">RAG V2</span>
              </div>
              <div className="flex items-center gap-2">
                {progress.comparisonComplete ? (
                  <CheckCircle className="h-4 w-4 text-green-500" />
                ) : (
                  <Clock className="h-4 w-4 text-yellow-500" />
                )}
                <span className="text-sm">Comparação</span>
              </div>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Alerta Informativo */}
      <Alert>
        <Info className="h-4 w-4" />
        <AlertDescription>
          A validação dual executa os mesmos testes em ambos os sistemas RAG simultaneamente, 
          permitindo comparação direta de qualidade, performance e consistência das respostas.
        </AlertDescription>
      </Alert>

      {/* Botão de Execução */}
      <div className="flex justify-end">
        <Button 
          onClick={handleExecute}
          disabled={isRunning || config.categories.length === 0}
          size="lg"
          className="gap-2"
        >
          <Play className="h-4 w-4" />
          {isRunning ? 'Executando Validação...' : 'Iniciar Validação Dual'}
        </Button>
      </div>
    </div>
  );
}