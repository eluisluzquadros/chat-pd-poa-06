import React from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import { 
  BarChart3, TrendingUp, Clock, Activity,
  CheckCircle, AlertTriangle, Target, Zap
} from 'lucide-react';

interface QualityMetricsV3Props {
  metrics: {
    totalDualRuns: number;
    avgV1Accuracy: number;
    avgV2Accuracy: number;
    avgAccuracyDifference: number;
    v1ResponseTime: number;
    v2ResponseTime: number;
    v1SuccessRate: number;
    v2SuccessRate: number;
    consistencyScore: number;
  };
  comparisonData: any[];
}

export function QualityMetricsV3({ metrics, comparisonData }: QualityMetricsV3Props) {
  
  // Calcular métricas avançadas
  const calculateAdvancedMetrics = () => {
    if (!comparisonData.length) return null;

    // Análise de consistência por categoria
    const categoryAnalysis = comparisonData.reduce((acc, comparison) => {
      const category = comparison.qa_test_cases?.category || 'unknown';
      if (!acc[category]) {
        acc[category] = {
          total: 0,
          v1Correct: 0,
          v2Correct: 0,
          bothCorrect: 0,
          consistent: 0
        };
      }
      
      acc[category].total++;
      if (comparison.v1_is_correct) acc[category].v1Correct++;
      if (comparison.v2_is_correct) acc[category].v2Correct++;
      if (comparison.v1_is_correct && comparison.v2_is_correct) acc[category].bothCorrect++;
      if (comparison.v1_is_correct === comparison.v2_is_correct) acc[category].consistent++;
      
      return acc;
    }, {} as any);

    // Performance trends
    const timeBasedAnalysis = comparisonData.reduce((acc, comparison) => {
      const timeDiff = Math.abs((comparison.v1_response_time || 0) - (comparison.v2_response_time || 0));
      acc.avgTimeDifference += timeDiff;
      
      if (comparison.v1_response_time < comparison.v2_response_time) {
        acc.v1FasterCount++;
      } else {
        acc.v2FasterCount++;
      }
      
      return acc;
    }, { avgTimeDifference: 0, v1FasterCount: 0, v2FasterCount: 0 });

    timeBasedAnalysis.avgTimeDifference = Math.round(timeBasedAnalysis.avgTimeDifference / comparisonData.length);

    return { categoryAnalysis, timeBasedAnalysis };
  };

  const advancedMetrics = calculateAdvancedMetrics();

  // Calcular score de qualidade geral
  const calculateQualityScore = () => {
    const accuracyScore = (metrics.avgV1Accuracy + metrics.avgV2Accuracy) / 2;
    const consistencyBonus = metrics.consistencyScore * 0.3;
    const speedPenalty = Math.max(0, (Math.max(metrics.v1ResponseTime, metrics.v2ResponseTime) - 2000) / 1000) * 5;
    
    return Math.max(0, Math.min(100, accuracyScore + consistencyBonus - speedPenalty));
  };

  const overallQualityScore = Math.round(calculateQualityScore());

  return (
    <div className="space-y-6">
      {/* Score Geral de Qualidade */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Target className="h-5 w-5" />
            Score Geral de Qualidade
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex items-center gap-4">
            <div className="text-4xl font-bold">{overallQualityScore}</div>
            <div className="flex-1">
              <Progress value={overallQualityScore} className="h-3" />
              <div className="flex justify-between text-xs text-muted-foreground mt-1">
                <span>Ruim</span>
                <span>Bom</span>
                <span>Excelente</span>
              </div>
            </div>
            <Badge 
              variant={overallQualityScore >= 85 ? 'default' : overallQualityScore >= 70 ? 'secondary' : 'destructive'}
              className="text-lg px-3 py-1"
            >
              {overallQualityScore >= 85 ? 'Excelente' : overallQualityScore >= 70 ? 'Bom' : 'Precisa Melhorar'}
            </Badge>
          </div>
        </CardContent>
      </Card>

      {/* Métricas Detalhadas */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        {/* Análise de Acurácia */}
        <Card>
          <CardHeader>
            <CardTitle className="text-base flex items-center gap-2">
              <BarChart3 className="h-4 w-4" />
              Análise de Acurácia
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            <div className="space-y-2">
              <div className="flex justify-between text-sm">
                <span>RAG V1:</span>
                <span className="font-medium">{metrics.avgV1Accuracy}%</span>
              </div>
              <Progress value={metrics.avgV1Accuracy} className="h-2" />
            </div>
            
            <div className="space-y-2">
              <div className="flex justify-between text-sm">
                <span>RAG V2:</span>
                <span className="font-medium">{metrics.avgV2Accuracy}%</span>
              </div>
              <Progress value={metrics.avgV2Accuracy} className="h-2" />
            </div>

            <div className="pt-2 border-t">
              <div className="flex justify-between items-center">
                <span className="text-sm text-muted-foreground">Diferença:</span>
                <Badge variant={metrics.avgAccuracyDifference >= 0 ? 'default' : 'destructive'}>
                  {metrics.avgAccuracyDifference >= 0 ? '+' : ''}{metrics.avgAccuracyDifference}%
                </Badge>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Análise de Performance */}
        <Card>
          <CardHeader>
            <CardTitle className="text-base flex items-center gap-2">
              <Clock className="h-4 w-4" />
              Análise de Performance
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            <div className="space-y-2">
              <div className="flex justify-between text-sm">
                <span>V1 Médio:</span>
                <span className="font-medium">{metrics.v1ResponseTime}ms</span>
              </div>
              <div className="flex justify-between text-sm">
                <span>V2 Médio:</span>
                <span className="font-medium">{metrics.v2ResponseTime}ms</span>
              </div>
            </div>

            {advancedMetrics && (
              <div className="pt-2 border-t space-y-1">
                <div className="flex justify-between text-xs">
                  <span>V1 mais rápido:</span>
                  <span>{advancedMetrics.timeBasedAnalysis.v1FasterCount} vezes</span>
                </div>
                <div className="flex justify-between text-xs">
                  <span>V2 mais rápido:</span>
                  <span>{advancedMetrics.timeBasedAnalysis.v2FasterCount} vezes</span>
                </div>
                <div className="flex justify-between text-xs">
                  <span>Diff. média:</span>
                  <span>{advancedMetrics.timeBasedAnalysis.avgTimeDifference}ms</span>
                </div>
              </div>
            )}
          </CardContent>
        </Card>

        {/* Análise de Consistência */}
        <Card>
          <CardHeader>
            <CardTitle className="text-base flex items-center gap-2">
              <Activity className="h-4 w-4" />
              Análise de Consistência
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            <div className="space-y-2">
              <div className="flex justify-between text-sm">
                <span>Score de Consistência:</span>
                <span className="font-medium">{metrics.consistencyScore}%</span>
              </div>
              <Progress value={metrics.consistencyScore} className="h-2" />
            </div>

            <div className="space-y-1 text-xs text-muted-foreground">
              <div className="flex justify-between">
                <span>V1 Taxa Sucesso:</span>
                <span>{metrics.v1SuccessRate}%</span>
              </div>
              <div className="flex justify-between">
                <span>V2 Taxa Sucesso:</span>
                <span>{metrics.v2SuccessRate}%</span>
              </div>
            </div>

            <div className="pt-2 border-t">
              <Badge 
                variant={metrics.consistencyScore >= 85 ? 'default' : 'secondary'}
                className="w-full justify-center"
              >
                {metrics.consistencyScore >= 85 ? 'Altamente Consistente' : 'Moderadamente Consistente'}
              </Badge>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Análise por Categoria */}
      {advancedMetrics?.categoryAnalysis && (
        <Card>
          <CardHeader>
            <CardTitle>Análise por Categoria</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              {Object.entries(advancedMetrics.categoryAnalysis).map(([category, data]: [string, any]) => (
                <div key={category} className="border rounded-lg p-4">
                  <div className="flex justify-between items-start mb-2">
                    <h4 className="font-medium capitalize">{category.replace('_', ' ')}</h4>
                    <Badge variant="outline">{data.total} testes</Badge>
                  </div>
                  
                  <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-sm">
                    <div>
                      <div className="text-muted-foreground">V1 Acertos</div>
                      <div className="font-medium">{Math.round((data.v1Correct / data.total) * 100)}%</div>
                    </div>
                    <div>
                      <div className="text-muted-foreground">V2 Acertos</div>
                      <div className="font-medium">{Math.round((data.v2Correct / data.total) * 100)}%</div>
                    </div>
                    <div>
                      <div className="text-muted-foreground">Ambos Corretos</div>
                      <div className="font-medium">{Math.round((data.bothCorrect / data.total) * 100)}%</div>
                    </div>
                    <div>
                      <div className="text-muted-foreground">Consistência</div>
                      <div className="font-medium">{Math.round((data.consistent / data.total) * 100)}%</div>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      )}

      {/* Recomendações */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <AlertTriangle className="h-5 w-5" />
            Recomendações
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-3">
            {metrics.avgAccuracyDifference < -10 && (
              <div className="flex items-start gap-2 p-3 bg-yellow-50 border border-yellow-200 rounded">
                <AlertTriangle className="h-4 w-4 text-yellow-600 mt-0.5" />
                <div className="text-sm">
                  <strong>Atenção:</strong> RAG V1 está significativamente abaixo do V2 em acurácia. 
                  Considere revisar configurações ou knowledge base do V1.
                </div>
              </div>
            )}
            
            {metrics.v1ResponseTime > 5000 && (
              <div className="flex items-start gap-2 p-3 bg-blue-50 border border-blue-200 rounded">
                <Clock className="h-4 w-4 text-blue-600 mt-0.5" />
                <div className="text-sm">
                  <strong>Performance:</strong> RAG V1 apresenta tempo de resposta elevado. 
                  Considere otimizações de indexação ou cache.
                </div>
              </div>
            )}
            
            {metrics.consistencyScore < 70 && (
              <div className="flex items-start gap-2 p-3 bg-red-50 border border-red-200 rounded">
                <Activity className="h-4 w-4 text-red-600 mt-0.5" />
                <div className="text-sm">
                  <strong>Inconsistência:</strong> Score de consistência baixo entre versões. 
                  Investigate diferenças na base de conhecimento ou configurações.
                </div>
              </div>
            )}
            
            {overallQualityScore >= 85 && (
              <div className="flex items-start gap-2 p-3 bg-green-50 border border-green-200 rounded">
                <CheckCircle className="h-4 w-4 text-green-600 mt-0.5" />
                <div className="text-sm">
                  <strong>Excelente:</strong> Ambos os sistemas estão performando muito bem. 
                  Continue monitorando para manter este nível de qualidade.
                </div>
              </div>
            )}
          </div>
        </CardContent>
      </Card>
    </div>
  );
}