import "https://deno.land/x/xhr@0.1.0/mod.ts";
import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.38.4';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
const supabase = createClient(supabaseUrl, supabaseServiceKey);

interface FindArticleRequest {
  articleNumbers?: number[];
  searchText?: string;
  documentType?: string;
}

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { articleNumbers, searchText, documentType = 'LUOS' }: FindArticleRequest = await req.json();
    
    console.log('🔍 Legal Article Finder - Searching in knowledgebase:', { articleNumbers, searchText, documentType });
    
    const results = [];
    
    // Busca por números específicos de artigos na knowledgebase
    if (articleNumbers && articleNumbers.length > 0) {
      for (const num of articleNumbers) {
        console.log(`📄 Searching for article ${num} in knowledgebase...`);
        
        // Buscar na knowledgebase por artigos específicos
        const { data: articles } = await supabase.rpc('search_articles_knowledgebase', {
          article_number_search: num.toString(),
          document_type_filter: documentType.toLowerCase()
        });
        
        if (articles && articles.length > 0) {
          const article = articles[0]; // Get the best match
          results.push({
            found: true,
            article_number: num,
            content: article.texto || article.resposta || '',
            title: article.titulo || `Artigo ${num}`,
            confidence: 1.0,
            source: 'knowledgebase',
            tipo_documento: article.tipo_documento
          });
          console.log(`✅ Found article ${num} in knowledgebase`);
        } else {
          console.log(`❌ Article ${num} not found in knowledgebase`);
          results.push({
            found: false,
            article_number: num,
            error: `Artigo ${num} não encontrado na base de conhecimento`,
            confidence: 0,
            source: 'knowledgebase'
          });
        }
      }
    }
    
    // Busca textual na knowledgebase
    if (searchText) {
      console.log(`🔤 Text search for: "${searchText}" in knowledgebase...`);
      
      const { data: searchResults } = await supabase.rpc('search_knowledgebase_by_content', {
        search_text: searchText,
        tipo_documento_filter: documentType.toLowerCase(),
        match_count: 10
      });
      
      if (searchResults && searchResults.length > 0) {
        searchResults.forEach((result: any, index: number) => {
          results.push({
            found: true,
            searchText: searchText,
            content: result.texto || result.resposta || '',
            title: result.titulo || result.pergunta || `Resultado ${index + 1}`,
            confidence: result.relevance_score || 0.8,
            source: 'knowledgebase',
            tipo_documento: result.tipo_documento,
            metadata: {
              parte: result.parte,
              capitulo: result.capitulo,
              secao: result.secao,
              subsecao: result.subsecao
            }
          });
        });
        console.log(`✅ Found ${searchResults.length} text search results in knowledgebase`);
      } else {
        console.log(`❌ No text search results found for "${searchText}"`);
        results.push({
          found: false,
          searchText: searchText,
          error: `Nenhum resultado encontrado para "${searchText}" na base de conhecimento`,
          confidence: 0,
          source: 'knowledgebase'
        });
      }
    }

    // Log do resultado final
    console.log(`📊 Legal Article Finder Results: ${results.length} total results`);
    console.log(`✅ Found: ${results.filter(r => r.found).length}, ❌ Not found: ${results.filter(r => !r.found).length}`);

    return new Response(JSON.stringify({
      success: true,
      results,
      source: 'knowledgebase',
      timestamp: new Date().toISOString(),
      total: results.length,
      found: results.filter(r => r.found).length
    }), {
      status: 200,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });

  } catch (error) {
    console.error('❌ Legal Article Finder Error:', error);
    
    return new Response(JSON.stringify({
      success: false,
      error: `Erro na busca: ${error.message}`,
      source: 'knowledgebase',
      timestamp: new Date().toISOString()
    }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }
});