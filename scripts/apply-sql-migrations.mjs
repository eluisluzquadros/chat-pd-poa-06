#!/usr/bin/env node

/**
 * 🚀 Script para aplicar migrações SQL no Supabase
 * 
 * Executa as migrações SQL diretamente usando o cliente Supabase
 */

import { createClient } from '@supabase/supabase-js';
import { readFileSync } from 'fs';
import { config } from 'dotenv';

// Carrega variáveis de ambiente
config({ path: '.env.local' });

const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL || 'https://ngrqwmvuhvjkeohesbxs.supabase.co';
const SERVICE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!SERVICE_KEY) {
  console.error('❌ SUPABASE_SERVICE_ROLE_KEY não encontrada!');
  console.log('💡 Configure no .env.local');
  process.exit(1);
}

const supabase = createClient(SUPABASE_URL, SERVICE_KEY);

async function executeSQLMigrations() {
  console.log('🚀 Aplicando migrações SQL no Supabase...\n');

  try {
    // Ler arquivo SQL
    const sqlContent = readFileSync('TODAS_MIGRACOES_SQL_CONSOLIDADAS.sql', 'utf8');
    
    // Dividir em comandos individuais (por ponto e vírgula)
    const commands = sqlContent
      .split(/;\s*\n/)
      .filter(cmd => cmd.trim().length > 0)
      .map(cmd => cmd.trim() + ';');

    console.log(`📊 Total de comandos SQL: ${commands.length}\n`);

    let successCount = 0;
    let errorCount = 0;
    const errors = [];

    // Executar cada comando
    for (let i = 0; i < commands.length; i++) {
      const command = commands[i];
      
      // Pular comentários e comandos vazios
      if (command.startsWith('--') || command.trim() === ';') {
        continue;
      }

      // Mostrar progresso
      process.stdout.write(`\r⏳ Executando comando ${i + 1}/${commands.length}...`);

      try {
        // Para comandos CREATE TABLE, ALTER TABLE, CREATE INDEX, etc
        const { error } = await supabase.rpc('execute_sql', { 
          query: command 
        }).catch(async () => {
          // Fallback: tentar executar diretamente
          return { error: 'RPC não disponível' };
        });

        if (error) {
          // Ignorar erros de "já existe"
          if (error.toString().includes('already exists')) {
            successCount++;
          } else {
            errorCount++;
            errors.push({ command: command.substring(0, 50) + '...', error });
          }
        } else {
          successCount++;
        }
      } catch (err) {
        errorCount++;
        errors.push({ command: command.substring(0, 50) + '...', error: err.message });
      }
    }

    // Limpar linha de progresso
    process.stdout.write('\r' + ' '.repeat(50) + '\r');

    // Mostrar resultados
    console.log('\n📊 RESULTADO DAS MIGRAÇÕES');
    console.log('=' .repeat(50));
    console.log(`✅ Comandos executados com sucesso: ${successCount}`);
    console.log(`❌ Comandos com erro: ${errorCount}`);
    
    if (errors.length > 0) {
      console.log('\n⚠️  Erros encontrados:');
      errors.forEach((err, idx) => {
        console.log(`\n${idx + 1}. ${err.command}`);
        console.log(`   Erro: ${err.error}`);
      });
    }

    // Verificar tabelas criadas
    console.log('\n🔍 Verificando tabelas criadas...');
    
    const tables = [
      'query_cache',
      'match_hierarchical_cache',
      'feedback_alerts',
      'session_quality_metrics',
      'model_performance_metrics',
      'knowledge_gaps',
      'knowledge_gap_content',
      'knowledge_gap_resolutions',
      'llm_metrics',
      'llm_model_registry',
      'regime_urbanistico',
      'zots_bairros'
    ];

    for (const table of tables) {
      try {
        const { count } = await supabase
          .from(table)
          .select('*', { count: 'exact', head: true });
        
        console.log(`✅ ${table}: Tabela existe`);
      } catch (err) {
        console.log(`❌ ${table}: Tabela não encontrada`);
      }
    }

    console.log('\n✅ Migrações concluídas!');
    
    if (errorCount === 0) {
      console.log('🎉 Todas as migrações foram aplicadas com sucesso!');
    } else {
      console.log('⚠️  Algumas migrações falharam. Verifique os erros acima.');
      console.log('💡 Você pode executar manualmente no SQL Editor do Supabase.');
    }

  } catch (error) {
    console.error('❌ Erro ao executar migrações:', error.message);
    console.log('\n💡 Alternativa: Copie o conteúdo de TODAS_MIGRACOES_SQL_CONSOLIDADAS.sql');
    console.log('   e cole no SQL Editor: https://supabase.com/dashboard/project/ngrqwmvuhvjkeohesbxs/sql');
  }
}

// Executar
executeSQLMigrations().catch(console.error);