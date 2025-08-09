import "https://deno.land/x/xhr@0.1.0/mod.ts";
import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';
import { 
  createUniversalBairroSearch,
  generateUniversalBairroSQL,
  validateBairroSearch,
  createBairroValidationSQL
} from '../_shared/normalization.ts';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

interface ValidationRequest {
  bairroName?: string;
  testAllBairros?: boolean;
  generateReport?: boolean;
}

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { bairroName, testAllBairros, generateReport }: ValidationRequest = await req.json();

    const supabaseClient = createClient(
      Deno.env.get("SUPABASE_URL") ?? "",
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? ""
    );

    if (testAllBairros) {
      console.log('🧪 TESTANDO TODOS OS 94 BAIRROS');
      
      // Execute validation query for all neighborhoods
      const validationSQL = createBairroValidationSQL();
      const { data: validationResults, error: validationError } = await supabaseClient
        .rpc('execute_sql_query', { query_text: validationSQL });

      if (validationError) {
        throw new Error(`Validation query failed: ${validationError.message}`);
      }

      const failingBairros = validationResults?.filter((r: any) => r.status === 'FAILING') || [];
      const workingBairros = validationResults?.filter((r: any) => r.status === 'WORKING') || [];
      
      console.log('📊 RESULTADO DA VALIDAÇÃO:');
      console.log(`  ✅ Funcionando: ${workingBairros.length} bairros`);
      console.log(`  ❌ Falhando: ${failingBairros.length} bairros`);
      
      return new Response(JSON.stringify({
        success: true,
        totalBairros: validationResults?.length || 0,
        workingBairros: workingBairros.length,
        failingBairros: failingBairros.length,
        failingList: failingBairros.map((b: any) => b.bairro),
        fullResults: validationResults,
        coverage: Math.round((workingBairros.length / (validationResults?.length || 1)) * 100)
      }), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    if (bairroName) {
      console.log(`🎯 TESTANDO BAIRRO ESPECÍFICO: ${bairroName}`);
      
      // Test specific neighborhood
      const validation = validateBairroSearch(bairroName);
      const universalSQL = generateUniversalBairroSQL(bairroName, 10);
      
      console.log('🔍 SQL GERADO:', universalSQL);
      
      // Execute the search
      const { data: searchResults, error: searchError } = await supabaseClient
        .rpc('execute_sql_query', { query_text: universalSQL });

      if (searchError) {
        console.error('❌ ERRO NA BUSCA:', searchError);
      }

      const found = searchResults?.length || 0;
      console.log(`📊 RESULTADOS: ${found} registros encontrados`);

      return new Response(JSON.stringify({
        success: !searchError,
        bairroName,
        validation,
        universalSQL,
        resultsFound: found,
        searchResults: searchResults || [],
        error: searchError?.message
      }), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    if (generateReport) {
      console.log('📋 GERANDO RELATÓRIO COMPLETO');
      
      // Get all unique neighborhoods
      const allBairrosSQL = `SELECT DISTINCT bairro FROM regime_urbanistico ORDER BY bairro`;
      const { data: allBairros, error: bairrosError } = await supabaseClient
        .rpc('execute_sql_query', { query_text: allBairrosSQL });

      if (bairrosError) {
        throw new Error(`Failed to get neighborhoods: ${bairrosError.message}`);
      }

      const report = {
        totalBairros: allBairros?.length || 0,
        testedAt: new Date().toISOString(),
        bairrosList: allBairros?.map((b: any) => b.bairro) || [],
        validationSQL: createBairroValidationSQL(),
        universalSearchExample: generateUniversalBairroSQL('TRÊS FIGUEIRAS', 5)
      };

      return new Response(JSON.stringify(report), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    return new Response(JSON.stringify({
      message: 'Universal Bairro Validator',
      usage: {
        testSpecific: 'POST com { "bairroName": "nome do bairro" }',
        testAll: 'POST com { "testAllBairros": true }',
        generateReport: 'POST com { "generateReport": true }'
      }
    }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });

  } catch (error) {
    console.error('❌ ERRO NO VALIDADOR:', error);
    return new Response(JSON.stringify({ 
      error: error.message,
      success: false
    }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }
});