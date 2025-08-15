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
 * Agent Legal - Especialista em Documentos Legais
 * Processa consultas relacionadas a:
 * - Busca semântica em documentos legais
 * - Citação precisa de artigos e leis
 * - Interpretação de regulamentações
 * - Cross-references entre documentos
 */
serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    console.log('⚖️ Agent Legal iniciado');
    
    const supabaseClient = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
    );

    const { query, context, embedding } = await req.json();
    console.log('📄 Query legal recebida:', { query, hasEmbedding: !!embedding });

    // Extrair entidades legais da query
    const entities = extractLegalEntities(query);
    console.log('🔍 Entidades legais extraídas:', entities);

    let results = {};
    let confidence = 0.4;

    // 1. Busca por artigos específicos se mencionados
    if (entities.artigo) {
      const articleData = await searchByArticle(supabaseClient, entities.artigo);
      results.articles = articleData;
      confidence += 0.3;
    }

    // 2. Busca semântica geral se embedding disponível
    if (embedding) {
      const semanticData = await searchSemanticDocuments(supabaseClient, embedding, query);
      results.semantic = semanticData;
      confidence += 0.2;
    }

  // 3. Busca em knowledge base se não achou dados específicos
  if (!results.articles?.length && !results.semantic?.length) {
    const knowledgeData = await searchKnowledgeBase(supabaseClient, query, entities);
    results.knowledge = knowledgeData;
    confidence += (knowledgeData.length > 0 ? 0.3 : 0);
  }

  // 4. Busca textual como fallback final
  if (!results.articles?.length && !results.semantic?.length && !results.knowledge?.length) {
    const textualData = await searchTextualDocuments(supabaseClient, query, entities);
    results.textual = textualData;
    confidence += (textualData.length > 0 ? 0.1 : 0);
  }

  // 5. Verificar se encontrou dados válidos
  const hasValidData = (results.articles?.length > 0) || 
                      (results.semantic?.length > 0) || 
                      (results.knowledge?.length > 0) ||
                      (results.textual?.length > 0);
    
    // 5. Gerar resposta ou retornar Beta
    const response = hasValidData ? 
      generateLegalResponse(query, results, entities) : 
      BETA_RESPONSE;
    
    // 6. Calcular confidence final
    const finalConfidence = hasValidData ? Math.min(confidence, 1.0) : 0;

    console.log('✅ Agent Legal concluído:', { 
      confidence: finalConfidence,
      entitiesFound: Object.keys(entities).length,
      resultsTypes: Object.keys(results).length
    });

    return new Response(JSON.stringify({
      agent: 'legal',
      response,
      confidence: finalConfidence,
      data: results,
      entities,
      metadata: {
        hasArticleSearch: !!results.articles?.length,
        hasSemanticSearch: !!results.semantic?.length,
        hasTextualSearch: !!results.textual?.length,
        citationsFound: extractCitations(results).length
      }
    }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });

  } catch (error) {
    console.error('❌ Agent Legal erro:', error);
    
    return new Response(JSON.stringify({
      agent: 'legal',
      error: 'Erro no processamento legal',
      details: error.message,
      confidence: 0
    }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }
});

/**
 * Extrai entidades legais da query (artigos, leis, etc.)
 */
function extractLegalEntities(query: string) {
  const entities: any = {};
  const queryLower = query.toLowerCase();

  // Padrões para artigos
  const articlePatterns = [
    /art\.?\s*(\d+)/i,
    /artigo\s+(\d+)/i,
    /§\s*(\d+)/i,
    /parágrafo\s+(\d+)/i
  ];

  for (const pattern of articlePatterns) {
    const match = query.match(pattern);
    if (match) {
      entities.artigo = parseInt(match[1]);
      break;
    }
  }

  // Tipos de documentos legais
  if (queryLower.includes('plano diretor') || queryLower.includes('pddua')) {
    entities.documentType = 'plano_diretor';
  }

  if (queryLower.includes('lei complementar') || queryLower.includes('lc')) {
    entities.documentType = 'lei_complementar';
  }

  if (queryLower.includes('decreto')) {
    entities.documentType = 'decreto';
  }

  // Documentos específicos
  if (queryLower.includes('luos') || queryLower.includes('uso do solo')) {
    entities.documentType = 'luos';
  }

  // Temas específicos expandidos
  if (queryLower.includes('zoneamento') || queryLower.includes('zona') || queryLower.includes('zot')) {
    entities.tema = 'zoneamento';
  }

  if (queryLower.includes('patrimônio') || queryLower.includes('histórico')) {
    entities.tema = 'patrimonio';
  }

  if (queryLower.includes('ambiental') || queryLower.includes('sustentabilidade') || queryLower.includes('certificação')) {
    entities.tema = 'ambiental';
  }

  if (queryLower.includes('4º distrito') || queryLower.includes('quarto distrito')) {
    entities.tema = '4distrito';
  }

  if (queryLower.includes('eiv') || queryLower.includes('impacto de vizinhança')) {
    entities.tema = 'eiv';
  }

  if (queryLower.includes('outorga onerosa') || queryLower.includes('outorga')) {
    entities.tema = 'outorga';
  }

  if (queryLower.includes('resuma') || queryLower.includes('resumo') || queryLower.includes('resumir')) {
    entities.intentType = 'summary';
  }

  return entities;
}

/**
 * Busca por artigo específico
 */
async function searchByArticle(supabaseClient: any, articleNumber: number) {
  try {
    const { data, error } = await supabaseClient
      .from('legal_document_chunks')
      .select('*')
      .eq('numero_artigo', articleNumber)
      .order('sequence_number', { ascending: true })
      .limit(10);

    if (error) {
      console.error('Erro ao buscar artigo:', error);
      return [];
    }

    console.log(`📋 Artigos encontrados: ${data?.length || 0} chunks`);
    return data || [];

  } catch (error) {
    console.error('Erro na busca por artigo:', error);
    return [];
  }
}

/**
 * Busca semântica usando embeddings
 */
async function searchSemanticDocuments(supabaseClient: any, embedding: number[], query: string) {
  try {
    // Usar função de busca semântica hierárquica
    const { data, error } = await supabaseClient.rpc(
      'match_hierarchical_documents',
      {
        query_embedding: embedding,
        match_count: 8,
        query_text: query
      }
    );

    if (error) {
      console.error('Erro na busca semântica:', error);
      return [];
    }

    console.log(`🎯 Resultados semânticos: ${data?.length || 0} chunks`);
    return data || [];

  } catch (error) {
    console.error('Erro na busca semântica:', error);
    return [];
  }
}

/**
 * Busca na knowledge base completa
 */
async function searchKnowledgeBase(supabaseClient: any, query: string, entities: any) {
  try {
    console.log('🧠 Buscando na knowledge base...');
    
    // Primeira tentativa: document_embeddings com ILIKE
    let dbQuery = supabaseClient
      .from('document_embeddings')
      .select('*');

    // Buscar por temas específicos primeiro
    if (entities.tema === 'ambiental') {
      dbQuery = dbQuery.or('content_chunk.ilike.%sustentabilidade%,content_chunk.ilike.%certificação%,content_chunk.ilike.%ambiental%');
    } else if (entities.tema === '4distrito') {
      dbQuery = dbQuery.ilike('content_chunk', '%4º distrito%');
    } else if (entities.tema === 'eiv') {
      dbQuery = dbQuery.ilike('content_chunk', '%impacto de vizinhança%');
    } else if (entities.intentType === 'summary') {
      dbQuery = dbQuery.or('content_chunk.ilike.%plano diretor%,content_chunk.ilike.%pddua%');
    } else {
      // Busca geral sanitizada
      const sanitizedQuery = query.replace(/[^a-zA-Z0-9\sçãõáéíóúâêîôûàèìòù]/g, '');
      dbQuery = dbQuery.ilike('content_chunk', `%${sanitizedQuery}%`);
    }

    const { data, error } = await dbQuery.limit(8);

    if (error) {
      console.error('❌ Erro na busca knowledge base:', error);
      // Fallback para legal_document_chunks
      return await searchLegalChunks(supabaseClient, entities);
    }

    console.log(`🧠 Knowledge base encontrou: ${data?.length || 0} chunks`);
    return data || [];

  } catch (error) {
    console.error('❌ Erro na busca knowledge base:', error);
    return await searchLegalChunks(supabaseClient, entities);
  }
}

/**
 * Fallback para legal_document_chunks
 */
async function searchLegalChunks(supabaseClient: any, entities: any) {
  try {
    let dbQuery = supabaseClient
      .from('legal_document_chunks')
      .select('*');

    if (entities.artigo) {
      dbQuery = dbQuery.eq('numero_artigo', entities.artigo);
    } else if (entities.tema === 'ambiental') {
      dbQuery = dbQuery.ilike('content', '%sustentabilidade%');
    } else {
      dbQuery = dbQuery.limit(5);
    }

    const { data, error } = await dbQuery;

    if (error) {
      console.error('❌ Erro nos legal chunks:', error);
      return [];
    }

    console.log(`📋 Legal chunks encontrados: ${data?.length || 0}`);
    return data || [];

  } catch (error) {
    console.error('❌ Erro nos legal chunks:', error);
    return [];
  }
}

/**
 * Busca textual como fallback final
 */
async function searchTextualDocuments(supabaseClient: any, query: string, entities: any) {
  try {
    // Sanitizar query para evitar erros de tsquery
    const sanitizedQuery = query
      .replace(/[^\w\sáéíóúâêîôûàèìòùãõç]/gi, ' ')
      .replace(/\s+/g, ' ')
      .trim();

    if (!sanitizedQuery) return [];

    const { data, error } = await supabaseClient
      .from('document_sections')
      .select('*')
      .ilike('content', `%${sanitizedQuery}%`)
      .limit(4);

    if (error) {
      console.error('❌ Erro na busca textual fallback:', error);
      return [];
    }

    console.log(`📝 Resultados textuais: ${data?.length || 0} chunks`);
    return data || [];

  } catch (error) {
    console.error('❌ Erro na busca textual:', error);
    return [];
  }
}

/**
 * Gera resposta legal contextualizada
 */
function generateLegalResponse(query: string, results: any, entities: any): string {
  let response = '';
  
  // Resposta para artigo específico
  if (results.articles?.length > 0) {
    response += `**Artigo ${entities.artigo} encontrado:**\n\n`;
    
    results.articles.forEach((chunk: any, index: number) => {
      response += `**${chunk.title}**\n`;
      response += `${chunk.content}\n\n`;
      
      if (chunk.metadata?.document_title) {
        response += `*Fonte: ${chunk.metadata.document_title}*\n\n`;
      }
    });
  }

  // Resposta da knowledge base
  if (results.knowledge?.length > 0) {
    if (response) response += '\n---\n\n';
    response += `**Informações da Base de Conhecimento:**\n\n`;
    
    results.knowledge.slice(0, 4).forEach((doc: any, index: number) => {
      // Para document_embeddings
      if (doc.content_chunk) {
        response += `**${index + 1}.** ${doc.content_chunk.substring(0, 250)}...\n`;
        if (doc.chunk_metadata?.articleNumber) {
          response += `*Artigo ${doc.chunk_metadata.articleNumber}*\n`;
        }
      } 
      // Para legal_document_chunks
      else if (doc.content) {
        response += `**${index + 1}.** ${doc.content.substring(0, 250)}...\n`;
        if (doc.numero_artigo) {
          response += `*Artigo ${doc.numero_artigo}*\n`;
        }
      }
      response += '\n';
    });
  }

  // Resposta semântica
  if (results.semantic?.length > 0) {
    if (response) response += '\n---\n\n';
    response += `**Documentos Relacionados:**\n\n`;
    
    results.semantic.slice(0, 3).forEach((doc: any, index: number) => {
      response += `**${index + 1}.** ${doc.content_chunk.substring(0, 200)}...\n`;
      
      if (doc.chunk_metadata?.articleNumber) {
        response += `*Artigo ${doc.chunk_metadata.articleNumber}*\n`;
      }
      
      if (doc.similarity) {
        response += `*Relevância: ${(doc.similarity * 100).toFixed(1)}%*\n`;
      }
      
      response += '\n';
    });
  }

  // Resposta textual como complemento
  if (results.textual?.length > 0 && !results.semantic?.length) {
    if (response) response += '\n---\n\n';
    response += `**Conteúdo Encontrado:**\n\n`;
    
    results.textual.slice(0, 3).forEach((doc: any, index: number) => {
      response += `**${index + 1}.** ${doc.content_chunk.substring(0, 150)}...\n\n`;
    });
  }

  // Nota: Se chegou aqui sem dados, o BETA_RESPONSE já foi retornado antes
  return response;
}

/**
 * Extrai citações dos resultados
 */
function extractCitations(results: any): string[] {
  const citations = [];
  
  if (results.articles) {
    results.articles.forEach((art: any) => {
      if (art.numero_artigo) {
        citations.push(`Art. ${art.numero_artigo}`);
      }
    });
  }
  
  if (results.semantic) {
    results.semantic.forEach((doc: any) => {
      if (doc.chunk_metadata?.articleNumber) {
        citations.push(`Art. ${doc.chunk_metadata.articleNumber}`);
      }
    });
  }
  
  return [...new Set(citations)]; // Remove duplicatas
}