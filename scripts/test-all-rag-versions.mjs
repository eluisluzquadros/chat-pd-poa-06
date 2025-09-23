#!/usr/bin/env node

/**
 * TESTE COMPARATIVO DAS 3 VERSÕES DO AGENTIC-RAG
 * Identifica qual versão funciona melhor
 */

import fetch from 'node-fetch';
import dotenv from 'dotenv';
import chalk from 'chalk';

dotenv.config({ path: '.env' });

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || 'https://ngrqwmvuhvjkeohesbxs.supabase.co';
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

// Test questions
const TEST_QUESTIONS = [
  {
    id: 1,
    question: "o que afirma literalmente o Art 1º da LUOS?",
    expectedContent: ['Lei de Uso', 'ocupação', 'solo'],
    category: 'article_literal'
  },
  {
    id: 2,
    question: "qual é a altura máxima em petrópolis",
    expectedContent: ['PETRÓPOLIS', 'altura', 'metros'],
    category: 'regime_urbanistico'
  },
  {
    id: 3,
    question: "o que diz o artigo 38 da luos?",
    expectedContent: ['38', 'LUOS'],
    category: 'article_content'
  },
  {
    id: 4,
    question: "resuma o título 1 do pdus",
    expectedContent: ['Título', 'PDUS'],
    category: 'hierarchy'
  },
  {
    id: 5,
    question: "princípios fundamentais do plano diretor",
    expectedContent: ['princípios', 'sustentabilidade'],
    category: 'principles'
  }
];

// RAG versions to test
const RAG_VERSIONS = [
  { name: 'agentic-rag (v1)', endpoint: '/functions/v1/agentic-rag', color: chalk.green },
  { name: 'agentic-rag-v2', endpoint: '/functions/v1/agentic-rag-v2', color: chalk.blue },
  { name: 'agentic-rag-v3', endpoint: '/functions/v1/agentic-rag-v3', color: chalk.magenta }
];

/**
 * Call a specific RAG version
 */
async function callRAGVersion(endpoint, query) {
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
      timeout: 30000 // 30 second timeout
    });
    
    if (!response.ok) {
      const errorText = await response.text();
      throw new Error(`HTTP ${response.status}: ${errorText.substring(0, 100)}`);
    }
    
    const data = await response.json();
    return { 
      success: true, 
      response: data.response || '',
      confidence: data.confidence || 0,
      executionTime: data.executionTime || 0,
      sources: data.sources || {}
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
 * Validate response content
 */
function validateResponse(response, expectedContent) {
  if (!response || response.length < 10) return false;
  
  const responseLower = response.toLowerCase();
  let matchCount = 0;
  
  for (const expected of expectedContent) {
    if (responseLower.includes(expected.toLowerCase())) {
      matchCount++;
    }
  }
  
  return matchCount >= Math.ceil(expectedContent.length * 0.5); // At least 50% match
}

/**
 * Test all versions
 */
async function testAllVersions() {
  console.log(chalk.bold.cyan('\n' + '=' .repeat(70)));
  console.log(chalk.bold.cyan('🔬 TESTE COMPARATIVO - 3 VERSÕES DO AGENTIC-RAG'));
  console.log(chalk.bold.cyan('=' .repeat(70)));
  
  const results = {};
  
  // Initialize results structure
  for (const version of RAG_VERSIONS) {
    results[version.name] = {
      passed: 0,
      failed: 0,
      errors: 0,
      totalTime: 0,
      details: []
    };
  }
  
  // Test each question on each version
  for (const test of TEST_QUESTIONS) {
    console.log(chalk.bold.white(`\n📝 Pergunta ${test.id}: "${test.question.substring(0, 50)}..."`));
    console.log(chalk.gray(`   Categoria: ${test.category}`));
    console.log(chalk.gray(`   Esperado: ${test.expectedContent.join(', ')}`));
    console.log('');
    
    for (const version of RAG_VERSIONS) {
      process.stdout.write(version.color(`   ${version.name.padEnd(20)}: `));
      
      const startTime = Date.now();
      const result = await callRAGVersion(version.endpoint, test.question);
      const elapsed = Date.now() - startTime;
      
      if (!result.success) {
        console.log(chalk.red(`❌ ERROR - ${result.error}`));
        results[version.name].errors++;
        results[version.name].details.push({ 
          question: test.id, 
          status: 'error',
          error: result.error 
        });
      } else {
        const valid = validateResponse(result.response, test.expectedContent);
        
        if (valid) {
          console.log(chalk.green(`✅ PASS (${elapsed}ms, conf: ${(result.confidence * 100).toFixed(0)}%)`));
          results[version.name].passed++;
          results[version.name].totalTime += elapsed;
          results[version.name].details.push({ 
            question: test.id, 
            status: 'passed',
            time: elapsed,
            confidence: result.confidence
          });
        } else {
          console.log(chalk.yellow(`⚠️ INVALID (${elapsed}ms) - Missing expected content`));
          results[version.name].failed++;
          results[version.name].details.push({ 
            question: test.id, 
            status: 'failed',
            reason: 'Missing expected content'
          });
        }
        
        // Show response preview
        if (result.response) {
          const preview = result.response.substring(0, 80).replace(/\n/g, ' ');
          console.log(chalk.gray(`      "${preview}..."`));
        }
      }
    }
  }
  
  // Summary report
  console.log(chalk.bold.cyan('\n' + '=' .repeat(70)));
  console.log(chalk.bold.cyan('📊 RELATÓRIO COMPARATIVO'));
  console.log(chalk.bold.cyan('=' .repeat(70)));
  
  console.log(chalk.bold.white('\n📈 TAXA DE SUCESSO:\n'));
  
  // Create comparison table
  const table = [];
  for (const version of RAG_VERSIONS) {
    const stats = results[version.name];
    const total = TEST_QUESTIONS.length;
    const successRate = (stats.passed / total) * 100;
    const avgTime = stats.totalTime / (stats.passed || 1);
    
    table.push({
      version: version.name,
      passed: stats.passed,
      failed: stats.failed,
      errors: stats.errors,
      total: total,
      successRate: successRate,
      avgTime: avgTime
    });
  }
  
  // Sort by success rate
  table.sort((a, b) => b.successRate - a.successRate);
  
  // Display table
  console.log(chalk.bold('Version'.padEnd(20) + 'Passed'.padEnd(10) + 'Failed'.padEnd(10) + 'Errors'.padEnd(10) + 'Success Rate'.padEnd(15) + 'Avg Time'));
  console.log('-'.repeat(75));
  
  for (const row of table) {
    const rateColor = row.successRate >= 80 ? chalk.green : row.successRate >= 50 ? chalk.yellow : chalk.red;
    console.log(
      row.version.padEnd(20) +
      chalk.green(row.passed.toString()).padEnd(10) +
      chalk.yellow(row.failed.toString()).padEnd(10) +
      chalk.red(row.errors.toString()).padEnd(10) +
      rateColor(`${row.successRate.toFixed(1)}%`).padEnd(15) +
      `${row.avgTime.toFixed(0)}ms`
    );
  }
  
  // Winner
  console.log(chalk.bold.cyan('\n' + '=' .repeat(70)));
  console.log(chalk.bold.cyan('🏆 VENCEDOR'));
  console.log(chalk.bold.cyan('=' .repeat(70)));
  
  const winner = table[0];
  if (winner.successRate > 0) {
    console.log(chalk.bold.green(`\n✅ ${winner.version} é a melhor versão!`));
    console.log(chalk.green(`   Taxa de sucesso: ${winner.successRate.toFixed(1)}%`));
    console.log(chalk.green(`   Tempo médio: ${winner.avgTime.toFixed(0)}ms`));
    
    // Recommendations
    console.log(chalk.bold.white('\n💡 RECOMENDAÇÕES:'));
    
    if (winner.version === 'agentic-rag (v1)') {
      console.log(chalk.green('✓ Continue usando agentic-rag (v1) - versão mais estável'));
    } else if (winner.version === 'agentic-rag-v2') {
      console.log(chalk.blue('→ Considere migrar para v2 se precisar de recursos adicionais'));
    } else if (winner.version === 'agentic-rag-v3') {
      console.log(chalk.magenta('⚠️ v3 ainda experimental - use com cautela'));
    }
  } else {
    console.log(chalk.red('\n❌ Nenhuma versão está funcionando adequadamente!'));
  }
  
  // Detailed problems by version
  console.log(chalk.bold.white('\n🔍 PROBLEMAS IDENTIFICADOS:\n'));
  
  for (const version of RAG_VERSIONS) {
    const stats = results[version.name];
    const problems = stats.details.filter(d => d.status !== 'passed');
    
    if (problems.length > 0) {
      console.log(version.color(`${version.name}:`));
      for (const problem of problems) {
        const question = TEST_QUESTIONS.find(q => q.id === problem.question);
        console.log(chalk.gray(`   Q${problem.question} (${question.category}): ${problem.status === 'error' ? problem.error : problem.reason}`));
      }
    }
  }
}

// Execute
testAllVersions().catch(error => {
  console.error(chalk.red('❌ Erro fatal:', error));
  process.exit(1);
});