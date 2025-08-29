#!/usr/bin/env node

import { createClient } from '@supabase/supabase-js';
import chalk from 'chalk';
import { config } from 'dotenv';
import { fileURLToPath } from 'url';
import path from 'path';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

config({ path: path.join(__dirname, '..', '.env.local') });

const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL;
const SUPABASE_SERVICE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_KEY);

async function checkEmbeddings() {
  console.log(chalk.cyan.bold('🔍 VERIFICANDO EMBEDDINGS NO BANCO\n'));
  
  // Buscar amostras
  const { data: samples, error } = await supabase
    .from('document_sections')
    .select('id, content, embedding, metadata')
    .not('embedding', 'is', null)
    .limit(10);
  
  if (error) {
    console.error(chalk.red('Erro:'), error);
    return;
  }
  
  if (!samples || samples.length === 0) {
    console.log(chalk.red('❌ Nenhum embedding encontrado!'));
    return;
  }
  
  // Analisar dimensões
  const dimensions = new Map();
  
  samples.forEach(sample => {
    if (sample.embedding) {
      const dim = sample.embedding.length;
      dimensions.set(dim, (dimensions.get(dim) || 0) + 1);
    }
  });
  
  console.log('📊 Dimensões encontradas:');
  dimensions.forEach((count, dim) => {
    console.log(`   ${dim} dimensões: ${count} documentos`);
    
    // Identificar modelo provável
    if (dim === 1536) {
      console.log(chalk.green('      → OpenAI text-embedding-ada-002 ou text-embedding-3-small'));
    } else if (dim === 3072) {
      console.log(chalk.yellow('      → OpenAI text-embedding-3-large'));
    } else if (dim === 768) {
      console.log(chalk.blue('      → all-MiniLM-L6-v2 ou similar'));
    } else if (dim === 1024) {
      console.log(chalk.blue('      → all-mpnet-base-v2 ou similar'));
    } else {
      console.log(chalk.red(`      → DESCONHECIDO/CORROMPIDO!`));
    }
  });
  
  // Verificar função RPC
  console.log('\n🔍 Verificando função match_document_sections...');
  
  try {
    // Criar um embedding fake para teste
    const fakeEmbedding = new Array(1536).fill(0.1);
    
    const { data: rpcResult, error: rpcError } = await supabase.rpc('match_document_sections', {
      query_embedding: fakeEmbedding,
      match_threshold: 0.1,
      match_count: 5
    });
    
    if (rpcError) {
      console.log(chalk.red('❌ Erro na função RPC:'), rpcError.message);
      
      // Tentar com dimensão diferente se erro for de dimensão
      if (rpcError.message.includes('dimension')) {
        console.log(chalk.yellow('\n⚠️ Problema de dimensão detectado!'));
        
        // Pegar dimensão real do primeiro documento
        if (samples[0].embedding) {
          const realDim = samples[0].embedding.length;
          console.log(`Tentando com dimensão real: ${realDim}`);
          
          const realFakeEmbedding = new Array(realDim).fill(0.1);
          const { data: retryResult, error: retryError } = await supabase.rpc('match_document_sections', {
            query_embedding: realFakeEmbedding,
            match_threshold: 0.1,
            match_count: 5
          });
          
          if (retryError) {
            console.log(chalk.red('❌ Ainda falhou:'), retryError.message);
          } else {
            console.log(chalk.green(`✅ Funciona com ${realDim} dimensões!`));
            if (retryResult) {
              console.log(`   ${retryResult.length} resultados retornados`);
            }
          }
        }
      }
    } else {
      console.log(chalk.green('✅ Função RPC funcionando!'));
      if (rpcResult) {
        console.log(`   ${rpcResult.length} resultados retornados`);
      }
    }
  } catch (e) {
    console.log(chalk.red('❌ Erro ao testar RPC:'), e.message);
  }
  
  // Verificar enhanced-vector-search
  console.log('\n🔍 Testando enhanced-vector-search...');
  
  try {
    const response = await fetch(`${SUPABASE_URL}/functions/v1/enhanced-vector-search`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${SUPABASE_SERVICE_KEY}`,
      },
      body: JSON.stringify({
        query: 'teste de busca',
        limit: 5
      })
    });
    
    if (response.ok) {
      const result = await response.json();
      if (result.results && result.results.length > 0) {
        console.log(chalk.green(`✅ Vector search retornou ${result.results.length} resultados`));
      } else {
        console.log(chalk.red('❌ Vector search retornou 0 resultados'));
      }
    } else {
      const errorText = await response.text();
      console.log(chalk.red(`❌ Erro HTTP ${response.status}:`), errorText.substring(0, 200));
    }
  } catch (e) {
    console.log(chalk.red('❌ Erro ao testar vector search:'), e.message);
  }
  
  // Diagnóstico final
  console.log(chalk.cyan.bold('\n📋 DIAGNÓSTICO:\n'));
  
  if (dimensions.has(17773)) {
    console.log(chalk.red.bold('🚨 CRÍTICO: Embeddings com 17773 dimensões estão CORROMPIDOS!'));
    console.log('   Ação: Reprocessar todos os documentos');
  } else if (dimensions.size > 1) {
    console.log(chalk.yellow.bold('⚠️ AVISO: Múltiplas dimensões encontradas!'));
    console.log('   Isso pode causar problemas no vector search');
    console.log('   Ação: Padronizar para uma única dimensão');
  } else {
    const dim = Array.from(dimensions.keys())[0];
    if (dim === 1536 || dim === 3072 || dim === 768 || dim === 1024) {
      console.log(chalk.green.bold('✅ Dimensão parece correta'));
      console.log('   Se vector search não funciona, verificar:');
      console.log('   1. Função RPC match_document_sections');
      console.log('   2. Índice pgvector');
      console.log('   3. Enhanced-vector-search edge function');
    }
  }
}

checkEmbeddings().catch(console.error);