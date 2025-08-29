#!/usr/bin/env node

/**
 * CORRIGIR EMBEDDINGS USANDO RPC
 * Converter de string para vector usando função SQL
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

console.log(chalk.red.bold('🔧 CORREÇÃO FINAL DOS EMBEDDINGS'));
console.log(chalk.red.bold('='.repeat(40)));

// SQL para criar função RPC
const createRPCSQL = `
-- Criar função RPC se não existir
CREATE OR REPLACE FUNCTION update_document_embedding(
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

async function fixEmbeddings() {
  console.log(chalk.yellow.bold('\n📝 PRIMEIRO, EXECUTE ESTE SQL NO SUPABASE:\n'));
  console.log(chalk.cyan(createRPCSQL));
  
  console.log(chalk.yellow.bold('\nDEPOIS, PRESSIONE ENTER PARA CONTINUAR...'));
  
  // Aguardar confirmação
  await new Promise(resolve => {
    process.stdin.once('data', resolve);
  });
  
  console.log('\n🔄 Processando embeddings...\n');
  
  // Buscar todos documentos
  const { data: docs } = await supabase
    .from('document_sections')
    .select('id, content')
    .order('id');
  
  if (!docs || docs.length === 0) {
    console.log('Nenhum documento encontrado');
    return;
  }
  
  console.log(`📚 ${docs.length} documentos para processar`);
  
  let processed = 0;
  let failed = 0;
  
  for (const doc of docs) {
    try {
      // Gerar embedding
      const response = await openai.embeddings.create({
        model: 'text-embedding-ada-002',
        input: doc.content.substring(0, 8000),
      });
      
      const embedding = response.data[0].embedding;
      
      // Usar RPC para salvar corretamente
      const { error } = await supabase.rpc('update_document_embedding', {
        doc_id: doc.id,
        new_embedding: embedding
      });
      
      if (error) {
        console.log(chalk.red(`❌ Doc ${doc.id.substring(0, 8)}: ${error.message}`));
        failed++;
      } else {
        console.log(chalk.green(`✅ Doc ${doc.id.substring(0, 8)}`));
        processed++;
      }
      
      // Progresso
      if ((processed + failed) % 10 === 0) {
        console.log(chalk.gray(`Progresso: ${processed + failed}/${docs.length}`));
      }
      
      // Pausa para não sobrecarregar
      if ((processed + failed) % 5 === 0) {
        await new Promise(resolve => setTimeout(resolve, 1000));
      }
      
    } catch (error) {
      console.log(chalk.red(`❌ Doc ${doc.id.substring(0, 8)}: ${error.message}`));
      failed++;
      
      if (error.message.includes('rate limit')) {
        console.log(chalk.yellow('Aguardando 60s...'));
        await new Promise(resolve => setTimeout(resolve, 60000));
      }
    }
  }
  
  console.log(chalk.green.bold('\n📊 RESULTADO:'));
  console.log(`✅ Processados: ${processed}`);
  console.log(`❌ Falhas: ${failed}`);
  
  // Verificar
  const { data: check } = await supabase
    .from('document_sections')
    .select('id, embedding')
    .limit(1)
    .single();
  
  if (check && check.embedding) {
    const type = typeof check.embedding;
    const dims = Array.isArray(check.embedding) ? check.embedding.length : check.embedding.length;
    
    if (type !== 'string' && dims === 1536) {
      console.log(chalk.green.bold('\n🎉 EMBEDDINGS CORRIGIDOS COM SUCESSO!'));
      console.log('\nPróximo passo:');
      console.log('node scripts/03-test-vector-search.mjs');
    } else {
      console.log(chalk.red('\n❌ Ainda há problemas'));
      console.log(`Tipo: ${type}, Dimensões: ${dims}`);
    }
  }
}

fixEmbeddings().catch(console.error);