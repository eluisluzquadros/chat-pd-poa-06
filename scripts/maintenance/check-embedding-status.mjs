#!/usr/bin/env node

import { createClient } from '@supabase/supabase-js';
import { config } from 'dotenv';
import path from 'path';
import { fileURLToPath } from 'url';
import chalk from 'chalk';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
config({ path: path.join(__dirname, '..', '.env.local') });

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY
);

async function checkStatus() {
  console.log(chalk.cyan.bold('📊 STATUS DOS EMBEDDINGS'));
  console.log(chalk.cyan.bold('='.repeat(40)));
  
  // Estatísticas gerais
  const { count: total } = await supabase
    .from('document_sections')
    .select('*', { count: 'exact', head: true });

  const { count: withEmbedding } = await supabase
    .from('document_sections')
    .select('*', { count: 'exact', head: true })
    .not('embedding', 'is', null);

  console.log('\n📈 Estatísticas Gerais:');
  console.log(`Total de documentos: ${total}`);
  console.log(`Com embedding: ${withEmbedding} (${((withEmbedding/total)*100).toFixed(1)}%)`);
  console.log(`Sem embedding: ${total - withEmbedding} (${(((total - withEmbedding)/total)*100).toFixed(1)}%)`);

  // Analisar amostra
  const { data: sample } = await supabase
    .from('document_sections')
    .select('id, embedding')
    .not('embedding', 'is', null)
    .limit(20);

  if (sample && sample.length > 0) {
    console.log('\n🔍 Análise de Amostra (20 docs):');
    
    const dimensions = new Map();
    
    sample.forEach((doc, idx) => {
      if (doc.embedding) {
        const dim = doc.embedding.length;
        dimensions.set(dim, (dimensions.get(dim) || 0) + 1);
        
        if (idx < 5) {
          const status = dim === 1536 ? '✅' : '❌';
          console.log(`${status} Doc ${doc.id.substring(0, 8)}: ${dim} dimensões`);
        }
      }
    });
    
    console.log('\n📊 Distribuição de Dimensões:');
    for (const [dim, count] of dimensions) {
      const status = dim === 1536 ? '✅ CORRETO' : '❌ INCORRETO';
      console.log(`  ${dim} dims: ${count} docs ${status}`);
    }
  }
  
  // Recomendações
  console.log('\n📝 Recomendações:');
  
  if (withEmbedding === 0) {
    console.log(chalk.red('❌ Nenhum embedding encontrado!'));
    console.log('   Execute: node scripts/fix-embeddings-final.mjs');
  } else if (total - withEmbedding > 0) {
    console.log(chalk.yellow(`⚠️ Ainda faltam ${total - withEmbedding} documentos`));
    console.log('   Execute: node scripts/fix-embeddings-final.mjs');
  } else {
    console.log(chalk.green('✅ Todos documentos têm embeddings'));
  }
  
  // Verificar se função SQL existe
  try {
    const { data, error } = await supabase.rpc('match_document_sections', {
      query_embedding: new Array(1536).fill(0),
      match_threshold: 0.5,
      match_count: 1
    });
    
    if (error) {
      console.log(chalk.red('\n❌ Função SQL match_document_sections não existe'));
      console.log('   Execute o SQL em scripts/01-create-vector-search-function.sql');
    } else {
      console.log(chalk.green('\n✅ Função SQL match_document_sections existe'));
    }
  } catch (e) {
    console.log(chalk.red('\n❌ Função SQL match_document_sections não existe'));
    console.log('   Execute o SQL em scripts/01-create-vector-search-function.sql');
  }
}

checkStatus().catch(console.error);