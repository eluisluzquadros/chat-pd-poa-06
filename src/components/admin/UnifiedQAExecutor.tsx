import React, { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Textarea } from '@/components/ui/textarea';
import { Badge } from '@/components/ui/badge';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { 
  Zap, Play, Settings, Target,
  GitCompare, Cpu, Activity
} from 'lucide-react';

interface UnifiedQAExecutorProps {
  onExecute: (config: any) => void;
  isRunning: boolean;
}

export function UnifiedQAExecutor({ onExecute, isRunning }: UnifiedQAExecutorProps) {
  const [executionMode, setExecutionMode] = useState<'single' | 'batch' | 'comparison'>('single');
  const [singleQuery, setSingleQuery] = useState('');
  const [selectedRagVersion, setSelectedRagVersion] = useState<'v1' | 'v2' | 'both'>('both');
  const [batchConfig, setBatchConfig] = useState({
    testCount: 10,
    category: 'all'
  });

  const handleSingleExecution = () => {
    if (!singleQuery.trim()) return;
    
    onExecute({
      mode: 'single',
      query: singleQuery,
      ragVersions: selectedRagVersion === 'both' ? ['v1', 'v2'] : [selectedRagVersion],
      compareResults: selectedRagVersion === 'both'
    });
  };

  const handleBatchExecution = () => {
    onExecute({
      mode: 'batch',
      ...batchConfig,
      ragVersions: selectedRagVersion === 'both' ? ['v1', 'v2'] : [selectedRagVersion],
      compareResults: selectedRagVersion === 'both'
    });
  };

  const handleComparisonExecution = () => {
    onExecute({
      mode: 'comparison',
      ragVersions: ['v1', 'v2'],
      testCount: batchConfig.testCount,
      category: batchConfig.category,
      compareResults: true,
      generateInsights: true
    });
  };

  return (
    <div className="space-y-6">
      {/* Seletor de Modo */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Zap className="h-5 w-5" />
            Executor Unificado de QA
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            <div className="space-y-2">
              <Label>Modo de Execução</Label>
              <Select
                value={executionMode}
                onValueChange={(value: 'single' | 'batch' | 'comparison') => setExecutionMode(value)}
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="single">Query Única</SelectItem>
                  <SelectItem value="batch">Execução em Lote</SelectItem>
                  <SelectItem value="comparison">Comparação Avançada</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <Label>Versão do RAG</Label>
              <Select
                value={selectedRagVersion}
                onValueChange={(value: 'v1' | 'v2' | 'both') => setSelectedRagVersion(value)}
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="v1">
                    <div className="flex items-center gap-2">
                      <Badge variant="outline">V1</Badge>
                      agentic-rag (Local)
                    </div>
                  </SelectItem>
                  <SelectItem value="v2">
                    <div className="flex items-center gap-2">
                      <Badge variant="outline">V2</Badge>
                      agentic-rag-dify (External)
                    </div>
                  </SelectItem>
                  <SelectItem value="both">
                    <div className="flex items-center gap-2">
                      <GitCompare className="h-4 w-4" />
                      Ambas as Versões
                    </div>
                  </SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Configuração Específica por Modo */}
      {executionMode === 'single' && (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Target className="h-5 w-5" />
              Query Única
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="singleQuery">Query para Teste</Label>
              <Textarea
                id="singleQuery"
                placeholder="Digite sua query aqui..."
                value={singleQuery}
                onChange={(e) => setSingleQuery(e.target.value)}
                rows={3}
              />
            </div>
            
            {selectedRagVersion === 'both' && (
              <Alert>
                <GitCompare className="h-4 w-4" />
                <AlertDescription>
                  A query será executada em ambas as versões RAG para comparação direta.
                </AlertDescription>
              </Alert>
            )}

            <Button 
              onClick={handleSingleExecution}
              disabled={isRunning || !singleQuery.trim()}
              className="w-full gap-2"
            >
              <Play className="h-4 w-4" />
              Executar Query
            </Button>
          </CardContent>
        </Card>
      )}

      {executionMode === 'batch' && (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Cpu className="h-5 w-5" />
              Execução em Lote
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label>Número de Testes</Label>
                <Select
                  value={batchConfig.testCount.toString()}
                  onValueChange={(value) => setBatchConfig(prev => ({ ...prev, testCount: parseInt(value) }))}
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
                <Label>Categoria</Label>
                <Select
                  value={batchConfig.category}
                  onValueChange={(value) => setBatchConfig(prev => ({ ...prev, category: value }))}
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">Todas as categorias</SelectItem>
                    <SelectItem value="regime_urbanistico">Regime Urbanístico</SelectItem>
                    <SelectItem value="certificacao">Certificação</SelectItem>
                    <SelectItem value="artigos_legais">Artigos Legais</SelectItem>
                    <SelectItem value="procedimentos">Procedimentos</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>

            <Button 
              onClick={handleBatchExecution}
              disabled={isRunning}
              className="w-full gap-2"
            >
              <Play className="h-4 w-4" />
              Executar Lote
            </Button>
          </CardContent>
        </Card>
      )}

      {executionMode === 'comparison' && (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Activity className="h-5 w-5" />
              Comparação Avançada
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <Alert>
              <GitCompare className="h-4 w-4" />
              <AlertDescription>
                Modo de comparação avançada entre RAG V1 e V2 com análise detalhada de diferenças,
                geração de insights automáticos e recomendações de otimização.
              </AlertDescription>
            </Alert>

            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label>Testes para Comparação</Label>
                <Select
                  value={batchConfig.testCount.toString()}
                  onValueChange={(value) => setBatchConfig(prev => ({ ...prev, testCount: parseInt(value) }))}
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

              <div className="space-y-2">
                <Label>Categoria Foco</Label>
                <Select
                  value={batchConfig.category}
                  onValueChange={(value) => setBatchConfig(prev => ({ ...prev, category: value }))}
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">Análise Geral</SelectItem>
                    <SelectItem value="regime_urbanistico">Regime Urbanístico</SelectItem>
                    <SelectItem value="certificacao">Certificação</SelectItem>
                    <SelectItem value="artigos_legais">Artigos Legais</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>

            <div className="space-y-2">
              <h4 className="font-medium">Análises Incluídas:</h4>
              <div className="grid grid-cols-2 gap-2 text-sm text-muted-foreground">
                <div>• Comparação de acurácia</div>
                <div>• Análise de tempo de resposta</div>
                <div>• Score de similaridade</div>
                <div>• Detecção de inconsistências</div>
                <div>• Insights automáticos</div>
                <div>• Recomendações de melhoria</div>
              </div>
            </div>

            <Button 
              onClick={handleComparisonExecution}
              disabled={isRunning}
              className="w-full gap-2"
            >
              <GitCompare className="h-4 w-4" />
              Iniciar Comparação Avançada
            </Button>
          </CardContent>
        </Card>
      )}

      {/* Status */}
      {isRunning && (
        <Alert>
          <Activity className="h-4 w-4" />
          <AlertDescription>
            Execução em andamento... Os resultados aparecerão nas respectivas abas quando concluídos.
          </AlertDescription>
        </Alert>
      )}
    </div>
  );
}