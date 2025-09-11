import React, { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import { 
  GitCompare, TrendingUp, Clock, 
  CheckCircle, XCircle, BarChart3,
  RefreshCw, Filter
} from 'lucide-react';

interface RAGVersionComparatorProps {
  comparisonData: any[];
  onRefresh: () => void;
}

export function RAGVersionComparator({ comparisonData, onRefresh }: RAGVersionComparatorProps) {
  const [selectedComparison, setSelectedComparison] = useState<any>(null);
  const [filterCategory, setFilterCategory] = useState<string>('all');

  // Calcular estatísticas de comparação
  const calculateStats = () => {
    if (!comparisonData.length) return null;

    const v1Correct = comparisonData.filter(c => c.v1_is_correct).length;
    const v2Correct = comparisonData.filter(c => c.v2_is_correct).length;
    
    const avgV1Accuracy = comparisonData.reduce((sum, c) => sum + (c.v1_accuracy_score || 0), 0) / comparisonData.length;
    const avgV2Accuracy = comparisonData.reduce((sum, c) => sum + (c.v2_accuracy_score || 0), 0) / comparisonData.length;
    
    const avgV1ResponseTime = comparisonData.reduce((sum, c) => sum + (c.v1_response_time || 0), 0) / comparisonData.length;
    const avgV2ResponseTime = comparisonData.reduce((sum, c) => sum + (c.v2_response_time || 0), 0) / comparisonData.length;
    
    const avgSimilarity = comparisonData.reduce((sum, c) => sum + (c.similarity_score || 0), 0) / comparisonData.length;

    return {
      total: comparisonData.length,
      v1SuccessRate: Math.round((v1Correct / comparisonData.length) * 100),
      v2SuccessRate: Math.round((v2Correct / comparisonData.length) * 100),
      avgV1Accuracy: Math.round(avgV1Accuracy * 100),
      avgV2Accuracy: Math.round(avgV2Accuracy * 100),
      avgV1ResponseTime: Math.round(avgV1ResponseTime),
      avgV2ResponseTime: Math.round(avgV2ResponseTime),
      similarityScore: Math.round(avgSimilarity * 100),
      v1Faster: avgV1ResponseTime < avgV2ResponseTime,
      accuracyDifference: Math.round((avgV2Accuracy - avgV1Accuracy) * 100)
    };
  };

  const stats = calculateStats();

  return (
    <div className="space-y-6">
      {/* Header com Controles */}
      <div className="flex justify-between items-center">
        <h3 className="text-lg font-semibold">Comparação entre Versões RAG</h3>
        <div className="flex gap-2">
          <Button variant="outline" size="sm" onClick={onRefresh}>
            <RefreshCw className="h-4 w-4 mr-2" />
            Atualizar
          </Button>
        </div>
      </div>

      {/* Estatísticas Resumidas */}
      {stats && (
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm">Taxa de Sucesso</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-2">
                <div className="flex justify-between text-sm">
                  <span>V1:</span>
                  <span className="font-medium">{stats.v1SuccessRate}%</span>
                </div>
                <div className="flex justify-between text-sm">
                  <span>V2:</span>
                  <span className="font-medium">{stats.v2SuccessRate}%</span>
                </div>
                <Progress value={Math.max(stats.v1SuccessRate, stats.v2SuccessRate)} className="h-2" />
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm">Acurácia Média</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-2">
                <div className="flex justify-between text-sm">
                  <span>V1:</span>
                  <span className="font-medium">{stats.avgV1Accuracy}%</span>
                </div>
                <div className="flex justify-between text-sm">
                  <span>V2:</span>
                  <span className="font-medium">{stats.avgV2Accuracy}%</span>
                </div>
                <Badge variant={stats.accuracyDifference >= 0 ? 'default' : 'destructive'}>
                  {stats.accuracyDifference >= 0 ? '+' : ''}{stats.accuracyDifference}% diferença
                </Badge>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm">Tempo de Resposta</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-2">
                <div className="flex justify-between text-sm">
                  <span>V1:</span>
                  <span className="font-medium">{stats.avgV1ResponseTime}ms</span>
                </div>
                <div className="flex justify-between text-sm">
                  <span>V2:</span>
                  <span className="font-medium">{stats.avgV2ResponseTime}ms</span>
                </div>
                <Badge variant={stats.v1Faster ? 'default' : 'secondary'}>
                  {stats.v1Faster ? 'V1 mais rápido' : 'V2 mais rápido'}
                </Badge>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm">Similaridade</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-2">
                <div className="text-2xl font-bold">{stats.similarityScore}%</div>
                <Progress value={stats.similarityScore} className="h-2" />
                <p className="text-xs text-muted-foreground">
                  Consistência entre respostas
                </p>
              </div>
            </CardContent>
          </Card>
        </div>
      )}

      {/* Lista de Comparações Detalhadas */}
      <Card>
        <CardHeader>
          <CardTitle>Comparações Detalhadas</CardTitle>
        </CardHeader>
        <CardContent>
          {comparisonData.length === 0 ? (
            <p className="text-muted-foreground text-center py-8">
              Nenhuma comparação disponível. Execute uma validação dual para gerar dados.
            </p>
          ) : (
            <div className="space-y-4">
              {comparisonData.slice(0, 10).map((comparison, index) => (
                <div 
                  key={comparison.id} 
                  className="border rounded-lg p-4 cursor-pointer hover:bg-muted/50"
                  onClick={() => setSelectedComparison(comparison)}
                >
                  <div className="flex justify-between items-start mb-2">
                    <div className="flex-1">
                      <h4 className="font-medium text-sm mb-1">
                        Query: {comparison.query_text?.substring(0, 100)}...
                      </h4>
                      <div className="flex gap-4 text-xs text-muted-foreground">
                        <span>V1: {Math.round((comparison.v1_accuracy_score || 0) * 100)}% acurácia</span>
                        <span>V2: {Math.round((comparison.v2_accuracy_score || 0) * 100)}% acurácia</span>
                        <span>Similaridade: {Math.round((comparison.similarity_score || 0) * 100)}%</span>
                      </div>
                    </div>
                    <div className="flex gap-2">
                      {comparison.v1_is_correct ? (
                        <CheckCircle className="h-4 w-4 text-green-500" />
                      ) : (
                        <XCircle className="h-4 w-4 text-red-500" />
                      )}
                      {comparison.v2_is_correct ? (
                        <CheckCircle className="h-4 w-4 text-green-500" />
                      ) : (
                        <XCircle className="h-4 w-4 text-red-500" />
                      )}
                    </div>
                  </div>
                  <div className="grid grid-cols-2 gap-4 text-xs">
                    <div>
                      <span className="font-medium">V1 Response Time:</span> {comparison.v1_response_time || 0}ms
                    </div>
                    <div>
                      <span className="font-medium">V2 Response Time:</span> {comparison.v2_response_time || 0}ms
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>

      {/* Modal de Detalhes da Comparação */}
      {selectedComparison && (
        <Card>
          <CardHeader>
            <CardTitle className="flex justify-between items-center">
              Detalhes da Comparação
              <Button 
                variant="ghost" 
                size="sm" 
                onClick={() => setSelectedComparison(null)}
              >
                ✕
              </Button>
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              <div>
                <h4 className="font-medium mb-2">Query:</h4>
                <p className="text-sm bg-muted p-3 rounded">{selectedComparison.query_text}</p>
              </div>
              
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <h4 className="font-medium mb-2 text-blue-600">RAG V1 Response:</h4>
                  <div className="text-sm bg-blue-50 p-3 rounded border">
                    {selectedComparison.v1_response?.substring(0, 300)}...
                  </div>
                  <div className="mt-2 flex gap-2">
                    <Badge variant={selectedComparison.v1_is_correct ? 'default' : 'destructive'}>
                      {selectedComparison.v1_is_correct ? 'Correto' : 'Incorreto'}
                    </Badge>
                    <Badge variant="outline">
                      {Math.round((selectedComparison.v1_accuracy_score || 0) * 100)}% acurácia
                    </Badge>
                  </div>
                </div>
                
                <div>
                  <h4 className="font-medium mb-2 text-purple-600">RAG V2 Response:</h4>
                  <div className="text-sm bg-purple-50 p-3 rounded border">
                    {selectedComparison.v2_response?.substring(0, 300)}...
                  </div>
                  <div className="mt-2 flex gap-2">
                    <Badge variant={selectedComparison.v2_is_correct ? 'default' : 'destructive'}>
                      {selectedComparison.v2_is_correct ? 'Correto' : 'Incorreto'}
                    </Badge>
                    <Badge variant="outline">
                      {Math.round((selectedComparison.v2_accuracy_score || 0) * 100)}% acurácia
                    </Badge>
                  </div>
                </div>
              </div>
              
              <div className="flex justify-between text-sm text-muted-foreground">
                <span>Similaridade: {Math.round((selectedComparison.similarity_score || 0) * 100)}%</span>
                <span>Diferença de tempo: {Math.abs((selectedComparison.v1_response_time || 0) - (selectedComparison.v2_response_time || 0))}ms</span>
              </div>
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
}