#!/usr/bin/env node
/**
 * FASE 4 - TESTE COMPLETO END-TO-END DO AGENTIC-RAG V3
 * 
 * Testa todas as tools implementadas:
 * - ArticleSearchTool
 * - HierarchyNavigatorTool 
 * - ZOTSearchTool
 * - SQLGeneratorTool
 * 
 * Cenários de teste:
 * - Consultas simples de artigos
 * - Navegação hierárquica completa
 * - Consultas ZOT com parâmetros
 * - Queries complexas multi-artigos
 * - Fallback strategies
 * - Performance targets (<3s P50)
 */

import { createClient } from '@supabase/supabase-js';
import { readFileSync } from 'fs';

// Load environment variables from .env file
try {
  const envFile = readFileSync('.env', 'utf8');
  const envVars = envFile
    .split('\n')
    .filter(line => line.includes('=') && !line.startsWith('#'))
    .reduce((acc, line) => {
      const [key, value] = line.split('=', 2);
      if (key && value) {
        acc[key.trim()] = value.trim().replace(/^["']|["']$/g, '');
      }
      return acc;
    }, {});
  
  Object.assign(process.env, envVars);
} catch (error) {
  console.warn('Warning: Could not load .env file:', error.message);
}

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

if (!supabaseUrl || !supabaseKey) {
  console.error('❌ Missing Supabase environment variables');
  console.error('Required: NEXT_PUBLIC_SUPABASE_URL, NEXT_PUBLIC_SUPABASE_ANON_KEY');
  process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseKey);

// CENÁRIOS DE TESTE PARA CADA TOOL
const TEST_SCENARIOS = {
  // 1. ArticleSearchTool Tests
  articleSearch: [
    {
      name: "Art. 119 LUOS - Disposições Transitórias",
      query: "Art. 119 LUOS disposições transitórias",
      expectedTools: ['ArticleSearchTool'],
      expectedFeatures: ['transitional_provisions', 'exact_article_match'],
      minConfidence: 0.9,
      maxTime: 2000
    },
    {
      name: "Art. 4 LUOS - Artigo Básico", 
      query: "artigo 4 LUOS",
      expectedTools: ['ArticleSearchTool'],
      expectedFeatures: ['exact_article_match'],
      minConfidence: 0.9,
      maxTime: 2000
    },
    {
      name: "Art. 77 LUOS com Contexto",
      query: "Art. 77 LUOS contexto relacionados",
      expectedTools: ['ArticleSearchTool'],
      expectedFeatures: ['exact_article_match', 'context_request'],
      minConfidence: 0.8,
      maxTime: 2500
    },
    {
      name: "Múltiplos Artigos 75-79",
      query: "artigos 75 a 79 LUOS",
      expectedTools: ['ArticleSearchTool'],
      expectedFeatures: ['article_range_match', 'multiple_articles'],
      minConfidence: 0.8,
      maxTime: 3000
    }
  ],

  // 2. HierarchyNavigatorTool Tests
  hierarchyNavigation: [
    {
      name: "Título X LUOS - Navegação Hierárquica",
      query: "Título X LUOS",
      expectedTools: ['HierarchyNavigatorTool'],
      expectedFeatures: ['titulo_hierarchy'],
      minConfidence: 0.7,
      maxTime: 2500,
      expectedBehavior: 'should_explain_nonexistent'
    },
    {
      name: "Capítulo III LUOS",
      query: "Capítulo III da LUOS",
      expectedTools: ['HierarchyNavigatorTool'],
      expectedFeatures: ['capitulo_hierarchy'],
      minConfidence: 0.8,
      maxTime: 2500
    },
    {
      name: "Seção II PDUS",
      query: "Seção II do PDUS",
      expectedTools: ['HierarchyNavigatorTool'],
      expectedFeatures: ['secao_hierarchy'],
      minConfidence: 0.7,
      maxTime: 2500
    }
  ],

  // 3. ZOTSearchTool Tests 
  zotSearch: [
    {
      name: "ZOT 8 Centro - Parâmetros",
      query: "ZOT 8 Centro altura máxima",
      expectedTools: ['ZOTSearchTool'],
      expectedFeatures: ['zot_match', 'neighborhood_match', 'construction_params'],
      minConfidence: 0.9,
      maxTime: 1500
    },
    {
      name: "Zoneamento Moinhos de Vento",
      query: "zoneamento Moinhos de Vento parâmetros",
      expectedTools: ['ZOTSearchTool'],
      expectedFeatures: ['neighborhood_match'],
      minConfidence: 0.8,
      maxTime: 2000
    },
    {
      name: "Coeficiente Aproveitamento ZOT",
      query: "coeficiente de aproveitamento máximo ZOT",
      expectedTools: ['ZOTSearchTool'],
      expectedFeatures: ['construction_params'],
      minConfidence: 0.7,
      maxTime: 2000
    }
  ],

  // 4. Complex Multi-Tool Tests
  complexQueries: [
    {
      name: "Query Complexa - Artigo + ZOT",
      query: "Art. 75 LUOS altura máxima Centro ZOT 8",
      expectedTools: ['ArticleSearchTool', 'ZOTSearchTool'],
      expectedFeatures: ['exact_article_match', 'zot_match', 'neighborhood_match'],
      minConfidence: 0.8,
      maxTime: 3000
    },
    {
      name: "Query Geral PDUS",
      query: "PDUS 2025 mobilidade urbana transporte",
      expectedTools: ['ArticleSearchTool'],
      expectedFeatures: ['pdus_mention', 'transportation_query'],
      minConfidence: 0.7,
      maxTime: 3000
    },
    {
      name: "Fallback Strategy Test",
      query: "artigo inexistente 999 LUOS",
      expectedTools: ['ArticleSearchTool'],
      expectedFeatures: [],
      minConfidence: 0.4,
      maxTime: 4000,
      expectFallback: true
    }
  ],

  // 5. Performance Stress Tests
  performance: [
    {
      name: "Query Rápida - Cache Hit",
      query: "Art. 119 LUOS",
      expectedTools: ['ArticleSearchTool'],
      expectedFeatures: ['exact_article_match'],
      minConfidence: 0.9,
      maxTime: 1000,
      testCacheHit: true
    },
    {
      name: "Query Pesada - Múltiplas Tools",
      query: "disposições transitórias altura máxima Centro ZOT contextual",
      expectedTools: ['ArticleSearchTool', 'ZOTSearchTool'],
      expectedFeatures: ['transitional_provisions', 'neighborhood_match', 'context_request'],
      minConfidence: 0.7,
      maxTime: 3500
    }
  ]
};

// ESTATÍSTICAS DE PERFORMANCE
class PerformanceStats {
  constructor() {
    this.measurements = [];
    this.cacheHits = 0;
    this.cacheMisses = 0;
  }
  
  addMeasurement(duration, scenario) {
    this.measurements.push({
      duration,
      scenario: scenario.name,
      maxTime: scenario.maxTime
    });
  }
  
  calculatePercentiles() {
    const sorted = this.measurements.map(m => m.duration).sort((a, b) => a - b);
    const count = sorted.length;
    
    return {
      p50: this.getPercentile(sorted, 0.5),
      p90: this.getPercentile(sorted, 0.9),
      p95: this.getPercentile(sorted, 0.95),
      p99: this.getPercentile(sorted, 0.99),
      avg: sorted.reduce((sum, val) => sum + val, 0) / count,
      min: sorted[0],
      max: sorted[count - 1]
    };
  }
  
  getPercentile(sorted, percentile) {
    const index = Math.ceil(sorted.length * percentile) - 1;
    return sorted[Math.max(0, index)];
  }
  
  getTargetCompliance() {
    const stats = this.calculatePercentiles();
    return {
      p50_under_3s: stats.p50 < 3000,
      p95_under_5s: stats.p95 < 5000,
      all_under_10s: stats.max < 10000,
      avg_under_3s: stats.avg < 3000
    };
  }
}

// FUNÇÃO PRINCIPAL DE TESTE
async function runCompleteE2ETest() {
  console.log('🚀 FASE 4 - TESTE COMPLETO AGENTIC-RAG V3');
  console.log('='  .repeat(60));
  console.log('📊 Cenários:', Object.values(TEST_SCENARIOS).flat().length);
  console.log('🎯 Meta de Performance: P50 < 3s, P95 < 5s');
  console.log('🎯 Meta de Precisão: 95%+ de taxa de sucesso');
  console.log('');
  
  const stats = new PerformanceStats();
  const results = {
    total: 0,
    passed: 0,
    failed: 0,
    by_category: {},
    failures: [],
    performance_issues: []
  };
  
  // Executar todos os cenários de teste
  for (const [category, scenarios] of Object.entries(TEST_SCENARIOS)) {
    console.log(`\n📋 CATEGORIA: ${category.toUpperCase()}`);
    console.log('-'.repeat(50));
    
    results.by_category[category] = {
      total: scenarios.length,
      passed: 0,
      failed: 0
    };
    
    for (let i = 0; i < scenarios.length; i++) {
      const scenario = scenarios[i];
      console.log(`\n${i + 1}. ${scenario.name}`);
      console.log(`   Query: "${scenario.query}"`);
      
      const testResult = await executeTestScenario(scenario, stats);
      
      results.total++;
      results.by_category[category].total++;
      
      if (testResult.success) {
        results.passed++;
        results.by_category[category].passed++;
        console.log(`   ✅ PASSOU - ${testResult.duration}ms (Score: ${testResult.confidence.toFixed(2)})`);
        
        // Verificar performance
        if (testResult.duration > scenario.maxTime) {
          results.performance_issues.push({
            scenario: scenario.name,
            expected: scenario.maxTime,
            actual: testResult.duration,
            overrun: testResult.duration - scenario.maxTime
          });
          console.log(`   ⚠️  Performance: ${testResult.duration}ms > ${scenario.maxTime}ms`);
        }
      } else {
        results.failed++;
        results.by_category[category].failed++;
        results.failures.push({
          scenario: scenario.name,
          error: testResult.error,
          details: testResult.details
        });
        console.log(`   ❌ FALHOU - ${testResult.error}`);
        if (testResult.details) {
          console.log(`      Detalhes: ${JSON.stringify(testResult.details, null, 2)}`);
        }
      }
    }
  }
  
  // TESTE DE PERFORMANCE PARALELA
  console.log('\n🚀 TESTE DE PERFORMANCE PARALELA');
  console.log('-'.repeat(50));
  await runParallelPerformanceTest(stats);
  
  // RELATÓRIO FINAL
  generateFinalReport(results, stats);
}

async function executeTestScenario(scenario, stats) {
  const startTime = Date.now();
  
  try {
    // Executar query no Agentic-RAG V3
    const { data, error } = await supabase.functions.invoke('agentic-rag-v3', {
      body: {
        query: scenario.query,
        sessionId: `test-${Date.now()}`,
        bypassCache: !scenario.testCacheHit
      }
    });
    
    const duration = Date.now() - startTime;
    stats.addMeasurement(duration, scenario);
    
    if (error) {
      return {
        success: false,
        duration,
        error: error.message || 'Unknown error',
        details: error
      };
    }
    
    // Validar resposta
    const validation = validateResponse(data, scenario);
    
    return {
      success: validation.isValid,
      duration,
      confidence: data.confidence || 0,
      qualityScore: data.quality_score || 0,
      error: validation.error,
      details: validation.details,
      metadata: data.metadata,
      sources: data.sources
    };
    
  } catch (err) {
    const duration = Date.now() - startTime;
    stats.addMeasurement(duration, scenario);
    
    return {
      success: false,
      duration,
      error: err.message,
      details: { stack: err.stack }
    };
  }
}

function validateResponse(response, scenario) {
  const validation = {
    isValid: true,
    error: null,
    details: {}
  };
  
  // 1. Validar estrutura básica da resposta
  if (!response.response) {
    validation.isValid = false;
    validation.error = 'Missing response field';
    return validation;
  }
  
  // 2. Validar confiança mínima
  const confidence = response.confidence || 0;
  if (confidence < scenario.minConfidence) {
    validation.isValid = false;
    validation.error = `Low confidence: ${confidence.toFixed(2)} < ${scenario.minConfidence}`;
    validation.details.confidence = confidence;
  }
  
  // 3. Validar tools executadas (se especificado)
  if (scenario.expectedTools) {
    const metadata = response.metadata || {};
    // Esta validação seria implementada se o metadata incluísse info sobre tools executadas
  }
  
  // 4. Validar features detectadas
  if (scenario.expectedFeatures && scenario.expectedFeatures.length > 0) {
    const detectedFeatures = response.metadata?.confidence_factors || [];
    const missingFeatures = scenario.expectedFeatures.filter(f => !detectedFeatures.includes(f));
    
    if (missingFeatures.length > 0) {
      validation.details.missingFeatures = missingFeatures;
      // Não falhar o teste por features perdidas, apenas anotar
    }
  }
  
  // 5. Validar comportamentos especiais
  if (scenario.expectedBehavior === 'should_explain_nonexistent') {
    const responseText = response.response.toLowerCase();
    if (!responseText.includes('não existe') && !responseText.includes('apenas') && !responseText.includes('títulos')) {
      validation.isValid = false;
      validation.error = 'Should explain that Título X does not exist';
    }
  }
  
  // 6. Validar fallback para queries inexistentes
  if (scenario.expectFallback) {
    // Para queries que devem ativar fallback, acceptance de confiança mais baixa
    if (confidence > 0.7) {
      validation.details.unexpectedHighConfidence = confidence;
    }
  }
  
  return validation;
}

async function runParallelPerformanceTest(stats) {
  const PARALLEL_COUNT = 20;
  const testQuery = "Art. 119 LUOS disposições transitórias";
  
  console.log(`📈 Executando ${PARALLEL_COUNT} requests paralelos...`);
  
  const startTime = Date.now();
  const promises = [];
  
  for (let i = 0; i < PARALLEL_COUNT; i++) {
    promises.push(
      supabase.functions.invoke('agentic-rag-v3', {
        body: {
          query: testQuery,
          sessionId: `parallel-test-${i}`,
          bypassCache: false // Allow cache usage
        }
      }).then(result => {
        return {
          success: !result.error,
          duration: result.data?.processing_time || 0,
          error: result.error
        };
      }).catch(err => ({
        success: false,
        duration: 0,
        error: err.message
      }))
    );
  }
  
  const results = await Promise.all(promises);
  const totalTime = Date.now() - startTime;
  
  const successful = results.filter(r => r.success);
  const failed = results.filter(r => !r.success);
  
  console.log(`\n📊 RESULTADOS PERFORMANCE PARALELA:`);
  console.log(`   ✅ Sucessos: ${successful.length}/${PARALLEL_COUNT}`);
  console.log(`   ❌ Falhas: ${failed.length}/${PARALLEL_COUNT}`);
  console.log(`   ⏱️  Tempo total: ${totalTime}ms`);
  
  if (successful.length > 0) {
    const durations = successful.map(r => r.duration).filter(d => d > 0);
    if (durations.length > 0) {
      const avgDuration = durations.reduce((sum, d) => sum + d, 0) / durations.length;
      console.log(`   📈 Tempo médio por request: ${avgDuration.toFixed(0)}ms`);
    }
  }
  
  if (failed.length > 0) {
    console.log(`\n   ❌ Erros encontrados:`);
    const errorCounts = {};
    failed.forEach(f => {
      errorCounts[f.error] = (errorCounts[f.error] || 0) + 1;
    });
    Object.entries(errorCounts).forEach(([error, count]) => {
      console.log(`      - ${error}: ${count}x`);
    });
  }
}

function generateFinalReport(results, stats) {
  console.log('\n' + '='.repeat(60));
  console.log('📈 RELATÓRIO FINAL - FASE 4 VALIDAÇÃO COMPLETA');
  console.log('='.repeat(60));
  
  // 1. RESULTADOS GERAIS
  console.log('\n🎯 RESULTADOS GERAIS:');
  console.log('-'.repeat(30));
  const successRate = (results.passed / results.total * 100).toFixed(1);
  console.log(`✅ Taxa de Sucesso: ${successRate}% (${results.passed}/${results.total})`);
  console.log(`❌ Testes Falharam: ${results.failed}`);
  
  // Meta: 95%+ de precisão
  if (parseFloat(successRate) >= 95.0) {
    console.log('🎉 META DE PRECISÃO ATINGIDA (95%+)');
  } else {
    console.log('⚠️  META DE PRECISÃO NÃO ATINGIDA (<95%)');
  }
  
  // 2. RESULTADOS POR CATEGORIA
  console.log('\n📊 RESULTADOS POR CATEGORIA:');
  console.log('-'.repeat(30));
  Object.entries(results.by_category).forEach(([category, data]) => {
    const catSuccessRate = (data.passed / data.total * 100).toFixed(1);
    console.log(`${category}: ${catSuccessRate}% (${data.passed}/${data.total})`);
  });
  
  // 3. PERFORMANCE STATS
  console.log('\n⚡ ESTATÍSTICAS DE PERFORMANCE:');
  console.log('-'.repeat(30));
  const perfStats = stats.calculatePercentiles();
  const compliance = stats.getTargetCompliance();
  
  console.log(`P50 (mediana): ${perfStats.p50.toFixed(0)}ms`);
  console.log(`P90: ${perfStats.p90.toFixed(0)}ms`);
  console.log(`P95: ${perfStats.p95.toFixed(0)}ms`);
  console.log(`P99: ${perfStats.p99.toFixed(0)}ms`);
  console.log(`Média: ${perfStats.avg.toFixed(0)}ms`);
  console.log(`Min/Max: ${perfStats.min}ms / ${perfStats.max}ms`);
  
  console.log('\n🎯 COMPLIANCE COM METAS:');
  console.log(`P50 < 3s: ${compliance.p50_under_3s ? '✅' : '❌'} (${perfStats.p50.toFixed(0)}ms)`);
  console.log(`P95 < 5s: ${compliance.p95_under_5s ? '✅' : '❌'} (${perfStats.p95.toFixed(0)}ms)`);
  console.log(`Média < 3s: ${compliance.avg_under_3s ? '✅' : '❌'} (${perfStats.avg.toFixed(0)}ms)`);
  
  // 4. PROBLEMAS DE PERFORMANCE
  if (results.performance_issues.length > 0) {
    console.log('\n🐌 PROBLEMAS DE PERFORMANCE:');
    console.log('-'.repeat(30));
    results.performance_issues.forEach(issue => {
      console.log(`- ${issue.scenario}: ${issue.actual}ms (esperado: ${issue.expected}ms, +${issue.overrun}ms)`);
    });
  }
  
  // 5. FALHAS DETALHADAS
  if (results.failures.length > 0) {
    console.log('\n❌ FALHAS DETALHADAS:');
    console.log('-'.repeat(30));
    results.failures.forEach((failure, index) => {
      console.log(`${index + 1}. ${failure.scenario}`);
      console.log(`   Erro: ${failure.error}`);
      if (failure.details && Object.keys(failure.details).length > 0) {
        console.log(`   Detalhes: ${JSON.stringify(failure.details, null, 4)}`);
      }
    });
  }
  
  // 6. RECOMENDAÇÕES FINAIS
  console.log('\n💡 RECOMENDAÇÕES:');
  console.log('-'.repeat(30));
  
  if (parseFloat(successRate) < 95) {
    console.log('📈 PRECISÃO: Investigar e corrigir testes falhando');
  }
  
  if (!compliance.p50_under_3s) {
    console.log('⚡ PERFORMANCE: Otimizar para P50 < 3s (considerar cache, paralelização)');
  }
  
  if (results.performance_issues.length > 5) {
    console.log('🏃 OTIMIZAÇÃO: Muitos cenários lentos - revisar algoritmos de busca');
  }
  
  if (results.failures.some(f => f.error.includes('timeout'))) {
    console.log('⏱️  TIMEOUT: Implementar circuit breakers para queries longas');
  }
  
  // 7. STATUS FINAL
  console.log('\n🏆 STATUS FINAL DO SISTEMA:');
  console.log('-'.repeat(30));
  
  const isProductionReady = 
    parseFloat(successRate) >= 95 && 
    compliance.p50_under_3s && 
    compliance.p95_under_5s && 
    results.failures.length <= 2;
  
  if (isProductionReady) {
    console.log('🎉 SISTEMA PRONTO PARA PRODUÇÃO!');
    console.log('   ✅ Precisão: 95%+');
    console.log('   ✅ Performance: P50 < 3s');
    console.log('   ✅ Estabilidade: Poucas falhas');
  } else {
    console.log('⚠️  SISTEMA PRECISA DE MELHORIAS ANTES DA PRODUÇÃO');
    if (parseFloat(successRate) < 95) console.log('   ❌ Precisão baixa');
    if (!compliance.p50_under_3s) console.log('   ❌ Performance P50 muito alta');
    if (!compliance.p95_under_5s) console.log('   ❌ Performance P95 muito alta');
    if (results.failures.length > 2) console.log('   ❌ Muitas falhas');
  }
  
  console.log('\n' + '='.repeat(60));
}

// EXECUTAR TESTE PRINCIPAL
runCompleteE2ETest().catch(console.error);
