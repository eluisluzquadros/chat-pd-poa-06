#!/usr/bin/env node

import { createClient } from '@supabase/supabase-js';
import { OpenAI } from 'openai';
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

const openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });

console.log(chalk.cyan.bold('🧪 TESTE DE SALVAMENTO DE VECTOR'));
console.log(chalk.cyan.bold('='.repeat(40)));

async function testVectorSave() {
  // 1. Pegar um documento
  const { data: docs } = await supabase
    .from('document_sections')
    .select('id, content')
    .limit(1);
  
  if (!docs || docs.length === 0) {
    console.log('Nenhum documento encontrado');
    return;
  }
  
  const doc = docs[0];
  console.log('\n📄 Documento:', doc.id);
  
  // 2. Gerar embedding com OpenAI
  console.log('\n🔄 Gerando embedding com OpenAI...');
  const response = await openai.embeddings.create({
    model: 'text-embedding-ada-002',
    input: doc.content.substring(0, 8000),
  });
  
  const embedding = response.data[0].embedding;
  console.log('✅ Embedding gerado: Array de', embedding.length, 'números');
  console.log('Tipo:', typeof embedding, '- É array?:', Array.isArray(embedding));
  console.log('Primeiros valores:', embedding.slice(0, 3));
  
  // 3. Limpar embedding antigo
  console.log('\n🗑️ Limpando embedding antigo...');
  await supabase
    .from('document_sections')
    .update({ embedding: null })
    .eq('id', doc.id);
  
  // 4. Salvar de diferentes formas para testar
  console.log('\n💾 Testando diferentes formas de salvar...');
  
  // Forma 1: Array direto
  console.log('\nForma 1: Array direto');
  try {
    const { error } = await supabase
      .from('document_sections')
      .update({ embedding: embedding })
      .eq('id', doc.id);
    
    if (error) {
      console.log('❌ Erro:', error.message);
    } else {
      console.log('✅ Salvou sem erro');
    }
  } catch (e) {
    console.log('❌ Exception:', e.message);
  }
  
  // Verificar como foi salvo
  const { data: check1 } = await supabase
    .from('document_sections')
    .select('embedding')
    .eq('id', doc.id)
    .single();
  
  if (check1 && check1.embedding) {
    console.log('Resultado: tipo =', typeof check1.embedding);
    console.log('Tamanho:', Array.isArray(check1.embedding) ? check1.embedding.length : check1.embedding.length);
    if (typeof check1.embedding === 'string') {
      console.log('Preview:', check1.embedding.substring(0, 50));
    }
  }
  
  // Limpar novamente
  await supabase
    .from('document_sections')
    .update({ embedding: null })
    .eq('id', doc.id);
  
  // Forma 2: Formato pgvector [array]
  console.log('\nForma 2: Formato pgvector [array]');
  try {
    const pgvectorFormat = `[${embedding.join(',')}]`;
    const { error } = await supabase
      .from('document_sections')
      .update({ embedding: pgvectorFormat })
      .eq('id', doc.id);
    
    if (error) {
      console.log('❌ Erro:', error.message);
    } else {
      console.log('✅ Salvou sem erro');
    }
  } catch (e) {
    console.log('❌ Exception:', e.message);
  }
  
  // Verificar como foi salvo
  const { data: check2 } = await supabase
    .from('document_sections')
    .select('embedding')
    .eq('id', doc.id)
    .single();
  
  if (check2 && check2.embedding) {
    console.log('Resultado: tipo =', typeof check2.embedding);
    console.log('Tamanho:', Array.isArray(check2.embedding) ? check2.embedding.length : check2.embedding.length);
    if (typeof check2.embedding === 'string') {
      console.log('Preview:', check2.embedding.substring(0, 50));
    }
  }
  
  // 5. Testar via RPC
  console.log('\n📡 Testando via RPC...');
  try {
    const { data, error } = await supabase.rpc('update_embedding', {
      doc_id: doc.id,
      new_embedding: embedding
    });
    
    if (error) {
      console.log('❌ RPC não existe ou erro:', error.message);
      
      // Tentar criar a função
      console.log('\nCriando função RPC...');
      const createFunction = `
CREATE OR REPLACE FUNCTION update_embedding(
  doc_id uuid,
  new_embedding float[]
)
RETURNS void
LANGUAGE plpgsql
AS $$
BEGIN
  UPDATE document_sections 
  SET embedding = new_embedding::vector
  WHERE id = doc_id;
END;
$$;
      `;
      
      console.log('Execute este SQL no Supabase:');
      console.log(chalk.cyan(createFunction));
    } else {
      console.log('✅ RPC funcionou');
    }
  } catch (e) {
    console.log('❌ Erro RPC:', e.message);
  }
  
  console.log(chalk.yellow.bold('\n📝 DIAGNÓSTICO:'));
  console.log('Se os embeddings estão sendo salvos como string,');
  console.log('pode ser um problema com o cliente Supabase JS.');
  console.log('\nSOLUÇÃO: Use uma função RPC para salvar:');
  console.log(chalk.cyan(`
CREATE OR REPLACE FUNCTION update_embedding(
  doc_id uuid,
  new_embedding float[]
)
RETURNS void
LANGUAGE plpgsql
AS $$
BEGIN
  UPDATE document_sections 
  SET embedding = new_embedding::vector
  WHERE id = doc_id;
END;
$$;
  `));
}

testVectorSave().catch(console.error);