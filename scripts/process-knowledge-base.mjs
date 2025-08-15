#!/usr/bin/env node

/**
 * PROCESSAR OS 4 ARQUIVOS DOCX DA KNOWLEDGE BASE
 * Com a tabela limpa e correta, vamos processar tudo do zero
 */

import { createClient } from '@supabase/supabase-js';
import { OpenAI } from 'openai';
import chalk from 'chalk';
import { config } from 'dotenv';
import { fileURLToPath } from 'url';
import path from 'path';
import fs from 'fs/promises';
import mammoth from 'mammoth';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

config({ path: path.join(__dirname, '..', '.env.local') });

const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL;
const SUPABASE_SERVICE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY;
const OPENAI_API_KEY = process.env.OPENAI_API_KEY;

const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_KEY);
const openai = new OpenAI({ apiKey: OPENAI_API_KEY });

console.log(chalk.green.bold('='.repeat(60)));
console.log(chalk.green.bold('   📚 PROCESSAMENTO DA KNOWLEDGE BASE'));
console.log(chalk.green.bold('='.repeat(60)));

// Configurações
const CHUNK_SIZE = 1500; // Tamanho ideal para chunks
const CHUNK_OVERLAP = 200; // Sobreposição para manter contexto

async function extractTextFromDocx(filePath) {
  const buffer = await fs.readFile(filePath);
  const result = await mammoth.extractRawText({ buffer });
  return result.value;
}

function createChunks(text, metadata) {
  const chunks = [];
  const sentences = text.split(/[.!?]+/);
  let currentChunk = '';
  
  for (const sentence of sentences) {
    if ((currentChunk + sentence).length > CHUNK_SIZE) {
      if (currentChunk) {
        chunks.push({
          content: currentChunk.trim(),
          metadata: {
            ...metadata,
            chunk_index: chunks.length
          }
        });
      }
      // Overlap: incluir última parte do chunk anterior
      const overlap = currentChunk.slice(-CHUNK_OVERLAP);
      currentChunk = overlap + sentence;
    } else {
      currentChunk += sentence + '. ';
    }
  }
  
  // Adicionar último chunk
  if (currentChunk.trim()) {
    chunks.push({
      content: currentChunk.trim(),
      metadata: {
        ...metadata,
        chunk_index: chunks.length
      }
    });
  }
  
  return chunks;
}

async function generateEmbedding(text) {
  try {
    const response = await openai.embeddings.create({
      model: 'text-embedding-ada-002',
      input: text.substring(0, 8000),
    });
    return response.data[0].embedding;
  } catch (error) {
    console.error(chalk.red('Erro ao gerar embedding:'), error.message);
    return null;
  }
}

async function processFile(filePath, fileName) {
  console.log(chalk.cyan(`\n📄 Processando: ${fileName}`));
  
  try {
    // Extrair texto do DOCX
    console.log('  📖 Extraindo texto...');
    const text = await extractTextFromDocx(filePath);
    console.log(`  ✅ Extraído: ${text.length} caracteres`);
    
    // Criar chunks
    console.log('  ✂️ Dividindo em chunks...');
    const metadata = {
      source: fileName,
      file_type: 'docx',
      processed_at: new Date().toISOString()
    };
    
    const chunks = createChunks(text, metadata);
    console.log(`  ✅ Criados: ${chunks.length} chunks`);
    
    // Processar cada chunk
    console.log('  🧮 Gerando embeddings...');
    let processed = 0;
    let failed = 0;
    
    for (const chunk of chunks) {
      // Inserir chunk no banco
      const { data: insertedDoc, error: insertError } = await supabase
        .from('document_sections')
        .insert({
          content: chunk.content,
          metadata: chunk.metadata
        })
        .select('id')
        .single();
      
      if (insertError) {
        console.error(chalk.red('    Erro ao inserir chunk:'), insertError.message);
        failed++;
        continue;
      }
      
      // Gerar embedding
      const embedding = await generateEmbedding(chunk.content);
      
      if (embedding) {
        // Usar função RPC para salvar embedding corretamente
        const { error: updateError } = await supabase.rpc('update_document_embedding', {
          doc_id: insertedDoc.id,
          new_embedding: embedding
        });
        
        if (updateError) {
          // Se a função não existir, tentar update direto
          const { error: directError } = await supabase
            .from('document_sections')
            .update({ embedding })
            .eq('id', insertedDoc.id);
          
          if (directError) {
            console.error(chalk.red('    Erro ao salvar embedding:'), directError.message);
            failed++;
          } else {
            processed++;
          }
        } else {
          processed++;
        }
      } else {
        failed++;
      }
      
      // Mostrar progresso
      if ((processed + failed) % 10 === 0) {
        console.log(`    Progresso: ${processed + failed}/${chunks.length}`);
      }
      
      // Pequena pausa para não sobrecarregar API
      if ((processed + failed) % 5 === 0) {
        await new Promise(resolve => setTimeout(resolve, 1000));
      }
    }
    
    console.log(chalk.green(`  ✅ Concluído: ${processed} chunks processados, ${failed} falhas`));
    
    return { processed, failed, total: chunks.length };
    
  } catch (error) {
    console.error(chalk.red(`  ❌ Erro processando ${fileName}:`), error.message);
    return { processed: 0, failed: 0, total: 0 };
  }
}

async function main() {
  try {
    // Verificar se tabela está vazia
    const { count } = await supabase
      .from('document_sections')
      .select('*', { count: 'exact', head: true });
    
    if (count > 0) {
      console.log(chalk.yellow(`\n⚠️  A tabela já contém ${count} registros.`));
      console.log('Para processar do zero, limpe a tabela primeiro:');
      console.log(chalk.cyan('DELETE FROM document_sections;'));
      console.log('\nContinuando mesmo assim...\n');
    }
    
    // Listar arquivos DOCX
    const kbPath = path.join(__dirname, '..', 'knowledgebase');
    const files = await fs.readdir(kbPath);
    const docxFiles = files.filter(f => f.endsWith('.docx'));
    
    console.log(chalk.cyan(`\n📁 Encontrados ${docxFiles.length} arquivos DOCX:`));
    docxFiles.forEach(f => console.log(`  - ${f}`));
    
    // Processar cada arquivo
    let totalProcessed = 0;
    let totalFailed = 0;
    
    for (const fileName of docxFiles) {
      const filePath = path.join(kbPath, fileName);
      const result = await processFile(filePath, fileName);
      totalProcessed += result.processed;
      totalFailed += result.failed;
    }
    
    // Resultado final
    console.log(chalk.green.bold('\n' + '='.repeat(60)));
    console.log(chalk.green.bold('📊 RESULTADO FINAL'));
    console.log(chalk.green.bold('='.repeat(60) + '\n'));
    
    console.log(`✅ Chunks processados: ${totalProcessed}`);
    console.log(`❌ Falhas: ${totalFailed}`);
    
    // Verificar
    const { count: finalCount } = await supabase
      .from('document_sections')
      .select('*', { count: 'exact', head: true });
    
    const { count: withEmbedding } = await supabase
      .from('document_sections')
      .select('*', { count: 'exact', head: true })
      .not('embedding', 'is', null);
    
    console.log(`\n📈 Estado da tabela:`);
    console.log(`  Total de registros: ${finalCount}`);
    console.log(`  Com embeddings: ${withEmbedding}`);
    console.log(`  Sem embeddings: ${finalCount - withEmbedding}`);
    
    if (withEmbedding === finalCount) {
      console.log(chalk.green.bold('\n🎉 TODOS OS DOCUMENTOS FORAM PROCESSADOS COM SUCESSO!'));
      console.log('\nPróximo passo: Testar o vector search');
      console.log(chalk.cyan('node scripts/03-test-vector-search.mjs'));
    } else {
      console.log(chalk.yellow(`\n⚠️  Alguns documentos não têm embeddings`));
    }
    
  } catch (error) {
    console.error(chalk.red('\n❌ ERRO FATAL:'), error);
    process.exit(1);
  }
}

// Executar
main();