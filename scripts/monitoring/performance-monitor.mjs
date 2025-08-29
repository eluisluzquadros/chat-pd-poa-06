#!/usr/bin/env node

import { createClient } from '@supabase/supabase-js';
import fs from 'fs';
import path from 'path';

const supabaseUrl = process.env.SUPABASE_URL || 'https://ngrqwmvuhvjkeohesbxs.supabase.co';
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY || 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Im5ncnF3bXZ1aHZqa2VvaGVzYnhzIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc1MzYwOTAxNywiZXhwIjoyMDY5MTg1MDE3fQ.7jVZP70RAjpfFPfehZt5Gr3vSxn8DZ3YyPJNjCwZXEo';

const supabase = createClient(supabaseUrl, supabaseKey);

class PerformanceMonitor {
  constructor() {
    this.metrics = {
      totalQueries: 0,
      successfulQueries: 0,
      failedQueries: 0,
      averageResponseTime: 0,
      documentTypeUsage: {},
      cacheHitRate: 0,
      confidenceScores: [],
      errorTypes: {},
      queryTypes: {
        article: 0,
        neighborhood: 0,
        zone: 0,
        general: 0
      }
    };
    this.startTime = Date.now();
  }

  async collectMetrics() {
    console.log('📊 COLETANDO MÉTRICAS DE PERFORMANCE\n');
    
    // 1. Métricas de llm_metrics (últimas 24h)
    await this.collectLLMMetrics();
    
    // 2. Métricas de cache
    await this.collectCacheMetrics();
    
    // 3. Métricas de document_type usage
    await this.collectDocumentUsage();
    
    // 4. Métricas de qa_runs
    await this.collectQAMetrics();
    
    // 5. Análise de padrões de erro
    await this.analyzeErrorPatterns();
    
    return this.metrics;
  }

  async collectLLMMetrics() {
    const yesterday = new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString();
    
    const { data: metrics, error } = await supabase
      .from('llm_metrics')
      .select('*')
      .gte('created_at', yesterday)
      .order('created_at', { ascending: false });
    
    if (error) {
      console.error('❌ Erro ao coletar llm_metrics:', error.message);
      return;
    }
    
    if (metrics && metrics.length > 0) {
      this.metrics.totalQueries = metrics.length;
      
      // Calcular média de tempo de resposta
      const responseTimes = metrics
        .filter(m => m.execution_time)
        .map(m => m.execution_time);
      
      if (responseTimes.length > 0) {
        this.metrics.averageResponseTime = 
          responseTimes.reduce((a, b) => a + b, 0) / responseTimes.length;
      }
      
      // Coletar confidence scores
      this.metrics.confidenceScores = metrics
        .filter(m => m.metadata?.confidence)
        .map(m => m.metadata.confidence);
      
      // Contar sucessos e falhas
      this.metrics.successfulQueries = metrics.filter(m => !m.error).length;
      this.metrics.failedQueries = metrics.filter(m => m.error).length;
    }
    
    console.log(`✅ Analisadas ${metrics?.length || 0} queries das últimas 24h`);
  }

  async collectCacheMetrics() {
    const { data: cacheData, error } = await supabase
      .from('query_cache')
      .select('*')
      .order('created_at', { ascending: false })
      .limit(100);
    
    if (error) {
      console.error('❌ Erro ao coletar cache metrics:', error.message);
      return;
    }
    
    if (cacheData && cacheData.length > 0) {
      // Calcular cache hit rate baseado em metadados
      const hits = cacheData.filter(c => c.hit_count && c.hit_count > 1).length;
      this.metrics.cacheHitRate = (hits / cacheData.length) * 100;
    }
    
    console.log(`✅ Cache hit rate: ${this.metrics.cacheHitRate.toFixed(1)}%`);
  }

  async collectDocumentUsage() {
    const { data: articles } = await supabase
      .from('legal_articles')
      .select('document_type');
    
    const usage = {};
    articles?.forEach(a => {
      usage[a.document_type] = (usage[a.document_type] || 0) + 1;
    });
    
    this.metrics.documentTypeUsage = usage;
    
    console.log('✅ Document type distribution collected');
  }

  async collectQAMetrics() {
    const { data: runs } = await supabase
      .from('qa_runs')
      .select('*')
      .order('created_at', { ascending: false })
      .limit(5);
    
    if (runs && runs.length > 0) {
      const latestRun = runs[0];
      this.metrics.lastQAAccuracy = latestRun.accuracy_rate;
      this.metrics.lastQARunDate = latestRun.created_at;
    }
    
    console.log(`✅ Última acurácia QA: ${this.metrics.lastQAAccuracy?.toFixed(1) || 'N/A'}%`);
  }

  async analyzeErrorPatterns() {
    const yesterday = new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString();
    
    const { data: errors } = await supabase
      .from('llm_metrics')
      .select('error, metadata')
      .not('error', 'is', null)
      .gte('created_at', yesterday);
    
    const errorTypes = {};
    errors?.forEach(e => {
      const type = e.error?.type || 'unknown';
      errorTypes[type] = (errorTypes[type] || 0) + 1;
    });
    
    this.metrics.errorTypes = errorTypes;
    
    console.log(`✅ Padrões de erro analisados: ${Object.keys(errorTypes).length} tipos`);
  }

  generateReport() {
    const report = {
      timestamp: new Date().toISOString(),
      period: '24_hours',
      summary: {
        totalQueries: this.metrics.totalQueries,
        successRate: ((this.metrics.successfulQueries / this.metrics.totalQueries) * 100).toFixed(1) + '%',
        averageResponseTime: this.metrics.averageResponseTime.toFixed(0) + 'ms',
        cacheHitRate: this.metrics.cacheHitRate.toFixed(1) + '%',
        lastQAAccuracy: (this.metrics.lastQAAccuracy || 0).toFixed(1) + '%'
      },
      documentUsage: this.metrics.documentTypeUsage,
      errors: this.metrics.errorTypes,
      recommendations: this.generateRecommendations()
    };
    
    return report;
  }

  generateRecommendations() {
    const recommendations = [];
    
    // Verificar taxa de sucesso
    const successRate = (this.metrics.successfulQueries / this.metrics.totalQueries) * 100;
    if (successRate < 90) {
      recommendations.push({
        priority: 'HIGH',
        issue: 'Taxa de sucesso baixa',
        value: successRate.toFixed(1) + '%',
        action: 'Revisar logs de erro e otimizar tratamento de exceções'
      });
    }
    
    // Verificar tempo de resposta
    if (this.metrics.averageResponseTime > 3000) {
      recommendations.push({
        priority: 'MEDIUM',
        issue: 'Tempo de resposta alto',
        value: this.metrics.averageResponseTime.toFixed(0) + 'ms',
        action: 'Otimizar queries e considerar aumentar cache TTL'
      });
    }
    
    // Verificar cache hit rate
    if (this.metrics.cacheHitRate < 30) {
      recommendations.push({
        priority: 'LOW',
        issue: 'Cache hit rate baixo',
        value: this.metrics.cacheHitRate.toFixed(1) + '%',
        action: 'Analisar padrões de query para melhorar cache strategy'
      });
    }
    
    // Verificar uso de REGIME_FALLBACK
    const regimeUsage = this.metrics.documentTypeUsage['REGIME_FALLBACK'] || 0;
    const totalDocs = Object.values(this.metrics.documentTypeUsage).reduce((a, b) => a + b, 0);
    const regimePercent = (regimeUsage / totalDocs) * 100;
    
    if (regimePercent < 40) {
      recommendations.push({
        priority: 'HIGH',
        issue: 'REGIME_FALLBACK subutilizado',
        value: regimePercent.toFixed(1) + '%',
        action: 'Verificar se agentic-rag está consultando REGIME_FALLBACK corretamente'
      });
    }
    
    return recommendations;
  }

  async saveReport(report) {
    const timestamp = new Date().toISOString().replace(/:/g, '-').split('.')[0];
    const filename = `performance-report-${timestamp}.json`;
    const filepath = path.join(process.cwd(), 'reports', filename);
    
    // Criar diretório se não existir
    const dir = path.dirname(filepath);
    if (!fs.existsSync(dir)) {
      fs.mkdirSync(dir, { recursive: true });
    }
    
    fs.writeFileSync(filepath, JSON.stringify(report, null, 2));
    console.log(`\n📄 Relatório salvo em: ${filepath}`);
    
    return filepath;
  }

  displayReport(report) {
    console.log('\n' + '='.repeat(60));
    console.log('📊 RELATÓRIO DE PERFORMANCE - SISTEMA AGENTIC-RAG');
    console.log('='.repeat(60));
    
    console.log('\n📈 RESUMO GERAL:');
    Object.entries(report.summary).forEach(([key, value]) => {
      const label = key.replace(/([A-Z])/g, ' $1').trim();
      console.log(`  • ${label}: ${value}`);
    });
    
    console.log('\n📚 USO DE DOCUMENTOS:');
    Object.entries(report.documentUsage).forEach(([type, count]) => {
      const percent = ((count / Object.values(report.documentUsage).reduce((a, b) => a + b, 0)) * 100).toFixed(1);
      console.log(`  • ${type}: ${count} (${percent}%)`);
    });
    
    if (Object.keys(report.errors).length > 0) {
      console.log('\n❌ TIPOS DE ERRO:');
      Object.entries(report.errors).forEach(([type, count]) => {
        console.log(`  • ${type}: ${count}`);
      });
    }
    
    if (report.recommendations.length > 0) {
      console.log('\n🎯 RECOMENDAÇÕES:');
      report.recommendations.forEach(rec => {
        const icon = rec.priority === 'HIGH' ? '🔴' : rec.priority === 'MEDIUM' ? '🟡' : '🟢';
        console.log(`\n  ${icon} [${rec.priority}] ${rec.issue}`);
        console.log(`     Valor atual: ${rec.value}`);
        console.log(`     Ação: ${rec.action}`);
      });
    } else {
      console.log('\n✅ Nenhuma recomendação crítica - sistema operando bem!');
    }
    
    console.log('\n' + '='.repeat(60));
  }
}

// Função principal
async function runMonitoring(options = {}) {
  const monitor = new PerformanceMonitor();
  
  try {
    await monitor.collectMetrics();
    const report = monitor.generateReport();
    
    if (options.display !== false) {
      monitor.displayReport(report);
    }
    
    if (options.save !== false) {
      await monitor.saveReport(report);
    }
    
    return report;
  } catch (error) {
    console.error('❌ Erro no monitoramento:', error.message);
    process.exit(1);
  }
}

// Executar se chamado diretamente
if (import.meta.url === `file://${process.argv[1]}`) {
  runMonitoring().then(() => {
    console.log('\n✅ Monitoramento concluído!');
  });
}

export { PerformanceMonitor, runMonitoring };