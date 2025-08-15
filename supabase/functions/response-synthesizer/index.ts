import "https://deno.land/x/xhr@0.1.0/mod.ts";
import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.38.4';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

// Initialize Supabase client
const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
const openaiApiKey = Deno.env.get('OPENAI_API_KEY')!;
const supabase = createClient(supabaseUrl, supabaseServiceKey);

// Template padrão para finalizar respostas
const FOOTER_TEMPLATE = `
📍 Explore mais:
Mapa com Regras Construtivas: https://bit.ly/3ILdXRA ↗ ↗
Contribua com sugestões: https://bit.ly/4o7AWqb ↗ ↗
Participe da Audiência Pública: https://bit.ly/4oefZKm ↗ ↗
💬 Dúvidas? planodiretor@portoalegre.rs.gov.br`;

// 🎯 MULTI-FIELD PARSER - Detecta campos específicos solicitados
function parseQueryIntent(query: string): { 
  requestedFields: string[], 
  fieldCategories: string[], 
  isTabularQuery: boolean,
  isSemanticQuery: boolean 
} {
  const queryLower = query.toLowerCase();
  
  const fieldMapping = {
    // Área e dimensões
    'area_minima_lote': ['área mínima', 'área do lote', 'lote mínimo'],
    'testada_minima_lote': ['testada mínima', 'testada do lote', 'frente mínima'],
    
    // Altura e volumetria
    'altura_maxima': ['altura máxima', 'altura máx', 'gabarito'],
    'coef_aproveitamento_basico': ['coeficiente básico', 'ca básico', 'aproveitamento básico'],
    'coef_aproveitamento_maximo': ['coeficiente máximo', 'ca máximo', 'aproveitamento máximo'],
    
    // Afastamentos
    'afastamento_frente': ['afastamento frente', 'recuo frontal', 'afastamento frontal'],
    'afastamento_lateral': ['afastamento lateral', 'recuo lateral'],
    'afastamento_fundos': ['afastamento fundos', 'recuo fundos', 'afastamento fundo'],
    
    // Atividades comerciais
    'comercio_varejista_inocuo': ['comércio varejista', 'varejo inocuo'],
    'comercio_atacadista_ia1': ['comércio atacadista', 'atacado'],
    'servico_inocuo': ['serviços inocuos', 'serviços'],
    'industria_inocua': ['indústria inocua', 'indústria'],
    
    // Parcelamento
    'modulo_fracionamento': ['módulo fracionamento', 'fracionamento'],
    'enquadramento_loteamento': ['loteamento', 'parcelamento'],
    'area_publica_viaria_loteamento': ['área viária', 'sistema viário'],
    
    // Permeabilidade
    'fator_conversao_permeabilidade': ['permeabilidade', 'taxa permeável'],
    'recuo_jardim': ['recuo jardim', 'jardim frontal']
  };
  
  const requestedFields = [];
  const fieldCategories = [];
  
  // Detectar campos específicos
  for (const [field, keywords] of Object.entries(fieldMapping)) {
    if (keywords.some(keyword => queryLower.includes(keyword))) {
      requestedFields.push(field);
      
      // Categorizar
      if (field.includes('afastamento') || field.includes('recuo')) {
        if (!fieldCategories.includes('afastamentos')) fieldCategories.push('afastamentos');
      } else if (field.includes('comercio') || field.includes('servico') || field.includes('industria')) {
        if (!fieldCategories.includes('atividades')) fieldCategories.push('atividades');
      } else if (field.includes('loteamento') || field.includes('fracionamento')) {
        if (!fieldCategories.includes('parcelamento')) fieldCategories.push('parcelamento');
      } else if (field.includes('area') || field.includes('testada')) {
        if (!fieldCategories.includes('dimensoes')) fieldCategories.push('dimensoes');
      } else if (field.includes('altura') || field.includes('coef')) {
        if (!fieldCategories.includes('volumetria')) fieldCategories.push('volumetria');
      }
    }
  }
  
  // Determinar tipo de query
  const isTabularQuery = requestedFields.length > 0 || 
    queryLower.includes('bairro') || 
    queryLower.includes('zona') || 
    queryLower.includes('zot') ||
    queryLower.includes('regime');
    
  const isSemanticQuery = !isTabularQuery || 
    queryLower.includes('o que') || 
    queryLower.includes('como') || 
    queryLower.includes('por que') ||
    queryLower.includes('conceito') ||
    queryLower.includes('explicar');
  
  return { 
    requestedFields, 
    fieldCategories, 
    isTabularQuery, 
    isSemanticQuery 
  };
}

// 🏗️ MULTI-FIELD DATA FORMATTER - Formata dados específicos
function formatMultiFieldData(
  regimeData: any[], 
  zotData: any[], 
  riskData: any[],
  parsedIntent: any, 
  originalQuery: string
): string {
  console.log('🎯 MULTI-FIELD FORMATTER:', {
    regimeRecords: regimeData.length,
    zotRecords: zotData.length,
    riskRecords: riskData.length,
    requestedFields: parsedIntent.requestedFields,
    categories: parsedIntent.fieldCategories
  });

  const queryLower = originalQuery.toLowerCase();

  // 🗺️ ZOT Queries - All zones
  if (zotData.length > 0) {
    console.log('🗺️ BUILDING ZOT RESPONSE FROM REAL DATA');
    
    const bairrosList = zotData.map(item => item.bairro).join(', ');
    const zotName = zotData[0]?.zona || 'zona especificada';
    
    return `A ${zotName} compreende ${zotData.length} bairros:

${bairrosList}

${FOOTER_TEMPLATE}`;
  }

  // 🏘️ Risk Data Queries - ONLY if no urban data and query is explicitly about risks
  const isRiskQuery = queryLower.includes('risco') || queryLower.includes('inundação') || 
                      queryLower.includes('deslizamento') || queryLower.includes('desastre') ||
                      queryLower.includes('alagamento') || queryLower.includes('vendaval');
  
  if (riskData.length > 0 && regimeData.length === 0 && isRiskQuery) {
    console.log('⚠️ BUILDING RISK RESPONSE FROM REAL DATA');
    
    const risk = riskData[0];
    let response = `Informações de risco para o bairro:\n\n`;
    
    if (risk.riscos_ativos && risk.riscos_ativos.length > 0) {
      response += `🚨 Riscos identificados: ${risk.riscos_ativos.join(', ')}\n`;
      response += `📊 Nível de risco: ${risk.descricao_riscos}\n`;
    } else {
      response += `✅ Sem riscos específicos identificados\n`;
    }
    
    response += `\n${FOOTER_TEMPLATE}`;
    return response;
  }

  // 🏗️ REGIME QUERIES - MULTI-FIELD INTELLIGENCE
  if (regimeData.length > 0) {
    console.log('📊 BUILDING MULTI-FIELD REGIME RESPONSE');
    
    // 🎯 FIELD-SPECIFIC RESPONSE
    if (parsedIntent.requestedFields.length > 0) {
      return formatSpecificFieldsResponse(regimeData, parsedIntent, originalQuery);
    }
    
    // 📋 DEFAULT COMPREHENSIVE RESPONSE
    return formatComprehensiveResponse(regimeData, originalQuery);
  }

  // No data found
  console.log('❌ NO DATA FOUND - RETURNING NO DATA MESSAGE');
  return `Não foram encontrados dados específicos para esta consulta na base de dados oficial.

${FOOTER_TEMPLATE}`;
}

// 🎯 SPECIFIC FIELDS FORMATTER - Campos específicos solicitados
function formatSpecificFieldsResponse(regimeData: any[], parsedIntent: any, originalQuery: string): string {
  let response = '';
  
  // Detectar se pergunta específica sobre área mínima
  const queryLower = originalQuery.toLowerCase();
  if (queryLower.includes('área mínima')) {
    response = `**Área Mínima do Lote:**\n\n`;
    
    for (const record of regimeData) {
      const areaMinima = record.area_minima_lote || 'Não definida';
      const testadaMinima = record.testada_minima_lote || 'Não definida';
      
      response += `📍 **${record.zona || 'Zona'}:** `;
      response += `${areaMinima !== 'Não definida' ? areaMinima + ' m²' : areaMinima}`;
      
      if (testadaMinima !== 'Não definida') {
        response += ` (testada mínima: ${testadaMinima} m)`;
      }
      response += '\n';
      
      console.log(`📝 FIELD: ${record.zona} | Área: ${areaMinima} m² | Testada: ${testadaMinima} m`);
    }
  }
  
  // Afastamentos
  else if (parsedIntent.fieldCategories.includes('afastamentos')) {
    response = `**Afastamentos Obrigatórios:**\n\n`;
    
    for (const record of regimeData) {
      response += `📍 **${record.zona || 'Zona'}:**\n`;
      response += `• Frente: ${record.afastamento_frente || 'Não definido'}\n`;
      response += `• Lateral: ${record.afastamento_lateral || 'Não definido'}\n`;
      response += `• Fundos: ${record.afastamento_fundos || 'Não definido'}\n\n`;
    }
  }
  
  // Atividades
  else if (parsedIntent.fieldCategories.includes('atividades')) {
    response = `**Atividades Permitidas:**\n\n`;
    
    for (const record of regimeData) {
      response += `📍 **${record.zona || 'Zona'}:**\n`;
      response += `• Comércio Varejista: ${record.comercio_varejista_inocuo || 'Não definido'}\n`;
      response += `• Comércio Atacadista: ${record.comercio_atacadista_ia1 || 'Não definido'}\n`;
      response += `• Serviços: ${record.servico_inocuo || 'Não definido'}\n`;
      response += `• Indústria: ${record.industria_inocua || 'Não definido'}\n\n`;
    }
  }
  
  // Default multi-field
  else {
    response = `**Dados Solicitados:**\n\n`;
    
    for (const record of regimeData) {
      response += `📍 **${record.zona || 'Zona'}:**\n`;
      
      for (const field of parsedIntent.requestedFields) {
        const value = record[field];
        const displayName = field.replace(/_/g, ' ').replace(/\b\w/g, l => l.toUpperCase());
        response += `• ${displayName}: ${value || 'Não definido'}\n`;
      }
      response += '\n';
    }
  }
  
  response += `${FOOTER_TEMPLATE}`;
  return response;
}

// 📋 COMPREHENSIVE RESPONSE - Resposta completa padrão
function formatComprehensiveResponse(regimeData: any[], originalQuery: string): string {
  let response = `Para este bairro, os dados oficiais são:\n\n`;

  // Tabela principal otimizada
  response += `| Zona | Altura Máx | CA Básico | CA Máximo | Área Mín. Lote | Testada Mín. |\n`;
  response += `|------|------------|-----------|-----------|----------------|---------------|\n`;
  
  for (const record of regimeData) {
    const zona = record.zona || 'N/A';
    const altura = record.altura_maxima ? `${record.altura_maxima}m` : 'N/A';
    const caBasico = record.coef_aproveitamento_basico !== null ? String(record.coef_aproveitamento_basico) : 'N/A';
    const caMaximo = record.coef_aproveitamento_maximo !== null ? String(record.coef_aproveitamento_maximo) : 'N/A';
    const areaMinima = record.area_minima_lote ? `${record.area_minima_lote}m²` : 'N/A';
    const testadaMinima = record.testada_minima_lote ? `${record.testada_minima_lote}m` : 'N/A';
    
    response += `| ${zona} | ${altura} | ${caBasico} | ${caMaximo} | ${areaMinima} | ${testadaMinima} |\n`;
    
    console.log(`📝 ROW: ${zona} | ${altura} | ${caBasico} | ${caMaximo} | ${areaMinima} | ${testadaMinima}`);
  }

  // Glossário de siglas
  response += `\n📖 **Significado das Siglas:**\n`;
  response += `• **CA** = Coeficiente de Aproveitamento (indica quantas vezes a área do terreno pode ser construída)\n`;
  response += `• **ZOT** = Zona de Ordenamento Territorial (áreas com regras específicas de ocupação)\n`;
  
  // Detectar outras siglas nas zonas
  const hasZOU = regimeData.some(record => record.zona?.includes('ZOU'));
  const hasZCP = regimeData.some(record => record.zona?.includes('ZCP'));
  const hasZEIS = regimeData.some(record => record.zona?.includes('ZEIS'));
  
  if (hasZOU) {
    response += `• **ZOU** = Zona de Ocupação Urbana (área consolidada da cidade)\n`;
  }
  if (hasZCP) {
    response += `• **ZCP** = Zona do Centro Principal (área central histórica)\n`;
  }
  if (hasZEIS) {
    response += `• **ZEIS** = Zona Especial de Interesse Social (habitação popular)\n`;
  }

  response += `\n${FOOTER_TEMPLATE}`;
  return response;
}

// 🧠 SEMANTIC SYNTHESIS - Combina dados reais com contexto semântico
async function synthesizeSemanticResponse(
  tabularData: string,
  semanticContext: any[],
  originalQuery: string,
  confidence: number
): Promise<string> {
  console.log('🧠 SYNTHESIZING SEMANTIC RESPONSE');
  
  if (!openaiApiKey || semanticContext.length === 0) {
    console.log('📋 RETURNING TABULAR-ONLY RESPONSE');
    return tabularData;
  }
  
  try {
    // Preparar contexto semântico
    const contextText = semanticContext
      .filter(item => item.confidence > 0.7)
      .map(item => item.data?.legal_documents || item.data?.content)
      .filter(Boolean)
      .flat()
      .map(doc => doc.content_chunk || doc.content || '')
      .join('\n\n')
      .slice(0, 2000); // Limitar tamanho

    if (!contextText) {
      console.log('📋 NO SEMANTIC CONTEXT - RETURNING TABULAR DATA');
      return tabularData;
    }

    // Prompt para síntese híbrida
    const prompt = `Você é um assistente especializado em legislação urbana de Porto Alegre. 

DADOS OFICIAIS PRECISOS (100% corretos):
${tabularData}

CONTEXTO LEGAL ADICIONAL:
${contextText}

PERGUNTA ORIGINAL: ${originalQuery}

INSTRUÇÕES:
1. SEMPRE mantenha os dados numéricos oficiais EXATAMENTE como fornecidos
2. Use o contexto legal apenas para EXPLICAR e CONTEXTUALIZAR os dados
3. NÃO invente ou modifique nenhum número ou valor
4. Mantenha o rodapé com os links oficiais
5. Seja conciso e direto

Forneça uma resposta que combine os dados precisos com explicações contextuais relevantes:`;

    const response = await fetch('https://api.openai.com/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${openaiApiKey}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        model: 'gpt-4o-mini',
        messages: [{ role: 'user', content: prompt }],
        max_tokens: 1000,
        temperature: 0.1
      }),
    });

    if (response.ok) {
      const data = await response.json();
      const synthesizedResponse = data.choices[0]?.message?.content;
      
      if (synthesizedResponse) {
        console.log('✅ SEMANTIC SYNTHESIS SUCCESSFUL');
        return synthesizedResponse;
      }
    }
  } catch (error) {
    console.error('❌ Semantic synthesis error:', error);
  }
  
  console.log('📋 FALLBACK TO TABULAR DATA');
  return tabularData;
}

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    console.log('🎯 RESPONSE-SYNTHESIZER: AGENTIC-RAG HÍBRIDO COM ANTI-FABRICAÇÃO');
    
    const { originalQuery, agentResults } = await req.json();
    
    console.log('🔍 Request data:', {
      query: originalQuery,
      agentCount: agentResults?.length || 0
    });

    // 🎯 PARSE QUERY INTENT - Detectar campos específicos
    const parsedIntent = parseQueryIntent(originalQuery);
    console.log('🧠 Query Intent:', parsedIntent);

    // 📊 EXTRACT ALL DATA from agent results
    let allRegimeData = [];
    let allZotData = [];
    let allRiskData = [];
    let semanticAgents = [];
    
    if (agentResults && Array.isArray(agentResults)) {
      agentResults.forEach((agent, index) => {
        console.log(`🤖 Agent ${index} - Type: ${agent.type}`, {
          hasRegimeData: !!agent.data?.regime_data,
          hasZotData: !!agent.data?.zot_data,
          hasRiskData: !!agent.data?.risk_data,
          hasLegalData: !!agent.data?.legal_documents,
          confidence: agent.confidence
        });
        
        // Extract tabular data
        if (agent.data?.regime_data && Array.isArray(agent.data.regime_data)) {
          console.log(`📊 Found ${agent.data.regime_data.length} regime records from agent ${index}`);
          allRegimeData.push(...agent.data.regime_data);
        }
        
        if (agent.data?.zot_data && Array.isArray(agent.data.zot_data)) {
          console.log(`🗺️ Found ${agent.data.zot_data.length} ZOT records from agent ${index}`);
          allZotData.push(...agent.data.zot_data);
        }

        if (agent.data?.risk_data && Array.isArray(agent.data.risk_data)) {
          console.log(`⚠️ Found ${agent.data.risk_data.length} risk records from agent ${index}`);
          allRiskData.push(...agent.data.risk_data);
        }
        
        // Extract semantic context for legal/conceptual queries
        if (agent.type === 'legal' && agent.confidence > 0.7) {
          semanticAgents.push(agent);
        }
      });
    }

    console.log(`✅ EXTRACTED DATA:`, {
      regimeRecords: allRegimeData.length,
      zotRecords: allZotData.length,
      riskRecords: allRiskData.length,
      semanticAgents: semanticAgents.length
    });

    // 🎯 MULTI-FIELD TABULAR RESPONSE
    const tabularResponse = formatMultiFieldData(
      allRegimeData, 
      allZotData, 
      allRiskData,
      parsedIntent, 
      originalQuery
    );
    
    console.log('📋 TABULAR RESPONSE GENERATED');

    // 🧠 SEMANTIC ENHANCEMENT (if needed and available)
    let finalResponse = tabularResponse;
    let confidence = 0.99; // High confidence for tabular data
    let sources = { 
      tabular: allRegimeData.length + allZotData.length + allRiskData.length,
      conceptual: 0
    };

    // Only use semantic synthesis if:
    // 1. Query has semantic intent AND
    // 2. We have semantic context AND 
    // 3. We have tabular data to validate against
    if (parsedIntent.isSemanticQuery && semanticAgents.length > 0 && (allRegimeData.length > 0 || allZotData.length > 0)) {
      console.log('🧠 ATTEMPTING SEMANTIC SYNTHESIS');
      
      try {
        const semanticResponse = await synthesizeSemanticResponse(
          tabularResponse,
          semanticAgents,
          originalQuery,
          confidence
        );
        
        if (semanticResponse !== tabularResponse) {
          finalResponse = semanticResponse;
          sources.conceptual = semanticAgents.length;
          console.log('✅ SEMANTIC SYNTHESIS APPLIED');
        } else {
          console.log('📋 KEEPING TABULAR-ONLY RESPONSE');
        }
      } catch (error) {
        console.error('❌ Semantic synthesis failed, keeping tabular:', error);
      }
    }

    // 🛡️ CONFIDENCE ADJUSTMENT based on data quality
    if (allRegimeData.length === 0 && allZotData.length === 0 && allRiskData.length === 0) {
      confidence = 0.1; // No tabular data found
    } else if (parsedIntent.requestedFields.length > 0) {
      confidence = 0.95; // Specific fields requested and found
    }

    console.log('✅ FINAL HYBRID RESPONSE READY');

    return new Response(JSON.stringify({
      response: finalResponse,
      confidence: confidence,
      sources: {
        ...sources,
        dataSource: sources.conceptual > 0 ? 'hybrid_tabular_semantic' : 'direct_tabular',
        method: 'agentic_rag_with_anti_fabrication',
        fieldsRequested: parsedIntent.requestedFields.length,
        categoriesDetected: parsedIntent.fieldCategories
      },
      metadata: {
        queryType: parsedIntent.isTabularQuery ? 'tabular' : 'semantic',
        requestedFields: parsedIntent.requestedFields,
        fieldCategories: parsedIntent.fieldCategories,
        antiFabrication: true,
        pipeline: 'agentic-rag-hybrid'
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
      error: error.message,
      metadata: {
        pipeline: 'agentic-rag-hybrid',
        error: true
      }
    }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }
});