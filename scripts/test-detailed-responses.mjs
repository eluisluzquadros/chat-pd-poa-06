#!/usr/bin/env node

/**
 * TESTE DETALHADO DE RESPOSTAS
 * Mostra o conteúdo completo das respostas para análise manual
 */

import { createClient } from '@supabase/supabase-js';
import fetch from 'node-fetch';
import dotenv from 'dotenv';
import chalk from 'chalk';

dotenv.config({ path: '.env' });

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || 'https://ngrqwmvuhvjkeohesbxs.supabase.co';
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
const supabase = createClient(supabaseUrl, supabaseKey);

// Questions to test
const QUESTIONS = [
  "o que afirma literalmente o Art 1º da LUOS?",
  "qual é a altura máxima em petrópolis",
  "o que diz o artigo 38 da luos?"
];

/**
 * Call RAG endpoint
 */
async function callRAG(endpoint, query) {
  try {
    const response = await fetch(`${supabaseUrl}${endpoint}`, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${supabaseKey}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        query,
        bypassCache: true,
        model: 'openai/gpt-4-turbo-preview'
      }),
      timeout: 30000
    });
    
    if (!response.ok) {
      throw new Error(`HTTP ${response.status}`);
    }
    
    const data = await response.json();
    return { 
      success: true, 
      response: data.response || '',
      confidence: data.confidence || 0,
      sources: data.sources || {},
      executionTime: data.executionTime || 0
    };
  } catch (error) {
    return { 
      success: false, 
      error: error.message
    };
  }
}

/**
 * Get ground truth from database
 */
async function getGroundTruth(question) {
  if (question.includes('Art 1') && question.includes('LUOS')) {
    const { data } = await supabase
      .from('legal_articles')
      .select('full_content')
      .eq('document_type', 'LUOS')
      .eq('article_number', '1')
      .single();
    return data?.full_content || 'NOT FOUND IN DB';
  }
  
  if (question.includes('petrópolis')) {
    const { data } = await supabase
      .from('regime_urbanistico_consolidado')
      .select('*')
      .ilike('"Bairro"', '%PETRÓPOLIS%')
      .limit(3);
    if (data && data.length > 0) {
      return data.map(d => `${d.Bairro} - ZOT ${d.Zona}: Altura ${d.Altura_Maxima___Edificacao_Isolada}m`).join('\n');
    }
    return 'NOT FOUND IN DB';
  }
  
  if (question.includes('artigo 38')) {
    const { data } = await supabase
      .from('legal_articles')
      .select('full_content')
      .eq('document_type', 'LUOS')
      .eq('article_number', '38')
      .single();
    return data?.full_content || 'NOT FOUND IN DB';
  }
  
  return 'QUERY NOT MAPPED';
}

/**
 * Run detailed test
 */
async function runDetailedTest() {
  console.log(chalk.bold.cyan('\n' + '=' .repeat(80)));
  console.log(chalk.bold.cyan('📋 TESTE DETALHADO DE RESPOSTAS'));
  console.log(chalk.bold.cyan('=' .repeat(80)));
  
  for (const question of QUESTIONS) {
    console.log(chalk.bold.white(`\n\n📝 PERGUNTA: "${question}"`));
    console.log(chalk.gray('=' .repeat(80)));
    
    // Get ground truth
    console.log(chalk.yellow('\n🔍 GROUND TRUTH (do banco de dados):'));
    const groundTruth = await getGroundTruth(question);
    console.log(chalk.gray(groundTruth.substring(0, 200) + (groundTruth.length > 200 ? '...' : '')));
    
    // Test v1
    console.log(chalk.green('\n\n📌 AGENTIC-RAG V1:'));
    console.log(chalk.gray('-'.repeat(40)));
    const v1Result = await callRAG('/functions/v1/agentic-rag', question);
    if (v1Result.success) {
      console.log(`Confiança: ${(v1Result.confidence * 100).toFixed(0)}% | Tempo: ${v1Result.executionTime}ms`);
      console.log(`Fontes: ${JSON.stringify(v1Result.sources)}`);
      console.log('\nResposta:');
      console.log(chalk.white(v1Result.response.substring(0, 500)));
      if (v1Result.response.length > 500) {
        console.log(chalk.gray('... [truncated]'));
      }
    } else {
      console.log(chalk.red(`ERRO: ${v1Result.error}`));
    }
    
    // Test v2
    console.log(chalk.blue('\n\n📌 AGENTIC-RAG V2:'));
    console.log(chalk.gray('-'.repeat(40)));
    const v2Result = await callRAG('/functions/v1/agentic-rag-v2', question);
    if (v2Result.success) {
      console.log(`Confiança: ${(v2Result.confidence * 100).toFixed(0)}% | Tempo: ${v2Result.executionTime}ms`);
      console.log(`Fontes: ${JSON.stringify(v2Result.sources)}`);
      console.log('\nResposta:');
      console.log(chalk.white(v2Result.response.substring(0, 500)));
      if (v2Result.response.length > 500) {
        console.log(chalk.gray('... [truncated]'));
      }
    } else {
      console.log(chalk.red(`ERRO: ${v2Result.error}`));
    }
    
    // Test v3
    console.log(chalk.magenta('\n\n📌 AGENTIC-RAG V3:'));
    console.log(chalk.gray('-'.repeat(40)));
    const v3Result = await callRAG('/functions/v1/agentic-rag-v3', question);
    if (v3Result.success) {
      console.log(`Confiança: ${(v3Result.confidence * 100).toFixed(0)}% | Tempo: ${v3Result.executionTime}ms`);
      console.log(`Fontes: ${JSON.stringify(v3Result.sources)}`);
      console.log('\nResposta:');
      console.log(chalk.white(v3Result.response.substring(0, 500)));
      if (v3Result.response.length > 500) {
        console.log(chalk.gray('... [truncated]'));
      }
    } else {
      console.log(chalk.red(`ERRO: ${v3Result.error}`));
    }
    
    // Analysis
    console.log(chalk.yellow('\n\n📊 ANÁLISE:'));
    console.log(chalk.gray('-'.repeat(40)));
    
    // Check which version matches ground truth better
    const groundTruthLower = groundTruth.toLowerCase();
    
    if (v1Result.success && v1Result.response) {
      const v1Match = v1Result.response.toLowerCase().includes(groundTruthLower.substring(0, 50));
      console.log(v1Match ? chalk.green('✅ V1 contém ground truth') : chalk.red('❌ V1 não corresponde ao ground truth'));
    }
    
    if (v2Result.success && v2Result.response) {
      const v2Match = v2Result.response.toLowerCase().includes(groundTruthLower.substring(0, 50));
      console.log(v2Match ? chalk.green('✅ V2 contém ground truth') : chalk.red('❌ V2 não corresponde ao ground truth'));
    }
    
    if (v3Result.success && v3Result.response) {
      const v3Match = v3Result.response.toLowerCase().includes(groundTruthLower.substring(0, 50));
      console.log(v3Match ? chalk.green('✅ V3 contém ground truth') : chalk.red('❌ V3 não corresponde ao ground truth'));
    }
    
    console.log(chalk.gray('\n' + '=' .repeat(80)));
  }
  
  // Final recommendation
  console.log(chalk.bold.cyan('\n\n' + '=' .repeat(80)));
  console.log(chalk.bold.cyan('💡 RECOMENDAÇÃO FINAL'));
  console.log(chalk.bold.cyan('=' .repeat(80)));
  
  console.log(chalk.white(`
Baseado na análise detalhada:

1. A V1 (agentic-rag) parece ser a versão de produção com patch aplicado
2. A V2 (agentic-rag-v2) tem boa precisão mas pode ter respostas genéricas
3. A V3 (agentic-rag-v3) está claramente quebrada (sempre retorna JARDIM SÃO PEDRO)

AÇÃO RECOMENDADA:
`));
  
  console.log(chalk.green('\n✓ Manter agentic-rag (v1) como versão principal'));
  console.log(chalk.yellow('⚠️ Investigar v2 mais a fundo antes de deletar'));
  console.log(chalk.red('✗ Deletar v3 imediatamente (está quebrada)'));
  
  console.log(chalk.gray('\nComando para deletar v3:'));
  console.log(chalk.white('npx supabase functions delete agentic-rag-v3 --project-ref ngrqwmvuhvjkeohesbxs'));
}

// Execute
runDetailedTest().catch(error => {
  console.error(chalk.red('❌ Erro fatal:', error));
  process.exit(1);
});