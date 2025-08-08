#!/usr/bin/env node

/**
 * Script de Monitoramento Contínuo da Base de Conhecimento
 * Monitora a saúde do sistema e envia alertas quando necessário
 */

import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';
import chalk from 'chalk';

dotenv.config({ path: '.env.local' });

const SUPABASE_URL = process.env.SUPABASE_URL || 'https://ngrqwmvuhvjkeohesbxs.supabase.co';
const SUPABASE_SERVICE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!SUPABASE_SERVICE_KEY) {
  console.error('❌ SUPABASE_SERVICE_ROLE_KEY não configurada');
  process.exit(1);
}

const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_KEY);

// Configuração de thresholds
const THRESHOLDS = {
  regime_min: 387,           // Mínimo esperado de registros de regime
  sections_min: 1000,         // Mínimo esperado de document sections
  response_time_max: 5000,    // Máximo de tempo de resposta em ms
  error_rate_max: 0.1,        // Taxa máxima de erro (10%)
  cache_hit_rate_min: 0.3,    // Taxa mínima de cache hit (30%)
  embedding_null_max: 10      // Máximo de embeddings nulos permitidos
};

// Estado do monitoramento
const state = {
  checks: 0,
  alerts: [],
  lastCheck: null,
  metrics: {
    regime_count: 0,
    sections_count: 0,
    avg_response_time: 0,
    error_rate: 0,
    cache_hit_rate: 0,
    embedding_nulls: 0
  }
};

/**
 * Verificar contagens básicas
 */
async function checkCounts() {
  const checks = {
    regime: { table: 'regime_urbanistico', min: THRESHOLDS.regime_min },
    sections: { table: 'document_sections', min: THRESHOLDS.sections_min },
    cache: { table: 'query_cache', min: 0 },
    qa_cases: { table: 'qa_test_cases', min: 100 }
  };
  
  const results = {};
  
  for (const [name, config] of Object.entries(checks)) {
    const { count, error } = await supabase
      .from(config.table)
      .select('*', { count: 'exact', head: true });
    
    if (error) {
      results[name] = { count: 0, status: 'error', error: error.message };
    } else {
      results[name] = {
        count: count || 0,
        status: count >= config.min ? 'ok' : 'warning',
        threshold: config.min
      };
    }
  }
  
  return results;
}

/**
 * Verificar integridade dos dados
 */
async function checkDataIntegrity() {
  const issues = [];
  
  // 1. Verificar embeddings nulos
  const { data: nullEmbeddings } = await supabase
    .from('document_sections')
    .select('id', { count: 'exact' })
    .is('embedding', null)
    .limit(1);
  
  if (nullEmbeddings && nullEmbeddings.length > 0) {
    issues.push({
      type: 'null_embeddings',
      severity: 'warning',
      message: `Encontrados document sections sem embeddings`
    });
  }
  
  // 2. Verificar metadados faltando
  const { data: missingMetadata } = await supabase
    .from('document_sections')
    .select('id')
    .is('metadata', null)
    .limit(1);
  
  if (missingMetadata && missingMetadata.length > 0) {
    issues.push({
      type: 'missing_metadata',
      severity: 'warning',
      message: 'Document sections sem metadados'
    });
  }
  
  // 3. Verificar duplicatas em regime_urbanistico
  const { data: regimeDuplicates } = await supabase
    .rpc('check_regime_duplicates', {});
  
  if (regimeDuplicates && regimeDuplicates.length > 0) {
    issues.push({
      type: 'duplicate_regime',
      severity: 'error',
      message: `${regimeDuplicates.length} combinações zona/bairro duplicadas`
    });
  }
  
  // 4. Verificar distribuição de chunks por arquivo
  const { data: distribution } = await supabase
    .from('document_sections')
    .select('metadata->source_file as source')
    .limit(1000);
  
  const fileCount = {};
  if (distribution) {
    distribution.forEach(row => {
      const source = row.source || 'unknown';
      fileCount[source] = (fileCount[source] || 0) + 1;
    });
    
    // Verificar se algum arquivo tem poucos chunks
    for (const [file, count] of Object.entries(fileCount)) {
      if (count < 10 && file !== 'unknown') {
        issues.push({
          type: 'low_chunk_count',
          severity: 'warning',
          message: `${file} tem apenas ${count} chunks`
        });
      }
    }
  }
  
  return issues;
}

/**
 * Verificar performance do sistema
 */
async function checkPerformance() {
  const metrics = {
    response_times: [],
    cache_hits: 0,
    cache_misses: 0,
    errors: 0,
    total_queries: 0
  };
  
  // Buscar últimas execuções de QA
  const { data: qaRuns } = await supabase
    .from('qa_validation_runs')
    .select('*')
    .order('created_at', { ascending: false })
    .limit(50);
  
  if (qaRuns) {
    qaRuns.forEach(run => {
      if (run.execution_time) {
        metrics.response_times.push(run.execution_time);
      }
      
      if (run.status === 'error') {
        metrics.errors++;
      }
      
      metrics.total_queries++;
    });
  }
  
  // Verificar cache hits
  const { data: cacheData } = await supabase
    .from('query_cache')
    .select('hit_count')
    .limit(100);
  
  if (cacheData) {
    cacheData.forEach(item => {
      if (item.hit_count > 0) {
        metrics.cache_hits += item.hit_count;
      }
    });
  }
  
  // Calcular métricas
  const avgResponseTime = metrics.response_times.length > 0
    ? metrics.response_times.reduce((a, b) => a + b, 0) / metrics.response_times.length
    : 0;
  
  const errorRate = metrics.total_queries > 0
    ? metrics.errors / metrics.total_queries
    : 0;
  
  const cacheHitRate = (metrics.cache_hits + metrics.cache_misses) > 0
    ? metrics.cache_hits / (metrics.cache_hits + metrics.cache_misses)
    : 0;
  
  return {
    avgResponseTime,
    errorRate,
    cacheHitRate,
    totalQueries: metrics.total_queries
  };
}

/**
 * Gerar relatório
 */
function generateReport(counts, integrity, performance) {
  console.clear();
  console.log(chalk.cyan.bold('\n╔════════════════════════════════════════════════════════════╗'));
  console.log(chalk.cyan.bold('║     MONITOR DA BASE DE CONHECIMENTO - CHAT PD POA         ║'));
  console.log(chalk.cyan.bold('╚════════════════════════════════════════════════════════════╝'));
  
  console.log(chalk.gray(`\n📅 ${new Date().toLocaleString('pt-BR')}`));
  console.log(chalk.gray(`🔄 Check #${state.checks}`));
  
  // Contagens
  console.log(chalk.yellow.bold('\n📊 CONTAGENS:'));
  for (const [name, data] of Object.entries(counts)) {
    const icon = data.status === 'ok' ? '✅' : data.status === 'warning' ? '⚠️' : '❌';
    const color = data.status === 'ok' ? chalk.green : data.status === 'warning' ? chalk.yellow : chalk.red;
    console.log(`  ${icon} ${name}: ${color(data.count)} registros ${data.threshold ? `(min: ${data.threshold})` : ''}`);
  }
  
  // Integridade
  if (integrity.length > 0) {
    console.log(chalk.yellow.bold('\n⚠️ PROBLEMAS DE INTEGRIDADE:'));
    for (const issue of integrity) {
      const icon = issue.severity === 'error' ? '❌' : '⚠️';
      const color = issue.severity === 'error' ? chalk.red : chalk.yellow;
      console.log(`  ${icon} ${color(issue.message)}`);
    }
  } else {
    console.log(chalk.green.bold('\n✅ INTEGRIDADE: OK'));
  }
  
  // Performance
  console.log(chalk.yellow.bold('\n⚡ PERFORMANCE:'));
  
  const perfColor = performance.avgResponseTime > THRESHOLDS.response_time_max ? chalk.red : chalk.green;
  console.log(`  ⏱️ Tempo médio: ${perfColor(performance.avgResponseTime.toFixed(0) + 'ms')}`);
  
  const errorColor = performance.errorRate > THRESHOLDS.error_rate_max ? chalk.red : chalk.green;
  console.log(`  ❌ Taxa de erro: ${errorColor((performance.errorRate * 100).toFixed(1) + '%')}`);
  
  const cacheColor = performance.cacheHitRate < THRESHOLDS.cache_hit_rate_min ? chalk.yellow : chalk.green;
  console.log(`  💾 Cache hit rate: ${cacheColor((performance.cacheHitRate * 100).toFixed(1) + '%')}`);
  
  console.log(`  📈 Total queries: ${performance.totalQueries}`);
  
  // Alertas
  if (state.alerts.length > 0) {
    console.log(chalk.red.bold('\n🚨 ALERTAS ATIVOS:'));
    for (const alert of state.alerts) {
      console.log(`  • ${chalk.red(alert)}`);
    }
  }
  
  // Status geral
  const hasErrors = integrity.some(i => i.severity === 'error') ||
                   performance.errorRate > THRESHOLDS.error_rate_max ||
                   Object.values(counts).some(c => c.status === 'error');
  
  const hasWarnings = integrity.some(i => i.severity === 'warning') ||
                     Object.values(counts).some(c => c.status === 'warning');
  
  console.log(chalk.cyan.bold('\n═══════════════════════════════════════════════════════════'));
  
  if (hasErrors) {
    console.log(chalk.red.bold('STATUS: ❌ CRÍTICO - AÇÃO NECESSÁRIA'));
  } else if (hasWarnings) {
    console.log(chalk.yellow.bold('STATUS: ⚠️ AVISO - MONITORAR'));
  } else {
    console.log(chalk.green.bold('STATUS: ✅ OPERACIONAL'));
  }
  
  console.log(chalk.cyan.bold('═══════════════════════════════════════════════════════════\n'));
}

/**
 * Verificar e gerar alertas
 */
function checkAlerts(counts, integrity, performance) {
  state.alerts = [];
  
  // Alertas de contagem
  if (counts.regime.count < THRESHOLDS.regime_min) {
    state.alerts.push(`Regime urbanístico abaixo do mínimo: ${counts.regime.count}/${THRESHOLDS.regime_min}`);
  }
  
  if (counts.sections.count < THRESHOLDS.sections_min) {
    state.alerts.push(`Document sections abaixo do mínimo: ${counts.sections.count}/${THRESHOLDS.sections_min}`);
  }
  
  // Alertas de integridade
  const criticalIssues = integrity.filter(i => i.severity === 'error');
  if (criticalIssues.length > 0) {
    state.alerts.push(`${criticalIssues.length} problemas críticos de integridade`);
  }
  
  // Alertas de performance
  if (performance.avgResponseTime > THRESHOLDS.response_time_max) {
    state.alerts.push(`Tempo de resposta alto: ${performance.avgResponseTime.toFixed(0)}ms`);
  }
  
  if (performance.errorRate > THRESHOLDS.error_rate_max) {
    state.alerts.push(`Taxa de erro alta: ${(performance.errorRate * 100).toFixed(1)}%`);
  }
  
  if (performance.cacheHitRate < THRESHOLDS.cache_hit_rate_min) {
    state.alerts.push(`Cache hit rate baixo: ${(performance.cacheHitRate * 100).toFixed(1)}%`);
  }
  
  // Enviar notificação se houver alertas novos
  if (state.alerts.length > 0 && state.checks > 1) {
    console.log('\n🔔 ' + chalk.red.bold('NOVOS ALERTAS DETECTADOS!'));
    // Aqui poderia enviar email, Slack, etc.
  }
}

/**
 * Loop principal de monitoramento
 */
async function monitor() {
  try {
    state.checks++;
    state.lastCheck = new Date();
    
    // Executar verificações
    const counts = await checkCounts();
    const integrity = await checkDataIntegrity();
    const performance = await checkPerformance();
    
    // Atualizar métricas
    state.metrics = {
      regime_count: counts.regime.count,
      sections_count: counts.sections.count,
      avg_response_time: performance.avgResponseTime,
      error_rate: performance.errorRate,
      cache_hit_rate: performance.cacheHitRate,
      embedding_nulls: integrity.filter(i => i.type === 'null_embeddings').length
    };
    
    // Verificar alertas
    checkAlerts(counts, integrity, performance);
    
    // Gerar relatório
    generateReport(counts, integrity, performance);
    
  } catch (error) {
    console.error(chalk.red('❌ Erro no monitoramento:'), error);
  }
}

/**
 * Iniciar monitoramento
 */
async function start() {
  console.log(chalk.cyan.bold('🚀 Iniciando Monitor da Base de Conhecimento...'));
  console.log(chalk.gray(`📊 Intervalo: 60 segundos`));
  console.log(chalk.gray(`🔗 URL: ${SUPABASE_URL}`));
  console.log(chalk.gray('Pressione Ctrl+C para parar\n'));
  
  // Primeira execução
  await monitor();
  
  // Loop contínuo
  setInterval(monitor, 60000); // A cada 60 segundos
}

// Tratamento de saída
process.on('SIGINT', () => {
  console.log(chalk.yellow('\n\n👋 Encerrando monitoramento...'));
  console.log(chalk.gray(`Total de verificações: ${state.checks}`));
  console.log(chalk.gray(`Última verificação: ${state.lastCheck?.toLocaleString('pt-BR')}`));
  process.exit(0);
});

// Iniciar
start().catch(console.error);