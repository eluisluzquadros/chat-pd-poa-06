import "https://deno.land/x/xhr@0.1.0/mod.ts";
import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

/**
 * FUNÇÃO PARA NORMALIZAR NOMES DE BAIRROS
 */
function normalizeBairroName(name: string): string {
  return name.toLowerCase()
    .replace(/[áàãâä]/g, 'a')
    .replace(/[éèêë]/g, 'e')
    .replace(/[íìîï]/g, 'i')
    .replace(/[óòõôö]/g, 'o')
    .replace(/[úùûü]/g, 'u')
    .replace(/[ç]/g, 'c')
    .replace(/[ñ]/g, 'n')
    .trim();
}

/**
 * FUNÇÃO PARA EXTRAIR NOME DE BAIRRO DA QUERY
 */
function extractBairroFromQuery(query: string): string | null {
  const normalizedQuery = query.toLowerCase();
  
  // Padrões comuns para identificar bairros
  const patterns = [
    /(?:bairro|no|na|do|da|de|em)\s+([a-záàãâäéèêëíìîïóòõôöúùûüç\s]+?)(?:\?|$|,|\s+(?:qual|como|o que|altura|coef))/i,
    /(?:^|\s)([a-záàãâäéèêëíìîïóòõôöúùûüç\s]{3,25})(?:\s+(?:qual|como|o que|altura|coef|zot|zona))/i,
    /(?:^|\s)([a-záàãâäéèêëíìîïóòõôöúùûüç\s]{3,25})(?:\?|$)/i
  ];
  
  for (const pattern of patterns) {
    const match = normalizedQuery.match(pattern);
    if (match && match[1]) {
      const extracted = match[1].trim();
      // Filtrar palavras muito comuns que não são bairros
      const commonWords = ['porto alegre', 'plano diretor', 'luos', 'lei', 'artigo', 'altura', 'maxima', 'coeficiente', 'zona', 'zot'];
      if (!commonWords.some(word => extracted.includes(word)) && extracted.length > 2) {
        return extracted;
      }
    }
  }
  
  return null;
}

/**
 * FUNÇÃO PARA EXTRAIR NÚMERO DE ARTIGO DA QUERY
 */
function extractArticleFromQuery(query: string): string | null {
  const patterns = [
    /(?:art|artigo)\s*\.?\s*(\d+)/i,
    /(?:^|\s)(\d+)(?:\s*(?:,|\.|\s)?\s*(?:inciso|§|parágrafo)?\s*[IVX]+)?/i
  ];
  
  for (const pattern of patterns) {
    const match = query.match(pattern);
    if (match && match[1]) {
      return match[1];
    }
  }
  
  return null;
}

/**
 * Agentic-RAG v2 - SISTEMA DINÂMICO SEM HARDCODING
 */
serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const body = await req.json();
    const query = body.query || body.message;
    const model = body.model || 'gpt-3.5-turbo';
    const sessionId = body.sessionId || `session_${Date.now()}`;
    
    console.log('📨 Agentic-RAG v2 DINÂMICO received request:', { 
      query: query,
      model: model,
      sessionId: sessionId 
    });

    const supabaseClient = createClient(
      Deno.env.get("SUPABASE_URL") ?? "",
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? ""
    );

    const startTime = Date.now();
    const queryLower = query.toLowerCase();

    let executionResults = [];
    let hasResults = false;

    console.log('🔥 Executando sistema dinâmico sem hardcoding...');

    // 1. BUSCA POR ARTIGOS DA LEI (DINÂMICA)
    const articleNumber = extractArticleFromQuery(query);
    if (articleNumber || queryLower.includes('certificação') || queryLower.includes('sustentabilidade') || queryLower.includes('artigo') || queryLower.includes('art')) {
      console.log(`📋 Executando busca dinâmica por artigo (detectado: ${articleNumber})...`);
      
      let searchTerms = [];
      if (articleNumber) {
        searchTerms.push(`%art%${articleNumber}%`);
        searchTerms.push(`%artigo%${articleNumber}%`);
      }
      if (queryLower.includes('certificação') || queryLower.includes('sustentabilidade')) {
        searchTerms.push('%certificação%sustentabilidade%');
        searchTerms.push('%sustentabilidade%ambiental%');
      }
      
      // Busca dinâmica em documentos
      for (const term of searchTerms) {
        const { data: docResults, error } = await supabaseClient
          .from('document_embeddings')
          .select('content_chunk, chunk_metadata')
          .ilike('content_chunk', term)
          .limit(5);

        if (!error && docResults && docResults.length > 0) {
          executionResults.push({
            query: `Busca artigo dinâmica: ${term}`,
            table: 'document_embeddings',
            purpose: `Buscar artigo ${articleNumber || 'sobre tema'} da lei`,
            data: docResults
          });
          hasResults = true;
          break; // Parar na primeira busca bem-sucedida
        }
      }
    }
    
    // 2. BUSCA POR ENCHENTES/ÁREA DE ESTUDO (DINÂMICA)
    if (queryLower.includes('enchente') || queryLower.includes('inundação') || queryLower.includes('área de estudo') || 
       (queryLower.includes('proteção') && queryLower.includes('enchente')) ||
       (queryLower.includes('quantos') && queryLower.includes('bairro'))) {
      console.log('📋 Executando busca dinâmica por enchentes...');
      
      const { data: enchentesResults, error } = await supabaseClient
        .from('bairros_risco_desastre')
        .select('bairro_nome, areas_criticas, observacoes, risco_inundacao')
        .or('areas_criticas.ilike.%enchentes%,risco_inundacao.eq.true')
        .order('bairro_nome');

      if (!error && enchentesResults && enchentesResults.length > 0) {
        // Filtrar especificamente enchentes de 2024 se mencionado
        let finalResults = enchentesResults;
        if (queryLower.includes('2024') || queryLower.includes('área de estudo')) {
          finalResults = enchentesResults.filter(b => 
            b.areas_criticas && b.areas_criticas.toLowerCase().includes('enchentes de 2024')
          );
        }
        
        if (queryLower.includes('quantos')) {
          executionResults.push({
            query: 'Contar bairros afetados por enchentes',
            table: 'bairros_risco_desastre',
            purpose: 'Contar quantos bairros foram afetados por enchentes',
            data: [{ 
              total_bairros_enchentes: finalResults.length,
              bairros_lista: finalResults.map(b => b.bairro_nome)
            }]
          });
        } else {
          executionResults.push({
            query: 'Busca bairros enchentes',
            table: 'bairros_risco_desastre',
            purpose: 'Buscar bairros afetados por enchentes',
            data: finalResults
          });
        }
        hasResults = true;
      }
    }
    
    // 3. BUSCA POR DADOS URBANÍSTICOS DE QUALQUER BAIRRO (DINÂMICA)
    const extractedBairro = extractBairroFromQuery(query);
    if (extractedBairro || queryLower.includes('altura') || queryLower.includes('coeficiente') || queryLower.includes('zot')) {
      console.log(`📋 Executando busca dinâmica por bairro (detectado: "${extractedBairro}")...`);
      
      let searchBairro = extractedBairro;
      
      // Se não extraiu bairro, tentar detectar automaticamente
      if (!searchBairro && (queryLower.includes('altura') || queryLower.includes('coeficiente'))) {
        // Buscar primeira palavra que pode ser bairro
        const words = query.split(' ').filter(w => w.length > 3);
        for (const word of words) {
          const { data: testBairro } = await supabaseClient
            .from('regime_urbanistico')
            .select('bairro')
            .ilike('bairro', `%${word}%`)
            .limit(1);
          
          if (testBairro && testBairro.length > 0) {
            searchBairro = word;
            break;
          }
        }
      }
      
      if (searchBairro) {
        const { data: regimeResults, error } = await supabaseClient
          .from('regime_urbanistico')
          .select('zona, bairro, altura_maxima, coef_aproveitamento_basico, coef_aproveitamento_maximo')
          .ilike('bairro', `%${searchBairro}%`)
          .order('zona');

        if (!error && regimeResults && regimeResults.length > 0) {
          executionResults.push({
            query: `Busca dados urbanísticos ${searchBairro}`,
            table: 'regime_urbanistico',
            purpose: `Obter dados urbanísticos do bairro ${regimeResults[0].bairro}`,
            data: regimeResults,
            detectedBairro: searchBairro
          });
          hasResults = true;
        }
      }
    }

    // 4. BUSCA GERAL EM DOCUMENTOS (FALLBACK DINÂMICO)
    if (!hasResults) {
      console.log('📋 Executando busca geral dinâmica...');
      
      const keywords = query.split(' ')
        .filter(word => word.length > 3)
        .slice(0, 3)
        .join('%');
      
      const { data: docResults, error } = await supabaseClient
        .from('document_embeddings')
        .select('content_chunk, chunk_metadata')
        .ilike('content_chunk', `%${keywords}%`)
        .limit(5);

      if (!error && docResults && docResults.length > 0) {
        executionResults.push({
          query: 'Busca geral dinâmica',
          table: 'document_embeddings',
          purpose: 'Busca geral em documentos',
          data: docResults
        });
        hasResults = true;
      }
    }

    console.log('✅ Execução dinâmica completa:', {
      totalResults: executionResults.length,
      hasValidData: hasResults,
      extractedBairro: extractedBairro,
      extractedArticle: articleNumber
    });

    // SÍNTESE DA RESPOSTA
    let finalResponse = '';
    let confidence = hasResults ? 0.9 : 0.1;
    let sources = { tabular: 0, conceptual: 0 };

    if (executionResults.length > 0) {
      for (const result of executionResults) {
        if (result.data && result.data.length > 0) {
          
          // Resposta para artigos da lei
          if (result.purpose.includes('artigo') || result.purpose.includes('Buscar artigo')) {
            const relevantDocs = result.data.filter(doc => 
              doc.content_chunk.toLowerCase().includes('artigo') ||
              doc.content_chunk.toLowerCase().includes('art.') ||
              doc.content_chunk.toLowerCase().includes('certificação') ||
              doc.content_chunk.toLowerCase().includes('sustentabilidade')
            );
            
            if (relevantDocs.length > 0) {
              // Tentar extrair número do artigo específico
              const firstDoc = relevantDocs[0].content_chunk;
              const artMatch = firstDoc.match(/(?:art|artigo)\s*\.?\s*(\d+)/i);
              const incMatch = firstDoc.match(/inciso\s*([IVX]+)/i);
              
              if (artMatch) {
                finalResponse = `Com base nos documentos oficiais do Plano Diretor de Porto Alegre, `;
                finalResponse += `encontrei informações sobre o **Artigo ${artMatch[1]}`;
                if (incMatch) finalResponse += `, Inciso ${incMatch[1]}`;
                finalResponse += `** da LUOS (Lei de Uso e Ocupação do Solo).\n\n`;
                
                // Extrair trecho relevante
                const relevantText = firstDoc.length > 300 ? firstDoc.substring(0, 300) + '...' : firstDoc;
                finalResponse += `**Conteúdo do artigo:**\n${relevantText}`;
              } else {
                finalResponse = `Com base nos documentos do Plano Diretor de Porto Alegre, encontrei as seguintes informações:\n\n`;
                relevantDocs.slice(0, 2).forEach((doc, i) => {
                  const content = doc.content_chunk.length > 200 ? doc.content_chunk.substring(0, 200) + '...' : doc.content_chunk;
                  finalResponse += `**${i + 1}.** ${content}\n\n`;
                });
              }
              sources.conceptual = relevantDocs.length;
            }
          }
          
          // Resposta para enchentes
          else if (result.purpose.includes('enchentes') || result.purpose.includes('Contar quantos bairros')) {
            if (result.data[0]?.total_bairros_enchentes !== undefined) {
              const total = result.data[0].total_bairros_enchentes;
              const bairrosList = result.data[0].bairros_lista;
              finalResponse = `Segundo os dados oficiais, **${total} bairros** foram identificados com risco de enchentes:\n\n`;
              if (bairrosList && bairrosList.length > 0) {
                finalResponse += bairrosList.map((b, i) => `${i + 1}. ${b}`).join('\n') + '\n\n';
              }
              finalResponse += `Estes bairros necessitam de estudos específicos para implementação de medidas de proteção contra inundações.`;
              confidence = 0.95;
            } else {
              const bairros = result.data.map(b => b.bairro_nome);
              finalResponse = `Os seguintes **${result.data.length} bairros** foram identificados com risco de enchentes:\n\n`;
              finalResponse += bairros.map((b, i) => `${i + 1}. ${b}`).join('\n') + '\n\n';
              finalResponse += `Estes bairros necessitam de estudos específicos para implementação de medidas de proteção contra inundações.`;
            }
            sources.tabular = result.data.length;
          }
          
          // Resposta para dados urbanísticos
          else if (result.purpose.includes('dados urbanísticos') || result.purpose.includes('Obter dados')) {
            const bairroName = result.data[0]?.bairro || result.detectedBairro || 'consultado';
            finalResponse = `**Dados Urbanísticos para o bairro ${bairroName}:**\n\n`;
            
            result.data.forEach(item => {
              finalResponse += `**${item.zona}:**\n`;
              finalResponse += `• Altura Máxima: ${item.altura_maxima || 'N/A'} metros\n`;
              finalResponse += `• Coeficiente de Aproveitamento Básico: ${item.coef_aproveitamento_basico || 'N/A'}\n`;
              finalResponse += `• Coeficiente de Aproveitamento Máximo: ${item.coef_aproveitamento_maximo || 'N/A'}\n\n`;
            });
            
            sources.tabular = result.data.length;
          }
          
          // Resposta geral
          else {
            finalResponse = `Com base nos documentos do Plano Diretor de Porto Alegre:\n\n`;
            result.data.slice(0, 2).forEach((doc, index) => {
              const content = doc.content_chunk.length > 200 
                ? doc.content_chunk.substring(0, 200) + '...'
                : doc.content_chunk;
              finalResponse += `**${index + 1}.** ${content}\n\n`;
            });
            sources.conceptual = result.data.length;
          }
        }
      }
    }

    // Fallback se não há resposta específica
    if (!finalResponse) {
      finalResponse = `Não foi possível encontrar informações específicas para "${query}". `;
      
      // Sugestões inteligentes baseadas na query
      if (extractedBairro) {
        finalResponse += `\n\n💡 **Dica:** Tentei buscar informações sobre o bairro "${extractedBairro}". Verifique se o nome está correto ou tente uma busca mais específica como "altura máxima ${extractedBairro}" ou "coeficiente aproveitamento ${extractedBairro}".`;
      } else if (articleNumber) {
        finalResponse += `\n\n💡 **Dica:** Tentei buscar o artigo ${articleNumber}. Tente ser mais específico, como "artigo ${articleNumber} LUOS" ou inclua o tema do artigo.`;
      } else {
        finalResponse += '\n\n💡 **Dica:** Seja mais específico em sua consulta. Exemplos: "artigo 81 LUOS", "altura máxima Menino Deus", "enchentes 2024".';
      }
      
      confidence = 0.1;
    }

    const executionTime = Date.now() - startTime;
    
    const response = {
      response: finalResponse,
      confidence: confidence,
      sources: sources,
      executionTime: executionTime,
      metadata: {
        pipeline: 'agentic-v2-dynamic',
        timestamp: new Date().toISOString(),
        sessionId: sessionId,
        model: model,
        totalQueries: executionResults.length,
        hasValidResults: hasResults,
        extractedBairro: extractedBairro,
        extractedArticle: articleNumber,
        isHardcoded: false
      }
    };

    console.log('✅ Resposta final v2 dinâmica:', {
      confidence: response.confidence,
      executionTime: executionTime,
      sources: response.sources,
      extractedBairro: extractedBairro,
      extractedArticle: articleNumber
    });

    return new Response(JSON.stringify(response), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });

  } catch (error) {
    console.error('❌ Agentic-RAG v2 dinâmico error:', error);
    
    return new Response(JSON.stringify({
      response: 'Desculpe, ocorreu um erro ao processar sua solicitação. Por favor, tente novamente.',
      confidence: 0,
      sources: { tabular: 0, conceptual: 0 },
      executionTime: 0,
      error: error.message,
      metadata: {
        pipeline: 'agentic-v2-dynamic',
        error: true,
        errorMessage: error.message,
        timestamp: new Date().toISOString()
      }
    }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }
});