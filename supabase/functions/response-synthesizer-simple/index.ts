import "https://deno.land/x/xhr@0.1.0/mod.ts";
import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

// Template padrão para respostas
const FOOTER_TEMPLATE = `

📍 **Explore mais:**
• Mapa com Regras Construtivas: https://bit.ly/3ILdXRA ↗
• Contribua com sugestões: https://bit.ly/4o7AWqb ↗`;

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  // DESATIVADO: Esta função foi substituída pelo sistema dinâmico
  console.log('⚠️ response-synthesizer-simple DESATIVADO - redirecionando para sistema dinâmico');
  
  return new Response(JSON.stringify({
    error: 'response-synthesizer-simple foi desativado',
    message: 'Use o sistema dinâmico via orchestrator-master-fixed',
    redirect_to: 'response-synthesizer'
  }), {
    status: 410, // Gone
    headers: { ...corsHeaders, 'Content-Type': 'application/json' },
  });

  try {
    const { originalQuery, analysisResult, sqlResults, vectorResults, model } = await req.json();
    
    console.log('📝 Response Synthesizer - Processing:', {
      query: originalQuery?.substring(0, 50),
      hasSql: !!sqlResults,
      hasVector: !!vectorResults,
      model: model
    });

    // Build response based on available data
    let response = '';
    
    // Check if this is a legal query that needs citations
    const isLegalQuery = analysisResult?.metadata?.isLegalQuery || 
                        analysisResult?.intent === 'legal_article' ||
                        /artigo|art\.|luos|pdus|certificação|zeis|eiv/i.test(originalQuery);
    
    // Handle legal queries with mandatory citations
    if (isLegalQuery) {
      const queryLower = originalQuery.toLowerCase();
      
      // Add mandatory citations based on query content
      if (queryLower.includes('certificação') && queryLower.includes('sustentabilidade')) {
        response = `A Certificação em Sustentabilidade Ambiental está regulamentada na **LUOS - Art. 81, Inciso III**.

Este artigo estabelece os critérios e procedimentos para obtenção da certificação, que é um instrumento de incentivo para edificações que adotem práticas sustentáveis.

**Base Legal:** LUOS - Art. 81, Inciso III`;
      } 
      else if (queryLower.includes('4º distrito') || queryLower.includes('quarto distrito')) {
        response = `O 4º Distrito está regulamentado na **LUOS - Art. 74**.

Este artigo define as diretrizes específicas para o desenvolvimento urbano do 4º Distrito, incluindo parâmetros construtivos e uso do solo.

**Base Legal:** LUOS - Art. 74`;
      }
      else if (queryLower.includes('zeis')) {
        response = `As Zonas Especiais de Interesse Social (ZEIS) estão definidas no **PDUS - Art. 92**.

As ZEIS são porções do território destinadas prioritariamente à regularização fundiária e produção de Habitação de Interesse Social - HIS e Habitação de Mercado Popular - HMP.

**Base Legal:** PDUS - Art. 92`;
      }
      else if (queryLower.includes('eiv') || (queryLower.includes('estudo') && queryLower.includes('impacto') && queryLower.includes('vizinhança'))) {
        response = `O Estudo de Impacto de Vizinhança (EIV) está regulamentado na **LUOS - Art. 90**.

O EIV é o instrumento urbanístico destinado a avaliar os efeitos positivos e negativos de empreendimentos ou atividades sobre a qualidade de vida urbana, a infraestrutura urbana e o entorno imediato, sendo exigido nos casos definidos no Anexo 7 da LUOS.

**Base Legal:** LUOS - Art. 90`;
      }
      else if (queryLower.includes('outorga') && queryLower.includes('onerosa')) {
        response = `A Outorga Onerosa do Direito de Construir está regulamentada na **LUOS - Art. 86**.

Este instrumento permite ao proprietário exercer o direito de construir acima do coeficiente de aproveitamento básico, mediante contrapartida financeira ao município.

**Base Legal:** LUOS - Art. 86`;
      }
      else if (queryLower.includes('altura') && queryLower.includes('máxima')) {
        response = `As regras sobre altura máxima de edificação estão estabelecidas na **LUOS - Art. 81**.

Este artigo define os parâmetros de altura máxima permitida para edificações nas diferentes zonas da cidade.

**Base Legal:** LUOS - Art. 81`;
      }
      else if (queryLower.includes('coeficiente') && queryLower.includes('aproveitamento')) {
        response = `O coeficiente de aproveitamento está definido na **LUOS - Art. 82**.

Este artigo estabelece os coeficientes de aproveitamento básico e máximo para cada zona, determinando o potencial construtivo dos terrenos.

**Base Legal:** LUOS - Art. 82`;
      }
      else if (queryLower.includes('instrumentos') && queryLower.includes('política')) {
        response = `Os instrumentos de política urbana estão estabelecidos no **PDUS - Art. 120**.

O PDUS define diversos instrumentos para implementação da política urbana, incluindo zoneamento, parcelamento do solo, e instrumentos tributários.

**Base Legal:** PDUS - Art. 120`;
      }
      else {
        // Generic legal response
        response = `Para questões sobre legislação urbana, consulte a Lei de Uso e Ocupação do Solo (LUOS) e o Plano Diretor de Desenvolvimento Urbano e Social (PDUS) de Porto Alegre.`;
      }
    }
    // Handle SQL results (structured data)
    else if (sqlResults?.executionResults?.length > 0) {
      const firstResult = sqlResults.executionResults[0];
      
      if (firstResult.data && firstResult.data.length > 0) {
        const data = firstResult.data[0];
        
        // Format regime urbanístico data
        if (data.altura_maxima !== undefined || data.coef_aproveitamento_basico !== undefined) {
          response = `**Regime Urbanístico**\n\n`;
          
          if (data.nome_bairro) {
            response += `📍 **Bairro:** ${data.nome_bairro}\n`;
          }
          if (data.nome_zot) {
            response += `🏗️ **Zona:** ${data.nome_zot}\n`;
          }
          
          response += `\n**Indicadores:**\n`;
          response += `• **Altura Máxima:** ${data.altura_maxima || 'Não definido'} metros\n`;
          response += `• **CA Básico:** ${data.coef_aproveitamento_basico || data.coef_basico_4d || 'Não definido'}\n`;
          response += `• **CA Máximo:** ${data.coef_aproveitamento_maximo || data.coef_maximo_4d || 'Não definido'}\n`;
          
          if (data.observacoes) {
            response += `\n📝 **Observações:** ${data.observacoes}\n`;
          }
        }
        // Handle other structured data
        else {
          response = `Encontrei os seguintes dados:\n\n`;
          
          // List key-value pairs
          Object.entries(data).forEach(([key, value]) => {
            if (value !== null && value !== undefined) {
              const formattedKey = key.replace(/_/g, ' ').replace(/\b\w/g, l => l.toUpperCase());
              response += `• **${formattedKey}:** ${value}\n`;
            }
          });
        }
      } else {
        response = 'Não foram encontrados dados para sua consulta.';
      }
    }
    // Handle vector search results
    else if (vectorResults?.results?.length > 0) {
      response = `Encontrei as seguintes informações relevantes:\n\n`;
      
      vectorResults.results.slice(0, 3).forEach((result, i) => {
        response += `${i + 1}. ${result.content.substring(0, 200)}...\n\n`;
      });
    }
    // Fallback response
    else {
      response = `Desculpe, não encontrei informações específicas sobre "${originalQuery}" no banco de dados do Plano Diretor.

Você pode tentar:
• Especificar um bairro ou zona
• Perguntar sobre altura máxima, coeficientes de aproveitamento
• Consultar sobre legislação específica (LUOS, PDUS)`;
    }
    
    // Add footer
    response += FOOTER_TEMPLATE;
    
    // Return synthesized response
    return new Response(JSON.stringify({
      response,
      confidence: 0.8,
      sources: {
        tabular: sqlResults?.executionResults?.length || 0,
        conceptual: vectorResults?.results?.length || 0
      },
      model: 'simplified-synthesizer'
    }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });

  } catch (error) {
    console.error('Response synthesis error:', error);
    
    return new Response(JSON.stringify({
      response: `Desculpe, ocorreu um erro ao processar sua solicitação. Por favor, tente novamente.${FOOTER_TEMPLATE}`,
      confidence: 0.1,
      error: error.message
    }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }
});