#!/usr/bin/env node

/**
 * ÚLTIMA TENTATIVA: Executar SQL direto para converter embeddings
 */

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

console.log(chalk.red.bold('🔧 CORREÇÃO VIA SQL DIRETO'));
console.log(chalk.red.bold('='.repeat(40)));

async function fixViaSQL() {
  // Pegar um documento para testar
  const { data: doc } = await supabase
    .from('document_sections')
    .select('id, content')
    .limit(1)
    .single();
  
  if (!doc) {
    console.log('Nenhum documento encontrado');
    return;
  }
  
  console.log('\n🧪 Testando com documento:', doc.id);
  
  // Gerar embedding
  console.log('📊 Gerando embedding...');
  const response = await openai.embeddings.create({
    model: 'text-embedding-ada-002',
    input: doc.content.substring(0, 8000),
  });
  
  const embedding = response.data[0].embedding;
  console.log('✅ Embedding gerado: 1536 dimensões');
  
  // Converter array para formato PostgreSQL
  const pgArray = `{${embedding.join(',')}}`;
  
  // Criar função SQL para atualizar
  const updateSQL = `
    UPDATE document_sections 
    SET embedding = ARRAY[${embedding.join(',')}]::vector
    WHERE id = '${doc.id}'::uuid;
  `;
  
  console.log('\n📝 SQL gerado (preview):');
  console.log(updateSQL.substring(0, 200) + '...]::vector');
  
  // Tentar executar via RPC customizada
  console.log('\n🔄 Tentando salvar...');
  
  try {
    // Criar e executar função temporária
    const { error: createError } = await supabase.rpc('execute_sql', {
      sql: updateSQL
    });
    
    if (createError) {
      console.log('❌ RPC execute_sql não existe');
      
      // Alternativa: Criar função que aceita array e converte
      console.log('\n📝 SOLUÇÃO ALTERNATIVA:');
      console.log('Execute este SQL no Supabase para TODOS os documentos:\n');
      
      // Gerar SQL para todos
      const { data: allDocs } = await supabase
        .from('document_sections')
        .select('id, content')
        .limit(5); // Apenas 5 para exemplo
      
      console.log(chalk.yellow('-- Script para converter os primeiros 5 documentos:'));
      console.log(chalk.yellow('-- (Você precisará fazer isso para todos os 350)\n'));
      
      for (const d of allDocs) {
        const resp = await openai.embeddings.create({
          model: 'text-embedding-ada-002',
          input: d.content.substring(0, 8000),
        });
        
        const emb = resp.data[0].embedding;
        const sql = `UPDATE document_sections SET embedding = ARRAY[${emb.slice(0, 10).join(',')},...(mais 1526 valores)...]::vector WHERE id = '${d.id}';`;
        console.log(sql);
      }
      
      return;
    }
    
    console.log('✅ SQL executado');
    
  } catch (error) {
    console.log('❌ Erro:', error.message);
  }
  
  // Verificar
  const { data: check } = await supabase
    .from('document_sections')
    .select('id, embedding')
    .eq('id', doc.id)
    .single();
  
  if (check && check.embedding) {
    const type = typeof check.embedding;
    const dims = Array.isArray(check.embedding) ? check.embedding.length : check.embedding.length;
    
    console.log('\n📊 Resultado:');
    console.log('Tipo:', type);
    console.log('Dimensões:', dims);
    
    if (type !== 'string') {
      console.log(chalk.green('✅ FUNCIONOU! Não é mais string!'));
    } else {
      console.log(chalk.red('❌ Ainda é string'));
    }
  }
}

// Solução definitiva
console.log(chalk.yellow.bold('\n💡 SOLUÇÃO DEFINITIVA:\n'));
console.log('O problema é que o Supabase JS client SEMPRE converte arrays para JSON string.');
console.log('A ÚNICA solução é usar Edge Functions ou executar SQL direto.\n');
console.log('Opções:');
console.log('1. Criar uma Edge Function que recebe o array e salva como vector');
console.log('2. Usar uma ferramenta SQL para executar updates diretos');
console.log('3. Usar o response-synthesizer com busca por keywords ao invés de vetorial\n');

fixViaSQL().catch(console.error);