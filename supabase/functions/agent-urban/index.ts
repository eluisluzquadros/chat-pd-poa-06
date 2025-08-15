import "https://deno.land/x/xhr@0.1.0/mod.ts";
import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.45.0';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

/**
 * Agent Urban - Especialista em Regime Urbanístico
 * Processa consultas relacionadas a:
 * - Regime urbanístico por bairro/zona
 * - Riscos de desastres
 * - Coeficientes de aproveitamento
 * - Alturas máximas e restrições de construção
 */
serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    console.log('🏙️ Agent Urban iniciado');
    
    const supabaseClient = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
    );

    const { query, context } = await req.json();
    console.log('📍 Query recebida:', { query, context });

    // Extrair entidades urbanas da query
    const entities = extractUrbanEntities(query);
    console.log('🔍 Entidades extraídas:', entities);

    let results = {};
    let confidence = 0.5;

    // 1. Buscar dados de regime urbanístico
    if (entities.bairro || entities.zona) {
      const regimeData = await getRegimeData(supabaseClient, entities);
      results.regime = regimeData;
      confidence += 0.2;
    }

    // 2. Buscar dados de riscos
    if (entities.bairro) {
      const riskData = await getRiskData(supabaseClient, entities.bairro);
      results.risks = riskData;
      confidence += 0.2;
    }

    // 3. Gerar resposta contextualizada
    const response = generateUrbanResponse(query, results, entities);
    
    // 4. Calcular confidence final
    const finalConfidence = Math.min(confidence + (results.regime?.length > 0 ? 0.1 : 0), 1.0);

    console.log('✅ Agent Urban concluído:', { 
      confidence: finalConfidence, 
      entitiesFound: Object.keys(entities).length,
      resultsFound: Object.keys(results).length 
    });

    return new Response(JSON.stringify({
      agent: 'urban',
      response,
      confidence: finalConfidence,
      data: results,
      entities,
      metadata: {
        hasRegimeData: !!results.regime?.length,
        hasRiskData: !!results.risks?.length,
        entitiesProcessed: Object.keys(entities).length
      }
    }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });

  } catch (error) {
    console.error('❌ Agent Urban erro:', error);
    
    return new Response(JSON.stringify({
      agent: 'urban',
      error: 'Erro no processamento urbanístico',
      details: error.message,
      confidence: 0
    }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }
});

/**
 * Extrai entidades urbanas da query (bairro, zona, etc.)
 */
function extractUrbanEntities(query: string) {
  const entities: any = {};
  const queryLower = query.toLowerCase();

  // Padrões de bairros conhecidos
  const bairroPatterns = [
    /bairro\s+([a-záéíóúãõç\s]+)/i,
    /no\s+([a-záéíóúãõç\s]+)/i,
    /em\s+([a-záéíóúãõç\s]+)/i,
    /(centro|gloria|tristeza|mont[\'']?serrat|independencia|floresta|santana|partenon|bom\s+fim)/i
  ];

  for (const pattern of bairroPatterns) {
    const match = query.match(pattern);
    if (match) {
      entities.bairro = match[1]?.trim() || match[0]?.trim();
      break;
    }
  }

  // Padrões de zonas
  const zonaPatterns = [
    /zona\s+([a-z0-9\-]+)/i,
    /(zc[0-9]*|zr[0-9]*|zm[0-9]*|zi[0-9]*|zp[0-9]*)/i
  ];

  for (const pattern of zonaPatterns) {
    const match = query.match(pattern);
    if (match) {
      entities.zona = match[1]?.trim() || match[0]?.trim();
      break;
    }
  }

  // Detectar intenções de consulta
  if (queryLower.includes('altura') || queryLower.includes('gabarito')) {
    entities.consultaAltura = true;
  }

  if (queryLower.includes('coeficiente') || queryLower.includes('aproveitamento')) {
    entities.consultaCoeficiente = true;
  }

  if (queryLower.includes('risco') || queryLower.includes('inundação') || queryLower.includes('desastre')) {
    entities.consultaRisco = true;
  }

  return entities;
}

/**
 * Busca dados do regime urbanístico
 */
async function getRegimeData(supabaseClient: any, entities: any) {
  try {
    let query = supabaseClient.from('regime_urbanistico').select('*');

    if (entities.bairro) {
      query = query.ilike('bairro', `%${entities.bairro}%`);
    }

    if (entities.zona) {
      query = query.ilike('zona', `%${entities.zona}%`);
    }

    const { data, error } = await query.limit(10);

    if (error) {
      console.error('Erro ao buscar regime:', error);
      return [];
    }

    console.log(`📊 Regime encontrado: ${data?.length || 0} registros`);
    return data || [];

  } catch (error) {
    console.error('Erro na busca de regime:', error);
    return [];
  }
}

/**
 * Busca dados de riscos de desastres
 */
async function getRiskData(supabaseClient: any, bairro: string) {
  try {
    const { data, error } = await supabaseClient
      .from('bairros_risco_desastre')
      .select('*')
      .ilike('bairro_nome', `%${bairro}%`)
      .limit(5);

    if (error) {
      console.error('Erro ao buscar riscos:', error);
      return [];
    }

    console.log(`⚠️ Riscos encontrados: ${data?.length || 0} registros`);
    return data || [];

  } catch (error) {
    console.error('Erro na busca de riscos:', error);
    return [];
  }
}

/**
 * Gera resposta contextualizada sobre dados urbanísticos
 */
function generateUrbanResponse(query: string, results: any, entities: any): string {
  let response = '';
  
  // Resposta sobre regime urbanístico
  if (results.regime?.length > 0) {
    response += `**Regime Urbanístico Encontrado:**\n\n`;
    
    results.regime.forEach((regime: any, index: number) => {
      response += `**${index + 1}. Bairro: ${regime.bairro} - Zona: ${regime.zona}**\n`;
      
      if (regime.altura_maxima) {
        response += `• Altura máxima: ${regime.altura_maxima}m\n`;
      }
      
      if (regime.coef_aproveitamento_basico) {
        response += `• Coeficiente básico: ${regime.coef_aproveitamento_basico}\n`;
      }
      
      if (regime.coef_aproveitamento_maximo) {
        response += `• Coeficiente máximo: ${regime.coef_aproveitamento_maximo}\n`;
      }
      
      if (regime.area_minima_lote) {
        response += `• Área mínima do lote: ${regime.area_minima_lote}m²\n`;
      }
      
      response += '\n';
    });
  }

  // Resposta sobre riscos
  if (results.risks?.length > 0) {
    response += `**Riscos de Desastres:**\n\n`;
    
    results.risks.forEach((risk: any) => {
      response += `**Bairro: ${risk.bairro_nome}**\n`;
      response += `• Nível geral de risco: ${risk.nivel_risco_geral}/5\n`;
      
      const tiposRisco = [];
      if (risk.risco_inundacao) tiposRisco.push('Inundação');
      if (risk.risco_deslizamento) tiposRisco.push('Deslizamento');
      if (risk.risco_alagamento) tiposRisco.push('Alagamento');
      if (risk.risco_vendaval) tiposRisco.push('Vendaval');
      if (risk.risco_granizo) tiposRisco.push('Granizo');
      
      if (tiposRisco.length > 0) {
        response += `• Tipos de risco: ${tiposRisco.join(', ')}\n`;
      }
      
      response += '\n';
    });
  }

  // Se não encontrou dados específicos
  if (!results.regime?.length && !results.risks?.length) {
    if (entities.bairro || entities.zona) {
      response = `Não foram encontrados dados específicos para "${entities.bairro || entities.zona}". `;
      response += `Verifique a grafia do bairro/zona ou consulte a lista completa de regiões disponíveis.`;
    } else {
      response = `Para consultar o regime urbanístico, especifique o bairro ou zona de interesse. `;
      response += `Por exemplo: "Qual o regime urbanístico do bairro Centro?" ou "Altura máxima na zona ZC".`;
    }
  }

  return response;
}