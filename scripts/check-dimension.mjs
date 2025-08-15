#!/usr/bin/env node

import { createClient } from '@supabase/supabase-js';
import chalk from 'chalk';
import { config } from 'dotenv';
import { fileURLToPath } from 'url';
import path from 'path';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
config({ path: path.join(__dirname, '..', '.env.local') });

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY
);

console.log(chalk.red.bold('🔍 VERIFICANDO DIMENSÕES DOS EMBEDDINGS'));
console.log(chalk.red.bold('='.repeat(40)));

async function check() {
  // Pegar 10 embeddings
  const { data: docs } = await supabase
    .from('document_sections')
    .select('id, embedding')
    .not('embedding', 'is', null)
    .limit(10);
  
  if (!docs || docs.length === 0) {
    console.log('Nenhum embedding encontrado');
    return;
  }
  
  console.log('\n📊 Análise dos embeddings:\n');
  
  docs.forEach(doc => {
    if (doc.embedding) {
      const type = typeof doc.embedding;
      const isArray = Array.isArray(doc.embedding);
      let dims = 0;
      
      if (type === 'string') {
        dims = doc.embedding.length;
        console.log(`❌ Doc ${doc.id.substring(0, 8)}:`);
        console.log(`   Tipo: STRING (${dims} caracteres)`);
        console.log(`   Preview: ${doc.embedding.substring(0, 30)}...`);
        console.log(`   PROBLEMA: Está salvo como texto JSON!`);
      } else if (Array.isArray(doc.embedding)) {
        dims = doc.embedding.length;
        const status = dims === 1536 ? '✅' : '❌';
        console.log(`${status} Doc ${doc.id.substring(0, 8)}:`);
        console.log(`   Tipo: ARRAY (${dims} elementos)`);
        if (dims === 1536) {
          console.log(`   OK: Array com dimensão correta`);
        }
      } else if (type === 'object') {
        console.log(`❓ Doc ${doc.id.substring(0, 8)}:`);
        console.log(`   Tipo: OBJECT`);
        console.log(`   Keys: ${Object.keys(doc.embedding).slice(0, 5)}`);
      }
      console.log('');
    }
  });
  
  console.log(chalk.yellow.bold('⚠️  AÇÃO NECESSÁRIA:\n'));
  console.log('Se os embeddings aparecem como STRING, execute no Supabase:');
  console.log(chalk.cyan(`
UPDATE document_sections SET embedding = NULL;
ALTER TABLE document_sections DROP COLUMN embedding;
ALTER TABLE document_sections ADD COLUMN embedding vector(1536);
  `));
  console.log('\nDepois rode: node scripts/fix-all-embeddings-no-limit.mjs');
}

check().catch(console.error);