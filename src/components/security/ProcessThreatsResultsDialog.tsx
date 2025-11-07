import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { 
  CheckCircle2, 
  AlertTriangle, 
  FileText, 
  Filter, 
  Shield, 
  Users,
  TestTube,
  Ban,
  MessageSquare,
  Mail
} from "lucide-react";

interface ProcessThreatsResultsDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  results: any;
}

export function ProcessThreatsResultsDialog({ 
  open, 
  onOpenChange, 
  results 
}: ProcessThreatsResultsDialogProps) {
  if (!results) return null;

  const stats = results.stats;
  const totalFiltered = 
    (stats.filtered_by_role || 0) + 
    (stats.filtered_by_automated_tests || 0) + 
    (stats.filtered_by_blocked || 0) + 
    (stats.filtered_by_test_keywords || 0);

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-3xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <CheckCircle2 className="h-6 w-6 text-green-500" />
            Processamento Concluído
          </DialogTitle>
          <DialogDescription>
            Análise de ameaças históricas finalizada com sucesso
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4">
          {/* Summary Cards */}
          <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
            <Card>
              <CardHeader className="pb-2">
                <CardTitle className="text-sm font-medium flex items-center gap-2">
                  <MessageSquare className="h-4 w-4 text-muted-foreground" />
                  Total
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">{stats.total_scanned}</div>
                <p className="text-xs text-muted-foreground">mensagens</p>
              </CardContent>
            </Card>

            <Card>
              <CardHeader className="pb-2">
                <CardTitle className="text-sm font-medium flex items-center gap-2">
                  <AlertTriangle className="h-4 w-4 text-destructive" />
                  Alertas
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold text-destructive">
                  {stats.alerts_created}
                </div>
                <p className="text-xs text-muted-foreground">criados</p>
              </CardContent>
            </Card>

            <Card>
              <CardHeader className="pb-2">
                <CardTitle className="text-sm font-medium flex items-center gap-2">
                  <FileText className="h-4 w-4 text-blue-500" />
                  Relatórios
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold text-blue-500">
                  {stats.reports_generated}
                </div>
                <p className="text-xs text-muted-foreground">gerados</p>
              </CardContent>
            </Card>

            <Card>
              <CardHeader className="pb-2">
                <CardTitle className="text-sm font-medium flex items-center gap-2">
                  <Filter className="h-4 w-4 text-orange-500" />
                  Filtradas
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold text-orange-500">
                  {totalFiltered}
                </div>
                <p className="text-xs text-muted-foreground">mensagens</p>
              </CardContent>
            </Card>
          </div>

          {/* Detailed Filters Breakdown */}
          <Card>
            <CardHeader>
              <CardTitle className="text-base flex items-center gap-2">
                <Filter className="h-5 w-5" />
                Detalhamento dos Filtros Aplicados
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-3">
              <div className="flex items-center justify-between p-3 bg-muted/50 rounded-lg">
                <div className="flex items-center gap-3">
                  <Users className="h-5 w-5 text-blue-500" />
                  <div>
                    <p className="font-medium">Roles Privilegiadas</p>
                    <p className="text-sm text-muted-foreground">
                      Admins e supervisores
                    </p>
                  </div>
                </div>
                <Badge variant="outline" className="text-lg">
                  {stats.filtered_by_role || 0}
                </Badge>
              </div>

              <div className="flex items-center justify-between p-3 bg-muted/50 rounded-lg">
                <div className="flex items-center gap-3">
                  <TestTube className="h-5 w-5 text-purple-500" />
                  <div>
                    <p className="font-medium">Testes Automatizados</p>
                    <p className="text-sm text-muted-foreground">
                      Validações de segurança
                    </p>
                  </div>
                </div>
                <Badge variant="outline" className="text-lg">
                  {stats.filtered_by_automated_tests || 0}
                </Badge>
              </div>

              <div className="flex items-center justify-between p-3 bg-muted/50 rounded-lg">
                <div className="flex items-center gap-3">
                  <Ban className="h-5 w-5 text-red-500" />
                  <div>
                    <p className="font-medium">Mensagens Bloqueadas</p>
                    <p className="text-sm text-muted-foreground">
                      Já rejeitadas pelo sistema
                    </p>
                  </div>
                </div>
                <Badge variant="outline" className="text-lg">
                  {stats.filtered_by_blocked || 0}
                </Badge>
              </div>

              <div className="flex items-center justify-between p-3 bg-muted/50 rounded-lg">
                <div className="flex items-center gap-3">
                  <MessageSquare className="h-5 w-5 text-orange-500" />
                  <div>
                    <p className="font-medium">Keywords de Teste</p>
                    <p className="text-sm text-muted-foreground">
                      Mensagens de debug/teste
                    </p>
                  </div>
                </div>
                <Badge variant="outline" className="text-lg">
                  {stats.filtered_by_test_keywords || 0}
                </Badge>
              </div>

              <div className="flex items-center justify-between p-3 bg-green-500/10 rounded-lg border border-green-500/20">
                <div className="flex items-center gap-3">
                  <Shield className="h-5 w-5 text-green-500" />
                  <div>
                    <p className="font-medium text-green-500">Mensagens Legítimas</p>
                    <p className="text-sm text-muted-foreground">
                      Não são ameaças
                    </p>
                  </div>
                </div>
                <Badge variant="outline" className="text-lg border-green-500/20">
                  {stats.legitimate_messages || 0}
                </Badge>
              </div>
            </CardContent>
          </Card>

          {/* Alerts Created */}
          {stats.alerts_created > 0 && (
            <Card className="border-destructive/20">
              <CardHeader>
                <CardTitle className="text-base flex items-center gap-2 text-destructive">
                  <AlertTriangle className="h-5 w-5" />
                  Ações Executadas
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-2">
                <div className="flex items-center gap-2 text-sm">
                  <CheckCircle2 className="h-4 w-4 text-destructive" />
                  <span>{stats.alerts_created} alertas críticos criados</span>
                </div>
                <div className="flex items-center gap-2 text-sm">
                  <CheckCircle2 className="h-4 w-4 text-blue-500" />
                  <span>{stats.reports_generated} relatórios forenses gerados</span>
                </div>
                <div className="flex items-center gap-2 text-sm">
                  <Mail className="h-4 w-4 text-orange-500" />
                  <span>Emails de notificação enviados aos administradores</span>
                </div>
                <div className="flex items-center gap-2 text-sm">
                  <Ban className="h-4 w-4 text-red-500" />
                  <span>Contas comprometidas desativadas automaticamente</span>
                </div>
              </CardContent>
            </Card>
          )}

          {/* No Threats Found */}
          {stats.alerts_created === 0 && (
            <Card className="border-green-500/20 bg-green-500/5">
              <CardContent className="pt-6">
                <div className="flex items-center gap-3">
                  <Shield className="h-8 w-8 text-green-500" />
                  <div>
                    <p className="font-semibold text-green-500">
                      Nenhuma ameaça real detectada
                    </p>
                    <p className="text-sm text-muted-foreground">
                      Todas as mensagens processadas são legítimas ou foram filtradas corretamente.
                      O sistema de segurança está funcionando perfeitamente!
                    </p>
                  </div>
                </div>
              </CardContent>
            </Card>
          )}

          {/* Errors */}
          {stats.errors > 0 && (
            <Card className="border-orange-500/20">
              <CardHeader>
                <CardTitle className="text-base flex items-center gap-2 text-orange-500">
                  <AlertTriangle className="h-5 w-5" />
                  Avisos
                </CardTitle>
              </CardHeader>
              <CardContent>
                <p className="text-sm">
                  {stats.errors} erro(s) ocorreram durante o processamento. 
                  Verifique os logs do Edge Function para mais detalhes.
                </p>
              </CardContent>
            </Card>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
}
