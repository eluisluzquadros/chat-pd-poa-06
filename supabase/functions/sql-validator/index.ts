import "https://deno.land/x/xhr@0.1.0/mod.ts";
import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

interface ValidationRequest {
  query: string;
  sqlResults: any;
  expectedTable: string;
  expectedCount?: number;
  queryType: 'risk' | 'regime' | 'counting' | 'general';
}

interface ValidationResponse {
  isValid: boolean;
  issues: string[];
  recommendations: string[];
  confidence: number;
  tableUsed: string;
  recordCount: number;
  shouldTriggerAlert: boolean;
}

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { query, sqlResults, expectedTable, expectedCount, queryType }: ValidationRequest = await req.json();
    
    const supabaseClient = createClient(
      Deno.env.get("SUPABASE_URL") ?? "",
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? ""
    );

    console.log(`🔍 SQL Validator - Analyzing query: "${query}"`);
    console.log(`Expected table: ${expectedTable}, Query type: ${queryType}`);

    const validation: ValidationResponse = {
      isValid: true,
      issues: [],
      recommendations: [],
      confidence: 1.0,
      tableUsed: 'unknown',
      recordCount: 0,
      shouldTriggerAlert: false
    };

    // 1. Verificar se há resultados
    if (!sqlResults || !sqlResults.executionResults || sqlResults.executionResults.length === 0) {
      validation.isValid = false;
      validation.issues.push('Nenhum resultado SQL retornado');
      validation.shouldTriggerAlert = true;
      validation.confidence = 0.1;
    } else {
      const executionResult = sqlResults.executionResults[0];
      
      // Extrair informações dos resultados
      if (executionResult.data && Array.isArray(executionResult.data)) {
        validation.recordCount = executionResult.data.length;
      }
      
      if (executionResult.query) {
        // Detectar qual tabela foi usada
        const queryText = executionResult.query.toLowerCase();
        if (queryText.includes('bairros_risco_desastre')) {
          validation.tableUsed = 'bairros_risco_desastre';
        } else if (queryText.includes('regime_urbanistico')) {
          validation.tableUsed = 'regime_urbanistico';
        } else if (queryText.includes('zots_bairros')) {
          validation.tableUsed = 'zots_bairros';
        }
      }
    }

    // 2. Validações específicas por tipo de query
    const queryLower = query.toLowerCase();

    if (queryType === 'risk' || 
        queryLower.includes('risco') || 
        queryLower.includes('inundação') || 
        queryLower.includes('cota')) {
      
      console.log('🚨 Validating RISK query');
      
      // Para queries de risco, DEVE usar bairros_risco_desastre
      if (validation.tableUsed !== 'bairros_risco_desastre') {
        validation.isValid = false;
        validation.issues.push(`Query de risco DEVE usar tabela bairros_risco_desastre, mas usou: ${validation.tableUsed}`);
        validation.recommendations.push('Redirecionar query para tabela bairros_risco_desastre');
        validation.shouldTriggerAlert = true;
        validation.confidence = 0.2;
      }

      // Verificar se a contagem faz sentido para bairros com risco
      if (queryLower.includes('quantos') || queryLower.includes('total')) {
        if (validation.recordCount === 0) {
          validation.isValid = false;
          validation.issues.push('Query de contagem de risco retornou 0 registros - inconsistente');
          validation.shouldTriggerAlert = true;
        } else if (validation.recordCount < 10) {
          validation.issues.push(`Apenas ${validation.recordCount} bairros com risco encontrados - verificar se está correto`);
          validation.confidence = Math.max(0.5, validation.confidence - 0.3);
        }
      }

      // Verificar para a query específica "57 bairros acima da cota"
      if (queryLower.includes('57') || queryLower.includes('acima da cota')) {
        // Buscar dados reais para validar
        try {
          const { data: riskData, error } = await supabaseClient
            .from('bairros_risco_desastre')
            .select('bairro_nome, risco_inundacao')
            .eq('risco_inundacao', true);

          if (!error && riskData) {
            const actualCount = riskData.length;
            console.log(`Real count of flood risk neighborhoods: ${actualCount}`);
            
            if (Math.abs(validation.recordCount - actualCount) > 5) {
              validation.isValid = false;
              validation.issues.push(`Divergência crítica: query retornou ${validation.recordCount} mas existem ${actualCount} bairros com risco de inundação`);
              validation.recommendations.push(`Corrigir SQL para retornar ${actualCount} registros`);
              validation.shouldTriggerAlert = true;
              validation.confidence = 0.1;
            }
          }
        } catch (error) {
          console.error('Error validating flood risk data:', error);
        }
      }

    } else if (queryType === 'regime' || 
               queryLower.includes('altura') || 
               queryLower.includes('coeficiente') || 
               queryLower.includes('zona')) {
      
      console.log('🏗️ Validating REGIME query');
      
      // Para queries de regime, DEVE usar regime_urbanistico
      if (validation.tableUsed !== 'regime_urbanistico') {
        validation.isValid = false;
        validation.issues.push(`Query de regime DEVE usar tabela regime_urbanistico, mas usou: ${validation.tableUsed}`);
        validation.recommendations.push('Redirecionar query para tabela regime_urbanistico');
        validation.shouldTriggerAlert = true;
        validation.confidence = 0.3;
      }

    } else if (queryType === 'counting') {
      
      console.log('📊 Validating COUNTING query');
      
      // Para queries de contagem, verificar se o resultado faz sentido
      if (validation.recordCount === 0) {
        validation.isValid = false;
        validation.issues.push('Query de contagem retornou 0 registros');
        validation.shouldTriggerAlert = true;
        validation.confidence = 0.2;
      }
    }

    // 3. Validações gerais de consistência
    
    // Verificar se query retorna dados quando deveria
    if (validation.recordCount === 0 && !queryLower.includes('não') && !queryLower.includes('sem')) {
      validation.issues.push('Query não retornou dados quando esperava-se resultados');
      validation.confidence = Math.max(0.3, validation.confidence - 0.4);
    }

    // Verificar se query usa tabelas corretas baseada no conteúdo
    if (queryLower.includes('risco') && validation.tableUsed === 'regime_urbanistico') {
      validation.isValid = false;
      validation.issues.push('Query sobre RISCO não deve usar regime_urbanistico');
      validation.recommendations.push('Usar bairros_risco_desastre para queries de risco');
      validation.shouldTriggerAlert = true;
    }

    if ((queryLower.includes('altura') || queryLower.includes('coeficiente')) && 
        validation.tableUsed === 'bairros_risco_desastre') {
      validation.isValid = false;
      validation.issues.push('Query sobre REGIME não deve usar bairros_risco_desastre');
      validation.recommendations.push('Usar regime_urbanistico para queries de altura/coeficiente');
      validation.shouldTriggerAlert = true;
    }

    // 4. Salvar resultado da validação
    try {
      await supabaseClient
        .from('sql_validation_logs')
        .insert({
          query_text: query,
          query_type: queryType,
          table_used: validation.tableUsed,
          record_count: validation.recordCount,
          is_valid: validation.isValid,
          issues: validation.issues,
          recommendations: validation.recommendations,
          confidence: validation.confidence,
          should_alert: validation.shouldTriggerAlert,
          created_at: new Date().toISOString()
        });
    } catch (dbError) {
      console.error('Error saving validation log:', dbError);
      // Continue sem salvar se houver erro
    }

    // 5. Gerar alert se necessário
    if (validation.shouldTriggerAlert) {
      console.log('🚨 TRIGGERING ALERT for SQL validation failure');
      
      try {
        await supabaseClient
          .from('quality_alerts')
          .insert({
            level: validation.confidence < 0.3 ? 'critical' : 'warning',
            issues: [`SQL Validation Failed: ${validation.issues.join(', ')}`],
            metrics: {
              query: query,
              queryType: queryType,
              tableUsed: validation.tableUsed,
              recordCount: validation.recordCount,
              confidence: validation.confidence
            },
            created_at: new Date().toISOString()
          });
      } catch (alertError) {
        console.error('Error creating quality alert:', alertError);
      }
    }

    console.log(`✅ SQL Validation complete - Valid: ${validation.isValid}, Confidence: ${validation.confidence}`);

    return new Response(JSON.stringify(validation), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });

  } catch (error) {
    console.error('SQL validation error:', error);
    return new Response(JSON.stringify({ 
      error: error.message,
      isValid: false,
      issues: ['Erro interno na validação'],
      confidence: 0,
      shouldTriggerAlert: true
    }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }
});