import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Shield, AlertTriangle, Eye, Download, CheckCircle2, Clock, Database } from "lucide-react";
import { IncidentReportViewer } from "@/components/security/IncidentReportViewer";
import { AdminRoleGuard } from "@/components/layout/AdminRoleGuard";
import { ProcessThreatsDialog } from "@/components/security/ProcessThreatsDialog";
import { ProcessThreatsResultsDialog } from "@/components/security/ProcessThreatsResultsDialog";
import { format } from "date-fns";
import { ptBR } from "date-fns/locale";
import { toast } from "sonner";

export default function SecurityIncidents() {
  const [selectedReportId, setSelectedReportId] = useState<string | null>(null);
  const [statusFilter, setStatusFilter] = useState<string>("all");
  const [severityFilter, setSeverityFilter] = useState<string>("all");
  const [showProcessDialog, setShowProcessDialog] = useState(false);
  const [showResultsDialog, setShowResultsDialog] = useState(false);
  const [isProcessing, setIsProcessing] = useState(false);
  const [processResults, setProcessResults] = useState<any>(null);

  const { data: incidents, isLoading } = useQuery({
    queryKey: ["security-incidents", statusFilter, severityFilter],
    queryFn: async () => {
      // Buscar intelligence_alerts
      const { data: alerts } = await supabase
        .from("intelligence_alerts")
        .select("*")
        .order("triggered_at", { ascending: false });

      // Buscar security_incident_reports
      let reportsQuery = supabase
        .from("security_incident_reports")
        .select("*")
        .order("created_at", { ascending: false });

      if (statusFilter !== "all") {
        reportsQuery = reportsQuery.eq("status", statusFilter);
      }
      if (severityFilter !== "all") {
        reportsQuery = reportsQuery.eq("threat_level", severityFilter);
      }

      const { data: reports } = await reportsQuery;

      // Combinar ambos em um único array
      const combined = [
        ...(reports || []).map(r => ({
          ...r,
          type: 'report',
          threat_level: r.threat_level,
          status: r.status || 'pending_review'
        })),
        ...(alerts || []).map(a => {
          const alertData = a.data as any;
          return {
            id: a.id,
            type: 'alert',
            threat_level: a.severity,
            status: a.acknowledged ? 'resolved' : 'pending_review',
            created_at: a.triggered_at,
            report_data: {
              metadata: { 
                title: a.title 
              },
              incident_classification: {
                description: a.description
              },
              attacker_profile: {
                full_name: alertData?.user_full_name || 'Desconhecido',
                email: alertData?.user_email || 'desconhecido',
                ip_address: alertData?.ip_address || 'Desconhecido',
                device_info: {
                  device_type: alertData?.device_type || 'unknown',
                  browser: alertData?.browser || 'unknown',
                  os: alertData?.os || 'unknown'
                }
              },
              attack_details: { 
                session_id: alertData?.session_id 
              }
            }
          };
        })
      ];

      // Aplicar filtros aos alerts combinados
      let filtered = combined;
      
      if (statusFilter !== "all") {
        filtered = filtered.filter(i => i.status === statusFilter);
      }
      if (severityFilter !== "all") {
        filtered = filtered.filter(i => i.threat_level === severityFilter);
      }

      // Ordenar por data
      return filtered.sort((a, b) => 
        new Date(b.created_at).getTime() - new Date(a.created_at).getTime()
      );
    },
  });

  const handleViewReport = (reportId: string) => {
    setSelectedReportId(reportId);
  };

  const handleUpdateStatus = async (incidentId: string, newStatus: string, incidentType: string) => {
    if (incidentType === 'alert') {
      // Atualizar intelligence_alerts
      const { error } = await supabase
        .from("intelligence_alerts")
        .update({ 
          acknowledged: newStatus === 'resolved',
          acknowledged_at: newStatus === 'resolved' ? new Date().toISOString() : null
        })
        .eq("id", incidentId);

      if (!error) {
        toast.success("Status do alerta atualizado");
        window.location.reload();
      } else {
        toast.error("Erro ao atualizar alerta");
      }
    } else {
      // Atualizar security_incident_reports
      const { error } = await supabase
        .from("security_incident_reports")
        .update({ 
          status: newStatus
        })
        .eq("id", incidentId);

      if (!error) {
        toast.success("Status do relatório atualizado");
        window.location.reload();
      } else {
        toast.error("Erro ao atualizar relatório");
      }
    }
  };

  const handleProcessThreats = async () => {
    setShowProcessDialog(false);
    setIsProcessing(true);
    
    toast.info("Iniciando processamento de ameaças históricas...");

    try {
      const { data, error } = await supabase.functions.invoke('process-historical-threats');

      if (error) throw error;

      setProcessResults(data);
      setShowResultsDialog(true);
      
      toast.success(`Processamento concluído! ${data.stats.alerts_created} alertas criados.`);
      
      // Recarregar lista de incidentes
      window.location.reload();
    } catch (error: any) {
      console.error('Erro ao processar ameaças:', error);
      toast.error(`Erro no processamento: ${error.message}`);
    } finally {
      setIsProcessing(false);
    }
  };

  const getSeverityConfig = (severity: string) => {
    switch (severity) {
      case "critical":
        return { icon: AlertTriangle, color: "text-destructive", bg: "bg-destructive/10" };
      case "high":
        return { icon: AlertTriangle, color: "text-orange-500", bg: "bg-orange-500/10" };
      case "medium":
        return { icon: Shield, color: "text-yellow-500", bg: "bg-yellow-500/10" };
      default:
        return { icon: Shield, color: "text-blue-500", bg: "bg-blue-500/10" };
    }
  };

  const getStatusConfig = (status: string) => {
    switch (status) {
      case "resolved":
        return { icon: CheckCircle2, color: "text-green-500", label: "Resolvido" };
      case "investigating":
        return { icon: Clock, color: "text-yellow-500", label: "Investigando" };
      case "false_positive":
        return { icon: CheckCircle2, color: "text-gray-500", label: "Falso Positivo" };
      default:
        return { icon: AlertTriangle, color: "text-orange-500", label: "Pendente" };
    }
  };

  if (selectedReportId) {
    const incident = incidents?.find(i => i.id === selectedReportId);
    
    // Se for um alert sem report, mostrar mensagem
    if (incident?.type === 'alert') {
      return (
        <AdminRoleGuard>
          <div className="container mx-auto py-6">
            <Button 
              variant="outline" 
              onClick={() => setSelectedReportId(null)}
              className="mb-4"
            >
              ← Voltar para lista
            </Button>
            <Card>
              <CardHeader>
                <CardTitle>Alerta de Segurança</CardTitle>
                <CardDescription>Este é um alerta detectado. Relatório forense não foi gerado ainda.</CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div>
                  <h3 className="font-semibold mb-2">{incident.report_data?.metadata?.title}</h3>
                  <p className="text-muted-foreground">{incident.report_data?.incident_classification?.description}</p>
                </div>
                <div className="grid gap-4 md:grid-cols-2">
                  <div>
                    <p className="text-sm font-medium">Email do Usuário</p>
                    <p className="text-sm text-muted-foreground">{incident.report_data?.attacker_profile?.email}</p>
                  </div>
                  <div>
                    <p className="text-sm font-medium">Endereço IP</p>
                    <p className="text-sm text-muted-foreground">{incident.report_data?.attacker_profile?.ip_address}</p>
                  </div>
                  <div>
                    <p className="text-sm font-medium">Nível de Ameaça</p>
                    <Badge variant="destructive">{incident.threat_level}</Badge>
                  </div>
                  <div>
                    <p className="text-sm font-medium">ID da Sessão</p>
                    <p className="text-sm text-muted-foreground font-mono text-xs">{incident.report_data?.attack_details?.session_id}</p>
                  </div>
                </div>
                <div className="pt-4">
                  <Button 
                    onClick={() => handleProcessThreats()}
                    className="w-full"
                  >
                    <Database className="h-4 w-4 mr-2" />
                    Processar e Gerar Relatório Forense
                  </Button>
                </div>
              </CardContent>
            </Card>
          </div>
        </AdminRoleGuard>
      );
    }
    
    return (
      <AdminRoleGuard>
        <div className="container mx-auto py-6">
          <Button 
            variant="outline" 
            onClick={() => setSelectedReportId(null)}
            className="mb-4"
          >
            ← Voltar para lista
          </Button>
          {incident && <IncidentReportViewer report={incident} />}
        </div>
      </AdminRoleGuard>
    );
  }

  return (
    <AdminRoleGuard>
      <div className="container mx-auto py-6 space-y-6">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-bold">Incidentes de Segurança</h1>
            <p className="text-muted-foreground">
              Relatórios forenses e alertas críticos
            </p>
          </div>
          <Button 
            onClick={() => setShowProcessDialog(true)}
            disabled={isProcessing}
            className="gap-2"
          >
            <Database className="h-4 w-4" />
            {isProcessing ? "Processando..." : "Processar Ameaças Históricas"}
          </Button>
        </div>

        <ProcessThreatsDialog 
          open={showProcessDialog}
          onOpenChange={setShowProcessDialog}
          onConfirm={handleProcessThreats}
        />

        <ProcessThreatsResultsDialog 
          open={showResultsDialog}
          onOpenChange={setShowResultsDialog}
          results={processResults}
        />

        {/* Metrics Cards */}
        <div className="grid gap-4 md:grid-cols-4">
          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Total</CardTitle>
              <Shield className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{incidents?.length || 0}</div>
            </CardContent>
          </Card>
          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Críticos</CardTitle>
              <AlertTriangle className="h-4 w-4 text-destructive" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold text-destructive">
                {incidents?.filter(i => i.threat_level === "critical").length || 0}
              </div>
            </CardContent>
          </Card>
          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Pendentes</CardTitle>
              <Clock className="h-4 w-4 text-orange-500" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold text-orange-500">
                {incidents?.filter(i => i.status === "pending_review").length || 0}
              </div>
            </CardContent>
          </Card>
          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Resolvidos</CardTitle>
              <CheckCircle2 className="h-4 w-4 text-green-500" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold text-green-500">
                {incidents?.filter(i => i.status === "resolved").length || 0}
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Filters */}
        <div className="flex gap-4">
          <Select value={statusFilter} onValueChange={setStatusFilter}>
            <SelectTrigger className="w-[200px]">
              <SelectValue placeholder="Status" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">Todos os Status</SelectItem>
              <SelectItem value="pending_review">Pendente</SelectItem>
              <SelectItem value="investigating">Investigando</SelectItem>
              <SelectItem value="resolved">Resolvido</SelectItem>
              <SelectItem value="false_positive">Falso Positivo</SelectItem>
            </SelectContent>
          </Select>

          <Select value={severityFilter} onValueChange={setSeverityFilter}>
            <SelectTrigger className="w-[200px]">
              <SelectValue placeholder="Severidade" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">Todas as Severidades</SelectItem>
              <SelectItem value="critical">Crítico</SelectItem>
              <SelectItem value="high">Alto</SelectItem>
              <SelectItem value="medium">Médio</SelectItem>
              <SelectItem value="low">Baixo</SelectItem>
            </SelectContent>
          </Select>
        </div>

        {/* Incidents List */}
        <Card>
          <CardHeader>
            <CardTitle>Relatórios de Incidentes</CardTitle>
            <CardDescription>
              Lista completa de incidentes detectados pelo sistema
            </CardDescription>
          </CardHeader>
          <CardContent>
            {isLoading ? (
              <div className="text-center py-8">Carregando...</div>
            ) : incidents?.length === 0 ? (
              <div className="text-center py-8 text-muted-foreground">
                Nenhum incidente encontrado
              </div>
            ) : (
              <div className="space-y-4">
                {incidents?.map((incident) => {
                  const severityConfig = getSeverityConfig(incident.threat_level);
                  const statusConfig = getStatusConfig(incident.status);
                  const SeverityIcon = severityConfig.icon;
                  const StatusIcon = statusConfig.icon;
                  const reportData = incident.report_data as any;

                  return (
                    <Card key={incident.id} className="hover:bg-muted/50 transition-colors">
                      <CardContent className="pt-6">
                        <div className="flex items-start justify-between gap-4">
                          <div className="flex gap-4 flex-1">
                            <div className={`p-3 rounded-lg ${severityConfig.bg}`}>
                              <SeverityIcon className={`h-6 w-6 ${severityConfig.color}`} />
                            </div>
                            <div className="flex-1">
                              <div className="flex items-center gap-2 mb-2">
                                <h3 className="font-semibold">
                                  {reportData?.metadata?.title || "Incidente de Segurança"}
                                </h3>
                                <Badge variant="outline" className={severityConfig.color}>
                                  {incident.threat_level}
                                </Badge>
                                <Badge variant="outline" className={statusConfig.color}>
                                  <StatusIcon className="h-3 w-3 mr-1" />
                                  {statusConfig.label}
                                </Badge>
                              </div>
                              <p className="text-sm text-muted-foreground mb-2">
                                {reportData?.incident_classification?.description || "Descrição não disponível"}
                              </p>
                              <div className="flex gap-4 text-xs text-muted-foreground">
                                <span>
                                  {format(new Date(incident.created_at), "dd/MM/yyyy HH:mm", { locale: ptBR })}
                                </span>
                                {reportData?.attacker_profile?.ip_address && (
                                  <span>IP: {reportData.attacker_profile.ip_address}</span>
                                )}
                              </div>
                            </div>
                          </div>
                          <div className="flex gap-2">
                            <Button
                              variant="outline"
                              size="sm"
                              onClick={() => handleViewReport(incident.id)}
                            >
                              <Eye className="h-4 w-4 mr-2" />
                              {incident.type === 'alert' ? 'Ver Detalhes' : 'Ver Relatório'}
                            </Button>
                            {incident.status === "pending_review" && (
                              <Button
                                variant="default"
                                size="sm"
                                onClick={() => handleUpdateStatus(incident.id, "investigating", incident.type)}
                              >
                                {incident.type === 'alert' ? 'Reconhecer' : 'Investigar'}
                              </Button>
                            )}
                          </div>
                        </div>
                      </CardContent>
                    </Card>
                  );
                })}
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </AdminRoleGuard>
  );
}
