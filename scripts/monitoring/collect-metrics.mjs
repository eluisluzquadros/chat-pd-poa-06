#!/usr/bin/env node

/**
 * SISTEMA DE COLETA DE MÉTRICAS AGENTIC-RAG V3
 * 
 * Este script coleta e processa métricas do sistema RAG de forma automatizada.
 * Pode ser executado via cron job para monitoramento contínuo.
 * 
 * Funcionalidades:
 * - Coleta métricas de performance
 * - Calcula estatísticas agregadas
 * - Verifica condições de alerta
 * - Gera relatórios de saúde do sistema
 * - Monitora feedback dos usuários
 * - Análise de A/B testing
 * 
 * Uso:
 *   node collect-metrics.mjs [--interval=5m] [--output=console|json|db] [--alerts]
 */

import { createClient } from '@supabase/supabase-js';
import { promises as fs } from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Configuração
const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL || process.env.VITE_SUPABASE_URL;
const SUPABASE_SERVICE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!SUPABASE_URL || !SUPABASE_SERVICE_KEY) {
  console.error('❌ Variáveis de ambiente necessárias não encontradas');
  console.error('   NEXT_PUBLIC_SUPABASE_URL ou VITE_SUPABASE_URL');
  console.error('   SUPABASE_SERVICE_ROLE_KEY');
  process.exit(1);
}

const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_KEY);

// Parse argumentos de linha de comando
const args = process.argv.slice(2);
const config = {
  interval: '5m', // 5 minutos por padrão
  output: 'console', // console, json, db
  alerts: false,
  verbose: false,
  timeRange: '24h'
};

args.forEach(arg => {
  if (arg.startsWith('--interval=')) config.interval = arg.split('=')[1];
  if (arg.startsWith('--output=')) config.output = arg.split('=')[1];
  if (arg.startsWith('--timerange=')) config.timeRange = arg.split('=')[1];
  if (arg === '--alerts') config.alerts = true;
  if (arg === '--verbose') config.verbose = true;
  if (arg === '--help' || arg === '-h') {
    showHelp();
    process.exit(0);
  }
});

function showHelp() {
  console.log(`
🔍 Sistema de Coleta de Métricas Agentic-RAG V3

Uso: node collect-metrics.mjs [opções]

Opções:
  --interval=<tempo>     Intervalo de coleta (5m, 1h, 1d) [padrão: 5m]
  --output=<formato>     Formato de saída (console, json, db) [padrão: console]
  --timerange=<período>  Período de análise (1h, 24h, 7d) [padrão: 24h]
  --alerts               Verificar e processar alertas
  --verbose              Saída detalhada
  --help, -h             Mostrar esta ajuda

Exemplos:
  node collect-metrics.mjs --interval=1h --output=json
  node collect-metrics.mjs --alerts --verbose
  node collect-metrics.mjs --timerange=7d --output=console
  `);
}

// Utilitários
function parseTimeRange(range) {
  const multipliers = { m: 1, h: 60, d: 1440 };
  const match = range.match(/^(\d+)([mhd])$/);
  if (!match) throw new Error('Formato de tempo inválido');
  return parseInt(match[1]) * multipliers[match[2]];
}

function formatDuration(ms) {
  if (ms < 1000) return `${ms}ms`;
  if (ms < 60000) return `${Math.round(ms / 1000)}s`;
  if (ms < 3600000) return `${Math.round(ms / 60000)}min`;
  return `${Math.round(ms / 3600000)}h`;
}

function formatCurrency(amount) {
  return new Intl.NumberFormat('en-US', {
    style: 'currency',
    currency: 'USD',
    minimumFractionDigits: 4
  }).format(amount);
}

// Coletor principal de métricas
class MetricsCollector {
  constructor() {
    this.startTime = Date.now();
    this.metrics = {
      system: {},
      performance: {},
      quality: {},
      cost: {},
      alerts: [],
      feedback: {},
      abTesting: {}
    };
  }

  async collect() {
    try {
      if (config.verbose) console.log('🔍 Iniciando coleta de métricas...');

      await Promise.all([
        this.collectSystemMetrics(),
        this.collectPerformanceMetrics(),
        this.collectQualityMetrics(),
        this.collectCostMetrics(),
        this.collectFeedbackMetrics(),
        this.collectABTestingMetrics()
      ]);

      if (config.alerts) {
        await this.checkAlerts();
      }

      this.metrics.collectionTime = Date.now() - this.startTime;
      
      if (config.verbose) {
        console.log(`✅ Coleta concluída em ${this.metrics.collectionTime}ms`);
      }

      return this.metrics;

    } catch (error) {
      console.error('❌ Erro na coleta de métricas:', error);
      throw error;
    }
  }

  async collectSystemMetrics() {
    const minutesBack = parseTimeRange(config.timeRange);
    const since = new Date(Date.now() - minutesBack * 60 * 1000).toISOString();

    // Buscar métricas básicas
    const { data: metrics, error } = await supabase
      .from('rag_metrics')
      .select('*')
      .gte('created_at', since)
      .order('created_at', { ascending: false });

    if (error) throw error;

    const total = metrics.length;
    const successful = metrics.filter(m => m.status === 'success').length;
    const failed = metrics.filter(m => m.status === 'error').length;
    const v3Queries = metrics.filter(m => m.rag_version === 'v3').length;
    const v2Queries = metrics.filter(m => m.rag_version === 'v2').length;

    this.metrics.system = {
      totalQueries: total,
      successfulQueries: successful,
      failedQueries: failed,
      successRate: total > 0 ? Math.round((successful / total) * 100) : 0,
      errorRate: total > 0 ? Math.round((failed / total) * 100) : 0,
      v3Queries,
      v2Queries,
      v3Adoption: total > 0 ? Math.round((v3Queries / total) * 100) : 0,
      timeRange: config.timeRange,
      lastUpdate: new Date().toISOString()
    };
  }

  async collectPerformanceMetrics() {
    const minutesBack = parseTimeRange(config.timeRange);
    const since = new Date(Date.now() - minutesBack * 60 * 1000).toISOString();

    const { data: metrics, error } = await supabase
      .from('rag_metrics')
      .select('total_latency, analyzer_latency, sql_generator_latency, vector_search_latency, synthesizer_latency, rag_version, created_at')
      .gte('created_at', since)
      .eq('status', 'success');

    if (error) throw error;

    if (metrics.length === 0) {
      this.metrics.performance = { noData: true };
      return;
    }

    // Calcular estatísticas de latência
    const latencies = metrics.map(m => m.total_latency).sort((a, b) => a - b);
    const avgLatency = latencies.reduce((sum, lat) => sum + lat, 0) / latencies.length;
    const p50 = latencies[Math.floor(latencies.length * 0.5)];
    const p95 = latencies[Math.floor(latencies.length * 0.95)];
    const p99 = latencies[Math.floor(latencies.length * 0.99)];

    // Breakdown por componente
    const avgAnalyzer = this.calculateAverage(metrics, 'analyzer_latency');
    const avgSqlGen = this.calculateAverage(metrics, 'sql_generator_latency');
    const avgVectorSearch = this.calculateAverage(metrics, 'vector_search_latency');
    const avgSynthesizer = this.calculateAverage(metrics, 'synthesizer_latency');

    // Performance por versão
    const v3Metrics = metrics.filter(m => m.rag_version === 'v3');
    const v2Metrics = metrics.filter(m => m.rag_version === 'v2');

    const v3AvgLatency = v3Metrics.length > 0 ? 
      v3Metrics.reduce((sum, m) => sum + m.total_latency, 0) / v3Metrics.length : 0;
    const v2AvgLatency = v2Metrics.length > 0 ? 
      v2Metrics.reduce((sum, m) => sum + m.total_latency, 0) / v2Metrics.length : 0;

    this.metrics.performance = {
      avgLatency: Math.round(avgLatency),
      p50Latency: p50,
      p95Latency: p95,
      p99Latency: p99,
      minLatency: Math.min(...latencies),
      maxLatency: Math.max(...latencies),
      breakdown: {
        analyzer: Math.round(avgAnalyzer),
        sqlGenerator: Math.round(avgSqlGen),
        vectorSearch: Math.round(avgVectorSearch),
        synthesizer: Math.round(avgSynthesizer)
      },
      versionComparison: {
        v3: {
          count: v3Metrics.length,
          avgLatency: Math.round(v3AvgLatency)
        },
        v2: {
          count: v2Metrics.length,
          avgLatency: Math.round(v2AvgLatency)
        },
        improvement: v2AvgLatency > 0 ? 
          Math.round(((v2AvgLatency - v3AvgLatency) / v2AvgLatency) * 100) : 0
      }
    };
  }

  async collectQualityMetrics() {
    const minutesBack = parseTimeRange(config.timeRange);
    const since = new Date(Date.now() - minutesBack * 60 * 1000).toISOString();

    const { data: metrics, error } = await supabase
      .from('rag_metrics')
      .select('confidence_score, has_results, result_count, refinement_count, query_category, rag_version')
      .gte('created_at', since)
      .eq('status', 'success');

    if (error) throw error;

    if (metrics.length === 0) {
      this.metrics.quality = { noData: true };
      return;
    }

    // Confiança média
    const confidenceScores = metrics
      .map(m => m.confidence_score)
      .filter(score => score != null);
    
    const avgConfidence = confidenceScores.length > 0 ?
      confidenceScores.reduce((sum, score) => sum + score, 0) / confidenceScores.length : 0;

    // Taxa de queries com resultados
    const withResults = metrics.filter(m => m.has_results).length;
    const resultRate = Math.round((withResults / metrics.length) * 100);

    // Número médio de refinamentos
    const refinements = metrics.map(m => m.refinement_count || 0);
    const avgRefinements = refinements.reduce((sum, count) => sum + count, 0) / refinements.length;

    // Qualidade por categoria
    const categories = {};
    metrics.forEach(m => {
      const cat = m.query_category || 'general';
      if (!categories[cat]) {
        categories[cat] = {
          count: 0,
          confidenceSum: 0,
          withResults: 0
        };
      }
      categories[cat].count++;
      if (m.confidence_score) categories[cat].confidenceSum += m.confidence_score;
      if (m.has_results) categories[cat].withResults++;
    });

    Object.keys(categories).forEach(cat => {
      const data = categories[cat];
      categories[cat] = {
        count: data.count,
        avgConfidence: Math.round((data.confidenceSum / data.count) * 100) / 100,
        resultRate: Math.round((data.withResults / data.count) * 100)
      };
    });

    this.metrics.quality = {
      avgConfidence: Math.round(avgConfidence * 100) / 100,
      resultRate,
      avgRefinements: Math.round(avgRefinements * 100) / 100,
      highConfidenceQueries: confidenceScores.filter(score => score > 0.8).length,
      lowConfidenceQueries: confidenceScores.filter(score => score < 0.5).length,
      categories
    };
  }

  async collectCostMetrics() {
    const minutesBack = parseTimeRange(config.timeRange);
    const since = new Date(Date.now() - minutesBack * 60 * 1000).toISOString();

    const { data: metrics, error } = await supabase
      .from('rag_metrics')
      .select('total_tokens, input_tokens, output_tokens, estimated_cost, llm_model, rag_version')
      .gte('created_at', since);

    if (error) throw error;

    if (metrics.length === 0) {
      this.metrics.cost = { noData: true };
      return;
    }

    const totalCost = metrics.reduce((sum, m) => sum + (m.estimated_cost || 0), 0);
    const totalTokens = metrics.reduce((sum, m) => sum + (m.total_tokens || 0), 0);
    const avgCostPerQuery = totalCost / metrics.length;
    const avgTokensPerQuery = totalTokens / metrics.length;

    // Custo por modelo
    const modelCosts = {};
    metrics.forEach(m => {
      const model = m.llm_model || 'unknown';
      if (!modelCosts[model]) {
        modelCosts[model] = {
          queries: 0,
          totalCost: 0,
          totalTokens: 0
        };
      }
      modelCosts[model].queries++;
      modelCosts[model].totalCost += m.estimated_cost || 0;
      modelCosts[model].totalTokens += m.total_tokens || 0;
    });

    // Custo por versão
    const v3Cost = metrics.filter(m => m.rag_version === 'v3')
      .reduce((sum, m) => sum + (m.estimated_cost || 0), 0);
    const v2Cost = metrics.filter(m => m.rag_version === 'v2')
      .reduce((sum, m) => sum + (m.estimated_cost || 0), 0);

    this.metrics.cost = {
      totalCost: Math.round(totalCost * 10000) / 10000,
      totalTokens,
      avgCostPerQuery: Math.round(avgCostPerQuery * 10000) / 10000,
      avgTokensPerQuery: Math.round(avgTokensPerQuery),
      costPerThousandTokens: totalTokens > 0 ? 
        Math.round((totalCost / totalTokens * 1000) * 10000) / 10000 : 0,
      modelBreakdown: Object.keys(modelCosts).map(model => ({
        model,
        queries: modelCosts[model].queries,
        totalCost: Math.round(modelCosts[model].totalCost * 10000) / 10000,
        avgCost: Math.round((modelCosts[model].totalCost / modelCosts[model].queries) * 10000) / 10000,
        avgTokens: Math.round(modelCosts[model].totalTokens / modelCosts[model].queries)
      })).sort((a, b) => b.totalCost - a.totalCost),
      versionComparison: {
        v3Cost: Math.round(v3Cost * 10000) / 10000,
        v2Cost: Math.round(v2Cost * 10000) / 10000
      }
    };
  }

  async collectFeedbackMetrics() {
    const minutesBack = parseTimeRange(config.timeRange);
    const since = new Date(Date.now() - minutesBack * 60 * 1000).toISOString();

    const { data: feedback, error } = await supabase
      .from('user_feedback')
      .select('rating, is_helpful, is_accurate, is_complete, problem_type')
      .gte('created_at', since);

    if (error) throw error;

    if (feedback.length === 0) {
      this.metrics.feedback = { noData: true };
      return;
    }

    // Estatísticas de rating
    const ratings = feedback.map(f => f.rating).filter(r => r != null);
    const avgRating = ratings.length > 0 ?
      ratings.reduce((sum, rating) => sum + rating, 0) / ratings.length : 0;

    const ratingDistribution = [1, 2, 3, 4, 5].map(rating => ({
      rating,
      count: ratings.filter(r => r === rating).length,
      percentage: ratings.length > 0 ? 
        Math.round((ratings.filter(r => r === rating).length / ratings.length) * 100) : 0
    }));

    // Métricas booleanas
    const helpful = feedback.filter(f => f.is_helpful).length;
    const accurate = feedback.filter(f => f.is_accurate).length;
    const complete = feedback.filter(f => f.is_complete).length;

    // Problemas reportados
    const problems = {};
    feedback.forEach(f => {
      if (f.problem_type) {
        problems[f.problem_type] = (problems[f.problem_type] || 0) + 1;
      }
    });

    this.metrics.feedback = {
      totalFeedback: feedback.length,
      avgRating: Math.round(avgRating * 100) / 100,
      ratingDistribution,
      helpfulRate: Math.round((helpful / feedback.length) * 100),
      accuracyRate: Math.round((accurate / feedback.length) * 100),
      completenessRate: Math.round((complete / feedback.length) * 100),
      topProblems: Object.entries(problems)
        .map(([type, count]) => ({ type, count }))
        .sort((a, b) => b.count - a.count)
        .slice(0, 5)
    };
  }

  async collectABTestingMetrics() {
    // Buscar experimentos ativos
    const { data: experiments, error: expError } = await supabase
      .from('ab_experiments')
      .select('*')
      .eq('status', 'running');

    if (expError) {
      console.warn('Erro ao buscar experimentos A/B:', expError);
      this.metrics.abTesting = { error: expError.message };
      return;
    }

    const experimentResults = [];

    for (const experiment of experiments || []) {
      try {
        // Buscar participantes
        const { data: participants } = await supabase
          .from('ab_participants')
          .select('assigned_version')
          .eq('experiment_id', experiment.id);

        const controlCount = participants?.filter(p => p.assigned_version === experiment.control_version).length || 0;
        const treatmentCount = participants?.filter(p => p.assigned_version === experiment.treatment_version).length || 0;

        // Buscar métricas dos participantes
        const { data: controlMetrics } = await supabase
          .from('rag_metrics')
          .select('total_latency, confidence_score, has_results')
          .eq('rag_version', experiment.control_version)
          .gte('created_at', experiment.start_date);

        const { data: treatmentMetrics } = await supabase
          .from('rag_metrics')
          .select('total_latency, confidence_score, has_results')
          .eq('rag_version', experiment.treatment_version)
          .gte('created_at', experiment.start_date);

        const controlStats = this.calculateGroupStats(controlMetrics || []);
        const treatmentStats = this.calculateGroupStats(treatmentMetrics || []);

        experimentResults.push({
          id: experiment.id,
          name: experiment.name,
          controlVersion: experiment.control_version,
          treatmentVersion: experiment.treatment_version,
          participants: {
            control: controlCount,
            treatment: treatmentCount,
            total: controlCount + treatmentCount
          },
          performance: {
            control: controlStats,
            treatment: treatmentStats,
            improvement: this.calculateImprovement(controlStats, treatmentStats)
          },
          startDate: experiment.start_date,
          status: experiment.status
        });

      } catch (error) {
        console.warn(`Erro ao processar experimento ${experiment.name}:`, error);
      }
    }

    this.metrics.abTesting = {
      activeExperiments: experiments?.length || 0,
      experiments: experimentResults
    };
  }

  async checkAlerts() {
    if (config.verbose) console.log('🚨 Verificando alertas...');

    const { data: activeAlerts, error } = await supabase
      .from('active_alerts')
      .select('*')
      .order('created_at', { ascending: false });

    if (error) {
      console.warn('Erro ao buscar alertas:', error);
      return;
    }

    this.metrics.alerts = activeAlerts || [];

    // Calcular métricas atuais para verificar novos alertas
    const currentErrorRate = await this.calculateCurrentErrorRate();
    const currentP95Latency = await this.calculateCurrentP95Latency();

    const alertsToCheck = [
      {
        name: 'High Error Rate',
        current: currentErrorRate,
        threshold: 5.0,
        severity: currentErrorRate > 15 ? 'critical' : 'warning'
      },
      {
        name: 'High P95 Latency',
        current: currentP95Latency,
        threshold: 5000,
        severity: currentP95Latency > 10000 ? 'critical' : 'warning'
      }
    ];

    if (config.verbose) {
      alertsToCheck.forEach(alert => {
        const status = alert.current > alert.threshold ? '❌ ATIVO' : '✅ OK';
        console.log(`   ${alert.name}: ${alert.current} (limite: ${alert.threshold}) ${status}`);
      });
    }
  }

  // Métodos auxiliares
  calculateAverage(data, field) {
    const values = data.map(item => item[field]).filter(val => val != null);
    return values.length > 0 ? values.reduce((sum, val) => sum + val, 0) / values.length : 0;
  }

  calculateGroupStats(metrics) {
    if (metrics.length === 0) return { noData: true };

    const latencies = metrics.map(m => m.total_latency).filter(l => l != null);
    const confidenceScores = metrics.map(m => m.confidence_score).filter(c => c != null);
    const withResults = metrics.filter(m => m.has_results).length;

    return {
      count: metrics.length,
      avgLatency: latencies.length > 0 ? 
        Math.round(latencies.reduce((sum, l) => sum + l, 0) / latencies.length) : 0,
      avgConfidence: confidenceScores.length > 0 ?
        Math.round(confidenceScores.reduce((sum, c) => sum + c, 0) / confidenceScores.length * 100) / 100 : 0,
      successRate: Math.round((withResults / metrics.length) * 100)
    };
  }

  calculateImprovement(control, treatment) {
    if (control.noData || treatment.noData) return {};

    const latencyImprovement = control.avgLatency > 0 ?
      Math.round(((control.avgLatency - treatment.avgLatency) / control.avgLatency) * 100) : 0;

    const confidenceImprovement = control.avgConfidence > 0 ?
      Math.round(((treatment.avgConfidence - control.avgConfidence) / control.avgConfidence) * 100) : 0;

    return {
      latency: latencyImprovement,
      confidence: confidenceImprovement,
      successRate: treatment.successRate - control.successRate
    };
  }

  async calculateCurrentErrorRate() {
    const fiveMinutesAgo = new Date(Date.now() - 5 * 60 * 1000).toISOString();
    
    const { data: metrics } = await supabase
      .from('rag_metrics')
      .select('status')
      .gte('created_at', fiveMinutesAgo);

    if (!metrics || metrics.length === 0) return 0;

    const errors = metrics.filter(m => m.status === 'error').length;
    return Math.round((errors / metrics.length) * 100);
  }

  async calculateCurrentP95Latency() {
    const fiveMinutesAgo = new Date(Date.now() - 5 * 60 * 1000).toISOString();
    
    const { data: metrics } = await supabase
      .from('rag_metrics')
      .select('total_latency')
      .eq('status', 'success')
      .gte('created_at', fiveMinutesAgo);

    if (!metrics || metrics.length === 0) return 0;

    const latencies = metrics.map(m => m.total_latency).sort((a, b) => a - b);
    const p95Index = Math.floor(latencies.length * 0.95);
    return latencies[p95Index] || 0;
  }
}

// Formatadores de saída
class OutputFormatter {
  static console(metrics) {
    console.log('\n🔍 RELATÓRIO DE MÉTRICAS AGENTIC-RAG V3');
    console.log('='.repeat(50));
    
    // Sistema
    const sys = metrics.system;
    if (sys && !sys.noData) {
      console.log('\n📊 SISTEMA:');
      console.log(`   Total de Queries: ${sys.totalQueries.toLocaleString()}`);
      console.log(`   Taxa de Sucesso: ${sys.successRate}%`);
      console.log(`   V3 Adoption: ${sys.v3Adoption}% (${sys.v3Queries} queries)`);
      if (sys.errorRate > 0) {
        console.log(`   ⚠️  Taxa de Erro: ${sys.errorRate}%`);
      }
    }

    // Performance
    const perf = metrics.performance;
    if (perf && !perf.noData) {
      console.log('\n⚡ PERFORMANCE:');
      console.log(`   Latência Média: ${formatDuration(perf.avgLatency)}`);
      console.log(`   P95: ${formatDuration(perf.p95Latency)} | P99: ${formatDuration(perf.p99Latency)}`);
      console.log(`   Range: ${formatDuration(perf.minLatency)} - ${formatDuration(perf.maxLatency)}`);
      
      if (perf.breakdown) {
        console.log('   Breakdown:');
        console.log(`     • Analyzer: ${formatDuration(perf.breakdown.analyzer)}`);
        console.log(`     • SQL Gen: ${formatDuration(perf.breakdown.sqlGenerator)}`);
        console.log(`     • Vector Search: ${formatDuration(perf.breakdown.vectorSearch)}`);
        console.log(`     • Synthesizer: ${formatDuration(perf.breakdown.synthesizer)}`);
      }

      if (perf.versionComparison.improvement !== 0) {
        const symbol = perf.versionComparison.improvement > 0 ? '✅' : '❌';
        console.log(`   ${symbol} V3 vs V2: ${perf.versionComparison.improvement}% improvement`);
      }
    }

    // Qualidade
    const qual = metrics.quality;
    if (qual && !qual.noData) {
      console.log('\n🎯 QUALIDADE:');
      console.log(`   Confiança Média: ${qual.avgConfidence}`);
      console.log(`   Taxa de Resultados: ${qual.resultRate}%`);
      console.log(`   Refinamentos Médios: ${qual.avgRefinements}`);
      if (qual.lowConfidenceQueries > 0) {
        console.log(`   ⚠️  Queries Baixa Confiança: ${qual.lowConfidenceQueries}`);
      }
    }

    // Custo
    const cost = metrics.cost;
    if (cost && !cost.noData) {
      console.log('\n💰 CUSTO:');
      console.log(`   Custo Total: ${formatCurrency(cost.totalCost)}`);
      console.log(`   Por Query: ${formatCurrency(cost.avgCostPerQuery)}`);
      console.log(`   Tokens Totais: ${cost.totalTokens.toLocaleString()}`);
      console.log(`   Por 1K Tokens: ${formatCurrency(cost.costPerThousandTokens)}`);
      
      if (cost.modelBreakdown.length > 0) {
        console.log('   Top Modelos:');
        cost.modelBreakdown.slice(0, 3).forEach(model => {
          console.log(`     • ${model.model}: ${formatCurrency(model.totalCost)} (${model.queries} queries)`);
        });
      }
    }

    // Feedback
    const feedback = metrics.feedback;
    if (feedback && !feedback.noData) {
      console.log('\n👥 FEEDBACK:');
      console.log(`   Rating Médio: ${feedback.avgRating}/5 (${feedback.totalFeedback} avaliações)`);
      console.log(`   Útil: ${feedback.helpfulRate}% | Preciso: ${feedback.accuracyRate}%`);
      
      if (feedback.topProblems.length > 0) {
        console.log('   Principais Problemas:');
        feedback.topProblems.forEach(problem => {
          console.log(`     • ${problem.type}: ${problem.count}`);
        });
      }
    }

    // Alertas
    if (metrics.alerts && metrics.alerts.length > 0) {
      console.log('\n🚨 ALERTAS ATIVOS:');
      metrics.alerts.forEach(alert => {
        const ageMinutes = Math.round(alert.minutes_active);
        console.log(`   • ${alert.rule_name} (${alert.severity}) - há ${ageMinutes}min`);
        console.log(`     ${alert.alert_message}`);
      });
    }

    // A/B Testing
    const abTest = metrics.abTesting;
    if (abTest && abTest.activeExperiments > 0) {
      console.log('\n🧪 A/B TESTING:');
      console.log(`   Experimentos Ativos: ${abTest.activeExperiments}`);
      abTest.experiments.forEach(exp => {
        console.log(`   • ${exp.name}:`);
        console.log(`     Participantes: ${exp.participants.total} (Control: ${exp.participants.control}, Treatment: ${exp.participants.treatment})`);
        if (exp.performance.improvement.latency) {
          console.log(`     Melhoria de Latência: ${exp.performance.improvement.latency}%`);
        }
      });
    }

    console.log(`\n⏱️  Coleta realizada em ${formatDuration(metrics.collectionTime)}`);
    console.log(`📅 ${new Date().toLocaleString('pt-BR')}\n`);
  }

  static json(metrics) {
    console.log(JSON.stringify(metrics, null, 2));
  }

  static async saveToDatabase(metrics) {
    // Implementar salvamento no banco se necessário
    console.log('💾 Salvamento em banco não implementado ainda');
  }
}

// Função principal
async function main() {
  try {
    const collector = new MetricsCollector();
    const metrics = await collector.collect();

    // Output baseado na configuração
    switch (config.output) {
      case 'json':
        OutputFormatter.json(metrics);
        break;
      case 'db':
        await OutputFormatter.saveToDatabase(metrics);
        break;
      default:
        OutputFormatter.console(metrics);
    }

  } catch (error) {
    console.error('❌ Erro fatal:', error);
    process.exit(1);
  }
}

// Executar se chamado diretamente
if (import.meta.url === `file://${process.argv[1]}`) {
  main();
}

export default MetricsCollector;