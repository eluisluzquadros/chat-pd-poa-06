#!/usr/bin/env node

/**
 * RESET E REPROCESSAMENTO DA KNOWLEDGE BASE
 * 
 * Este script:
 * 1. Limpa todos os chunks antigos
 * 2. Reprocessa os 4 arquivos DOCX da pasta knowledgebase
 * 3. Gera embeddings corretos (1536 dimensões)
 */

import { createClient } from '@supabase/supabase-js';
import { OpenAI } from 'openai';
import chalk from 'chalk';
import { config } from 'dotenv';
import { fileURLToPath } from 'url';
import path from 'path';
import fs from 'fs/promises';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

config({ path: path.join(__dirname, '..', '.env.local') });

const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL;
const SUPABASE_SERVICE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY;
const SUPABASE_ANON_KEY = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
const OPENAI_API_KEY = process.env.OPENAI_API_KEY;

if (!SUPABASE_URL || !SUPABASE_SERVICE_KEY || !OPENAI_API_KEY) {
  console.error(chalk.red('❌ Variáveis de ambiente faltando!'));
  process.exit(1);
}

const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_KEY);

// Configurar OpenAI sem organization ID
const openai = new OpenAI({ apiKey: OPENAI_API_KEY });

console.log(chalk.red.bold('='.repeat(60)));
console.log(chalk.red.bold('   🔄 RESET E REPROCESSAMENTO DA KNOWLEDGE BASE'));
console.log(chalk.red.bold('='.repeat(60)));

async function confirmReset() {
  console.log(chalk.yellow.bold('\n⚠️  ATENÇÃO: Este script vai:'));
  console.log('1. DELETAR todos os 2822 chunks atuais');
  console.log('2. Reprocessar os 4 arquivos DOCX da knowledgebase');
  console.log('3. Gerar novos embeddings com 1536 dimensões');
  
  console.log(chalk.yellow.bold('\n⏱️  Tempo estimado: 30-60 minutos'));
  
  // Para automação, vamos prosseguir automaticamente
  console.log(chalk.green.bold('\n✅ Prosseguindo com o reset...'));
  return true;
}

async function clearOldData() {
  console.log(chalk.red.bold('\n🗑️  LIMPANDO DADOS ANTIGOS...\n'));
  
  try {
    // Limpar document_sections
    const { error: deleteError, count } = await supabase
      .from('document_sections')
      .delete()
      .neq('id', '00000000-0000-0000-0000-000000000000'); // Deletar tudo
    
    if (deleteError) {
      console.error(chalk.red('Erro ao deletar:'), deleteError);
      return false;
    }
    
    console.log(chalk.green(`✅ ${count || 'Todos'} chunks deletados`));
    
    // Limpar também document_rows se tiver dados
    await supabase
      .from('document_rows')
      .delete()
      .neq('id', '00000000-0000-0000-0000-000000000000');
    
    return true;
  } catch (error) {
    console.error(chalk.red('Erro:'), error);
    return false;
  }
}

async function callIngestFunction(fileName, fileContent) {
  console.log(`📤 Enviando ${fileName} para processamento...`);
  
  try {
    const response = await fetch(`${SUPABASE_URL}/functions/v1/qa-ingest-kb`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${SUPABASE_ANON_KEY}`,
      },
      body: JSON.stringify({
        fileName,
        fileContent,
        fileType: 'docx',
        generateEmbeddings: true,
        chunkSize: 1000, // Tamanho ideal para chunks
        chunkOverlap: 200 // Sobreposição para contexto
      })
    });
    
    if (!response.ok) {
      const error = await response.text();
      throw new Error(`HTTP ${response.status}: ${error}`);
    }
    
    const result = await response.json();
    console.log(chalk.green(`✅ ${fileName} processado: ${result.chunks || 0} chunks criados`));
    return true;
    
  } catch (error) {
    console.error(chalk.red(`❌ Erro processando ${fileName}:`), error.message);
    return false;
  }
}

async function processKnowledgeBase() {
  console.log(chalk.cyan.bold('\n📚 PROCESSANDO KNOWLEDGE BASE...\n'));
  
  const kbPath = path.join(__dirname, '..', 'knowledgebase');
  
  // Listar arquivos DOCX
  const files = await fs.readdir(kbPath);
  const docxFiles = files.filter(f => f.endsWith('.docx'));
  
  console.log(`Encontrados ${docxFiles.length} arquivos DOCX:`);
  docxFiles.forEach(f => console.log('  -', f));
  
  let processed = 0;
  let failed = 0;
  
  for (const fileName of docxFiles) {
    console.log(chalk.cyan(`\n📄 Processando: ${fileName}`));
    
    try {
      // Ler arquivo
      const filePath = path.join(kbPath, fileName);
      const fileBuffer = await fs.readFile(filePath);
      const fileContent = fileBuffer.toString('base64');
      
      // Enviar para edge function
      const success = await callIngestFunction(fileName, fileContent);
      
      if (success) {
        processed++;
      } else {
        failed++;
      }
      
      // Pausa entre arquivos
      await new Promise(resolve => setTimeout(resolve, 2000));
      
    } catch (error) {
      console.error(chalk.red(`❌ Erro com ${fileName}:`), error.message);
      failed++;
    }
  }
  
  return { processed, failed };
}

async function generateEmbeddings() {
  console.log(chalk.cyan.bold('\n🧮 GERANDO EMBEDDINGS...\n'));
  
  // Buscar chunks sem embedding
  const { data: chunks, count } = await supabase
    .from('document_sections')
    .select('id, content', { count: 'exact' })
    .is('embedding', null)
    .order('id');
  
  if (!chunks || chunks.length === 0) {
    console.log(chalk.green('✅ Todos chunks já têm embeddings!'));
    return { processed: 0, failed: 0 };
  }
  
  console.log(`📊 ${chunks.length} chunks para processar`);
  
  let processed = 0;
  let failed = 0;
  const batchSize = 5;
  
  for (let i = 0; i < chunks.length; i += batchSize) {
    const batch = chunks.slice(i, i + batchSize);
    console.log(`Lote ${Math.floor(i/batchSize) + 1}/${Math.ceil(chunks.length/batchSize)}`);
    
    for (const chunk of batch) {
      try {
        // Gerar embedding
        const response = await openai.embeddings.create({
          model: 'text-embedding-ada-002',
          input: chunk.content.substring(0, 8000),
        });
        
        const embedding = response.data[0].embedding;
        
        // Salvar
        await supabase
          .from('document_sections')
          .update({ 
            embedding,
            metadata: {
              embedding_model: 'text-embedding-ada-002',
              embedding_dimension: 1536,
              processed_at: new Date().toISOString()
            }
          })
          .eq('id', chunk.id);
        
        processed++;
        process.stdout.write(chalk.green('.'));
        
      } catch (error) {
        failed++;
        process.stdout.write(chalk.red('x'));
        
        if (error.message.includes('rate')) {
          console.log(chalk.yellow('\n  Rate limit, aguardando 60s...'));
          await new Promise(resolve => setTimeout(resolve, 60000));
        }
      }
    }
    
    console.log(''); // Nova linha
    
    // Pausa entre lotes
    await new Promise(resolve => setTimeout(resolve, 2000));
  }
  
  return { processed, failed };
}

async function verifyResults() {
  console.log(chalk.cyan.bold('\n📊 VERIFICANDO RESULTADOS...\n'));
  
  const { count: totalChunks } = await supabase
    .from('document_sections')
    .select('*', { count: 'exact', head: true });
  
  const { count: withEmbedding } = await supabase
    .from('document_sections')
    .select('*', { count: 'exact', head: true })
    .not('embedding', 'is', null);
  
  // Verificar dimensões
  const { data: sample } = await supabase
    .from('document_sections')
    .select('embedding')
    .not('embedding', 'is', null)
    .limit(5);
  
  let dimensionsOk = true;
  if (sample) {
    for (const s of sample) {
      if (s.embedding && s.embedding.length !== 1536) {
        dimensionsOk = false;
        break;
      }
    }
  }
  
  console.log('📈 Estatísticas finais:');
  console.log(`  Total de chunks: ${totalChunks}`);
  console.log(`  Com embeddings: ${withEmbedding} (${((withEmbedding/totalChunks)*100).toFixed(1)}%)`);
  console.log(`  Dimensões corretas (1536): ${dimensionsOk ? '✅ SIM' : '❌ NÃO'}`);
  
  return {
    totalChunks,
    withEmbedding,
    dimensionsOk
  };
}

async function main() {
  try {
    // 1. Confirmar reset
    const proceed = await confirmReset();
    if (!proceed) {
      console.log(chalk.yellow('Reset cancelado'));
      return;
    }
    
    // 2. Limpar dados antigos
    const cleaned = await clearOldData();
    if (!cleaned) {
      console.log(chalk.red('❌ Falha ao limpar dados antigos'));
      process.exit(1);
    }
    
    // 3. Processar knowledge base
    const { processed: filesProcessed, failed: filesFailed } = await processKnowledgeBase();
    
    console.log(chalk.cyan.bold('\n📊 Resultado do processamento:'));
    console.log(`  ✅ Arquivos processados: ${filesProcessed}`);
    console.log(`  ❌ Falhas: ${filesFailed}`);
    
    // 4. Gerar embeddings
    const { processed: embProcessed, failed: embFailed } = await generateEmbeddings();
    
    console.log(chalk.cyan.bold('\n📊 Resultado dos embeddings:'));
    console.log(`  ✅ Embeddings gerados: ${embProcessed}`);
    console.log(`  ❌ Falhas: ${embFailed}`);
    
    // 5. Verificar resultados
    const { totalChunks, withEmbedding, dimensionsOk } = await verifyResults();
    
    if (withEmbedding === totalChunks && dimensionsOk) {
      console.log(chalk.green.bold('\n🎉 KNOWLEDGE BASE REPROCESSADA COM SUCESSO!'));
      console.log('\nPróximos passos:');
      console.log('1. Execute o SQL para criar função match_document_sections');
      console.log('2. Teste: node scripts/03-test-vector-search.mjs');
      console.log('3. Valide: node scripts/test-qa-simple.mjs');
    } else {
      console.log(chalk.yellow.bold('\n⚠️ Processamento parcial'));
      console.log('Execute novamente para completar');
    }
    
  } catch (error) {
    console.error(chalk.red('\n❌ ERRO FATAL:'), error);
    process.exit(1);
  }
}

// Verificar se qa-ingest-kb existe
async function checkIngestFunction() {
  console.log(chalk.cyan('\n🔍 Verificando edge function qa-ingest-kb...'));
  
  try {
    const response = await fetch(`${SUPABASE_URL}/functions/v1/qa-ingest-kb`, {
      method: 'OPTIONS',
      headers: {
        'Authorization': `Bearer ${SUPABASE_ANON_KEY}`,
      }
    });
    
    if (response.ok || response.status === 405) {
      console.log(chalk.green('✅ Edge function qa-ingest-kb disponível'));
      return true;
    } else {
      console.log(chalk.red('❌ Edge function qa-ingest-kb não encontrada'));
      console.log(chalk.yellow('\nDeploy necessário:'));
      console.log('npx supabase functions deploy qa-ingest-kb --project-ref ngrqwmvuhvjkeohesbxs');
      return false;
    }
  } catch (error) {
    console.log(chalk.red('❌ Erro verificando function:'), error.message);
    return false;
  }
}

// Verificar função antes de executar
checkIngestFunction().then(exists => {
  if (exists) {
    main();
  } else {
    console.log(chalk.red('\n❌ Configure a edge function primeiro'));
    process.exit(1);
  }
});