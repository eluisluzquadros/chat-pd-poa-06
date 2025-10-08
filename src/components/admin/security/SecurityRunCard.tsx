import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { CheckCircle, XCircle, AlertTriangle, Clock } from "lucide-react";
import { format } from "date-fns";
import { ptBR } from "date-fns/locale";

interface SecurityRunCardProps {
  run: any;
}

export function SecurityRunCard({ run }: SecurityRunCardProps) {
  const getStatusBadge = () => {
    if (run.status === 'running') {
      return <Badge variant="outline" className="bg-blue-50">Em Execução</Badge>;
    }
    if (run.status === 'completed') {
      return <Badge variant="outline" className="bg-green-50">Concluído</Badge>;
    }
    return <Badge variant="destructive">Falhou</Badge>;
  };

  const getScoreColor = (score: number) => {
    if (score >= 95) return 'text-green-600';
    if (score >= 85) return 'text-yellow-600';
    return 'text-red-600';
  };

  return (
    <Card className="border-2">
      <CardHeader>
        <div className="flex items-center justify-between">
          <CardTitle>Última Validação</CardTitle>
          {getStatusBadge()}
        </div>
      </CardHeader>
      <CardContent className="space-y-6">
        {/* Score Geral */}
        <div className="text-center space-y-2">
          <div className={`text-6xl font-bold ${getScoreColor(run.overall_score || 0)}`}>
            {run.overall_score ? run.overall_score.toFixed(1) : 0}%
          </div>
          <p className="text-sm text-muted-foreground">Score de Segurança</p>
          <Progress 
            value={run.overall_score || 0} 
            className="h-3 mt-2"
          />
        </div>

        {/* Métricas */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
          <div className="text-center p-4 rounded-lg bg-green-50 dark:bg-green-950">
            <div className="flex items-center justify-center gap-2 mb-2">
              <CheckCircle className="h-5 w-5 text-green-600" />
              <span className="text-2xl font-bold text-green-600">
                {run.passed_tests || 0}
              </span>
            </div>
            <p className="text-sm text-muted-foreground">Passou</p>
          </div>

          <div className="text-center p-4 rounded-lg bg-red-50 dark:bg-red-950">
            <div className="flex items-center justify-center gap-2 mb-2">
              <XCircle className="h-5 w-5 text-red-600" />
              <span className="text-2xl font-bold text-red-600">
                {run.failed_tests || 0}
              </span>
            </div>
            <p className="text-sm text-muted-foreground">Falhou</p>
          </div>

          <div className="text-center p-4 rounded-lg bg-yellow-50 dark:bg-yellow-950">
            <div className="flex items-center justify-center gap-2 mb-2">
              <AlertTriangle className="h-5 w-5 text-yellow-600" />
              <span className="text-2xl font-bold text-yellow-600">
                {run.partial_tests || 0}
              </span>
            </div>
            <p className="text-sm text-muted-foreground">Parcial</p>
          </div>

          <div className="text-center p-4 rounded-lg bg-orange-50 dark:bg-orange-950">
            <div className="flex items-center justify-center gap-2 mb-2">
              <AlertTriangle className="h-5 w-5 text-orange-600" />
              <span className="text-2xl font-bold text-orange-600">
                {run.critical_failures || 0}
              </span>
            </div>
            <p className="text-sm text-muted-foreground">Críticas</p>
          </div>
        </div>

        {/* Informações */}
        <div className="text-sm space-y-1 text-muted-foreground">
          <div className="flex items-center gap-2">
            <Clock className="h-4 w-4" />
            <span>
              {run.started_at && format(new Date(run.started_at), "PPp", { locale: ptBR })}
            </span>
          </div>
          <div>Versão: {run.system_version || 'v1.0'}</div>
          <div>Total de Testes: {run.total_tests || 0}</div>
        </div>

        {/* Alerta de Falhas Críticas */}
        {run.critical_failures > 0 && (
          <div className="p-4 rounded-lg bg-red-50 dark:bg-red-950 border border-red-200 dark:border-red-800">
            <div className="flex items-start gap-3">
              <AlertTriangle className="h-5 w-5 text-red-600 mt-0.5" />
              <div>
                <h4 className="font-semibold text-red-900 dark:text-red-100">
                  Vulnerabilidades Críticas Detectadas
                </h4>
                <p className="text-sm text-red-700 dark:text-red-300 mt-1">
                  {run.critical_failures} teste(s) crítico(s) falharam. 
                  Análise e correção urgentes são necessárias antes de deploy em produção.
                </p>
              </div>
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  );
}
