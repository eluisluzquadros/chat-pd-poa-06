#!/usr/bin/env node

import { createClient } from '@supabase/supabase-js';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import crypto from 'crypto';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Configuration
const supabaseUrl = 'https://fqyumkedaeybdxtrthvb.supabase.co';
const supabaseAnonKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImZxeXVta2VkYWV5YmR4dHJ0aHZiIiwicm9sZSI6ImFub24iLCJpYXQiOjE3MzYzNjgyNTEsImV4cCI6MjA1MTk0NDI1MX0.Jl3FLgguNk5LBm1pmw_aUE1SjxxhHG0oy59FEBPDt-k';

const supabase = createClient(supabaseUrl, supabaseAnonKey);

function generateEmbedding(text) {
  // Simulated embedding using SHA256 hash
  const hash = crypto.createHash('sha256').update(text).digest();
  const embedding = new Array(1536).fill(0).map((_, i) => {
    const byte = hash[i % hash.length];
    return (byte / 255) * 2 - 1; // Normalize to [-1, 1]
  });
  return embedding;
}

function chunkText(text, maxChunkSize = 1000) {
  const chunks = [];
  const paragraphs = text.split(/\n\n+/);
  let currentChunk = '';

  for (const paragraph of paragraphs) {
    if ((currentChunk + paragraph).length > maxChunkSize && currentChunk) {
      chunks.push(currentChunk.trim());
      currentChunk = paragraph;
    } else {
      currentChunk += (currentChunk ? '\n\n' : '') + paragraph;
    }
  }

  if (currentChunk) {
    chunks.push(currentChunk.trim());
  }

  return chunks;
}

function extractKeywords(text) {
  const keywords = new Set();
  
  const heightKeywords = ['altura', 'gabarito', 'elevação', 'limite vertical', 'altura máxima', 
                         'gabarito máximo', 'metros', 'pavimentos', 'andares'];
  const zoneKeywords = ['zona', 'zot', 'bairro', 'região', 'área', 'setor'];
  const urbanKeywords = ['urbanístico', 'edificação', 'construção', 'ocupação', 
                        'aproveitamento', 'parcelamento', 'uso do solo'];

  const lowerText = text.toLowerCase();
  
  [...heightKeywords, ...zoneKeywords, ...urbanKeywords].forEach(keyword => {
    if (lowerText.includes(keyword)) {
      keywords.add(keyword);
    }
  });

  const qaMatches = text.match(/Q:\s*([^?]+)\?/gi);
  if (qaMatches) {
    qaMatches.forEach(match => {
      const question = match.replace(/Q:\s*/i, '').replace('?', '').toLowerCase();
      const words = question.split(/\s+/).filter(word => word.length > 3);
      words.slice(0, 3).forEach(word => keywords.add(word));
    });
  }

  return Array.from(keywords);
}

async function deployViaAPI() {
  console.log('🚀 Deploy do PDPOA2025-QA.docx via API do Supabase...\n');

  try {
    // Load the extracted content
    const contentFile = path.join(__dirname, 'PDPOA2025-QA-content.txt');
    if (!fs.existsSync(contentFile)) {
      throw new Error('Arquivo de conteúdo não encontrado. Execute extract-qa-content.mjs primeiro.');
    }

    const content = fs.readFileSync(contentFile, 'utf-8');
    console.log(`📄 Conteúdo carregado: ${content.length} caracteres`);

    // Check and remove existing document
    console.log('\n🔍 Verificando documento existente...');
    const { data: existingDocs, error: checkError } = await supabase
      .from('documents')
      .select('id')
      .eq('name', 'PDPOA2025-QA.docx');

    if (checkError) {
      console.error('Erro ao verificar:', checkError);
    }

    if (existingDocs && existingDocs.length > 0) {
      console.log('⚠️  Removendo versões anteriores...');
      
      for (const doc of existingDocs) {
        // Delete embeddings
        const { error: delEmbError } = await supabase
          .from('document_embeddings')
          .delete()
          .eq('document_id', doc.id);

        if (delEmbError) {
          console.error('Erro ao deletar embeddings:', delEmbError);
        }

        // Delete document
        const { error: delDocError } = await supabase
          .from('documents')
          .delete()
          .eq('id', doc.id);

        if (delDocError) {
          console.error('Erro ao deletar documento:', delDocError);
        }
      }
      
      console.log('✅ Versões anteriores removidas');
    }

    // Create new document
    console.log('\n📝 Criando novo documento...');
    const documentId = crypto.randomUUID();
    const timestamp = new Date().toISOString();

    const { data: newDoc, error: docError } = await supabase
      .from('documents')
      .insert({
        id: documentId,
        name: 'PDPOA2025-QA.docx',
        storage_path: `local/PDPOA2025-QA-${Date.now()}.docx`,
        type: 'Q&A',
        status: 'processing',
        metadata: {
          processed_at: timestamp,
          total_chars: content.length,
          processing_method: 'api-batch'
        }
      })
      .select()
      .single();

    if (docError) {
      throw new Error(`Erro ao criar documento: ${docError.message}`);
    }

    console.log('✅ Documento criado:', documentId);

    // Create chunks
    console.log('\n🔪 Criando chunks...');
    const chunks = chunkText(content);
    console.log(`✅ ${chunks.length} chunks criados`);

    // Process chunks in batches
    const BATCH_SIZE = 5; // Process 5 chunks at a time
    let processedChunks = 0;

    console.log('\n🤖 Processando chunks em lotes...');
    
    for (let i = 0; i < chunks.length; i += BATCH_SIZE) {
      const batch = chunks.slice(i, Math.min(i + BATCH_SIZE, chunks.length));
      const embeddingsBatch = [];

      console.log(`\n📦 Processando lote ${Math.floor(i/BATCH_SIZE) + 1}/${Math.ceil(chunks.length/BATCH_SIZE)}...`);

      for (let j = 0; j < batch.length; j++) {
        const chunkIndex = i + j;
        const chunk = batch[j];
        
        // Generate embedding
        const embedding = generateEmbedding(chunk);
        const keywords = extractKeywords(chunk);

        embeddingsBatch.push({
          document_id: documentId,
          embedding: JSON.stringify(embedding),
          content: chunk,
          content_preview: chunk.substring(0, 200),
          chunk_index: chunkIndex,
          metadata: {
            keywords: keywords,
            chunk_size: chunk.length,
            has_qa: chunk.includes('Q:') && chunk.includes('A:'),
            topics: keywords.filter(k => ['altura', 'zot', 'urbanístico'].some(t => k.includes(t)))
          }
        });
      }

      // Insert batch
      const { error: batchError } = await supabase
        .from('document_embeddings')
        .insert(embeddingsBatch);

      if (batchError) {
        console.error(`❌ Erro no lote ${Math.floor(i/BATCH_SIZE) + 1}:`, batchError);
        throw batchError;
      }

      processedChunks += batch.length;
      console.log(`✅ Lote processado: ${processedChunks}/${chunks.length} chunks`);

      // Small delay to avoid rate limiting
      if (i + BATCH_SIZE < chunks.length) {
        await new Promise(resolve => setTimeout(resolve, 500));
      }
    }

    // Update document status
    console.log('\n📊 Finalizando documento...');
    const { error: updateError } = await supabase
      .from('documents')
      .update({ 
        status: 'processed',
        metadata: {
          processed_at: timestamp,
          total_chars: content.length,
          total_chunks: chunks.length,
          processing_method: 'api-batch',
          completed_at: new Date().toISOString()
        }
      })
      .eq('id', documentId);

    if (updateError) {
      console.error('Erro ao atualizar status:', updateError);
    }

    // Verify results
    console.log('\n🔍 Verificando resultados...');
    const { data: finalDoc } = await supabase
      .from('documents')
      .select('*')
      .eq('id', documentId)
      .single();

    const { data: embeddingCount } = await supabase
      .from('document_embeddings')
      .select('id', { count: 'exact', head: true })
      .eq('document_id', documentId);

    console.log('\n✅ Deploy concluído com sucesso!');
    console.log('\n📊 Resumo:');
    console.log(`   Documento: ${finalDoc.name}`);
    console.log(`   Status: ${finalDoc.status}`);
    console.log(`   Document ID: ${documentId}`);
    console.log(`   Total de chunks: ${chunks.length}`);
    console.log(`   Chunks salvos: ${embeddingCount?.count || processedChunks}`);

    // Show sample queries
    console.log('\n🔍 Queries de teste:');
    console.log('\n-- Verificar chunks sobre altura:');
    console.log(`SELECT content_preview, metadata
FROM document_embeddings
WHERE document_id = '${documentId}'
  AND content ILIKE '%altura%'
LIMIT 3;`);

    console.log('\n-- Contar total de chunks:');
    console.log(`SELECT COUNT(*) as total
FROM document_embeddings
WHERE document_id = '${documentId}';`);

  } catch (error) {
    console.error('\n❌ Erro durante o deploy:', error.message);
    console.error(error.stack);
    process.exit(1);
  }
}

// Run the deployment
console.log('=' .repeat(60));
console.log('📋 DEPLOY VIA API - PDPOA2025-QA.docx');
console.log('=' .repeat(60) + '\n');

deployViaAPI();