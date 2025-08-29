#!/usr/bin/env node

/**
 * REBUILD DA TABELA document_sections DO ZERO
 * Mais eficiente que tentar corrigir os problemas existentes
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

const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_KEY);
const openai = new OpenAI({ apiKey: OPENAI_API_KEY });

console.log(chalk.red.bold('='.repeat(60)));
console.log(chalk.red.bold('   🔄 REBUILD COMPLETO DA TABELA'));
console.log(chalk.red.bold('='.repeat(60)));

// SQL para recriar a tabela
const rebuildSQL = `
-- 1. Fazer backup dos dados importantes
CREATE TABLE IF NOT EXISTS document_sections_backup AS 
SELECT id, content, metadata, created_at, updated_at 
FROM document_sections;

-- 2. Deletar tabela antiga
DROP TABLE IF EXISTS document_sections CASCADE;

-- 3. Criar tabela nova com estrutura correta
CREATE TABLE document_sections (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  content text NOT NULL,
  metadata jsonb DEFAULT '{}'::jsonb,
  embedding vector(1536),
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

-- 4. Criar índices
CREATE INDEX document_sections_embedding_idx 
ON document_sections 
USING ivfflat (embedding vector_cosine_ops)
WITH (lists = 100);

CREATE INDEX document_sections_metadata_idx 
ON document_sections 
USING gin (metadata);

-- 5. Criar função para update com embedding correto
CREATE OR REPLACE FUNCTION update_document_embedding(
  doc_id uuid,
  new_embedding float[]
)
RETURNS void
LANGUAGE plpgsql
AS $$
BEGIN
  UPDATE document_sections 
  SET embedding = new_embedding::vector,
      updated_at = now()
  WHERE id = doc_id;
END;
$$;

-- 6. Criar função de busca vetorial
CREATE OR REPLACE FUNCTION match_document_sections(
  query_embedding vector,
  match_threshold float DEFAULT 0.7,
  match_count int DEFAULT 10
)
RETURNS TABLE (
  id uuid,
  content text,
  metadata jsonb,
  similarity float
)
LANGUAGE plpgsql
AS $$
BEGIN
  RETURN QUERY
  SELECT 
    ds.id,
    ds.content,
    ds.metadata,
    1 - (ds.embedding <=> query_embedding) AS similarity
  FROM document_sections ds
  WHERE ds.embedding IS NOT NULL
    AND 1 - (ds.embedding <=> query_embedding) > match_threshold
  ORDER BY ds.embedding <=> query_embedding
  LIMIT match_count;
END;
$$;

-- 7. Habilitar RLS
ALTER TABLE document_sections ENABLE ROW LEVEL SECURITY;

-- 8. Criar políticas
CREATE POLICY "Permitir leitura pública" 
ON document_sections FOR SELECT 
USING (true);

CREATE POLICY "Permitir insert para service role" 
ON document_sections FOR INSERT 
WITH CHECK (auth.role() = 'service_role');

CREATE POLICY "Permitir update para service role" 
ON document_sections FOR UPDATE 
USING (auth.role() = 'service_role');
`;

async function showSQL() {
  console.log(chalk.yellow.bold('\n📝 SQL PARA EXECUTAR NO SUPABASE:\n'));
  console.log(chalk.cyan(rebuildSQL));
  
  console.log(chalk.yellow.bold('\n⚠️  ATENÇÃO:'));
  console.log('1. Este SQL vai DELETAR a tabela document_sections');
  console.log('2. Um backup será criado em document_sections_backup');
  console.log('3. A tabela será recriada com estrutura correta');
  console.log('4. Você precisará reprocessar os 4 arquivos DOCX');
  
  console.log(chalk.green.bold('\n✅ DEPOIS DE EXECUTAR O SQL, RODE:'));
  console.log('node scripts/process-knowledge-base.mjs');
}

async function processKnowledgeBase() {
  console.log(chalk.cyan.bold('\n📚 PROCESSANDO KNOWLEDGE BASE\n'));
  
  const kbPath = path.join(__dirname, '..', 'knowledgebase');
  const files = await fs.readdir(kbPath);
  const docxFiles = files.filter(f => f.endsWith('.docx'));
  
  console.log(`Encontrados ${docxFiles.length} arquivos DOCX:`);
  docxFiles.forEach(f => console.log('  -', f));
  
  // Verificar se a função qa-ingest-kb existe
  console.log('\n🔍 Verificando edge function qa-ingest-kb...');
  try {
    const response = await fetch(`${SUPABASE_URL}/functions/v1/qa-ingest-kb`, {
      method: 'OPTIONS',
      headers: {
        'Authorization': `Bearer ${SUPABASE_ANON_KEY}`,
      }
    });
    
    if (response.ok || response.status === 405) {
      console.log('✅ Edge function disponível');
      
      console.log(chalk.yellow.bold('\n📝 Para processar os arquivos:'));
      console.log('1. Execute o SQL acima no Supabase');
      console.log('2. Depois rode: node scripts/process-knowledge-base.mjs');
      console.log('3. Ou use o Admin Dashboard para fazer upload dos DOCX');
      
    } else {
      console.log('❌ Edge function não encontrada');
      console.log('\nAlternativa: Use o Admin Dashboard para fazer upload dos arquivos DOCX');
    }
  } catch (error) {
    console.log('⚠️ Não foi possível verificar edge function');
  }
}

async function main() {
  // Mostrar SQL
  await showSQL();
  
  // Verificar processamento
  await processKnowledgeBase();
  
  console.log(chalk.green.bold('\n🎯 RESUMO DO PROCESSO:'));
  console.log('1. Execute o SQL no Supabase Dashboard');
  console.log('2. Faça upload dos 4 arquivos DOCX via Admin Dashboard');
  console.log('3. Ou use: node scripts/process-knowledge-base.mjs');
  console.log('4. Teste com: node scripts/03-test-vector-search.mjs');
}

main().catch(console.error);