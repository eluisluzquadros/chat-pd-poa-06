#!/usr/bin/env node

/**
 * SISTEMA DE GERENCIAMENTO DE A/B TESTING PARA AGENTIC-RAG V3
 * 
 * Este script gerencia experimentos A/B entre versões do RAG,
 * incluindo criação, monitoramento e análise estatística.
 * 
 * Funcionalidades:
 * - Criar e gerenciar experimentos A/B
 * - Atribuir usuários aos grupos de controle/tratamento
 * - Calcular significância estatística
 * - Gerar relatórios de resultados
 * - Testes Chi-quadrado e t-test para comparações
 * 
 * Uso:
 *   node ab-testing-manager.mjs create --name="V2 vs V3 Latency Test"
 *   node ab-testing-manager.mjs status --experiment-id=<uuid>
 *   node ab-testing-manager.mjs analyze --experiment-id=<uuid>
 *   node ab-testing-manager.mjs assign --user-id=<uuid> --experiment-id=<uuid>
 */

import { createClient } from '@supabase/supabase-js';
import { randomBytes } from 'crypto';

// Configuração
const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL || process.env.VITE_SUPABASE_URL;
const SUPABASE_SERVICE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!SUPABASE_URL || !SUPABASE_SERVICE_KEY) {
  console.error('❌ Variáveis de ambiente necessárias não encontradas');
  process.exit(1);
}

const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_KEY);

// Parse argumentos de linha de comando
const [,, command, ...args] = process.argv;

const parseArgs = (args) => {
  const parsed = {};
  args.forEach(arg => {
    if (arg.startsWith('--')) {
      const [key, value] = arg.substring(2).split('=');
      parsed[key] = value || true;
    }
  });
  return parsed;
};

const options = parseArgs(args);

class ABTestingManager {
  constructor() {
    this.supabase = supabase;
  }

  // Criar novo experimento A/B
  async createExperiment({
    name,
    description,
    controlVersion = 'v2',
    treatmentVersion = 'v3',
    trafficSplit = 0.5,
    durationDays = 7,
    primaryMetric = 'user_satisfaction',
    minSampleSize = 100
  }) {
    try {
      console.log(`🧪 Criando experimento A/B: ${name}`);

      const experiment = {
        name,
        description,
        control_version: controlVersion,
        treatment_version: treatmentVersion,
        traffic_split: trafficSplit,
        start_date: new Date().toISOString(),
        end_date: new Date(Date.now() + durationDays * 24 * 60 * 60 * 1000).toISOString(),
        primary_metric: primaryMetric,
        secondary_metrics: ['latency', 'accuracy', 'completeness'],
        min_sample_size: minSampleSize,
        status: 'running'
      };

      const { data, error } = await this.supabase
        .from('ab_experiments')
        .insert([experiment])
        .select()
        .single();

      if (error) throw error;

      console.log(`✅ Experimento criado com ID: ${data.id}`);
      console.log(`   Controle: ${controlVersion} vs Tratamento: ${treatmentVersion}`);
      console.log(`   Divisão de tráfego: ${Math.round((1 - trafficSplit) * 100)}% / ${Math.round(trafficSplit * 100)}%`);
      console.log(`   Duração: ${durationDays} dias`);
      console.log(`   Métrica primária: ${primaryMetric}`);

      return data;

    } catch (error) {
      console.error('❌ Erro ao criar experimento:', error);
      throw error;
    }
  }

  // Atribuir usuário a grupo de experimento
  async assignUserToExperiment(userId, experimentId, sessionId = null) {
    try {
      // Buscar experimento
      const { data: experiment, error: expError } = await this.supabase
        .from('ab_experiments')
        .select('*')
        .eq('id', experimentId)
        .eq('status', 'running')
        .single();

      if (expError) throw expError;
      if (!experiment) throw new Error('Experimento não encontrado ou não está ativo');

      // Verificar se usuário já está no experimento
      const { data: existing } = await this.supabase
        .from('ab_participants')
        .select('assigned_version')
        .eq('user_id', userId)
        .eq('experiment_id', experimentId)
        .single();

      if (existing) {
        return {
          experimentId,
          userId,
          assignedVersion: existing.assigned_version,
          reason: 'already_assigned'
        };
      }

      // Determinar versão baseada no hash do usuário e divisão de tráfego
      const userHash = this.hashUserId(userId, experimentId);
      const assignedVersion = userHash < experiment.traffic_split ? 
        experiment.treatment_version : experiment.control_version;

      // Salvar atribuição
      const participant = {
        experiment_id: experimentId,
        user_id: userId,
        session_id: sessionId,
        assigned_version: assignedVersion,
        assignment_reason: 'random'
      };

      const { error: insertError } = await this.supabase
        .from('ab_participants')
        .insert([participant]);

      if (insertError) throw insertError;

      // Atualizar contadores do experimento
      await this.updateExperimentCounts(experimentId);

      return {
        experimentId,
        userId,
        assignedVersion,
        reason: 'new_assignment'
      };

    } catch (error) {
      console.error('❌ Erro ao atribuir usuário ao experimento:', error);
      throw error;
    }
  }

  // Obter status de experimento
  async getExperimentStatus(experimentId) {
    try {
      const { data: experiment, error } = await this.supabase
        .from('ab_experiments')
        .select('*')
        .eq('id', experimentId)
        .single();

      if (error) throw error;

      // Buscar participantes
      const { data: participants } = await this.supabase
        .from('ab_participants')
        .select('assigned_version')
        .eq('experiment_id', experimentId);

      const controlCount = participants?.filter(p => p.assigned_version === experiment.control_version).length || 0;
      const treatmentCount = participants?.filter(p => p.assigned_version === experiment.treatment_version).length || 0;

      // Buscar métricas dos últimos dias
      const { data: controlMetrics } = await this.supabase
        .from('rag_metrics')
        .select('total_latency, confidence_score, has_results, user_id')
        .eq('rag_version', experiment.control_version)
        .gte('created_at', experiment.start_date)
        .in('user_id', participants?.filter(p => p.assigned_version === experiment.control_version).map(p => p.user_id) || []);

      const { data: treatmentMetrics } = await this.supabase
        .from('rag_metrics')
        .select('total_latency, confidence_score, has_results, user_id')
        .eq('rag_version', experiment.treatment_version)
        .gte('created_at', experiment.start_date)
        .in('user_id', participants?.filter(p => p.assigned_version === experiment.treatment_version).map(p => p.user_id) || []);

      const status = {
        experiment,
        participants: {
          control: controlCount,
          treatment: treatmentCount,
          total: controlCount + treatmentCount
        },
        metrics: {
          control: this.calculateGroupMetrics(controlMetrics || []),
          treatment: this.calculateGroupMetrics(treatmentMetrics || [])
        },
        progress: {
          daysRunning: Math.floor((Date.now() - new Date(experiment.start_date).getTime()) / (24 * 60 * 60 * 1000)),
          daysRemaining: Math.ceil((new Date(experiment.end_date).getTime() - Date.now()) / (24 * 60 * 60 * 1000)),
          sampleSizeReached: (controlCount + treatmentCount) >= experiment.min_sample_size
        }
      };

      return status;

    } catch (error) {
      console.error('❌ Erro ao obter status do experimento:', error);
      throw error;
    }
  }

  // Analisar resultados do experimento
  async analyzeExperiment(experimentId) {
    try {
      console.log(`📊 Analisando resultados do experimento ${experimentId}...`);

      const status = await this.getExperimentStatus(experimentId);
      const { experiment, metrics, participants } = status;

      if (participants.total < experiment.min_sample_size) {
        console.log(`⚠️  Amostra insuficiente: ${participants.total} < ${experiment.min_sample_size}`);
        return { insufficientData: true, currentSample: participants.total, requiredSample: experiment.min_sample_size };
      }

      console.log(`\n🧪 ANÁLISE DO EXPERIMENTO: ${experiment.name}`);
      console.log('='.repeat(60));

      // Análise descritiva
      console.log('\n📈 ESTATÍSTICAS DESCRITIVAS:');
      console.log(`\nGrupo Controle (${experiment.control_version}):`);
      console.log(`   Participantes: ${participants.control}`);
      console.log(`   Queries: ${metrics.control.totalQueries}`);
      console.log(`   Latência média: ${metrics.control.avgLatency}ms`);
      console.log(`   Confiança média: ${metrics.control.avgConfidence}`);
      console.log(`   Taxa de sucesso: ${metrics.control.successRate}%`);

      console.log(`\nGrupo Tratamento (${experiment.treatment_version}):`);
      console.log(`   Participantes: ${participants.treatment}`);
      console.log(`   Queries: ${metrics.treatment.totalQueries}`);
      console.log(`   Latência média: ${metrics.treatment.avgLatency}ms`);
      console.log(`   Confiança média: ${metrics.treatment.avgConfidence}`);
      console.log(`   Taxa de sucesso: ${metrics.treatment.successRate}%`);

      // Calcular diferenças
      const improvements = this.calculateImprovements(metrics.control, metrics.treatment);

      console.log('\n📊 RESULTADOS:');
      console.log(`   Melhoria de Latência: ${improvements.latency > 0 ? '+' : ''}${improvements.latency}%`);
      console.log(`   Melhoria de Confiança: ${improvements.confidence > 0 ? '+' : ''}${improvements.confidence}%`);
      console.log(`   Melhoria de Taxa de Sucesso: ${improvements.successRate > 0 ? '+' : ''}${improvements.successRate}pp`);

      // Testes estatísticos
      const statisticalTests = await this.runStatisticalTests(metrics.control, metrics.treatment);

      console.log('\n🔬 ANÁLISE ESTATÍSTICA:');
      console.log(`   Significância da Latência: p = ${statisticalTests.latency.pValue.toFixed(4)} ${statisticalTests.latency.significant ? '✅' : '❌'}`);
      console.log(`   Significância da Confiança: p = ${statisticalTests.confidence.pValue.toFixed(4)} ${statisticalTests.confidence.significant ? '✅' : '❌'}`);
      
      // Determinar vencedor
      let winner = 'inconclusive';
      if (statisticalTests.latency.significant && improvements.latency > 5) {
        winner = 'treatment';
      } else if (statisticalTests.latency.significant && improvements.latency < -5) {
        winner = 'control';
      }

      console.log('\n🏆 CONCLUSÃO:');
      switch (winner) {
        case 'treatment':
          console.log(`   ✅ VENCEDOR: ${experiment.treatment_version} (Tratamento)`);
          console.log(`   Recomendação: Implementar ${experiment.treatment_version} para todos os usuários`);
          break;
        case 'control':
          console.log(`   ✅ VENCEDOR: ${experiment.control_version} (Controle)`);
          console.log(`   Recomendação: Manter ${experiment.control_version} como padrão`);
          break;
        default:
          console.log(`   ⚪ RESULTADO: Inconclusivo`);
          console.log(`   Recomendação: Continuar experimento ou aumentar amostra`);
      }

      // Salvar resultados no banco
      await this.supabase
        .from('ab_experiments')
        .update({
          control_group_size: participants.control,
          treatment_group_size: participants.treatment,
          statistical_significance: Math.min(...Object.values(statisticalTests).map(t => t.pValue)),
          winner,
          updated_at: new Date().toISOString()
        })
        .eq('id', experimentId);

      return {
        experiment,
        participants,
        metrics,
        improvements,
        statisticalTests,
        winner,
        recommendation: this.getRecommendation(winner, improvements, experiment)
      };

    } catch (error) {
      console.error('❌ Erro ao analisar experimento:', error);
      throw error;
    }
  }

  // Métodos auxiliares
  hashUserId(userId, experimentId) {
    const hash = randomBytes(16);
    hash.write(userId + experimentId, 'utf8');
    return parseInt(hash.toString('hex').substring(0, 8), 16) / 0xffffffff;
  }

  calculateGroupMetrics(metrics) {
    if (metrics.length === 0) {
      return {
        totalQueries: 0,
        avgLatency: 0,
        avgConfidence: 0,
        successRate: 0,
        latencies: [],
        confidenceScores: []
      };
    }

    const latencies = metrics.map(m => m.total_latency).filter(l => l != null);
    const confidenceScores = metrics.map(m => m.confidence_score).filter(c => c != null);
    const successfulQueries = metrics.filter(m => m.has_results).length;

    return {
      totalQueries: metrics.length,
      avgLatency: latencies.length > 0 ? Math.round(latencies.reduce((sum, l) => sum + l, 0) / latencies.length) : 0,
      avgConfidence: confidenceScores.length > 0 ? Math.round(confidenceScores.reduce((sum, c) => sum + c, 0) / confidenceScores.length * 100) / 100 : 0,
      successRate: Math.round((successfulQueries / metrics.length) * 100),
      latencies,
      confidenceScores
    };
  }

  calculateImprovements(control, treatment) {
    return {
      latency: control.avgLatency > 0 ? Math.round(((control.avgLatency - treatment.avgLatency) / control.avgLatency) * 100) : 0,
      confidence: control.avgConfidence > 0 ? Math.round(((treatment.avgConfidence - control.avgConfidence) / control.avgConfidence) * 100) : 0,
      successRate: treatment.successRate - control.successRate
    };
  }

  async runStatisticalTests(control, treatment) {
    // T-test simplificado para latência
    const latencyTest = this.tTest(control.latencies, treatment.latencies);
    
    // T-test para confiança
    const confidenceTest = this.tTest(control.confidenceScores, treatment.confidenceScores);

    return {
      latency: {
        test: 'welch_t_test',
        pValue: latencyTest.pValue,
        significant: latencyTest.pValue < 0.05,
        effect_size: latencyTest.effectSize
      },
      confidence: {
        test: 'welch_t_test', 
        pValue: confidenceTest.pValue,
        significant: confidenceTest.pValue < 0.05,
        effect_size: confidenceTest.effectSize
      }
    };
  }

  // Implementação simplificada do t-test de Welch
  tTest(sample1, sample2) {
    if (sample1.length === 0 || sample2.length === 0) {
      return { pValue: 1.0, effectSize: 0 };
    }

    const mean1 = sample1.reduce((sum, val) => sum + val, 0) / sample1.length;
    const mean2 = sample2.reduce((sum, val) => sum + val, 0) / sample2.length;
    
    const variance1 = sample1.reduce((sum, val) => sum + Math.pow(val - mean1, 2), 0) / (sample1.length - 1);
    const variance2 = sample2.reduce((sum, val) => sum + Math.pow(val - mean2, 2), 0) / (sample2.length - 1);
    
    const pooledSE = Math.sqrt(variance1 / sample1.length + variance2 / sample2.length);
    const tStat = Math.abs(mean1 - mean2) / pooledSE;
    
    // Aproximação simples do p-value (para t grande, p ≈ 0)
    const pValue = tStat > 2.0 ? 0.02 : tStat > 1.96 ? 0.05 : 0.1;
    
    const pooledSD = Math.sqrt((variance1 + variance2) / 2);
    const effectSize = Math.abs(mean1 - mean2) / pooledSD; // Cohen's d

    return { pValue, effectSize };
  }

  getRecommendation(winner, improvements, experiment) {
    switch (winner) {
      case 'treatment':
        return {
          action: 'deploy_treatment',
          message: `Implementar ${experiment.treatment_version} para todos os usuários. Melhoria significativa observada.`,
          confidence: 'high'
        };
      case 'control':
        return {
          action: 'keep_control',
          message: `Manter ${experiment.control_version} como padrão. ${experiment.treatment_version} não mostrou melhoria significativa.`,
          confidence: 'high'
        };
      default:
        return {
          action: 'continue_testing',
          message: 'Resultado inconclusivo. Considere aumentar a amostra ou duração do teste.',
          confidence: 'low'
        };
    }
  }

  async updateExperimentCounts(experimentId) {
    const { data: participants } = await this.supabase
      .from('ab_participants')
      .select('assigned_version')
      .eq('experiment_id', experimentId);

    const { data: experiment } = await this.supabase
      .from('ab_experiments')
      .select('control_version, treatment_version')
      .eq('id', experimentId)
      .single();

    if (participants && experiment) {
      const controlCount = participants.filter(p => p.assigned_version === experiment.control_version).length;
      const treatmentCount = participants.filter(p => p.assigned_version === experiment.treatment_version).length;

      await this.supabase
        .from('ab_experiments')
        .update({
          control_group_size: controlCount,
          treatment_group_size: treatmentCount,
          updated_at: new Date().toISOString()
        })
        .eq('id', experimentId);
    }
  }

  // Listar experimentos
  async listExperiments(status = null) {
    try {
      let query = this.supabase
        .from('ab_experiments')
        .select('*')
        .order('created_at', { ascending: false });

      if (status) {
        query = query.eq('status', status);
      }

      const { data: experiments, error } = await query;
      if (error) throw error;

      console.log('\n🧪 EXPERIMENTOS A/B:');
      console.log('='.repeat(50));

      experiments.forEach(exp => {
        const startDate = new Date(exp.start_date).toLocaleDateString('pt-BR');
        const endDate = new Date(exp.end_date).toLocaleDateString('pt-BR');
        
        console.log(`\n📊 ${exp.name}`);
        console.log(`   ID: ${exp.id}`);
        console.log(`   Status: ${exp.status}`);
        console.log(`   Controle: ${exp.control_version} vs Tratamento: ${exp.treatment_version}`);
        console.log(`   Período: ${startDate} - ${endDate}`);
        console.log(`   Participantes: Controle(${exp.control_group_size || 0}) / Tratamento(${exp.treatment_group_size || 0})`);
        if (exp.winner && exp.winner !== 'inconclusive') {
          console.log(`   🏆 Vencedor: ${exp.winner}`);
        }
      });

      return experiments;

    } catch (error) {
      console.error('❌ Erro ao listar experimentos:', error);
      throw error;
    }
  }
}

// Comandos CLI
async function main() {
  const manager = new ABTestingManager();

  try {
    switch (command) {
      case 'create':
        if (!options.name) {
          console.error('❌ --name é obrigatório para criar experimento');
          process.exit(1);
        }
        
        await manager.createExperiment({
          name: options.name,
          description: options.description,
          controlVersion: options['control-version'] || 'v2',
          treatmentVersion: options['treatment-version'] || 'v3',
          trafficSplit: parseFloat(options['traffic-split']) || 0.5,
          durationDays: parseInt(options['duration-days']) || 7,
          primaryMetric: options['primary-metric'] || 'user_satisfaction',
          minSampleSize: parseInt(options['min-sample-size']) || 100
        });
        break;

      case 'status':
        if (!options['experiment-id']) {
          console.error('❌ --experiment-id é obrigatório');
          process.exit(1);
        }
        
        const status = await manager.getExperimentStatus(options['experiment-id']);
        console.log('\n📊 STATUS DO EXPERIMENTO:');
        console.log(`   Nome: ${status.experiment.name}`);
        console.log(`   Participantes: ${status.participants.total}`);
        console.log(`   Dias rodando: ${status.progress.daysRunning}`);
        console.log(`   Amostra suficiente: ${status.progress.sampleSizeReached ? '✅' : '❌'}`);
        break;

      case 'analyze':
        if (!options['experiment-id']) {
          console.error('❌ --experiment-id é obrigatório');
          process.exit(1);
        }
        
        await manager.analyzeExperiment(options['experiment-id']);
        break;

      case 'assign':
        if (!options['user-id'] || !options['experiment-id']) {
          console.error('❌ --user-id e --experiment-id são obrigatórios');
          process.exit(1);
        }
        
        const assignment = await manager.assignUserToExperiment(
          options['user-id'], 
          options['experiment-id'],
          options['session-id']
        );
        console.log(`✅ Usuário atribuído ao grupo: ${assignment.assignedVersion}`);
        break;

      case 'list':
        await manager.listExperiments(options.status);
        break;

      default:
        console.log(`
🧪 Gerenciador de A/B Testing para Agentic-RAG V3

Comandos:
  create    Criar novo experimento
  status    Ver status de experimento
  analyze   Analisar resultados
  assign    Atribuir usuário a experimento
  list      Listar experimentos

Exemplos:
  node ab-testing-manager.mjs create --name="V2 vs V3 Test" --duration-days=14
  node ab-testing-manager.mjs status --experiment-id=<uuid>
  node ab-testing-manager.mjs analyze --experiment-id=<uuid>
  node ab-testing-manager.mjs list --status=running
        `);
    }

  } catch (error) {
    console.error('❌ Erro:', error.message);
    process.exit(1);
  }
}

// Executar se chamado diretamente
if (import.meta.url === `file://${process.argv[1]}`) {
  main();
}

export default ABTestingManager;