#!/usr/bin/env node

/**
 * CORREÇÃO COMPLETA - PROCESSA TODOS OS DOCUMENTOS
 * Sem limite de 500 - processa todos 2822 de uma vez
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
const BATCH_SIZE = 5; // Processar 5 por vez para não sobrecarregar
const EMBEDDING_MODEL = 'text-embedding-ada-002';

console.log(chalk.red.bold('='.repeat(60)));
console.log(chalk.red.bold('   🚀 PROCESSAMENTO COMPLETO SEM LIMITES'));
console.log(chalk.red.bold('='.repeat(60)));

async function processAllDocuments() {
  console.log(chalk.cyan.bold('\n📊 VERIFICANDO SITUAÇÃO ATUAL...\n'));
  
  // Contar total
  const { count: totalCount } = await supabase
    .from('document_sections')
    .select('*', { count: 'exact', head: true });
  
  // Contar com embedding
  const { count: withEmbedding } = await supabase
    .from('document_sections')
    .select('*', { count: 'exact', head: true })
    .not('embedding', 'is', null);
  
  const needProcessing = totalCount - withEmbedding;
  
  console.log(`Total de documentos: ${totalCount}`);
  console.log(`Com embedding: ${withEmbedding}`);
  console.log(chalk.yellow.bold(`Precisam de processamento: ${needProcessing}`));
  
  if (needProcessing === 0) {
    console.log(chalk.green.bold('\n✅ Todos documentos já têm embeddings!'));
    return;
  }
  
  // Buscar TODOS sem embedding (SEM LIMIT!)
  console.log(chalk.cyan.bold(`\n🔄 BUSCANDO TODOS ${needProcessing} DOCUMENTOS...\n`));
  
  const { data: documents, error } = await supabase
    .from('document_sections')
    .select('id, content, metadata')
    .is('embedding', null)
    .order('id');
  
  if (error) {
    console.error(chalk.red('Erro ao buscar documentos:'), error);
    return;
  }
  
  if (!documents || documents.length === 0) {
    console.log(chalk.yellow('Nenhum documento sem embedding encontrado'));
    return;
  }
  
  console.log(chalk.green(`✅ ${documents.length} documentos carregados para processamento`));
  console.log(chalk.yellow.bold('\n⏱️  Tempo estimado: ' + Math.ceil(documents.length * 2 / 60) + ' minutos\n'));
  
  let processed = 0;
  let failed = 0;
  let skipped = 0;
  
  // Processar em lotes
  for (let i = 0; i < documents.length; i += BATCH_SIZE) {
    const batch = documents.slice(i, i + BATCH_SIZE);
    const batchNum = Math.floor(i / BATCH_SIZE) + 1;
    const totalBatches = Math.ceil(documents.length / BATCH_SIZE);
    
    console.log(chalk.cyan(`\n📦 Lote ${batchNum}/${totalBatches} (${((i/documents.length)*100).toFixed(1)}%)`));
    
    for (const doc of batch) {
      if (!doc.content || doc.content.length < 10) {
        console.log(chalk.gray(`  Doc ${doc.id.substring(0, 8)}: PULADO (sem conteúdo)`));
        skipped++;
        continue;
      }
      
      try {
        // Gerar embedding
        const response = await openai.embeddings.create({
          model: EMBEDDING_MODEL,
          input: doc.content.substring(0, 8000),
        });
        
        const embedding = response.data[0].embedding;
        
        // Verificar dimensão
        if (embedding.length !== 1536) {
          console.log(chalk.red(`  Doc ${doc.id.substring(0, 8)}: ERRO (dimensão ${embedding.length})`));
          failed++;
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
          console.log(chalk.red(`  Doc ${doc.id.substring(0, 8)}: ERRO ao salvar`));
          failed++;
        } else {
          console.log(chalk.green(`  Doc ${doc.id.substring(0, 8)}: ✅`));
          processed++;
        }
        
      } catch (error) {
        if (error.message.includes('rate limit')) {
          console.log(chalk.yellow('\n⏸️  Rate limit atingido, aguardando 60s...'));
          await new Promise(resolve => setTimeout(resolve, 60000));
          i -= BATCH_SIZE; // Reprocessar este lote
          continue;
        } else {
          console.log(chalk.red(`  Doc ${doc.id.substring(0, 8)}: ${error.message}`));
          failed++;
        }
      }
    }
    
    // Status a cada 10 lotes
    if (batchNum % 10 === 0 || batchNum === totalBatches) {
      const total = processed + failed + skipped;
      console.log(chalk.cyan.bold(`\n📊 Status: ${total}/${documents.length} processados`));
      console.log(`  ✅ Sucesso: ${processed}`);
      console.log(`  ❌ Falhas: ${failed}`);
      console.log(`  ⏭️  Pulados: ${skipped}`);
      console.log(`  ⏳ Restantes: ${documents.length - total}`);
    }
    
    // Pequena pausa entre lotes
    if (i + BATCH_SIZE < documents.length) {
      await new Promise(resolve => setTimeout(resolve, 1500));
    }
  }
  
  // Resultado final
  console.log(chalk.cyan.bold('\n' + '='.repeat(60)));
  console.log(chalk.cyan.bold('📊 RESULTADO FINAL'));
  console.log(chalk.cyan.bold('='.repeat(60) + '\n'));
  
  console.log(`Total processado: ${documents.length}`);
  console.log(chalk.green(`✅ Sucesso: ${processed}`));
  console.log(chalk.red(`❌ Falhas: ${failed}`));
  console.log(chalk.gray(`⏭️  Pulados: ${skipped}`));
  
  const successRate = ((processed / documents.length) * 100).toFixed(1);
  console.log(`\n📈 Taxa de sucesso: ${successRate}%`);
  
  if (failed > 0) {
    console.log(chalk.yellow('\n⚠️ Alguns documentos falharam. Execute novamente para tentar processá-los.'));
  } else if (processed === documents.length - skipped) {
    console.log(chalk.green.bold('\n🎉 TODOS DOCUMENTOS PROCESSADOS COM SUCESSO!'));
  }
}

async function verifyFinal() {
  console.log(chalk.cyan.bold('\n✅ VERIFICAÇÃO FINAL\n'));
  
  const { count: total } = await supabase
    .from('document_sections')
    .select('*', { count: 'exact', head: true });
  
  const { count: withEmbedding } = await supabase
    .from('document_sections')
    .select('*', { count: 'exact', head: true })
    .not('embedding', 'is', null);
  
  // Verificar amostra de dimensões
  const { data: sample } = await supabase
    .from('document_sections')
    .select('embedding')
    .not('embedding', 'is', null)
    .limit(10);
  
  let correctDimensions = true;
  if (sample) {
    for (const s of sample) {
      if (s.embedding && s.embedding.length !== 1536) {
        correctDimensions = false;
        break;
      }
    }
  }
  
  console.log(`Total de documentos: ${total}`);
  console.log(`Com embeddings: ${withEmbedding} (${((withEmbedding/total)*100).toFixed(1)}%)`);
  console.log(`Sem embeddings: ${total - withEmbedding}`);
  console.log(`Dimensões corretas: ${correctDimensions ? '✅ SIM' : '❌ NÃO'}`);
  
  if (withEmbedding === total && correctDimensions) {
    console.log(chalk.green.bold('\n🎉 SISTEMA TOTALMENTE CORRIGIDO!'));
    console.log('\nPróximos passos:');
    console.log('1. Teste o vector search: node scripts/03-test-vector-search.mjs');
    console.log('2. Valide o sistema: node scripts/test-qa-simple.mjs');
  } else if (total - withEmbedding > 0) {
    console.log(chalk.yellow.bold(`\n⚠️ Ainda faltam ${total - withEmbedding} documentos`));
    console.log('Execute este script novamente');
  }
}

// Executar
async function main() {
  try {
    // Testar API primeiro
    console.log(chalk.cyan('\n🔑 Testando API OpenAI...'));
    const testResponse = await openai.embeddings.create({
      model: EMBEDDING_MODEL,
      input: 'Teste',
    });
    console.log(chalk.green('✅ API funcionando!\n'));
    
    // Processar todos documentos
    await processAllDocuments();
    
    // Verificar resultado
    await verifyFinal();
    
  } catch (error) {
    console.error(chalk.red('\n❌ ERRO FATAL:'), error);
    process.exit(1);
  }
}

main();