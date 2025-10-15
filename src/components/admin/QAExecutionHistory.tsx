import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { supabase } from '@/integrations/supabase/client';
import { formatDistanceToNow } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import { Eye, Clock, CheckCircle, XCircle, AlertCircle, Trash2, RefreshCw, Download, MoreVertical } from 'lucide-react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { QAResultsDetailModal } from './QAResultsDetailModal';
import { useQAHistoryReset } from '@/hooks/useQAHistoryReset';
import { toast } from 'sonner';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog';

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
  const [showResetDialog, setShowResetDialog] = useState(false);
  const [showDeleteDialog, setShowDeleteDialog] = useState(false);
  const [runToDelete, setRunToDelete] = useState<string | null>(null);
  const { loading: resetLoading, resetHistory, getCurrentStats } = useQAHistoryReset();

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
      setRuns((data as any) || []);
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
        .eq('validation_run_id', runId as any)
        .order('created_at', { ascending: false });

      if (error) throw error;
      
      // Get test case details separately - handle both string and number IDs
      const testCaseIds = (data as any)?.map((r: any) => r.test_case_id).filter(Boolean) || [];
      const { data: testCases } = await supabase
        .from('qa_test_cases')
        .select('id, question, expected_answer, category, difficulty')
        .in('id', testCaseIds.map((id: any) => typeof id === 'string' ? parseInt(id) : id));

      // Merge results with test case data
      const enrichedResults = (data as any)?.map((result: any) => ({
        ...(result as any),
        test_case: (testCases as any)?.find((tc: any) => tc.id.toString() === (result as any).test_case_id)
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

  const handleResetHistory = async () => {
    const stats = await getCurrentStats();
    if (!stats) {
      toast.error('Erro ao obter estatísticas');
      return;
    }

    if (stats.runs === 0) {
      toast.info('Não há histórico para limpar');
      return;
    }

    setShowResetDialog(true);
  };

  const confirmResetHistory = async () => {
    setShowResetDialog(false);
    const result = await resetHistory();
    
    if (result.success) {
      await fetchRuns();
    }
  };

  const handleDeleteRun = async (runId: string) => {
    setRunToDelete(runId);
    setShowDeleteDialog(true);
  };

  const confirmDeleteRun = async () => {
    if (!runToDelete) return;

    try {
      const { error: resultsError } = await supabase
        .from('qa_validation_results')
        .delete()
        .eq('validation_run_id', runToDelete);

      if (resultsError) throw resultsError;

      const { error: runError } = await supabase
        .from('qa_validation_runs')
        .delete()
        .eq('id', runToDelete);

      if (runError) throw runError;

      toast.success('Execução deletada com sucesso');
      await fetchRuns();
    } catch (error) {
      console.error('Error deleting run:', error);
      toast.error('Erro ao deletar execução');
    } finally {
      setShowDeleteDialog(false);
      setRunToDelete(null);
    }
  };

  const handleExportRun = async (runId: string) => {
    try {
      const { data: results, error } = await supabase
        .from('qa_validation_results')
        .select('*, qa_test_cases(*)')
        .eq('validation_run_id', runId);

      if (error) throw error;

      const headers = ['ID', 'Pergunta', 'Esperado', 'Recebido', 'Acurácia', 'Tempo (ms)', 'Status'];
      const rows = results.map(r => [
        r.id,
        r.qa_test_cases?.question || 'N/A',
        r.qa_test_cases?.expected_answer || 'N/A',
        r.actual_answer,
        r.accuracy_score.toFixed(2),
        r.response_time_ms,
        r.is_correct ? 'Correto' : 'Incorreto'
      ]);

      const csv = [
        headers.join(','),
        ...rows.map(row => row.map(cell => `"${cell}"`).join(','))
      ].join('\n');

      const blob = new Blob([csv], { type: 'text/csv' });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `qa-results-${runId}.csv`;
      a.click();
      URL.revokeObjectURL(url);

      toast.success('Resultados exportados com sucesso');
    } catch (error) {
      console.error('Error exporting run:', error);
      toast.error('Erro ao exportar resultados');
    }
  };

  return (
    <>
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <CardTitle>Histórico de Execuções QA</CardTitle>
            <Button
              variant="destructive"
              onClick={handleResetHistory}
              disabled={resetLoading || isLoading}
            >
              <Trash2 className="h-4 w-4 mr-2" />
              Limpar Histórico Completo
            </Button>
          </div>
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
                    <DropdownMenu>
                      <DropdownMenuTrigger asChild>
                        <Button variant="ghost" size="sm">
                          <MoreVertical className="h-4 w-4" />
                        </Button>
                      </DropdownMenuTrigger>
                      <DropdownMenuContent align="end">
                        <DropdownMenuItem onClick={() => handleDeleteRun(run.id)}>
                          <Trash2 className="h-4 w-4 mr-2" />
                          Deletar
                        </DropdownMenuItem>
                        <DropdownMenuItem onClick={() => handleExportRun(run.id)}>
                          <Download className="h-4 w-4 mr-2" />
                          Exportar CSV
                        </DropdownMenuItem>
                        <DropdownMenuSeparator />
                        <DropdownMenuItem onClick={() => {
                          setSelectedRunId(run.id);
                          setSelectedRunData({
                            model: run.model,
                            totalTests: run.total_tests,
                            passedTests: run.passed_tests,
                            accuracy: (run.overall_accuracy || 0) * 100,
                            startedAt: run.started_at
                          });
                        }}>
                          <Eye className="h-4 w-4 mr-2" />
                          Ver Detalhes
                        </DropdownMenuItem>
                      </DropdownMenuContent>
                    </DropdownMenu>
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

    {/* Reset History Confirmation Dialog */}
    <AlertDialog open={showResetDialog} onOpenChange={setShowResetDialog}>
      <AlertDialogContent>
        <AlertDialogHeader>
          <AlertDialogTitle>Confirmar Limpeza de Histórico</AlertDialogTitle>
          <AlertDialogDescription>
            Esta ação irá deletar permanentemente todo o histórico de execuções QA.
            Você não poderá desfazer esta ação.
          </AlertDialogDescription>
        </AlertDialogHeader>
        <AlertDialogFooter>
          <AlertDialogCancel>Cancelar</AlertDialogCancel>
          <AlertDialogAction onClick={confirmResetHistory} className="bg-destructive text-destructive-foreground hover:bg-destructive/90">
            Confirmar Limpeza
          </AlertDialogAction>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>

    {/* Delete Run Confirmation Dialog */}
    <AlertDialog open={showDeleteDialog} onOpenChange={setShowDeleteDialog}>
      <AlertDialogContent>
        <AlertDialogHeader>
          <AlertDialogTitle>Confirmar Exclusão</AlertDialogTitle>
          <AlertDialogDescription>
            Esta ação irá deletar permanentemente esta execução e todos os seus resultados.
            Você não poderá desfazer esta ação.
          </AlertDialogDescription>
        </AlertDialogHeader>
        <AlertDialogFooter>
          <AlertDialogCancel>Cancelar</AlertDialogCancel>
          <AlertDialogAction onClick={confirmDeleteRun} className="bg-destructive text-destructive-foreground hover:bg-destructive/90">
            Confirmar Exclusão
          </AlertDialogAction>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
    </>
  );
}