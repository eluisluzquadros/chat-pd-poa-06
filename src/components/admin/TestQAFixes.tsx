import React from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { toast } from 'sonner';
import { PlayCircle, TestTubes, CheckCircle, XCircle, Clock, StopCircle } from 'lucide-react';
import { SmartQAValidator } from '@/lib/smartQAValidator';
import { supabase } from '@/integrations/supabase/client';
import { QAHistoryCleanup } from './QAHistoryCleanup';

interface TestProgress {
  current: number;
  total: number;
  status: string;
}

export function TestQAFixes() {
  const [isRunning, setIsRunning] = React.useState(false);
  const [results, setResults] = React.useState<any>(null);
  const [progress, setProgress] = React.useState<TestProgress | null>(null);
  const [currentRunId, setCurrentRunId] = React.useState<string | null>(null);

  const checkRAGHealth = async (): Promise<boolean> => {
    try {
      toast.info("Verificando conectividade do sistema RAG...");
      const { data, error } = await supabase.functions.invoke('agentic-rag', {
        body: {
          message: 'health check',
          userRole: 'user',
          sessionId: `health-check-${Date.now()}`,
          userId: 'health-checker',
          model: 'agentic-rag'
        }
      });

      if (error) {
        console.error('RAG health check failed:', error);
        toast.error('Sistema RAG não está respondendo. Verifique os logs da Edge Function.');
        return false;
      }

      toast.success("Sistema RAG está funcionando!");
      return true;
    } catch (error) {
      console.error('RAG health check error:', error);
      toast.error('Erro ao verificar sistema RAG');
      return false;
    }
  };

  const pollRunStatus = async (runId: string) => {
    const maxPollingTime = 5 * 60 * 1000; // 5 minutes
    const pollInterval = 3000; // 3 seconds
    const startTime = Date.now();

    const poll = async (): Promise<void> => {
      try {
        const { data: run } = await supabase
          .from('qa_validation_runs')
          .select('status, total_tests, passed_tests, error_message, last_heartbeat')
          .eq('id', runId)
          .single();

        if (!run) {
          throw new Error('Run não encontrado');
        }

        // Update heartbeat
        await supabase
          .from('qa_validation_runs')
          .update({ last_heartbeat: new Date().toISOString() })
          .eq('id', runId);

        // Count completed tests
        const { count } = await supabase
          .from('qa_validation_results')
          .select('*', { count: 'exact', head: true })
          .eq('validation_run_id', runId);

        const completed = count || 0;
        
        setProgress({
          current: completed,
          total: run.total_tests,
          status: run.status
        });

        if (run.status !== 'running') {
          // Run completed
          const { data: finalData } = await supabase
            .from('qa_validation_runs')
            .select(`
              *,
              qa_validation_results (
                test_case_id,
                actual_answer,
                is_correct,
                accuracy_score,
                response_time_ms,
                error_type
              )
            `)
            .eq('id', runId)
            .single();

          setResults(finalData);
          setIsRunning(false);
          setProgress(null);
          setCurrentRunId(null);
          
          if (run.status === 'completed') {
            toast.success(`Teste Concluído! Acurácia: ${(finalData?.overall_accuracy * 100 || 0).toFixed(1)}% | Tempo médio: ${finalData?.avg_response_time_ms || 0}ms`);
          } else if (run.status === 'failed') {
            toast.error(`Teste Falhou: ${run.error_message || 'Erro desconhecido'}`);
          }
          return;
        }

        // Check timeout
        if (Date.now() - startTime > maxPollingTime) {
          await supabase
            .from('qa_validation_runs')
            .update({ 
              status: 'failed', 
              error_message: 'Timeout - execução cancelada após 5 minutos',
              completed_at: new Date().toISOString()
            })
            .eq('id', runId);
          
          throw new Error('Timeout: teste demorou mais de 5 minutos');
        }

        // Schedule next poll
        setTimeout(poll, pollInterval);
        
      } catch (error) {
        console.error('Polling error:', error);
        setIsRunning(false);
        setProgress(null);
        setCurrentRunId(null);
        toast.error(`Erro durante execução: ${error.message}`);
      }
    };

    // Start polling
    poll();
  };

  const cancelTest = async () => {
    if (!currentRunId) return;

    try {
      await supabase
        .from('qa_validation_runs')
        .update({ 
          status: 'failed', 
          error_message: 'Cancelado pelo usuário',
          completed_at: new Date().toISOString()
        })
        .eq('id', currentRunId);

      setIsRunning(false);
      setProgress(null);
      setCurrentRunId(null);
      toast.info('Teste cancelado');
    } catch (error) {
      console.error('Cancel error:', error);
      toast.error('Erro ao cancelar teste');
    }
  };

  const runQuickTest = async () => {
    setIsRunning(true);
    setResults(null);
    setProgress(null);
    
    try {
      // Health check first
      const isHealthy = await checkRAGHealth();
      if (!isHealthy) {
        setIsRunning(false);
        return;
      }

      toast.success("Iniciando Teste Rápido - 5 casos de teste com sistema aprimorado...");

      const validator = SmartQAValidator.getInstance();
      const runId = await validator.runValidation({
        mode: 'random',
        randomCount: 5,
        model: 'agentic-rag'
      });

      setCurrentRunId(runId);
      console.log('[TestQAFixes] Started validation with run ID:', runId);
      
      // Start polling for progress
      pollRunStatus(runId);

    } catch (error) {
      console.error('Test error:', error);
      toast.error(`Erro no Teste: ${error.message}`);
      setIsRunning(false);
      setProgress(null);
      setCurrentRunId(null);
    }
  };

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <TestTubes className="h-5 w-5" />
            Testes de Correções QA
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="text-sm text-muted-foreground">
            <p>Sistema de validação aprimorado com:</p>
            <ul className="list-disc list-inside mt-2 space-y-1">
              <li>Filtragem automática de templates promocionais</li>
              <li>Avaliação semântica por categoria</li>
              <li>Thresholds adaptativos por dificuldade</li>
              <li>Normalização de texto melhorada</li>
              <li>Keywords extraídas automaticamente dos casos de teste</li>
              <li>Health check do sistema RAG</li>
              <li>Polling inteligente com timeout de 5 minutos</li>
              <li>Cancelamento manual de testes</li>
            </ul>
          </div>

          <div className="space-y-3">
            <Button 
              onClick={runQuickTest} 
              disabled={isRunning}
              className="w-full"
            >
              {isRunning ? (
                <>
                  <Clock className="h-4 w-4 mr-2 animate-spin" />
                  Executando Teste...
                </>
              ) : (
                <>
                  <PlayCircle className="h-4 w-4 mr-2" />
                  Executar Teste Rápido (5 casos)
                </>
              )}
            </Button>

            {isRunning && currentRunId && (
              <Button 
                onClick={cancelTest} 
                variant="outline"
                className="w-full"
              >
                <StopCircle className="h-4 w-4 mr-2" />
                Cancelar Teste
              </Button>
            )}
          </div>

          {progress && (
            <Card className="p-4 bg-muted/50">
              <div className="space-y-2">
                <div className="flex justify-between text-sm">
                  <span>Progresso:</span>
                  <span>{progress.current}/{progress.total} testes</span>
                </div>
                <div className="w-full bg-secondary rounded-full h-2">
                  <div 
                    className="bg-primary h-2 rounded-full transition-all duration-300" 
                    style={{ width: `${(progress.current / progress.total) * 100}%` }}
                  />
                </div>
                <div className="text-xs text-muted-foreground text-center">
                  Status: {progress.status === 'running' ? 'Executando' : progress.status}
                </div>
              </div>
            </Card>
          )}

          {results && (
            <div className="mt-6 space-y-4">
              <div className="grid grid-cols-3 gap-4">
                <Card className="p-4">
                  <div className="text-center">
                    <div className="text-2xl font-bold text-green-600">
                      {results.passed_tests}/{results.total_tests}
                    </div>
                    <div className="text-sm text-muted-foreground">Casos Aprovados</div>
                  </div>
                </Card>
                
                <Card className="p-4">
                  <div className="text-center">
                    <div className="text-2xl font-bold text-blue-600">
                      {(results.overall_accuracy * 100).toFixed(1)}%
                    </div>
                    <div className="text-sm text-muted-foreground">Acurácia</div>
                  </div>
                </Card>
                
                <Card className="p-4">
                  <div className="text-center">
                    <div className="text-2xl font-bold text-purple-600">
                      {results.avg_response_time_ms}ms
                    </div>
                    <div className="text-sm text-muted-foreground">Tempo Médio</div>
                  </div>
                </Card>
              </div>

              {results.qa_validation_results && (
                <Card className="p-4">
                  <h4 className="font-medium mb-3">Resultados Detalhados</h4>
                  <div className="space-y-2">
                    {results.qa_validation_results.map((result: any, idx: number) => (
                      <div key={idx} className="flex items-center justify-between p-2 rounded border">
                        <div className="flex items-center gap-2">
                          {result.is_correct ? (
                            <CheckCircle className="h-4 w-4 text-green-500" />
                          ) : (
                            <XCircle className="h-4 w-4 text-red-500" />
                          )}
                          <span className="text-sm">Caso {result.test_case_id}</span>
                          {result.error_type && (
                            <span className="text-xs bg-red-100 text-red-700 px-2 py-1 rounded">
                              {result.error_type}
                            </span>
                          )}
                        </div>
                        <div className="text-sm text-muted-foreground">
                          {(result.accuracy_score * 100).toFixed(1)}% | {result.response_time_ms}ms
                        </div>
                      </div>
                    ))}
                  </div>
                </Card>
              )}
            </div>
          )}
        </CardContent>
      </Card>

      {/* History Cleanup Section */}
      <QAHistoryCleanup />
    </div>
  );
}