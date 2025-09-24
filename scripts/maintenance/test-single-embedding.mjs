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

console.log(chalk.cyan.bold('🧪 TESTE DE SALVAMENTO DE EMBEDDING'));
console.log(chalk.cyan.bold('='.repeat(40)));

async function testSave() {
  // Pegar um documento
  const { data: docs } = await supabase
    .from('document_sections')
    .select('id, content, embedding')
    .limit(1);
  
  if (!docs || docs.length === 0) {
    console.log(chalk.red('Nenhum documento encontrado'));
    return;
  }
  
  const doc = docs[0];
  console.log('\n📄 Documento selecionado:');
  console.log('ID:', doc.id);
  console.log('Tem embedding atual?', doc.embedding ? 'Sim' : 'Não');
  
  if (doc.embedding) {
    console.log('Dimensões atuais:', doc.embedding.length);
    if (doc.embedding.length === 1536) {
      console.log(chalk.green('✅ Já está correto!'));
      return;
    }
  }
  
  // Gerar novo embedding
  console.log('\n🔄 Gerando novo embedding...');
  try {
    const response = await openai.embeddings.create({
      model: 'text-embedding-ada-002',
      input: doc.content.substring(0, 8000),
    });
    
    const newEmbedding = response.data[0].embedding;
    console.log(chalk.green('✅ Embedding gerado: ' + newEmbedding.length + ' dimensões'));
    
    // Limpar embedding antigo primeiro
    console.log('\n🗑️ Limpando embedding antigo...');
    const { error: clearError } = await supabase
      .from('document_sections')
      .update({ embedding: null })
      .eq('id', doc.id);
    
    if (clearError) {
      console.log(chalk.red('❌ Erro ao limpar:'), clearError);
      return;
    }
    console.log(chalk.green('✅ Limpo'));
    
    // Salvar novo embedding
    console.log('\n💾 Salvando novo embedding...');
    const { data: updateData, error: updateError } = await supabase
      .from('document_sections')
      .update({ 
        embedding: newEmbedding
      })
      .eq('id', doc.id)
      .select();
    
    if (updateError) {
      console.log(chalk.red('❌ Erro ao salvar:'), updateError);
      return;
    }
    console.log(chalk.green('✅ Salvo'));
    
    // Verificar
    console.log('\n🔍 Verificando...');
    const { data: checkData } = await supabase
      .from('document_sections')
      .select('id, embedding')
      .eq('id', doc.id)
      .single();
    
    if (checkData && checkData.embedding) {
      const dims = checkData.embedding.length;
      if (dims === 1536) {
        console.log(chalk.green.bold('✅ SUCESSO! Embedding salvo com 1536 dimensões'));
      } else {
        console.log(chalk.red.bold('❌ PROBLEMA! Embedding tem ' + dims + ' dimensões'));
        
        // Verificar se é problema de tipo de coluna
        console.log('\n🔬 Analisando problema...');
        console.log('Tipo do embedding:', typeof checkData.embedding);
        console.log('É array?', Array.isArray(checkData.embedding));
        console.log('Primeiros valores:', checkData.embedding.slice(0, 3));
      }
    } else {
      console.log(chalk.red('❌ Embedding não foi encontrado'));
    }
    
  } catch (error) {
    console.log(chalk.red('❌ Erro:'), error.message);
  }
}

testSave().catch(console.error);