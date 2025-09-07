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

// 🎯 QUERY INTENT PARSER
function parseQueryIntent(query: string): { 
  isQuestionAnswer: boolean,
  isDataQuery: boolean,
  isConceptualQuery: boolean 
} {
  const queryLower = query.toLowerCase();
  
  // Detectar perguntas específicas que esperamos encontrar na knowledgebase como Q&A
  const qaIndicators = [
    'quantas contribuições',
    'quantas audiências',
    'quando foi',
    'quem pode',
    'onde aconteceu',
    'como participar',
    'o que aconteceu',
    'qual o resultado'
  ];
  
  const isQuestionAnswer = qaIndicators.some(indicator => queryLower.includes(indicator));
  
  const isDataQuery = queryLower.includes('bairro') || 
                     queryLower.includes('zona') || 
                     queryLower.includes('zot') ||
                     queryLower.includes('altura') ||
                     queryLower.includes('coeficiente');
    
  const isConceptualQuery = queryLower.includes('o que é') || 
                           queryLower.includes('como funciona') || 
                           queryLower.includes('explicar') ||
                           queryLower.includes('conceito');
  
  return { 
    isQuestionAnswer, 
    isDataQuery, 
    isConceptualQuery 
  };
}

// 🏗️ DATA FORMATTER - Only knowledgebase data
function formatKnowledgebaseResponse(
  knowledgebaseData: any[], 
  parsedIntent: any, 
  originalQuery: string
): string {
  console.log('📚 FORMATTING KNOWLEDGEBASE RESPONSE:', {
    records: knowledgebaseData.length,
    isQuestionAnswer: parsedIntent.isQuestionAnswer,
    isDataQuery: parsedIntent.isDataQuery
  });

  if (!knowledgebaseData || knowledgebaseData.length === 0) {
    return `Não foram encontrados dados específicos para esta consulta na base de conhecimento.\n\n${FOOTER_TEMPLATE}`;
  }

  // Para perguntas específicas (Q&A), usar a resposta direta
  if (parsedIntent.isQuestionAnswer) {
    console.log('🎯 BUILDING Q&A RESPONSE');
    
    // Buscar uma resposta direta
    const directAnswer = knowledgebaseData.find(item => 
      item.resposta && item.resposta.trim().length > 10
    );
    
    if (directAnswer) {
      console.log('✅ FOUND DIRECT ANSWER:', directAnswer.resposta.substring(0, 100));
      return `${directAnswer.resposta}\n\n${FOOTER_TEMPLATE}`;
    }
    
    // Se não tem resposta direta, usar o texto mais relevante
    const bestMatch = knowledgebaseData[0];
    if (bestMatch.texto) {
      console.log('📝 USING BEST TEXT MATCH');
      return `${bestMatch.texto}\n\n${FOOTER_TEMPLATE}`;
    }
  }

  // Para consultas de dados ou conceituais, construir resposta contextual
  let response = '';
  
  // Adicionar títulos/contexto se disponível
  const uniqueTitles = [...new Set(knowledgebaseData.map(item => item.titulo).filter(Boolean))];
  if (uniqueTitles.length > 0 && uniqueTitles.length <= 3) {
    response += `**Baseado em:** ${uniqueTitles.join(', ')}\n\n`;
  }
  
  // Compilar textos mais relevantes
  const relevantTexts = knowledgebaseData
    .filter(item => item.texto && item.texto.length > 50)
    .slice(0, 3)
    .map(item => item.texto);
  
  if (relevantTexts.length > 0) {
    response += relevantTexts.join('\n\n');
  } else {
    response += 'Informação encontrada na base de conhecimento mas requer análise mais detalhada.';
  }
  
  response += `\n\n${FOOTER_TEMPLATE}`;
  return response;
}

// 🧠 SEMANTIC SYNTHESIS usando OpenAI
async function synthesizeResponse(
  knowledgebaseData: any[],
  originalQuery: string,
  confidence: number
): Promise<string> {
  console.log('🧠 SYNTHESIZING RESPONSE WITH AI');
  
  if (!openaiApiKey || !knowledgebaseData || knowledgebaseData.length === 0) {
    console.log('❌ NO AI KEY OR DATA - USING BASIC FORMATTING');
    return formatKnowledgebaseResponse(knowledgebaseData, parseQueryIntent(originalQuery), originalQuery);
  }
  
  try {
    // Preparar contexto da knowledgebase
    const contextText = knowledgebaseData
      .map(item => {
        const parts = [];
        if (item.titulo) parts.push(`TÍTULO: ${item.titulo}`);
        if (item.texto) parts.push(`TEXTO: ${item.texto}`);
        if (item.resposta) parts.push(`RESPOSTA: ${item.resposta}`);
        if (item.pergunta) parts.push(`PERGUNTA: ${item.pergunta}`);
        return parts.join('\n');
      })
      .join('\n\n---\n\n')
      .slice(0, 3000); // Limitar tamanho

    if (!contextText) {
      console.log('❌ NO CONTEXT TEXT');
      return formatKnowledgebaseResponse(knowledgebaseData, parseQueryIntent(originalQuery), originalQuery);
    }

    const prompt = `Você é um assistente especializado em legislação urbana de Porto Alegre, baseado no Plano Diretor de Urbanização e no LUOS.

CONTEXTO DA BASE DE CONHECIMENTO:
${contextText}

PERGUNTA DO USUÁRIO: ${originalQuery}

INSTRUÇÕES:
1. Use EXCLUSIVAMENTE as informações fornecidas no contexto
2. Se a pergunta for específica (ex: "Quantas contribuições..."), forneça a resposta exata
3. Para perguntas conceituais, explique baseado nos documentos
4. Seja preciso e direto
5. SEMPRE termine com os links do rodapé
6. NÃO invente informações não presentes no contexto

RODAPÉ OBRIGATÓRIO:
📍 Explore mais:
Mapa com Regras Construtivas: https://bit.ly/3ILdXRA ↗ ↗
Contribua com sugestões: https://bit.ly/4o7AWqb ↗ ↗
Participe da Audiência Pública: https://bit.ly/4oefZKm ↗ ↗
💬 Dúvidas? planodiretor@portoalegre.rs.gov.br

Forneça uma resposta clara e baseada no contexto:`;

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
        console.log('✅ AI SYNTHESIS SUCCESSFUL');
        return synthesizedResponse;
      }
    } else {
      console.error('❌ OpenAI API error:', response.status);
    }
  } catch (error) {
    console.error('❌ Synthesis error:', error);
  }
  
  console.log('🔄 FALLBACK TO BASIC FORMATTING');
  return formatKnowledgebaseResponse(knowledgebaseData, parseQueryIntent(originalQuery), originalQuery);
}

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    console.log('🎯 RESPONSE-SYNTHESIZER: KNOWLEDGEBASE ONLY');
    
    const { originalQuery, agentResults } = await req.json();
    
    console.log('🔍 Request data:', {
      query: originalQuery,
      agentCount: agentResults?.length || 0
    });
    
    // TESTE ESPECÍFICO PARA 346 CONTRIBUIÇÕES
    if (originalQuery?.toLowerCase().includes('quantas') && originalQuery?.toLowerCase().includes('contribu')) {
      console.log('🎯 DETECTADO: Pergunta sobre contribuições - verificando dados específicos');
    }

    // Parse query intent
    const parsedIntent = parseQueryIntent(originalQuery);
    console.log('🧠 Query Intent:', parsedIntent);

    // Extract knowledgebase data from agent results
    let allKnowledgebaseData = [];
    
    if (agentResults && Array.isArray(agentResults)) {
      agentResults.forEach((agent, index) => {
        console.log(`🤖 Agent ${index} - Type: ${agent.type}`, {
          hasKnowledgebaseData: !!agent.data?.knowledgebase_data,
          confidence: agent.confidence
        });
        
        // Extract knowledgebase data
        if (agent.data?.knowledgebase_data && Array.isArray(agent.data.knowledgebase_data)) {
          console.log(`📚 Found ${agent.data.knowledgebase_data.length} knowledgebase records from agent ${index}`);
          allKnowledgebaseData.push(...agent.data.knowledgebase_data);
        }
      });
    }

    console.log(`✅ EXTRACTED DATA:`, {
      knowledgebaseRecords: allKnowledgebaseData.length
    });

    // Generate response based on knowledgebase data
    let finalResponse: string;
    let confidence = 0.85;
    let sources = { 
      knowledgebase: allKnowledgebaseData.length
    };

    if (allKnowledgebaseData.length > 0) {
      // Use AI synthesis for better responses
      finalResponse = await synthesizeResponse(
        allKnowledgebaseData,
        originalQuery,
        confidence
      );
      confidence = 0.95; // High confidence when we have data
    } else {
      console.log('❌ NO KNOWLEDGEBASE DATA FOUND');
      finalResponse = `Não foram encontradas informações específicas para esta consulta na base de conhecimento.\n\n${FOOTER_TEMPLATE}`;
      confidence = 0.1;
    }

    console.log('✅ FINAL RESPONSE GENERATED');

    return new Response(JSON.stringify({
      response: finalResponse,
      confidence: confidence,
      sources: sources,
      metadata: {
        queryIntent: parsedIntent,
        dataFound: allKnowledgebaseData.length > 0,
        responseType: 'knowledgebase_synthesis'
      }
    }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });

  } catch (error) {
    console.error('🔥 Error in response-synthesizer:', error);
    return new Response(JSON.stringify({
      error: error.message,
      response: `Erro interno do sistema. Por favor, tente novamente.\n\n${FOOTER_TEMPLATE}`,
      confidence: 0.0
    }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }
});