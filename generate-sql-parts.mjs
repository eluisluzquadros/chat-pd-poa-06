#!/usr/bin/env node

import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import crypto from 'crypto';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

function generateEmbedding(text) {
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

function escapeSqlString(str) {
  return str.replace(/'/g, "''");
}

async function generateSQLParts() {
  console.log('🚀 Gerando SQL em partes menores...\n');

  try {
    const contentFile = path.join(__dirname, 'PDPOA2025-QA-content.txt');
    if (!fs.existsSync(contentFile)) {
      throw new Error('Arquivo de conteúdo não encontrado.');
    }

    const content = fs.readFileSync(contentFile, 'utf-8');
    console.log(`📄 Conteúdo carregado: ${content.length} caracteres`);

    const documentId = crypto.randomUUID();
    const timestamp = new Date().toISOString();
    
    // Part 1: Document setup
    const part1 = `-- PARTE 1: Setup do Documento
-- Execute esta parte primeiro

-- Remover documento anterior
DELETE FROM document_embeddings WHERE document_id IN (
  SELECT id FROM documents WHERE name = 'PDPOA2025-QA.docx'
);
DELETE FROM documents WHERE name = 'PDPOA2025-QA.docx';

-- Inserir novo documento
INSERT INTO documents (id, name, storage_path, type, status, metadata) VALUES (
  '${documentId}',
  'PDPOA2025-QA.docx',
  'local/PDPOA2025-QA-${Date.now()}.docx',
  'Q&A',
  'processed',
  '${JSON.stringify({
    size: 331287, // size from file stats
    processed_at: timestamp,
    total_chars: content.length
  })}'::jsonb
);

-- Verificar inserção
SELECT id, name, status FROM documents WHERE id = '${documentId}';`;

    fs.writeFileSync('sql-part-1-document.sql', part1);
    console.log('✅ Parte 1 salva: sql-part-1-document.sql');

    // Chunk content
    const chunks = chunkText(content);
    console.log(`\n🔪 ${chunks.length} chunks criados`);

    // Generate parts for chunks (10 chunks per file)
    const CHUNKS_PER_FILE = 10;
    let partNumber = 2;

    for (let i = 0; i < chunks.length; i += CHUNKS_PER_FILE) {
      const endIndex = Math.min(i + CHUNKS_PER_FILE, chunks.length);
      let partSql = `-- PARTE ${partNumber}: Chunks ${i + 1} a ${endIndex}
-- Document ID: ${documentId}

`;

      for (let j = i; j < endIndex; j++) {
        const chunk = chunks[j];
        const embedding = generateEmbedding(chunk);
        const keywords = extractKeywords(chunk);
        
        // For SQL files, we'll use a placeholder for embeddings to keep file size manageable
        const embeddingPlaceholder = `ARRAY[${embedding.slice(0, 5).join(',')}/* ... mais ${embedding.length - 10} valores ... */,${embedding.slice(-5).join(',')}]::float[]`;
        
        partSql += `-- Chunk ${j + 1}
INSERT INTO document_embeddings (
  document_id, 
  embedding, 
  content, 
  content_preview, 
  chunk_index, 
  metadata
) VALUES (
  '${documentId}',
  ${embeddingPlaceholder}::vector(1536),
  '${escapeSqlString(chunk)}',
  '${escapeSqlString(chunk.substring(0, 200))}',
  ${j},
  '${JSON.stringify({
    keywords: keywords,
    chunk_size: chunk.length,
    has_qa: chunk.includes('Q:') && chunk.includes('A:')
  })}'::jsonb
);

`;
      }

      partSql += `\n-- Verificar chunks inseridos
SELECT COUNT(*) as chunks_inserted FROM document_embeddings 
WHERE document_id = '${documentId}' AND chunk_index >= ${i} AND chunk_index < ${endIndex};`;

      const filename = `sql-part-${partNumber}-chunks-${i + 1}-to-${endIndex}.sql`;
      fs.writeFileSync(filename, partSql);
      console.log(`✅ Parte ${partNumber} salva: ${filename}`);
      partNumber++;
    }

    // Create a script to process chunks via Edge Function
    const processScript = `#!/usr/bin/env node
// Script para processar chunks via Edge Function
// Execute após inserir o documento base (parte 1)

import fetch from 'node-fetch';

const supabaseUrl = 'https://fqyumkedaeybdxtrthvb.supabase.co';
const supabaseAnonKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImZxeXVta2VkYWV5YmR4dHJ0aHZiIiwicm9sZSI6ImFub24iLCJpYXQiOjE3MzYzNjgyNTEsImV4cCI6MjA1MTk0NDI1MX0.Jl3FLgguNk5LBm1pmw_aUE1SjxxhHG0oy59FEBPDt-k';

const documentId = '${documentId}';
const chunks = ${JSON.stringify(chunks.map((c, i) => ({
  index: i,
  preview: c.substring(0, 100) + '...'
})))};

async function processChunks() {
  console.log('Processando ' + chunks.length + ' chunks...');
  
  // Processar em lotes de 5
  for (let i = 0; i < chunks.length; i += 5) {
    const batch = chunks.slice(i, i + 5);
    console.log('Processando chunks ' + (i+1) + ' a ' + Math.min(i+5, chunks.length));
    
    // TODO: Implementar chamada para Edge Function
    // quando a conectividade estiver disponível
  }
}

processChunks();
`;

    fs.writeFileSync('process-chunks-edge-function.mjs', processScript);

    // Final verification SQL
    const verificationSql = `-- VERIFICAÇÃO FINAL
-- Execute após todas as partes

-- Contar total de chunks
SELECT 
  d.name,
  d.status,
  COUNT(de.id) as total_chunks,
  MIN(de.chunk_index) as first_chunk,
  MAX(de.chunk_index) as last_chunk
FROM documents d
LEFT JOIN document_embeddings de ON d.id = de.document_id
WHERE d.id = '${documentId}'
GROUP BY d.id, d.name, d.status;

-- Verificar chunks sobre altura
SELECT 
  chunk_index,
  content_preview,
  metadata->>'keywords' as keywords
FROM document_embeddings
WHERE document_id = '${documentId}'
  AND (
    content ILIKE '%altura%' OR
    content ILIKE '%gabarito%' OR
    metadata->>'keywords' LIKE '%altura%'
  )
ORDER BY chunk_index
LIMIT 5;

-- Estatísticas gerais
SELECT 
  COUNT(*) as total_embeddings,
  COUNT(DISTINCT document_id) as total_documents,
  MAX(chunk_index) + 1 as max_chunks_per_doc
FROM document_embeddings;`;

    fs.writeFileSync('sql-verification-final.sql', verificationSql);

    console.log('\n📊 Resumo da geração:');
    console.log(`   ✅ Total de arquivos SQL: ${partNumber}`);
    console.log(`   ✅ Document ID: ${documentId}`);
    console.log(`   ✅ Total de chunks: ${chunks.length}`);
    console.log(`   ✅ Arquivos gerados:`);
    console.log(`      - sql-part-1-document.sql (setup inicial)`);
    for (let i = 2; i < partNumber; i++) {
      const start = (i - 2) * CHUNKS_PER_FILE + 1;
      const end = Math.min(start + CHUNKS_PER_FILE - 1, chunks.length);
      console.log(`      - sql-part-${i}-chunks-${start}-to-${end}.sql`);
    }
    console.log(`      - sql-verification-final.sql (verificação)`);
    console.log(`      - process-chunks-edge-function.mjs (script auxiliar)`);

    console.log('\n🎯 Como executar:');
    console.log('1. Abra o Supabase SQL Editor');
    console.log('2. Execute sql-part-1-document.sql primeiro');
    console.log('3. Execute as partes de chunks em ordem (parte 2, 3, etc.)');
    console.log('4. Execute sql-verification-final.sql para verificar');
    console.log('\n⚠️  NOTA: Os embeddings nos SQLs são simplificados.');
    console.log('Para embeddings reais, use a Edge Function ou API OpenAI.');

  } catch (error) {
    console.error('\n❌ Erro:', error.message);
    process.exit(1);
  }
}

console.log('=' .repeat(60));
console.log('📋 GERADOR DE SQL EM PARTES');
console.log('=' .repeat(60) + '\n');

generateSQLParts();