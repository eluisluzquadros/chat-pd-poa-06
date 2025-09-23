import React, { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { AlertTriangle, Trash2, RefreshCw, CheckCircle } from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';
import { useQueryClient } from '@tanstack/react-query';

interface CleanupStats {
  validationRuns: number;
  validationResults: number;
  tokenUsage: number;
  qualityMonitoring: number;
  qualityAlerts: number;
  totalRecordsDeleted: number;
  errors: string[];
}

export function QAHistoryCleanup() {
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [isClearing, setIsClearing] = useState(false);
  const [confirmStep, setConfirmStep] = useState(0);
  const [lastCleanup, setLastCleanup] = useState<{
    stats: CleanupStats;
    timestamp: string;
    recommendations: string[];
  } | null>(null);

  const handleCleanup = async () => {
    if (confirmStep !== 2) {
      setConfirmStep(confirmStep + 1);
      return;
    }

    setIsClearing(true);
    try {
      const { data, error } = await supabase.functions.invoke('qa-cleanup-runs', {
        body: {
          confirmCleanup: true,
          preserveDays: 0 // Clean everything for fresh baseline
        }
      });

      if (error) throw error;

      setLastCleanup(data);
      setConfirmStep(0);
      
      // Invalidate all QA-related queries to refresh the UI
      await queryClient.invalidateQueries({ 
        predicate: (query) => {
          const key = query.queryKey[0] as string;
          return key?.includes('qa') || key?.includes('validation') || key?.includes('test');
        }
      });

      if (data.success) {
        toast({
          title: "🧹 Histórico QA Limpo",
          description: `${data.totalRecordsDeleted} registros removidos. Nova baseline estabelecida.`,
        });
      } else {
        toast({
          title: "⚠️ Limpeza Parcial",
          description: "Limpeza concluída com alguns erros. Verifique os detalhes.",
          variant: "destructive"
        });
      }

    } catch (error) {
      console.error('Cleanup error:', error);
      toast({
        title: "Erro na Limpeza",
        description: error.message,
        variant: "destructive"
      });
    } finally {
      setIsClearing(false);
    }
  };

  const resetConfirmation = () => {
    setConfirmStep(0);
  };

  const getConfirmButtonText = () => {
    switch (confirmStep) {
      case 0:
        return "Limpar Histórico QA";
      case 1:
        return "⚠️ Confirmar Limpeza";
      case 2:
        return "🗑️ APAGAR TUDO";
      default:
        return "Limpar Histórico";
    }
  };

  const getConfirmButtonVariant = () => {
    switch (confirmStep) {
      case 0:
        return "outline";
      case 1:
        return "secondary";
      case 2:
        return "destructive";
      default:
        return "outline";
    }
  };

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <div className="flex items-center gap-2">
            <Trash2 className="h-5 w-5 text-orange-600" />
            <CardTitle className="text-xl">Limpeza de Histórico QA</CardTitle>
          </div>
          <p className="text-sm text-muted-foreground">
            Remove todas as execuções antigas para estabelecer nova baseline com melhorias LLM
          </p>
        </CardHeader>
        <CardContent className="space-y-4">
          
          {/* Warning Alert */}
          <Alert>
            <AlertTriangle className="h-4 w-4" />
            <AlertDescription>
              <strong>Esta ação remove TODOS os dados históricos:</strong>
              <ul className="list-disc list-inside mt-2 text-sm">
                <li>Execuções de validação QA</li>
                <li>Resultados de testes</li>
                <li>Estatísticas de tokens</li>
                <li>Métricas de qualidade</li>
                <li>Alertas de qualidade</li>
              </ul>
            </AlertDescription>
          </Alert>

          {/* Benefits */}
          <div className="bg-green-50 border border-green-200 rounded-lg p-4">
            <h4 className="font-medium text-green-800 mb-2">Benefícios da Nova Baseline:</h4>
            <ul className="text-sm text-green-700 space-y-1">
              <li>✅ Avaliação LLM semântica (GPT-4o-mini)</li>
              <li>✅ Thresholds otimizados por categoria</li>
              <li>✅ Cross-validation entre sistemas</li>
              <li>✅ Métricas mais precisas e realistas</li>
            </ul>
          </div>

          {/* Action Buttons */}
          <div className="flex items-center gap-3">
            <Button
              onClick={handleCleanup}
              disabled={isClearing}
              variant={getConfirmButtonVariant()}
              size="sm"
            >
              {isClearing ? (
                <>
                  <RefreshCw className="h-4 w-4 mr-2 animate-spin" />
                  Limpando...
                </>
              ) : (
                <>
                  <Trash2 className="h-4 w-4 mr-2" />
                  {getConfirmButtonText()}
                </>
              )}
            </Button>

            {confirmStep > 0 && (
              <Button 
                onClick={resetConfirmation}
                variant="outline" 
                size="sm"
              >
                Cancelar
              </Button>
            )}

            {confirmStep > 0 && (
              <Badge variant="secondary">
                Passo {confirmStep}/2
              </Badge>
            )}
          </div>

          {confirmStep === 1 && (
            <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-3">
              <p className="text-sm text-yellow-800">
                <strong>Confirmação necessária:</strong> Esta ação removerá todo o histórico QA. 
                Clique novamente para confirmar.
              </p>
            </div>
          )}

          {confirmStep === 2 && (
            <div className="bg-red-50 border border-red-200 rounded-lg p-3">
              <p className="text-sm text-red-800">
                <strong>ÚLTIMA CONFIRMAÇÃO:</strong> Todos os dados QA históricos serão 
                permanentemente removidos. Clique para executar.
              </p>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Last Cleanup Results */}
      {lastCleanup && (
        <Card>
          <CardHeader>
            <div className="flex items-center gap-2">
              <CheckCircle className="h-5 w-5 text-green-600" />
              <CardTitle>Resultado da Limpeza</CardTitle>
            </div>
          </CardHeader>
          <CardContent className="space-y-4">
            
            {/* Stats Grid */}
            <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
              <div className="text-center p-3 bg-blue-50 rounded-lg">
                <div className="text-2xl font-bold text-blue-600">{lastCleanup.stats.validationRuns}</div>
                <div className="text-xs text-blue-700">Execuções</div>
              </div>
              <div className="text-center p-3 bg-purple-50 rounded-lg">
                <div className="text-2xl font-bold text-purple-600">{lastCleanup.stats.validationResults}</div>
                <div className="text-xs text-purple-700">Resultados</div>
              </div>
              <div className="text-center p-3 bg-orange-50 rounded-lg">
                <div className="text-2xl font-bold text-orange-600">{lastCleanup.stats.tokenUsage}</div>
                <div className="text-xs text-orange-700">Tokens</div>
              </div>
              <div className="text-center p-3 bg-green-50 rounded-lg">
                <div className="text-2xl font-bold text-green-600">{lastCleanup.stats.qualityMonitoring}</div>
                <div className="text-xs text-green-700">Monitoring</div>
              </div>
              <div className="text-center p-3 bg-red-50 rounded-lg">
                <div className="text-2xl font-bold text-red-600">{lastCleanup.stats.qualityAlerts}</div>
                <div className="text-xs text-red-700">Alertas</div>
              </div>
              <div className="text-center p-3 bg-gray-50 rounded-lg">
                <div className="text-2xl font-bold text-gray-600">{lastCleanup.stats.totalRecordsDeleted}</div>
                <div className="text-xs text-gray-700">Total</div>
              </div>
            </div>

            {/* Recommendations */}
            <div>
              <h4 className="font-medium mb-2">Próximos Passos:</h4>
              <ul className="space-y-1">
                {lastCleanup.recommendations.map((rec, index) => (
                  <li key={index} className="flex items-start gap-2 text-sm">
                    <div className="w-2 h-2 bg-blue-500 rounded-full mt-2 flex-shrink-0" />
                    {rec}
                  </li>
                ))}
              </ul>
            </div>

            {/* Errors */}
            {lastCleanup.stats.errors.length > 0 && (
              <div className="bg-red-50 border border-red-200 rounded-lg p-3">
                <h4 className="font-medium text-red-800 mb-2">Erros Encontrados:</h4>
                <ul className="text-sm text-red-700 space-y-1">
                  {lastCleanup.stats.errors.map((error, index) => (
                    <li key={index}>• {error}</li>
                  ))}
                </ul>
              </div>
            )}

            <div className="text-xs text-muted-foreground">
              Executado em: {new Date(lastCleanup.timestamp).toLocaleString('pt-BR')}
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
}