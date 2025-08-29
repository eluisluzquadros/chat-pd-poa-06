import React, { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { AlertTriangle, CheckCircle, RefreshCw, XCircle } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';

interface CrossValidationResult {
  query: string;
  chatResponse: any;
  qaResponse: any;
  divergenceScore: number;
  status: 'CONSISTENT' | 'DIVERGENT' | 'ERROR';
  details: string;
}

interface ValidationSummary {
  totalQueries: number;
  consistentQueries: number;
  divergentQueries: number;
  errorQueries: number;
  averageDivergence: number;
  alertTriggered: boolean;
  model: string;
  timestamp: string;
}

export function CrossValidationPanel() {
  const { toast } = useToast();
  const [isRunning, setIsRunning] = useState(false);
  const [lastResults, setLastResults] = useState<{
    summary: ValidationSummary;
    results: CrossValidationResult[];
    recommendations: string[];
  } | null>(null);

  const runCrossValidation = async () => {
    setIsRunning(true);
    try {
      const { data, error } = await supabase.functions.invoke('cross-validation', {
        body: {
          testQueries: [
            "Qual é a altura máxima da ZOT 07?",
            "Quais ZOTs contemplam o bairro Boa Vista?",
            "Quantos bairros tem Porto Alegre?",
            "O que pode ser construído no bairro Três Figueiras?",
            "Como o plano diretor aborda mobilidade urbana?"
          ],
          model: "anthropic/claude-opus-4-1-20250805",
          alertThreshold: 15
        }
      });

      if (error) throw error;

      setLastResults(data);
      
      if (data.summary.alertTriggered) {
        toast({
          title: "⚠️ Divergências Detectadas",
          description: `${data.summary.divergentQueries} consultas apresentaram divergências acima do limite`,
          variant: "destructive"
        });
      } else {
        toast({
          title: "✅ Sistemas Consistentes",
          description: "Nenhuma divergência significativa detectada",
        });
      }

    } catch (error) {
      console.error('Cross-validation error:', error);
      toast({
        title: "Erro na Validação Cruzada",
        description: error.message,
        variant: "destructive"
      });
    } finally {
      setIsRunning(false);
    }
  };

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'CONSISTENT':
        return <CheckCircle className="h-4 w-4 text-green-600" />;
      case 'DIVERGENT':
        return <AlertTriangle className="h-4 w-4 text-yellow-600" />;
      case 'ERROR':
        return <XCircle className="h-4 w-4 text-red-600" />;
      default:
        return null;
    }
  };

  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'CONSISTENT':
        return <Badge variant="default" className="bg-green-100 text-green-800">Consistente</Badge>;
      case 'DIVERGENT':
        return <Badge variant="destructive">Divergente</Badge>;
      case 'ERROR':
        return <Badge variant="outline" className="border-red-500 text-red-700">Erro</Badge>;
      default:
        return null;
    }
  };

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <div className="flex justify-between items-center">
            <div>
              <CardTitle className="text-xl">Validação Cruzada de Sistemas</CardTitle>
              <p className="text-sm text-muted-foreground mt-1">
                Detecta divergências entre /chat, /quality e /benchmark
              </p>
            </div>
            <Button 
              onClick={runCrossValidation} 
              disabled={isRunning}
              size="sm"
            >
              {isRunning ? (
                <>
                  <RefreshCw className="h-4 w-4 mr-2 animate-spin" />
                  Executando...
                </>
              ) : (
                <>
                  <RefreshCw className="h-4 w-4 mr-2" />
                  Executar Validação
                </>
              )}
            </Button>
          </div>
        </CardHeader>
      </Card>

      {lastResults && (
        <>
          {/* Summary Metrics */}
          <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
            <Card>
              <CardContent className="p-4">
                <div className="text-2xl font-bold text-green-600">
                  {lastResults.summary.consistentQueries}
                </div>
                <p className="text-sm text-muted-foreground">Consultas Consistentes</p>
              </CardContent>
            </Card>
            
            <Card>
              <CardContent className="p-4">
                <div className="text-2xl font-bold text-yellow-600">
                  {lastResults.summary.divergentQueries}
                </div>
                <p className="text-sm text-muted-foreground">Divergências Detectadas</p>
              </CardContent>
            </Card>
            
            <Card>
              <CardContent className="p-4">
                <div className="text-2xl font-bold text-red-600">
                  {lastResults.summary.errorQueries}
                </div>
                <p className="text-sm text-muted-foreground">Erros</p>
              </CardContent>
            </Card>
            
            <Card>
              <CardContent className="p-4">
                <div className="text-2xl font-bold">
                  {lastResults.summary.averageDivergence}%
                </div>
                <p className="text-sm text-muted-foreground">Divergência Média</p>
              </CardContent>
            </Card>
          </div>

          {/* Detailed Results */}
          <Card>
            <CardHeader>
              <CardTitle>Resultados Detalhados</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                {lastResults.results.map((result, index) => (
                  <div key={index} className="border rounded-lg p-4">
                    <div className="flex items-center justify-between mb-2">
                      <div className="flex items-center gap-2">
                        {getStatusIcon(result.status)}
                        <span className="font-medium text-sm">{result.query}</span>
                      </div>
                      <div className="flex items-center gap-2">
                        {getStatusBadge(result.status)}
                        <span className="text-sm text-muted-foreground">
                          {result.divergenceScore.toFixed(1)}%
                        </span>
                      </div>
                    </div>
                    
                    <p className="text-sm text-muted-foreground">{result.details}</p>
                    
                    {result.status === 'DIVERGENT' && (
                      <div className="mt-3 grid grid-cols-1 md:grid-cols-2 gap-3 text-xs">
                        <div className="bg-blue-50 p-3 rounded">
                          <div className="font-medium text-blue-800 mb-1">Chat Response</div>
                          <div className="text-blue-700">
                            Confiança: {result.chatResponse?.confidence || 'N/A'}<br/>
                            Tempo: {result.chatResponse?.executionTime || 'N/A'}ms
                          </div>
                        </div>
                        
                        <div className="bg-purple-50 p-3 rounded">
                          <div className="font-medium text-purple-800 mb-1">QA Response</div>
                          <div className="text-purple-700">
                            Acurácia: {result.qaResponse?.accuracy ? (result.qaResponse.accuracy * 100).toFixed(1) + '%' : 'N/A'}<br/>
                            Tempo: {result.qaResponse?.executionTime || 'N/A'}ms
                          </div>
                        </div>
                      </div>
                    )}
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>

          {/* Recommendations */}
          {lastResults.recommendations.length > 0 && (
            <Card>
              <CardHeader>
                <CardTitle>Recomendações</CardTitle>
              </CardHeader>
              <CardContent>
                <ul className="space-y-2">
                  {lastResults.recommendations.map((recommendation, index) => (
                    <li key={index} className="flex items-start gap-2">
                      <div className="w-2 h-2 bg-blue-500 rounded-full mt-2 flex-shrink-0" />
                      <span className="text-sm">{recommendation}</span>
                    </li>
                  ))}
                </ul>
              </CardContent>
            </Card>
          )}

          {/* Metadata */}
          <div className="text-xs text-muted-foreground">
            Última execução: {new Date(lastResults.summary.timestamp).toLocaleString('pt-BR')} | 
            Modelo: {lastResults.summary.model}
          </div>
        </>
      )}
    </div>
  );
}