#!/usr/bin/env node

/**
 * PASSO 2: LIMPAR EMBEDDINGS CORROMPIDOS E REPROCESSAR
 * Este script vai:
 * 1. Limpar embeddings com dimensões erradas
 * 2. Reprocessar com OpenAI text-embedding-ada-002
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
  console.error('Necessário: SUPABASE_URL, SUPABASE_SERVICE_KEY, OPENAI_API_KEY');
  process.exit(1);
}

const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_KEY);
const openai = new OpenAI({ apiKey: OPENAI_API_KEY });

// Configuração
const BATCH_SIZE = 10; // Processar em lotes para não sobrecarregar
const EMBEDDING_MODEL = 'text-embedding-ada-002'; // 1536 dimensões
const MAX_RETRIES = 3;

async function generateEmbedding(text, retries = 0) {
  try {
    const response = await openai.embeddings.create({
      model: EMBEDDING_MODEL,
      input: text.substring(0, 8000), // Limitar tamanho
    });
    
    return response.data[0].embedding;
  } catch (error) {
    if (retries < MAX_RETRIES) {
      console.log(chalk.yellow(`   Retry ${retries + 1}/${MAX_RETRIES}...`));
      await new Promise(resolve => setTimeout(resolve, 1000 * (retries + 1)));
      return generateEmbedding(text, retries + 1);
    }
    console.error(chalk.red('   Erro ao gerar embedding:'), error.message);
    return null;
  }
}

async function cleanCorruptedEmbeddings() {
  console.log(chalk.cyan.bold('\n🧹 LIMPANDO EMBEDDINGS CORROMPIDOS\n'));
  
  // Identificar embeddings com dimensão errada
  const { data: corrupted, error } = await supabase
    .from('document_sections')
    .select('id')
    .not('embedding', 'is', null);
  
  if (error) {
    console.error(chalk.red('Erro ao buscar embeddings:'), error);
    return 0;
  }
  
  let corruptedCount = 0;
  
  // Verificar cada um (não ideal mas necessário)
  for (const doc of corrupted || []) {
    const { data: fullDoc } = await supabase
      .from('document_sections')
      .select('embedding')
      .eq('id', doc.id)
      .single();
    
    if (fullDoc?.embedding) {
      const dim = fullDoc.embedding.length;
      if (dim !== 1536) {
        // Limpar embedding corrompido
        await supabase
          .from('document_sections')
          .update({ embedding: null })
          .eq('id', doc.id);
        corruptedCount++;
      }
    }
  }
  
  console.log(`✅ ${corruptedCount} embeddings corrompidos limpos`);
  return corruptedCount;
}

async function reprocessDocuments() {
  console.log(chalk.cyan.bold('\n🔄 REPROCESSANDO DOCUMENTOS\n'));
  
  // Buscar documentos sem embedding
  const { data: documents, error, count } = await supabase
    .from('document_sections')
    .select('id, content, metadata', { count: 'exact' })
    .is('embedding', null)
    .order('id');
  
  if (error) {
    console.error(chalk.red('Erro ao buscar documentos:'), error);
    return;
  }
  
  console.log(`📚 Total de documentos para processar: ${count || 0}`);
  
  if (!documents || documents.length === 0) {
    console.log(chalk.yellow('Nenhum documento para processar'));
    return;
  }
  
  let processed = 0;
  let failed = 0;
  
  // Processar em lotes
  for (let i = 0; i < documents.length; i += BATCH_SIZE) {
    const batch = documents.slice(i, i + BATCH_SIZE);
    console.log(`\n📦 Lote ${Math.floor(i / BATCH_SIZE) + 1}/${Math.ceil(documents.length / BATCH_SIZE)}`);
    
    const promises = batch.map(async (doc) => {
      if (!doc.content || doc.content.length < 10) {
        console.log(chalk.yellow(`   Doc ${doc.id}: PULADO (sem conteúdo)`));
        return { id: doc.id, success: false };
      }
      
      process.stdout.write(`   Doc ${doc.id}: `);
      
      // Gerar embedding
      const embedding = await generateEmbedding(doc.content);
      
      if (!embedding) {
        console.log(chalk.red('FALHOU'));
        return { id: doc.id, success: false };
      }
      
      // Verificar dimensão
      if (embedding.length !== 1536) {
        console.log(chalk.red(`DIMENSÃO ERRADA: ${embedding.length}`));
        return { id: doc.id, success: false };
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
        console.log(chalk.red('ERRO AO SALVAR'));
        return { id: doc.id, success: false };
      }
      
      console.log(chalk.green('✅'));
      return { id: doc.id, success: true };
    });
    
    const results = await Promise.all(promises);
    
    results.forEach(r => {
      if (r.success) processed++;
      else failed++;
    });
    
    // Pausa entre lotes para não sobrecarregar API
    if (i + BATCH_SIZE < documents.length) {
      console.log(chalk.gray('   Aguardando 2s antes do próximo lote...'));
      await new Promise(resolve => setTimeout(resolve, 2000));
    }
  }
  
  console.log(chalk.cyan.bold('\n📊 RESULTADO DO REPROCESSAMENTO:'));
  console.log(`   ✅ Processados com sucesso: ${processed}`);
  console.log(`   ❌ Falhas: ${failed}`);
  console.log(`   📊 Taxa de sucesso: ${((processed / (processed + failed)) * 100).toFixed(1)}%`);
}

async function verifyEmbeddings() {
  console.log(chalk.cyan.bold('\n✅ VERIFICANDO EMBEDDINGS\n'));
  
  // Verificar dimensões
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
    console.log(chalk.green('✅ Todos os embeddings com 1536 dimensões (correto!)'));
    return true;
  } else {
    console.log(chalk.red('❌ Embeddings com dimensões incorretas!'));
    return false;
  }
}

async function main() {
  console.log(chalk.red.bold('=' .repeat(60)));
  console.log(chalk.red.bold('   🚨 CORREÇÃO DE EMBEDDINGS - PLANO DIRETOR POA'));
  console.log(chalk.red.bold('=' .repeat(60)));
  
  try {
    // 1. Limpar corrompidos
    await cleanCorruptedEmbeddings();
    
    // 2. Reprocessar
    await reprocessDocuments();
    
    // 3. Verificar
    const isValid = await verifyEmbeddings();
    
    if (isValid) {
      console.log(chalk.green.bold('\n✅ EMBEDDINGS CORRIGIDOS COM SUCESSO!'));
      console.log('\nPróximos passos:');
      console.log('1. Execute: node scripts/03-test-vector-search.mjs');
      console.log('2. Teste o sistema em /chat');
    } else {
      console.log(chalk.yellow.bold('\n⚠️ AINDA HÁ PROBLEMAS NOS EMBEDDINGS'));
      console.log('Execute novamente ou verifique manualmente');
    }
    
  } catch (error) {
    console.error(chalk.red('\n❌ ERRO FATAL:'), error);
    process.exit(1);
  }
}

// Executar
main();