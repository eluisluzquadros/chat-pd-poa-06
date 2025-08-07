// Simplified Quality dashboard that only uses existing tables
import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { supabase } from '@/integrations/supabase/client';
import { QAErrorAnalysis } from '@/components/admin/QAErrorAnalysis';
import { QAModelComparison } from '@/components/admin/QAModelComparison';
import { QAKnowledgeGaps } from '@/components/admin/QAKnowledgeGaps';
import { QAExecutionHistory } from '@/components/admin/QAExecutionHistory';
import { QATestCasesList } from '@/components/admin/QATestCasesList';
import { QAModelDashboard } from '@/components/admin/QAModelDashboard';
import { ValidationOptionsDialog } from '@/components/admin/ValidationOptionsDialog';
import { MultiModelExecutionDialog } from '@/components/admin/MultiModelExecutionDialog';
import { RefreshCw } from 'lucide-react';

export default function Quality() {
  const [metrics, setMetrics] = useState({
    totalValidationRuns: 0,
    avgAccuracy: 0,
    totalTestCases: 0,
    avgResponseTime: 0
  });
  const [isLoading, setIsLoading] = useState(true);

  const fetchMetrics = async () => {
    try {
      setIsLoading(true);
      
      // Get metrics from existing QA tables
      const { data: runs } = await supabase
        .from('qa_validation_runs')
        .select('*')
        .order('started_at', { ascending: false })
        .limit(10);

      const { data: testCases } = await supabase
        .from('qa_test_cases')
        .select('*', { count: 'exact' });

      if (runs && runs.length > 0) {
        const avgAccuracy = runs.reduce((sum, run) => sum + (run.overall_accuracy || 0), 0) / runs.length;
        const avgResponseTime = runs.reduce((sum, run) => sum + (run.avg_response_time_ms || 0), 0) / runs.length;
        
        setMetrics({
          totalValidationRuns: runs.length,
          avgAccuracy: Math.round(avgAccuracy * 100),
          totalTestCases: testCases?.length || 0,
          avgResponseTime: Math.round(avgResponseTime)
        });
      } else {
        // Fallback metrics when no validation runs exist
        setMetrics({
          totalValidationRuns: 0,
          avgAccuracy: 0,
          totalTestCases: testCases?.length || 0,
          avgResponseTime: 0
        });
      }
    } catch (error) {
      console.error('Error fetching metrics:', error);
      setMetrics({
        totalValidationRuns: 0,
        avgAccuracy: 0,
        totalTestCases: 0,
        avgResponseTime: 0
      });
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchMetrics();
  }, []);

  return (
    <div className="space-y-6 p-6">
      {/* Header with actions */}
      <div className="flex justify-between items-center mb-6">
        <div className="space-y-1">
          <h1 className="text-3xl font-bold tracking-tight">Dashboard de Qualidade QA</h1>
          <p className="text-muted-foreground">Monitore e execute validações de qualidade do sistema</p>
        </div>
        <div className="flex gap-3">
          <Button variant="outline" onClick={fetchMetrics} size="sm">
            <RefreshCw className="h-4 w-4 mr-2" />
            Atualizar
          </Button>
          <ValidationOptionsDialog onValidationComplete={fetchMetrics} />
          <MultiModelExecutionDialog />
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
        <Card className="p-6">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-4">
            <CardTitle className="text-sm font-medium text-muted-foreground">Execuções QA</CardTitle>
          </CardHeader>
          <CardContent className="p-0">
            <div className="text-3xl font-bold">
              {isLoading ? '...' : metrics.totalValidationRuns}
            </div>
            <p className="text-sm text-muted-foreground mt-2">
              Total de validações executadas
            </p>
          </CardContent>
        </Card>

        <Card className="p-6">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-4">
            <CardTitle className="text-sm font-medium text-muted-foreground">Acurácia Média</CardTitle>
          </CardHeader>
          <CardContent className="p-0">
            <div className="text-3xl font-bold">
              {isLoading ? '...' : `${metrics.avgAccuracy}%`}
            </div>
            <Badge 
              variant={metrics.avgAccuracy >= 80 ? 'default' : 'destructive'}
              className="mt-2"
            >
              {metrics.avgAccuracy >= 80 ? 'Boa' : 'Baixa'}
            </Badge>
          </CardContent>
        </Card>

        <Card className="p-6">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-4">
            <CardTitle className="text-sm font-medium text-muted-foreground">Casos de Teste</CardTitle>
          </CardHeader>
          <CardContent className="p-0">
            <div className="text-3xl font-bold">
              {isLoading ? '...' : metrics.totalTestCases}
            </div>
            <p className="text-sm text-muted-foreground mt-2">
              Total disponível
            </p>
          </CardContent>
        </Card>

        <Card className="p-6">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-4">
            <CardTitle className="text-sm font-medium text-muted-foreground">Tempo Resposta</CardTitle>
          </CardHeader>
          <CardContent className="p-0">
            <div className="text-3xl font-bold">
              {isLoading ? '...' : `${metrics.avgResponseTime}ms`}
            </div>
            <Badge 
              variant={metrics.avgResponseTime <= 3000 ? 'default' : 'destructive'}
              className="mt-2"
            >
              {metrics.avgResponseTime <= 3000 ? 'Rápido' : 'Lento'}
            </Badge>
          </CardContent>
        </Card>
      </div>

      <Tabs defaultValue="execution" className="space-y-6">
        <TabsList className="grid w-full grid-cols-6 h-12">
          <TabsTrigger value="execution" className="text-sm">Execuções</TabsTrigger>
          <TabsTrigger value="testcases" className="text-sm">Casos de Teste</TabsTrigger>
          <TabsTrigger value="models" className="text-sm">Modelos</TabsTrigger>
          <TabsTrigger value="analysis" className="text-sm">Análise</TabsTrigger>
          <TabsTrigger value="comparison" className="text-sm">Comparação</TabsTrigger>
          <TabsTrigger value="gaps" className="text-sm">Gaps</TabsTrigger>
        </TabsList>

        <TabsContent value="execution" className="space-y-4">
          <QAExecutionHistory />
        </TabsContent>

        <TabsContent value="testcases" className="space-y-4">
          <QATestCasesList />
        </TabsContent>

        <TabsContent value="models" className="space-y-4">
          <QAModelDashboard />
        </TabsContent>

        <TabsContent value="analysis" className="space-y-4">
          <QAErrorAnalysis />
        </TabsContent>

        <TabsContent value="comparison" className="space-y-4">
          <QAModelComparison />
        </TabsContent>

        <TabsContent value="gaps" className="space-y-4">
          <QAKnowledgeGaps />
        </TabsContent>
      </Tabs>
    </div>
  );
}