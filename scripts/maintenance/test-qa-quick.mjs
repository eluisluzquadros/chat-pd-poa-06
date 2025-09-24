#!/usr/bin/env node

/**
 * TESTE RÁPIDO DE QA - 20 CASOS REPRESENTATIVOS
 * Testa uma amostra de cada categoria para avaliar o sistema
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

async function runTestCase(testCase) {
  const startTime = Date.now();
  
  try {
    const response = await fetch(`${SUPABASE_URL}/functions/v1/agentic-rag`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${SUPABASE_ANON_KEY}`,
      },
      body: JSON.stringify({
        query: testCase.question,
        sessionId: 'qa-test-' + Date.now(),
        bypassCache: true,
        model: 'gpt-3.5-turbo'
      })
    });

    const result = await response.json();
    const executionTime = Date.now() - startTime;
    
    // Avaliação simplificada
    let passed = false;
    let accuracy = 0;
    
    if (result.response) {
      const responseText = result.response.toLowerCase();
      
      // Verificar palavras-chave essenciais
      const keywords = testCase.keywords || [];
      const foundKeywords = keywords.filter(kw => 
        responseText.includes(kw.toLowerCase())
      );
      
      accuracy = (foundKeywords.length / keywords.length) * 100;
      passed = accuracy >= 50; // Pelo menos 50% das keywords
    }
    
    return {
      id: testCase.id,
      category: testCase.category,
      question: testCase.question.substring(0, 50) + '...',
      passed,
      accuracy,
      executionTime,
      response: result.response ? result.response.substring(0, 100) + '...' : 'Sem resposta'
    };
    
  } catch (error) {
    return {
      id: testCase.id,
      category: testCase.category,
      question: testCase.question.substring(0, 50) + '...',
      passed: false,
      accuracy: 0,
      executionTime: Date.now() - startTime,
      error: error.message
    };
  }
}

async function main() {
  console.log(chalk.cyan.bold('\n🚀 TESTE RÁPIDO DE QA - AMOSTRA REPRESENTATIVA\n'));
  console.log(chalk.gray('Testando 20 casos selecionados de diferentes categorias...\n'));
  
  // Buscar casos de teste selecionados
  const { data: testCases, error } = await supabase
    .from('qa_test_cases')
    .select('*')
    .in('category', [
      'altura_maxima',
      'legal_articles', 
      'bairros',
      'conceitos',
      'sistema',
      'regime_urbanistico'
    ])
    .limit(20);
  
  if (error || !testCases) {
    console.error(chalk.red('❌ Erro ao buscar casos de teste:'), error);
    process.exit(1);
  }
  
  console.log(chalk.yellow(`📝 Testando ${testCases.length} casos...\n`));
  
  const results = [];
  const categoryResults = {};
  
  for (let i = 0; i < testCases.length; i++) {
    const testCase = testCases[i];
    process.stdout.write(chalk.gray(`  ${i+1}/${testCases.length} - ${testCase.question.substring(0, 40)}... `));
    
    const result = await runTestCase(testCases[i]);
    results.push(result);
    
    if (!categoryResults[testCase.category]) {
      categoryResults[testCase.category] = { total: 0, passed: 0, totalAccuracy: 0 };
    }
    
    categoryResults[testCase.category].total++;
    if (result.passed) categoryResults[testCase.category].passed++;
    categoryResults[testCase.category].totalAccuracy += result.accuracy;
    
    if (result.passed) {
      console.log(chalk.green(`✅ ${result.accuracy.toFixed(0)}% ${result.executionTime}ms`));
    } else if (result.error) {
      console.log(chalk.red(`❌ Erro: ${result.error}`));
    } else {
      console.log(chalk.yellow(`⚠️ ${result.accuracy.toFixed(0)}% ${result.executionTime}ms`));
    }
  }
  
  // Estatísticas por categoria
  console.log(chalk.cyan.bold('\n📊 RESULTADOS POR CATEGORIA:\n'));
  
  Object.entries(categoryResults).forEach(([category, stats]) => {
    const successRate = (stats.passed / stats.total) * 100;
    const avgAccuracy = stats.totalAccuracy / stats.total;
    
    const icon = successRate >= 70 ? '✅' : successRate >= 40 ? '⚠️' : '❌';
    console.log(`${icon} ${category}: ${stats.passed}/${stats.total} (${successRate.toFixed(1)}%) - Precisão média: ${avgAccuracy.toFixed(1)}%`);
  });
  
  // Estatísticas gerais
  const totalPassed = results.filter(r => r.passed).length;
  const totalAccuracy = results.reduce((sum, r) => sum + r.accuracy, 0) / results.length;
  const avgTime = results.reduce((sum, r) => sum + r.executionTime, 0) / results.length;
  
  console.log(chalk.cyan.bold('\n📈 ESTATÍSTICAS GERAIS:\n'));
  console.log(`Taxa de Sucesso: ${((totalPassed/results.length)*100).toFixed(1)}% (${totalPassed}/${results.length})`);
  console.log(`Precisão Média: ${totalAccuracy.toFixed(1)}%`);
  console.log(`Tempo Médio: ${(avgTime/1000).toFixed(1)}s`);
  
  // Problemas encontrados
  const failures = results.filter(r => !r.passed);
  if (failures.length > 0) {
    console.log(chalk.yellow.bold('\n⚠️ CASOS QUE FALHARAM:\n'));
    failures.forEach(f => {
      console.log(`❌ [${f.category}] ${f.question}`);
      if (f.error) {
        console.log(chalk.red(`   Erro: ${f.error}`));
      } else {
        console.log(chalk.gray(`   Precisão: ${f.accuracy.toFixed(0)}%`));
      }
    });
  }
  
  // Salvar resultados
  const reportPath = path.join(__dirname, '..', 'test-reports', `qa-quick-${Date.now()}.json`);
  const fs = await import('fs');
  await fs.promises.mkdir(path.dirname(reportPath), { recursive: true });
  await fs.promises.writeFile(reportPath, JSON.stringify({
    timestamp: new Date().toISOString(),
    totalCases: results.length,
    passed: totalPassed,
    failed: results.length - totalPassed,
    successRate: (totalPassed/results.length)*100,
    averageAccuracy: totalAccuracy,
    averageTime: avgTime,
    categoryResults,
    details: results
  }, null, 2));
  
  console.log(chalk.gray(`\n📁 Relatório salvo em: ${reportPath}`));
  
  // Conclusão
  if (totalPassed === results.length) {
    console.log(chalk.green.bold('\n🎉 TODOS OS TESTES PASSARAM!'));
  } else if (totalPassed >= results.length * 0.7) {
    console.log(chalk.yellow.bold('\n⚠️ SISTEMA FUNCIONANDO COM ALGUMAS FALHAS'));
  } else {
    console.log(chalk.red.bold('\n❌ SISTEMA COM PROBLEMAS CRÍTICOS'));
  }
}

main().catch(error => {
  console.error(chalk.red('\n❌ ERRO FATAL:'), error);
  process.exit(1);
});