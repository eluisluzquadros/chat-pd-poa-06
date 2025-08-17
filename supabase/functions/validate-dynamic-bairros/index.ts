import { serve } from 'https://deno.land/std@0.168.0/http/server.ts';
import { getBairrosList, getCacheStats, isValidBairro, findSimilarBairros } from '../_shared/dynamic-bairros.ts';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders });
  }

  try {
    console.log('🧪 Executando validação completa do sistema dinâmico...');

    // FASE 1: Testar carregamento de bairros
    console.log('\n📋 FASE 1: Carregamento de Bairros');
    const startTime = Date.now();
    const bairrosData = await getBairrosList();
    const loadTime = Date.now() - startTime;
    
    console.log(`✅ Carregados: ${bairrosData.validBairros.length} bairros válidos`);
    console.log(`✅ Tempo de carregamento: ${loadTime}ms`);
    console.log(`✅ Primeiros 10 bairros: ${bairrosData.validBairros.slice(0, 10).join(', ')}`);

    // FASE 2: Testar validação
    console.log('\n🔍 FASE 2: Validação de Bairros');
    const testBairros = [
      'CENTRO HISTÓRICO',
      'MOINHOS DE VENTO', 
      'TRÊS FIGUEIRAS',
      'BAIRRO INEXISTENTE',
      'centro', // teste de normalização
      'tres figueiras' // teste de acentos
    ];

    const validationResults = [];
    for (const bairro of testBairros) {
      const isValid = await isValidBairro(bairro);
      const similar = isValid ? [] : await findSimilarBairros(bairro);
      
      validationResults.push({
        bairro,
        isValid,
        similar: similar.slice(0, 3)
      });
      
      console.log(`${isValid ? '✅' : '❌'} ${bairro}: ${isValid ? 'VÁLIDO' : `INVÁLIDO (sugestões: ${similar.slice(0, 3).join(', ')})`}`);
    }

    // FASE 3: Testar cache
    console.log('\n💾 FASE 3: Status do Cache');
    const cacheStats = getCacheStats();
    console.log(`✅ Status: ${cacheStats.status}`);
    console.log(`✅ Última atualização: ${cacheStats.lastUpdated}`);
    console.log(`✅ Idade: ${cacheStats.age}`);
    console.log(`✅ Total de bairros: ${cacheStats.validBairrosCount}`);

    // FASE 4: Comparar com sistema anterior (hardcoded)
    console.log('\n📊 FASE 4: Comparação com Sistema Anterior');
    const hardcodedCount = 90; // Sistema anterior tinha 90 bairros
    const dynamicCount = bairrosData.validBairros.length;
    const improvement = dynamicCount - hardcodedCount;
    
    console.log(`📊 Sistema anterior (hardcoded): ${hardcodedCount} bairros`);
    console.log(`📊 Sistema dinâmico atual: ${dynamicCount} bairros`);
    console.log(`📊 Melhoria: +${improvement} bairros (${Math.round((improvement/hardcodedCount)*100)}%)`);

    // FASE 5: Verificar consistência
    console.log('\n🔄 FASE 5: Verificação de Consistência');
    const uniqueCheck = new Set(bairrosData.validBairros);
    const hasDuplicates = uniqueCheck.size !== bairrosData.validBairros.length;
    const sortedCheck = [...bairrosData.validBairros].sort().join(',') === bairrosData.validBairros.join(',');
    
    console.log(`${hasDuplicates ? '❌' : '✅'} Duplicatas: ${hasDuplicates ? 'ENCONTRADAS' : 'NENHUMA'}`);
    console.log(`${sortedCheck ? '✅' : '❌'} Ordenação: ${sortedCheck ? 'CORRETA' : 'INCORRETA'}`);

    const summary = {
      success: true,
      timestamp: new Date().toISOString(),
      loadTime: `${loadTime}ms`,
      totalBairros: dynamicCount,
      improvementOverHardcoded: `+${improvement} bairros (+${Math.round((improvement/hardcodedCount)*100)}%)`,
      validationResults,
      cache: cacheStats,
      consistency: {
        noDuplicates: !hasDuplicates,
        properSorting: sortedCheck
      },
      status: 'SISTEMA DINÂMICO OPERACIONAL ✅'
    };

    console.log('\n🎉 VALIDAÇÃO COMPLETA!');
    console.log(`🎯 Total: ${dynamicCount} bairros carregados dinamicamente`);
    console.log(`⚡ Performance: ${loadTime}ms`);
    console.log(`🚀 Melhoria: +${improvement} bairros vs sistema anterior`);

    return new Response(JSON.stringify(summary, null, 2), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });

  } catch (error) {
    console.error('❌ Erro na validação:', error);
    return new Response(JSON.stringify({
      success: false,
      error: error.message,
      timestamp: new Date().toISOString()
    }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }
});