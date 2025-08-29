import { useState, useEffect } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';
import { AlertTriangle, CheckCircle, Database, RefreshCw } from 'lucide-react';

interface TableUsageStats {
  table_name: string;
  usage_count: number;
  last_used: string;
  query_types: string[];
  coverage_percentage: number;
}

interface CoverageReport {
  timestamp: string;
  total_queries: number;
  table_usage: TableUsageStats[];
  coverage_gaps: string[];
  recommendations: string[];
  alert_level: 'info' | 'warning' | 'critical';
}

export function TableCoverageMonitor() {
  const { toast } = useToast();
  const [report, setReport] = useState<CoverageReport | null>(null);
  const [loading, setLoading] = useState(false);
  const [validationLogs, setValidationLogs] = useState<any[]>([]);

  const generateReport = async () => {
    setLoading(true);
    try {
      const { data, error } = await supabase.functions.invoke('table-coverage-monitor');
      
      if (error) throw error;
      
      setReport(data);
      
      toast({
        title: "📊 Relatório Gerado",
        description: `Cobertura analisada - Nível: ${data.alert_level.toUpperCase()}`,
      });
    } catch (error) {
      console.error('Error generating coverage report:', error);
      toast({
        title: "❌ Erro",
        description: "Erro ao gerar relatório de cobertura",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  const loadValidationLogs = async () => {
    try {
      const { data, error } = await supabase
        .from('sql_validation_logs')
        .select('*')
        .order('created_at', { ascending: false })
        .limit(10);
      
      if (error) throw error;
      setValidationLogs(data || []);
    } catch (error) {
      console.error('Error loading validation logs:', error);
    }
  };

  useEffect(() => {
    generateReport();
    loadValidationLogs();
  }, []);

  const getAlertColor = (level: string) => {
    switch (level) {
      case 'critical': return 'destructive';
      case 'warning': return 'secondary';
      default: return 'default';
    }
  };

  const getTableColor = (percentage: number) => {
    if (percentage === 0) return 'destructive';
    if (percentage < 10) return 'secondary';
    return 'default';
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold">📊 Monitoramento de Cobertura de Tabelas</h2>
          <p className="text-muted-foreground">
            Verifica se todas as tabelas estruturadas estão sendo utilizadas corretamente
          </p>
        </div>
        <Button 
          onClick={generateReport} 
          disabled={loading}
          className="flex items-center gap-2"
        >
          <RefreshCw className={`h-4 w-4 ${loading ? 'animate-spin' : ''}`} />
          Atualizar Relatório
        </Button>
      </div>

      {/* Alert Status */}
      {report && (
        <Alert variant={report.alert_level === 'critical' ? 'destructive' : 'default'}>
          <AlertTriangle className="h-4 w-4" />
          <AlertDescription>
            <strong>Status: {report.alert_level.toUpperCase()}</strong>
            {report.coverage_gaps.length > 0 && (
              <span className="ml-2">
                {report.coverage_gaps.length} problema(s) detectado(s)
              </span>
            )}
          </AlertDescription>
        </Alert>
      )}

      {/* Coverage Statistics */}
      {report && (
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-medium">Total de Queries</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{report.total_queries}</div>
              <p className="text-xs text-muted-foreground">Últimos 7 dias</p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-medium">Tabelas Ativas</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">
                {report.table_usage.filter(t => t.usage_count > 0).length}
              </div>
              <p className="text-xs text-muted-foreground">
                de {report.table_usage.length} disponíveis
              </p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-medium">Problemas</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold text-destructive">
                {report.coverage_gaps.length}
              </div>
              <p className="text-xs text-muted-foreground">Gaps detectados</p>
            </CardContent>
          </Card>
        </div>
      )}

      {/* Table Usage Details */}
      {report && (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Database className="h-5 w-5" />
              Uso por Tabela
            </CardTitle>
            <CardDescription>
              Distribuição de uso das tabelas estruturadas
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              {report.table_usage.map((table) => (
                <div key={table.table_name} className="flex items-center justify-between p-4 border rounded-lg">
                  <div className="flex-1">
                    <div className="flex items-center gap-2 mb-2">
                      <h3 className="font-medium">{table.table_name}</h3>
                      <Badge variant={getTableColor(table.coverage_percentage)}>
                        {table.coverage_percentage.toFixed(1)}%
                      </Badge>
                    </div>
                    <div className="flex items-center gap-4 text-sm text-muted-foreground">
                      <span>{table.usage_count} uses</span>
                      <span>
                        Tipos: {table.query_types.length > 0 ? table.query_types.join(', ') : 'Nenhum'}
                      </span>
                      <span>
                        Último uso: {table.last_used === 'never' ? 'Nunca' : new Date(table.last_used).toLocaleDateString()}
                      </span>
                    </div>
                  </div>
                  {table.usage_count === 0 && (
                    <AlertTriangle className="h-5 w-5 text-destructive" />
                  )}
                  {table.usage_count > 0 && (
                    <CheckCircle className="h-5 w-5 text-green-500" />
                  )}
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      )}

      {/* Coverage Gaps */}
      {report && report.coverage_gaps.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle className="text-destructive">🚨 Problemas Detectados</CardTitle>
            <CardDescription>
              Issues que precisam ser corrigidos
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-2">
              {report.coverage_gaps.map((gap, index) => (
                <Alert key={index} variant="destructive">
                  <AlertTriangle className="h-4 w-4" />
                  <AlertDescription>{gap}</AlertDescription>
                </Alert>
              ))}
            </div>
          </CardContent>
        </Card>
      )}

      {/* Recommendations */}
      {report && report.recommendations.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle className="text-blue-600">💡 Recomendações</CardTitle>
            <CardDescription>
              Ações sugeridas para melhorar a cobertura
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-2">
              {report.recommendations.map((recommendation, index) => (
                <div key={index} className="p-3 bg-blue-50 border border-blue-200 rounded-lg">
                  <p className="text-sm text-blue-800">{recommendation}</p>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      )}

      {/* Recent Validation Logs */}
      <Card>
        <CardHeader>
          <CardTitle>📋 Logs de Validação Recentes</CardTitle>
          <CardDescription>
            Últimas 10 validações SQL executadas
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="space-y-2">
            {validationLogs.map((log) => (
              <div key={log.id} className="flex items-center justify-between p-3 border rounded-lg">
                <div className="flex-1">
                  <div className="flex items-center gap-2 mb-1">
                    <Badge variant={log.is_valid ? 'default' : 'destructive'}>
                      {log.is_valid ? 'Válido' : 'Inválido'}
                    </Badge>
                    <Badge variant="outline">{log.query_type}</Badge>
                    <Badge variant="secondary">{log.table_used}</Badge>
                  </div>
                  <p className="text-sm text-muted-foreground truncate">
                    {log.query_text}
                  </p>
                  {!log.is_valid && log.issues && log.issues.length > 0 && (
                    <p className="text-xs text-destructive mt-1">
                      Issues: {log.issues.join(', ')}
                    </p>
                  )}
                </div>
                <div className="text-right text-xs text-muted-foreground">
                  {new Date(log.created_at).toLocaleString()}
                </div>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>
    </div>
  );
}