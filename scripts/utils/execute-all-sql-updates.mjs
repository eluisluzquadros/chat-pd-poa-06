#!/usr/bin/env node
/**
 * Script para executar todas as atualizações SQL de compliance ABNT
 */

import { createClient } from '@supabase/supabase-js';
import fs from 'fs/promises';
import path from 'path';
import dotenv from 'dotenv';

dotenv.config({ path: '.env' });

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY
);

const SQL_SCRIPTS = [
  'update-article-4-luos.sql',
  'create-luos-hierarchy.sql', 
  'create-pdus-hierarchy.sql',
  'create-anexos-structure.sql',
  'create-navigation-system.sql'
];

async function executeSQLFile(filename) {
  console.log(`\n📝 Executando: ${filename}`);
  console.log('=' .repeat(60));
  
  try {
    // Ler arquivo SQL
    const sqlPath = path.join('scripts', 'sql', filename);
    const sqlContent = await fs.readFile(sqlPath, 'utf8');
    
    // Dividir em comandos individuais (por ponto-e-vírgula)
    const commands = sqlContent
      .split(/;\s*$/m)
      .filter(cmd => cmd.trim().length > 0)
      .map(cmd => cmd.trim() + ';');
    
    let successCount = 0;
    let errorCount = 0;
    
    for (const command of commands) {
      // Pular comentários puros
      if (command.startsWith('--') && !command.includes('CREATE') && !command.includes('INSERT')) {
        continue;
      }
      
      // Executar comando
      try {
        const { error } = await supabase.rpc('execute_sql', {
          sql_query: command
        });
        
        if (error) {
          console.error(`❌ Erro: ${error.message}`);
          errorCount++;
        } else {
          successCount++;
          process.stdout.write('.');
        }
      } catch (err) {
        // Se RPC não existe, tentar método alternativo
        console.log('\n⚠️ RPC execute_sql não disponível, pulando comando complexo');
        errorCount++;
      }
    }
    
    console.log(`\n✅ Concluído: ${successCount} comandos executados, ${errorCount} erros`);
    return { success: successCount, errors: errorCount };
    
  } catch (err) {
    console.error(`❌ Erro ao ler arquivo: ${err.message}`);
    return { success: 0, errors: 1 };
  }
}

async function executeAllScripts() {
  console.log('🚀 EXECUTANDO SCRIPTS DE COMPLIANCE ABNT');
  console.log('=' .repeat(60));
  
  const results = [];
  
  for (const script of SQL_SCRIPTS) {
    const result = await executeSQLFile(script);
    results.push({ script, ...result });
  }
  
  // Resumo final
  console.log('\n\n📊 RESUMO DA EXECUÇÃO');
  console.log('=' .repeat(60));
  
  let totalSuccess = 0;
  let totalErrors = 0;
  
  results.forEach(r => {
    const status = r.errors === 0 ? '✅' : '⚠️';
    console.log(`${status} ${r.script}: ${r.success} sucessos, ${r.errors} erros`);
    totalSuccess += r.success;
    totalErrors += r.errors;
  });
  
  console.log('\n' + '=' .repeat(60));
  console.log(`TOTAL: ${totalSuccess} comandos executados, ${totalErrors} erros`);
  
  if (totalErrors === 0) {
    console.log('\n🎉 TODOS OS SCRIPTS EXECUTADOS COM SUCESSO!');
  } else {
    console.log('\n⚠️ Alguns erros ocorreram. Verifique os logs acima.');
  }
}

// Executar
executeAllScripts().catch(console.error);