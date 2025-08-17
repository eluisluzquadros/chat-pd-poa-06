#!/usr/bin/env node

import dotenv from 'dotenv';
import { createClient } from '@supabase/supabase-js';
import chalk from 'chalk';
import ora from 'ora';
import Table from 'cli-table3';

// Load environment variables
dotenv.config({ path: '.env' });

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

if (!supabaseUrl || !supabaseKey) {
  console.error('❌ Missing environment variables');
  process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseKey);

// Comprehensive test cases covering all categories
const testCases = {
  'Artigos Legais': [
    { query: 'O que diz o artigo 75?', expected: ['artigo 75', 'áreas de proteção'] },
    { query: 'Qual o conteúdo do artigo 20?', expected: ['artigo 20', 'outorga onerosa'] },
    { query: 'O que estabelece o artigo 45?', expected: ['artigo 45', 'iptu progressivo'] },
    { query: 'Explique o artigo 55', expected: ['artigo 55', 'zeis', 'interesse social'] },
    { query: 'O que define o artigo 1?', expected: ['artigo 1', 'normas', 'uso', 'ocupação'] }
  ],
  'Regime Urbanístico': [
    { query: 'Altura máxima em Petrópolis', expected: ['petrópolis', 'altura'] },
    { query: 'Taxa de ocupação no Centro', expected: ['centro', 'taxa', 'ocupação'] },
    { query: 'Parâmetros do bairro Cidade Baixa', expected: ['cidade baixa'] },
    { query: 'Regime urbanístico de Menino Deus', expected: ['menino deus'] },
    { query: 'Coeficiente de aproveitamento em Moinhos de Vento', expected: ['moinhos'] }
  ],
  'Zonas e ZOTs': [
    { query: 'O que é ZOT-08?', expected: ['zot', '08'] },
    { query: 'Parâmetros da ZOT-13', expected: ['zot', '13'] },
    { query: 'Quais bairros pertencem à ZOT-07?', expected: ['zot', '07', 'bairros'] },
    { query: 'Características da ZOT-15', expected: ['zot', '15'] },
    { query: 'Diferença entre ZOT-01 e ZOT-02', expected: ['zot', '01', '02'] }
  ],
  'Proteção e Riscos': [
    { query: 'Bairros com proteção contra enchentes', expected: ['proteção', 'enchentes'] },
    { query: 'Áreas de risco de inundação', expected: ['risco', 'inundação'] },
    { query: 'Zonas de preservação ambiental', expected: ['preservação', 'ambiental'] },
    { query: 'Áreas não edificáveis', expected: ['não edificáveis'] },
    { query: 'Proteção do patrimônio histórico', expected: ['patrimônio', 'histórico'] }
  ],
  'Conceitos Urbanísticos': [
    { query: 'O que é outorga onerosa?', expected: ['outorga onerosa'] },
    { query: 'Definição de ZEIS', expected: ['zeis', 'interesse social'] },
    { query: 'O que é taxa de ocupação?', expected: ['taxa', 'ocupação'] },
    { query: 'Conceito de coeficiente de aproveitamento', expected: ['coeficiente', 'aproveitamento'] },
    { query: 'O que significa recuo frontal?', expected: ['recuo', 'frontal'] }
  ],
  'Perguntas Complexas': [
    { query: 'Compare os parâmetros urbanísticos de Petrópolis e Menino Deus', expected: ['petrópolis', 'menino deus'] },
    { query: 'Quais artigos tratam sobre habitação social?', expected: ['habitação', 'social'] },
    { query: 'Como funciona o IPTU progressivo segundo o artigo 45?', expected: ['iptu', 'progressivo', 'artigo 45'] },
    { query: 'Requisitos para construir em área de proteção ambiental', expected: ['proteção', 'ambiental', 'construir'] },
    { query: 'Diferenças entre ZOT residencial e comercial', expected: ['zot', 'residencial', 'comercial'] }
  ]
};

async function testQuery(query, expectedKeywords) {
  const spinner = ora(`Testing: "${query}"`).start();
  
  try {
    const startTime = Date.now();
    
    const response = await fetch(`${supabaseUrl}/functions/v1/agentic-rag`, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${supabaseKey}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        message: query,
        bypassCache: true
      }),
      signal: AbortSignal.timeout(15000) // 15 second timeout
    });

    const responseTime = Date.now() - startTime;

    if (!response.ok) {
      spinner.fail(chalk.red(`HTTP ${response.status}`));
      return { success: false, responseTime, error: `HTTP ${response.status}` };
    }

    const data = await response.json();
    
    if (!data.response || data.response.length < 50) {
      spinner.fail(chalk.red('Response too short'));
      return { success: false, responseTime, error: 'Short response' };
    }
    
    // Check if response contains expected keywords
    const responseText = data.response.toLowerCase();
    const foundKeywords = expectedKeywords.filter(kw => 
      responseText.includes(kw.toLowerCase())
    );
    
    const keywordCoverage = foundKeywords.length / expectedKeywords.length;
    const confidence = data.confidence || 0;
    
    // Success criteria: good keyword coverage OR high confidence
    const success = keywordCoverage >= 0.5 || confidence >= 0.7;
    
    if (success) {
      spinner.succeed(chalk.green(`✅ (${responseTime}ms, conf: ${confidence.toFixed(2)})`));
    } else {
      spinner.warn(chalk.yellow(`⚠️ Low coverage: ${(keywordCoverage * 100).toFixed(0)}%`));
    }
    
    return {
      success,
      responseTime,
      confidence,
      keywordCoverage,
      responseLength: data.response.length
    };
    
  } catch (error) {
    spinner.fail(chalk.red(`Error: ${error.message}`));
    return { success: false, error: error.message };
  }
}

async function runCategoryTests(categoryName, tests) {
  console.log(chalk.cyan(`\n📂 ${categoryName}`));
  console.log('─'.repeat(40));
  
  const results = [];
  
  for (const test of tests) {
    const result = await testQuery(test.query, test.expected);
    results.push(result);
    
    // Small delay between queries
    await new Promise(resolve => setTimeout(resolve, 1000));
  }
  
  const successCount = results.filter(r => r.success).length;
  const successRate = (successCount / results.length) * 100;
  
  console.log(chalk.blue(`\n📊 ${categoryName}: ${successRate.toFixed(1)}% (${successCount}/${results.length})`));
  
  return { category: categoryName, results, successRate };
}

async function generateReport(categoryResults) {
  console.log(chalk.cyan.bold('\n\n📈 COMPREHENSIVE TEST REPORT\n'));
  console.log('═'.repeat(60));
  
  // Summary table
  const summaryTable = new Table({
    head: ['Category', 'Success Rate', 'Passed', 'Total'],
    colWidths: [25, 15, 10, 10]
  });
  
  let totalTests = 0;
  let totalPassed = 0;
  
  categoryResults.forEach(cat => {
    const passed = cat.results.filter(r => r.success).length;
    const total = cat.results.length;
    totalTests += total;
    totalPassed += passed;
    
    const color = cat.successRate >= 80 ? chalk.green : 
                  cat.successRate >= 60 ? chalk.yellow : 
                  chalk.red;
    
    summaryTable.push([
      cat.category,
      color(`${cat.successRate.toFixed(1)}%`),
      passed.toString(),
      total.toString()
    ]);
  });
  
  console.log(summaryTable.toString());
  
  // Overall statistics
  const overallRate = (totalPassed / totalTests) * 100;
  
  console.log(chalk.cyan('\n📊 Overall Statistics:'));
  console.log(`   Total Tests: ${totalTests}`);
  console.log(`   Passed: ${totalPassed}`);
  console.log(`   Failed: ${totalTests - totalPassed}`);
  console.log(`   Success Rate: ${chalk.bold(overallRate.toFixed(1) + '%')}`);
  
  // Performance metrics
  const allResults = categoryResults.flatMap(c => c.results);
  const successfulResults = allResults.filter(r => r.success && r.responseTime);
  
  if (successfulResults.length > 0) {
    const avgResponseTime = successfulResults.reduce((sum, r) => sum + r.responseTime, 0) / successfulResults.length;
    const avgConfidence = successfulResults
      .filter(r => r.confidence)
      .reduce((sum, r) => sum + r.confidence, 0) / successfulResults.filter(r => r.confidence).length;
    
    console.log(chalk.cyan('\n⚡ Performance Metrics:'));
    console.log(`   Avg Response Time: ${avgResponseTime.toFixed(0)}ms`);
    console.log(`   Avg Confidence: ${avgConfidence.toFixed(2)}`);
  }
  
  // Grade calculation
  let grade = 'F';
  if (overallRate >= 95) grade = 'A+';
  else if (overallRate >= 90) grade = 'A';
  else if (overallRate >= 85) grade = 'B+';
  else if (overallRate >= 80) grade = 'B';
  else if (overallRate >= 75) grade = 'C+';
  else if (overallRate >= 70) grade = 'C';
  else if (overallRate >= 60) grade = 'D';
  
  const gradeColor = grade.startsWith('A') ? chalk.green :
                     grade.startsWith('B') ? chalk.blue :
                     grade.startsWith('C') ? chalk.yellow :
                     chalk.red;
  
  console.log(chalk.cyan('\n🎯 Final Grade: ') + gradeColor.bold(grade));
  
  // Recommendations
  console.log(chalk.cyan('\n💡 Recommendations:'));
  
  categoryResults.forEach(cat => {
    if (cat.successRate < 80) {
      console.log(chalk.yellow(`   ⚠️ ${cat.category} needs improvement (${cat.successRate.toFixed(1)}%)`));
    }
  });
  
  if (overallRate >= 95) {
    console.log(chalk.green.bold('   🎉 Excellent! System ready for production!'));
  } else if (overallRate >= 90) {
    console.log(chalk.green('   ✅ Very good performance! Minor improvements needed.'));
  } else if (overallRate >= 80) {
    console.log(chalk.blue('   📈 Good progress! Continue expanding knowledge base.'));
  } else {
    console.log(chalk.yellow('   ⚠️ More work needed to reach production quality.'));
  }
  
  return overallRate;
}

async function main() {
  console.log(chalk.cyan.bold('🧪 Comprehensive RAG System Test\n'));
  console.log(chalk.gray('Testing across all categories with 35 test cases...\n'));
  console.log('═'.repeat(60));
  
  const categoryResults = [];
  
  for (const [categoryName, tests] of Object.entries(testCases)) {
    const result = await runCategoryTests(categoryName, tests);
    categoryResults.push(result);
  }
  
  const overallRate = await generateReport(categoryResults);
  
  // Save results
  const timestamp = new Date().toISOString();
  const reportData = {
    timestamp,
    overallRate,
    categoryResults: categoryResults.map(c => ({
      category: c.category,
      successRate: c.successRate,
      testCount: c.results.length
    }))
  };
  
  try {
    await supabase.from('performance_reports').insert({
      report_data: reportData,
      created_at: timestamp
    });
    console.log(chalk.gray('\n📝 Report saved to database'));
  } catch (error) {
    console.log(chalk.gray('\n📝 Could not save report to database'));
  }
  
  console.log(chalk.cyan.bold('\n✨ Test Complete!\n'));
}

// Install missing dependencies
async function checkDependencies() {
  try {
    await import('cli-table3');
  } catch {
    console.log('Installing cli-table3...');
    const { exec } = await import('child_process');
    await new Promise((resolve) => {
      exec('npm install cli-table3', (error) => {
        if (error) console.error('Error installing:', error);
        resolve();
      });
    });
  }
}

checkDependencies().then(() => main()).catch(console.error);