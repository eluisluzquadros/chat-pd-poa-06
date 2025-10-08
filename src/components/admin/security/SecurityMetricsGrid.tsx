import { Card, CardContent } from "@/components/ui/card";
import { Progress } from "@/components/ui/progress";
import { CheckCircle, XCircle, AlertTriangle, Clock } from "lucide-react";

interface SecurityMetricsGridProps {
  run: any;
}

export function SecurityMetricsGrid({ run }: SecurityMetricsGridProps) {
  const getScoreColor = (score: number) => {
    if (score >= 95) return 'text-green-600';
    if (score >= 85) return 'text-yellow-600';
    return 'text-red-600';
  };

  const avgResponseTime = run.total_tests > 0 
    ? Math.round((run.completed_at && run.started_at 
        ? (new Date(run.completed_at).getTime() - new Date(run.started_at).getTime()) / run.total_tests 
        : 0))
    : 0;

  return (
    <Card>
      <CardContent className="pt-6 space-y-6">
        {/* Score Geral */}
        <div className="text-center space-y-3">
          <div className={`text-7xl font-bold ${getScoreColor(run.overall_score || 0)}`}>
            {run.overall_score ? run.overall_score.toFixed(1) : 0}%
          </div>
          <p className="text-sm text-muted-foreground font-medium">
            Score de Segurança Geral
          </p>
          <Progress value={run.overall_score || 0} className="h-4" />
        </div>

        {/* Métricas em Grid */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
          <div className="text-center p-6 rounded-lg bg-green-50 dark:bg-green-950 border border-green-200 dark:border-green-800">
            <div className="flex items-center justify-center gap-2 mb-3">
              <CheckCircle className="h-6 w-6 text-green-600" />
              <span className="text-3xl font-bold text-green-600">
                {run.passed_tests || 0}
              </span>
            </div>
            <p className="text-sm font-medium text-muted-foreground">Testes Passados</p>
            <p className="text-xs text-muted-foreground mt-1">
              {run.total_tests > 0 
                ? `${((run.passed_tests / run.total_tests) * 100).toFixed(1)}%` 
                : '0%'}
            </p>
          </div>

          <div className="text-center p-6 rounded-lg bg-red-50 dark:bg-red-950 border border-red-200 dark:border-red-800">
            <div className="flex items-center justify-center gap-2 mb-3">
              <XCircle className="h-6 w-6 text-red-600" />
              <span className="text-3xl font-bold text-red-600">
                {run.failed_tests || 0}
              </span>
            </div>
            <p className="text-sm font-medium text-muted-foreground">Testes Falhados</p>
            <p className="text-xs text-muted-foreground mt-1">
              {run.total_tests > 0 
                ? `${((run.failed_tests / run.total_tests) * 100).toFixed(1)}%` 
                : '0%'}
            </p>
          </div>

          <div className="text-center p-6 rounded-lg bg-orange-50 dark:bg-orange-950 border border-orange-200 dark:border-orange-800">
            <div className="flex items-center justify-center gap-2 mb-3">
              <AlertTriangle className="h-6 w-6 text-orange-600" />
              <span className="text-3xl font-bold text-orange-600">
                {run.critical_failures || 0}
              </span>
            </div>
            <p className="text-sm font-medium text-muted-foreground">Falhas Críticas</p>
            <p className="text-xs text-red-600 font-semibold mt-1">
              Severidade Alta
            </p>
          </div>

          <div className="text-center p-6 rounded-lg bg-blue-50 dark:bg-blue-950 border border-blue-200 dark:border-blue-800">
            <div className="flex items-center justify-center gap-2 mb-3">
              <Clock className="h-6 w-6 text-blue-600" />
              <span className="text-3xl font-bold text-blue-600">
                {avgResponseTime}
              </span>
            </div>
            <p className="text-sm font-medium text-muted-foreground">Tempo Médio</p>
            <p className="text-xs text-muted-foreground mt-1">
              milissegundos por teste
            </p>
          </div>
        </div>

        {/* Alerta de Falhas Críticas */}
        {run.critical_failures > 0 && (
          <div className="p-4 rounded-lg bg-red-50 dark:bg-red-950 border-2 border-red-500">
            <div className="flex items-start gap-3">
              <AlertTriangle className="h-6 w-6 text-red-600 mt-0.5 flex-shrink-0" />
              <div>
                <h4 className="font-bold text-red-900 dark:text-red-100 text-lg">
                  ⚠️ Vulnerabilidades Críticas Detectadas
                </h4>
                <p className="text-sm text-red-700 dark:text-red-300 mt-2">
                  {run.critical_failures} teste(s) de severidade ALTA falharam, indicando 
                  vulnerabilidades críticas de segurança. Análise imediata e correção são 
                  necessárias antes de qualquer deploy em produção.
                </p>
              </div>
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  );
}
