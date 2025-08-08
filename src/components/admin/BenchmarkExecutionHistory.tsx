import React from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { formatDistanceToNow } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import { Clock, CheckCircle, XCircle, RefreshCw } from 'lucide-react';

interface BenchmarkExecution {
  id: string;
  timestamp: string;
  status: 'completed' | 'failed' | 'running';
  modelsTested: number;
  testCases: number;
  avgQuality: number;
  avgResponseTime: number;
  duration: number;
  error?: string;
}

interface BenchmarkExecutionHistoryProps {
  executions: BenchmarkExecution[];
  isLoading: boolean;
  onRefresh: () => void;
}

export function BenchmarkExecutionHistory({ executions, isLoading, onRefresh }: BenchmarkExecutionHistoryProps) {
  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'completed':
        return <CheckCircle className="h-4 w-4 text-green-500" />;
      case 'failed':
        return <XCircle className="h-4 w-4 text-red-500" />;
      case 'running':
        return <RefreshCw className="h-4 w-4 text-blue-500 animate-spin" />;
      default:
        return <Clock className="h-4 w-4 text-muted-foreground" />;
    }
  };

  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'completed':
        return <Badge variant="default" className="bg-green-100 text-green-800">Concluído</Badge>;
      case 'failed':
        return <Badge variant="destructive">Falhou</Badge>;
      case 'running':
        return <Badge variant="secondary" className="bg-blue-100 text-blue-800">Executando</Badge>;
      default:
        return <Badge variant="outline">Desconhecido</Badge>;
    }
  };

  const formatDuration = (seconds: number) => {
    if (seconds < 60) return `${seconds}s`;
    const minutes = Math.floor(seconds / 60);
    const remainingSeconds = seconds % 60;
    return `${minutes}m ${remainingSeconds}s`;
  };

  if (isLoading) {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center justify-between">
            <span>Histórico de Execuções</span>
            <Button variant="outline" size="sm" disabled>
              <RefreshCw className="h-4 w-4" />
            </Button>
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            {[1, 2, 3].map(i => (
              <div key={i} className="animate-pulse">
                <div className="h-16 bg-muted rounded"></div>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>
    );
  }

  if (executions.length === 0) {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center justify-between">
            <span>Histórico de Execuções</span>
            <Button variant="outline" size="sm" onClick={onRefresh}>
              <RefreshCw className="h-4 w-4" />
            </Button>
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="text-center py-8 text-muted-foreground">
            <Clock className="h-12 w-12 mx-auto mb-4 opacity-50" />
            <p>Nenhuma execução de benchmark encontrada</p>
            <p className="text-sm">Execute seu primeiro benchmark para ver o histórico aqui</p>
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center justify-between">
          <span>Histórico de Execuções</span>
          <Button variant="outline" size="sm" onClick={onRefresh}>
            <RefreshCw className="h-4 w-4" />
          </Button>
        </CardTitle>
      </CardHeader>
      <CardContent>
        <div className="space-y-4">
          {executions.map((execution) => (
            <div key={execution.id} className="border rounded-lg p-4 space-y-3">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  {getStatusIcon(execution.status)}
                  <span className="font-medium">
                    Iniciado {formatDistanceToNow(new Date(execution.timestamp), { 
                      addSuffix: true, 
                      locale: ptBR 
                    })}
                  </span>
                </div>
                {getStatusBadge(execution.status)}
              </div>
              
              <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-sm">
                <div>
                  <span className="text-muted-foreground">Modelos:</span>
                  <div className="font-medium">{execution.modelsTested}</div>
                </div>
                <div>
                  <span className="text-muted-foreground">Casos de Teste:</span>
                  <div className="font-medium">{execution.testCases}</div>
                </div>
                <div>
                  <span className="text-muted-foreground">Qualidade Média:</span>
                  <div className="font-medium">{execution.avgQuality.toFixed(1)}%</div>
                </div>
                <div>
                  <span className="text-muted-foreground">Duração:</span>
                  <div className="font-medium">{formatDuration(execution.duration)}</div>
                </div>
              </div>
              
              {execution.status === 'completed' && (
                <div className="text-sm text-muted-foreground">
                  Tempo médio de resposta: {execution.avgResponseTime.toFixed(0)}ms
                </div>
              )}
              
              {execution.status === 'failed' && execution.error && (
                <div className="text-sm text-red-600 bg-red-50 p-2 rounded">
                  Erro: {execution.error}
                </div>
              )}
            </div>
          ))}
        </div>
      </CardContent>
    </Card>
  );
}