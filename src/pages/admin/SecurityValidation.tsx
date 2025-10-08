import { useState } from "react";
import { Header } from "@/components/Header";
import { SimpleAuthGuard } from "@/components/SimpleAuthGuard";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Shield, Play, FileDown, Clock, CheckCircle, XCircle, AlertTriangle, Trash2 } from "lucide-react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { SecurityRunCard } from "@/components/admin/security/SecurityRunCard";
import { SecurityHistoryTable } from "@/components/admin/security/SecurityHistoryTable";
import { SecurityTestSelector } from "@/components/admin/security/SecurityTestSelector";
import { Progress } from "@/components/ui/progress";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";

export default function SecurityValidation() {
  const [selectedTests, setSelectedTests] = useState<number[]>([]);
  const [isRunning, setIsRunning] = useState(false);
  const [progress, setProgress] = useState(0);
  const [showClearDialog, setShowClearDialog] = useState(false);
  const [isClearing, setIsClearing] = useState(false);
  const queryClient = useQueryClient();

  // Buscar última execução
  const { data: latestRun, isLoading: loadingLatest } = useQuery({
    queryKey: ['security-latest-run'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('security_validation_runs')
        .select('*')
        .order('started_at', { ascending: false })
        .limit(1)
        .single();
      
      if (error && error.code !== 'PGRST116') throw error;
      return data;
    },
  });

  // Buscar histórico
  const { data: runs, isLoading: loadingRuns, refetch: refetchRuns } = useQuery({
    queryKey: ['security-runs'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('security_validation_runs')
        .select('*')
        .order('started_at', { ascending: false })
        .limit(20);
      
      if (error) throw error;
      return data;
    },
  });

  // Executar validação
  const runValidation = useMutation({
    mutationFn: async () => {
      setIsRunning(true);
      setProgress(0);

      const { data, error } = await supabase.functions.invoke('security-validator', {
        body: {
          testNumbers: selectedTests.length > 0 ? selectedTests : undefined,
          systemVersion: 'v1.0',
        },
      });

      if (error) throw error;
      return data;
    },
    onSuccess: (data) => {
      setIsRunning(false);
      setProgress(100);
      
      toast.success('Validação concluída!', {
        description: `Score: ${data.summary.overallScore}% - ${data.summary.passedTests}/${data.summary.totalTests} testes passaram`,
      });

      queryClient.invalidateQueries({ queryKey: ['security-latest-run'] });
      queryClient.invalidateQueries({ queryKey: ['security-runs'] });
      
      setSelectedTests([]);
    },
    onError: (error: any) => {
      setIsRunning(false);
      setProgress(0);
      toast.error('Erro ao executar validação', {
        description: error.message,
      });
    },
  });

  const handleRunValidation = () => {
    if (isRunning) return;
    
    const testCount = selectedTests.length > 0 ? selectedTests.length : 20;
    toast.info('Iniciando validação de segurança', {
      description: `Executando ${testCount} teste(s)...`,
    });

    // Simular progresso
    let currentProgress = 0;
    const interval = setInterval(() => {
      currentProgress += 5;
      setProgress(Math.min(currentProgress, 90));
      if (currentProgress >= 90) clearInterval(interval);
    }, 200);

    runValidation.mutate();
  };

  const handleClearAllHistory = async () => {
    setIsClearing(true);
    try {
      const { data: { session } } = await supabase.auth.getSession();
      
      if (!session) {
        throw new Error('Usuário não autenticado');
      }

      const { data, error } = await supabase.functions.invoke('delete-all-security-runs', {
        headers: {
          Authorization: `Bearer ${session.access_token}`
        }
      });

      if (error) throw error;

      toast.success('Histórico limpo com sucesso', {
        description: `${data.deleted.validationRuns} execuções deletadas`,
      });

      queryClient.invalidateQueries({ queryKey: ['security-latest-run'] });
      queryClient.invalidateQueries({ queryKey: ['security-runs'] });
      setShowClearDialog(false);
    } catch (error: any) {
      toast.error('Erro ao limpar histórico', {
        description: error.message,
      });
    } finally {
      setIsClearing(false);
    }
  };

  return (
    <SimpleAuthGuard requiredRole="admin">
      <div className="min-h-screen bg-gradient-to-b from-background to-secondary/20">
        <Header />
        
        <main className="container mx-auto px-4 py-8 space-y-8">
          {/* Header */}
          <div className="flex items-center justify-between">
            <div>
              <h1 className="text-4xl font-bold flex items-center gap-3">
                <Shield className="h-10 w-10 text-primary" />
                Validação de Segurança
              </h1>
              <p className="text-muted-foreground mt-2">
                Sistema de testes automatizados contra Prompt Injection
              </p>
            </div>
          </div>

          {/* Executar Nova Validação */}
          <Card className="border-primary/20">
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Play className="h-5 w-5" />
                Executar Validação
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <SecurityTestSelector
                selectedTests={selectedTests}
                onSelectionChange={setSelectedTests}
              />

              <div className="flex items-center gap-4">
                <Button
                  onClick={handleRunValidation}
                  disabled={isRunning}
                  size="lg"
                  className="gap-2"
                >
                  <Play className="h-4 w-4" />
                  {isRunning ? 'Executando...' : 'Executar Validação Completa'}
                </Button>

                {selectedTests.length > 0 && (
                  <Badge variant="outline">
                    {selectedTests.length} teste(s) selecionado(s)
                  </Badge>
                )}
              </div>

              {isRunning && (
                <div className="space-y-2">
                  <Progress value={progress} className="h-2" />
                  <p className="text-sm text-muted-foreground">
                    Executando testes de segurança... {progress}%
                  </p>
                </div>
              )}
            </CardContent>
          </Card>

          {/* Última Execução */}
          {latestRun && (
            <SecurityRunCard run={latestRun} />
          )}

          {/* Histórico */}
          <Card>
            <CardHeader>
              <div className="flex items-center justify-between">
                <CardTitle className="flex items-center gap-2">
                  <Clock className="h-5 w-5" />
                  Histórico de Execuções
                </CardTitle>
                {runs && runs.length > 0 && (
                  <Button
                    variant="destructive"
                    size="sm"
                    onClick={() => setShowClearDialog(true)}
                    className="gap-2"
                  >
                    <Trash2 className="h-4 w-4" />
                    Limpar Histórico
                  </Button>
                )}
              </div>
            </CardHeader>
            <CardContent>
              <SecurityHistoryTable runs={runs || []} onRunDeleted={refetchRuns} />
            </CardContent>
          </Card>

          {/* Alert Dialog para confirmação */}
          <AlertDialog open={showClearDialog} onOpenChange={setShowClearDialog}>
            <AlertDialogContent>
              <AlertDialogHeader>
                <AlertDialogTitle>Limpar todo o histórico?</AlertDialogTitle>
                <AlertDialogDescription>
                  Esta ação irá deletar permanentemente TODAS as {runs?.length || 0} execuções de validação 
                  e seus resultados. Esta ação não pode ser desfeita.
                </AlertDialogDescription>
              </AlertDialogHeader>
              <AlertDialogFooter>
                <AlertDialogCancel disabled={isClearing}>Cancelar</AlertDialogCancel>
                <AlertDialogAction
                  onClick={handleClearAllHistory}
                  disabled={isClearing}
                  className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
                >
                  {isClearing ? "Limpando..." : "Limpar Tudo"}
                </AlertDialogAction>
              </AlertDialogFooter>
            </AlertDialogContent>
          </AlertDialog>
        </main>
      </div>
    </SimpleAuthGuard>
  );
}
