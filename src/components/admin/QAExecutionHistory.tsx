import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { supabase } from '@/integrations/supabase/client';
import { formatDistanceToNow } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import { Eye, Clock, CheckCircle, XCircle, AlertCircle } from 'lucide-react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { QAResultsDetailModal } from './QAResultsDetailModal';

interface QAValidationRun {
  id: string;
  model: string;
  status: string;
  total_tests: number;
  passed_tests: number;
  overall_accuracy: number;
  avg_response_time_ms: number;
  started_at: string;
  completed_at: string;
  error_message?: string;
}

interface QAValidationResult {
  id: string;
  test_case_id: string;
  actual_answer: string;
  is_correct: boolean;
  accuracy_score: number;
  response_time_ms: number;
  error_details?: string;
  qa_test_cases?: {
    question: string;
    expected_answer: string;
    category: string;
    difficulty: string;
  };
}

export function QAExecutionHistory() {
  const [runs, setRuns] = useState<QAValidationRun[]>([]);
  const [selectedRun, setSelectedRun] = useState<QAValidationRun | null>(null);
  const [runResults, setRunResults] = useState<QAValidationResult[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [detailsLoading, setDetailsLoading] = useState(false);
  const [selectedRunId, setSelectedRunId] = useState<string | null>(null);
  const [selectedRunData, setSelectedRunData] = useState<any>(null);

  useEffect(() => {
    fetchRuns();
  }, []);

  const fetchRuns = async () => {
    try {
      setIsLoading(true);
      const { data, error } = await supabase
        .from('qa_validation_runs')
        .select('*')
        .order('started_at', { ascending: false })
        .limit(20);

      if (error) throw error;
      setRuns(data || []);
    } catch (error) {
      console.error('Error fetching runs:', error);
    } finally {
      setIsLoading(false);
    }
  };

  const fetchRunDetails = async (runId: string) => {
    try {
      setDetailsLoading(true);
      const { data, error } = await supabase
        .from('qa_validation_results')
        .select('*')
        .eq('validation_run_id', runId)
        .order('created_at', { ascending: false });

      if (error) throw error;
      
      // Get test case details separately - handle both string and number IDs
      const testCaseIds = data?.map(r => r.test_case_id).filter(Boolean) || [];
      const { data: testCases } = await supabase
        .from('qa_test_cases')
        .select('id, question, expected_answer, category, difficulty')
        .in('id', testCaseIds.map(id => typeof id === 'string' ? parseInt(id) : id));

      // Merge results with test case data
      const enrichedResults = data?.map(result => ({
        ...result,
        test_case: testCases?.find(tc => tc.id.toString() === result.test_case_id)
      })) || [];

      setRunResults(enrichedResults);
    } catch (error) {
      console.error('Error fetching run details:', error);
    } finally {
      setDetailsLoading(false);
    }
  };

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'completed':
        return <CheckCircle className="h-4 w-4 text-green-500" />;
      case 'running':
        return <Clock className="h-4 w-4 text-blue-500" />;
      case 'failed':
        return <XCircle className="h-4 w-4 text-red-500" />;
      default:
        return <AlertCircle className="h-4 w-4 text-yellow-500" />;
    }
  };

  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'completed':
        return <Badge variant="default">Concluída</Badge>;
      case 'running':
        return <Badge variant="secondary">Executando</Badge>;
      case 'failed':
        return <Badge variant="destructive">Falhou</Badge>;
      default:
        return <Badge variant="outline">Desconhecido</Badge>;
    }
  };

  const formatDuration = (startedAt: string, completedAt?: string) => {
    if (!completedAt) return '-';
    const start = new Date(startedAt);
    const end = new Date(completedAt);
    const durationMs = end.getTime() - start.getTime();
    const minutes = Math.floor(durationMs / 60000);
    const seconds = Math.floor((durationMs % 60000) / 1000);
    return `${minutes}m ${seconds}s`;
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle>Histórico de Execuções QA</CardTitle>
      </CardHeader>
      <CardContent>
        {isLoading ? (
          <div className="text-center py-8">Carregando histórico...</div>
        ) : runs.length === 0 ? (
          <div className="text-center py-8 text-muted-foreground">
            Nenhuma execução encontrada. Execute uma validação para ver o histórico.
          </div>
        ) : (
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Status</TableHead>
                <TableHead>Modelo</TableHead>
                <TableHead>Testes</TableHead>
                <TableHead>Acurácia</TableHead>
                <TableHead>Tempo Médio</TableHead>
                <TableHead>Duração</TableHead>
                <TableHead>Iniciado</TableHead>
                <TableHead>Ações</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {runs.map((run) => (
                <TableRow key={run.id}>
                  <TableCell>
                    <div className="flex items-center gap-2">
                      {getStatusIcon(run.status)}
                      {getStatusBadge(run.status)}
                    </div>
                  </TableCell>
                  <TableCell>
                    <Badge variant="outline">{run.model}</Badge>
                  </TableCell>
                  <TableCell>
                    <span className="font-medium">{run.passed_tests}</span>
                    <span className="text-muted-foreground">/{run.total_tests}</span>
                  </TableCell>
                  <TableCell>
                    <Badge variant={run.overall_accuracy >= 0.8 ? 'default' : 'destructive'}>
                      {Math.round(run.overall_accuracy * 100)}%
                    </Badge>
                  </TableCell>
                  <TableCell>{run.avg_response_time_ms}ms</TableCell>
                  <TableCell>{formatDuration(run.started_at, run.completed_at)}</TableCell>
                  <TableCell>
                    {formatDistanceToNow(new Date(run.started_at), { 
                      addSuffix: true, 
                      locale: ptBR 
                    })}
                  </TableCell>
                   <TableCell>
                     <Button
                       variant="ghost"
                       size="sm"
                       onClick={() => {
                         setSelectedRunId(run.id);
                         setSelectedRunData({
                           model: run.model,
                           totalTests: run.total_tests,
                           passedTests: run.passed_tests,
                           accuracy: (run.overall_accuracy || 0) * 100,
                           startedAt: run.started_at
                         });
                       }}
                     >
                       <Eye className="h-4 w-4" />
                     </Button>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        )}
      </CardContent>
      
      {/* Results Detail Modal */}
      <QAResultsDetailModal
        open={!!selectedRunId}
        onOpenChange={(open) => {
          if (!open) {
            setSelectedRunId(null);
            setSelectedRunData(null);
          }
        }}
        runId={selectedRunId || ''}
        runData={selectedRunData}
      />
    </Card>
  );
}