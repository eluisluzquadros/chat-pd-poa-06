import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { CheckCircle2, XCircle, Clock, ChevronDown, ChevronUp, Filter } from "lucide-react";
import { formatDistanceToNow } from "date-fns";
import { ptBR } from "date-fns/locale";
import {
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
} from "@/components/ui/collapsible";

interface AutomationHistoryTableProps {
  configId?: string;
}

export function AutomationHistoryTable({ configId }: AutomationHistoryTableProps) {
  const [statusFilter, setStatusFilter] = useState<string>("all");
  const [expandedRow, setExpandedRow] = useState<string | null>(null);

  const { data: logs, isLoading, refetch } = useQuery({
    queryKey: ['automation-logs', configId, statusFilter],
    queryFn: async () => {
      let query = supabase
        .from('security_automation_logs')
        .select(`
          *,
          security_automation_configs (
            config_name,
            config_type
          )
        `)
        .order('started_at', { ascending: false })
        .limit(50);

      if (configId) {
        query = query.eq('config_id', configId);
      }

      if (statusFilter !== 'all') {
        query = query.eq('status', statusFilter);
      }

      const { data, error } = await query;

      if (error) throw error;
      return data;
    },
  });

  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'success':
        return (
          <Badge variant="default" className="bg-green-100 text-green-800 gap-1">
            <CheckCircle2 className="h-3 w-3" />
            Sucesso
          </Badge>
        );
      case 'failed':
        return (
          <Badge variant="destructive" className="gap-1">
            <XCircle className="h-3 w-3" />
            Falhou
          </Badge>
        );
      case 'running':
        return (
          <Badge variant="secondary" className="bg-blue-100 text-blue-800 gap-1">
            <Clock className="h-3 w-3 animate-spin" />
            Executando
          </Badge>
        );
      default:
        return <Badge variant="outline">{status}</Badge>;
    }
  };

  const getExecutionTypeBadge = (type: string) => {
    return type === 'simulation' ? (
      <Badge variant="outline" className="bg-purple-50 text-purple-700">
        Simulação
      </Badge>
    ) : (
      <Badge variant="outline" className="bg-cyan-50 text-cyan-700">
        Monitoramento
      </Badge>
    );
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
          <CardTitle>Histórico de Automações</CardTitle>
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

  if (!logs || logs.length === 0) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>Histórico de Automações</CardTitle>
          <CardDescription>Registro de execuções automáticas de segurança</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="text-center py-8 text-muted-foreground">
            <Clock className="h-12 w-12 mx-auto mb-4 opacity-50" />
            <p>Nenhuma execução encontrada</p>
            <p className="text-sm">As automações agendadas aparecerão aqui após serem executadas</p>
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader>
        <div className="flex items-center justify-between">
          <div>
            <CardTitle>Histórico de Automações</CardTitle>
            <CardDescription>
              {logs.length} {logs.length === 1 ? 'execução registrada' : 'execuções registradas'}
            </CardDescription>
          </div>
          <div className="flex gap-2">
            <Select value={statusFilter} onValueChange={setStatusFilter}>
              <SelectTrigger className="w-[180px]">
                <Filter className="h-4 w-4 mr-2" />
                <SelectValue placeholder="Filtrar por status" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">Todos os status</SelectItem>
                <SelectItem value="success">Sucesso</SelectItem>
                <SelectItem value="failed">Falhou</SelectItem>
                <SelectItem value="running">Executando</SelectItem>
              </SelectContent>
            </Select>
            <Button variant="outline" size="sm" onClick={() => refetch()}>
              Atualizar
            </Button>
          </div>
        </div>
      </CardHeader>
      <CardContent>
        <div className="rounded-md border">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Configuração</TableHead>
                <TableHead>Tipo</TableHead>
                <TableHead>Status</TableHead>
                <TableHead>Iniciado</TableHead>
                <TableHead>Duração</TableHead>
                <TableHead>Resultados</TableHead>
                <TableHead></TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {logs.map((log: any) => (
                <Collapsible
                  key={log.id}
                  open={expandedRow === log.id}
                  onOpenChange={() => setExpandedRow(expandedRow === log.id ? null : log.id)}
                  asChild
                >
                  <>
                    <TableRow>
                      <TableCell className="font-medium">
                        {log.security_automation_configs?.config_name || 'Configuração removida'}
                      </TableCell>
                      <TableCell>
                        {getExecutionTypeBadge(log.execution_type)}
                      </TableCell>
                      <TableCell>{getStatusBadge(log.status)}</TableCell>
                      <TableCell className="text-sm text-muted-foreground">
                        {formatDistanceToNow(new Date(log.started_at), {
                          addSuffix: true,
                          locale: ptBR,
                        })}
                      </TableCell>
                      <TableCell>
                        {log.duration_seconds ? formatDuration(log.duration_seconds) : '-'}
                      </TableCell>
                      <TableCell>
                        {log.status === 'success' && (
                          <div className="text-sm">
                            <span className="text-muted-foreground">
                              {log.alerts_created || 0} alertas, {log.reports_generated || 0} relatórios
                            </span>
                          </div>
                        )}
                        {log.status === 'failed' && (
                          <span className="text-sm text-red-600">Erro</span>
                        )}
                      </TableCell>
                      <TableCell>
                        <CollapsibleTrigger asChild>
                          <Button variant="ghost" size="sm">
                            {expandedRow === log.id ? (
                              <ChevronUp className="h-4 w-4" />
                            ) : (
                              <ChevronDown className="h-4 w-4" />
                            )}
                          </Button>
                        </CollapsibleTrigger>
                      </TableCell>
                    </TableRow>
                    <CollapsibleContent asChild>
                      <TableRow>
                        <TableCell colSpan={7}>
                          <div className="p-4 bg-muted/50 rounded-lg space-y-3">
                            {log.error_message && (
                              <div className="bg-red-50 border border-red-200 rounded p-3">
                                <p className="text-sm font-medium text-red-800">Erro:</p>
                                <p className="text-sm text-red-600 mt-1">{log.error_message}</p>
                              </div>
                            )}
                            
                            {log.results && (
                              <div>
                                <p className="text-sm font-medium mb-2">Detalhes da Execução:</p>
                                <pre className="text-xs bg-background p-3 rounded border overflow-x-auto">
                                  {JSON.stringify(log.results, null, 2)}
                                </pre>
                              </div>
                            )}

                            <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-sm">
                              <div>
                                <span className="text-muted-foreground">Alertas Criados:</span>
                                <div className="font-medium">{log.alerts_created || 0}</div>
                              </div>
                              <div>
                                <span className="text-muted-foreground">Relatórios:</span>
                                <div className="font-medium">{log.reports_generated || 0}</div>
                              </div>
                              <div>
                                <span className="text-muted-foreground">Notificações:</span>
                                <div className="font-medium">{log.notifications_sent || 0}</div>
                              </div>
                              <div>
                                <span className="text-muted-foreground">Run ID:</span>
                                <div className="font-mono text-xs truncate">{log.related_run_id || 'N/A'}</div>
                              </div>
                            </div>
                          </div>
                        </TableCell>
                      </TableRow>
                    </CollapsibleContent>
                  </>
                </Collapsible>
              ))}
            </TableBody>
          </Table>
        </div>
      </CardContent>
    </Card>
  );
}
