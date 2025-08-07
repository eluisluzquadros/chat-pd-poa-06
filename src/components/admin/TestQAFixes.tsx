import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Loader2, Play, CheckCircle, XCircle, AlertTriangle } from 'lucide-react';
import { toast } from 'sonner';
import { supabase } from '@/integrations/supabase/client';

interface TestResults {
  cleanup?: any;
  testValidation?: any;
  currentStats?: any;
  totalIssues?: number;
  savedResults?: number;
}

export function TestQAFixes() {
  const [isLoading, setIsLoading] = useState(false);
  const [results, setResults] = useState<TestResults | null>(null);

  const runTest = async () => {
    setIsLoading(true);
    try {
      // Test with small validation run to verify fixes
      console.log('🧪 Testing QA fixes with small validation run...');
      
      const { data: testResult, error: testError } = await supabase.functions.invoke('qa-execute-validation-v2', {
        body: {
          mode: 'random',
          randomCount: 2,
          models: ['openai/gpt-4o-mini'],
          includeSQL: false,
          excludeSQL: false
        }
      });

      if (testError) {
        throw new Error(`Test validation failed: ${testError.message}`);
      }

      console.log('✅ Test validation completed:', testResult);

      // Verify results were saved
      let savedResultsCount = 0;
      if (testResult?.success && testResult.runs?.[0]?.runId) {
        const runId = testResult.runs[0].runId;
        
        // Wait for results to be saved
        await new Promise(resolve => setTimeout(resolve, 3000));
        
        const { data: savedResults } = await supabase
          .from('qa_validation_results')
          .select('*')
          .eq('validation_run_id', runId);

        savedResultsCount = savedResults?.length || 0;
        console.log(`📊 Found ${savedResultsCount} saved results for run ${runId}`);
      }

      // Get current system stats
      const { data: statsData } = await supabase
        .from('qa_validation_runs')
        .select('status');

      const stats = statsData?.reduce((acc, run) => {
        acc[run.status] = (acc[run.status] || 0) + 1;
        return acc;
      }, {} as Record<string, number>) || {};

      const testResults = {
        testValidation: testResult,
        currentStats: stats,
        totalIssues: 0,
        savedResults: savedResultsCount
      };

      setResults(testResults);

      if (testResult?.success && savedResultsCount > 0) {
        toast.success(`✅ Testes aprovados! ${savedResultsCount} resultados salvos corretamente`);
      } else if (testResult?.success && savedResultsCount === 0) {
        toast.error('⚠️ Validação executada mas resultados não foram salvos - problema persiste');
      } else {
        toast.error('❌ Teste falhou - correções precisam de ajustes');
      }

    } catch (error) {
      console.error('Test error:', error);
      toast.error(`Erro no teste: ${error.message}`);
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <Card className="w-full">
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <AlertTriangle className="h-5 w-5" />
          Teste das Correções QA
        </CardTitle>
        <CardDescription>
          Testa as correções implementadas no sistema de validação QA
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="flex items-center gap-2">
          <Button onClick={runTest} disabled={isLoading}>
            {isLoading ? (
              <>
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                Testando...
              </>
            ) : (
              <>
                <Play className="mr-2 h-4 w-4" />
                Executar Teste
              </>
            )}
          </Button>
        </div>

        {results && (
          <div className="space-y-4">
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
              <div className="p-3 border rounded">
                <div className="text-sm text-muted-foreground">Status Geral</div>
                <div className="flex items-center gap-2">
                  {results.testValidation?.success ? (
                    <>
                      <CheckCircle className="h-4 w-4 text-green-500" />
                      <span className="text-green-600 font-medium">Aprovado</span>
                    </>
                  ) : (
                    <>
                      <XCircle className="h-4 w-4 text-red-500" />
                      <span className="text-red-600 font-medium">Falhado</span>
                    </>
                  )}
                </div>
              </div>

              <div className="p-3 border rounded">
                <div className="text-sm text-muted-foreground">Resultados Salvos</div>
                <div className="flex items-center gap-2">
                  {(results.savedResults || 0) > 0 ? (
                    <>
                      <CheckCircle className="h-4 w-4 text-green-500" />
                      <span className="font-medium">{results.savedResults || 0}</span>
                    </>
                  ) : (
                    <>
                      <XCircle className="h-4 w-4 text-red-500" />
                      <span className="text-red-600 font-medium">0</span>
                    </>
                  )}
                </div>
              </div>

              <div className="p-3 border rounded">
                <div className="text-sm text-muted-foreground">Runs Completos</div>
                <div className="font-medium">
                  {results.currentStats?.completed || 0}
                </div>
              </div>

              <div className="p-3 border rounded">
                <div className="text-sm text-muted-foreground">Runs Falhados</div>
                <div className="font-medium text-red-600">
                  {results.currentStats?.failed || 0}
                </div>
              </div>
            </div>

            {results.testValidation && (
              <div className="p-4 border rounded">
                <h4 className="font-medium mb-2">Detalhes do Teste</h4>
                <div className="space-y-2 text-sm">
                  <div>
                    <span className="text-muted-foreground">Modelo:</span>{' '}
                    {results.testValidation.runs?.[0]?.model || 'N/A'}
                  </div>
                  <div>
                    <span className="text-muted-foreground">Testes Executados:</span>{' '}
                    {results.testValidation.runs?.[0]?.totalTests || 0}
                  </div>
                  <div>
                    <span className="text-muted-foreground">Testes Aprovados:</span>{' '}
                    {results.testValidation.runs?.[0]?.passedTests || 0}
                  </div>
                  <div>
                    <span className="text-muted-foreground">Acurácia:</span>{' '}
                    {((results.testValidation.runs?.[0]?.overallAccuracy || 0) * 100).toFixed(1)}%
                  </div>
                  <div>
                    <span className="text-muted-foreground">Tempo Médio:</span>{' '}
                    {results.testValidation.runs?.[0]?.avgResponseTime || 0}ms
                  </div>
                </div>
              </div>
            )}

            <div className="flex gap-2">
              <Badge variant={results.testValidation?.success ? "default" : "destructive"}>
                {results.testValidation?.success ? "✅ Execução OK" : "❌ Execução Falhou"}
              </Badge>
              <Badge variant={(results.savedResults || 0) > 0 ? "default" : "destructive"}>
                {(results.savedResults || 0) > 0 ? "✅ Persistência OK" : "❌ Persistência Falhou"}
              </Badge>
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  );
}