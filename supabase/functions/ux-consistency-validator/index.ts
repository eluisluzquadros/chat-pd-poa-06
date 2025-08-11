import "https://deno.land/x/xhr@0.1.0/mod.ts";
import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

// Função para validar consistência de UX
function validateUXConsistency(response: string, queryType: string, originalQuery: string, strict: boolean = false) {
  const validationResults = {
    isConsistent: false,
    hasTable: false,
    hasStructuredData: false,
    hasRequiredIndicators: false,
    issues: [] as string[],
    score: 0,
    format: 'unknown' as 'tabular' | 'text' | 'mixed' | 'unknown',
    strictUsed: !!strict,
  };

  // Helpers
  const normalize = (t: string) =>
    t
      .toLowerCase()
      .normalize('NFD')
      .replace(/[\u0300-\u036f]/g, ''); // remove acentos

  const nr = normalize(response);

  // 1. Verificar se tem formatação tabular / lista estruturada
  const hasMarkdownTable = /\|[^|]+\|[^|]+\|/.test(response);
  // Lista com marcadores (•, -, *, 1.) contendo indicadores relevantes
  const hasBullets = /(^|\n)\s*(?:[\-\*•]|\d+\.)\s+/.test(response);
  const mentionsIndicators = /(altura|ca|coeficiente\s+de\s+aproveitamento)/.test(nr);
  const hasStructuredList = hasBullets && mentionsIndicators;

  validationResults.hasTable = hasMarkdownTable;
  validationResults.hasStructuredData = hasMarkdownTable || hasStructuredList;

  // 2. Verificar indicadores obrigatórios para queries de bairros
  const isNeighborhoodQuery = /bairro|zona|zot|distrito/i.test(originalQuery) || queryType === 'neighborhood';

  // Padrões tolerantes (funcionam através de quebras de linha e variações)
  // Padrões tolerantes (funcionam através de quebras de linha e variações)
  const alturaPattern = /altura\s*(maxima|max)?[\s:\-–]*\d+([.,]\d+)?\s*m(etros)?/s;
  // CA com número presente próximo ao rótulo
  const caBasicoPattern = /(?:\bca\b|c[\.\s]*a|coef(?:\.|iciente)?(?:\s*(?:de\s*)?aproveitamento)?)[\s:\-–]*\b(?:basico|minimo|min)\b[\s\S]{0,40}\b\d+([.,]\d+)?/s;
  const caMaximoPattern = /(?:\bca\b|c[\.\s]*a|coef(?:\.|iciente)?(?:\s*(?:de\s*)?aproveitamento)?)[\s:\-–]*\b(?:maximo|max)\b[\s\S]{0,40}\b\d+([.,]\d+)?/s;
  // Rótulos genéricos para cabeçalhos/sem número
  const caLabelRegex = /\b(?:ca|c[\.\s]*a|coef(?:\.|iciente)?(?:\s*(?:de\s*)?aproveitamento)?)\b/;
  const caBasicWord = /\b(?:basico|minimo|min)\b/;
  const caMaxWord = /\b(?:maximo|max)\b/;

  // Detecção a partir do texto normalizado
  let hasAlturaMaxima = alturaPattern.test(nr);
  let hasCaBasico = caBasicoPattern.test(nr);
  let hasCaMaximo = caMaximoPattern.test(nr);

  // Complemento: se houver tabela, tentar inferir pelos cabeçalhos
  let headerDebug: any = null;
  if (hasMarkdownTable) {
    const lines = response.split(/\r?\n/);
    const rowRegex = /^\s*\|.*\|\s*$/;
    const tableRows = lines.filter(l => rowRegex.test(l));
    const isSeparator = (line: string) => {
      const cells = line.trim().slice(1, -1).split('|').map(c => c.trim());
      return cells.every(c => /^:?-{2,}:?$/.test(c));
    };
    const headerLine = tableRows.find(l => !isSeparator(l));
    if (headerLine) {
      const headerNorm = normalize(headerLine);
      const cellsRaw = headerLine.trim().slice(1, -1).split('|').map(c => c.trim());
      const cellsNorm = cellsRaw.map(c => normalize(c));

      const alturaHeader = cellsNorm.some(c => /\baltura\b/.test(c));
      const caBasicHeader = cellsNorm.some(c => caLabelRegex.test(c) && caBasicWord.test(c));
      const caMaxHeader = cellsNorm.some(c => caLabelRegex.test(c) && caMaxWord.test(c));

      hasAlturaMaxima = hasAlturaMaxima || alturaHeader;
      hasCaBasico = hasCaBasico || caBasicHeader;
      hasCaMaximo = hasCaMaximo || caMaxHeader;

      headerDebug = {
        headerLine: headerNorm,
        cells: cellsNorm,
        alturaHeader,
        caBasicHeader,
        caMaxHeader
      };
    }
  }

  // Fallback: detectar rótulos CA sem número em qualquer parte do texto
  const caBasicoLabelOnly = /(?:\bca\b|c[\.\s]*a|coef(?:\.|iciente)?(?:\s*(?:de\s*)?aproveitamento)?)[\s\S]{0,40}\b(?:basico|minimo|min)\b/.test(nr);
  const caMaximoLabelOnly = /(?:\bca\b|c[\.\s]*a|coef(?:\.|iciente)?(?:\s*(?:de\s*)?aproveitamento)?)[\s\S]{0,40}\b(?:maximo|max)\b/.test(nr);
  hasCaBasico = hasCaBasico || caBasicoLabelOnly;
  hasCaMaximo = hasCaMaximo || caMaximoLabelOnly;

if (isNeighborhoodQuery) {
    // Avaliação em modo estrito (exige números próximos aos rótulos)
    const strictAltura = alturaPattern.test(nr);
    const strictCaBasico = caBasicoPattern.test(nr);
    const strictCaMaximo = caMaximoPattern.test(nr);

    const hasReqLoose = hasAlturaMaxima && hasCaBasico && hasCaMaximo;
    const hasReqStrict = strictAltura && strictCaBasico && strictCaMaximo;

    validationResults.hasRequiredIndicators = strict ? hasReqStrict : hasReqLoose;

    // Issues conforme o modo selecionado
    if (strict) {
      if (!strictAltura) validationResults.issues.push('Missing altura máxima');
      if (!strictCaBasico) validationResults.issues.push('Missing CA básico');
      if (!strictCaMaximo) validationResults.issues.push('Missing CA máximo');
    } else {
      if (!hasAlturaMaxima) validationResults.issues.push('Missing altura máxima');
      if (!hasCaBasico) validationResults.issues.push('Missing CA básico');
      if (!hasCaMaximo) validationResults.issues.push('Missing CA máximo');
    }
  }

  // 3. Determinar formato (corrigido: mixed quando ambos, tabular quando só tabela)
  if (hasMarkdownTable && hasStructuredList) {
    validationResults.format = 'mixed';
  } else if (hasMarkdownTable) {
    validationResults.format = 'tabular';
  } else if (hasStructuredList) {
    validationResults.format = 'text';
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

  // Debug detalhado
  console.log('🧪 UX Indicators check:', {
    query: originalQuery,
    isNeighborhoodQuery,
    hasMarkdownTable,
    hasStructuredList,
    matches: {
      alturaFromText: alturaPattern.test(nr),
      caBasicoFromText: caBasicoPattern.test(nr),
      caMaximoFromText: caMaximoPattern.test(nr),
      caBasicoLabelOnly,
      caMaximoLabelOnly
    },
    final: {
      hasAlturaMaxima,
      hasCaBasico,
      hasCaMaximo
    },
    header: headerDebug,
    format: validationResults.format,
    score: validationResults.score
  });

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
const { response, queryType, originalQuery, batchValidation, strict } = await req.json();

    console.log('🎯 UX CONSISTENCY VALIDATOR - Starting validation');

    // Validação única
    if (!batchValidation) {
      const validation = validateUXConsistency(response, queryType, originalQuery, !!strict);
      
      console.log('📊 UX Validation Result:', {
        query: originalQuery,
        isConsistent: validation.isConsistent,
        score: validation.score,
        format: validation.format,
        issues: validation.issues,
        strictUsed: !!strict,
      });

      return new Response(JSON.stringify({
        validation,
        strictUsed: !!strict,
        timestamp: new Date().toISOString()
      }), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

// Validação em lote
    const validations = batchValidation.map((item: any) => ({
      query: item.originalQuery,
      queryType: item.queryType,
      ...validateUXConsistency(item.response, item.queryType, item.originalQuery, !!(item.strict ?? strict))
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