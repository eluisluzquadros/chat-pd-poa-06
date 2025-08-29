#!/usr/bin/env node

/**
 * CORREÇÃO FINAL DOS EMBEDDINGS
 * Remove org ID incorreta e processa embeddings corretamente
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

// IMPORTANTE: Não usar organization ID se for o valor padrão
const orgId = process.env.OPENAI_ORG_ID;
const openaiConfig = { apiKey: OPENAI_API_KEY };

if (orgId && orgId !== 'org-your-organization-id') {
  openaiConfig.organization = orgId;
}

const openai = new OpenAI(openaiConfig);

// Configuração
const BATCH_SIZE = 3; // Menor para evitar rate limit
const EMBEDDING_MODEL = 'text-embedding-ada-002';

console.log(chalk.red.bold('='.repeat(60)));
console.log(chalk.red.bold('   🚨 CORREÇÃO FINAL DE EMBEDDINGS'));
console.log(chalk.red.bold('='.repeat(60)));

// Testar API primeiro
async function testAPI() {
  console.log(chalk.cyan.bold('\n🔑 Testando API OpenAI...\n'));
  
  try {
    const response = await openai.embeddings.create({
      model: EMBEDDING_MODEL,
      input: 'Teste de embedding',
    });
    
    console.log(chalk.green('✅ API funcionando!'));
    console.log('   Dimensões:', response.data[0].embedding.length);
    return true;
  } catch (error) {
    console.log(chalk.red('❌ API não funciona:'), error.message);
    console.log('\n⚠️ SOLUÇÃO:');
    console.log('1. Remova ou corrija OPENAI_ORG_ID em .env.local');
    console.log('2. Verifique se a API key está correta');
    console.log('3. Verifique em: https://platform.openai.com/api-keys');
    return false;
  }
}

async function cleanAllEmbeddings() {
  console.log(chalk.yellow.bold('\n🧹 Limpando embeddings corrompidos...\n'));
  
  // Contar embeddings corrompidos
  const { data: samples } = await supabase
    .from('document_sections')
    .select('id, embedding')
    .not('embedding', 'is', null)
    .limit(5);
  
  let needsCleaning = false;
  
  if (samples && samples.length > 0) {
    for (const sample of samples) {
      if (sample.embedding && sample.embedding.length !== 1536) {
        needsCleaning = true;
        console.log(chalk.red(`  Doc ${sample.id.substring(0, 8)}: ${sample.embedding.length} dimensões (corrompido)`));
      }
    }
  }
  
  if (needsCleaning) {
    const { error } = await supabase
      .from('document_sections')
      .update({ embedding: null })
      .not('embedding', 'is', null);
    
    if (error) {
      console.error(chalk.red('Erro ao limpar:'), error);
      return false;
    }
    
    console.log(chalk.green('\n✅ Embeddings corrompidos limpos!'));
  } else {
    console.log(chalk.green('✅ Nenhum embedding corrompido encontrado'));
  }
  
  return true;
}

async function reprocessDocuments() {
  console.log(chalk.cyan.bold('\n🔄 Reprocessando documentos...\n'));
  
  // Buscar documentos sem embedding
  const { data: documents, count } = await supabase
    .from('document_sections')
    .select('id, content, metadata', { count: 'exact' })
    .is('embedding', null)
    .order('id')
    .limit(500); // Processar 500 primeiro
  
  if (!documents || documents.length === 0) {
    console.log(chalk.green('✅ Todos documentos já têm embeddings!'));
    return { processed: 0, failed: 0 };
  }
  
  console.log(`📚 Processando ${documents.length} de ${count} documentos sem embedding`);
  
  let processed = 0;
  let failed = 0;
  
  // Processar em lotes
  for (let i = 0; i < documents.length; i += BATCH_SIZE) {
    const batch = documents.slice(i, i + BATCH_SIZE);
    const batchNum = Math.floor(i / BATCH_SIZE) + 1;
    const totalBatches = Math.ceil(documents.length / BATCH_SIZE);
    
    console.log(`\n📦 Lote ${batchNum}/${totalBatches}`);
    
    for (const doc of batch) {
      if (!doc.content || doc.content.length < 10) {
        console.log(chalk.yellow(`  Doc ${doc.id.substring(0, 8)}: PULADO (sem conteúdo)`));
        failed++;
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
        console.log(chalk.red(`  Doc ${doc.id.substring(0, 8)}: ${error.message}`));
        failed++;
        
        // Se for rate limit, aguardar
        if (error.message.includes('rate')) {
          console.log(chalk.yellow('  Aguardando 60s por rate limit...'));
          await new Promise(resolve => setTimeout(resolve, 60000));
        }
      }
    }
    
    // Progresso
    const totalProcessed = processed + failed;
    const percentage = ((totalProcessed / documents.length) * 100).toFixed(1);
    console.log(chalk.gray(`  Progresso: ${totalProcessed}/${documents.length} (${percentage}%)`));
    
    // Pausa entre lotes
    if (i + BATCH_SIZE < documents.length) {
      await new Promise(resolve => setTimeout(resolve, 2000));
    }
  }
  
  return { processed, failed, total: count };
}

async function verifyFix() {
  console.log(chalk.cyan.bold('\n✅ Verificando correção...\n'));
  
  const { data: stats } = await supabase
    .from('document_sections')
    .select('embedding', { count: 'exact' });
  
  const total = stats?.length || 0;
  const withEmbedding = stats?.filter(s => s.embedding !== null).length || 0;
  
  // Verificar dimensões
  const dimensions = new Map();
  stats?.filter(s => s.embedding).forEach(s => {
    const dim = s.embedding.length;
    dimensions.set(dim, (dimensions.get(dim) || 0) + 1);
  });
  
  console.log(`Total de documentos: ${total}`);
  console.log(`Com embedding: ${withEmbedding} (${((withEmbedding/total)*100).toFixed(1)}%)`);
  console.log(`Sem embedding: ${total - withEmbedding}`);
  
  if (dimensions.size > 0) {
    console.log('\nDimensões dos embeddings:');
    for (const [dim, count] of dimensions) {
      const emoji = dim === 1536 ? '✅' : '❌';
      console.log(`  ${emoji} ${dim} dimensões: ${count} documentos`);
    }
  }
  
  return dimensions.size === 1 && dimensions.has(1536);
}

async function main() {
  try {
    // 1. Testar API
    const apiWorks = await testAPI();
    if (!apiWorks) {
      console.log(chalk.red.bold('\n❌ CORRIJA A CONFIGURAÇÃO DA API PRIMEIRO!'));
      console.log('\nEdite .env.local e:');
      console.log('1. Remova a linha OPENAI_ORG_ID ou');
      console.log('2. Configure com o ID correto da sua organização');
      process.exit(1);
    }
    
    // 2. Limpar embeddings corrompidos
    await cleanAllEmbeddings();
    
    // 3. Reprocessar documentos
    const { processed, failed, total } = await reprocessDocuments();
    
    console.log(chalk.cyan.bold('\n📊 RESULTADO:'));
    console.log(`  ✅ Processados: ${processed}`);
    console.log(`  ❌ Falhas: ${failed}`);
    
    if (total > 500) {
      console.log(chalk.yellow(`\n⚠️ Ainda restam ${total - 500} documentos para processar`));
      console.log('Execute novamente para continuar o processamento');
    }
    
    // 4. Verificar correção
    const isFixed = await verifyFix();
    
    if (isFixed) {
      console.log(chalk.green.bold('\n🎉 EMBEDDINGS CORRIGIDOS!'));
      console.log('\nPróximos passos:');
      console.log('1. Execute o SQL no Supabase Dashboard (scripts/01-create-vector-search-function.sql)');
      console.log('2. Teste: node scripts/03-test-vector-search.mjs');
      console.log('3. Remova response-synthesizer-simple (hardcoded)');
    } else {
      console.log(chalk.yellow.bold('\n⚠️ Ainda há problemas nos embeddings'));
      console.log('Execute novamente para continuar processando');
    }
    
  } catch (error) {
    console.error(chalk.red('\n❌ ERRO FATAL:'), error);
    process.exit(1);
  }
}

// Executar
main();