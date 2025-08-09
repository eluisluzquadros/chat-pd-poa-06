import "https://deno.land/x/xhr@0.1.0/mod.ts";
import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

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

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabaseClient = createClient(
      Deno.env.get("SUPABASE_URL") ?? "",
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? ""
    );

    console.log('📊 Generating Table Coverage Report...');

    // Analisar logs de validação SQL dos últimos 7 dias
    const sevenDaysAgo = new Date();
    sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 7);

    // Buscar dados de uso das tabelas
    const { data: validationLogs, error: logsError } = await supabaseClient
      .from('sql_validation_logs')
      .select('*')
      .gte('created_at', sevenDaysAgo.toISOString())
      .order('created_at', { ascending: false });

    if (logsError) {
      console.error('Error fetching validation logs:', logsError);
    }

    // Inicializar estatísticas das tabelas
    const availableTables = [
      'regime_urbanistico',
      'bairros_risco_desastre', 
      'zots_bairros'
    ];

    const tableStats: Record<string, TableUsageStats> = {};
    
    availableTables.forEach(table => {
      tableStats[table] = {
        table_name: table,
        usage_count: 0,
        last_used: 'never',
        query_types: [],
        coverage_percentage: 0
      };
    });

    let totalQueries = 0;

    // Processar logs de validação
    if (validationLogs && validationLogs.length > 0) {
      totalQueries = validationLogs.length;
      
      for (const log of validationLogs) {
        const tableName = log.table_used || 'unknown';
        
        if (tableStats[tableName]) {
          tableStats[tableName].usage_count++;
          tableStats[tableName].last_used = log.created_at;
          
          if (log.query_type && !tableStats[tableName].query_types.includes(log.query_type)) {
            tableStats[tableName].query_types.push(log.query_type);
          }
        }
      }
    }

    // Calcular porcentagens de cobertura
    for (const table of availableTables) {
      if (totalQueries > 0) {
        tableStats[table].coverage_percentage = (tableStats[table].usage_count / totalQueries) * 100;
      }
    }

    // Identificar gaps de cobertura
    const coverageGaps: string[] = [];
    const recommendations: string[] = [];
    let alertLevel: 'info' | 'warning' | 'critical' = 'info';

    // Verificar tabelas não utilizadas
    for (const table of availableTables) {
      const stats = tableStats[table];
      
      if (stats.usage_count === 0) {
        coverageGaps.push(`Tabela ${table} não foi utilizada nos últimos 7 dias`);
        recommendations.push(`Verificar se queries que deveriam usar ${table} estão sendo direcionadas corretamente`);
        alertLevel = 'warning';
      } else if (stats.coverage_percentage < 10) {
        coverageGaps.push(`Tabela ${table} tem baixo uso (${stats.coverage_percentage.toFixed(1)}%)`);
        recommendations.push(`Investigar se ${table} deveria ser mais utilizada`);
        if (alertLevel === 'info') alertLevel = 'warning';
      }
    }

    // Verificar se regime_urbanistico está dominando quando não deveria
    const regimeUsage = tableStats['regime_urbanistico']?.coverage_percentage || 0;
    const riskUsage = tableStats['bairros_risco_desastre']?.coverage_percentage || 0;
    
    if (regimeUsage > 80 && riskUsage < 5) {
      coverageGaps.push('regime_urbanistico está sendo usado para tudo (>80%), bairros_risco_desastre quase nunca (<5%)');
      recommendations.push('CRÍTICO: Queries de risco não estão sendo direcionadas para bairros_risco_desastre');
      alertLevel = 'critical';
    }

    // Verificar padrões específicos de problemas
    if (validationLogs) {
      const invalidQueries = validationLogs.filter(log => !log.is_valid);
      const invalidPercentage = (invalidQueries.length / totalQueries) * 100;
      
      if (invalidPercentage > 20) {
        coverageGaps.push(`${invalidPercentage.toFixed(1)}% das queries são inválidas`);
        recommendations.push('URGENTE: Alto índice de queries inválidas - revisar lógica de direcionamento');
        alertLevel = 'critical';
      }

      // Verificar queries de risco que usaram tabela errada
      const riskQueriesWrongTable = invalidQueries.filter(log => 
        log.query_type === 'risk' && log.table_used !== 'bairros_risco_desastre'
      );
      
      if (riskQueriesWrongTable.length > 0) {
        coverageGaps.push(`${riskQueriesWrongTable.length} queries de risco usaram tabela incorreta`);
        recommendations.push('CRÍTICO: Corrigir sql-generator-v2 para usar bairros_risco_desastre em queries de risco');
        alertLevel = 'critical';
      }
    }

    // Recomendações específicas baseadas nos dados
    if (tableStats['bairros_risco_desastre'].usage_count === 0) {
      recommendations.push('Implementar detecção de keywords de risco no query-analyzer');
      recommendations.push('Atualizar system prompt do sql-generator-v2 para incluir bairros_risco_desastre');
    }

    if (tableStats['zots_bairros'].usage_count === 0) {
      recommendations.push('Considerar integrar zots_bairros para queries de relacionamento zona-bairro');
    }

    const report: CoverageReport = {
      timestamp: new Date().toISOString(),
      total_queries: totalQueries,
      table_usage: Object.values(tableStats),
      coverage_gaps: coverageGaps,
      recommendations: recommendations,
      alert_level: alertLevel
    };

    // Salvar relatório
    try {
      await supabaseClient
        .from('table_coverage_reports')
        .insert({
          report_data: report,
          alert_level: alertLevel,
          total_queries: totalQueries,
          created_at: new Date().toISOString()
        });
    } catch (saveError) {
      console.error('Error saving coverage report:', saveError);
    }

    // Gerar alert se necessário
    if (alertLevel === 'critical' || (alertLevel === 'warning' && coverageGaps.length > 2)) {
      try {
        await supabaseClient
          .from('quality_alerts')
          .insert({
            level: alertLevel,
            issues: [`Table Coverage Issues: ${coverageGaps.join('; ')}`],
            metrics: {
              totalQueries: totalQueries,
              coverageGaps: coverageGaps.length,
              regimeUsage: regimeUsage,
              riskUsage: riskUsage
            },
            created_at: new Date().toISOString()
          });
      } catch (alertError) {
        console.error('Error creating coverage alert:', alertError);
      }
    }

    console.log(`📊 Coverage Report Generated - Alert Level: ${alertLevel}, Gaps: ${coverageGaps.length}`);

    return new Response(JSON.stringify(report), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });

  } catch (error) {
    console.error('Table coverage monitor error:', error);
    return new Response(JSON.stringify({ 
      error: error.message,
      alert_level: 'critical',
      recommendations: ['Erro interno no monitoramento - verificar logs']
    }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }
});