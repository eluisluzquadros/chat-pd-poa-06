#!/usr/bin/env node

/**
 * Monitor de importação em tempo real
 * 
 * Acompanha o progresso da importação e mostra estatísticas em tempo real
 */

import { createClient } from '@supabase/supabase-js';
import fs from 'fs/promises';
import path from 'path';

const SUPABASE_URL = process.env.SUPABASE_URL || 'http://localhost:54321';
const SUPABASE_ANON_KEY = process.env.SUPABASE_ANON_KEY;

if (!SUPABASE_ANON_KEY) {
  console.error('❌ SUPABASE_ANON_KEY não encontrada');
  process.exit(1);
}

const supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY);

class ImportMonitor {
  constructor() {
    this.startTime = Date.now();
    this.previousCounts = { regime: 0, zots: 0 };
    this.isRunning = true;
  }

  async getCurrentCounts() {
    try {
      const [regimeResult, zotsResult] = await Promise.all([
        supabase.from('regime_urbanistico').select('*', { count: 'exact', head: true }),
        supabase.from('zots_bairros').select('*', { count: 'exact', head: true })
      ]);

      return {
        regime: regimeResult.count || 0,
        zots: zotsResult.count || 0,
        regimeError: regimeResult.error,
        zotsError: zotsResult.error
      };
    } catch (error) {
      return {
        regime: 0,
        zots: 0,
        error: error.message
      };
    }
  }

  calculateProgress(current, expected) {
    return expected > 0 ? Math.min((current / expected) * 100, 100) : 0;
  }

  formatDuration(ms) {
    const seconds = Math.floor(ms / 1000);
    const minutes = Math.floor(seconds / 60);
    const hours = Math.floor(minutes / 60);

    if (hours > 0) {
      return `${hours}h ${minutes % 60}m ${seconds % 60}s`;
    } else if (minutes > 0) {
      return `${minutes}m ${seconds % 60}s`;
    } else {
      return `${seconds}s`;
    }
  }

  generateProgressBar(percentage, width = 30) {
    const filled = Math.floor((percentage / 100) * width);
    const empty = width - filled;
    const bar = '█'.repeat(filled) + '░'.repeat(empty);
    return `[${bar}] ${percentage.toFixed(1)}%`;
  }

  async displayStatus() {
    // Limpar tela
    console.clear();
    
    const counts = await this.getCurrentCounts();
    const elapsed = Date.now() - this.startTime;
    
    // Cabeçalho
    console.log('📊 MONITOR DE IMPORTAÇÃO - REGIME URBANÍSTICO');
    console.log('='.repeat(60));
    console.log(`⏱️  Tempo decorrido: ${this.formatDuration(elapsed)}`);
    console.log(`🔄 Última atualização: ${new Date().toLocaleTimeString()}`);
    console.log('');

    // Status de conectividade
    if (counts.error) {
      console.log('❌ ERRO DE CONEXÃO:', counts.error);
      console.log('');
    } else {
      console.log('✅ Conectado ao Supabase');
    }

    // Progress - Regime Urbanístico
    const regimeProgress = this.calculateProgress(counts.regime, 387);
    const regimeBar = this.generateProgressBar(regimeProgress);
    const regimeStatus = counts.regimeError ? '❌ ERRO' : 
                        counts.regime === 387 ? '✅ COMPLETO' : 
                        counts.regime > 0 ? '🔄 EM PROGRESSO' : '⭕ AGUARDANDO';

    console.log('📋 REGIME URBANÍSTICO:');
    console.log(`   ${regimeStatus}`);
    console.log(`   ${regimeBar}`);
    console.log(`   📊 ${counts.regime}/387 registros`);
    
    if (counts.regimeError) {
      console.log(`   ❌ Erro: ${counts.regimeError.message}`);
    }
    console.log('');

    // Progress - ZOTs vs Bairros
    const zotsProgress = this.calculateProgress(counts.zots, 385);
    const zotsBar = this.generateProgressBar(zotsProgress);
    const zotsStatus = counts.zotsError ? '❌ ERRO' : 
                      counts.zots === 385 ? '✅ COMPLETO' : 
                      counts.zots > 0 ? '🔄 EM PROGRESSO' : '⭕ AGUARDANDO';

    console.log('🗺️  ZOTS VS BAIRROS:');
    console.log(`   ${zotsStatus}`);
    console.log(`   ${zotsBar}`);
    console.log(`   📊 ${counts.zots}/385 registros`);
    
    if (counts.zotsError) {
      console.log(`   ❌ Erro: ${counts.zotsError.message}`);
    }
    console.log('');

    // Progress Total
    const totalCurrent = counts.regime + counts.zots;
    const totalExpected = 387 + 385;
    const totalProgress = this.calculateProgress(totalCurrent, totalExpected);
    const totalBar = this.generateProgressBar(totalProgress);

    console.log('🎯 PROGRESSO TOTAL:');
    console.log(`   ${totalBar}`);
    console.log(`   📊 ${totalCurrent}/${totalExpected} registros`);
    console.log('');

    // Taxa de importação
    const regimeInc = counts.regime - this.previousCounts.regime;
    const zotsInc = counts.zots - this.previousCounts.zots;
    const totalInc = regimeInc + zotsInc;

    if (totalInc > 0) {
      console.log('📈 TAXA DE IMPORTAÇÃO:');
      console.log(`   ⚡ +${totalInc} registros nos últimos 3 segundos`);
      console.log(`   🚀 ~${Math.round(totalInc * 20)} registros/minuto`);
      console.log('');
    }

    // Estimativa de conclusão
    if (totalInc > 0 && totalProgress < 100) {
      const remaining = totalExpected - totalCurrent;
      const rate = totalInc / 3; // registros por segundo
      const estimatedSeconds = remaining / rate;
      console.log('⏳ ESTIMATIVA:');
      console.log(`   🎯 Conclusão em ~${this.formatDuration(estimatedSeconds * 1000)}`);
      console.log('');
    }

    // Status final
    if (counts.regime === 387 && counts.zots === 385) {
      console.log('🎉 IMPORTAÇÃO CONCLUÍDA COM SUCESSO!');
      console.log('   ✅ Todos os registros foram importados');
      console.log('   💡 Execute: npm run regime:test para validar');
      console.log('');
      console.log('Pressione Ctrl+C para sair...');
    } else {
      console.log('⌛ Aguardando próxima atualização...');
      console.log('   💡 Pressione Ctrl+C para sair');
    }

    // Atualizar contadores anteriores
    this.previousCounts = { regime: counts.regime, zots: counts.zots };
  }

  async start() {
    console.log('🚀 Iniciando monitor de importação...\n');
    
    // Handler para Ctrl+C
    process.on('SIGINT', () => {
      console.log('\n\n👋 Monitor interrompido pelo usuário');
      console.log('📊 Importação pode continuar em background');
      process.exit(0);
    });

    // Loop principal
    while (this.isRunning) {
      await this.displayStatus();
      await new Promise(resolve => setTimeout(resolve, 3000)); // Atualizar a cada 3 segundos
    }
  }
}

// Função para mostrar ajuda
function showHelp() {
  console.log(`
📊 MONITOR DE IMPORTAÇÃO - REGIME URBANÍSTICO

DESCRIÇÃO:
  Monitora em tempo real o progresso da importação de dados.

USO:
  node scripts/monitor-import.mjs [opções]

OPÇÕES:
  --help, -h     Mostra esta ajuda
  --once         Mostra status uma vez e sai

EXEMPLOS:
  # Monitor contínuo
  node scripts/monitor-import.mjs

  # Status único
  node scripts/monitor-import.mjs --once

  # Usar com npm
  npm run regime:monitor

DICAS:
  - Execute em um terminal separado durante a importação
  - Use Ctrl+C para sair sem interromper a importação
  - O monitor atualiza a cada 3 segundos
`);
}

// Função para status único
async function showStatusOnce() {
  const monitor = new ImportMonitor();
  await monitor.displayStatus();
}

// Main
async function main() {
  const args = process.argv.slice(2);
  
  if (args.includes('--help') || args.includes('-h')) {
    showHelp();
    return;
  }

  if (args.includes('--once')) {
    await showStatusOnce();
    return;
  }

  const monitor = new ImportMonitor();
  await monitor.start();
}

if (import.meta.url === `file://${process.argv[1]}`) {
  main().catch(error => {
    console.error('❌ Erro no monitor:', error);
    process.exit(1);
  });
}