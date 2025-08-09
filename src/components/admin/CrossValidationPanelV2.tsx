import React, { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';
import { AlertTriangle, CheckCircle, XCircle, Clock } from 'lucide-react';

interface CrossValidationResult {
  query: string;
  chatResponse: any;
  adminResponse: any;
  divergenceScore: number;
  status: 'CONSISTENT' | 'DIVERGENT' | 'ERROR';
  details: string;
  timing: {
    chatTime: number;
    adminTime: number;
  };
}

interface CrossValidationSummary {
  totalQueries: number;
  consistentQueries: number;
  divergentQueries: number;
  errorQueries: number;
  averageDivergence: number;
  alertTriggered: boolean;
  model: string;
  avgChatTime: number;
  avgAdminTime: number;
}

export function CrossValidationPanelV2() {
  const [isRunning, setIsRunning] = useState(false);
  const [results, setResults] = useState<CrossValidationResult[]>([]);
  const [summary, setSummary] = useState<CrossValidationSummary | null>(null);
  const [testQueries, setTestQueries] = useState([
    "Qual é a altura máxima da ZOT 07?",
    "Quais ZOTs contemplam o bairro Boa Vista?",
    "Quantos bairros tem Porto Alegre?",
    "O que pode ser construído no bairro Três Figueiras?"
  ]);
  const [model, setModel] = useState("anthropic/claude-opus-4-1-20250805");
  const [alertThreshold, setAlertThreshold] = useState(15);

  const runCrossValidation = async () => {
    setIsRunning(true);
    setResults([]);
    setSummary(null);

    try {
      console.log('Starting cross-validation between /chat and /admin/quality interfaces...');
      
      // Pre-validation checks
      if (!testQueries.length || testQueries.some(q => !q.trim())) {
        throw new Error('Please provide valid test queries');
      }
      
      if (!model.trim()) {
        throw new Error('Please specify a model');
      }
      
      toast.info('Executando validação cruzada... Isso pode levar alguns minutos.');
      
      const { data, error } = await supabase.functions.invoke('cross-validation-v2', {
        body: {
          testQueries: testQueries.filter(q => q.trim()),
          model,
          alertThreshold,
          source: 'admin-panel'
        }
      });

      if (error) {
        console.error('Supabase function error:', error);
        throw new Error(`Function call failed: ${error.message || error.details || 'Unknown error'}`);
      }

      if (!data) {
        throw new Error('No data received from validation function');
      }

      if (data.success) {
        setResults(data.results || []);
        setSummary(data.summary);
        
        const { summary } = data;
        if (summary?.alertTriggered) {
          toast.warning(
            `Encontradas ${summary.divergentQueries} discrepâncias e ${summary.errorQueries} erros entre interfaces!`,
            { description: `Divergência média: ${summary.averageDivergence}%` }
          );
        } else {
          toast.success(
            'Interfaces estão consistentes!',
            { description: `${summary?.totalQueries || 0} queries testadas com sucesso` }
          );
        }
      } else {
        throw new Error(data.error || 'Validation failed with unknown error');
      }

    } catch (error) {
      console.error('Cross-validation error:', error);
      const errorMessage = error.message || 'Erro desconhecido na validação cruzada';
      toast.error(`Erro na validação cruzada: ${errorMessage}`);
      
      // Provide helpful troubleshooting info
      if (errorMessage.includes('Failed to send a request')) {
        toast.error('A função cross-validation-v2 pode não estar implantada. Verifique os logs do Edge Functions.');
      }
    } finally {
      setIsRunning(false);
    }
  };

  const addQuery = () => {
    setTestQueries([...testQueries, ""]);
  };

  const updateQuery = (index: number, value: string) => {
    const updated = [...testQueries];
    updated[index] = value;
    setTestQueries(updated);
  };

  const removeQuery = (index: number) => {
    setTestQueries(testQueries.filter((_, i) => i !== index));
  };

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'CONSISTENT':
        return <CheckCircle className="h-4 w-4 text-green-500" />;
      case 'DIVERGENT':
        return <AlertTriangle className="h-4 w-4 text-yellow-500" />;
      case 'ERROR':
        return <XCircle className="h-4 w-4 text-red-500" />;
      default:
        return <Clock className="h-4 w-4 text-gray-500" />;
    }
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'CONSISTENT':
        return 'bg-green-100 text-green-800';
      case 'DIVERGENT':
        return 'bg-yellow-100 text-yellow-800';
      case 'ERROR':
        return 'bg-red-100 text-red-800';
      default:
        return 'bg-gray-100 text-gray-800';
    }
  };

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <AlertTriangle className="h-5 w-5" />
            Validação Cruzada: Interface Consistência
          </CardTitle>
          <p className="text-sm text-muted-foreground">
            Verifica consistência entre chamadas agentic-rag com parâmetros idênticos
          </p>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <Label htmlFor="model">Modelo</Label>
              <Input
                id="model"
                value={model}
                onChange={(e) => setModel(e.target.value)}
                placeholder="anthropic/claude-opus-4-1-20250805"
              />
            </div>
            <div>
              <Label htmlFor="threshold">Limiar de Alerta (%)</Label>
              <Input
                id="threshold"
                type="number"
                value={alertThreshold}
                onChange={(e) => setAlertThreshold(Number(e.target.value))}
                placeholder="15"
              />
            </div>
          </div>

          <div>
            <Label>Queries de Teste</Label>
            <div className="space-y-2 mt-2">
              {testQueries.map((query, index) => (
                <div key={index} className="flex gap-2">
                  <Input
                    value={query}
                    onChange={(e) => updateQuery(index, e.target.value)}
                    placeholder="Digite uma query de teste..."
                    className="flex-1"
                  />
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => removeQuery(index)}
                    disabled={testQueries.length <= 1}
                  >
                    Remover
                  </Button>
                </div>
              ))}
              <Button variant="outline" onClick={addQuery} className="w-full">
                Adicionar Query
              </Button>
            </div>
          </div>

          <Button 
            onClick={runCrossValidation} 
            disabled={isRunning || testQueries.some(q => !q.trim())}
            className="w-full"
          >
            {isRunning ? 'Executando Validação...' : 'Executar Validação Cruzada'}
          </Button>
        </CardContent>
      </Card>

      {summary && (
        <Card>
          <CardHeader>
            <CardTitle>Resumo da Validação</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
              <div className="text-center">
                <div className="text-2xl font-bold text-green-600">{summary.consistentQueries}</div>
                <div className="text-sm text-muted-foreground">Consistentes</div>
              </div>
              <div className="text-center">
                <div className="text-2xl font-bold text-yellow-600">{summary.divergentQueries}</div>
                <div className="text-sm text-muted-foreground">Divergentes</div>
              </div>
              <div className="text-center">
                <div className="text-2xl font-bold text-red-600">{summary.errorQueries}</div>
                <div className="text-sm text-muted-foreground">Com Erro</div>
              </div>
              <div className="text-center">
                <div className="text-2xl font-bold">{summary.averageDivergence.toFixed(1)}%</div>
                <div className="text-sm text-muted-foreground">Divergência Média</div>
              </div>
            </div>
            
            <div className="mt-4 grid grid-cols-1 md:grid-cols-2 gap-4 text-sm">
              <div>
                <strong>Tempo Médio 1ª chamada:</strong> {summary.avgChatTime?.toFixed(0)}ms
              </div>
              <div>
                <strong>Tempo Médio 2ª chamada:</strong> {summary.avgAdminTime?.toFixed(0)}ms
              </div>
            </div>
          </CardContent>
        </Card>
      )}

      {results.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle>Resultados Detalhados</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              {results.map((result, index) => (
                <div key={index} className="border rounded-lg p-4 space-y-3">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      {getStatusIcon(result.status)}
                      <strong className="text-sm">{result.query}</strong>
                    </div>
                    <div className="flex items-center gap-2">
                      <Badge className={getStatusColor(result.status)}>
                        {result.status}
                      </Badge>
                      <Badge variant="outline">
                        {result.divergenceScore.toFixed(1)}% divergência
                      </Badge>
                    </div>
                  </div>
                  
                  <div className="text-xs text-muted-foreground">
                    {result.details}
                  </div>
                  
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-xs">
                    <div className="border rounded p-2">
                      <div className="font-medium text-blue-600 mb-1">Primeira Chamada</div>
                      <div>Resposta: {result.chatResponse?.response || 'N/A'}</div>
                      <div>Confiança: {(result.chatResponse?.confidence * 100)?.toFixed(1)}%</div>
                      <div>Tempo: {result.timing.chatTime}ms</div>
                    </div>
                    <div className="border rounded p-2">
                      <div className="font-medium text-purple-600 mb-1">Segunda Chamada</div>
                      <div>Resposta: {result.adminResponse?.response || 'N/A'}</div>
                      <div>Confiança: {(result.adminResponse?.confidence * 100)?.toFixed(1)}%</div>
                      <div>Tempo: {result.timing.adminTime}ms</div>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
}