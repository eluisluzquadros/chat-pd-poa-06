#!/usr/bin/env node

/**
 * CLI principal para gerenciamento de dados de regime urbanístico
 * 
 * Comandos disponíveis:
 * - import: Importa os dados processados
 * - test: Valida os dados importados
 * - setup: Configura funções necessárias
 * - status: Verifica status atual dos dados
 * - clean: Limpa dados importados
 */

import { program } from 'commander';
import { createClient } from '@supabase/supabase-js';
import { spawn } from 'child_process';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Configuração do Supabase
const SUPABASE_URL = process.env.SUPABASE_URL || 'http://localhost:54321';
const SUPABASE_ANON_KEY = process.env.SUPABASE_ANON_KEY;

if (!SUPABASE_ANON_KEY) {
  console.error('❌ SUPABASE_ANON_KEY não encontrada nas variáveis de ambiente');
  process.exit(1);
}

const supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY);

// Utilitários
function runScript(scriptName, args = []) {
  return new Promise((resolve, reject) => {
    const scriptPath = path.join(__dirname, scriptName);
    const child = spawn('node', [scriptPath, ...args], {
      stdio: 'inherit',
      env: process.env
    });

    child.on('close', (code) => {
      if (code === 0) {
        resolve(code);
      } else {
        reject(new Error(`Script ${scriptName} falhou com código ${code}`));
      }
    });

    child.on('error', (error) => {
      reject(error);
    });
  });
}

async function checkStatus() {
  console.log('🔍 Verificando status atual dos dados...\n');

  try {
    // Verificar tabela regime_urbanistico
    const { count: regimeCount, error: regimeError } = await supabase
      .from('regime_urbanistico')
      .select('*', { count: 'exact', head: true });

    if (regimeError) {
      console.log('❌ Tabela regime_urbanistico: NÃO EXISTE ou SEM ACESSO');
      console.log(`   Erro: ${regimeError.message}`);
    } else {
      const status = regimeCount === 387 ? '✅' : regimeCount > 0 ? '⚠️ ' : '❌';
      console.log(`${status} Tabela regime_urbanistico: ${regimeCount || 0} registros (esperado: 387)`);
    }

    // Verificar tabela zots_bairros
    const { count: zotsCount, error: zotsError } = await supabase
      .from('zots_bairros')
      .select('*', { count: 'exact', head: true });

    if (zotsError) {
      console.log('❌ Tabela zots_bairros: NÃO EXISTE ou SEM ACESSO');
      console.log(`   Erro: ${zotsError.message}`);
    } else {
      const status = zotsCount === 385 ? '✅' : zotsCount > 0 ? '⚠️ ' : '❌';
      console.log(`${status} Tabela zots_bairros: ${zotsCount || 0} registros (esperado: 385)`);
    }

    // Teste de conectividade
    const { data: testData, error: testError } = await supabase
      .from('information_schema.tables')
      .select('table_name')
      .limit(1);

    if (testError) {
      console.log('❌ Conectividade: FALHA');
      console.log(`   Erro: ${testError.message}`);
    } else {
      console.log('✅ Conectividade: OK');
    }

    // Resumo
    const regimeOk = !regimeError && regimeCount === 387;
    const zotsOk = !zotsError && zotsCount === 385;
    const totalExpected = 387 + 385;
    const totalActual = (regimeCount || 0) + (zotsCount || 0);

    console.log('\n📊 RESUMO:');
    console.log(`   Total de registros: ${totalActual}/${totalExpected}`);
    
    if (regimeOk && zotsOk) {
      console.log('   Status geral: ✅ DADOS COMPLETOS');
      return 'complete';
    } else if (totalActual > 0) {
      console.log('   Status geral: ⚠️  DADOS PARCIAIS');  
      return 'partial';
    } else {
      console.log('   Status geral: ❌ SEM DADOS');
      return 'empty';
    }

  } catch (error) {
    console.error('❌ Erro ao verificar status:', error.message);
    return 'error';
  }
}

async function cleanData() {
  console.log('🧹 Limpando dados de regime urbanístico...\n');

  try {
    // Limpar regime_urbanistico
    console.log('🗑️  Limpando tabela regime_urbanistico...');
    const { error: regimeError } = await supabase
      .from('regime_urbanistico')
      .delete()
      .neq('id', 0);

    if (regimeError && !regimeError.message.includes('relation') && !regimeError.message.includes('does not exist')) {
      console.log(`⚠️  Aviso ao limpar regime_urbanistico: ${regimeError.message}`);
    } else {
      console.log('✅ Tabela regime_urbanistico limpa');
    }

    // Limpar zots_bairros
    console.log('🗑️  Limpando tabela zots_bairros...');
    const { error: zotsError } = await supabase
      .from('zots_bairros')
      .delete()
      .neq('id', 0);

    if (zotsError && !zotsError.message.includes('relation') && !zotsError.message.includes('does not exist')) {
      console.log(`⚠️  Aviso ao limpar zots_bairros: ${zotsError.message}`);
    } else {
      console.log('✅ Tabela zots_bairros limpa');
    }

    console.log('\n✅ Limpeza concluída com sucesso!');
    return true;

  } catch (error) {
    console.error('❌ Erro durante a limpeza:', error.message);
    return false;
  }
}

// Configuração do CLI
program
  .name('regime-urbanistico-cli')
  .description('CLI para gerenciamento de dados de regime urbanístico')
  .version('1.0.0');

program
  .command('status')
  .description('Verifica o status atual dos dados no banco')
  .action(async () => {
    await checkStatus();
  });

program
  .command('setup')
  .description('Configura funções necessárias no banco')
  .action(async () => {
    try {
      console.log('🔧 Executando configuração...\n');
      await runScript('setup-import-functions.mjs');
      console.log('\n✅ Configuração concluída!');
    } catch (error) {
      console.error('❌ Erro na configuração:', error.message);
      process.exit(1);
    }
  });

program
  .command('import')
  .description('Importa os dados processados para o banco')
  .option('-f, --force', 'Força a reimportação mesmo com dados existentes')
  .option('-d, --direct', 'Usa importação direta (recomendado)')
  .action(async (options) => {
    try {
      // Verificar status atual
      const status = await checkStatus();
      
      if (status === 'complete' && !options.force) {
        console.log('\n⚠️  Dados já estão completos no banco.');
        console.log('💡 Use --force para reimportar ou "clean" para limpar primeiro.');
        return;
      }

      if (status === 'partial' && !options.force) {
        console.log('\n⚠️  Dados parciais encontrados no banco.');
        console.log('💡 Use --force para reimportar ou "clean" para limpar primeiro.');
        return;
      }

      console.log('\n🚀 Iniciando importação...\n');
      
      if (options.direct) {
        await runScript('import-regime-direct.mjs');
      } else {
        await runScript('import-regime-urbanistico.mjs');
      }
      
      console.log('\n✅ Importação concluída!');
      
      // Verificar status final
      console.log('\n📊 Verificando resultado...');
      await checkStatus();
      
    } catch (error) {
      console.error('❌ Erro na importação:', error.message);
      process.exit(1);
    }
  });

program
  .command('test')
  .description('Executa testes de validação dos dados importados')
  .action(async () => {
    try {
      console.log('🧪 Executando testes de validação...\n');
      await runScript('test-regime-import.mjs');
      console.log('\n✅ Testes concluídos!');
    } catch (error) {
      console.error('❌ Erro nos testes:', error.message);
      process.exit(1);
    }
  });

program
  .command('clean')
  .description('Remove todos os dados de regime urbanístico do banco')
  .option('-y, --yes', 'Confirma a limpeza sem perguntar')
  .action(async (options) => {
    if (!options.yes) {
      console.log('⚠️  Esta operação irá remover TODOS os dados de regime urbanístico!');
      console.log('💡 Use --yes para confirmar: npm run regime:clean -- --yes');
      return;
    }

    const success = await cleanData();
    if (!success) {
      process.exit(1);
    }
  });

program
  .command('full-setup')
  .description('Executa configuração completa: setup + import + test')
  .option('-f, --force', 'Força reimportação se dados existirem')
  .action(async (options) => {
    try {
      console.log('🚀 Executando configuração completa...\n');

      // 1. Setup
      console.log('1️⃣ Configurando funções...');
      try {
        await runScript('setup-import-functions.mjs');
      } catch (error) {
        console.log('⚠️  Setup com problemas, continuando...');
      }

      // 2. Import
      console.log('\n2️⃣ Importando dados...');
      
      const status = await checkStatus();
      if (status === 'complete' && !options.force) {
        console.log('⚠️  Dados completos já existem, pulando importação');
        console.log('💡 Use --force para reimportar');
      } else {
        await runScript('import-regime-direct.mjs');
      }

      // 3. Test
      console.log('\n3️⃣ Validando importação...');
      await runScript('test-regime-import.mjs');

      console.log('\n🎉 CONFIGURAÇÃO COMPLETA FINALIZADA!');
      console.log('✅ Sistema pronto para uso');

    } catch (error) {
      console.error('❌ Erro na configuração completa:', error.message);
      process.exit(1);
    }
  });

program
  .command('help-examples')
  .description('Mostra exemplos de uso do CLI')
  .action(() => {
    console.log(`
🎯 EXEMPLOS DE USO:

📊 Verificar status dos dados:
   node scripts/regime-urbanistico-cli.mjs status

🏗️  Configuração completa (recomendado para primeira vez):
   node scripts/regime-urbanistico-cli.mjs full-setup

📥 Importar apenas os dados:
   node scripts/regime-urbanistico-cli.mjs import --direct

🧪 Testar dados importados:
   node scripts/regime-urbanistico-cli.mjs test

🧹 Limpar dados (cuidado!):
   node scripts/regime-urbanistico-cli.mjs clean --yes

🔄 Reimportar forçadamente:
   node scripts/regime-urbanistico-cli.mjs import --force --direct

💡 DICAS:
   - Use "full-setup" na primeira execução
   - Use "--direct" para importação mais estável
   - Use "--force" apenas quando necessário
   - Sempre execute "test" após importação
`);
  });

// Parse dos argumentos e execução
program.parse();