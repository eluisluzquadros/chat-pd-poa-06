import React from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { toast } from 'sonner';
import { PlayCircle, TestTubes, CheckCircle, XCircle, Clock } from 'lucide-react';
import { SmartQAValidator } from '@/lib/smartQAValidator';
import { supabase } from '@/integrations/supabase/client';

export function TestQAFixes() {
  const [isRunning, setIsRunning] = React.useState(false);
  const [results, setResults] = React.useState<any>(null);

  const runQuickTest = async () => {
    setIsRunning(true);
    setResults(null);
    
    try {
      toast.success("Iniciando Teste Rápido - Executando 5 casos de teste com o sistema aprimorado...");

      const validator = SmartQAValidator.getInstance();
      const runId = await validator.runValidation({
        mode: 'random',
        randomCount: 5,
        model: 'agentic-rag'
      });

      // Wait a bit and then fetch results
      setTimeout(async () => {
        try {
          const { data } = await supabase
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

          if (data) {
            setResults(data);
            toast.success(`Teste Concluído - Acurácia: ${(data.overall_accuracy * 100).toFixed(1)}% | Tempo médio: ${data.avg_response_time_ms}ms`);
          }
        } catch (error) {
          console.error('Error fetching results:', error);
          toast.error('Erro ao buscar resultados do teste');
        } finally {
          setIsRunning(false);
        }
      }, 30000); // Wait 30 seconds for completion

    } catch (error) {
      console.error('Test error:', error);
      toast.error(`Erro no Teste: ${error.message}`);
      setIsRunning(false);
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
            </ul>
          </div>

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
    </div>
  );
}