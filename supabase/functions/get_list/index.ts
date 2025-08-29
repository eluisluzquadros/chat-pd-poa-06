import "https://deno.land/x/xhr@0.1.0/mod.ts";
import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.45.0';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

/**
 * Tool get_list - Schema Discovery and Table Metadata
 * Provides structured information about available tables, schemas, and relationships
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

    const { domain, detailed } = await req.json();
    
    console.log('🔍 get_list called with:', { domain, detailed });

    // Core table categories with their metadata
    const tableCategories = {
      urban: {
        description: "Regime urbanístico, zoneamento e dados de bairros",
        tables: {
          regime_urbanistico: {
            description: "Regras de construção por bairro e zona",
            key_columns: ["bairro", "zona", "altura_maxima", "coef_aproveitamento_basico", "coef_aproveitamento_maximo"],
            search_fields: ["bairro", "zona"],
            relationships: ["zots_bairros"]
          },
          zots_bairros: {
            description: "Zonas especiais por bairro",
            key_columns: ["bairro", "zona", "total_zonas_no_bairro", "tem_zona_especial"],
            search_fields: ["bairro"],
            relationships: ["regime_urbanistico"]
          }
        }
      },
      risks: {
        description: "Riscos de desastres por bairro",
        tables: {
          bairros_risco_desastre: {
            description: "Tipos de risco e níveis por bairro",
            key_columns: ["bairro_nome", "risco_inundacao", "risco_deslizamento", "risco_alagamento", "nivel_risco_geral"],
            search_fields: ["bairro_nome"],
            relationships: ["regime_urbanistico via bairro"]
          }
        }
      },
      legal: {
        description: "Documentos legais e embeddings semânticos",
        tables: {
          document_sections: {
            description: "Seções de documentos legais com embeddings",
            key_columns: ["content", "metadata", "embedding"],
            search_fields: ["content"],
            vector_search: true,
            relationships: []
          },
          document_embeddings: {
            description: "Chunks de documentos com metadados enriquecidos",
            key_columns: ["content_chunk", "chunk_metadata", "embedding"],
            search_fields: ["content_chunk"],
            vector_search: true,
            relationships: []
          },
          legal_document_chunks: {
            description: "Estrutura hierárquica de documentos legais",
            key_columns: ["title", "content", "numero_artigo", "level_type", "metadata"],
            search_fields: ["title", "content", "numero_artigo"],
            vector_search: true,
            relationships: []
          }
        }
      },
      cache: {
        description: "Sistema de cache para otimização",
        tables: {
          query_cache: {
            description: "Cache de consultas realizadas",
            key_columns: ["query_text", "query_type", "result", "hit_count"],
            search_fields: ["query_text", "query_type"],
            relationships: []
          }
        }
      }
    };

    // Available SQL functions for complex queries
    const availableFunctions = {
      regime_queries: [
        "fast_regime_lookup_simple(bairro, zona)",
        "cache_regime_query(bairro, zona)",
        "search_regime_urbanistico(bairro, zona)"
      ],
      risk_queries: [
        "get_riscos_bairro(nome_bairro)"
      ],
      vector_search: [
        "match_document_sections(query_embedding, match_threshold, match_count)",
        "match_hierarchical_documents(query_embedding, match_count, query_text)",
        "hybrid_search(query_text, query_embedding, match_threshold, match_count)"
      ],
      cache_operations: [
        "get_from_cache(query_text)",
        "add_to_cache(query_text, query_type, result)"
      ]
    };

    // Filter by domain if specified
    let response;
    if (domain && tableCategories[domain]) {
      response = {
        domain,
        category: tableCategories[domain],
        functions: availableFunctions[domain === 'legal' ? 'vector_search' : `${domain}_queries`] || [],
        total_tables: Object.keys(tableCategories[domain].tables).length
      };
    } else {
      response = {
        all_domains: Object.keys(tableCategories),
        categories: detailed ? tableCategories : Object.keys(tableCategories).reduce((acc, key) => {
          acc[key] = {
            description: tableCategories[key].description,
            table_count: Object.keys(tableCategories[key].tables).length
          };
          return acc;
        }, {}),
        available_functions: availableFunctions,
        total_tables: Object.values(tableCategories).reduce((sum, cat) => sum + Object.keys(cat.tables).length, 0)
      };
    }

    // Add recommendations based on common query patterns
    response.recommendations = {
      urban_queries: "Use regime_urbanistico + zots_bairros for construction rules",
      risk_analysis: "Use bairros_risco_desastre with get_riscos_bairro() function",
      legal_search: "Use vector search on document_embeddings for semantic queries",
      performance: "Always check query_cache first for repeated queries"
    };

    console.log('✅ get_list response generated:', { 
      domain, 
      tables_included: Object.keys(response.categories || response.category?.tables || {}).length 
    });

    return new Response(JSON.stringify(response), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });

  } catch (error) {
    console.error('❌ get_list error:', error);
    
    return new Response(JSON.stringify({
      error: 'Failed to retrieve table list',
      details: error.message,
      available_domains: ['urban', 'risks', 'legal', 'cache']
    }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }
});