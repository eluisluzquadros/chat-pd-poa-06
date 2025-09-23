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
    const { query } = await req.json();
    console.log('DEBUG - SQL Generator Debug - Query:', query);

    const supabaseClient = createClient(
      Deno.env.get("SUPABASE_URL") ?? "",
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? ""
    );

    // Test 1: Check if document_rows table exists
    const { data: tableCheck, error: tableError } = await supabaseClient
      .from('document_rows')
      .select('count')
      .limit(1);
    
    console.log('Table check:', { exists: !tableError, error: tableError });

    // Test 2: Simple query test
    const testQuery = "SELECT COUNT(*) as total FROM document_rows";
    console.log('Testing query:', testQuery);
    
    const { data: testResult, error: testError } = await supabaseClient
      .rpc('execute_sql_query', { query_text: testQuery });
    
    console.log('Test query result:', { data: testResult, error: testError });

    // Test 3: Check specific datasets
    const datasetQuery = `
      SELECT DISTINCT dataset_id, COUNT(*) as count 
      FROM document_rows 
      GROUP BY dataset_id
    `;
    
    const { data: datasetResult, error: datasetError } = await supabaseClient
      .rpc('execute_sql_query', { query_text: datasetQuery });
    
    console.log('Dataset query result:', { data: datasetResult, error: datasetError });

    // Test 4: Cristal specific query
    const cristalQuery = `
      SELECT 
        row_data->>'Bairro' as bairro,
        row_data->>'Zona' as zona
      FROM document_rows 
      WHERE row_data->>'Bairro' ILIKE '%cristal%'
      LIMIT 5
    `;
    
    const { data: cristalResult, error: cristalError } = await supabaseClient
      .rpc('execute_sql_query', { query_text: cristalQuery });
    
    console.log('Cristal query result:', { data: cristalResult, error: cristalError });

    // Test 5: Direct table query (without RPC)
    const { data: directData, error: directError } = await supabaseClient
      .from('document_rows')
      .select('dataset_id, row_data')
      .limit(5);
    
    console.log('Direct table query:', { 
      success: !directError, 
      rowCount: directData?.length,
      error: directError 
    });

    return new Response(JSON.stringify({
      debug: true,
      query,
      tests: {
        tableExists: !tableError,
        rpcFunctionWorks: !testError,
        datasetsFound: datasetResult?.length || 0,
        cristalFound: cristalResult?.length || 0,
        directQueryWorks: !directError
      },
      results: {
        tableCheck: { error: tableError?.message },
        testQuery: { data: testResult, error: testError?.message },
        datasetQuery: { data: datasetResult, error: datasetError?.message },
        cristalQuery: { data: cristalResult, error: cristalError?.message },
        directQuery: { rowCount: directData?.length, error: directError?.message }
      }
    }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });

  } catch (error) {
    console.error('Debug error:', error);
    return new Response(JSON.stringify({ 
      error: error.message,
      debug: true
    }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }
});