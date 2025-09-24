#!/usr/bin/env node
/**
 * FASE 4 - TESTE DE PERFORMANCE DEDICADO AGENTIC-RAG V3
 * 
 * Executa testes de performance rigorosos:
 * - 100 requests paralelos
 * - Medição de P50, P90, P95, P99
 * - Análise de throughput
 * - Identificação de gargalos
 * - Validação da meta <3s P50
 */

import { createClient } from '@supabase/supabase-js';
import { readFileSync } from 'fs';

// Load environment variables
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
  process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseKey);

// CENÁRIOS DE TESTE DE PERFORMANCE
const PERFORMANCE_SCENARIOS = [
  {
    name: "Artigo Simples (Cache Cold)",
    query: "Art. 119 LUOS",
    expectedTime: 2000,
    weight: 3 // Queries mais comuns têm peso maior
  },
  {
    name: "Artigo com Contexto",
    query: "Art. 77 LUOS contexto",
    expectedTime: 2500,
    weight: 2
  },
  {
    name: "ZOT Centro",
    query: "ZOT 8 Centro altura",
    expectedTime: 1500,
    weight: 3
  },
  {
    name: "Múltiplos Artigos",
    query: "artigos 75 a 77 LUOS",
    expectedTime: 3000,
    weight: 2
  },
  {
    name: "Query Complexa",
    query: "disposições transitórias altura máxima Centro ZOT",
    expectedTime: 3500,
    weight: 1
  },
  {
    name: "Fallback Strategy",
    query: "artigo inexistente 999",
    expectedTime: 4000,
    weight: 1
  }
];

class PerformanceProfiler {
  constructor() {
    this.results = [];
    this.errors = [];
  }
  
  async measureSingle(scenario, iteration = 0) {
    const startTime = performance.now();
    const startMemory = process.memoryUsage();
    
    try {
      const { data, error } = await supabase.functions.invoke('agentic-rag-v3', {
        body: {
          query: scenario.query,
          sessionId: `perf-test-${iteration}-${Date.now()}`,
          bypassCache: iteration === 0 // First request bypasses cache
        }
      });
      
      const endTime = performance.now();
      const endMemory = process.memoryUsage();
      const duration = endTime - startTime;
      
      if (error) {
        this.errors.push({
          scenario: scenario.name,
          error: error.message,
          iteration,
          duration
        });
        return { success: false, duration, error: error.message };
      }
      
      const result = {
        scenario: scenario.name,
        iteration,
        duration,
        success: true,
        confidence: data.confidence || 0,
        qualityScore: data.quality_score || 0,
        sources: data.sources || 0,
        memoryDelta: {
          rss: endMemory.rss - startMemory.rss,
          heapUsed: endMemory.heapUsed - startMemory.heapUsed,
          heapTotal: endMemory.heapTotal - startMemory.heapTotal
        },
        cacheHit: iteration > 0 && data.performance_target?.includes('cache')
      };
      
      this.results.push(result);
      return result;
      
    } catch (err) {
      const duration = performance.now() - startTime;
      this.errors.push({
        scenario: scenario.name,
        error: err.message,
        iteration,
        duration
      });
      return { success: false, duration, error: err.message };
    }
  }
  
  async measureScenario(scenario, iterations = 10) {
    console.log(`\n🔬 Testando: ${scenario.name}`);
    console.log(`   Query: "${scenario.query}"`);
    console.log(`   Iterações: ${iterations}`);
    
    const scenarioResults = [];
    
    for (let i = 0; i < iterations; i++) {
      const result = await this.measureSingle(scenario, i);
      scenarioResults.push(result);
      
      if (result.success) {
        const status = result.duration <= scenario.expectedTime ? '✅' : '⚠️';
        console.log(`   ${i + 1}. ${status} ${result.duration.toFixed(0)}ms (confidence: ${result.confidence.toFixed(2)})`);
      } else {
        console.log(`   ${i + 1}. ❌ ${result.duration.toFixed(0)}ms - Error: ${result.error}`);
      }
      
      // Small delay to avoid overwhelming
      if (i < iterations - 1) {
        await new Promise(resolve => setTimeout(resolve, 100));
      }
    }
    
    return scenarioResults;
  }
  
  calculateStatistics(results) {
    const durations = results
      .filter(r => r.success)
      .map(r => r.duration)
      .sort((a, b) => a - b);
    
    if (durations.length === 0) {
      return {
        p50: 0, p90: 0, p95: 0, p99: 0,
        avg: 0, min: 0, max: 0,
        successRate: 0
      };
    }
    
    const getPercentile = (arr, p) => {
      const index = Math.ceil(arr.length * p) - 1;
      return arr[Math.max(0, index)];
    };
    
    return {
      p50: getPercentile(durations, 0.5),
      p90: getPercentile(durations, 0.9),
      p95: getPercentile(durations, 0.95),
      p99: getPercentile(durations, 0.99),
      avg: durations.reduce((sum, d) => sum + d, 0) / durations.length,
      min: durations[0],
      max: durations[durations.length - 1],
      successRate: (results.filter(r => r.success).length / results.length) * 100
    };
  }
}

async function runParallelStressTest(profiler, scenario, concurrency = 20) {
  console.log(`\n🚀 TESTE PARALELO: ${scenario.name}`);
  console.log(`   Concorrência: ${concurrency} requests simultâneos`);
  
  const startTime = performance.now();
  const promises = [];
  
  for (let i = 0; i < concurrency; i++) {
    promises.push(
      supabase.functions.invoke('agentic-rag-v3', {
        body: {
          query: scenario.query,
          sessionId: `stress-test-${i}`,
          bypassCache: false
        }
      }).then(result => ({
        success: !result.error,
        duration: result.data?.processing_time || (performance.now() - startTime),
        confidence: result.data?.confidence || 0,
        error: result.error?.message
      })).catch(err => ({
        success: false,
        duration: performance.now() - startTime,
        error: err.message
      }))
    );
  }
  
  const results = await Promise.all(promises);
  const totalTime = performance.now() - startTime;
  
  const successful = results.filter(r => r.success);
  const failed = results.filter(r => !r.success);
  
  console.log(`\n   📊 Resultados:`);
  console.log(`      ✅ Sucessos: ${successful.length}/${concurrency}`);
  console.log(`      ❌ Falhas: ${failed.length}/${concurrency}`);
  console.log(`      ⏱️  Tempo total: ${totalTime.toFixed(0)}ms`);
  console.log(`      📈 Throughput: ${(concurrency / (totalTime / 1000)).toFixed(1)} req/s`);
  
  if (successful.length > 0) {
    const stats = profiler.calculateStatistics(successful.map(r => ({ success: true, duration: r.duration })));
    console.log(`      📊 P50/P95: ${stats.p50.toFixed(0)}ms / ${stats.p95.toFixed(0)}ms`);
  }
  
  if (failed.length > 0) {
    const errorCounts = {};
    failed.forEach(f => {
      errorCounts[f.error] = (errorCounts[f.error] || 0) + 1;
    });
    console.log(`      🚨 Erros:`);
    Object.entries(errorCounts).forEach(([error, count]) => {
      console.log(`         - ${error}: ${count}x`);
    });
  }
  
  return {
    scenario: scenario.name,
    concurrency,
    totalTime,
    throughput: concurrency / (totalTime / 1000),
    successRate: (successful.length / concurrency) * 100,
    results: successful
  };
}

async function runPerformanceTest() {
  console.log('⚡ FASE 4 - TESTE DE PERFORMANCE AGENTIC-RAG V3');
  console.log('='.repeat(60));
  console.log(`🎯 Meta: P50 < 3000ms, P95 < 5000ms`);
  console.log(`📊 Cenários: ${PERFORMANCE_SCENARIOS.length}`);
  console.log(`🔬 Iterações por cenário: 10`);
  
  const profiler = new PerformanceProfiler();
  const scenarioResults = {};
  
  // 1. TESTES SEQUENCIAIS DETALHADOS
  console.log('\n📈 FASE 1: TESTES SEQUENCIAIS DETALHADOS');
  console.log('='.repeat(50));
  
  for (const scenario of PERFORMANCE_SCENARIOS) {
    const results = await profiler.measureScenario(scenario, 10);
    scenarioResults[scenario.name] = results;
    
    const stats = profiler.calculateStatistics(results);
    const compliance = {
      p50: stats.p50 <= scenario.expectedTime,
      p95: stats.p95 <= (scenario.expectedTime * 1.5)
    };
    
    console.log(`\n   📊 Estatísticas:`);
    console.log(`      P50: ${stats.p50.toFixed(0)}ms ${compliance.p50 ? '✅' : '❌'}`);
    console.log(`      P95: ${stats.p95.toFixed(0)}ms ${compliance.p95 ? '✅' : '❌'}`);
    console.log(`      Média: ${stats.avg.toFixed(0)}ms`);
    console.log(`      Min/Max: ${stats.min.toFixed(0)}ms / ${stats.max.toFixed(0)}ms`);
    console.log(`      Taxa de sucesso: ${stats.successRate.toFixed(1)}%`);
  }
  
  // 2. TESTES DE STRESS PARALELO
  console.log('\n\n🚀 FASE 2: TESTES DE STRESS PARALELO');
  console.log('='.repeat(50));
  
  const stressResults = [];
  
  // Teste com query mais comum
  const commonScenario = PERFORMANCE_SCENARIOS.find(s => s.weight === 3) || PERFORMANCE_SCENARIOS[0];
  const stressResult = await runParallelStressTest(profiler, commonScenario, 50);
  stressResults.push(stressResult);
  
  // Teste com query complexa
  const complexScenario = PERFORMANCE_SCENARIOS.find(s => s.name.includes('Complexa')) || PERFORMANCE_SCENARIOS[4];
  const complexStressResult = await runParallelStressTest(profiler, complexScenario, 20);
  stressResults.push(complexStressResult);
  
  // 3. RELATÓRIO FINAL DE PERFORMANCE
  generatePerformanceReport(profiler, scenarioResults, stressResults);
}

function generatePerformanceReport(profiler, scenarioResults, stressResults) {
  console.log('\n' + '='.repeat(60));
  console.log('📈 RELATÓRIO FINAL DE PERFORMANCE');
  console.log('='.repeat(60));
  
  // 1. ESTATÍSTICAS GERAIS
  const allResults = profiler.results;
  const overallStats = profiler.calculateStatistics(allResults);
  
  console.log('\n🎯 ESTATÍSTICAS GERAIS:');
  console.log('-'.repeat(30));
  console.log(`Total de testes: ${allResults.length}`);
  console.log(`Taxa de sucesso: ${overallStats.successRate.toFixed(1)}%`);
  console.log(`P50: ${overallStats.p50.toFixed(0)}ms`);
  console.log(`P90: ${overallStats.p90.toFixed(0)}ms`);
  console.log(`P95: ${overallStats.p95.toFixed(0)}ms`);
  console.log(`P99: ${overallStats.p99.toFixed(0)}ms`);
  console.log(`Média: ${overallStats.avg.toFixed(0)}ms`);
  console.log(`Min/Max: ${overallStats.min.toFixed(0)}ms / ${overallStats.max.toFixed(0)}ms`);
  
  // 2. COMPLIANCE COM METAS
  console.log('\n🎯 COMPLIANCE COM METAS:');
  console.log('-'.repeat(30));
  const targetCompliance = {
    p50_under_3s: overallStats.p50 < 3000,
    p95_under_5s: overallStats.p95 < 5000,
    success_rate_95: overallStats.successRate >= 95,
    avg_under_3s: overallStats.avg < 3000
  };
  
  console.log(`P50 < 3000ms: ${targetCompliance.p50_under_3s ? '✅' : '❌'} (${overallStats.p50.toFixed(0)}ms)`);
  console.log(`P95 < 5000ms: ${targetCompliance.p95_under_5s ? '✅' : '❌'} (${overallStats.p95.toFixed(0)}ms)`);
  console.log(`Taxa sucesso >= 95%: ${targetCompliance.success_rate_95 ? '✅' : '❌'} (${overallStats.successRate.toFixed(1)}%)`);
  console.log(`Média < 3000ms: ${targetCompliance.avg_under_3s ? '✅' : '❌'} (${overallStats.avg.toFixed(0)}ms)`);
  
  // 3. DESEMPENHO POR CENÁRIO
  console.log('\n📊 DESEMPENHO POR CENÁRIO:');
  console.log('-'.repeat(30));
  
  for (const [scenarioName, results] of Object.entries(scenarioResults)) {
    const stats = profiler.calculateStatistics(results);
    const scenario = PERFORMANCE_SCENARIOS.find(s => s.name === scenarioName);
    const compliance = stats.p50 <= scenario.expectedTime;
    
    console.log(`${scenarioName}:`);
    console.log(`   P50: ${stats.p50.toFixed(0)}ms ${compliance ? '✅' : '❌'} (meta: ${scenario.expectedTime}ms)`);
    console.log(`   Sucesso: ${stats.successRate.toFixed(1)}%`);
  }
  
  // 4. RESULTADOS DE STRESS
  console.log('\n🚀 RESULTADOS DE STRESS:');
  console.log('-'.repeat(30));
  
  stressResults.forEach(result => {
    console.log(`${result.scenario}:`);
    console.log(`   Concorrência: ${result.concurrency} requests`);
    console.log(`   Throughput: ${result.throughput.toFixed(1)} req/s`);
    console.log(`   Taxa de sucesso: ${result.successRate.toFixed(1)}%`);
    console.log(`   Tempo total: ${result.totalTime.toFixed(0)}ms`);
  });
  
  // 5. ANÁLISE DE GARGALOS
  console.log('\n🔍 ANÁLISE DE GARGALOS:');
  console.log('-'.repeat(30));
  
  const slowScenarios = Object.entries(scenarioResults)
    .map(([name, results]) => ({
      name,
      p95: profiler.calculateStatistics(results).p95
    }))
    .filter(s => s.p95 > 5000)
    .sort((a, b) => b.p95 - a.p95);
  
  if (slowScenarios.length > 0) {
    console.log('Cenários mais lentos (P95 > 5s):');
    slowScenarios.forEach(scenario => {
      console.log(`   - ${scenario.name}: ${scenario.p95.toFixed(0)}ms`);
    });
  } else {
    console.log('✅ Todos os cenários dentro do limite P95 < 5s');
  }
  
  // 6. ERROS ENCONTRADOS
  if (profiler.errors.length > 0) {
    console.log('\n🚨 ERROS ENCONTRADOS:');
    console.log('-'.repeat(30));
    
    const errorCounts = {};
    profiler.errors.forEach(error => {
      const key = `${error.scenario}: ${error.error}`;
      errorCounts[key] = (errorCounts[key] || 0) + 1;
    });
    
    Object.entries(errorCounts).forEach(([error, count]) => {
      console.log(`   - ${error}: ${count}x`);
    });
  }
  
  // 7. RECOMENDAÇÕES
  console.log('\n💡 RECOMENDAÇÕES:');
  console.log('-'.repeat(30));
  
  if (!targetCompliance.p50_under_3s) {
    console.log('🐌 P50 muito alto - considere:');
    console.log('   - Implementar cache mais agressivo');
    console.log('   - Paralelizar execução de tools');
    console.log('   - Otimizar queries de banco');
  }
  
  if (!targetCompliance.p95_under_5s) {
    console.log('⚠️  P95 muito alto - considere:');
    console.log('   - Implementar timeout de queries');
    console.log('   - Fallback strategies mais rápidos');
    console.log('   - Connection pooling');
  }
  
  if (overallStats.successRate < 95) {
    console.log('❌ Taxa de sucesso baixa - verifique:');
    console.log('   - Estabilidade da conexão com banco');
    console.log('   - Rate limits das APIs');
    console.log('   - Tratamento de erros');
  }
  
  const overallCompliance = Object.values(targetCompliance).filter(Boolean).length;
  const totalTargets = Object.keys(targetCompliance).length;
  
  console.log('\n🏆 STATUS FINAL:');
  console.log('-'.repeat(30));
  console.log(`Metas atingidas: ${overallCompliance}/${totalTargets}`);
  
  if (overallCompliance === totalTargets) {
    console.log('🎉 PERFORMANCE APROVADA - SISTEMA PRONTO PARA PRODUÇÃO!');
  } else if (overallCompliance >= totalTargets * 0.75) {
    console.log('⚠️  PERFORMANCE ACEITÁVEL - PEQUENOS AJUSTES NECESSÁRIOS');
  } else {
    console.log('❌ PERFORMANCE INSUFICIENTE - OTIMIZAÇÕES CRÍTICAS NECESSÁRIAS');
  }
  
  console.log('\n' + '='.repeat(60));
}

// EXECUTAR TESTE
runPerformanceTest().catch(console.error);
