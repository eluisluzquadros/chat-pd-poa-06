#!/usr/bin/env node

/**
 * EMERGÊNCIA: Usar a API Key do OpenAI configurada no Supabase
 * para reprocessar os embeddings
 */

import { createClient } from '@supabase/supabase-js';
import fetch from 'node-fetch';
import chalk from 'chalk';
import { config } from 'dotenv';
import { fileURLToPath } from 'url';
import path from 'path';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

config({ path: path.join(__dirname, '..', '.env.local') });

const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL;
const SUPABASE_SERVICE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY;
const SUPABASE_ANON_KEY = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_KEY);

console.log(chalk.red.bold('='.repeat(60)));
console.log(chalk.red.bold('   🚨 CORREÇÃO EMERGENCIAL VIA EDGE FUNCTION'));
console.log(chalk.red.bold('='.repeat(60)));

async function cleanAllEmbeddings() {
  console.log(chalk.red.bold('\n🧹 LIMPANDO TODOS EMBEDDINGS CORROMPIDOS\n'));
  
  const { error } = await supabase
    .from('document_sections')
    .update({ embedding: null })
    .not('embedding', 'is', null);
  
  if (error) {
    console.error(chalk.red('Erro ao limpar embeddings:'), error);
    return false;
  }
  
  console.log(chalk.green('✅ Todos embeddings limpos!'));
  return true;
}

async function generateEmbeddingViaEdgeFunction(text) {
  try {
    // Usar a edge function enhanced-vector-search apenas para gerar embedding
    const response = await fetch(`${SUPABASE_URL}/functions/v1/query-analyzer`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${SUPABASE_ANON_KEY}`,
      },
      body: JSON.stringify({
        query: text.substring(0, 8000),
        generateEmbeddingOnly: true // Flag especial
      })
    });
    
    if (!response.ok) {
      const error = await response.text();
      throw new Error(`HTTP ${response.status}: ${error}`);
    }
    
    const result = await response.json();
    return result.embedding;
    
  } catch (error) {
    // Fallback: tentar gerar localmente se possível
    return null;
  }
}

async function reprocessDocuments() {
  console.log(chalk.cyan.bold('\n🔄 REPROCESSANDO DOCUMENTOS\n'));
  
  // Buscar TODOS documentos
  const { data: documents, count } = await supabase
    .from('document_sections')
    .select('id, content, metadata', { count: 'exact' })
    .is('embedding', null)
    .order('id')
    .limit(100); // Processar apenas 100 para teste
  
  console.log(`📚 Processando ${documents?.length || 0} de ${count} documentos sem embedding`);
  
  if (!documents || documents.length === 0) {
    console.log(chalk.yellow('Nenhum documento para processar'));
    return;
  }
  
  let processed = 0;
  let failed = 0;
  
  for (const doc of documents) {
    if (!doc.content || doc.content.length < 10) {
      failed++;
      continue;
    }
    
    process.stdout.write(`Doc ${doc.id.substring(0, 8)}... `);
    
    // Tentar gerar embedding via edge function
    const embedding = await generateEmbeddingViaEdgeFunction(doc.content);
    
    if (!embedding || embedding.length !== 1536) {
      console.log(chalk.red('FALHOU'));
      failed++;
      continue;
    }
    
    // Salvar no banco
    const { error: updateError } = await supabase
      .from('document_sections')
      .update({ 
        embedding,
        metadata: {
          ...doc.metadata,
          embedding_model: 'text-embedding-ada-002',
          embedding_dimension: 1536,
          processed_at: new Date().toISOString(),
          processed_via: 'edge-function-emergency'
        }
      })
      .eq('id', doc.id);
    
    if (updateError) {
      console.log(chalk.red('ERRO'));
      failed++;
    } else {
      console.log(chalk.green('✅'));
      processed++;
    }
    
    // Pausa para não sobrecarregar
    if (processed % 10 === 0) {
      await new Promise(resolve => setTimeout(resolve, 1000));
    }
  }
  
  console.log(chalk.cyan.bold('\n📊 RESULTADO:'));
  console.log(`  ✅ Processados: ${processed}`);
  console.log(`  ❌ Falhas: ${failed}`);
}

async function createOrUpdateEdgeFunction() {
  console.log(chalk.yellow.bold('\n📝 INSTRUÇÕES PARA CRIAR EDGE FUNCTION DE EMERGÊNCIA:\n'));
  
  console.log('1. Crie uma nova edge function: emergency-embeddings');
  console.log('2. Deploy com o seguinte código:\n');
  
  const functionCode = `
import { serve } from 'https://deno.land/std@0.177.0/http/server.ts';
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.39.0';
import { OpenAI } from 'https://deno.land/x/openai@v4.24.0/mod.ts';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders });
  }

  try {
    const { text } = await req.json();
    
    const openai = new OpenAI({
      apiKey: Deno.env.get('OPENAI_API_KEY'),
    });

    const response = await openai.embeddings.create({
      model: 'text-embedding-ada-002',
      input: text.substring(0, 8000),
    });

    return new Response(
      JSON.stringify({ embedding: response.data[0].embedding }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  } catch (error) {
    return new Response(
      JSON.stringify({ error: error.message }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});
`;

  console.log(chalk.gray(functionCode));
  
  console.log('\n3. Deploy com:');
  console.log(chalk.cyan('npx supabase functions deploy emergency-embeddings --project-ref ngrqwmvuhvjkeohesbxs'));
  
  console.log('\n4. Configure a secret OPENAI_API_KEY:');
  console.log(chalk.cyan('npx supabase secrets set OPENAI_API_KEY=sua-api-key --project-ref ngrqwmvuhvjkeohesbxs'));
}

async function main() {
  try {
    // 1. Limpar embeddings corrompidos
    const cleaned = await cleanAllEmbeddings();
    if (!cleaned) {
      console.log(chalk.red('\n❌ Falha ao limpar embeddings'));
      process.exit(1);
    }
    
    // 2. Mostrar instruções para edge function
    await createOrUpdateEdgeFunction();
    
    // 3. Tentar reprocessar alguns documentos
    console.log(chalk.yellow.bold('\n⚠️ TENTANDO REPROCESSAR VIA EDGE FUNCTIONS EXISTENTES...\n'));
    await reprocessDocuments();
    
  } catch (error) {
    console.error(chalk.red('\n❌ ERRO FATAL:'), error);
    process.exit(1);
  }
}

main();