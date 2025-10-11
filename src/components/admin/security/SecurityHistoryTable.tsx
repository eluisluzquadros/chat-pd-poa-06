import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Eye, FileDown, Trash2, Bot } from "lucide-react";
import { format } from "date-fns";
import { ptBR } from "date-fns/locale";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import { useState } from "react";
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

interface SecurityHistoryTableProps {
  runs: any[];
  onRunDeleted?: () => void;
}

export function SecurityHistoryTable({ runs, onRunDeleted }: SecurityHistoryTableProps) {
  const navigate = useNavigate();
  const { toast } = useToast();
  const [deleteRunId, setDeleteRunId] = useState<string | null>(null);
  const [isDeleting, setIsDeleting] = useState(false);

  const handleDelete = async () => {
    if (!deleteRunId) return;
    
    setIsDeleting(true);
    try {
      // Obter token do usuário autenticado
      const { data: { session } } = await supabase.auth.getSession();
      
      if (!session) {
        throw new Error('Usuário não autenticado');
      }

      // Passar token no header Authorization
      const { data, error } = await supabase.functions.invoke('delete-security-run', {
        body: { runId: deleteRunId },
        headers: {
          Authorization: `Bearer ${session.access_token}`
        }
      });

      if (error) throw error;

      toast({
        title: "Sucesso",
        description: "Validação deletada com sucesso",
      });

      setDeleteRunId(null);
      onRunDeleted?.();
    } catch (error) {
      console.error('Erro ao deletar:', error);
      toast({
        title: "Erro",
        description: error.message || "Erro ao deletar validação",
        variant: "destructive",
      });
    } finally {
      setIsDeleting(false);
    }
  };

  const getScoreBadge = (score: number) => {
    if (score >= 95) {
      return <Badge className="bg-green-100 text-green-800 hover:bg-green-200">{score.toFixed(1)}%</Badge>;
    }
    if (score >= 85) {
      return <Badge className="bg-yellow-100 text-yellow-800 hover:bg-yellow-200">{score.toFixed(1)}%</Badge>;
    }
    return <Badge className="bg-red-100 text-red-800 hover:bg-red-200">{score.toFixed(1)}%</Badge>;
  };

  const getStatusBadge = (status: string) => {
    if (status === 'completed') {
      return <Badge variant="outline" className="bg-green-50">Concluído</Badge>;
    }
    if (status === 'running') {
      return <Badge variant="outline" className="bg-blue-50">Em Execução</Badge>;
    }
    return <Badge variant="destructive">Falhou</Badge>;
  };

  if (runs.length === 0) {
    return (
      <div className="text-center py-8 text-muted-foreground">
        Nenhuma validação executada ainda
      </div>
    );
  }

  return (
    <>
      <Table>
      <TableHeader>
        <TableRow>
          <TableHead>Data</TableHead>
          <TableHead>Agente</TableHead>
          <TableHead>Versão</TableHead>
          <TableHead>Score</TableHead>
          <TableHead className="text-center">Passou</TableHead>
          <TableHead className="text-center">Falhou</TableHead>
          <TableHead className="text-center">Críticas</TableHead>
          <TableHead>Status</TableHead>
          <TableHead className="text-right">Ações</TableHead>
        </TableRow>
      </TableHeader>
      <TableBody>
        {runs.map((run) => (
          <TableRow key={run.id}>
            <TableCell>
              {run.started_at && format(new Date(run.started_at), "dd/MM/yyyy HH:mm", { locale: ptBR })}
            </TableCell>
            <TableCell>
              {run.dify_agents ? (
                <Badge variant="secondary" className="text-xs gap-1">
                  <Bot className="h-3 w-3" />
                  {run.dify_agents.display_name}
                </Badge>
              ) : (
                <Badge variant="outline" className="text-xs">Padrão</Badge>
              )}
            </TableCell>
            <TableCell>
              <Badge variant="outline">{run.system_version || 'v1.0'}</Badge>
            </TableCell>
            <TableCell>
              {run.overall_score !== null && getScoreBadge(run.overall_score)}
            </TableCell>
            <TableCell className="text-center font-medium text-green-600">
              {run.passed_tests || 0}
            </TableCell>
            <TableCell className="text-center font-medium text-red-600">
              {run.failed_tests || 0}
            </TableCell>
            <TableCell className="text-center font-medium text-orange-600">
              {run.critical_failures || 0}
            </TableCell>
            <TableCell>
              {getStatusBadge(run.status)}
            </TableCell>
            <TableCell className="text-right">
              <div className="flex gap-2 justify-end">
                <Button
                  size="sm"
                  variant="ghost"
                  onClick={() => navigate(`/admin/security/runs/${run.id}`)}
                >
                  <Eye className="h-4 w-4" />
                </Button>
                <Button
                  size="sm"
                  variant="ghost"
                  disabled
                >
                  <FileDown className="h-4 w-4" />
                </Button>
                <Button
                  size="sm"
                  variant="ghost"
                  onClick={() => setDeleteRunId(run.id)}
                  className="text-destructive hover:text-destructive hover:bg-destructive/10"
                >
                  <Trash2 className="h-4 w-4" />
                </Button>
              </div>
            </TableCell>
          </TableRow>
        ))}
      </TableBody>
      </Table>

      <AlertDialog open={!!deleteRunId} onOpenChange={(open) => !open && setDeleteRunId(null)}>
      <AlertDialogContent>
        <AlertDialogHeader>
          <AlertDialogTitle>Confirmar exclusão</AlertDialogTitle>
          <AlertDialogDescription>
            Tem certeza que deseja deletar esta validação de segurança? 
            Esta ação não pode ser desfeita e todos os resultados detalhados serão perdidos.
          </AlertDialogDescription>
        </AlertDialogHeader>
        <AlertDialogFooter>
          <AlertDialogCancel disabled={isDeleting}>Cancelar</AlertDialogCancel>
          <AlertDialogAction 
            onClick={handleDelete}
            disabled={isDeleting}
            className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
          >
            {isDeleting ? "Deletando..." : "Deletar"}
          </AlertDialogAction>
        </AlertDialogFooter>
      </AlertDialogContent>
      </AlertDialog>
    </>
  );
}
