import "https://deno.land/x/xhr@0.1.0/mod.ts";
import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

const FOOTER_TEMPLATE = `

📍 **Explore mais:**
• Mapa com Regras Construtivas: https://bit.ly/3ILdXRA ↗
• Contribua com sugestões: https://bit.ly/4o7AWqb ↗
• Participe da Audiência Pública: https://bit.ly/4oefZKm ↗

💬 **Dúvidas?** planodiretor@portoalegre.rs.gov.br`;

// Função para formatar dados em tabela
function formatAsTable(data: any[]): string {
  if (!data || data.length === 0) return '';
  
  const columns = Object.keys(data[0]);
  let table = '| ' + columns.join(' | ') + ' |\n';
  table += '|' + columns.map(() => '---').join('|') + '|\n';
  
  data.forEach(row => {
    table += '| ' + columns.map(col => String(row[col] || '-')).join(' | ') + ' |\n';
  });
  
  return table;
}

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { originalQuery, analysisResult, sqlResults, vectorResults, model, conversationHistory } = await req.json();
    
    console.log('🔥 Response Synthesizer V2 - Input:', {
      query: originalQuery,
      hasSql: !!sqlResults,
      hasVector: !!vectorResults,
      model: model
    });
    
    const openAIApiKey = Deno.env.get('OPENAI_API_KEY');
    if (!openAIApiKey) {
      throw new Error('OpenAI API key not configured');
    }
    
    // Preparar contexto
    let context = '';
    let hasData = false;
    
    // 1. Adicionar resultados SQL se disponíveis
    if (sqlResults?.executionResults?.length > 0) {
      context += '\n**Dados estruturados encontrados:**\n';
      sqlResults.executionResults.forEach((result: any) => {
        if (result.data && result.data.length > 0) {
          hasData = true;
          
          // Detectar tipo de dados baseado nas colunas
          const firstRow = result.data[0];
          
          // Dados de contagem/estatísticas
          if (firstRow.total_bairros_acima_cota !== undefined || 
              firstRow.total_zonas !== undefined ||
              firstRow.contagem !== undefined ||
              firstRow.count !== undefined ||
              (result.data.length === 1 && Object.keys(firstRow).some(key => 
                key.toLowerCase().includes('total') || 
                key.toLowerCase().includes('count') || 
                key.toLowerCase().includes('contagem')))) {
            context += '\n**Resultado da consulta:**\n';
            const value = firstRow.total_bairros_acima_cota || 
                         firstRow.total_zonas || 
                         firstRow.contagem || 
                         firstRow.count ||
                         Object.values(firstRow).find(v => typeof v === 'number' && v > 0);
            
            if (originalQuery.toLowerCase().includes('quantos')) {
              if (originalQuery.toLowerCase().includes('bairros')) {
                context += `**${value} bairros** estão classificados como solicitado.\n`;
              } else {
                context += `**Total: ${value}** registros encontrados.\n`;
              }
            } else {
              context += `${value} ${originalQuery.includes('bairros') ? 'bairros' : 'registros'} encontrados.\n`;
            }
          }
          // Dados de risco de desastre
          else if (firstRow.bairro_nome !== undefined && firstRow.nivel_risco_inundacao !== undefined) {
            context += '\n**Dados de Risco por Bairro:**\n';
            context += formatAsTable(result.data.slice(0, 10));
          }
          // Dados de ZOTs por bairro
          else if (firstRow.zona !== undefined && firstRow.total_zonas_no_bairro !== undefined) {
            context += '\n**Zonas por Bairro:**\n';
            context += formatAsTable(result.data.slice(0, 10));
          }
          // Dados de regime urbanístico
          else if (firstRow.altura_maxima !== undefined || 
              firstRow.coef_aproveitamento_basico !== undefined) {
            context += '\n**Regime Urbanístico:**\n';
            context += formatAsTable(result.data.slice(0, 10));
          } else {
            // Dados genéricos
            context += '\n**Dados encontrados:**\n';
            context += formatAsTable(result.data.slice(0, 5));
          }
        }
      });
    }
    
    // 2. Adicionar resultados de vector search se disponíveis
    if (vectorResults?.results?.length > 0) {
      context += '\n**Documentos relevantes encontrados:**\n';
      vectorResults.results.slice(0, 3).forEach((result: any, idx: number) => {
        hasData = true;
        context += `\n${idx + 1}. (Similaridade: ${result.similarity?.toFixed(3) || 'N/A'})\n`;
        context += `${result.content.substring(0, 300)}...\n`;
      });
    }
    
    // 3. Se não há dados, usar conhecimento geral
    if (!hasData) {
      context = '\nNenhum dado específico foi encontrado. Use o conhecimento geral sobre o Plano Diretor.';
    }
    
    // Preparar prompt com contexto específico
    const systemPrompt = `Você é o assistente oficial do Plano Diretor de Porto Alegre.

🔴 REGRA FUNDAMENTAL: Use APENAS as informações fornecidas no contexto. NUNCA invente dados.

MAPEAMENTO CRÍTICO DE ARTIGOS (USE EXATAMENTE ASSIM):
- EIV (Estudo de Impacto de Vizinhança): LUOS - Art. 89
- ZEIS (Zonas Especiais de Interesse Social): PDUS - Art. 92
- Certificação em Sustentabilidade: LUOS - Art. 81, Inciso III
- Outorga Onerosa: LUOS - Art. 86
- Coeficiente de Aproveitamento: LUOS - Art. 82
- Recuos Obrigatórios: LUOS - Art. 83
- Taxa de Permeabilidade: LUOS - Art. 84
- 4º Distrito: LUOS - Art. 74
- Áreas de Preservação Permanente: PDUS - Art. 95
- Habitação de Interesse Social: PDUS - Art. 101
- CMDUA: PDUS - Art. 104

REGRAS OBRIGATÓRIAS:

1. **SE o contexto mencionar um artigo específico, USE-O**
2. **SE não houver informação no contexto, diga "Informação não encontrada nos documentos disponíveis"**
3. **Para bairros**, SEMPRE forneça os dados tabulares se disponíveis
4. **NUNCA** misture Boa Vista com Boa Vista do Sul
5. **SEMPRE** cite a lei (LUOS ou PDUS) antes do número do artigo

Responda de forma DIRETA e ESPECÍFICA usando APENAS o contexto fornecido.`;

    const userPrompt = `Contexto disponível:
${context}

Pergunta do usuário: ${originalQuery}

Responda de forma clara e direta, usando os dados fornecidos. Se os dados incluem uma tabela, apresente-a formatada.

IMPORTANTE: Termine sua resposta com:
${FOOTER_TEMPLATE}`;

    // Chamar OpenAI
    const response = await fetch('https://api.openai.com/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${openAIApiKey}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        model: 'gpt-3.5-turbo',
        messages: [
          { role: 'system', content: systemPrompt },
          { role: 'user', content: userPrompt }
        ],
        temperature: 0.7,
        max_tokens: 2000
      }),
    });
    
    if (!response.ok) {
      const error = await response.text();
      console.error('OpenAI API error:', error);
      throw new Error(`OpenAI API error: ${response.status}`);
    }
    
    const data = await response.json();
    const synthesizedResponse = data.choices?.[0]?.message?.content || 'Desculpe, não consegui processar sua pergunta.';
    
    // Garantir que o footer está presente
    let finalResponse = synthesizedResponse;
    if (!finalResponse.includes('planodiretor@portoalegre.rs.gov.br')) {
      finalResponse += FOOTER_TEMPLATE;
    }
    
    console.log('✅ Response synthesized successfully');
    
    return new Response(JSON.stringify({
      response: finalResponse,
      confidence: hasData ? 0.85 : 0.5,
      sources: {
        tabular: sqlResults?.executionResults?.length || 0,
        conceptual: vectorResults?.results?.length || 0
      }
    }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });

  } catch (error) {
    console.error('Response Synthesizer V2 error:', error);
    
    return new Response(JSON.stringify({
      response: `Desculpe, ocorreu um erro ao processar sua solicitação. Por favor, tente novamente.${FOOTER_TEMPLATE}`,
      confidence: 0.1,
      error: error.message
    }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }
});