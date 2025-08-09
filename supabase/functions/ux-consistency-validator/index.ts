import "https://deno.land/x/xhr@0.1.0/mod.ts";
import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

// Função para validar consistência de UX
function validateUXConsistency(response: string, queryType: string, originalQuery: string) {
  const validationResults = {
    isConsistent: false,
    hasTable: false,
    hasStructuredData: false,
    hasRequiredIndicators: false,
    issues: [] as string[],
    score: 0,
    format: 'unknown' as 'tabular' | 'text' | 'mixed' | 'unknown'
  };

  // 1. Verificar se tem formatação tabular
  const hasMarkdownTable = /\|[^|]+\|[^|]+\|/.test(response);
  const hasStructuredList = /•.*Altura máxima.*•.*CA básico.*•.*CA máximo/i.test(response);
  
  validationResults.hasTable = hasMarkdownTable;
  validationResults.hasStructuredData = hasMarkdownTable || hasStructuredList;

  // 2. Verificar indicadores obrigatórios para queries de bairros
  const isNeighborhoodQuery = /bairro|zona|zot|distrito/i.test(originalQuery) || queryType === 'neighborhood';
  
  if (isNeighborhoodQuery) {
    const hasAlturaMaxima = /altura.*máxima.*\d+.*metro/i.test(response);
    const hasCaBasico = /ca.*básico.*\d/i.test(response) || /coeficiente.*aproveitamento.*básico.*\d/i.test(response);
    const hasCaMaximo = /ca.*máximo.*\d/i.test(response) || /coeficiente.*aproveitamento.*máximo.*\d/i.test(response);
    
    validationResults.hasRequiredIndicators = hasAlturaMaxima && hasCaBasico && hasCaMaximo;
    
    if (!hasAlturaMaxima) validationResults.issues.push('Missing altura máxima');
    if (!hasCaBasico) validationResults.issues.push('Missing CA básico');
    if (!hasCaMaximo) validationResults.issues.push('Missing CA máximo');
  }

  // 3. Determinar formato
  if (hasMarkdownTable && hasStructuredList) {
    validationResults.format = 'tabular';
  } else if (hasStructuredList) {
    validationResults.format = 'text';
  } else if (hasMarkdownTable) {
    validationResults.format = 'mixed';
  } else {
    validationResults.format = 'unknown';
    validationResults.issues.push('No structured formatting detected');
  }

  // 4. Calcular score
  let score = 0;
  if (validationResults.hasTable) score += 30;
  if (validationResults.hasStructuredData) score += 25;
  if (validationResults.hasRequiredIndicators) score += 35;
  if (validationResults.issues.length === 0) score += 10;
  
  validationResults.score = score;
  validationResults.isConsistent = score >= 85; // 85% ou mais = consistente

  return validationResults;
}

// Função para gerar relatório de inconsistências
function generateInconsistencyReport(validations: any[]) {
  const report = {
    totalQueries: validations.length,
    consistentQueries: validations.filter(v => v.isConsistent).length,
    inconsistentQueries: validations.filter(v => !v.isConsistent).length,
    consistencyRate: 0,
    commonIssues: {} as Record<string, number>,
    formatDistribution: {} as Record<string, number>,
    recommendations: [] as string[]
  };

  report.consistencyRate = (report.consistentQueries / report.totalQueries) * 100;

  // Contar issues comuns
  validations.forEach(v => {
    v.issues.forEach((issue: string) => {
      report.commonIssues[issue] = (report.commonIssues[issue] || 0) + 1;
    });
    
    report.formatDistribution[v.format] = (report.formatDistribution[v.format] || 0) + 1;
  });

  // Gerar recomendações
  if (report.consistencyRate < 90) {
    report.recommendations.push('Implementar formatação tabular obrigatória para todas as queries de bairros');
  }
  
  if (report.commonIssues['No structured formatting detected'] > 0) {
    report.recommendations.push('Adicionar validação de formatação estruturada no response-synthesizer');
  }
  
  if (report.formatDistribution['unknown'] > 2) {
    report.recommendations.push('Criar templates de formatação padronizados');
  }

  return report;
}

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { response, queryType, originalQuery, batchValidation } = await req.json();

    console.log('🎯 UX CONSISTENCY VALIDATOR - Starting validation');

    // Validação única
    if (!batchValidation) {
      const validation = validateUXConsistency(response, queryType, originalQuery);
      
      console.log('📊 UX Validation Result:', {
        query: originalQuery,
        isConsistent: validation.isConsistent,
        score: validation.score,
        format: validation.format,
        issues: validation.issues
      });

      return new Response(JSON.stringify({
        validation,
        timestamp: new Date().toISOString()
      }), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    // Validação em lote
    const validations = batchValidation.map((item: any) => ({
      query: item.originalQuery,
      queryType: item.queryType,
      ...validateUXConsistency(item.response, item.queryType, item.originalQuery)
    }));

    const report = generateInconsistencyReport(validations);

    console.log('📊 BATCH UX VALIDATION REPORT:', {
      consistencyRate: report.consistencyRate,
      totalQueries: report.totalQueries,
      commonIssues: Object.keys(report.commonIssues).slice(0, 3)
    });

    return new Response(JSON.stringify({
      report,
      validations,
      timestamp: new Date().toISOString()
    }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });

  } catch (error) {
    console.error('❌ UX Consistency Validator Error:', error);
    return new Response(JSON.stringify({
      error: 'UX validation failed',
      details: error.message
    }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }
});