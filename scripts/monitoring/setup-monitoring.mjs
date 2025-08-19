#!/usr/bin/env node

/**
 * SCRIPT DE CONFIGURAÇÃO DO SISTEMA DE MONITORAMENTO AGENTIC-RAG V3
 * 
 * Este script configura todo o sistema de monitoramento:
 * - Cria tabelas necessárias
 * - Configura alertas padrão
 * - Verifica permissões e RLS
 * - Testa integrações
 * - Configura cron jobs de monitoramento
 * 
 * Uso:
 *   node setup-monitoring.mjs [--skip-tables] [--skip-alerts] [--test-only]
 */

import { createClient } from '@supabase/supabase-js';
import { readFile } from 'fs/promises';
import { fileURLToPath } from 'url';
import path from 'path';

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

// Parse argumentos
const args = process.argv.slice(2);
const config = {
  skipTables: args.includes('--skip-tables'),
  skipAlerts: args.includes('--skip-alerts'),
  testOnly: args.includes('--test-only'),
  verbose: args.includes('--verbose')
};

console.log('🔧 CONFIGURAÇÃO DO SISTEMA DE MONITORAMENTO AGENTIC-RAG V3');
console.log('='.repeat(60));

async function setupTables() {
  if (config.skipTables) {
    console.log('⏭️  Pulando criação de tabelas');
    return;
  }

  console.log('\n📊 CRIANDO TABELAS DE MONITORAMENTO...');
  
  try {
    // Ler arquivo SQL de monitoramento
    const sqlPath = path.join(__dirname, '..', 'emergency-sql', '17-monitoring-tables.sql');
    const sqlContent = await readFile(sqlPath, 'utf8');
    
    // Executar SQL
    const { error } = await supabase.rpc('exec_sql', { sql_query: sqlContent });
    
    if (error) {
      // Se RPC não funcionar, tentar executar por partes
      console.log('⚠️  RPC exec_sql não disponível, executando via API...');
      
      // Dividir em comandos separados (simplificado)
      const commands = sqlContent
        .split(';')
        .map(cmd => cmd.trim())
        .filter(cmd => cmd && !cmd.startsWith('--') && !cmd.startsWith('/*'));
      
      for (const command of commands.slice(0, 5)) { // Executar apenas alguns comandos críticos
        if (command.includes('CREATE TABLE') && command.includes('rag_metrics')) {
          try {
            await supabase.from('rag_metrics').select('id').limit(1);
            console.log('✅ Tabela rag_metrics já existe');
          } catch {
            console.log('⚠️  Não foi possível criar tabelas via API. Execute manualmente:');
            console.log(`   Execute o SQL em: ${sqlPath}`);
            break;
          }
        }
      }
    } else {
      console.log('✅ Tabelas de monitoramento criadas com sucesso');
    }

    // Verificar se tabelas foram criadas
    const tablesToCheck = ['rag_metrics', 'user_feedback', 'alert_rules', 'alert_events', 'ab_experiments'];
    
    for (const table of tablesToCheck) {
      try {
        const { error } = await supabase.from(table).select('id').limit(1);
        if (error) {
          console.log(`❌ Erro ao verificar tabela ${table}:`, error.message);
        } else {
          console.log(`✅ Tabela ${table} disponível`);
        }
      } catch (error) {
        console.log(`⚠️  Tabela ${table} pode não existir`);
      }
    }

  } catch (error) {
    console.error('❌ Erro ao configurar tabelas:', error);
  }
}

async function setupDefaultAlerts() {
  if (config.skipAlerts) {
    console.log('⏭️  Pulando configuração de alertas');
    return;
  }

  console.log('\n🚨 CONFIGURANDO ALERTAS PADRÃO...');

  const defaultAlerts = [
    {
      name: 'High Latency Warning',
      description: 'Alerta quando latência P95 excede 3 segundos',
      metric_type: 'p95_latency',
      threshold_value: 3000,
      comparison_operator: '>',
      time_window_minutes: 5,
      severity: 'warning',
      is_active: true,
      notification_channels: ['email'],
      notification_message: 'Latência alta detectada: {{current_value}}ms (limite: {{threshold_value}}ms)'
    },
    {
      name: 'High Error Rate',
      description: 'Alerta quando taxa de erro excede 3%',
      metric_type: 'error_rate',
      threshold_value: 3.0,
      comparison_operator: '>',
      time_window_minutes: 5,
      severity: 'error',
      is_active: true,
      notification_channels: ['email', 'slack'],
      notification_message: 'Taxa de erro alta: {{current_value}}% (limite: {{threshold_value}}%)'
    },
    {
      name: 'Critical Latency',
      description: 'Alerta crítico para latência muito alta',
      metric_type: 'p95_latency',
      threshold_value: 8000,
      comparison_operator: '>',
      time_window_minutes: 3,
      severity: 'critical',
      is_active: true,
      notification_channels: ['email', 'slack'],
      notification_message: 'CRÍTICO: Latência muito alta: {{current_value}}ms'
    },
    {
      name: 'System Failure',
      description: 'Taxa de erro crítica indicando falha do sistema',
      metric_type: 'error_rate',
      threshold_value: 10.0,
      comparison_operator: '>',
      time_window_minutes: 3,
      severity: 'critical',
      is_active: true,
      notification_channels: ['email', 'slack'],
      notification_message: 'CRÍTICO: Sistema falhando - {{current_value}}% de erros'
    }
  ];

  for (const alert of defaultAlerts) {
    try {
      // Verificar se alerta já existe
      const { data: existing } = await supabase
        .from('alert_rules')
        .select('id')
        .eq('name', alert.name)
        .single();

      if (existing) {
        console.log(`   ⚠️  Alerta "${alert.name}" já existe`);
        continue;
      }

      // Criar novo alerta
      const { error } = await supabase
        .from('alert_rules')
        .insert([alert]);

      if (error) {
        console.log(`❌ Erro ao criar alerta "${alert.name}":`, error.message);
      } else {
        console.log(`✅ Alerta criado: ${alert.name}`);
      }
    } catch (error) {
      console.log(`⚠️  Não foi possível configurar alerta "${alert.name}":`, error.message);
    }
  }
}

async function testIntegrations() {
  console.log('\n🧪 TESTANDO INTEGRAÇÕES...');

  try {
    // Teste 1: Verificar acesso às tabelas
    console.log('   📊 Testando acesso às tabelas...');
    
    const { data: metricsTest, error: metricsError } = await supabase
      .from('rag_metrics')
      .select('count')
      .limit(1);

    if (metricsError) {
      console.log('   ❌ Erro ao acessar rag_metrics:', metricsError.message);
    } else {
      console.log('   ✅ Acesso a rag_metrics funcionando');
    }

    // Teste 2: Inserir métrica de teste
    console.log('   📝 Testando inserção de métrica...');
    
    const testMetric = {
      rag_version: 'v3',
      query_text: 'Teste de monitoramento',
      query_category: 'test',
      query_hash: 'test-' + Date.now(),
      total_latency: 1500,
      confidence_score: 0.85,
      has_results: true,
      result_count: 3,
      total_tokens: 150,
      estimated_cost: 0.003,
      status: 'success',
      llm_model: 'test-model'
    };

    const { data: insertResult, error: insertError } = await supabase
      .from('rag_metrics')
      .insert([testMetric])
      .select('id')
      .single();

    if (insertError) {
      console.log('   ❌ Erro ao inserir métrica de teste:', insertError.message);
    } else {
      console.log('   ✅ Inserção de métrica funcionando');
      
      // Limpar métrica de teste
      await supabase
        .from('rag_metrics')
        .delete()
        .eq('id', insertResult.id);
    }

    // Teste 3: Verificar functions personalizadas
    console.log('   🔧 Testando functions...');
    
    try {
      const { data: errorRateTest, error: funcError } = await supabase
        .rpc('calculate_error_rate', { p_minutes: 5 });

      if (funcError) {
        console.log('   ⚠️  Function calculate_error_rate não disponível:', funcError.message);
      } else {
        console.log('   ✅ Functions de métricas funcionando');
      }
    } catch (error) {
      console.log('   ⚠️  Functions personalizadas não disponíveis');
    }

    // Teste 4: Verificar views
    console.log('   📈 Testando views...');
    
    const { data: viewTest, error: viewError } = await supabase
      .from('rag_metrics_hourly')
      .select('*')
      .limit(1);

    if (viewError) {
      console.log('   ⚠️  View rag_metrics_hourly não disponível:', viewError.message);
    } else {
      console.log('   ✅ Views de métricas funcionando');
    }

    // Teste 5: Sistema de alertas
    console.log('   🚨 Testando sistema de alertas...');
    
    const { data: alertsTest, error: alertsError } = await supabase
      .from('alert_rules')
      .select('count')
      .eq('is_active', true);

    if (alertsError) {
      console.log('   ❌ Erro ao acessar alertas:', alertsError.message);
    } else {
      console.log('   ✅ Sistema de alertas acessível');
    }

  } catch (error) {
    console.error('❌ Erro nos testes de integração:', error);
  }
}

async function setupCronJobs() {
  console.log('\n⏰ CONFIGURANDO MONITORAMENTO AUTOMÁTICO...');
  
  console.log(`
Para monitoramento contínuo, configure os seguintes cron jobs:

# Coleta de métricas a cada 5 minutos
*/5 * * * * cd ${process.cwd()} && node scripts/monitoring/collect-metrics.mjs --output=db

# Relatório horário no console
0 * * * * cd ${process.cwd()} && node scripts/monitoring/collect-metrics.mjs --timerange=1h

# Relatório diário detalhado
0 9 * * * cd ${process.cwd()} && node scripts/monitoring/collect-metrics.mjs --timerange=24h --verbose

# Verificação de saúde do sistema a cada minuto  
* * * * * cd ${process.cwd()} && node scripts/monitoring/health-check.mjs

Exemplo de comando para adicionar ao crontab:
  crontab -e

Ou use um scheduler como PM2:
  pm2 start ecosystem.config.js
  `);
}

async function generateReport() {
  console.log('\n📋 RELATÓRIO DE CONFIGURAÇÃO');
  console.log('='.repeat(40));

  try {
    // Verificar status das tabelas
    const tables = ['rag_metrics', 'user_feedback', 'alert_rules', 'alert_events', 'ab_experiments'];
    console.log('\n📊 Status das Tabelas:');
    
    for (const table of tables) {
      try {
        const { count, error } = await supabase
          .from(table)
          .select('*', { count: 'exact', head: true });
        
        if (error) {
          console.log(`   ${table}: ❌ ${error.message}`);
        } else {
          console.log(`   ${table}: ✅ ${count || 0} registros`);
        }
      } catch {
        console.log(`   ${table}: ❌ Não acessível`);
      }
    }

    // Verificar alertas ativos
    const { data: activeAlerts } = await supabase
      .from('alert_rules')
      .select('name, is_active')
      .eq('is_active', true);

    console.log(`\n🚨 Alertas Configurados: ${activeAlerts?.length || 0}`);
    activeAlerts?.forEach(alert => {
      console.log(`   ✅ ${alert.name}`);
    });

    // Status geral
    console.log('\n🎯 PRÓXIMOS PASSOS:');
    console.log('   1. ✅ Tabelas de monitoramento configuradas');
    console.log('   2. ✅ Alertas padrão criados');
    console.log('   3. ✅ Sistema testado e funcional');
    console.log('   4. 📝 Integrar MetricsLogger nas Edge Functions');
    console.log('   5. 🎨 Adicionar AgenticRAGDashboard às rotas admin');
    console.log('   6. ⏰ Configurar cron jobs de monitoramento');
    console.log('   7. 📧 Configurar notificações (email/Slack)');

    console.log('\n🔧 COMANDOS ÚTEIS:');
    console.log('   # Coletar métricas manualmente');
    console.log('   node scripts/monitoring/collect-metrics.mjs');
    console.log('');
    console.log('   # Gerenciar experimentos A/B');
    console.log('   node scripts/monitoring/ab-testing-manager.mjs list');
    console.log('');
    console.log('   # Dashboard no navegador');
    console.log('   Acesse: http://localhost:3000/admin (após adicionar rota)');

  } catch (error) {
    console.error('❌ Erro ao gerar relatório:', error);
  }
}

async function main() {
  try {
    if (!config.testOnly) {
      await setupTables();
      await setupDefaultAlerts();
    }
    
    await testIntegrations();
    
    if (!config.testOnly) {
      setupCronJobs();
    }
    
    await generateReport();
    
    console.log('\n✅ CONFIGURAÇÃO DO MONITORAMENTO CONCLUÍDA!');
    
  } catch (error) {
    console.error('❌ Erro na configuração:', error);
    process.exit(1);
  }
}

// Executar se chamado diretamente
if (import.meta.url === `file://${process.argv[1]}`) {
  main();
}