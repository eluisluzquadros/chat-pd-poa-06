#!/usr/bin/env node

import { createClient } from '@supabase/supabase-js';
import chalk from 'chalk';
import { config } from 'dotenv';
import { fileURLToPath } from 'url';
import path from 'path';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
config({ path: path.join(__dirname, '..', '.env.local') });

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY
);

console.log(chalk.red.bold('🔍 VERIFICAÇÃO COMPLETA DO PROBLEMA'));
console.log(chalk.red.bold('='.repeat(40)));

async function verify() {
  // 1. Verificar um embedding específico
  console.log('\n1️⃣ VERIFICANDO UM EMBEDDING:');
  
  const { data: doc } = await supabase
    .from('document_sections')
    .select('id, embedding')
    .not('embedding', 'is', null)
    .limit(1)
    .single();
  
  if (doc && doc.embedding) {
    console.log('ID:', doc.id);
    console.log('Tipo do embedding:', typeof doc.embedding);
    console.log('É Array?:', Array.isArray(doc.embedding));
    
    if (typeof doc.embedding === 'string') {
      console.log('Comprimento da string:', doc.embedding.length, 'caracteres');
      console.log('Começa com:', doc.embedding.substring(0, 50));
      console.log(chalk.red('❌ PROBLEMA: Embedding está como STRING!'));
    } else if (Array.isArray(doc.embedding)) {
      console.log('Tamanho do array:', doc.embedding.length, 'elementos');
      if (doc.embedding.length === 1536) {
        console.log(chalk.green('✅ Array com tamanho correto!'));
      }
    }
  }
  
  // 2. Verificar extensão pgvector
  console.log('\n2️⃣ VERIFICANDO PGVECTOR:');
  
  try {
    const { data: extensions } = await supabase
      .rpc('get_extensions')
      .single();
    
    console.log('Extensões instaladas:', extensions);
  } catch (e) {
    console.log('Não foi possível verificar extensões via RPC');
  }
  
  // 3. Testar função de busca vetorial
  console.log('\n3️⃣ TESTANDO FUNÇÃO VECTOR SEARCH:');
  
  try {
    // Criar um embedding de teste
    const testEmbedding = new Array(1536).fill(0.1);
    
    const { data, error } = await supabase.rpc('match_document_sections', {
      query_embedding: testEmbedding,
      match_threshold: 0.1,
      match_count: 1
    });
    
    if (error) {
      console.log(chalk.red('❌ Erro na função:', error.message));
      
      if (error.message.includes('function match_document_sections') && error.message.includes('does not exist')) {
        console.log(chalk.yellow('Função não existe. Crie com o SQL fornecido.'));
      } else if (error.message.includes('operator does not exist')) {
        console.log(chalk.yellow('Problema com operador <=>. pgvector pode não estar instalado.'));
      }
    } else {
      console.log(chalk.green('✅ Função existe e retornou:', data?.length || 0, 'resultados'));
    }
  } catch (e) {
    console.log(chalk.red('❌ Erro ao testar:', e.message));
  }
  
  // 4. Solução definitiva
  console.log(chalk.yellow.bold('\n🔧 SOLUÇÃO DEFINITIVA:\n'));
  
  console.log('Execute NO SUPABASE SQL EDITOR na seguinte ordem:');
  console.log(chalk.cyan(`
-- PASSO 1: Verificar tipo atual da coluna
SELECT column_name, data_type, udt_name
FROM information_schema.columns 
WHERE table_name = 'document_sections' 
AND column_name = 'embedding';

-- Se não mostrar udt_name = 'vector', execute os passos abaixo:

-- PASSO 2: Instalar pgvector
CREATE EXTENSION IF NOT EXISTS vector;

-- PASSO 3: Backup da estrutura (opcional mas recomendado)
CREATE TABLE document_sections_backup AS 
SELECT id, content, metadata FROM document_sections;

-- PASSO 4: Recriar coluna com tipo correto
ALTER TABLE document_sections DROP COLUMN IF EXISTS embedding;
ALTER TABLE document_sections ADD COLUMN embedding vector(1536);

-- PASSO 5: Criar índice
CREATE INDEX IF NOT EXISTS document_sections_embedding_idx 
ON document_sections 
USING ivfflat (embedding vector_cosine_ops)
WITH (lists = 100);

-- PASSO 6: Verificar se ficou correto
SELECT column_name, data_type, udt_name
FROM information_schema.columns 
WHERE table_name = 'document_sections' 
AND column_name = 'embedding';
-- DEVE mostrar: udt_name = 'vector'
  `));
  
  console.log(chalk.green.bold('\nDEPOIS disso, execute:'));
  console.log('node scripts/fix-all-embeddings-no-limit.mjs');
  
  console.log(chalk.red.bold('\n⚠️  IMPORTANTE:'));
  console.log('A coluna PRECISA ser do tipo "vector(1536)" e não "text" ou "jsonb".');
  console.log('Se continuar como texto, os embeddings sempre serão salvos como string JSON.');
}

// Criar função auxiliar se não existir
async function createHelperFunction() {
  try {
    await supabase.rpc('create_helper_functions', {});
  } catch (e) {
    // Ignorar se não tiver permissão
  }
}

createHelperFunction().then(() => verify()).catch(console.error);