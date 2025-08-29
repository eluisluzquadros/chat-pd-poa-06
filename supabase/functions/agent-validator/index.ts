import "https://deno.land/x/xhr@0.1.0/mod.ts";
import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.45.0';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

const BETA_RESPONSE = `A plataforma ainda está em versão Beta e para esta pergunta o usuário consulte 📍 Explore mais:
Mapa com Regras Construtivas: https://bit.ly/3ILdXRA ↗ ↗
Contribua com sugestões: https://bit.ly/4o7AWqb ↗ ↗
Participe da Audiência Pública: https://bit.ly/4oefZKm ↗ ↗`;

/**
 * Agent Validator - Validador de Respostas
 * Responsabilidades:
 * - Cross-validation entre agentes
 * - Confidence scoring baseado em completude
 * - Detecção de contradições
 * - Verificação de disponibilidade de dados
 * - Quality assurance das respostas
 */
serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    console.log('🔍 Agent Validator iniciado');
    
    const supabaseClient = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
    );

    const { 
      query, 
      agentResponses = [], 
      context,
      validationType = 'comprehensive' 
    } = await req.json();
    
    console.log('🔎 Validação solicitada:', { 
      query: query?.substring(0, 100), 
      agentCount: agentResponses.length,
      validationType 
    });

    // 1. Verificar disponibilidade de dados para a query
    const dataAvailability = await checkDataAvailability(supabaseClient, query);
    
    // 2. Validar respostas dos agentes
    const agentValidation = validateAgentResponses(agentResponses, query);
    
    // 3. Cross-validation entre agentes
    const crossValidation = performCrossValidation(agentResponses);
    
    // 4. Calcular confidence scores
    const confidenceAnalysis = calculateConfidenceScores(agentResponses, dataAvailability);
    
    // 5. Detectar contradições
    const contradictions = detectContradictions(agentResponses);
    
    // 6. Gerar assessment final
    const finalAssessment = generateFinalAssessment(
      query,
      agentValidation,
      crossValidation,
      confidenceAnalysis,
      contradictions,
      dataAvailability
    );

    // 7. Verificar contra casos de teste conhecidos
    const testCaseValidation = await validateAgainstTestCases(supabaseClient, query, agentResponses);
    
    // 8. Verificar se deve retornar resposta Beta (critérios mais rigorosos)
    const shouldReturnBeta = (
      finalAssessment.confidence < 0.4 ||
      !dataAvailability.available ||
      agentValidation.every(v => !v.isValid) ||
      testCaseValidation.shouldUseBeta
    );

    // 9. Resposta final
    const validatorResponse = shouldReturnBeta ? 
      BETA_RESPONSE : 
      `Validação concluída com ${(finalAssessment.confidence * 100).toFixed(1)}% de confiança.`;

    console.log('✅ Agent Validator concluído:', { 
      overallConfidence: finalAssessment.confidence,
      agentsValidated: agentValidation.length,
      contradictionsFound: contradictions.length
    });

    return new Response(JSON.stringify({
      agent: 'validator',
      response: validatorResponse,
      validation: finalAssessment,
      confidence: shouldReturnBeta ? 0 : finalAssessment.confidence,
      metadata: {
        dataAvailability,
        agentValidation,
        crossValidation,
        contradictions,
        testCaseValidation,
        recommendedActions: finalAssessment.recommendations
      }
    }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });

  } catch (error) {
    console.error('❌ Agent Validator erro:', error);
    
    return new Response(JSON.stringify({
      agent: 'validator',
      error: 'Erro na validação',
      details: error.message,
      confidence: 0
    }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }
});

/**
 * Verifica disponibilidade de dados para a query
 */
async function checkDataAvailability(supabaseClient: any, query: string) {
  try {
    console.log('📊 Verificando disponibilidade de dados...');
    
    // Usar get_list para verificar domínios disponíveis
    const { data: listData, error: listError } = await supabaseClient.functions.invoke('get_list', {
      body: { detailed: true }
    });

    if (listError) {
      console.error('Erro ao verificar lista:', listError);
      return { available: false, domains: [], error: listError.message };
    }

    const queryLower = query.toLowerCase();
    const availableDomains = [];
    
    // Verificar quais domínios são relevantes para a query
    if (queryLower.includes('bairro') || queryLower.includes('zona') || queryLower.includes('urbanístico')) {
      availableDomains.push('urban');
    }
    
    if (queryLower.includes('risco') || queryLower.includes('desastre') || queryLower.includes('inundação')) {
      availableDomains.push('risks');
    }
    
    if (queryLower.includes('lei') || queryLower.includes('artigo') || queryLower.includes('decreto')) {
      availableDomains.push('legal');
    }

    return {
      available: true,
      domains: availableDomains,
      totalTables: listData?.total_tables || 0,
      categories: listData?.categories || {}
    };

  } catch (error) {
    console.error('Erro na verificação de disponibilidade:', error);
    return { available: false, domains: [], error: error.message };
  }
}

/**
 * Valida respostas individuais dos agentes
 */
function validateAgentResponses(agentResponses: any[], query: string) {
  return agentResponses.map(response => {
    const validation = {
      agent: response.agent,
      isValid: true,
      issues: [],
      confidence: response.confidence || 0,
      dataQuality: 'unknown'
    };

    // Verificar se a resposta está vazia
    if (!response.response || response.response.trim().length < 10) {
      validation.isValid = false;
      validation.issues.push('Resposta muito curta ou vazia');
      validation.dataQuality = 'poor';
    }

    // Verificar se tem dados estruturados
    if (response.data && Object.keys(response.data).length > 0) {
      validation.dataQuality = 'good';
    } else {
      validation.dataQuality = 'limited';
    }

    // Verificar confidence muito baixo
    if (response.confidence < 0.3) {
      validation.issues.push('Confidence muito baixo');
    }

    // Verificar se contém erros
    if (response.error) {
      validation.isValid = false;
      validation.issues.push(`Erro: ${response.error}`);
      validation.dataQuality = 'poor';
    }

    return validation;
  });
}

/**
 * Cross-validation entre respostas de agentes
 */
function performCrossValidation(agentResponses: any[]) {
  const validation = {
    consistency: 0,
    agreements: [],
    disagreements: [],
    complementarity: 0
  };

  if (agentResponses.length < 2) {
    return validation;
  }

  // Verificar consistência entre agentes urban e legal para temas sobrepostos
  const urbanAgent = agentResponses.find(r => r.agent === 'urban');
  const legalAgent = agentResponses.find(r => r.agent === 'legal');

  if (urbanAgent && legalAgent) {
    // Verificar se ambos falam sobre o mesmo bairro/zona
    const urbanText = urbanAgent.response.toLowerCase();
    const legalText = legalAgent.response.toLowerCase();
    
    const commonTerms = ['bairro', 'zona', 'altura', 'coeficiente'];
    let matchCount = 0;
    
    commonTerms.forEach(term => {
      if (urbanText.includes(term) && legalText.includes(term)) {
        matchCount++;
        validation.agreements.push(`Ambos mencionam: ${term}`);
      }
    });
    
    validation.consistency = matchCount / commonTerms.length;
    validation.complementarity = 0.8; // Urban e Legal são complementares
  }

  return validation;
}

/**
 * Calcula confidence scores baseado em múltiplos fatores
 */
function calculateConfidenceScores(agentResponses: any[], dataAvailability: any) {
  const analysis = {
    individual: {},
    combined: 0,
    factors: {}
  };

  let totalConfidence = 0;
  let agentCount = 0;

  agentResponses.forEach(response => {
    if (response.confidence !== undefined) {
      analysis.individual[response.agent] = response.confidence;
      totalConfidence += response.confidence;
      agentCount++;
    }
  });

  // Confidence combinado (média ponderada)
  if (agentCount > 0) {
    analysis.combined = totalConfidence / agentCount;
  }

  // Fatores que influenciam confidence
  analysis.factors = {
    dataAvailability: dataAvailability.available ? 0.2 : -0.2,
    agentAgreement: agentResponses.length > 1 ? 0.1 : 0,
    responseLength: agentResponses.some(r => r.response?.length > 100) ? 0.1 : 0,
    structuredData: agentResponses.some(r => r.data && Object.keys(r.data).length > 0) ? 0.1 : 0
  };

  // Ajustar confidence final
  const factorSum = Object.values(analysis.factors).reduce((sum: number, val: number) => sum + val, 0);
  analysis.combined = Math.max(0, Math.min(1, analysis.combined + factorSum));

  return analysis;
}

/**
 * Detecta contradições entre respostas
 */
function detectContradictions(agentResponses: any[]) {
  const contradictions = [];

  // Comparar valores numéricos entre agentes
  agentResponses.forEach((response1, i) => {
    agentResponses.slice(i + 1).forEach(response2 => {
      const text1 = response1.response?.toLowerCase() || '';
      const text2 = response2.response?.toLowerCase() || '';

      // Buscar valores numéricos conflitantes
      const numbers1 = text1.match(/\d+(?:\.\d+)?/g) || [];
      const numbers2 = text2.match(/\d+(?:\.\d+)?/g) || [];

      if (numbers1.length > 0 && numbers2.length > 0) {
        // Verificar se há números muito diferentes para o mesmo contexto
        const context1 = text1.includes('altura') || text1.includes('coeficiente');
        const context2 = text2.includes('altura') || text2.includes('coeficiente');

        if (context1 && context2) {
          const diff = Math.abs(parseFloat(numbers1[0]) - parseFloat(numbers2[0]));
          if (diff > 10) { // Diferença significativa
            contradictions.push({
              type: 'numerical_mismatch',
              agents: [response1.agent, response2.agent],
              values: [numbers1[0], numbers2[0]],
              context: 'valores numéricos'
            });
          }
        }
      }
    });
  });

  return contradictions;
}

/**
 * Gera assessment final da validação
 */
function generateFinalAssessment(
  query: string,
  agentValidation: any[],
  crossValidation: any,
  confidenceAnalysis: any,
  contradictions: any[],
  dataAvailability: any
) {
  const assessment = {
    confidence: confidenceAnalysis.combined,
    status: 'valid',
    issues: [],
    recommendations: [],
    summary: ''
  };

  // Verificar issues críticos
  const invalidAgents = agentValidation.filter(v => !v.isValid);
  if (invalidAgents.length > 0) {
    assessment.status = 'partial';
    assessment.issues.push(`${invalidAgents.length} agente(s) com problemas`);
  }

  if (contradictions.length > 0) {
    assessment.status = 'contradictory';
    assessment.issues.push(`${contradictions.length} contradição(ões) detectada(s)`);
    assessment.confidence *= 0.7; // Reduzir confidence
  }

  if (!dataAvailability.available) {
    assessment.issues.push('Problemas na disponibilidade de dados');
    assessment.confidence *= 0.5;
  }

  // Gerar recomendações
  if (assessment.confidence < 0.5) {
    assessment.recommendations.push('Refinar a consulta com termos mais específicos');
  }

  if (crossValidation.consistency < 0.5 && agentValidation.length > 1) {
    assessment.recommendations.push('Verificar consistência entre diferentes fontes');
  }

  if (invalidAgents.length > 0) {
    assessment.recommendations.push('Revisar fontes de dados indisponíveis');
  }

  // Gerar summary
  const validAgents = agentValidation.filter(v => v.isValid).length;
  assessment.summary = `Validação concluída: ${validAgents}/${agentValidation.length} agentes válidos, `;
  assessment.summary += `confidence ${(assessment.confidence * 100).toFixed(1)}%, `;
  assessment.summary += `status: ${assessment.status}`;

  return assessment;
}

/**
 * Valida contra casos de teste conhecidos
 */
async function validateAgainstTestCases(supabaseClient: any, query: string, agentResponses: any[]) {
  try {
    console.log('🧪 Validando contra casos de teste...');
    
    // Buscar casos de teste similares
    const { data: testCases, error } = await supabaseClient
      .from('qa_test_cases')
      .select('*')
      .ilike('query', `%${query.substring(0, 30)}%`)
      .limit(3);

    if (error) {
      console.error('❌ Erro ao buscar casos de teste:', error);
      return { shouldUseBeta: false, matchedCases: [] };
    }

    const validation = {
      shouldUseBeta: false,
      matchedCases: testCases || [],
      confidence: 1.0
    };

    // Se temos casos de teste mas nenhum agente tem dados válidos
    if (testCases?.length > 0) {
      const hasValidAgentData = agentResponses.some(r => 
        r.data && Object.keys(r.data).length > 0 && r.confidence > 0.3
      );
      
      if (!hasValidAgentData) {
        console.log('⚠️ Casos de teste existem mas agentes falharam - usando BETA');
        validation.shouldUseBeta = true;
        validation.confidence = 0.1;
      }
    }

    // Verificar se query é sobre resumo do plano diretor
    const queryLower = query.toLowerCase();
    if (queryLower.includes('resuma') || queryLower.includes('resumo')) {
      const hasValidSummaryData = agentResponses.some(r => 
        r.response && r.response.length > 100 && r.confidence > 0.5
      );
      
      if (!hasValidSummaryData) {
        console.log('⚠️ Pergunta de resumo sem dados adequados - usando BETA');
        validation.shouldUseBeta = true;
      }
    }

    return validation;

  } catch (error) {
    console.error('❌ Erro na validação de casos de teste:', error);
    return { shouldUseBeta: false, matchedCases: [] };
  }
}