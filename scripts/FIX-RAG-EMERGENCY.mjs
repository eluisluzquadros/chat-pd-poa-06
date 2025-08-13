#!/usr/bin/env node

/**
 * 🚨 SCRIPT DE EMERGÊNCIA - CONSERTAR RAG IMEDIATAMENTE
 * 
 * Este script vai:
 * 1. Diagnosticar o problema dos embeddings
 * 2. Reprocessar com embeddings corretos
 * 3. Validar que está funcionando
 */

import { createClient } from '@supabase/supabase-js';
import { OpenAI } from 'openai';
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
const OPENAI_API_KEY = process.env.OPENAI_API_KEY;

if (!SUPABASE_URL || !SUPABASE_SERVICE_KEY || !OPENAI_API_KEY) {
  console.error(chalk.red('❌ ERRO CRÍTICO: Variáveis de ambiente faltando!'));
  console.error('Necessário: SUPABASE_URL, SUPABASE_SERVICE_KEY, OPENAI_API_KEY');
  process.exit(1);
}

const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_KEY);
const openai = new OpenAI({ apiKey: OPENAI_API_KEY });

// PASSO 1: DIAGNÓSTICO
async function diagnose() {
  console.log(chalk.cyan.bold('\n🔍 PASSO 1: DIAGNÓSTICO\n'));
  
  // Verificar dimensão atual dos embeddings
  const { data: sample, error } = await supabase
    .from('document_sections')
    .select('id, content, embedding')
    .not('embedding', 'is', null)
    .limit(5);
  
  if (error) {
    console.error(chalk.red('❌ Erro ao buscar embeddings:'), error);
    return false;
  }
  
  if (!sample || sample.length === 0) {
    console.log(chalk.red('❌ Nenhum embedding encontrado no banco!'));
    return false;
  }
  
  const dimension = sample[0].embedding.length;
  console.log(`📊 Dimensão atual dos embeddings: ${dimension}`);
  
  if (dimension === 1536) {
    console.log(chalk.green('✅ Dimensão correta para OpenAI text-embedding-ada-002'));
    return true;
  } else if (dimension === 3072) {
    console.log(chalk.yellow('⚠️ Dimensão para text-embedding-3-large'));
    return false;
  } else {
    console.log(chalk.red(`❌ DIMENSÃO INCORRETA: ${dimension}`));
    console.log(chalk.red('   Embeddings estão CORROMPIDOS!'));
    return false;
  }
}

// PASSO 2: GERAR EMBEDDING CORRETO
async function generateCorrectEmbedding(text) {
  try {
    const response = await openai.embeddings.create({
      model: "text-embedding-ada-002", // MODELO CORRETO - 1536 dimensões
      input: text.substring(0, 8000), // Limitar tamanho
    });
    
    return response.data[0].embedding;
  } catch (error) {
    console.error(chalk.red('Erro ao gerar embedding:'), error.message);
    return null;
  }
}

// PASSO 3: REPROCESSAR DOCUMENTOS
async function reprocessDocuments(limit = 10) {
  console.log(chalk.cyan.bold('\n🔄 PASSO 2: REPROCESSANDO DOCUMENTOS\n'));
  
  // Buscar documentos para reprocessar
  const { data: documents, error } = await supabase
    .from('document_sections')
    .select('id, content, metadata')
    .order('id')
    .limit(limit);
  
  if (error || !documents) {
    console.error(chalk.red('❌ Erro ao buscar documentos:'), error);
    return false;
  }
  
  console.log(`📚 ${documents.length} documentos para processar...`);
  
  let success = 0;
  let failed = 0;
  
  for (const doc of documents) {
    process.stdout.write(`   Processando ID ${doc.id}... `);
    
    if (!doc.content || doc.content.length < 10) {
      console.log(chalk.yellow('PULADO (conteúdo vazio)'));
      continue;
    }
    
    // Gerar novo embedding
    const embedding = await generateCorrectEmbedding(doc.content);
    
    if (!embedding) {
      console.log(chalk.red('FALHOU'));
      failed++;
      continue;
    }
    
    // Atualizar no banco
    const { error: updateError } = await supabase
      .from('document_sections')
      .update({ 
        embedding: embedding,
        metadata: {
          ...doc.metadata,
          embedding_model: 'text-embedding-ada-002',
          embedding_dimension: 1536,
          processed_at: new Date().toISOString()
        }
      })
      .eq('id', doc.id);
    
    if (updateError) {
      console.log(chalk.red('ERRO AO SALVAR'));
      failed++;
    } else {
      console.log(chalk.green('OK'));
      success++;
    }
    
    // Pequena pausa para não sobrecarregar API
    await new Promise(resolve => setTimeout(resolve, 100));
  }
  
  console.log(`\n📊 Resultado: ${success} sucesso, ${failed} falhas`);
  return success > 0;
}

// PASSO 4: TESTAR VECTOR SEARCH
async function testVectorSearch() {
  console.log(chalk.cyan.bold('\n🧪 PASSO 3: TESTANDO VECTOR SEARCH\n'));
  
  const testQueries = [
    'Qual artigo define o EIV Estudo de Impacto de Vizinhança',
    'Certificação em Sustentabilidade Ambiental LUOS',
    'ZEIS Zonas Especiais de Interesse Social PDUS'
  ];
  
  let working = 0;
  
  for (const query of testQueries) {
    console.log(`\nTestando: "${query.substring(0, 50)}..."`);
    
    // Gerar embedding da query
    const queryEmbedding = await generateCorrectEmbedding(query);
    
    if (!queryEmbedding) {
      console.log(chalk.red('   ❌ Falha ao gerar embedding da query'));
      continue;
    }
    
    // Buscar no banco usando pgvector
    const { data: results, error } = await supabase.rpc('match_document_sections', {
      query_embedding: queryEmbedding,
      match_threshold: 0.5,
      match_count: 5
    });
    
    if (error) {
      console.log(chalk.red('   ❌ Erro na busca:'), error.message);
      continue;
    }
    
    if (results && results.length > 0) {
      console.log(chalk.green(`   ✅ ${results.length} resultados encontrados!`));
      console.log(`   Top match: ${results[0].content.substring(0, 100)}...`);
      working++;
    } else {
      console.log(chalk.red('   ❌ Nenhum resultado'));
    }
  }
  
  return working > 0;
}

// PASSO 5: VALIDAR PIPELINE COMPLETO
async function validatePipeline() {
  console.log(chalk.cyan.bold('\n✅ PASSO 4: VALIDANDO PIPELINE COMPLETO\n'));
  
  const criticalTest = {
    query: 'Qual artigo define o Estudo de Impacto de Vizinhança?',
    expectedKeywords: ['Art. 90', 'EIV', 'LUOS']
  };
  
  console.log(`Testando: "${criticalTest.query}"`);
  
  try {
    const response = await fetch(`${SUPABASE_URL}/functions/v1/agentic-rag`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${SUPABASE_SERVICE_KEY}`,
      },
      body: JSON.stringify({
        query: criticalTest.query,
        sessionId: 'emergency-fix-test',
        bypassCache: true
      })
    });
    
    if (response.ok) {
      const result = await response.json();
      
      const hasKeywords = criticalTest.expectedKeywords.some(keyword => 
        result.response && result.response.includes(keyword)
      );
      
      if (hasKeywords) {
        console.log(chalk.green('✅ Pipeline funcionando!'));
        console.log(`Resposta: ${result.response.substring(0, 200)}...`);
        return true;
      } else {
        console.log(chalk.red('❌ Resposta sem palavras-chave esperadas'));
        return false;
      }
    } else {
      console.log(chalk.red(`❌ Erro HTTP ${response.status}`));
      return false;
    }
  } catch (error) {
    console.log(chalk.red('❌ Erro:'), error.message);
    return false;
  }
}

// FUNÇÃO PRINCIPAL
async function fixRAGEmergency() {
  console.log(chalk.red.bold('=' .repeat(60)));
  console.log(chalk.red.bold('   🚨 CORREÇÃO DE EMERGÊNCIA DO SISTEMA RAG 🚨'));
  console.log(chalk.red.bold('=' .repeat(60)));
  
  console.log(chalk.yellow('\n⚠️  AVISO: Este processo pode levar várias horas para processar todos os documentos.'));
  console.log(chalk.yellow('   Vamos começar com uma amostra para validar.\n'));
  
  // 1. Diagnóstico
  const isDimensionCorrect = await diagnose();
  
  if (!isDimensionCorrect) {
    console.log(chalk.yellow('\n📝 Embeddings precisam ser reprocessados.'));
    
    // 2. Reprocessar amostra
    console.log(chalk.yellow('\n🔄 Reprocessando amostra de 10 documentos...'));
    const reprocessSuccess = await reprocessDocuments(10);
    
    if (!reprocessSuccess) {
      console.log(chalk.red('\n❌ FALHA NO REPROCESSAMENTO!'));
      console.log('Verifique as configurações e tente novamente.');
      process.exit(1);
    }
  }
  
  // 3. Testar vector search
  const vectorSearchWorks = await testVectorSearch();
  
  if (!vectorSearchWorks) {
    console.log(chalk.red('\n❌ VECTOR SEARCH AINDA NÃO FUNCIONA!'));
    console.log('Pode ser necessário reprocessar mais documentos.');
  }
  
  // 4. Validar pipeline
  const pipelineWorks = await validatePipeline();
  
  // RESULTADO FINAL
  console.log(chalk.cyan.bold('\n' + '=' .repeat(60)));
  console.log(chalk.cyan.bold('   RESULTADO DA CORREÇÃO'));
  console.log(chalk.cyan.bold('=' .repeat(60) + '\n'));
  
  if (vectorSearchWorks && pipelineWorks) {
    console.log(chalk.green.bold('✅ SISTEMA RAG FUNCIONANDO!'));
    console.log(chalk.green('\nPróximos passos:'));
    console.log('1. Reprocessar TODOS os documentos (não apenas amostra)'));
    console.log('2. Desativar response-synthesizer-simple'));
    console.log('3. Monitorar performance'));
  } else {
    console.log(chalk.yellow.bold('⚠️ SISTEMA PARCIALMENTE CORRIGIDO'));
    console.log(chalk.yellow('\nAções necessárias:'));
    console.log('1. Reprocessar TODOS os documentos com:'));
    console.log(chalk.cyan('   node scripts/FIX-RAG-EMERGENCY.mjs --all'));
    console.log('2. Verificar função enhanced-vector-search'));
    console.log('3. Revisar configuração do response-synthesizer'));
  }
  
  console.log(chalk.cyan('\n' + '=' .repeat(60)));
}

// Parse argumentos
const args = process.argv.slice(2);
const shouldProcessAll = args.includes('--all');

if (shouldProcessAll) {
  console.log(chalk.red.bold('\n⚠️  MODO COMPLETO: Processando TODOS os documentos!'));
  console.log(chalk.red.bold('   Isso pode levar HORAS. Tem certeza? (Ctrl+C para cancelar)\n'));
  
  setTimeout(async () => {
    const { count } = await supabase
      .from('document_sections')
      .select('*', { count: 'exact', head: true });
    
    console.log(`📚 Total de documentos: ${count}`);
    console.log('Iniciando em 5 segundos...');
    
    setTimeout(async () => {
      await reprocessDocuments(count || 1000);
      await testVectorSearch();
      await validatePipeline();
    }, 5000);
  }, 3000);
} else {
  // Executar correção de emergência (amostra)
  fixRAGEmergency().catch(error => {
    console.error(chalk.red('\n💥 ERRO FATAL:'), error);
    process.exit(1);
  });
}