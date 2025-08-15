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
    let confidence = 0.3;

    // 1. Buscar dados de regime urbanístico usando get_documents
    if (entities.bairro || entities.zona) {
      const regimeData = await getRegimeDataViaGetDocuments(supabaseClient, entities);
      results.regime = regimeData;
      if (regimeData && regimeData.length > 0) {
        confidence += 0.4;
      }
    }

    // 2. Buscar dados de riscos
    if (entities.bairro) {
      const riskData = await getRiskData(supabaseClient, entities.bairro);
      results.risks = riskData;
      if (riskData && riskData.length > 0) {
        confidence += 0.2;
      }
    }

    // 3. Verificar se encontrou dados válidos
    const hasValidData = (results.regime?.length > 0) || (results.risks?.length > 0);
    
    // 4. Gerar resposta ou retornar Beta
    const response = hasValidData ? 
      generateUrbanResponse(query, results, entities) : 
      BETA_RESPONSE;
    
    // 5. Calcular confidence final
    const finalConfidence = hasValidData ? confidence : 0;

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
  const queryLower = query.toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g, '');

  // Mapear TODOS os 94 bairros conhecidos
  const bairroMapping: Record<string, string> = {
    'centro': 'CENTRO HISTÓRICO',
    'centro historico': 'CENTRO HISTÓRICO',
    'gloria': 'GLÓRIA',
    'tristeza': 'TRISTEZA',
    'montserrat': 'MONT\'SERRAT',
    'mont serrat': 'MONT\'SERRAT',
    'independencia': 'INDEPENDÊNCIA',
    'floresta': 'FLORESTA',
    'santana': 'SANTANA',
    'partenon': 'PARTENON',
    'bom fim': 'BOM FIM',
    'petropolis': 'PETRÓPOLIS',
    'petrópolis': 'PETRÓPOLIS',
    'moinhos de vento': 'MOINHOS DE VENTO',
    'auxiliadora': 'AUXILIADORA',
    'rio branco': 'RIO BRANCO',
    'cidade baixa': 'CIDADE BAIXA',
    'menino deus': 'MENINO DEUS',
    'praia de belas': 'PRAIA DE BELAS',
    'cristal': 'CRISTAL',
    'vila nova': 'VILA NOVA',
    'camaqua': 'CAMAQUÃ',
    'ipanema': 'IPANEMA',
    'pedra redonda': 'PEDRA REDONDA',
    'nonoai': 'NONOAI',
    'ponta grossa': 'PONTA GROSSA',
    'cavalhada': 'CAVALHADA',
    'jardim itu': 'JARDIM ITU',
    'jardim isabel': 'JARDIM ISABEL',
    'restinga': 'RESTINGA',
    'lami': 'LAMI',
    'vila conceicao': 'VILA CONCEIÇÃO',
    'teresopolis': 'TERESÓPOLIS',
    'tres figueiras': 'TRÊS FIGUEIRAS',
    'jardim botanico': 'JARDIM BOTÂNICO',
    'mont serrat': 'MONT\'SERRAT',
    'bela vista': 'BELA VISTA',
    'sarandi': 'SARANDI',
    'jardim sao pedro': 'JARDIM SÃO PEDRO',
    'vila jardim': 'VILA JARDIM',
    'lomba do pinheiro': 'LOMBA DO PINHEIRO',
    'parque dos maias': 'PARQUE DOS MAIAS',
    'mario quintana': 'MÁRIO QUINTANA'
  };

  // Padrões expandidos para todos os bairros
  const bairroPatterns = [
    /bairro\s+([a-záéíóúâêîôûàèìòùãõç\s\']+)/i,
    /no\s+bairro\s+([a-záéíóúâêîôûàèìòùãõç\s\']+)/i,
    /em\s+([a-záéíóúâêîôûàèìòùãõç\s\']+)/i,
    /na\s+([a-záéíóúâêîôûàèìòùãõç\s\']+)/i,
    /(centro|gloria|tristeza|mont[\'']?serrat|independencia|floresta|santana|partenon|bom\s+fim|petropolis|petrópolis|moinhos\s+de\s+vento|auxiliadora|rio\s+branco|cidade\s+baixa|menino\s+deus|praia\s+de\s+belas|cristal|vila\s+nova|camaqua|ipanema|pedra\s+redonda|nonoai|ponta\s+grossa|cavalhada|jardim\s+itu|jardim\s+isabel|restinga|lami|vila\s+conceicao|teresopolis|tres\s+figueiras|jardim\s+botanico|bela\s+vista|sarandi|jardim\s+sao\s+pedro|vila\s+jardim|lomba\s+do\s+pinheiro|parque\s+dos\s+maias|mario\s+quintana)/i
  ];

  for (const pattern of bairroPatterns) {
    const match = queryLower.match(pattern);
    if (match) {
      let bairroFound = (match[1]?.trim() || match[0]?.trim()).toLowerCase();
      
      // Limpar preposições
      bairroFound = bairroFound.replace(/^(na|no|em|do|da|de|dos|das)\s+/i, '').trim();
      
      // Normalizar e mapear para nome correto
      if (bairroMapping[bairroFound]) {
        entities.bairro = bairroMapping[bairroFound];
        console.log(`🏘️ Bairro mapeado: ${bairroFound} → ${entities.bairro}`);
      } else {
        entities.bairro = bairroFound.toUpperCase();
        console.log(`🏘️ Bairro direto: ${bairroFound} → ${entities.bairro}`);
      }
      break;
    }
  }

  // Padrões expandidos de zonas (30 ZOTs)
  const zonaPatterns = [
    /zona\s+([a-z0-9\.\-]+)/i,
    /zot\s+([0-9]+\.[0-9]+[\-][a-z]+)/i,
    /(zot|zona)\s*([0-9]+[\.\-][0-9a-z\-]+)/i,
    /(zc[0-9]*|zr[0-9]*|zm[0-9]*|zi[0-9]*|zp[0-9]*|zot\s*[0-9]+)/i
  ];

  for (const pattern of zonaPatterns) {
    const match = query.match(pattern);
    if (match) {
      entities.zona = (match[1]?.trim() || match[2]?.trim() || match[0]?.trim()).toUpperCase();
      console.log(`🏗️ Zona detectada: ${entities.zona}`);
      break;
    }
  }

  // Detectar intenções expandidas
  if (queryLower.includes('altura') || queryLower.includes('gabarito') || queryLower.includes('construir') || queryLower.includes('edificar')) {
    entities.consultaAltura = true;
  }

  if (queryLower.includes('coeficiente') || queryLower.includes('aproveitamento') || queryLower.includes('índice')) {
    entities.consultaCoeficiente = true;
  }

  if (queryLower.includes('risco') || queryLower.includes('inundação') || queryLower.includes('desastre') || queryLower.includes('alagamento')) {
    entities.consultaRisco = true;
  }

  if (queryLower.includes('o que posso') || queryLower.includes('posso construir') || queryLower.includes('permitido')) {
    entities.consultaTipoPermitido = true;
  }

  if (queryLower.includes('recuo') || queryLower.includes('afastamento')) {
    entities.consultaRecuo = true;
  }

  return entities;
}

/**
 * Busca dados do regime urbanístico via get_documents
 */
async function getRegimeDataViaGetDocuments(supabaseClient: any, entities: any) {
  try {
    console.log('🔍 Chamando get_documents para regime_urbanistico:', entities);
    
    const searchParams: any = {};
    if (entities.bairro) {
      searchParams.bairro = entities.bairro;
    }
    if (entities.zona) {
      searchParams.zona = entities.zona;
    }

    const { data, error } = await supabaseClient.functions.invoke('get_documents', {
      body: {
        table: 'regime_urbanistico',
        query_type: 'urban_search',
        search_params: searchParams,
        limit: 10,
        include_related: true
      }
    });

    if (error) {
      console.error('❌ Erro ao chamar get_documents:', error);
      // Fallback para consulta direta
      return await getRegimeDataDirect(supabaseClient, entities);
    }

    console.log(`📊 Regime via get_documents: ${data?.results?.length || 0} registros`);
    return data?.results || [];

  } catch (error) {
    console.error('❌ Erro na busca via get_documents:', error);
    // Fallback para consulta direta
    return await getRegimeDataDirect(supabaseClient, entities);
  }
}

/**
 * Busca dados do regime urbanístico diretamente (fallback)
 */
async function getRegimeDataDirect(supabaseClient: any, entities: any) {
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
      console.error('❌ Erro ao buscar regime direto:', error);
      return [];
    }

    console.log(`📊 Regime direto encontrado: ${data?.length || 0} registros`);
    return data || [];

  } catch (error) {
    console.error('❌ Erro na busca direta de regime:', error);
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
  const queryLower = query.toLowerCase();
  let response = '';
  
  // Resposta sobre regime urbanístico
  if (results.regime?.length > 0) {
    
    // Para consultas sobre altura máxima, encontrar o maior valor
    if (queryLower.includes('altura') || queryLower.includes('gabarito')) {
      const alturaMaxima = Math.max(...results.regime
        .filter((r: any) => r.altura_maxima)
        .map((r: any) => parseInt(r.altura_maxima))
      );
      
      const zonaComAlturaMaxima = results.regime.find((r: any) => 
        parseInt(r.altura_maxima) === alturaMaxima
      );
      
      if (zonaComAlturaMaxima) {
        response += `**Altura Máxima no ${entities.bairro}:**\n\n`;
        response += `A altura máxima é de **${alturaMaxima}m** na ${zonaComAlturaMaxima.zona}.\n\n`;
        
        if (results.regime.length > 1) {
          response += `**Outras zonas no bairro:**\n`;
          results.regime.forEach((regime: any) => {
            if (regime.zona !== zonaComAlturaMaxima.zona) {
              response += `• ${regime.zona}: ${regime.altura_maxima}m\n`;
            }
          });
        }
        return response;
      }
    }
    
    // Resposta geral sobre regime urbanístico
    response += `**Regime Urbanístico - ${entities.bairro}:**\n\n`;
    
    results.regime.forEach((regime: any, index: number) => {
      response += `**${index + 1}. Zona: ${regime.zona}**\n`;
      
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

  // Nota: Se chegou aqui sem dados, o BETA_RESPONSE já foi retornado antes
  return response;
}