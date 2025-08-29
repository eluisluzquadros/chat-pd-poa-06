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
    const { originalQuery, analysisResult, sqlResults, vectorResults, model } = await req.json();
    
    console.log('🔥 Response Synthesizer V2 OTIMIZADO:', {
      query: originalQuery,
      hasSql: !!sqlResults?.executionResults?.length,
      hasVector: !!vectorResults?.results?.length,
      model: model
    });
    
    const openAIApiKey = Deno.env.get('OPENAI_API_KEY');
    if (!openAIApiKey) {
      throw new Error('OpenAI API key not configured');
    }
    
    // PREPARAR CONTEXTO DIRETO E ESPECÍFICO
    let context = '';
    let hasData = false;
    let responseType = 'general';
    
    // 1. PROCESSAR RESULTADOS SQL (PRIORIDADE)
    if (sqlResults?.executionResults?.length > 0) {
      for (const result of sqlResults.executionResults) {
        if (result.data && result.data.length > 0) {
          hasData = true;
          const firstRow = result.data[0];
          
          // CONTAGEM/ESTATÍSTICAS
          if (firstRow.total_bairros !== undefined || firstRow.count !== undefined) {
            const count = firstRow.total_bairros || firstRow.count || Object.values(firstRow)[0];
            context += `\n**RESULTADO:** ${count} bairros encontrados.\n`;
            responseType = 'count';
          }
          
          // DADOS DE RISCO
          else if (firstRow.bairro_nome !== undefined && 
                   (firstRow.risco_inundacao !== undefined || firstRow.observacoes !== undefined)) {
            context += '\n**DADOS DE RISCO POR BAIRRO:**\n';
            
            // Verificar se é busca por "área de estudo"
            if (originalQuery.toLowerCase().includes('área de estudo')) {
              const estudoBairros = result.data.filter(r => 
                r.observacoes && r.observacoes.includes('Em área de estudo'));
              context += `**${estudoBairros.length} bairros estão "Em área de estudo para proteção contra inundações":**\n\n`;
              estudoBairros.forEach(b => {
                context += `• **${b.bairro_nome}**\n`;
              });
            } else {
              context += formatAsTable(result.data.slice(0, 10));
            }
            responseType = 'risk_data';
          }
          
          // DADOS DE REGIME URBANÍSTICO
          else if (firstRow.bairro !== undefined && firstRow.zona !== undefined) {
            context += '\n**REGIME URBANÍSTICO:**\n';
            context += formatAsTable(result.data.slice(0, 10));
            responseType = 'urban_regime';
          }
          
          // DOCUMENTOS COM ARTIGOS
          else if (firstRow.content_chunk !== undefined) {
            context += '\n**INFORMAÇÕES ENCONTRADAS:**\n';
            
            // Buscar referências a artigos específicos
            for (const doc of result.data.slice(0, 3)) {
              if (doc.content_chunk.includes('Art.') || doc.content_chunk.includes('Artigo')) {
                context += `\n${doc.content_chunk.substring(0, 500)}...\n`;
                
                // Extrair número do artigo se disponível
                const articleMatch = doc.content_chunk.match(/Art\.?\s*(\d+)/i) || 
                                   doc.chunk_metadata?.articleNumber;
                if (articleMatch) {
                  const artNum = typeof articleMatch === 'string' ? articleMatch : articleMatch[1];
                  context += `\n**Referência: Art. ${artNum}**\n`;
                }
              }
            }
            responseType = 'document_content';
          }
        }
      }
    }
    
    // 2. PROCESSAR VECTOR SEARCH (SE NECESSÁRIO)
    if (!hasData && vectorResults?.results?.length > 0) {
      context += '\n**DOCUMENTOS RELEVANTES:**\n';
      vectorResults.results.slice(0, 3).forEach((result, idx) => {
        hasData = true;
        context += `\n${idx + 1}. ${result.content.substring(0, 400)}...\n`;
      });
      responseType = 'vector_search';
    }
    
    // 3. DETERMINAR RESPOSTA BASEADA NO TIPO
    let systemPrompt = '';
    let userPrompt = '';
    
    if (responseType === 'count') {
      systemPrompt = `Você é o assistente do Plano Diretor de Porto Alegre. 
      Responda de forma DIRETA com o número exato fornecido no contexto.`;
      
      userPrompt = `Contexto: ${context}
      Pergunta: ${originalQuery}
      
      Responda de forma direta com o número encontrado.`;
    }
    
    else if (responseType === 'risk_data') {
      systemPrompt = `Você é o assistente do Plano Diretor de Porto Alegre.
      REGRA CRÍTICA: Use APENAS os dados fornecidos no contexto. NUNCA invente números ou informações.`;
      
      userPrompt = `Contexto com dados oficiais: ${context}
      Pergunta: ${originalQuery}
      
      Apresente os dados de forma clara, mantendo a formatação da tabela se fornecida.`;
    }
    
    else if (responseType === 'document_content') {
      systemPrompt = `Você é o assistista do Plano Diretor de Porto Alegre.
      
      MAPEAMENTO CRÍTICO DE ARTIGOS:
      - Certificação em Sustentabilidade Ambiental: LUOS - Art. 81, Inciso III
      - EIV (Estudo de Impacto de Vizinhança): LUOS - Art. 89
      - 4º Distrito: LUOS - Art. 74
      - Outorga Onerosa: LUOS - Art. 86
      
      Use APENAS as informações do contexto fornecido.`;
      
      userPrompt = `Contexto: ${context}
      Pergunta: ${originalQuery}
      
      Responda citando especificamente o artigo encontrado no contexto.`;
    }
    
    else {
      // Resposta genérica
      systemPrompt = `Você é o assistente do Plano Diretor de Porto Alegre. 
      Use apenas as informações fornecidas no contexto. Se não houver dados suficientes, 
      informe que a informação não foi encontrada.`;
      
      userPrompt = `Contexto: ${context || 'Nenhuma informação específica encontrada.'}
      Pergunta: ${originalQuery}
      
      Responda com base no contexto disponível.`;
    }
    
    // CHAMAR OPENAI
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
        temperature: 0.1,
        max_tokens: 1500
      }),
    });
    
    if (!response.ok) {
      const error = await response.text();
      console.error('OpenAI API error:', error);
      throw new Error(`OpenAI API error: ${response.status}`);
    }
    
    const data = await response.json();
    const synthesizedResponse = data.choices?.[0]?.message?.content || 'Desculpe, não consegui processar sua pergunta.';
    
    // GARANTIR FOOTER
    let finalResponse = synthesizedResponse;
    if (!finalResponse.includes('planodiretor@portoalegre.rs.gov.br')) {
      finalResponse += FOOTER_TEMPLATE;
    }
    
    console.log('✅ Response synthesized:', {
      responseType: responseType,
      hasData: hasData,
      confidence: hasData ? 0.9 : 0.3
    });
    
    return new Response(JSON.stringify({
      response: finalResponse,
      confidence: hasData ? 0.9 : 0.3,
      sources: {
        tabular: sqlResults?.executionResults?.length || 0,
        conceptual: vectorResults?.results?.length || 0
      },
      metadata: {
        responseType: responseType,
        hasData: hasData
      }
    }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });

  } catch (error) {
    console.error('❌ Response Synthesizer V2 error:', error);
    
    return new Response(JSON.stringify({
      response: `Desculpe, ocorreu um erro ao processar sua solicitação. Por favor, tente novamente.${FOOTER_TEMPLATE}`,
      confidence: 0.1,
      error: error.message,
      sources: { tabular: 0, conceptual: 0 }
    }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }
});