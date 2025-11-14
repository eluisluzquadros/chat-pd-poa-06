import { useState } from "react";
import { Header } from "@/components/Header";
import { SimpleAuthGuard } from "@/components/SimpleAuthGuard";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Shield, Play, FileDown, Clock, CheckCircle, XCircle, AlertTriangle, Trash2, Settings, History } from "lucide-react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { SecurityRunCard } from "@/components/admin/security/SecurityRunCard";
import { SecurityHistoryTable } from "@/components/admin/security/SecurityHistoryTable";
import { SecurityTestSelector } from "@/components/admin/security/SecurityTestSelector";
import { SecurityAgentSelector } from "@/components/admin/security/SecurityAgentSelector";
import { AutomationConfigDialog } from "@/components/security/AutomationConfigDialog";
import { AutomationHistoryTable } from "@/components/security/AutomationHistoryTable";
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

interface SecurityValidationProps {
  embedded?: boolean;
}

export default function SecurityValidation({ embedded = false }: SecurityValidationProps) {
  const [selectedTests, setSelectedTests] = useState<number[]>([]);
  const [selectedAgentId, setSelectedAgentId] = useState<string | null>(null);
  const [isRunning, setIsRunning] = useState(false);
  const [progress, setProgress] = useState(0);
  const [showClearDialog, setShowClearDialog] = useState(false);
  const [showOrphanDialog, setShowOrphanDialog] = useState(false);
  const [isClearing, setIsClearing] = useState(false);
  const [isCleaningOrphans, setIsCleaningOrphans] = useState(false);
  const [showAutomationDialog, setShowAutomationDialog] = useState(false);
  const [showHistoryDialog, setShowHistoryDialog] = useState(false);
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
        .select(`
          *,
          dify_agents (
            id,
            display_name,
            provider,
            model
          )
        `)
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
          agentId: selectedAgentId,
          systemVersion: 'v1.0',
        },
      });

      if (error) throw error;
      return data;
    },
    onSuccess: (data) => {
      setIsRunning(false);
      setProgress(100);
      
      toast.success('Validação iniciada com sucesso!', {
        description: `Run ID: ${data.runId || 'N/A'}. Acompanhe o progresso na lista abaixo.`,
      });

      // Polling para atualizar resultados em tempo real
      const pollInterval = setInterval(() => {
        queryClient.invalidateQueries({ queryKey: ['security-latest-run'] });
        queryClient.invalidateQueries({ queryKey: ['security-runs'] });
      }, 3000);

      // Parar polling após 2 minutos
      setTimeout(() => clearInterval(pollInterval), 120000);
      
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
      
      console.log('🔍 Tentando limpar histórico...');
      console.log('Session:', session ? 'Presente' : 'Ausente');
      
      if (!session) {
        throw new Error('Usuário não autenticado');
      }

      const { data, error } = await supabase.functions.invoke('delete-all-security-runs', {
        headers: {
          Authorization: `Bearer ${session.access_token}`
        }
      });

      console.log('Resposta:', { data, error });

      if (error) throw error;

      toast.success('Histórico limpo com sucesso', {
        description: `${data.deleted.validationRuns} execuções deletadas`,
      });

      queryClient.invalidateQueries({ queryKey: ['security-latest-run'] });
      queryClient.invalidateQueries({ queryKey: ['security-runs'] });
      setShowClearDialog(false);
    } catch (error: any) {
      console.error('❌ Erro ao limpar histórico:', error);
      toast.error('Erro ao limpar histórico', {
        description: error.message,
      });
    } finally {
      setIsClearing(false);
    }
  };

  const handleCleanOrphanRuns = async () => {
    setIsCleaningOrphans(true);
    try {
      console.log('🧹 Limpando órfãs...');

      // Marcar como failed todas as runs com status 'running' que têm mais de 10 minutos
      const tenMinutesAgo = new Date(Date.now() - 10 * 60 * 1000).toISOString();
      
      const { data, error } = await supabase
        .from('security_validation_runs')
        .update({
          status: 'failed',
          completed_at: new Date().toISOString(),
          error_message: 'Timeout: Execução cancelada automaticamente após 10 minutos'
        })
        .eq('status', 'running')
        .lt('started_at', tenMinutesAgo)
        .select();

      if (error) throw error;

      const orphanCount = data?.length || 0;
      
      if (orphanCount === 0) {
        toast.info('Nenhuma execução órfã encontrada');
      } else {
        toast.success('Execuções órfãs limpas', {
          description: `${orphanCount} execução(ões) marcada(s) como falha`,
        });
        queryClient.invalidateQueries({ queryKey: ['security-latest-run'] });
        queryClient.invalidateQueries({ queryKey: ['security-runs'] });
      }
      
      setShowOrphanDialog(false);
    } catch (error: any) {
      console.error('❌ Erro ao limpar órfãs:', error);
      toast.error('Erro ao limpar órfãs', {
        description: error.message,
      });
    } finally {
      setIsCleaningOrphans(false);
    }
  };

  const content = (
    <main className={embedded ? "space-y-8" : "container mx-auto px-4 py-8 space-y-8"}>
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className={embedded ? "text-2xl font-bold flex items-center gap-3" : "text-4xl font-bold flex items-center gap-3"}>
            <Shield className={embedded ? "h-6 w-6 text-primary" : "h-10 w-10 text-primary"} />
            Validação de Segurança
          </h1>
          <p className="text-muted-foreground mt-2">
            Sistema de testes automatizados contra Prompt Injection
          </p>
        </div>
        <div className="flex gap-2">
          <Button 
            variant="outline" 
            onClick={() => setShowAutomationDialog(true)}
            className="gap-2"
          >
            <Settings className="h-4 w-4" />
            Configurar Automação
          </Button>
          <Button 
            variant="outline" 
            onClick={() => setShowHistoryDialog(true)}
            className="gap-2"
          >
            <History className="h-4 w-4" />
            Histórico de Automações
          </Button>
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
          <SecurityAgentSelector
            selectedAgentId={selectedAgentId}
            onAgentChange={setSelectedAgentId}
          />

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
              <div className="flex gap-2">
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => setShowOrphanDialog(true)}
                  className="gap-2"
                >
                  <AlertTriangle className="h-4 w-4" />
                  Limpar Órfãs
                </Button>
                <Button
                  variant="destructive"
                  size="sm"
                  onClick={() => setShowClearDialog(true)}
                  className="gap-2"
                >
                  <Trash2 className="h-4 w-4" />
                  Limpar Tudo
                </Button>
              </div>
            )}
          </div>
        </CardHeader>
        <CardContent>
          <SecurityHistoryTable runs={runs || []} onRunDeleted={refetchRuns} />
        </CardContent>
      </Card>

      {/* Alert Dialog para limpar tudo */}
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

      {/* Alert Dialog para limpar órfãs */}
      <AlertDialog open={showOrphanDialog} onOpenChange={setShowOrphanDialog}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Limpar execuções órfãs?</AlertDialogTitle>
            <AlertDialogDescription>
              Esta ação irá marcar como "falha" todas as execuções com status "Em Execução" 
              que foram iniciadas há mais de 10 minutos. Use isso para limpar execuções travadas.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={isCleaningOrphans}>Cancelar</AlertDialogCancel>
            <AlertDialogAction
              onClick={handleCleanOrphanRuns}
              disabled={isCleaningOrphans}
              className="bg-orange-600 text-white hover:bg-orange-700"
            >
              {isCleaningOrphans ? "Limpando..." : "Limpar Órfãs"}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {/* Dialogs de Automação */}
      <AutomationConfigDialog
        open={showAutomationDialog}
        onOpenChange={setShowAutomationDialog}
        configType="simulation"
        onSuccess={() => {
          toast.success('Configuração de automação salva com sucesso!');
          queryClient.invalidateQueries({ queryKey: ['automation-configs'] });
        }}
      />

      {showHistoryDialog && (
        <AlertDialog open={showHistoryDialog} onOpenChange={setShowHistoryDialog}>
          <AlertDialogContent className="max-w-6xl max-h-[80vh] overflow-auto">
            <AlertDialogHeader>
              <AlertDialogTitle>Histórico de Automações - Simulação</AlertDialogTitle>
            </AlertDialogHeader>
            <AutomationHistoryTable />
            <AlertDialogFooter>
              <AlertDialogCancel>Fechar</AlertDialogCancel>
            </AlertDialogFooter>
          </AlertDialogContent>
        </AlertDialog>
      )}
    </main>
  );

  if (embedded) {
    return content;
  }

  return (
    <SimpleAuthGuard requiredRole="admin">
      <div className="min-h-screen bg-gradient-to-b from-background to-secondary/20">
        <Header />
        {content}
      </div>
    </SimpleAuthGuard>
  );
}
