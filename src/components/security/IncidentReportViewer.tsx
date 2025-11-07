import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { AlertTriangle, Shield, Download, User, MapPin, Clock, Activity, Bot } from "lucide-react";
import { format } from "date-fns";
import { ptBR } from "date-fns/locale";
import { cn } from "@/lib/utils";

interface IncidentReportViewerProps {
  report: any;
}

export function IncidentReportViewer({ report }: IncidentReportViewerProps) {
  const reportData = report.report_data as any;

  const handleDownloadReport = () => {
    const dataStr = JSON.stringify(reportData, null, 2);
    const dataBlob = new Blob([dataStr], { type: "application/json" });
    const url = URL.createObjectURL(dataBlob);
    const link = document.createElement("a");
    link.href = url;
    link.download = `security-report-${report.id}.json`;
    link.click();
  };

  const getSeverityColor = (level: string) => {
    switch (level) {
      case "critical":
        return "text-destructive";
      case "high":
        return "text-orange-500";
      case "medium":
        return "text-yellow-500";
      default:
        return "text-blue-500";
    }
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <Card className="border-destructive">
        <CardHeader>
          <div className="flex items-start justify-between">
            <div className="space-y-2">
              <div className="flex items-center gap-3">
                <AlertTriangle className="h-8 w-8 text-destructive" />
                <div>
                  <CardTitle className="text-2xl">
                    {reportData?.metadata?.title || "Relatório de Segurança"}
                  </CardTitle>
                  <CardDescription>
                    Relatório Forense #{report.id.slice(0, 8)}
                  </CardDescription>
                </div>
              </div>
              <div className="flex gap-2">
                <Badge variant="outline" className={getSeverityColor(report.threat_level)}>
                  {report.threat_level}
                </Badge>
                <Badge variant="outline">{report.status}</Badge>
              </div>
            </div>
            <Button onClick={handleDownloadReport} variant="outline">
              <Download className="h-4 w-4 mr-2" />
              Download JSON
            </Button>
          </div>
        </CardHeader>
      </Card>

      {/* Metadata */}
      <div className="grid gap-4 md:grid-cols-3">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Data do Incidente</CardTitle>
            <Clock className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-sm">
              {format(new Date(reportData?.metadata?.report_date), "dd/MM/yyyy HH:mm", { locale: ptBR })}
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Sessão</CardTitle>
            <Activity className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-sm font-mono">{report.session_id.slice(0, 16)}...</div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">IP do Atacante</CardTitle>
            <MapPin className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-sm">{reportData?.attacker_profile?.ip_address || "N/A"}</div>
          </CardContent>
        </Card>
      </div>

      {/* Main Content */}
      <Tabs defaultValue="overview" className="space-y-4">
        <TabsList className="grid w-full grid-cols-6">
          <TabsTrigger value="overview">Visão Geral</TabsTrigger>
          <TabsTrigger value="attacker">Perfil do Atacante</TabsTrigger>
          <TabsTrigger value="technical">Evidências Técnicas</TabsTrigger>
          <TabsTrigger value="conversation">Conversação</TabsTrigger>
          <TabsTrigger value="full-history">Histórico Completo</TabsTrigger>
          <TabsTrigger value="recommendations">Recomendações</TabsTrigger>
        </TabsList>

        <TabsContent value="overview" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>Classificação do Incidente</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div>
                <h4 className="font-semibold mb-2">Descrição</h4>
                <p className="text-sm text-muted-foreground">
                  {reportData?.incident_classification?.description}
                </p>
              </div>
              <div>
                <h4 className="font-semibold mb-2">Tipo de Ataque</h4>
                <p className="text-sm">{reportData?.attack_details?.attack_type}</p>
              </div>
              <div>
                <h4 className="font-semibold mb-2">Nível de Ameaça</h4>
                <Badge className={getSeverityColor(reportData?.incident_classification?.threat_level)}>
                  {reportData?.incident_classification?.threat_level}
                </Badge>
              </div>
              <div>
                <h4 className="font-semibold mb-2">Score de Ameaça</h4>
                <div className="text-2xl font-bold">
                  {reportData?.incident_classification?.threat_score}/100
                </div>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>Indicadores de Ameaça</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-2">
                {reportData?.threat_indicators?.map((indicator: any, index: number) => (
                  <div key={index} className="flex items-start gap-2">
                    <Badge variant="outline" className="mt-1">{indicator.type}</Badge>
                    <div className="flex-1">
                      <div className="font-medium">{indicator.indicator}</div>
                      <div className="text-sm text-muted-foreground">
                        Severidade: {indicator.severity}
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="attacker" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>Informações do Atacante</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid gap-4 md:grid-cols-2">
                <div>
                  <h4 className="font-semibold mb-2">Endereço IP</h4>
                  <p className="text-sm font-mono">{reportData?.attacker_profile?.ip_address}</p>
                </div>
                <div>
                  <h4 className="font-semibold mb-2">Localização</h4>
                  <p className="text-sm">{reportData?.attacker_profile?.location || "Não disponível"}</p>
                </div>
                <div>
                  <h4 className="font-semibold mb-2">User Agent</h4>
                  <p className="text-sm break-all">{reportData?.attacker_profile?.user_agent || "Não disponível"}</p>
                </div>
                <div>
                  <h4 className="font-semibold mb-2">Padrões de Comportamento</h4>
                  <div className="space-y-1">
                    {reportData?.attacker_profile?.behavior_patterns?.map((pattern: string, index: number) => (
                      <Badge key={index} variant="outline" className="mr-1">
                        {pattern}
                      </Badge>
                    ))}
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>Táticas Utilizadas</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-2">
                {reportData?.attack_details?.attack_vectors?.map((vector: string, index: number) => (
                  <div key={index} className="flex items-center gap-2">
                    <Shield className="h-4 w-4 text-muted-foreground" />
                    <span className="text-sm">{vector}</span>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="technical" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>Evidências Técnicas</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div>
                <h4 className="font-semibold mb-2">Logs do Sistema</h4>
                <pre className="bg-muted p-4 rounded-lg text-xs overflow-x-auto">
                  {JSON.stringify(reportData?.technical_evidence?.system_logs, null, 2)}
                </pre>
              </div>
              <div>
                <h4 className="font-semibold mb-2">Tentativas de Autenticação</h4>
                <pre className="bg-muted p-4 rounded-lg text-xs overflow-x-auto">
                  {JSON.stringify(reportData?.technical_evidence?.auth_attempts, null, 2)}
                </pre>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="conversation" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>Conversação do Ataque</CardTitle>
              <CardDescription>Mensagens trocadas durante o incidente</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                {reportData?.conversation_log?.map((msg: any, index: number) => (
                  <div key={index} className={`p-4 rounded-lg ${msg.role === 'user' ? 'bg-muted' : 'bg-primary/10'}`}>
                    <div className="flex items-center gap-2 mb-2">
                      <Badge variant="outline">{msg.role}</Badge>
                      <span className="text-xs text-muted-foreground">{msg.timestamp}</span>
                      {msg.flagged && (
                        <Badge variant="destructive" className="text-xs">Suspeito</Badge>
                      )}
                    </div>
                    <p className="text-sm">{msg.content}</p>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="full-history" className="space-y-4">
          <div className="space-y-4">
            <Card>
              <CardHeader>
                <CardTitle>Histórico Completo do Usuário</CardTitle>
                <CardDescription>
                  Todas as {reportData?.attacker_profile?.total_sessions || 0} sessões e {reportData?.attacker_profile?.total_messages || 0} mensagens do usuário investigado
                </CardDescription>
              </CardHeader>
            </Card>
            
            {reportData?.full_conversation_history?.map((session: any, idx: number) => (
              <Card key={idx} className="border-l-4 border-l-primary">
                <CardHeader>
                  <div className="flex items-start justify-between">
                    <div>
                      <CardTitle className="text-lg">
                        Sessão {idx + 1}: {session.session_title}
                      </CardTitle>
                      <CardDescription className="mt-1">
                        {format(new Date(session.session_date), "dd/MM/yyyy HH:mm", { locale: ptBR })} • Modelo: {session.model}
                      </CardDescription>
                    </div>
                    <Badge variant="outline">
                      {session.messages?.length || 0} mensagens
                    </Badge>
                  </div>
                </CardHeader>
                <CardContent>
                  <div className="space-y-3">
                    {session.messages?.map((msg: any, msgIdx: number) => {
                      const messageContent = msg.message?.content || '';
                      const messageRole = msg.message?.role || 'unknown';
                      
                      return (
                        <div
                          key={msgIdx}
                          className={cn(
                            "p-3 rounded-lg border",
                            messageRole === 'user' 
                              ? 'bg-blue-50 dark:bg-blue-950 border-blue-200 dark:border-blue-800' 
                              : 'bg-gray-50 dark:bg-gray-900 border-gray-200 dark:border-gray-800'
                          )}
                        >
                          <div className="flex items-center gap-2 mb-2">
                            {messageRole === 'user' ? (
                              <User className="h-4 w-4 text-blue-600 dark:text-blue-400" />
                            ) : (
                              <Bot className="h-4 w-4 text-gray-600 dark:text-gray-400" />
                            )}
                            <span className="text-xs font-medium">
                              {messageRole === 'user' ? 'Usuário' : 'Assistente'}
                            </span>
                            <span className="text-xs text-muted-foreground">
                              {format(new Date(msg.created_at), "HH:mm:ss", { locale: ptBR })}
                            </span>
                          </div>
                          <p className="text-sm whitespace-pre-wrap">{messageContent}</p>
                        </div>
                      );
                    })}
                  </div>
                </CardContent>
              </Card>
            ))}
            
            {(!reportData?.full_conversation_history || reportData.full_conversation_history.length === 0) && (
              <Card>
                <CardContent className="py-8 text-center text-muted-foreground">
                  Nenhum histórico de conversação disponível
                </CardContent>
              </Card>
            )}
          </div>
        </TabsContent>

        <TabsContent value="recommendations" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>Recomendações Imediatas</CardTitle>
            </CardHeader>
            <CardContent>
              <ul className="space-y-2">
                {reportData?.recommendations?.immediate_actions?.map((action: string, index: number) => (
                  <li key={index} className="flex items-start gap-2">
                    <Shield className="h-4 w-4 text-primary mt-1" />
                    <span className="text-sm">{action}</span>
                  </li>
                ))}
              </ul>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>Melhorias de Longo Prazo</CardTitle>
            </CardHeader>
            <CardContent>
              <ul className="space-y-2">
                {reportData?.recommendations?.long_term_improvements?.map((improvement: string, index: number) => (
                  <li key={index} className="flex items-start gap-2">
                    <Activity className="h-4 w-4 text-muted-foreground mt-1" />
                    <span className="text-sm">{improvement}</span>
                  </li>
                ))}
              </ul>
            </CardContent>
          </Card>

          <Card className="border-yellow-500 bg-yellow-500/5">
            <CardHeader>
              <CardTitle className="text-yellow-600">Aviso Legal</CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-sm text-muted-foreground">
                {reportData?.legal_notice}
              </p>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}
