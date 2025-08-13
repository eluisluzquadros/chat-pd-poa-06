#!/usr/bin/env node

/**
 * CORREÇÃO EMERGENCIAL DE EMBEDDINGS CORROMPIDOS
 * Script otimizado para processar em lotes
 */

import { createClient } from '@supabase/supabase-js';
import { OpenAI } from 'openai';
import chalk from 'chalk';
import { config } from 'dotenv';
import { fileURLToPath } from 'url';
import path from 'path';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

config({ path: path.join(__dirname, '..', '.env.local') });

const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL;
const SUPABASE_SERVICE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY;
const OPENAI_API_KEY = process.env.OPENAI_API_KEY;

if (!SUPABASE_URL || !SUPABASE_SERVICE_KEY || !OPENAI_API_KEY) {
  console.error(chalk.red('❌ Variáveis de ambiente faltando!'));
  process.exit(1);
}

const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_KEY);
const openai = new OpenAI({ apiKey: OPENAI_API_KEY });

// Configuração
const BATCH_SIZE = 5; // Menor para evitar timeout
const EMBEDDING_MODEL = 'text-embedding-ada-002'; // 1536 dimensões

async function cleanAllEmbeddings() {
  console.log(chalk.red.bold('\n🚨 LIMPANDO TODOS EMBEDDINGS CORROMPIDOS\n'));
  
  // Limpar TODOS os embeddings de uma vez
  const { error } = await supabase
    .from('document_sections')
    .update({ embedding: null })
    .not('embedding', 'is', null);
  
  if (error) {
    console.error(chalk.red('Erro ao limpar embeddings:'), error);
    return false;
  }
  
  console.log(chalk.green('✅ Todos embeddings limpos!'));
  return true;
}

async function reprocessBatch(documents) {
  const results = [];
  
  for (const doc of documents) {
    try {
      if (!doc.content || doc.content.length < 10) {
        results.push({ id: doc.id, success: false, reason: 'no content' });
        continue;
      }
      
      // Gerar embedding
      const response = await openai.embeddings.create({
        model: EMBEDDING_MODEL,
        input: doc.content.substring(0, 8000), // Limitar tamanho
      });
      
      const embedding = response.data[0].embedding;
      
      // Verificar dimensão
      if (embedding.length !== 1536) {
        results.push({ id: doc.id, success: false, reason: `wrong dimension: ${embedding.length}` });
        continue;
      }
      
      // Salvar no banco
      const { error: updateError } = await supabase
        .from('document_sections')
        .update({ 
          embedding,
          metadata: {
            ...doc.metadata,
            embedding_model: EMBEDDING_MODEL,
            embedding_dimension: 1536,
            processed_at: new Date().toISOString()
          }
        })
        .eq('id', doc.id);
      
      if (updateError) {
        results.push({ id: doc.id, success: false, reason: updateError.message });
      } else {
        results.push({ id: doc.id, success: true });
      }
      
    } catch (error) {
      results.push({ id: doc.id, success: false, reason: error.message });
    }
  }
  
  return results;
}

async function reprocessAllDocuments() {
  console.log(chalk.cyan.bold('\n🔄 REPROCESSANDO TODOS DOCUMENTOS\n'));
  
  // Buscar TODOS documentos
  const { data: documents, error, count } = await supabase
    .from('document_sections')
    .select('id, content, metadata', { count: 'exact' })
    .order('id');
  
  if (error) {
    console.error(chalk.red('Erro ao buscar documentos:'), error);
    return;
  }
  
  console.log(`📚 Total de documentos: ${count}`);
  
  let processed = 0;
  let failed = 0;
  
  // Processar em lotes
  for (let i = 0; i < documents.length; i += BATCH_SIZE) {
    const batch = documents.slice(i, i + BATCH_SIZE);
    const batchNum = Math.floor(i / BATCH_SIZE) + 1;
    const totalBatches = Math.ceil(documents.length / BATCH_SIZE);
    
    console.log(`\n📦 Lote ${batchNum}/${totalBatches} (${batch.length} docs)`);
    
    const results = await reprocessBatch(batch);
    
    results.forEach(r => {
      if (r.success) {
        processed++;
        console.log(chalk.green(`  ✅ Doc ${r.id}`));
      } else {
        failed++;
        console.log(chalk.red(`  ❌ Doc ${r.id}: ${r.reason}`));
      }
    });
    
    // Progresso
    const totalProcessed = processed + failed;
    const percentage = ((totalProcessed / documents.length) * 100).toFixed(1);
    console.log(chalk.gray(`  Progresso: ${totalProcessed}/${documents.length} (${percentage}%)`));
    
    // Pequena pausa entre lotes
    if (i + BATCH_SIZE < documents.length) {
      await new Promise(resolve => setTimeout(resolve, 1000));
    }
  }
  
  console.log(chalk.cyan.bold('\n📊 RESULTADO FINAL:'));
  console.log(`  ✅ Processados com sucesso: ${processed}`);
  console.log(`  ❌ Falhas: ${failed}`);
  console.log(`  📊 Taxa de sucesso: ${((processed / (processed + failed)) * 100).toFixed(1)}%`);
}

async function verifyFix() {
  console.log(chalk.cyan.bold('\n✅ VERIFICANDO CORREÇÃO\n'));
  
  const { data: samples } = await supabase
    .from('document_sections')
    .select('id, embedding')
    .not('embedding', 'is', null)
    .limit(10);
  
  if (!samples || samples.length === 0) {
    console.log(chalk.red('❌ Nenhum embedding encontrado!'));
    return false;
  }
  
  const dimensions = new Set();
  samples.forEach(s => {
    if (s.embedding) {
      dimensions.add(s.embedding.length);
    }
  });
  
  console.log('📊 Dimensões encontradas:', Array.from(dimensions).join(', '));
  
  if (dimensions.size === 1 && dimensions.has(1536)) {
    console.log(chalk.green('✅ Todos os embeddings com 1536 dimensões!'));
    return true;
  } else {
    console.log(chalk.red('❌ Ainda há embeddings com dimensões incorretas'));
    return false;
  }
}

async function main() {
  console.log(chalk.red.bold('='.repeat(60)));
  console.log(chalk.red.bold('   🚨 CORREÇÃO EMERGENCIAL DE EMBEDDINGS'));
  console.log(chalk.red.bold('='.repeat(60)));
  
  try {
    // 1. Limpar TODOS embeddings corrompidos
    const cleaned = await cleanAllEmbeddings();
    if (!cleaned) {
      console.log(chalk.red('\n❌ Falha ao limpar embeddings'));
      process.exit(1);
    }
    
    // 2. Reprocessar todos
    await reprocessAllDocuments();
    
    // 3. Verificar
    const isFixed = await verifyFix();
    
    if (isFixed) {
      console.log(chalk.green.bold('\n🎉 EMBEDDINGS CORRIGIDOS COM SUCESSO!'));
      console.log('\nPróximos passos:');
      console.log('1. Execute o SQL no Supabase para criar a função match_document_sections');
      console.log('2. Execute: node scripts/03-test-vector-search.mjs');
      console.log('3. Teste o sistema em produção');
    } else {
      console.log(chalk.yellow.bold('\n⚠️ Verificação falhou, mas processo completou'));
    }
    
  } catch (error) {
    console.error(chalk.red('\n❌ ERRO FATAL:'), error);
    process.exit(1);
  }
}

// Executar
main();