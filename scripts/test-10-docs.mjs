#!/usr/bin/env node

/**
 * TESTE COM APENAS 10 DOCUMENTOS
 * Para verificar se o processo está funcionando corretamente
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

const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL;
const SUPABASE_SERVICE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY;
const OPENAI_API_KEY = process.env.OPENAI_API_KEY;

const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_KEY);
const openai = new OpenAI({ apiKey: OPENAI_API_KEY });

console.log(chalk.cyan.bold('🧪 TESTE COM 10 DOCUMENTOS'));
console.log(chalk.cyan.bold('='.repeat(40)));

async function test10Docs() {
  // Buscar 10 documentos sem embedding
  console.log('\n📄 Buscando 10 documentos sem embedding...');
  
  const { data: docs } = await supabase
    .from('document_sections')
    .select('id, content')
    .is('embedding', null)
    .limit(10);
  
  if (!docs || docs.length === 0) {
    console.log(chalk.yellow('Nenhum documento sem embedding encontrado'));
    
    // Se não houver, pegar 10 com embedding para verificar
    const { data: docsWithEmb } = await supabase
      .from('document_sections')
      .select('id, embedding')
      .not('embedding', 'is', null)
      .limit(10);
    
    if (docsWithEmb) {
      console.log('\n📊 Verificando 10 documentos COM embedding:');
      docsWithEmb.forEach(doc => {
        if (doc.embedding) {
          const dims = typeof doc.embedding === 'string' 
            ? doc.embedding.length 
            : doc.embedding.length;
          const type = typeof doc.embedding;
          const status = dims === 1536 ? '✅' : '❌';
          console.log(`${status} Doc ${doc.id.substring(0, 8)}: ${dims} dims (tipo: ${type})`);
        }
      });
    }
    return;
  }
  
  console.log(`✅ Encontrados ${docs.length} documentos`);
  
  // Processar cada um
  console.log('\n🔄 Processando...\n');
  
  for (const doc of docs) {
    try {
      // Gerar embedding
      const response = await openai.embeddings.create({
        model: 'text-embedding-ada-002',
        input: doc.content.substring(0, 8000),
      });
      
      const embedding = response.data[0].embedding;
      console.log(`Doc ${doc.id.substring(0, 8)}: Embedding gerado (${embedding.length} dims)`);
      
      // Salvar
      const { error } = await supabase
        .from('document_sections')
        .update({ 
          embedding,
          metadata: {
            embedding_model: 'text-embedding-ada-002',
            embedding_dimension: 1536,
            processed_at: new Date().toISOString()
          }
        })
        .eq('id', doc.id);
      
      if (error) {
        console.log(chalk.red(`  ❌ Erro ao salvar: ${error.message}`));
      } else {
        console.log(chalk.green(`  ✅ Salvo com sucesso`));
      }
      
      // Verificar se foi salvo corretamente
      const { data: check } = await supabase
        .from('document_sections')
        .select('embedding')
        .eq('id', doc.id)
        .single();
      
      if (check && check.embedding) {
        const savedDims = typeof check.embedding === 'string' 
          ? check.embedding.length 
          : check.embedding.length;
        const savedType = typeof check.embedding;
        
        if (savedDims === 1536) {
          console.log(chalk.green(`  ✅ Verificado: ${savedDims} dims (tipo: ${savedType})`));
        } else {
          console.log(chalk.red(`  ❌ PROBLEMA: ${savedDims} dims (tipo: ${savedType})`));
          
          // Se for string, mostrar preview
          if (typeof check.embedding === 'string') {
            console.log(chalk.gray(`     Preview: ${check.embedding.substring(0, 50)}...`));
          }
        }
      }
      
      console.log('---');
      
    } catch (error) {
      console.log(chalk.red(`Doc ${doc.id.substring(0, 8)}: ${error.message}`));
    }
  }
  
  // Estatísticas finais
  console.log(chalk.cyan.bold('\n📊 VERIFICAÇÃO FINAL:'));
  
  const { count: total } = await supabase
    .from('document_sections')
    .select('*', { count: 'exact', head: true });
  
  const { count: withEmb } = await supabase
    .from('document_sections')
    .select('*', { count: 'exact', head: true })
    .not('embedding', 'is', null);
  
  console.log(`Total de documentos: ${total}`);
  console.log(`Com embedding: ${withEmb}`);
  console.log(`Sem embedding: ${total - withEmb}`);
  
  // Verificar tipo da coluna
  console.log(chalk.cyan.bold('\n🔬 DIAGNÓSTICO DA COLUNA:'));
  console.log('Se os embeddings estão sendo salvos como string (~19000 caracteres),');
  console.log('a coluna precisa ser alterada para tipo vector(1536).');
  console.log('\nExecute no Supabase SQL Editor:');
  console.log(chalk.yellow('ALTER TABLE document_sections DROP COLUMN embedding;'));
  console.log(chalk.yellow('ALTER TABLE document_sections ADD COLUMN embedding vector(1536);'));
}

test10Docs().catch(console.error);