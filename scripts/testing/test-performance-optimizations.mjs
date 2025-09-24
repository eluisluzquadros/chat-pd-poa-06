/**
 * Teste de Performance - Otimizações da função match_hierarchical_documents
 * 
 * Este script testa as melhorias implementadas:
 * 1. Cache inteligente de resultados
 * 2. CTEs otimizados com índices compostos
 * 3. Batching para múltiplas queries
 * 4. Métricas de performance integradas
 * 5. Modos de performance (speed/balanced/quality)
 */

import { createClient } from '@supabase/supabase-js';
import { performance } from 'perf_hooks';

// Configuração do Supabase
const supabaseUrl = process.env.SUPABASE_URL || 'https://your-project.supabase.co';
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY || 'your-service-key';
const supabase = createClient(supabaseUrl, supabaseKey);

// Queries de teste com diferentes complexidades
const testQueries = [
  {
    type: 'altura_certificacao',
    text: 'Qual a altura máxima permitida para certificação em sustentabilidade?',
    expectedBoosts: ['hasCertification', 'altura']
  },
  {
    type: '4th_district',
    text: 'Quais são as regras para o 4º distrito Art. 74?',
    expectedBoosts: ['has4thDistrict', 'articleNumber']
  },
  {
    type: 'artigo_especifico',
    text: 'O que diz o artigo 81 sobre altura?',
    expectedBoosts: ['articleNumber', 'altura']
  },
  {
    type: 'inciso_especifico',
    text: 'Detalhes do inciso III sobre parâmetros urbanísticos',
    expectedBoosts: ['incisoNumber']
  },
  {
    type: 'keywords_genericas',
    text: 'Informações sobre zoneamento urbano',
    expectedBoosts: ['hasImportantKeywords']
  }
];

/**
 * Gera embedding mock para testes
 */
function generateMockEmbedding() {
  return Array.from({ length: 1536 }, () => Math.random() * 2 - 1);
}

/**
 * Testa performance da função original vs otimizada
 */
async function testPerformanceComparison() {
  console.log('🚀 Iniciando testes de performance...\n');
  
  const results = {
    original: [],
    optimized: [],
    cache_performance: {
      hits: 0,
      misses: 0,
      total_time_saved: 0
    }
  };

  for (const query of testQueries) {
    console.log(`📝 Testando query: ${query.type}`);
    console.log(`   Texto: "${query.text}"`);
    
    const embedding = generateMockEmbedding();
    
    // Teste da função original (se disponível)
    try {
      const startOriginal = performance.now();
      
      const { data: originalResults, error: originalError } = await supabase.rpc('match_hierarchical_documents', {
        query_embedding: embedding,
        match_count: 10,
        document_ids: null,
        query_text: query.text
      });
      
      const endOriginal = performance.now();
      const originalTime = endOriginal - startOriginal;
      
      if (!originalError) {
        results.original.push({
          query: query.type,
          time_ms: originalTime,
          results_count: originalResults?.length || 0
        });
        console.log(`   ⏱️  Original: ${originalTime.toFixed(2)}ms, ${originalResults?.length || 0} resultados`);
      }
    } catch (error) {
      console.log(`   ⚠️  Função original não disponível: ${error.message}`);
    }

    // Teste da função otimizada
    try {
      const startOptimized = performance.now();
      
      const { data: optimizedResults, error: optimizedError } = await supabase.rpc('match_hierarchical_documents_optimized', {
        query_embedding: embedding,
        match_count: 10,
        document_ids: null,
        query_text: query.text,
        enable_cache: true,
        performance_mode: 'balanced'
      });
      
      const endOptimized = performance.now();
      const optimizedTime = endOptimized - startOptimized;
      
      if (!optimizedError && optimizedResults?.length > 0) {
        const perfMetrics = optimizedResults[0].performance_metrics;
        const cacheHit = perfMetrics?.cache_hit || false;
        
        results.optimized.push({
          query: query.type,
          time_ms: optimizedTime,
          results_count: optimizedResults.length,
          cache_hit: cacheHit,
          query_time_ms: perfMetrics?.query_time_ms || optimizedTime,
          total_candidates: perfMetrics?.total_candidates || 0,
          filtered_results: perfMetrics?.filtered_results || 0,
          performance_mode: perfMetrics?.performance_mode || 'balanced'
        });
        
        // Atualizar estatísticas de cache
        if (cacheHit) {
          results.cache_performance.hits++;
        } else {
          results.cache_performance.misses++;
        }
        
        console.log(`   ⚡ Otimizada: ${optimizedTime.toFixed(2)}ms, ${optimizedResults.length} resultados`);
        console.log(`   📊 Cache: ${cacheHit ? 'HIT' : 'MISS'}, Candidatos: ${perfMetrics?.total_candidates}, Modo: ${perfMetrics?.performance_mode}`);
        
        // Verificar boosts aplicados
        const boostedResults = optimizedResults.filter(r => r.boosted_score > r.similarity);
        if (boostedResults.length > 0) {
          console.log(`   🎯 Boosts aplicados: ${boostedResults.length}/${optimizedResults.length} resultados`);
        }
      } else if (optimizedError) {
        console.log(`   ❌ Erro na função otimizada: ${optimizedError.message}`);
      }
    } catch (error) {
      console.log(`   ❌ Erro na função otimizada: ${error.message}`);
    }

    // Teste do cache - segunda execução da mesma query
    try {
      console.log(`   🔄 Testando cache com segunda execução...`);
      
      const startCache = performance.now();
      
      const { data: cacheResults, error: cacheError } = await supabase.rpc('match_hierarchical_documents_optimized', {
        query_embedding: embedding,
        match_count: 10,
        document_ids: null,
        query_text: query.text,
        enable_cache: true,
        performance_mode: 'balanced'
      });
      
      const endCache = performance.now();
      const cacheTime = endCache - startCache;
      
      if (!cacheError && cacheResults?.length > 0) {
        const perfMetrics = cacheResults[0].performance_metrics;
        const cacheHit = perfMetrics?.cache_hit || false;
        
        console.log(`   💾 Cache test: ${cacheTime.toFixed(2)}ms, Cache: ${cacheHit ? 'HIT' : 'MISS'}`);
        
        if (cacheHit) {
          results.cache_performance.hits++;
          results.cache_performance.total_time_saved += Math.max(0, optimizedTime - cacheTime);
        }
      }
    } catch (error) {
      console.log(`   ⚠️  Erro no teste de cache: ${error.message}`);
    }

    console.log(''); // Linha em branco para separar queries
  }

  return results;
}

/**
 * Testa batching de múltiplas queries
 */
async function testBatchPerformance() {
  console.log('📦 Testando performance do batching...\n');
  
  const embeddings = testQueries.map(() => generateMockEmbedding());
  const queryTexts = testQueries.map(q => q.text);
  
  try {
    const startBatch = performance.now();
    
    const { data: batchResults, error: batchError } = await supabase.rpc('match_hierarchical_documents_batch', {
      query_embeddings: embeddings,
      query_texts: queryTexts,
      match_count: 10,
      document_ids: null,
      enable_cache: true,
      performance_mode: 'balanced'
    });
    
    const endBatch = performance.now();
    const batchTime = endBatch - startBatch;
    
    if (!batchError) {
      console.log(`⚡ Batch processing: ${batchTime.toFixed(2)}ms para ${testQueries.length} queries`);
      console.log(`📊 Média por query: ${(batchTime / testQueries.length).toFixed(2)}ms`);
      console.log(`📈 Total de resultados: ${batchResults?.length || 0}`);
      
      // Agrupar resultados por query
      const resultsByQuery = {};
      batchResults?.forEach(result => {
        const queryIndex = result.query_index;
        if (!resultsByQuery[queryIndex]) {
          resultsByQuery[queryIndex] = [];
        }
        resultsByQuery[queryIndex].push(result);
      });
      
      Object.keys(resultsByQuery).forEach(queryIndex => {
        const queryResults = resultsByQuery[queryIndex];
        const queryType = testQueries[parseInt(queryIndex) - 1]?.type || 'unknown';
        console.log(`   Query ${queryIndex} (${queryType}): ${queryResults.length} resultados`);
      });
      
    } else {
      console.log(`❌ Erro no batch processing: ${batchError.message}`);
    }
  } catch (error) {
    console.log(`❌ Erro no teste de batch: ${error.message}`);
  }
}

/**
 * Testa diferentes modos de performance
 */
async function testPerformanceModes() {
  console.log('🎚️ Testando modos de performance...\n');
  
  const modes = ['speed', 'balanced', 'quality'];
  const testQuery = testQueries[0]; // Usar primeira query para teste
  const embedding = generateMockEmbedding();
  
  for (const mode of modes) {
    console.log(`🔧 Testando modo: ${mode}`);
    
    try {
      const start = performance.now();
      
      const { data: results, error } = await supabase.rpc('match_hierarchical_documents_optimized', {
        query_embedding: embedding,
        match_count: 10,
        document_ids: null,
        query_text: testQuery.text,
        enable_cache: false, // Desabilitar cache para teste puro
        performance_mode: mode
      });
      
      const end = performance.now();
      const time = end - start;
      
      if (!error && results?.length > 0) {
        const perfMetrics = results[0].performance_metrics;
        
        console.log(`   ⏱️  Tempo: ${time.toFixed(2)}ms`);
        console.log(`   📊 Candidatos: ${perfMetrics?.total_candidates || 0}`);
        console.log(`   🎯 Resultados filtrados: ${perfMetrics?.filtered_results || 0}`);
        console.log(`   🏆 Threshold de qualidade: ${perfMetrics?.quality_threshold || 'N/A'}`);
        
        // Analisar scores
        const avgScore = results.reduce((sum, r) => sum + (r.similarity || 0), 0) / results.length;
        const avgBoostedScore = results.reduce((sum, r) => sum + (r.boosted_score || 0), 0) / results.length;
        const boostedCount = results.filter(r => r.boosted_score > r.similarity).length;
        
        console.log(`   📈 Score médio: ${avgScore.toFixed(3)} → ${avgBoostedScore.toFixed(3)}`);
        console.log(`   🎯 Resultados com boost: ${boostedCount}/${results.length}`);
        
      } else if (error) {
        console.log(`   ❌ Erro: ${error.message}`);
      }
    } catch (error) {
      console.log(`   ❌ Exceção: ${error.message}`);
    }
    
    console.log('');
  }
}

/**
 * Monitora estatísticas de cache
 */
async function checkCacheStatistics() {
  console.log('📊 Verificando estatísticas de cache...\n');
  
  try {
    const { data: cacheStats, error: cacheError } = await supabase
      .from('hierarchical_cache_status')
      .select('*');
    
    if (!cacheError && cacheStats?.length > 0) {
      const stats = cacheStats[0];
      console.log('💾 Estatísticas do Cache:');
      console.log(`   📦 Total de entradas: ${stats.total_entries}`);
      console.log(`   🔄 Entradas reutilizadas: ${stats.reused_entries}`);
      console.log(`   📊 Média de acessos: ${parseFloat(stats.avg_access_count).toFixed(2)}`);
      console.log(`   🆕 Entradas recentes (1h): ${stats.recent_entries}`);
      console.log(`   ⚡ Entradas ativas (10min): ${stats.active_entries}`);
      console.log(`   💽 Tamanho da tabela: ${stats.table_size}`);
    } else {
      console.log('⚠️  View de estatísticas de cache não disponível');
    }
  } catch (error) {
    console.log(`⚠️  Erro ao verificar cache: ${error.message}`);
  }
  
  try {
    const { data: perfStats, error: perfError } = await supabase
      .from('hierarchical_search_performance')
      .select('*')
      .order('hour_bucket', { ascending: false })
      .limit(5);
    
    if (!perfError && perfStats?.length > 0) {
      console.log('\n⚡ Performance Recent History:');
      perfStats.forEach(stat => {
        console.log(`   ${stat.hour_bucket}: ${stat.operation_type} (${stat.performance_mode})`);
        console.log(`     Ops: ${stat.total_operations}, Avg: ${parseFloat(stat.avg_time_ms).toFixed(2)}ms`);
        console.log(`     Cache Hit Rate: ${stat.cache_hit_rate_percent}%`);
      });
    }
  } catch (error) {
    console.log(`⚠️  Erro ao verificar performance: ${error.message}`);
  }
}

/**
 * Executa todos os testes
 */
async function runAllTests() {
  console.log('🧪 TESTE DE PERFORMANCE - OTIMIZAÇÕES HIERARCHICAL SEARCH');
  console.log('================================================================\n');
  
  try {
    // 1. Teste de comparação de performance
    const performanceResults = await testPerformanceComparison();
    
    // 2. Teste de batching
    await testBatchPerformance();
    
    // 3. Teste de modos de performance
    await testPerformanceModes();
    
    // 4. Estatísticas de cache
    await checkCacheStatistics();
    
    // 5. Resumo dos resultados
    console.log('\n📋 RESUMO DOS RESULTADOS');
    console.log('========================\n');
    
    if (performanceResults.optimized.length > 0) {
      const avgOptimizedTime = performanceResults.optimized.reduce((sum, r) => sum + r.time_ms, 0) / performanceResults.optimized.length;
      const avgQueryTime = performanceResults.optimized.reduce((sum, r) => sum + (r.query_time_ms || r.time_ms), 0) / performanceResults.optimized.length;
      const totalCandidates = performanceResults.optimized.reduce((sum, r) => sum + r.total_candidates, 0);
      const avgCandidates = totalCandidates / performanceResults.optimized.length;
      
      console.log(`⚡ Performance Otimizada:`);
      console.log(`   Tempo médio total: ${avgOptimizedTime.toFixed(2)}ms`);
      console.log(`   Tempo médio de query: ${avgQueryTime.toFixed(2)}ms`);
      console.log(`   Candidatos médios processados: ${avgCandidates.toFixed(0)}`);
      
      if (performanceResults.original.length > 0) {
        const avgOriginalTime = performanceResults.original.reduce((sum, r) => sum + r.time_ms, 0) / performanceResults.original.length;
        const improvement = ((avgOriginalTime - avgOptimizedTime) / avgOriginalTime) * 100;
        console.log(`   Melhoria vs original: ${improvement.toFixed(1)}%`);
      }
    }
    
    const cachePerf = performanceResults.cache_performance;
    const totalCacheOps = cachePerf.hits + cachePerf.misses;
    if (totalCacheOps > 0) {
      const hitRate = (cachePerf.hits / totalCacheOps) * 100;
      console.log(`\n💾 Performance do Cache:`);
      console.log(`   Hit Rate: ${hitRate.toFixed(1)}% (${cachePerf.hits}/${totalCacheOps})`);
      console.log(`   Tempo total economizado: ${cachePerf.total_time_saved.toFixed(2)}ms`);
    }
    
    console.log('\n✅ Testes concluídos com sucesso!');
    
  } catch (error) {
    console.error('❌ Erro durante os testes:', error);
    process.exit(1);
  }
}

// Executar testes se chamado diretamente
if (import.meta.url === `file://${process.argv[1]}`) {
  runAllTests()
    .then(() => process.exit(0))
    .catch(error => {
      console.error('❌ Erro fatal:', error);
      process.exit(1);
    });
}

export {
  testPerformanceComparison,
  testBatchPerformance,
  testPerformanceModes,
  checkCacheStatistics,
  runAllTests
};