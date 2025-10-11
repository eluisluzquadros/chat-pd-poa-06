import { useParams, useNavigate } from "react-router-dom";
import { Header } from "@/components/Header";
import { SimpleAuthGuard } from "@/components/SimpleAuthGuard";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { ArrowLeft, FileDown, Code } from "lucide-react";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { SecurityRunHeader } from "@/components/admin/security/SecurityRunHeader";
import { SecurityMetricsGrid } from "@/components/admin/security/SecurityMetricsGrid";
import { SecurityCategoryBreakdown } from "@/components/admin/security/SecurityCategoryBreakdown";
import { SecurityTestMatrix } from "@/components/admin/security/SecurityTestMatrix";

export default function SecurityRunDetails() {
  const { runId } = useParams();
  const navigate = useNavigate();

  const { data: run, isLoading: loadingRun } = useQuery({
    queryKey: ['security-run', runId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('security_validation_runs')
        .select(`
          *,
          dify_agents (
            id,
            display_name,
            provider,
            model
          )
        `)
        .eq('id', runId)
        .single();
      
      if (error) throw error;
      return data;
    },
    enabled: !!runId,
  });

  const { data: results, isLoading: loadingResults } = useQuery({
    queryKey: ['security-results', runId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('security_test_results')
        .select('*')
        .eq('run_id', runId)
        .order('test_number');
      
      if (error) throw error;
      return data;
    },
    enabled: !!runId,
  });

  if (loadingRun || loadingResults) {
    return (
      <SimpleAuthGuard requiredRole="admin">
        <div className="min-h-screen bg-gradient-to-b from-background to-secondary/20">
          <Header />
          <main className="container mx-auto px-4 py-8">
            <div className="text-center">Carregando...</div>
          </main>
        </div>
      </SimpleAuthGuard>
    );
  }

  if (!run) {
    return (
      <SimpleAuthGuard requiredRole="admin">
        <div className="min-h-screen bg-gradient-to-b from-background to-secondary/20">
          <Header />
          <main className="container mx-auto px-4 py-8">
            <div className="text-center">Execução não encontrada</div>
          </main>
        </div>
      </SimpleAuthGuard>
    );
  }

  return (
    <SimpleAuthGuard requiredRole="admin">
      <div className="min-h-screen bg-gradient-to-b from-background to-secondary/20">
        <Header />
        
        <main className="container mx-auto px-4 py-8 space-y-8">
          {/* Navigation */}
          <Button
            variant="ghost"
            onClick={() => navigate('/admin/security')}
            className="gap-2"
          >
            <ArrowLeft className="h-4 w-4" />
            Voltar
          </Button>

          {/* Header do Relatório */}
          <SecurityRunHeader run={run} results={results || []} />

          {/* Score Geral e Métricas */}
          <SecurityMetricsGrid run={run} />

          {/* Breakdown por Categoria */}
          <SecurityCategoryBreakdown results={results || []} />

          {/* Matriz de Testes Detalhada */}
          <SecurityTestMatrix results={results || []} />
        </main>
      </div>
    </SimpleAuthGuard>
  );
}
