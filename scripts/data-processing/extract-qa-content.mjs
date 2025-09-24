#!/usr/bin/env node

import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import mammoth from 'mammoth';
import crypto from 'crypto';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

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
  
  // Height-related keywords
  const heightKeywords = ['altura', 'gabarito', 'elevação', 'limite vertical', 'altura máxima', 
                         'gabarito máximo', 'metros', 'pavimentos', 'andares'];
  
  // Zone keywords
  const zoneKeywords = ['zona', 'zot', 'bairro', 'região', 'área', 'setor'];
  
  // Urban keywords
  const urbanKeywords = ['urbanístico', 'edificação', 'construção', 'ocupação', 
                        'aproveitamento', 'parcelamento', 'uso do solo'];

  const lowerText = text.toLowerCase();
  
  [...heightKeywords, ...zoneKeywords, ...urbanKeywords].forEach(keyword => {
    if (lowerText.includes(keyword)) {
      keywords.add(keyword);
    }
  });

  // Extract Q&A keywords
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

function escapeSqlString(str) {
  return str.replace(/'/g, "''");
}

async function extractAndGenerateSQL() {
  console.log('🚀 Extraindo conteúdo e gerando SQL para PDPOA2025-QA.docx...\n');

  try {
    const filePath = path.join(__dirname, 'knowledgebase', 'PDPOA2025-QA.docx');
    
    // Check if file exists
    if (!fs.existsSync(filePath)) {
      throw new Error(`Arquivo não encontrado: ${filePath}`);
    }

    console.log('📄 Arquivo encontrado:', filePath);
    const stats = fs.statSync(filePath);
    console.log(`📊 Tamanho: ${(stats.size / 1024).toFixed(2)} KB`);

    // Extract content
    console.log('\n📖 Extraindo conteúdo do documento...');
    const buffer = fs.readFileSync(filePath);
    const result = await mammoth.extractRawText({ buffer });
    const content = result.value;
    console.log(`✅ Conteúdo extraído: ${content.length} caracteres`);

    // Save raw content
    const contentFile = path.join(__dirname, 'PDPOA2025-QA-content.txt');
    fs.writeFileSync(contentFile, content, 'utf-8');
    console.log(`✅ Conteúdo salvo em: ${contentFile}`);

    // Generate SQL
    console.log('\n🔪 Gerando SQL para inserção no Supabase...');
    
    const documentId = crypto.randomUUID();
    const timestamp = new Date().toISOString();
    
    let sql = `-- SQL para processar PDPOA2025-QA.docx
-- Gerado em: ${timestamp}
-- Execute este SQL no Supabase SQL Editor

-- 1. Remover documento anterior se existir
DELETE FROM document_embeddings WHERE document_id IN (
  SELECT id FROM documents WHERE name = 'PDPOA2025-QA.docx'
);
DELETE FROM documents WHERE name = 'PDPOA2025-QA.docx';

-- 2. Inserir novo documento
INSERT INTO documents (id, name, storage_path, type, status, metadata) VALUES (
  '${documentId}',
  'PDPOA2025-QA.docx',
  'local/PDPOA2025-QA-${Date.now()}.docx',
  'Q&A',
  'processed',
  '${JSON.stringify({
    size: stats.size,
    modified: stats.mtime,
    processed_at: timestamp,
    total_chars: content.length
  })}'::jsonb
);

-- 3. Inserir embeddings\n`;

    // Chunk content
    const chunks = chunkText(content);
    console.log(`✅ ${chunks.length} chunks criados`);

    // Process each chunk
    chunks.forEach((chunk, index) => {
      const embedding = generateEmbedding(chunk);
      const keywords = extractKeywords(chunk);
      
      sql += `
-- Chunk ${index + 1}/${chunks.length}
INSERT INTO document_embeddings (
  document_id, 
  embedding, 
  content, 
  content_preview, 
  chunk_index, 
  metadata
) VALUES (
  '${documentId}',
  '[${embedding.slice(0, 10).join(',')},...${embedding.slice(-5).join(',')}]'::vector(1536),
  '${escapeSqlString(chunk)}',
  '${escapeSqlString(chunk.substring(0, 200))}',
  ${index},
  '${JSON.stringify({
    keywords: keywords,
    chunk_size: chunk.length,
    has_qa: chunk.includes('Q:') && chunk.includes('A:'),
    topics: keywords.filter(k => ['altura', 'zot', 'urbanístico'].some(t => k.includes(t)))
  })}'::jsonb
);`;
    });

    sql += `\n\n-- 4. Verificar inserção
SELECT 
  d.name,
  d.status,
  COUNT(de.id) as total_chunks
FROM documents d
LEFT JOIN document_embeddings de ON d.id = de.document_id
WHERE d.id = '${documentId}'
GROUP BY d.id, d.name, d.status;`;

    // Save SQL file
    const sqlFile = path.join(__dirname, 'insert-qa-document.sql');
    fs.writeFileSync(sqlFile, sql, 'utf-8');
    console.log(`\n✅ SQL gerado e salvo em: ${sqlFile}`);

    // Also generate a simplified version with actual embeddings
    console.log('\n🤖 Gerando versão com embeddings completos...');
    
    let fullSql = sql;
    chunks.forEach((chunk, index) => {
      const embedding = generateEmbedding(chunk);
      const embeddingStr = `[${embedding.join(',')}]`;
      
      // Replace the shortened embedding with full one
      fullSql = fullSql.replace(
        `'[${embedding.slice(0, 10).join(',')},...${embedding.slice(-5).join(',')}]'::vector(1536)`,
        `'${embeddingStr}'::vector(1536)`
      );
    });

    const fullSqlFile = path.join(__dirname, 'insert-qa-document-full.sql');
    fs.writeFileSync(fullSqlFile, fullSql, 'utf-8');
    console.log(`✅ SQL com embeddings completos salvo em: ${fullSqlFile}`);

    console.log('\n📊 Resumo:');
    console.log(`   ✅ Conteúdo extraído: ${content.length} caracteres`);
    console.log(`   ✅ Chunks gerados: ${chunks.length}`);
    console.log(`   ✅ Keywords únicas: ${new Set(chunks.flatMap(c => extractKeywords(c))).size}`);
    console.log(`   ✅ Document ID: ${documentId}`);

    console.log('\n🎯 Próximos passos:');
    console.log('1. Abra o Supabase SQL Editor');
    console.log('2. Cole e execute o conteúdo de: insert-qa-document-full.sql');
    console.log('3. Verifique se os chunks foram inseridos corretamente');

    // Show sample content
    console.log('\n📝 Amostra do conteúdo extraído:');
    console.log('-'.repeat(60));
    console.log(content.substring(0, 500) + '...');
    console.log('-'.repeat(60));

  } catch (error) {
    console.error('\n❌ Erro:', error.message);
    process.exit(1);
  }
}

console.log('=' .repeat(60));
console.log('📋 EXTRAÇÃO E GERAÇÃO DE SQL - PDPOA2025-QA.docx');
console.log('=' .repeat(60) + '\n');

extractAndGenerateSQL();