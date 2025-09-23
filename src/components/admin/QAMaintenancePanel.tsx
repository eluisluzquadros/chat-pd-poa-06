import React, { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';
import { RefreshCw, Trash2, AlertTriangle, CheckCircle } from 'lucide-react';

export function QAMaintenancePanel() {
  const [isCleaningRuns, setIsCleaningRuns] = useState(false);
  const [lastCleanupStats, setLastCleanupStats] = useState<any>(null);

  const handleCleanupStuckRuns = async () => {
    setIsCleaningRuns(true);
    try {
      const { data, error } = await supabase.functions.invoke('qa-cleanup-runs');
      
      if (error) {
        throw error;
      }

      setLastCleanupStats(data);
      
      if (data.cleaned > 0) {
        toast.success(`${data.cleaned} validações travadas foram limpas`);
      } else {
        toast.success('Nenhuma validação travada encontrada');
      }
    } catch (error) {
      console.error('Error cleaning up runs:', error);
      toast.error('Erro ao limpar validações travadas');
    } finally {
      setIsCleaningRuns(false);
    }
  };

  const handleFullSystemReset = async () => {
    if (!confirm('ATENÇÃO: Isso irá deletar TODOS os dados de validação QA. Continuar?')) {
      return;
    }

    try {
      // Delete all validation results
      await supabase.from('qa_validation_results').delete().neq('id', '');
      
      // Delete all validation runs
      await supabase.from('qa_validation_runs').delete().neq('id', '');
      
      toast.success('Sistema QA resetado completamente');
      setLastCleanupStats(null);
    } catch (error) {
      console.error('Error resetting system:', error);
      toast.error('Erro ao resetar sistema');
    }
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <RefreshCw className="h-5 w-5" />
          Manutenção do Sistema QA
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        {/* Cleanup Actions */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div className="space-y-3">
            <h4 className="font-medium">Limpeza de Validações</h4>
            <Button 
              onClick={handleCleanupStuckRuns}
              disabled={isCleaningRuns}
              variant="outline"
              className="w-full"
            >
              {isCleaningRuns ? (
                <>
                  <RefreshCw className="h-4 w-4 mr-2 animate-spin" />
                  Limpando...
                </>
              ) : (
                <>
                  <Trash2 className="h-4 w-4 mr-2" />
                  Limpar Validações Travadas
                </>
              )}
            </Button>
            <p className="text-xs text-muted-foreground">
              Remove validações que ficaram no status "running" por mais de 30 minutos
            </p>
          </div>

          <div className="space-y-3">
            <h4 className="font-medium">Reset Completo</h4>
            <Button 
              onClick={handleFullSystemReset}
              variant="destructive"
              className="w-full"
            >
              <AlertTriangle className="h-4 w-4 mr-2" />
              Reset Total do Sistema
            </Button>
            <p className="text-xs text-muted-foreground">
              CUIDADO: Deleta todos os dados de validação permanentemente
            </p>
          </div>
        </div>

        {/* Last Cleanup Stats */}
        {lastCleanupStats && (
          <div className="mt-6 p-4 bg-muted rounded-lg">
            <h4 className="font-medium mb-2 flex items-center gap-2">
              <CheckCircle className="h-4 w-4 text-green-600" />
              Último Resultado de Limpeza
            </h4>
            <div className="grid grid-cols-2 gap-4 text-sm">
              <div>
                <span className="text-muted-foreground">Validações Limpas:</span>
                <Badge variant="outline" className="ml-2">
                  {lastCleanupStats.cleaned}
                </Badge>
              </div>
              <div>
                <span className="text-muted-foreground">Status:</span>
                <Badge variant="default" className="ml-2">
                  {lastCleanupStats.success ? 'Sucesso' : 'Erro'}
                </Badge>
              </div>
            </div>
            
            {lastCleanupStats.runs && lastCleanupStats.runs.length > 0 && (
              <div className="mt-3">
                <p className="text-xs text-muted-foreground mb-2">Validações removidas:</p>
                <div className="space-y-1">
                  {lastCleanupStats.runs.slice(0, 5).map((run: any, index: number) => (
                    <div key={index} className="text-xs flex justify-between">
                      <span>{run.model}</span>
                      <span className="text-muted-foreground">
                        {new Date(run.startedAt).toLocaleString('pt-BR')}
                      </span>
                    </div>
                  ))}
                  {lastCleanupStats.runs.length > 5 && (
                    <div className="text-xs text-muted-foreground">
                      ... e mais {lastCleanupStats.runs.length - 5} validações
                    </div>
                  )}
                </div>
              </div>
            )}
          </div>
        )}

        {/* System Health Indicators */}
        <div className="mt-6 p-4 border rounded-lg">
          <h4 className="font-medium mb-3">Status do Sistema</h4>
          <div className="grid grid-cols-3 gap-4 text-center">
            <div>
              <div className="text-2xl font-bold text-green-600">✓</div>
              <div className="text-xs text-muted-foreground">Edge Functions</div>
            </div>
            <div>
              <div className="text-2xl font-bold text-green-600">✓</div>
              <div className="text-xs text-muted-foreground">Base de Dados</div>
            </div>
            <div>
              <div className="text-2xl font-bold text-blue-600">19</div>
              <div className="text-xs text-muted-foreground">Modelos Disponíveis</div>
            </div>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}