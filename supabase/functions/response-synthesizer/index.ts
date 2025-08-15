import "https://deno.land/x/xhr@0.1.0/mod.ts";
import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

// Template padrão para finalizar respostas
const FOOTER_TEMPLATE = `
📍 Explore mais:
Mapa com Regras Construtivas: https://bit.ly/3ILdXRA ↗ ↗
Contribua com sugestões: https://bit.ly/4o7AWqb ↗ ↗
Participe da Audiência Pública: https://bit.ly/4oefZKm ↗ ↗
💬 Dúvidas? planodiretor@portoalegre.rs.gov.br`;

// 🚨 FUNÇÃO CRÍTICA - RESPOSTAS DIRETAS DOS DADOS
function generateDirectDataResponse(regimeData: any[], zotData: any[], originalQuery: string): string {
  console.log('🛡️ GENERATING DIRECT DATA RESPONSE:', {
    regimeRecords: regimeData.length,
    zotRecords: zotData.length,
    query: originalQuery
  });

  const queryLower = originalQuery.toLowerCase();

  // Handle ZOT neighborhood queries
  if (zotData.length > 0 && queryLower.includes('zot 12')) {
    console.log('🗺️ BUILDING ZOT 12 RESPONSE FROM REAL DATA');
    
    const bairrosList = zotData.map(item => item.bairro).join(', ');
    return `A ZOT 12 compreende ${zotData.length} bairros:

${bairrosList}

${FOOTER_TEMPLATE}`;
  }

  // Handle regime urbanistic queries
  if (regimeData.length > 0) {
    console.log('📊 BUILDING REGIME RESPONSE FROM REAL DATA');
    
    let response = `Para este bairro, os dados oficiais são:

`;

    // Build table from EXACT data
    response += `Bairro\tZona\tAltura Máxima\tCA Básico\tCA Máximo\n`;
    
    for (const record of regimeData) {
      const bairro = record.bairro || 'N/A';
      const zona = record.zona || 'N/A';
      const altura = record.altura_maxima ? `${record.altura_maxima}m` : 'N/A';
      const caBasico = record.coef_aproveitamento_basico !== null && record.coef_aproveitamento_basico !== undefined 
        ? String(record.coef_aproveitamento_basico) : 'N/A';
      const caMaximo = record.coef_aproveitamento_maximo !== null && record.coef_aproveitamento_maximo !== undefined 
        ? String(record.coef_aproveitamento_maximo) : 'N/A';
      
      response += `${bairro}\t${zona}\t${altura}\t${caBasico}\t${caMaximo}\n`;
      console.log(`📝 ROW: ${bairro} | ${zona} | ${altura} | ${caBasico} | ${caMaximo}`);
    }

    // Add detailed breakdown
    response += `\nDetalhamento oficial:\n`;
    for (const record of regimeData) {
      if (regimeData.length > 1) {
        response += `\n**${record.zona || 'Zona'}:**\n`;
      }
      response += `Altura máxima: ${record.altura_maxima ? record.altura_maxima + ' metros' : 'Não definida'}\n`;
      response += `CA básico: ${record.coef_aproveitamento_basico !== null && record.coef_aproveitamento_basico !== undefined 
        ? record.coef_aproveitamento_basico : 'Não definido'}\n`;
      response += `CA máximo: ${record.coef_aproveitamento_maximo !== null && record.coef_aproveitamento_maximo !== undefined 
        ? record.coef_aproveitamento_maximo : 'Não definido'}\n`;
    }

    response += `${FOOTER_TEMPLATE}`;
    return response;
  }

  // No data found
  console.log('❌ NO DATA FOUND - RETURNING NO DATA MESSAGE');
  return `Não foram encontrados dados específicos para esta consulta na base de dados oficial.

${FOOTER_TEMPLATE}`;
}

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    console.log('🚨 RESPONSE-SYNTHESIZER: MODO ANTI-FABRICAÇÃO ATIVO');
    
    const { originalQuery, agentResults } = await req.json();
    
    console.log('🔍 agentResults type:', typeof agentResults, 'length:', agentResults?.length);
    console.log('🔍 Data verification - agentResults:', JSON.stringify(agentResults, null, 2));

    // Extrair TODOS os dados SQL válidos dos agent results
    let allRegimeData = [];
    let allZotData = [];
    
    if (agentResults && Array.isArray(agentResults)) {
      agentResults.forEach((agent, index) => {
        console.log(`🤖 Agent ${index} - Type: ${agent.type}`, {
          hasRegimeData: !!agent.data?.regime_data,
          regimeCount: agent.data?.regime_data?.length || 0,
          hasZotData: !!agent.data?.zot_data,
          zotCount: agent.data?.zot_data?.length || 0
        });
        
        if (agent.data?.regime_data && Array.isArray(agent.data.regime_data)) {
          console.log(`📊 Found ${agent.data.regime_data.length} regime records from agent ${index}`);
          allRegimeData.push(...agent.data.regime_data);
        }
        
        if (agent.data?.zot_data && Array.isArray(agent.data.zot_data)) {
          console.log(`🗺️ Found ${agent.data.zot_data.length} ZOT records from agent ${index}`);
          allZotData.push(...agent.data.zot_data);
        }
      });
    }

    console.log(`✅ FINAL DATA COUNTS:`, {
      regimeRecords: allRegimeData.length,
      zotRecords: allZotData.length,
      totalRecords: allRegimeData.length + allZotData.length
    });

    // 🚨 RESPOSTA DIRETA DOS DADOS - ZERO LLM
    const directResponse = generateDirectDataResponse(allRegimeData, allZotData, originalQuery);
    
    console.log('✅ FINAL DIRECT RESPONSE GENERATED (NO LLM)');

    return new Response(JSON.stringify({
      response: directResponse,
      confidence: 0.99,
      sources: { 
        tabular: allRegimeData.length + allZotData.length,
        conceptual: 0,
        dataSource: 'direct_data_no_llm',
        method: 'zero_fabrication_mode'
      }
    }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });

  } catch (error) {
    console.error('🔥 Error in response-synthesizer:', error);
    return new Response(JSON.stringify({
      response: `Erro interno no processamento. Por favor, tente novamente.

${FOOTER_TEMPLATE}`,
      confidence: 0.0,
      sources: { tabular: 0, conceptual: 0 },
      error: error.message
    }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }
});