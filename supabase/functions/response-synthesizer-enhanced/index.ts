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

// 🎨 Template OTIMIZADO para finalizar respostas com melhor UX
const FOOTER_TEMPLATE = `

📍 **Explore mais:**
[🗺️ Mapa Interativo PDUS](https://bit.ly/3ILdXRA)
[💬 Contribua com sugestões](https://bit.ly/4oefZKm)

📧 **Dúvidas?** planodiretor@portoalegre.rs.gov.br

💬 *Sua pergunta é importante! Considere enviá-la pelos canais oficiais para contribuir com o aperfeiçoamento do plano.*`;

// 🏢 DETECTA PERGUNTAS SOBRE ENDEREÇOS/LOGRADOUROS
function detectAddressQuery(query: string): {
  isAddressQuery: boolean;
  needsNeighborhood: boolean;
  addressType: string;
} {
  const queryLower = query.toLowerCase();
  
  const addressIndicators = [
    'rua', 'avenida', 'av.', 'r.', 'travessa', 'beco', 
    'praça', 'largo', 'estrada', 'rodovia', 'logradouro',
    'cep', 'endereço', 'número', 'nº', 'esquina'
  ];
  
  const hasAddress = addressIndicators.some(indicator => queryLower.includes(indicator));
  const hasBairro = queryLower.includes('bairro') || queryLower.includes('zona');
  
  // Detecta nomes de ruas comuns em Porto Alegre
  const commonStreets = [
    'luiz voelcker', 'protásio alves', 'ipiranga', 'assis brasil',
    'bento gonçalves', 'cristóvão colombo', 'farrapos', 'sertório',
    'mauá', 'voluntários da pátria', 'borges de medeiros'
  ];
  
  const hasSpecificStreet = commonStreets.some(street => queryLower.includes(street));
  
  return {
    isAddressQuery: hasAddress || hasSpecificStreet,
    needsNeighborhood: (hasAddress || hasSpecificStreet) && !hasBairro,
    addressType: hasSpecificStreet ? 'specific_street' : (hasAddress ? 'generic_address' : 'none')
  };
}

// 🏗️ DETECTA PERGUNTAS SOBRE VALORES MÁXIMOS/MÍNIMOS
function detectMaxMinQuery(query: string): {
  isMaxMinQuery: boolean;
  queryType: 'max' | 'min' | 'none';
  field: string;
  scope: 'city' | 'zone' | 'neighborhood' | 'all';
} {
  const queryLower = query.toLowerCase();
  
  const maxIndicators = ['máxima', 'máximo', 'maior', 'mais alto', 'mais alta', 'superior'];
  const minIndicators = ['mínima', 'mínimo', 'menor', 'mais baixo', 'mais baixa', 'inferior'];
  
  const fields = {
    'altura': ['altura', 'gabarito', 'andar', 'pavimento'],
    'coeficiente': ['coeficiente', 'ca ', 'aproveitamento'],
    'area': ['área', 'lote', 'terreno'],
    'testada': ['testada', 'frente'],
    'permeabilidade': ['permeabilidade', 'permeável', 'taxa permeável']
  };
  
  let queryType: 'max' | 'min' | 'none' = 'none';
  let field = '';
  
  // Detecta tipo de consulta
  if (maxIndicators.some(ind => queryLower.includes(ind))) {
    queryType = 'max';
  } else if (minIndicators.some(ind => queryLower.includes(ind))) {
    queryType = 'min';
  }
  
  // Detecta campo
  for (const [key, indicators] of Object.entries(fields)) {
    if (indicators.some(ind => queryLower.includes(ind))) {
      field = key;
      break;
    }
  }
  
  // Detecta escopo
  let scope: 'city' | 'zone' | 'neighborhood' | 'all' = 'zone';
  if (queryLower.includes('porto alegre') || queryLower.includes('cidade')) {
    scope = 'city';
  } else if (queryLower.includes('todas') || queryLower.includes('todos')) {
    scope = 'all';
  } else if (queryLower.includes('bairro')) {
    scope = 'neighborhood';
  }
  
  return {
    isMaxMinQuery: queryType !== 'none' && field !== '',
    queryType,
    field,
    scope
  };
}

// 🌊 DETECTA PERGUNTAS SOBRE RISCO CLIMÁTICO
function detectRiskQuery(query: string): {
  isRiskQuery: boolean;
  riskType: string[];
  needsCount: boolean;
} {
  const queryLower = query.toLowerCase();
  
  const riskIndicators = {
    'inundacao': ['inundação', 'inundacao', 'enchente', 'alagamento', 'cheia'],
    'deslizamento': ['deslizamento', 'desmoronamento', 'erosão'],
    'vendaval': ['vendaval', 'vento', 'tempestade'],
    'protecao': ['protegido', 'proteção', 'sistema atual', 'dique', 'barreira']
  };
  
  const detectedRisks = [];
  for (const [key, indicators] of Object.entries(riskIndicators)) {
    if (indicators.some(ind => queryLower.includes(ind))) {
      detectedRisks.push(key);
    }
  }
  
  const needsCount = queryLower.includes('quantos') || queryLower.includes('quantidade') || 
                     queryLower.includes('número') || queryLower.includes('total');
  
  return {
    isRiskQuery: detectedRisks.length > 0,
    riskType: detectedRisks,
    needsCount
  };
}

// 🎯 BUSCA VALORES MÁXIMOS/MÍNIMOS NO BANCO
async function findExtremeValues(field: string, type: 'max' | 'min', scope: string) {
  console.log(`🔍 Buscando valores ${type} para ${field} no escopo ${scope}`);
  
  let column = '';
  switch(field) {
    case 'altura':
      column = 'Altura_Maxima___Edificacao_Isolada';
      break;
    case 'coeficiente':
      column = type === 'max' ? 'Coeficiente_de_Aproveitamento___Maximo' : 'Coeficiente_de_Aproveitamento___Basico';
      break;
    case 'area':
      column = 'Área_Minima_do_Lote';
      break;
    case 'testada':
      column = 'Testada_Minima_do_Lote';
      break;
    case 'permeabilidade':
      column = 'Taxa_de_Permeabilidade_acima_de_1\\,500_m2';
      break;
  }
  
  try {
    // Busca o valor extremo
    let query = supabase
      .from('regime_urbanistico_consolidado')
      .select(`Zona, Bairro, "${column}"`)
      .not(`"${column}"`, 'is', null);
    
    // Ordena conforme o tipo
    if (type === 'max') {
      query = query.order(`"${column}"`, { ascending: false });
    } else {
      query = query.order(`"${column}"`, { ascending: true });
    }
    
    const { data, error } = await query.limit(10);
    
    if (error) throw error;
    
    return data || [];
  } catch (error) {
    console.error('Erro ao buscar valores extremos:', error);
    return [];
  }
}

// 🌊 BUSCA DADOS DE RISCO CLIMÁTICO
async function findRiskData(riskType: string[], needsCount: boolean) {
  console.log('🌊 Buscando dados de risco climático:', riskType);
  
  try {
    let query = supabase
      .from('regime_urbanistico_consolidado')
      .select('Bairro, Zona, Categoria_Risco');
    
    // Filtros específicos por tipo de risco
    if (riskType.includes('protecao')) {
      query = query.ilike('Categoria_Risco', '%Protegido%Sistema%Atual%');
    } else if (riskType.includes('inundacao')) {
      query = query.or('Categoria_Risco.ilike.%Inundação%,Categoria_Risco.ilike.%Cota%');
    }
    
    const { data, error } = await query;
    
    if (error) throw error;
    
    if (needsCount) {
      // Agrupa por categoria de risco para contagem
      const grouped = data?.reduce((acc: any, item: any) => {
        const key = item.Categoria_Risco || 'Sem categoria';
        if (!acc[key]) {
          acc[key] = { count: 0, bairros: [] };
        }
        acc[key].count++;
        if (!acc[key].bairros.includes(item.Bairro)) {
          acc[key].bairros.push(item.Bairro);
        }
        return acc;
      }, {});
      
      return { data, grouped, totalCount: data?.length || 0 };
    }
    
    return { data, totalCount: data?.length || 0 };
  } catch (error) {
    console.error('Erro ao buscar dados de risco:', error);
    return { data: [], totalCount: 0 };
  }
}

// 🎨 FORMATA RESPOSTA COM MELHOR UX
function formatEnhancedResponse(
  data: any,
  queryType: string,
  originalQuery: string
): string {
  let response = '';
  
  // 🏢 RESPOSTA PARA ENDEREÇOS SEM BAIRRO
  if (queryType === 'address_needs_neighborhood') {
    response = `## 📍 Informação Importante\n\n`;
    response += `Para fornecer informações precisas sobre **parâmetros construtivos** de um endereço específico, preciso saber o **bairro** ou **zona (ZOT)** onde está localizado.\n\n`;
    response += `### Como posso ajudar:\n`;
    response += `✅ **Informe o bairro** - Ex: "Qual a altura máxima na Rua Luiz Voelcker no bairro **Três Figueiras**?"\n`;
    response += `✅ **Informe a zona** - Ex: "O que posso construir na **ZOT 08**?"\n\n`;
    response += `### 💡 Dica:\n`;
    response += `Você pode consultar o bairro do seu endereço no [Mapa Interativo do PDUS](https://bit.ly/3ILdXRA)`;
    response += FOOTER_TEMPLATE;
    return response;
  }
  
  // 📊 RESPOSTA PARA VALORES MÁXIMOS/MÍNIMOS
  if (queryType === 'extreme_values' && data.extremeValues) {
    const values = data.extremeValues;
    const field = data.field;
    const type = data.type;
    
    response = `## 📊 ${type === 'max' ? 'Maiores' : 'Menores'} valores de ${field} em Porto Alegre\n\n`;
    
    if (values.length > 0) {
      const topValue = values[0];
      const columnName = Object.keys(topValue).find(key => 
        key !== 'Zona' && key !== 'Bairro'
      );
      
      response += `### 🏆 ${type === 'max' ? 'Valor máximo' : 'Valor mínimo'}: **${topValue[columnName]}**\n\n`;
      
      response += `### 📍 Locais com ${type === 'max' ? 'maiores' : 'menores'} valores:\n\n`;
      response += `| Zona | Bairro | Valor |\n`;
      response += `|------|--------|-------|\n`;
      
      values.slice(0, 5).forEach((item: any) => {
        const value = item[columnName];
        const formattedValue = field === 'altura' ? `${value}m` : 
                              field === 'area' ? `${value}m²` :
                              field === 'testada' ? `${value}m` :
                              String(value);
        response += `| ${item.Zona} | ${item.Bairro} | **${formattedValue}** |\n`;
      });
      
      if (field === 'altura' && type === 'max') {
        response += `\n### ℹ️ Observação:\n`;
        response += `A altura máxima de **${topValue[columnName]}m** está presente em zonas de alta densidade. `;
        response += `Edificações nesta altura requerem **Estudo de Impacto de Vizinhança (EIV)**.\n`;
      }
    }
    
    response += FOOTER_TEMPLATE;
    return response;
  }
  
  // 🌊 RESPOSTA PARA RISCOS CLIMÁTICOS
  if (queryType === 'risk_analysis' && data.riskData) {
    const { grouped, totalCount } = data.riskData;
    
    response = `## 🌊 Análise de Risco Climático - Porto Alegre\n\n`;
    
    if (data.specificRisk === 'protecao') {
      const protectedAreas = grouped['Ocupação Acima da Cota de Inundação'] || 
                            grouped['Protegido pelo Sistema Atual'] || 
                            { count: 0, bairros: [] };
      
      response += '### ✅ Bairros Protegidos pelo Sistema Atual\n\n';
      response += '**Total:** ' + protectedAreas.count + ' zonas em ' + protectedAreas.bairros.length + ' bairros\n\n';
      
      if (protectedAreas.bairros.length > 0) {
        response += `**Bairros protegidos:**\n`;
        protectedAreas.bairros.slice(0, 20).forEach((bairro: string) => {
          response += `• ${bairro}\n`;
        });
        
        if (protectedAreas.bairros.length > 20) {
          response += '\n*E mais ' + (protectedAreas.bairros.length - 20) + ' bairros...*\n';
        }
      }
    } else {
      response += `### 📊 Categorias de Risco Identificadas\n\n`;
      
      Object.entries(grouped || {}).forEach(([category, info]: [string, any]) => {
        response += `**${category}**\n`;
        response += `• ${info.count} zonas em ${info.bairros.length} bairros\n\n`;
      });
    }
    
    response += `\n### ℹ️ Sobre o Sistema de Proteção:\n`;
    response += `Porto Alegre possui um sistema de proteção contra cheias que inclui diques, casas de bombas e comportas. `;
    response += `Áreas "Protegidas pelo Sistema Atual" estão dentro do perímetro de proteção.\n`;
    
    response += FOOTER_TEMPLATE;
    return response;
  }
  
  // 📋 RESPOSTA PADRÃO MELHORADA
  if (data.regimeData && data.regimeData.length > 0) {
    const regimeData = data.regimeData;
    const queryLower = originalQuery.toLowerCase();
    
    // Se não especificou indicador, mostra os principais
    if (!queryLower.includes('altura') && !queryLower.includes('coeficiente') && 
        !queryLower.includes('área') && !queryLower.includes('testada')) {
      
      response = `## 📊 Regime Urbanístico - ${regimeData[0].Bairro || 'Zona Especificada'}\n\n`;
      
      for (const record of regimeData) {
        response += `### 📍 ${record.Zona}\n\n`;
        response += `**Parâmetros principais:**\n`;
        response += `• **Altura máxima:** ${record.Altura_Maxima___Edificacao_Isolada || 'N/D'}m\n`;
        response += `• **Coef. Aproveitamento Básico:** ${record.Coeficiente_de_Aproveitamento___Basico || 'N/D'}\n`;
        response += `• **Coef. Aproveitamento Máximo:** ${record.Coeficiente_de_Aproveitamento___Maximo || 'N/D'}\n`;
        
        if (record.Categoria_Risco) {
          response += `• **Categoria de Risco:** ${record.Categoria_Risco}\n`;
        }
        
        response += `\n`;
      }
      
      response += `### 📖 Entenda os termos:\n`;
      response += `• **Coef. Aproveitamento:** Quantas vezes a área do terreno pode ser construída\n`;
      response += `• **Altura máxima:** Limite de altura para edificações isoladas\n`;
      response += `• **ZOT:** Zona de Ordenamento Territorial\n`;
    } else {
      // Resposta específica para o indicador solicitado
      response = formatSpecificIndicatorResponse(regimeData, originalQuery);
    }
    
    response += FOOTER_TEMPLATE;
    return response;
  }
  
  // Resposta padrão quando não há dados
  response = `## ℹ️ Informação não encontrada\n\n`;
  response += `Não encontrei dados específicos para sua consulta na base oficial do PDPOA 2025.\n\n`;
  response += `### Como posso ajudar melhor:\n`;
  response += `• Especifique o **bairro** ou **zona (ZOT)**\n`;
  response += `• Indique o **parâmetro** desejado (altura, coeficiente, etc.)\n`;
  response += `• Consulte o [Mapa Interativo](https://bit.ly/3ILdXRA) para localizar sua zona\n`;
  response += FOOTER_TEMPLATE;
  
  return response;
}

// 🎯 FORMATA RESPOSTA PARA INDICADOR ESPECÍFICO
function formatSpecificIndicatorResponse(regimeData: any[], query: string): string {
  const queryLower = query.toLowerCase();
  let response = '';
  
  if (queryLower.includes('altura')) {
    response = `## 🏗️ Alturas Máximas\n\n`;
    regimeData.forEach(record => {
      response += `• **${record.Zona}:** ${record.Altura_Maxima___Edificacao_Isolada || 'N/D'}m\n`;
    });
  } else if (queryLower.includes('coeficiente') || queryLower.includes('aproveitamento')) {
    response = `## 📐 Coeficientes de Aproveitamento\n\n`;
    regimeData.forEach(record => {
      response += `### ${record.Zona}\n`;
      response += `• **Básico:** ${record.Coeficiente_de_Aproveitamento___Basico || 'N/D'}\n`;
      response += `• **Máximo:** ${record.Coeficiente_de_Aproveitamento___Maximo || 'N/D'}\n\n`;
    });
  } else if (queryLower.includes('área') || queryLower.includes('lote')) {
    response = `## 📏 Dimensões Mínimas do Lote\n\n`;
    regimeData.forEach(record => {
      response += `• **${record.Zona}:** ${record.Área_Minima_do_Lote || 'N/D'}m² (testada: ${record.Testada_Minima_do_Lote || 'N/D'}m)\n`;
    });
  }
  
  return response;
}

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    console.log('🎯 RESPONSE-SYNTHESIZER-ENHANCED: Versão otimizada com melhor UX');
    
    const { originalQuery, agentResults } = await req.json();
    
    // 🏢 DETECTA CONSULTA SOBRE ENDEREÇOS
    const addressDetection = detectAddressQuery(originalQuery);
    if (addressDetection.needsNeighborhood) {
      const response = formatEnhancedResponse(
        null,
        'address_needs_neighborhood',
        originalQuery
      );
      
      return new Response(
        JSON.stringify({ 
          response,
          confidence: 1.0,
          metadata: {
            responseType: 'address_clarification',
            needsUserInput: true
          }
        }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }
    
    // 📊 DETECTA CONSULTA SOBRE VALORES EXTREMOS
    const maxMinDetection = detectMaxMinQuery(originalQuery);
    if (maxMinDetection.isMaxMinQuery) {
      const extremeValues = await findExtremeValues(
        maxMinDetection.field,
        maxMinDetection.queryType,
        maxMinDetection.scope
      );
      
      const response = formatEnhancedResponse(
        {
          extremeValues,
          field: maxMinDetection.field,
          type: maxMinDetection.queryType
        },
        'extreme_values',
        originalQuery
      );
      
      return new Response(
        JSON.stringify({ 
          response,
          confidence: 0.95,
          metadata: {
            responseType: 'extreme_values_analysis',
            field: maxMinDetection.field
          }
        }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }
    
    // 🌊 DETECTA CONSULTA SOBRE RISCOS
    const riskDetection = detectRiskQuery(originalQuery);
    if (riskDetection.isRiskQuery) {
      const riskData = await findRiskData(
        riskDetection.riskType,
        riskDetection.needsCount
      );
      
      const response = formatEnhancedResponse(
        {
          riskData,
          specificRisk: riskDetection.riskType[0]
        },
        'risk_analysis',
        originalQuery
      );
      
      return new Response(
        JSON.stringify({ 
          response,
          confidence: 0.9,
          metadata: {
            responseType: 'risk_analysis',
            riskTypes: riskDetection.riskType
          }
        }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }
    
    // 📊 PROCESSA DADOS DOS AGENTES
    let regimeData = [];
    if (agentResults && agentResults.length > 0) {
      for (const agent of agentResults) {
        if (agent.data?.urban_data) {
          regimeData = regimeData.concat(agent.data.urban_data);
        }
      }
    }
    
    // Se não há dados específicos, busca no banco
    if (regimeData.length === 0) {
      const queryLower = originalQuery.toLowerCase();
      
      // Extrai bairro ou zona da query
      let searchQuery = supabase
        .from('regime_urbanistico_consolidado')
        .select('*');
      
      // Busca por menções de bairros conhecidos
      const { data: bairros } = await supabase
        .from('regime_urbanistico_consolidado')
        .select('bairro')
        .limit(100);
      
      const uniqueBairros = [...new Set(bairros?.map(b => b.bairro))];
      const foundBairro = uniqueBairros.find(b => 
        queryLower.includes(b.toLowerCase())
      );
      
      if (foundBairro) {
        searchQuery = searchQuery.eq('bairro', foundBairro);
      }
      
      const { data, error } = await searchQuery.limit(10);
      if (!error && data) {
        regimeData = data;
      }
    }
    
    // FORMATA RESPOSTA FINAL
    const response = formatEnhancedResponse(
      { regimeData },
      regimeData.length > 0 ? 'regime_data' : 'no_data',
      originalQuery
    );
    
    return new Response(
      JSON.stringify({ 
        response,
        confidence: regimeData.length > 0 ? 0.9 : 0.5,
        metadata: {
          responseType: 'standard',
          dataPoints: regimeData.length
        }
      }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
    
  } catch (error) {
    console.error('❌ Error in response-synthesizer-enhanced:', error);
    
    return new Response(
      JSON.stringify({ 
        error: error.message,
        response: `Desculpe, ocorreu um erro ao processar sua solicitação. Por favor, tente novamente.${FOOTER_TEMPLATE}`
      }),
      { 
        status: 500,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
      }
    );
  }
});