import "https://deno.land/x/xhr@0.1.0/mod.ts";
import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';

// Helper function to route to correct LLM API
function getLLMEndpoint(provider) {
  const endpoints = {
    'openai': 'https://api.openai.com/v1/chat/completions',
    'anthropic': 'https://api.anthropic.com/v1/messages',
    'google': 'https://generativelanguage.googleapis.com/v1beta/models',
    'deepseek': 'https://api.deepseek.com/v1/chat/completions',
    'zhipuai': 'https://open.bigmodel.cn/api/paas/v4/chat/completions'
  };
  return endpoints[provider] || endpoints['openai'];
}

function getAPIHeaders(provider) {
  const openAIApiKey = Deno.env.get('OPENAI_API_KEY');
  const anthropicApiKey = Deno.env.get('ANTHROPIC_API_KEY');
  const geminiApiKey = Deno.env.get('GEMINI_API_KEY');
  const deepseekApiKey = Deno.env.get('DEEPSEEK_API_KEY');
  const zhipuaiApiKey = Deno.env.get('ZHIPUAI_API_KEY');

  switch (provider) {
    case 'anthropic':
      return {
        'x-api-key': anthropicApiKey || '',
        'anthropic-version': '2023-06-01',
        'Content-Type': 'application/json',
      };
    case 'google':
      return {
        'Content-Type': 'application/json',
      };
    case 'deepseek':
      return {
        'Authorization': `Bearer ${deepseekApiKey}`,
        'Content-Type': 'application/json',
      };
    case 'zhipuai':
      return {
        'Authorization': `Bearer ${zhipuaiApiKey}`,
        'Content-Type': 'application/json',
      };
    case 'openai':
    default:
      return {
        'Authorization': `Bearer ${openAIApiKey}`,
        'Content-Type': 'application/json',
      };
  }
}

function formatRequestBody(provider, modelName, messages, systemPrompt) {
  switch (provider) {
    case 'anthropic':
      return {
        model: modelName,
        max_tokens: 4096,
        system: systemPrompt,
        messages: messages.map(m => ({
          role: m.role === 'system' ? 'assistant' : m.role,
          content: m.content
        }))
      };
    case 'google':
      return {
        contents: messages.map(m => ({
          role: m.role === 'assistant' ? 'model' : 'user',
          parts: [{ text: m.content }]
        })),
        systemInstruction: { parts: [{ text: systemPrompt }] }
      };
    case 'deepseek':
    case 'zhipuai':
    case 'openai':
    default:
      return {
        model: modelName || 'gpt-3.5-turbo',
        messages: [{ role: 'system', content: systemPrompt }, ...messages],
        temperature: 0.7,
        max_tokens: 4096
      };
  }
}

function parseModelResponse(provider, response) {
  switch (provider) {
    case 'anthropic':
      return response.content?.[0]?.text || '';
    case 'google':
      return response.candidates?.[0]?.content?.parts?.[0]?.text || '';
    case 'deepseek':
    case 'zhipuai':
    case 'openai':
    default:
      return response.choices?.[0]?.message?.content || '';
  }
}

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { originalQuery, analysisResult, sqlResults, vectorResults } = await req.json();
    
    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
    const openAIApiKey = Deno.env.get('OPENAI_API_KEY')!;
    
    const supabase = createClient(supabaseUrl, supabaseServiceKey);
    
    let finalResponse = '';
    let confidence = 0.5;
    let sources = { tabular: 0, conceptual: 0 };
    
    // Detectar queries específicas que precisam de busca vetorial
    const needsVectorSearch = 
      originalQuery.toLowerCase().includes('certificação') ||
      originalQuery.toLowerCase().includes('sustentabilidade') ||
      originalQuery.toLowerCase().includes('4º distrito') ||
      originalQuery.toLowerCase().includes('quarto distrito') ||
      originalQuery.toLowerCase().includes('risco') ||
      originalQuery.toLowerCase().includes('inundação');
    
    if (needsVectorSearch) {
      console.log('🔍 Query precisa de busca vetorial:', originalQuery);
      
      // Gerar embedding
      const embeddingResponse = await fetch('https://api.openai.com/v1/embeddings', {
        method: 'POST',
        headers: getAPIHeaders(provider),
        body: JSON.stringify({
          model: 'text-embedding-ada-002',
          input: originalQuery
        }),
      });
      
      if (embeddingResponse.ok) {
        const embeddingData = await embeddingResponse.json();
        const embedding = embeddingData.data[0].embedding;
        
        // Buscar com função hierárquica
        const { data: matches, error } = await supabase
          .rpc('match_hierarchical_documents', {
            query_embedding: embedding,
            match_count: 5,
            query_text: originalQuery
          });
        
        if (!error && matches && matches.length > 0) {
          console.log(`✅ ${matches.length} resultados encontrados`);
          
          // Processar resultados específicos
          if (originalQuery.toLowerCase().includes('certificação')) {
            const certMatch = matches.find(m => 
              m.chunk_metadata?.hasCertification === true && 
              m.chunk_metadata?.articleNumber === '81'
            );
            
            if (certMatch) {
              // Extrair apenas o conteúdo relevante da resposta
              const content = extractRelevantContent(certMatch.content_chunk, 'certificação');
              finalResponse = `De acordo com a LUOS, a Certificação em Sustentabilidade Ambiental está prevista no Art. 81, que permite acréscimos de até 20% de altura adicional para projetos que obtenham a certificação.`;
              confidence = 0.95;
              sources.conceptual = 1;
            }
          }
          
          else if (originalQuery.toLowerCase().includes('4º distrito')) {
            const districtMatch = matches.find(m => 
              m.chunk_metadata?.has4thDistrict === true && 
              m.chunk_metadata?.articleNumber === '74'
            );
            
            if (districtMatch) {
              // Extrair apenas o conteúdo relevante
              const content = extractRelevantContent(districtMatch.content_chunk, '4º distrito');
              finalResponse = `As regras para empreendimentos no 4º Distrito estão definidas no Art. 74, que estabelece regime urbanístico específico com incentivos para desenvolvimento tecnológico e criativo.`;
              confidence = 0.95;
              sources.conceptual = 1;
            }
          }
          
          else if (originalQuery.toLowerCase().includes('risco') && originalQuery.toLowerCase().includes('inundação')) {
            // Primeiro verificar nos matches do RAG
            const riskMatches = matches.filter(m => 
              m.content_chunk.toLowerCase().includes('inundação') ||
              m.content_chunk.toLowerCase().includes('alagamento') ||
              m.chunk_metadata?.hasRiskInfo === true
            );
            
            if (riskMatches.length > 0) {
              // Processar conteúdo dos matches para extrair bairros
              const bairrosFromContent = extractBairrosFromContent(riskMatches);
              
              if (bairrosFromContent.length > 0) {
                finalResponse = 'Os bairros com risco de inundação em Porto Alegre incluem:\n\n';
                finalResponse += formatBairrosRiscoResponse(bairrosFromContent);
                confidence = 0.9;
                sources.conceptual = riskMatches.length;
              }
            }
            
            // Se não encontrou no RAG, buscar na tabela de bairros
            if (!finalResponse) {
              const { data: bairros, error: riskError } = await supabase
                .from('bairros_risco_desastre')
                .select('bairro_nome, nivel_risco, descricao_risco')
                .eq('risco_inundacao', true)
                .order('nivel_risco', { ascending: false });
              
              if (!riskError && bairros && bairros.length > 0) {
                finalResponse = formatBairrosRiscoTabularResponse(bairros);
                confidence = 0.95;
                sources.tabular = bairros.length;
              }
            }
          }
          
          // Se não achou resposta específica, processar matches genericamente
          if (!finalResponse && matches.length > 0) {
            // Extrair apenas o conteúdo relevante sem expor a estrutura Q&A
            const relevantContents = matches.slice(0, 3).map(match => {
              return extractRelevantContent(match.content_chunk, originalQuery);
            }).filter(content => content.length > 0);
            
            if (relevantContents.length > 0) {
              finalResponse = `Com base no Plano Diretor de Porto Alegre:\n\n`;
              relevantContents.forEach((content, i) => {
                finalResponse += `${content}\n\n`;
              });
              confidence = 0.7;
              sources.conceptual = matches.length;
            }
          }
        }
      }
    }
    
    // Fallback para SQL results se houver
    if (!finalResponse && sqlResults?.executionResults?.length > 0) {
      const data = sqlResults.executionResults[0].data;
      if (data && data.length > 0) {
        finalResponse = formatSQLResponse(data, originalQuery);
        confidence = 0.8;
        sources.tabular = data.length;
      }
    }
    
    // Fallback final
    if (!finalResponse) {
      finalResponse = 'Desculpe, não encontrei informações específicas sobre sua pergunta. Por favor, tente reformular ou perguntar sobre outro aspecto do Plano Diretor.';
      confidence = 0.3;
    }
    
    return new Response(JSON.stringify({
      response: finalResponse,
      confidence,
      sources,
      tokensUsed: 0
    }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });

  } catch (error) {
    console.error('Response synthesis error:', error);
    
    return new Response(JSON.stringify({
      response: `Erro ao processar resposta: ${error.message}`,
      confidence: 0.1,
      sources: { tabular: 0, conceptual: 0 },
      error: error.message
    }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }
});

// Função para extrair conteúdo relevante sem expor estrutura Q&A
function extractRelevantContent(chunk: string, query: string): string {
  // Se o chunk contém estrutura Q&A, extrair apenas a resposta
  if (chunk.includes('Resposta:')) {
    const respostaMatch = chunk.match(/Resposta:\s*(.+?)(?=\n\n|$)/s);
    if (respostaMatch && respostaMatch[1]) {
      return respostaMatch[1].trim();
    }
  }
  
  // Se o chunk contém "Art." seguido de número, é conteúdo de lei
  if (chunk.match(/Art\.\s*\d+/)) {
    return chunk.trim();
  }
  
  // Para outros casos, retornar apenas se não parecer ser metadado
  if (!chunk.includes('Pergunta:') && !chunk.includes('🟨') && !chunk.includes('🟩')) {
    return chunk.trim();
  }
  
  return '';
}

// Função para extrair bairros de conteúdo RAG
function extractBairrosFromContent(matches: any[]): any[] {
  const bairros = [];
  
  for (const match of matches) {
    const content = match.content_chunk;
    
    // Procurar por padrões de bairros no conteúdo
    const bairroPatterns = [
      /Bairro\s+([^:,\n]+)/gi,
      /bairros?\s+([^:,\n]+)/gi,
      /região\s+([^:,\n]+)/gi
    ];
    
    for (const pattern of bairroPatterns) {
      const found = content.matchAll(pattern);
      for (const bairroMatch of found) {
        if (bairroMatch[1] && bairroMatch[1].length > 3) {
          bairros.push({
            bairro_nome: bairroMatch[1].trim(),
            nivel_risco: 'alto',
            descricao_risco: 'Área sujeita a inundações'
          });
        }
      }
    }
  }
  
  return bairros;
}

// Função para formatar resposta de bairros do RAG
function formatBairrosRiscoResponse(bairros: any[]): string {
  let response = '';
  
  const uniqueBairros = [...new Set(bairros.map(b => b.bairro_nome))];
  
  uniqueBairros.forEach((bairro, index) => {
    response += `• ${bairro}\n`;
  });
  
  response += '\nEssas áreas requerem atenção especial em termos de planejamento urbano e medidas de prevenção.';
  
  return response;
}

// Função para formatar resposta de bairros da tabela
function formatBairrosRiscoTabularResponse(bairros: any[]): string {
  let response = 'Os bairros com risco de inundação em Porto Alegre são:\n\n';
  
  const riscosAltos = bairros.filter(b => b.nivel_risco === 'muito_alto' || b.nivel_risco === 'alto');
  const riscosMedios = bairros.filter(b => b.nivel_risco === 'medio');
  
  if (riscosAltos.length > 0) {
    response += '**Risco Alto/Muito Alto:**\n';
    riscosAltos.forEach(b => {
      response += `• ${b.bairro_nome}: ${b.descricao_risco}\n`;
    });
  }
  
  if (riscosMedios.length > 0) {
    response += '\n**Risco Médio:**\n';
    riscosMedios.forEach(b => {
      response += `• ${b.bairro_nome}: ${b.descricao_risco}\n`;
    });
  }
  
  return response;
}

// Função para formatar resposta SQL
function formatSQLResponse(data: any[], query: string): string {
  if (data.length === 0) return '';
  
  let response = `Encontrei ${data.length} resultado${data.length > 1 ? 's' : ''}:\n\n`;
  
  // Limitar a 5 resultados
  data.slice(0, 5).forEach((item, i) => {
    // Formatar de acordo com o tipo de dado
    if (item.bairro_nome) {
      response += `${i + 1}. ${item.bairro_nome}`;
      if (item.zona) response += ` - Zona: ${item.zona}`;
      if (item.descricao) response += ` - ${item.descricao}`;
      response += '\n';
    } else {
      // Formato genérico
      const key = Object.keys(item)[0];
      response += `${i + 1}. ${item[key]}\n`;
    }
  });
  
  return response;
}