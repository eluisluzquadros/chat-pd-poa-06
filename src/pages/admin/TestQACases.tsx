import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { AlertCircle, CheckCircle, Clock, Target } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";

interface CategoryStat {
  total: number;
  passed: number;
  accuracy: number;
}

interface QAResult {
  status: string;
  validation_run_id?: string;
  total_cases: number;
  passed_tests: number;
  overall_accuracy: number;
  avg_response_time_ms: number;
  category_breakdown?: { [key: string]: CategoryStat };
  recommendations?: string[];
  execution_time_minutes?: number;
  error?: string;
}

export default function TestQACases() {
  const [result, setResult] = useState<QAResult | null>(null);
  const [loading, setLoading] = useState(false);
  const [progress, setProgress] = useState(0);

  const testCases = async () => {
    setLoading(true);
    setProgress(0);
    setResult(null);
    
    try {
      console.log('🚀 Iniciando teste completo dos casos QA...');
      
      // Start progress simulation
      const progressInterval = setInterval(() => {
        setProgress(prev => Math.min(prev + 1, 95));
      }, 1000);

      const { data, error } = await supabase.functions.invoke('test-qa-cases');
      
      clearInterval(progressInterval);
      setProgress(100);
      
      if (error) throw error;
      setResult(data);
      
      console.log('✅ Teste QA concluído:', data);
    } catch (error) {
      console.error('❌ Erro no teste QA:', error);
      setResult({ 
        status: 'error', 
        error: error.message,
        total_cases: 0,
        passed_tests: 0,
        overall_accuracy: 0,
        avg_response_time_ms: 0
      });
    } finally {
      setLoading(false);
      setProgress(0);
    }
  };

  return (
    <div className="container mx-auto p-6 max-w-6xl">
      <div className="mb-6">
        <h1 className="text-3xl font-bold mb-2">🧪 Validação Completa dos Casos QA</h1>
        <p className="text-muted-foreground">
          Executa todos os casos de teste ativos para medir a acurácia do sistema
        </p>
      </div>
      
      <Card className="mb-6">
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Target className="h-5 w-5" />
            Executar Teste Completo
          </CardTitle>
          <CardDescription>
            Testa 100% dos casos ativos para atingir meta de 90%+ acurácia
          </CardDescription>
        </CardHeader>
        <CardContent>
          <Button 
            onClick={testCases} 
            disabled={loading}
            className="w-full mb-4"
            size="lg"
          >
            {loading ? "Executando Testes..." : "🚀 Executar Todos os Casos de Teste"}
          </Button>
          
          {loading && (
            <div className="space-y-2">
              <div className="flex justify-between text-sm">
                <span>Progresso</span>
                <span>{progress}%</span>
              </div>
              <Progress value={progress} className="w-full" />
              <p className="text-xs text-muted-foreground">
                Executando casos de teste... Isso pode levar alguns minutos.
              </p>
            </div>
          )}
        </CardContent>
      </Card>

      {result && (
        <div className="space-y-6">
          {/* Overall Results */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                {result.status === 'error' ? (
                  <AlertCircle className="h-5 w-5 text-destructive" />
                ) : result.overall_accuracy >= 90 ? (
                  <CheckCircle className="h-5 w-5 text-green-500" />
                ) : (
                  <AlertCircle className="h-5 w-5 text-yellow-500" />
                )}
                Resultados Gerais
              </CardTitle>
            </CardHeader>
            <CardContent>
              {result.status === 'error' ? (
                <div className="text-destructive">
                  <p className="font-semibold">❌ Erro na Execução:</p>
                  <p className="text-sm mt-1">{result.error}</p>
                </div>
              ) : (
                <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                  <div className="text-center">
                    <div className="text-2xl font-bold">{result.passed_tests}/{result.total_cases}</div>
                    <div className="text-sm text-muted-foreground">Casos Aprovados</div>
                  </div>
                  <div className="text-center">
                    <div className="text-2xl font-bold text-primary">
                      {result.overall_accuracy.toFixed(1)}%
                    </div>
                    <div className="text-sm text-muted-foreground">Acurácia Geral</div>
                    <Badge variant={result.overall_accuracy >= 90 ? "default" : "destructive"} className="mt-1">
                      {result.overall_accuracy >= 90 ? "Meta Atingida" : "Abaixo da Meta"}
                    </Badge>
                  </div>
                  <div className="text-center">
                    <div className="text-2xl font-bold">{result.avg_response_time_ms}ms</div>
                    <div className="text-sm text-muted-foreground">Tempo Médio</div>
                  </div>
                  <div className="text-center">
                    <div className="text-2xl font-bold">{result.execution_time_minutes || 0}min</div>
                    <div className="text-sm text-muted-foreground">Tempo Execução</div>
                  </div>
                </div>
              )}
            </CardContent>
          </Card>

          {/* Category Breakdown */}
          {result.category_breakdown && (
            <Card>
              <CardHeader>
                <CardTitle>📊 Performance por Categoria</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  {Object.entries(result.category_breakdown).map(([category, stats]) => (
                    <div key={category} className="space-y-2">
                      <div className="flex justify-between items-center">
                        <span className="font-medium capitalize">{category}</span>
                        <span className="text-sm">
                          {stats.passed}/{stats.total} ({stats.accuracy.toFixed(1)}%)
                        </span>
                      </div>
                      <Progress 
                        value={stats.accuracy} 
                        className={`h-2 ${stats.accuracy >= 70 ? 'bg-green-100' : 'bg-red-100'}`}
                      />
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>
          )}

          {/* Recommendations */}
          {result.recommendations && (
            <Card>
              <CardHeader>
                <CardTitle>💡 Recomendações</CardTitle>
              </CardHeader>
              <CardContent>
                <ul className="space-y-2">
                  {result.recommendations.map((rec, index) => (
                    <li key={index} className="flex items-start gap-2">
                      <span className="text-primary">•</span>
                      <span className="text-sm">{rec}</span>
                    </li>
                  ))}
                </ul>
              </CardContent>
            </Card>
          )}

          {/* Raw Data */}
          <Card>
            <CardHeader>
              <CardTitle>🔍 Dados Completos</CardTitle>
            </CardHeader>
            <CardContent>
              <pre className="text-xs bg-muted p-4 rounded overflow-auto max-h-96">
                {JSON.stringify(result, null, 2)}
              </pre>
            </CardContent>
          </Card>
        </div>
      )}
    </div>
  );
}