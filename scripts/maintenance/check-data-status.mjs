#!/usr/bin/env node

import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';

dotenv.config({ path: '.env.local' });

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY
);

console.log('🔍 Verificando estado dos dados no banco...\n');

async function checkDocuments() {
  console.log('📄 Tabela: documents');
  const { count, error } = await supabase
    .from('documents')
    .select('*', { count: 'exact', head: true });
  
  if (error) {
    console.error('❌ Erro:', error);
  } else {
    console.log(`✅ Total de documentos: ${count || 0}`);
  }
  
  // Listar alguns documentos
  const { data: docs } = await supabase
    .from('documents')
    .select('id, file_name, processing_status, chunk_count')
    .limit(5);
  
  if (docs && docs.length > 0) {
    console.log('\n📋 Alguns documentos:');
    docs.forEach(doc => {
      console.log(`  - ${doc.file_name} (${doc.processing_status}) - ${doc.chunk_count || 0} chunks`);
    });
  }
}

async function checkChunks() {
  console.log('\n📄 Tabela: document_chunks');
  const { count, error } = await supabase
    .from('document_chunks')
    .select('*', { count: 'exact', head: true });
  
  if (error) {
    console.error('❌ Erro:', error);
  } else {
    console.log(`✅ Total de chunks: ${count || 0}`);
  }
  
  // Verificar se há embeddings
  const { data: chunksWithEmbedding } = await supabase
    .from('document_chunks')
    .select('id')
    .not('embedding', 'is', null)
    .limit(1);
  
  if (chunksWithEmbedding && chunksWithEmbedding.length > 0) {
    console.log('✅ Chunks têm embeddings');
  } else {
    console.log('❌ Chunks NÃO têm embeddings');
  }
}

async function checkEmbeddings() {
  console.log('\n📄 Tabela: document_embeddings');
  const { count, error } = await supabase
    .from('document_embeddings')
    .select('*', { count: 'exact', head: true });
  
  if (error) {
    console.error('❌ Erro:', error.message);
  } else {
    console.log(`✅ Total de embeddings: ${count || 0}`);
  }
}

async function checkRegime() {
  console.log('\n📄 Tabela: regime_urbanistico');
  const { count, error } = await supabase
    .from('regime_urbanistico')
    .select('*', { count: 'exact', head: true });
  
  if (error) {
    console.error('❌ Erro:', error);
  } else {
    console.log(`✅ Total de registros de regime: ${count || 0}`);
  }
}

async function checkZots() {
  console.log('\n📄 Tabela: zots_bairros');
  const { count, error } = await supabase
    .from('zots_bairros')
    .select('*', { count: 'exact', head: true });
  
  if (error) {
    console.error('❌ Erro:', error);
  } else {
    console.log(`✅ Total de registros de ZOTs: ${count || 0}`);
  }
}

async function checkFunctions() {
  console.log('\n🔍 Verificando funções SQL...');
  
  // Tentar chamar match_documents
  const { data, error } = await supabase.rpc('match_documents', {
    query_embedding: new Array(1536).fill(0), // vetor dummy
    match_threshold: 0.1,
    match_count: 1
  });
  
  if (error) {
    console.error('❌ Função match_documents:', error.message);
  } else {
    console.log('✅ Função match_documents existe');
  }
}

async function main() {
  await checkDocuments();
  await checkChunks();
  await checkEmbeddings();
  await checkRegime();
  await checkZots();
  await checkFunctions();
  
  console.log('\n📊 RESUMO:');
  console.log('Se não há documentos/chunks com embeddings, é necessário:');
  console.log('1. Importar documentos da pasta knowledgebase');
  console.log('2. Gerar embeddings usando OpenAI');
  console.log('\nSe há dados mas o chat não funciona, verificar:');
  console.log('1. Logs das Edge Functions no Supabase Dashboard');
  console.log('2. Se as funções SQL estão criadas corretamente');
}

main().catch(console.error);