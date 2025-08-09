import "https://deno.land/x/xhr@0.1.0/mod.ts";
import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { action, query } = await req.json();
    
    const supabaseClient = createClient(
      Deno.env.get("SUPABASE_URL") ?? "",
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? ""
    );

    console.log('🧹 CACHE DEBUG - Ação:', action);

    if (action === 'clear') {
      // Clear cache completely
      const { error } = await supabaseClient
        .from('query_cache')
        .delete()
        .neq('id', 0); // Delete all

      if (error) {
        throw error;
      }

      console.log('🗑️ Cache completamente limpo');
      return new Response(JSON.stringify({ 
        success: true, 
        message: 'Cache completamente limpo',
        action: 'clear_all'
      }), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    if (action === 'clear_tres_figueiras') {
      // Clear cache specifically for "Três Figueiras" queries
      const { data: deletedEntries, error } = await supabaseClient
        .from('query_cache')
        .delete()
        .or('query_text.ilike.%três figueiras%,query_text.ilike.%tres figueiras%')
        .select();

      if (error) {
        throw error;
      }

      console.log('🎯 Cache limpo para Três Figueiras:', deletedEntries?.length || 0, 'entradas removidas');
      return new Response(JSON.stringify({ 
        success: true, 
        message: `Cache limpo para Três Figueiras: ${deletedEntries?.length || 0} entradas removidas`,
        deletedEntries: deletedEntries
      }), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    if (action === 'inspect') {
      // Inspect cache contents
      const { data: cacheEntries, error } = await supabaseClient
        .from('query_cache')
        .select('*')
        .order('created_at', { ascending: false })
        .limit(20);

      if (error) {
        throw error;
      }

      console.log('📊 CACHE ATUAL:', cacheEntries?.length || 0, 'entradas');
      
      // Look specifically for "Três Figueiras" entries
      const tresFigueirasEntries = cacheEntries?.filter(entry => 
        entry.query_text?.toLowerCase().includes('três figueiras') ||
        entry.query_text?.toLowerCase().includes('tres figueiras')
      ) || [];

      console.log('🎯 ENTRADAS TRÊS FIGUEIRAS:', tresFigueirasEntries.length);

      return new Response(JSON.stringify({ 
        success: true, 
        totalEntries: cacheEntries?.length || 0,
        tresFigueirasEntries: tresFigueirasEntries.length,
        recentEntries: cacheEntries?.slice(0, 5),
        tresFigueirasData: tresFigueirasEntries
      }), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    if (action === 'test_normalization') {
      // Test normalization of "Três Figueiras"
      const testQueries = [
        'três figueiras',
        'tres figueiras', 
        'TRÊS FIGUEIRAS',
        'TRES FIGUEIRAS',
        'Três Figueiras',
        'o que pode ser construído no três figueiras',
        'O que pode ser construído no bairro Três Figueiras?'
      ];

      const results = [];

      for (const testQuery of testQueries) {
        // Test direct SQL
        const sqlQuery = `SELECT bairro, zona, altura_maxima FROM regime_urbanistico WHERE UPPER(bairro) = UPPER('${testQuery}') OR bairro ILIKE '%${testQuery}%' LIMIT 3`;
        
        try {
          const { data: sqlResult } = await supabaseClient
            .rpc('execute_sql_query', { query_text: sqlQuery });

          results.push({
            testQuery,
            sqlQuery,
            resultCount: sqlResult?.length || 0,
            firstResult: sqlResult?.[0] || null
          });
        } catch (error) {
          results.push({
            testQuery,
            sqlQuery,
            error: error.message
          });
        }
      }

      console.log('🧪 TESTE DE NORMALIZAÇÃO:', results);

      return new Response(JSON.stringify({ 
        success: true, 
        message: 'Teste de normalização concluído',
        results: results
      }), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    return new Response(JSON.stringify({ 
      error: 'Ação não reconhecida', 
      validActions: ['clear', 'clear_tres_figueiras', 'inspect', 'test_normalization']
    }), {
      status: 400,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });

  } catch (error) {
    console.error('Cache debug error:', error);
    return new Response(JSON.stringify({ 
      error: error.message 
    }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }
});