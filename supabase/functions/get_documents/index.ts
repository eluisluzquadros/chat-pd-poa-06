import "https://deno.land/x/xhr@0.1.0/mod.ts";
import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.45.0';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

/**
 * Tool get_documents - Intelligent Data Retrieval
 * Performs adaptive queries based on table metadata and query context
 */
serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabaseClient = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
    );

    const { 
      table, 
      query_type, 
      search_params, 
      embedding, 
      limit = 10,
      include_related = false 
    } = await req.json();
    
    console.log('📄 get_documents called:', { table, query_type, search_params, limit, include_related });

    let results = [];
    let metadata = {};

    // Route based on table and query type
    switch (table) {
      case 'regime_urbanistico':
        results = await handleRegimeQuery(supabaseClient, search_params, limit);
        break;
        
      case 'bairros_risco_desastre':
        results = await handleRiskQuery(supabaseClient, search_params, limit);
        break;
        
      case 'document_embeddings':
        results = await handleVectorSearch(supabaseClient, search_params, embedding, limit);
        break;
        
      case 'document_sections':
        results = await handleDocumentSections(supabaseClient, search_params, embedding, limit);
        break;
        
      case 'legal_document_chunks':
        results = await handleLegalChunks(supabaseClient, search_params, embedding, limit);
        break;
        
      case 'query_cache':
        results = await handleCacheQuery(supabaseClient, search_params, limit);
        break;
        
      default:
        throw new Error(`Unsupported table: ${table}`);
    }

    // Add related data if requested
    if (include_related && results.length > 0) {
      const relatedData = await getRelatedData(supabaseClient, table, results, search_params);
      metadata.related = relatedData;
    }

    // Enhance results with metadata
    metadata = {
      ...metadata,
      table,
      query_type,
      total_results: results.length,
      search_params,
      timestamp: new Date().toISOString()
    };

    console.log('✅ get_documents completed:', { 
      table, 
      results_count: results.length,
      has_related: !!metadata.related 
    });

    return new Response(JSON.stringify({
      results,
      metadata,
      success: true
    }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });

  } catch (error) {
    console.error('❌ get_documents error:', error);
    
    return new Response(JSON.stringify({
      error: 'Failed to retrieve documents',
      details: error.message,
      results: [],
      metadata: { error: true, timestamp: new Date().toISOString() }
    }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }
});

// Helper functions for different table types

async function handleRegimeQuery(supabase, params, limit) {
  const { bairro, zona } = params;
  
  if (bairro || zona) {
    // Use optimized function
    const { data, error } = await supabase.rpc('fast_regime_lookup_simple', {
      p_bairro: bairro || null,
      p_zona: zona || null
    });
    
    if (error) throw error;
    return data?.slice(0, limit) || [];
  }
  
  // Fallback to direct query
  let query = supabase.from('regime_urbanistico').select('*');
  
  if (bairro) query = query.ilike('bairro', `%${bairro}%`);
  if (zona) query = query.ilike('zona', `%${zona}%`);
  
  const { data, error } = await query.limit(limit);
  if (error) throw error;
  
  return data || [];
}

async function handleRiskQuery(supabase, params, limit) {
  const { bairro } = params;
  
  if (bairro) {
    // Use specialized function
    const { data, error } = await supabase.rpc('get_riscos_bairro', {
      nome_bairro: bairro
    });
    
    if (error) throw error;
    return data?.slice(0, limit) || [];
  }
  
  // General risk query
  const { data, error } = await supabase
    .from('bairros_risco_desastre')
    .select('*')
    .limit(limit);
    
  if (error) throw error;
  return data || [];
}

async function handleVectorSearch(supabase, params, embedding, limit) {
  const { query_text, boost_metadata } = params;
  
  if (!embedding || embedding.length === 0) {
    throw new Error('Embedding required for vector search');
  }
  
  // Use hierarchical search with boosting
  const { data, error } = await supabase.rpc('match_hierarchical_documents', {
    query_embedding: embedding,
    match_count: limit,
    query_text: query_text || ''
  });
  
  if (error) throw error;
  return data || [];
}

async function handleDocumentSections(supabase, params, embedding, limit) {
  if (embedding && embedding.length > 0) {
    // Vector search
    const { data, error } = await supabase.rpc('match_document_sections', {
      query_embedding: embedding,
      match_threshold: 0.7,
      match_count: limit
    });
    
    if (error) throw error;
    return data || [];
  }
  
  // Text search fallback
  const { search_text } = params;
  if (search_text) {
    const { data, error } = await supabase
      .from('document_sections')
      .select('*')
      .textSearch('content', search_text)
      .limit(limit);
      
    if (error) throw error;
    return data || [];
  }
  
  throw new Error('Either embedding or search_text required for document_sections');
}

async function handleLegalChunks(supabase, params, embedding, limit) {
  const { artigo, search_text } = params;
  
  let query = supabase.from('legal_document_chunks').select('*');
  
  if (artigo) {
    query = query.eq('numero_artigo', artigo);
  }
  
  if (search_text) {
    query = query.textSearch('content', search_text);
  }
  
  const { data, error } = await query.limit(limit);
  if (error) throw error;
  
  return data || [];
}

async function handleCacheQuery(supabase, params, limit) {
  const { query_text, query_type } = params;
  
  let query = supabase.from('query_cache').select('*');
  
  if (query_text) {
    query = query.ilike('query_text', `%${query_text}%`);
  }
  
  if (query_type) {
    query = query.eq('query_type', query_type);
  }
  
  const { data, error } = await query
    .order('hit_count', { ascending: false })
    .limit(limit);
    
  if (error) throw error;
  return data || [];
}

async function getRelatedData(supabase, mainTable, results, searchParams) {
  const related = {};
  
  try {
    switch (mainTable) {
      case 'regime_urbanistico':
        // Get related risk data if we have bairro
        const bairros = [...new Set(results.map(r => r.bairro))];
        if (bairros.length > 0) {
          const { data } = await supabase
            .from('bairros_risco_desastre')
            .select('*')
            .in('bairro_nome', bairros);
          related.risks = data || [];
        }
        break;
        
      case 'bairros_risco_desastre':
        // Get related regime data
        const bairroNames = [...new Set(results.map(r => r.bairro_nome))];
        if (bairroNames.length > 0) {
          const { data } = await supabase
            .from('regime_urbanistico')
            .select('*')
            .in('bairro', bairroNames);
          related.regime = data || [];
        }
        break;
    }
  } catch (error) {
    console.warn('Warning: Failed to fetch related data:', error.message);
  }
  
  return related;
}