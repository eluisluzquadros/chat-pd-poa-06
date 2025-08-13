#!/usr/bin/env node

/**
 * Processar embeddings em lotes usando Edge Function
 */

import fetch from 'node-fetch';
import chalk from 'chalk';
import { config } from 'dotenv';
import { fileURLToPath } from 'url';
import path from 'path';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

config({ path: path.join(__dirname, '..', '.env.local') });

const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL;
const SUPABASE_ANON_KEY = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

console.log(chalk.green.bold('🚀 PROCESSANDO EMBEDDINGS EM LOTES'));
console.log(chalk.green.bold('='.repeat(40)));

async function processBatch(offset, batchSize = 10) {
  const url = `${SUPABASE_URL}/functions/v1/fix-embeddings-batch`;
  
  try {
    const response = await fetch(url, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${SUPABASE_ANON_KEY}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        batch_size: batchSize,
        offset: offset
      })
    });
    
    if (!response.ok) {
      const error = await response.text();
      console.error(chalk.red(`❌ Erro no lote ${offset}:`), error);
      return null;
    }
    
    const result = await response.json();
    return result;
    
  } catch (error) {
    console.error(chalk.red(`❌ Erro no lote ${offset}:`), error.message);
    return null;
  }
}

async function processAll() {
  const batchSize = 10;
  let offset = 0;
  let totalProcessed = 0;
  let totalFailed = 0;
  let hasMore = true;
  
  console.log(`\n📦 Processando em lotes de ${batchSize} documentos\n`);
  
  while (hasMore) {
    console.log(chalk.cyan(`\nLote iniciando em ${offset}...`));
    
    const result = await processBatch(offset, batchSize);
    
    if (!result) {
      console.log(chalk.yellow('⚠️ Pulando lote com erro'));
      offset += batchSize;
      continue;
    }
    
    totalProcessed += result.processed;
    totalFailed += result.failed;
    
    console.log(`  ✅ Processados: ${result.processed}`);
    console.log(`  ❌ Falhas: ${result.failed}`);
    console.log(`  📊 Total de docs: ${result.total_docs}`);
    console.log(`  ⏭️ Tem mais: ${result.has_more ? 'Sim' : 'Não'}`);
    
    hasMore = result.has_more;
    offset = result.next_offset || offset + batchSize;
    
    // Progresso geral
    const progress = ((offset / result.total_docs) * 100).toFixed(1);
    console.log(chalk.gray(`\nProgresso geral: ${progress}%`));
    
    // Pausa entre lotes para não sobrecarregar
    if (hasMore) {
      console.log(chalk.gray('Aguardando 2s antes do próximo lote...'));
      await new Promise(resolve => setTimeout(resolve, 2000));
    }
  }
  
  console.log(chalk.green.bold('\n' + '='.repeat(40)));
  console.log(chalk.green.bold('📊 RESULTADO FINAL'));
  console.log(chalk.green.bold('='.repeat(40) + '\n'));
  
  console.log(`✅ Total processados: ${totalProcessed}`);
  console.log(`❌ Total de falhas: ${totalFailed}`);
  
  if (totalFailed === 0) {
    console.log(chalk.green.bold('\n🎉 TODOS EMBEDDINGS PROCESSADOS COM SUCESSO!'));
    console.log('\nPróximo passo: Testar o vector search');
    console.log(chalk.cyan('node scripts/03-test-vector-search.mjs'));
  } else {
    console.log(chalk.yellow(`\n⚠️ Houve ${totalFailed} falhas`));
    console.log('Verifique os logs em:');
    console.log('https://supabase.com/dashboard/project/ngrqwmvuhvjkeohesbxs/functions/fix-embeddings-batch/logs');
  }
}

processAll().catch(console.error);