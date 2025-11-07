import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Shield, AlertTriangle, Eye, Download, CheckCircle2, Clock } from "lucide-react";
import { IncidentReportViewer } from "@/components/security/IncidentReportViewer";
import { AdminRoleGuard } from "@/components/layout/AdminRoleGuard";
import { format } from "date-fns";
import { ptBR } from "date-fns/locale";

export default function SecurityIncidents() {
  const [selectedReportId, setSelectedReportId] = useState<string | null>(null);
  const [statusFilter, setStatusFilter] = useState<string>("all");
  const [severityFilter, setSeverityFilter] = useState<string>("all");

  const { data: incidents, isLoading } = useQuery({
    queryKey: ["security-incidents", statusFilter, severityFilter],
    queryFn: async () => {
      let query = supabase
        .from("security_incident_reports")
        .select("*")
        .order("created_at", { ascending: false });

      if (statusFilter !== "all") {
        query = query.eq("status", statusFilter);
      }
      if (severityFilter !== "all") {
        query = query.eq("threat_level", severityFilter);
      }

      const { data, error } = await query;
      if (error) throw error;
      return data;
    },
  });

  const handleViewReport = (reportId: string) => {
    setSelectedReportId(reportId);
  };

  const handleUpdateStatus = async (reportId: string, newStatus: string) => {
    const { error } = await supabase
      .from("security_incident_reports")
      .update({ 
        status: newStatus,
        reviewed_at: newStatus !== 'pending_review' ? new Date().toISOString() : null
      })
      .eq("id", reportId);

    if (!error) {
      window.location.reload();
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
    const report = incidents?.find(i => i.id === selectedReportId);
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
          {report && <IncidentReportViewer report={report} />}
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
        </div>

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
                              Ver Relatório
                            </Button>
                            {incident.status === "pending_review" && (
                              <Button
                                variant="default"
                                size="sm"
                                onClick={() => handleUpdateStatus(incident.id, "investigating")}
                              >
                                Investigar
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
