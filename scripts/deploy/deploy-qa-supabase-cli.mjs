#!/usr/bin/env node

import { createClient } from '@supabase/supabase-js';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import crypto from 'crypto';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Configuração do Supabase (do guia)
const supabase = createClient(
  'https://ngrqwmvuhvjkeohesbxs.supabase.co',
  'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Im5ncnF3bXZ1aHZqa2VvaGVzYnhzIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc1MzYwOTAxNywiZXhwIjoyMDY5MTg1MDE3fQ.7jVZP70RAjpfFPfehZt5Gr3vSxn8DZ3YyPJNjCwZXEo'
);

function generateEmbedding(text) {
  // Simulated embedding usando SHA256
  const hash = crypto.createHash('sha256').update(text).digest();
  const embedding = new Array(1536).fill(0).map((_, i) => {
    const byte = hash[i % hash.length];
    return (byte / 255) * 2 - 1;
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

async function deployQADocument() {
  console.log('🚀 Deploy do PDPOA2025-QA.docx via Supabase CLI...\n');

  try {
    // Carregar conteúdo extraído
    const contentFile = path.join(__dirname, 'PDPOA2025-QA-content.txt');
    if (!fs.existsSync(contentFile)) {
      throw new Error('Arquivo de conteúdo não encontrado. Execute extract-qa-content.mjs primeiro.');
    }

    const content = fs.readFileSync(contentFile, 'utf-8');
    console.log(`📄 Conteúdo carregado: ${content.length} caracteres`);

    // Verificar estrutura da tabela documents
    console.log('\n🔍 Verificando estrutura da tabela documents...');
    const { data: sampleDoc, error: sampleError } = await supabase
      .from('documents')
      .select('*')
      .limit(1);

    if (sampleError) {
      console.error('❌ Erro ao verificar tabela:', sampleError);
      throw sampleError;
    }

    if (sampleDoc && sampleDoc.length > 0) {
      console.log('✅ Colunas encontradas:', Object.keys(sampleDoc[0]).join(', '));
    }

    // Remover documento anterior se existir
    console.log('\n🗑️  Removendo versões anteriores...');
    const { data: existingDocs } = await supabase
      .from('documents')
      .select('id')
      .eq('metadata->title', 'PDPOA2025-QA.docx');

    if (existingDocs && existingDocs.length > 0) {
      for (const doc of existingDocs) {
        await supabase
          .from('document_embeddings')
          .delete()
          .eq('document_id', doc.id);

        await supabase
          .from('documents')
          .delete()
          .eq('id', doc.id);
      }
      console.log('✅ Versões anteriores removidas');
    }

    // Criar novo documento
    console.log('\n📝 Criando novo documento...');
    const documentData = {
      file_name: 'PDPOA2025-QA.docx',
      file_path: 'knowledgebase/PDPOA2025-QA.docx',
      type: 'Q&A',
      is_public: true,
      is_processed: true,
      metadata: {
        title: 'PDPOA2025-QA.docx',
        total_chars: content.length,
        processed_at: new Date().toISOString(),
        description: 'Perguntas e Respostas sobre o Plano Diretor de Porto Alegre 2025'
      }
    };

    const { data: newDoc, error: docError } = await supabase
      .from('documents')
      .insert(documentData)
      .select()
      .single();

    if (docError) {
      console.error('❌ Erro ao criar documento:', docError);
      throw docError;
    }

    console.log('✅ Documento criado com ID:', newDoc.id);

    // Criar chunks
    console.log('\n🔪 Criando chunks...');
    const chunks = chunkText(content);
    console.log(`✅ ${chunks.length} chunks criados`);

    // Processar chunks em lotes pequenos
    const BATCH_SIZE = 5;
    let processedChunks = 0;

    console.log('\n🤖 Inserindo chunks em lotes...');
    
    for (let i = 0; i < chunks.length; i += BATCH_SIZE) {
      const batch = chunks.slice(i, Math.min(i + BATCH_SIZE, chunks.length));
      const embeddingsBatch = [];

      console.log(`\n📦 Processando lote ${Math.floor(i/BATCH_SIZE) + 1}/${Math.ceil(chunks.length/BATCH_SIZE)}...`);

      for (let j = 0; j < batch.length; j++) {
        const chunkIndex = i + j;
        const chunk = batch[j];
        
        const embedding = generateEmbedding(chunk);
        const keywords = extractKeywords(chunk);

        embeddingsBatch.push({
          document_id: newDoc.id,
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

      const { error: batchError } = await supabase
        .from('document_embeddings')
        .insert(embeddingsBatch);

      if (batchError) {
        console.error(`❌ Erro no lote ${Math.floor(i/BATCH_SIZE) + 1}:`, batchError);
        throw batchError;
      }

      processedChunks += batch.length;
      console.log(`✅ Lote processado: ${processedChunks}/${chunks.length} chunks`);

      // Pequeno delay para evitar rate limiting
      if (i + BATCH_SIZE < chunks.length) {
        await new Promise(resolve => setTimeout(resolve, 100));
      }
    }

    // Verificar resultados
    console.log('\n🔍 Verificando resultados...');
    const { data: finalDoc } = await supabase
      .from('documents')
      .select('*')
      .eq('id', newDoc.id)
      .single();

    const { count: embeddingCount } = await supabase
      .from('document_embeddings')
      .select('*', { count: 'exact', head: true })
      .eq('document_id', newDoc.id);

    console.log('\n✅ Deploy concluído com sucesso!');
    console.log('\n📊 Resumo:');
    console.log(`   Documento: ${finalDoc.file_name}`);
    console.log(`   Status: ${finalDoc.is_processed ? 'Processado' : 'Pendente'}`);
    console.log(`   Document ID: ${newDoc.id}`);
    console.log(`   Total de chunks: ${chunks.length}`);
    console.log(`   Chunks salvos: ${embeddingCount || processedChunks}`);

    // Testar busca por altura
    console.log('\n🔍 Testando busca por altura...');
    const { data: heightChunks, error: searchError } = await supabase
      .from('document_embeddings')
      .select('content_preview, metadata')
      .eq('document_id', newDoc.id)
      .or('content.ilike.%altura%,content.ilike.%gabarito%')
      .limit(3);

    if (searchError) {
      console.error('❌ Erro na busca:', searchError);
    } else {
      console.log(`✅ Encontrados ${heightChunks?.length || 0} chunks sobre altura`);
      heightChunks?.forEach((chunk, idx) => {
        console.log(`\n   Chunk ${idx + 1}:`);
        console.log(`   Preview: ${chunk.content_preview.substring(0, 100)}...`);
        console.log(`   Keywords: ${chunk.metadata?.keywords?.join(', ') || 'N/A'}`);
      });
    }

    console.log('\n🎉 Documento PDPOA2025-QA.docx foi deployado com sucesso no Supabase!');

  } catch (error) {
    console.error('\n❌ Erro durante o deploy:', error.message);
    console.error(error.stack);
    process.exit(1);
  }
}

// Executar o deploy
console.log('=' .repeat(60));
console.log('📋 DEPLOY VIA SUPABASE CLI - PDPOA2025-QA.docx');
console.log('=' .repeat(60) + '\n');

deployQADocument();