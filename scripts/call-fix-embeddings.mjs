#!/usr/bin/env node

/**
 * Chamar a Edge Function fix-embeddings
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

console.log(chalk.green.bold('🚀 CHAMANDO EDGE FUNCTION FIX-EMBEDDINGS'));
console.log(chalk.green.bold('='.repeat(40)));

async function callFunction() {
  const url = `${SUPABASE_URL}/functions/v1/fix-embeddings`;
  
  console.log('\n📡 Chamando:', url);
  console.log('\n⏳ Isso pode levar alguns minutos...\n');
  
  try {
    const response = await fetch(url, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${SUPABASE_ANON_KEY}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({})
    });
    
    if (!response.ok) {
      const error = await response.text();
      console.error(chalk.red('❌ Erro HTTP:'), response.status);
      console.error(chalk.red('Resposta:'), error);
      return;
    }
    
    const result = await response.json();
    
    console.log(chalk.green.bold('\n✅ FUNÇÃO EXECUTADA COM SUCESSO!\n'));
    console.log('📊 Resultado:');
    console.log(`  Processados: ${result.processed}`);
    console.log(`  Falhas: ${result.failed}`);
    console.log(`  Total: ${result.total}`);
    
    if (result.processed === result.total) {
      console.log(chalk.green.bold('\n🎉 TODOS EMBEDDINGS CORRIGIDOS!'));
      console.log('\nPróximo passo: Testar o vector search');
      console.log(chalk.cyan('node scripts/03-test-vector-search.mjs'));
    }
    
  } catch (error) {
    console.error(chalk.red('\n❌ Erro:'), error.message);
    console.log('\nVerifique os logs da função em:');
    console.log('https://supabase.com/dashboard/project/ngrqwmvuhvjkeohesbxs/functions/fix-embeddings/logs');
  }
}

callFunction();