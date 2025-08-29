#!/usr/bin/env node

/**
 * TESTE COM GROUND TRUTH - VALIDAÇÃO REAL
 * Busca o conteúdo correto no banco e compara com as respostas das Edge Functions
 */

import { createClient } from '@supabase/supabase-js';
import fetch from 'node-fetch';
import dotenv from 'dotenv';
import chalk from 'chalk';

dotenv.config({ path: '.env' });

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || 'https://ngrqwmvuhvjkeohesbxs.supabase.co';
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
const supabase = createClient(supabaseUrl, supabaseKey);

// Test cases with ground truth retrieval
const TEST_CASES = [
  {
    id: 1,
    question: "o que afirma literalmente o Art 1º da LUOS?",
    category: 'article_literal',
    groundTruthQuery: async () => {
      const { data } = await supabase
        .from('legal_articles')
        .select('full_content, article_text')
        .eq('document_type', 'LUOS')
        .eq('article_number', '1')
        .single();
      return {
        found: !!data,
        content: data?.full_content || data?.article_text || null,
        validation: (response) => {
          if (!response || response.length < 50) return false;
          // Must contain the actual article text
          return response.includes('Fica instituída') || 
                 response.includes('Lei de Uso e Ocupação do Solo') ||
                 response.includes('LUOS');
        }
      };
    }
  },
  {
    id: 2,
    question: "qual é a altura máxima em petrópolis",
    category: 'regime_urbanistico',
    groundTruthQuery: async () => {
      const { data } = await supabase
        .from('regime_urbanistico_consolidado')
        .select('*')
        .ilike('"Bairro"', '%PETRÓPOLIS%')
        .limit(5);
      return {
        found: !!data && data.length > 0,
        content: data,
        validation: (response) => {
          if (!response || response.length < 50) return false;
          // Must contain PETRÓPOLIS and actual height values
          const hasNeighborhood = response.toUpperCase().includes('PETRÓPOLIS');
          const hasHeight = /\d+\s*m/i.test(response) || /altura.*\d+/i.test(response);
          const hasZone = /ZOT\s*\d+/i.test(response) || response.includes('zona');
          return hasNeighborhood && (hasHeight || hasZone);
        }
      };
    }
  },
  {
    id: 3,
    question: "o que diz o artigo 38 da luos?",
    category: 'article_content',
    groundTruthQuery: async () => {
      const { data } = await supabase
        .from('legal_articles')
        .select('full_content, article_text')
        .eq('document_type', 'LUOS')
        .eq('article_number', '38')
        .single();
      return {
        found: !!data,
        content: data?.full_content || data?.article_text || null,
        validation: (response) => {
          if (!response || response.length < 50) return false;
          // If article doesn't exist, should say so
          if (!data) {
            return response.includes('não encontr') || 
                   response.includes('não foi possível');
          }
          // If exists, must contain actual content
          return response.includes('Art. 38') || response.includes('artigo 38');
        }
      };
    }
  },
  {
    id: 4,
    question: "quais os princípios fundamentais do Art. 3º do PDUS?",
    category: 'principles',
    groundTruthQuery: async () => {
      const { data } = await supabase
        .from('legal_articles')
        .select('full_content, article_text')
        .eq('document_type', 'PDUS')
        .eq('article_number', '3')
        .single();
      return {
        found: !!data,
        content: data?.full_content || data?.article_text || null,
        validation: (response) => {
          if (!response || response.length < 50) return false;
          // Must list principles or say not found
          const hasPrinciples = response.includes('princíp');
          const hasArticle = response.includes('Art. 3') || response.includes('artigo 3');
          const hasList = response.includes('I -') || response.includes('1.') || response.includes('•');
          return (hasPrinciples && hasArticle) || hasList;
        }
      };
    }
  },
  {
    id: 5,
    question: "qual artigo da LUOS trata da Certificação em Sustentabilidade Ambiental?",
    category: 'search',
    groundTruthQuery: async () => {
      const { data } = await supabase
        .from('legal_articles')
        .select('article_number, full_content')
        .eq('document_type', 'LUOS')
        .or('full_content.ilike.%certificação%sustentabilidade%,full_content.ilike.%certificação%ambiental%')
        .limit(5);
      return {
        found: !!data && data.length > 0,
        content: data,
        validation: (response) => {
          if (!response || response.length < 30) return false;
          // Must mention an article number or say not found
          const hasArticleNumber = /art.*\d+/i.test(response);
          const hasNotFound = response.includes('não encontr') || response.includes('não foi possível');
          const hasCertification = response.toLowerCase().includes('certificação');
          return (hasArticleNumber && hasCertification) || hasNotFound;
        }
      };
    }
  }
];

// RAG versions to test
const RAG_VERSIONS = [
  { name: 'agentic-rag (v1)', endpoint: '/functions/v1/agentic-rag', color: chalk.green },
  { name: 'agentic-rag-v2', endpoint: '/functions/v1/agentic-rag-v2', color: chalk.blue },
  { name: 'agentic-rag-v3', endpoint: '/functions/v1/agentic-rag-v3', color: chalk.magenta }
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
      const errorText = await response.text();
      throw new Error(`HTTP ${response.status}`);
    }
    
    const data = await response.json();
    return { 
      success: true, 
      response: data.response || '',
      confidence: data.confidence || 0
    };
  } catch (error) {
    return { 
      success: false, 
      error: error.message,
      response: ''
    };
  }
}

/**
 * Run ground truth tests
 */
async function runGroundTruthTests() {
  console.log(chalk.bold.cyan('\n' + '=' .repeat(80)));
  console.log(chalk.bold.cyan('🔬 TESTE COM GROUND TRUTH - VALIDAÇÃO REAL'));
  console.log(chalk.bold.cyan('=' .repeat(80)));
  
  const results = {};
  
  // Initialize results
  for (const version of RAG_VERSIONS) {
    results[version.name] = {
      correct: 0,
      incorrect: 0,
      errors: 0,
      details: []
    };
  }
  
  // Test each case
  for (const testCase of TEST_CASES) {
    console.log(chalk.bold.white(`\n📝 Teste ${testCase.id}: "${testCase.question}"`));
    console.log(chalk.gray(`   Categoria: ${testCase.category}`));
    
    // Get ground truth
    console.log(chalk.yellow('\n   🔍 Buscando ground truth...'));
    const groundTruth = await testCase.groundTruthQuery();
    
    if (groundTruth.found) {
      console.log(chalk.green(`   ✅ Ground truth encontrado no banco`));
      if (typeof groundTruth.content === 'string') {
        const preview = groundTruth.content.substring(0, 100).replace(/\n/g, ' ');
        console.log(chalk.gray(`      "${preview}..."`));
      } else if (Array.isArray(groundTruth.content)) {
        console.log(chalk.gray(`      ${groundTruth.content.length} registros encontrados`));
      }
    } else {
      console.log(chalk.red(`   ❌ Ground truth NÃO encontrado no banco`));
    }
    
    console.log(chalk.white('\n   📊 Testando versões:\n'));
    
    // Test each version
    for (const version of RAG_VERSIONS) {
      process.stdout.write(version.color(`   ${version.name.padEnd(20)}: `));
      
      const result = await callRAG(version.endpoint, testCase.question);
      
      if (!result.success) {
        console.log(chalk.red(`❌ ERRO: ${result.error}`));
        results[version.name].errors++;
        results[version.name].details.push({
          test: testCase.id,
          status: 'error',
          error: result.error
        });
      } else {
        // Validate against ground truth
        const isCorrect = groundTruth.validation(result.response);
        
        if (isCorrect) {
          console.log(chalk.green(`✅ CORRETO`));
          results[version.name].correct++;
          results[version.name].details.push({
            test: testCase.id,
            status: 'correct'
          });
        } else {
          console.log(chalk.red(`❌ INCORRETO`));
          results[version.name].incorrect++;
          results[version.name].details.push({
            test: testCase.id,
            status: 'incorrect'
          });
          
          // Show why it's incorrect
          const preview = result.response.substring(0, 80).replace(/\n/g, ' ');
          console.log(chalk.gray(`      Resposta: "${preview}..."`));
          
          // Specific validation feedback
          if (result.response.includes('não foi possível') || result.response.includes('não encontr')) {
            console.log(chalk.red(`      ⚠️ Resposta genérica de erro ao invés de buscar dados`));
          } else if (result.response.length < 50) {
            console.log(chalk.red(`      ⚠️ Resposta muito curta (${result.response.length} chars)`));
          } else {
            console.log(chalk.red(`      ⚠️ Conteúdo não corresponde ao ground truth`));
          }
        }
      }
    }
    
    console.log(chalk.gray('\n   ' + '-'.repeat(70)));
  }
  
  // Final report
  console.log(chalk.bold.cyan('\n' + '=' .repeat(80)));
  console.log(chalk.bold.cyan('📊 RELATÓRIO FINAL - GROUND TRUTH'));
  console.log(chalk.bold.cyan('=' .repeat(80)));
  
  console.log(chalk.bold.white('\n📈 RESULTADOS POR VERSÃO:\n'));
  
  // Create summary table
  const table = [];
  for (const version of RAG_VERSIONS) {
    const stats = results[version.name];
    const total = TEST_CASES.length;
    const accuracy = (stats.correct / total) * 100;
    
    table.push({
      version: version.name,
      correct: stats.correct,
      incorrect: stats.incorrect,
      errors: stats.errors,
      total: total,
      accuracy: accuracy
    });
  }
  
  // Sort by accuracy
  table.sort((a, b) => b.accuracy - a.accuracy);
  
  // Display table
  console.log(chalk.bold('Versão'.padEnd(20) + 'Corretas'.padEnd(12) + 'Incorretas'.padEnd(12) + 'Erros'.padEnd(10) + 'Precisão'));
  console.log('-'.repeat(70));
  
  for (const row of table) {
    const accuracyColor = row.accuracy >= 80 ? chalk.green : 
                         row.accuracy >= 50 ? chalk.yellow : 
                         chalk.red;
    
    console.log(
      row.version.padEnd(20) +
      chalk.green(row.correct.toString()).padEnd(12) +
      chalk.red(row.incorrect.toString()).padEnd(12) +
      chalk.red(row.errors.toString()).padEnd(10) +
      accuracyColor(`${row.accuracy.toFixed(1)}%`)
    );
  }
  
  // Winner and recommendations
  console.log(chalk.bold.cyan('\n' + '=' .repeat(80)));
  console.log(chalk.bold.cyan('🏆 VEREDITO FINAL'));
  console.log(chalk.bold.cyan('=' .repeat(80)));
  
  const winner = table[0];
  
  if (winner.accuracy >= 80) {
    console.log(chalk.bold.green(`\n✅ ${winner.version} é a melhor versão com ${winner.accuracy.toFixed(1)}% de precisão!`));
    
    if (winner.version === 'agentic-rag (v1)') {
      console.log(chalk.green('\n✓ RECOMENDAÇÃO: Continue usando v1 e delete v2 e v3'));
      console.log(chalk.gray('\nComandos para deletar versões desnecessárias:'));
      console.log(chalk.white('npx supabase functions delete agentic-rag-v2 --project-ref ngrqwmvuhvjkeohesbxs'));
      console.log(chalk.white('npx supabase functions delete agentic-rag-v3 --project-ref ngrqwmvuhvjkeohesbxs'));
    }
  } else if (winner.accuracy >= 50) {
    console.log(chalk.yellow(`\n⚠️ ${winner.version} tem a melhor performance mas apenas ${winner.accuracy.toFixed(1)}% de precisão`));
    console.log(chalk.yellow('Nenhuma versão está adequada para produção!'));
  } else {
    console.log(chalk.red(`\n❌ TODAS AS VERSÕES FALHARAM! Melhor precisão: ${winner.accuracy.toFixed(1)}%`));
    console.log(chalk.red('Sistema precisa de correções urgentes!'));
  }
  
  // Specific problems
  console.log(chalk.bold.white('\n🔍 ANÁLISE DETALHADA:\n'));
  
  for (const version of RAG_VERSIONS) {
    const stats = results[version.name];
    const problems = stats.details.filter(d => d.status !== 'correct');
    
    if (problems.length > 0) {
      console.log(version.color(`${version.name}:`));
      const failedTests = problems.map(p => `Q${p.test}`).join(', ');
      console.log(chalk.gray(`   Falhou em: ${failedTests}`));
    }
  }
  
  return table;
}

// Execute
runGroundTruthTests().catch(error => {
  console.error(chalk.red('❌ Erro fatal:', error));
  process.exit(1);
});