#!/usr/bin/env node

/**
 * TESTE EM LOTE PARALELO - Executa múltiplos casos simultaneamente
 */

import { createClient } from '@supabase/supabase-js';
import fetch from 'node-fetch';
import chalk from 'chalk';
import { config } from 'dotenv';
import { fileURLToPath } from 'url';
import path from 'path';
import fs from 'fs/promises';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

config({ path: path.join(__dirname, '..', '.env.local') });

const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL;
const SUPABASE_SERVICE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY;
const SUPABASE_ANON_KEY = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_KEY);

// Configurações
const BATCH_SIZE = 5; // Processar 5 casos por vez
const TIMEOUT = 20000; // 20 segundos por caso

function evaluateResponse(response, keywords) {
  if (!response || !keywords || keywords.length === 0) return { passed: false, accuracy: 0 };
  
  const responseLower = response.toLowerCase();
  const found = keywords.filter(kw => responseLower.includes(kw.toLowerCase()));
  const accuracy = (found.length / keywords.length) * 100;
  
  return {
    passed: accuracy >= 50,
    accuracy,
    found,
    missing: keywords.filter(kw => !found.includes(kw))
  };
}

async function testCase(testCase) {
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
        sessionId: `batch-${Date.now()}-${testCase.id}`,
        bypassCache: true,
        model: 'gpt-3.5-turbo'
      }),
      signal: AbortSignal.timeout(TIMEOUT)
    });

    const result = await response.json();
    const evaluation = evaluateResponse(result.response, testCase.keywords || []);
    
    return {
      id: testCase.id,
      category: testCase.category,
      question: testCase.question,
      ...evaluation,
      executionTime: Date.now() - startTime,
      response: result.response?.substring(0, 200) || 'Sem resposta'
    };
  } catch (error) {
    return {
      id: testCase.id,
      category: testCase.category,
      question: testCase.question,
      passed: false,
      accuracy: 0,
      error: error.message,
      executionTime: Date.now() - startTime
    };
  }
}

async function processBatch(batch, batchNumber, totalBatches) {
  console.log(chalk.cyan(`\n📦 Lote ${batchNumber}/${totalBatches} (${batch.length} casos)`));
  
  const promises = batch.map(tc => testCase(tc));
  const results = await Promise.all(promises);
  
  results.forEach(result => {
    const icon = result.error ? '❌' : result.passed ? '✅' : '⚠️';
    const accuracy = result.accuracy ? `${result.accuracy.toFixed(0)}%` : 'N/A';
    console.log(`  ${icon} [${result.category}] ${result.question.substring(0, 40)}... (${accuracy})`);
  });
  
  return results;
}

async function main() {
  console.log(chalk.cyan.bold('\n🚀 TESTE EM LOTE PARALELO - PLANO DIRETOR POA\n'));
  
  // Buscar todos os casos de teste
  const { data: testCases, error } = await supabase
    .from('qa_test_cases')
    .select('*')
    .order('category');
  
  if (error || !testCases) {
    console.error(chalk.red('❌ Erro ao buscar casos:'), error);
    process.exit(1);
  }
  
  console.log(chalk.green(`✅ ${testCases.length} casos carregados`));
  console.log(chalk.yellow(`📦 Processando em lotes de ${BATCH_SIZE} casos\n`));
  
  // Dividir em lotes
  const batches = [];
  for (let i = 0; i < testCases.length; i += BATCH_SIZE) {
    batches.push(testCases.slice(i, i + BATCH_SIZE));
  }
  
  // Processar lotes
  const allResults = [];
  const startTime = Date.now();
  
  for (let i = 0; i < batches.length; i++) {
    const batchResults = await processBatch(batches[i], i + 1, batches.length);
    allResults.push(...batchResults);
    
    // Pequena pausa entre lotes
    if (i < batches.length - 1) {
      await new Promise(resolve => setTimeout(resolve, 1000));
    }
  }
  
  const totalTime = Date.now() - startTime;
  
  // Análise de resultados
  const stats = {
    total: allResults.length,
    passed: allResults.filter(r => r.passed).length,
    failed: allResults.filter(r => !r.passed && !r.error).length,
    errors: allResults.filter(r => r.error).length,
    avgAccuracy: 0,
    categoryStats: {}
  };
  
  // Estatísticas por categoria
  allResults.forEach(result => {
    if (!stats.categoryStats[result.category]) {
      stats.categoryStats[result.category] = {
        total: 0,
        passed: 0,
        failed: 0,
        errors: 0,
        totalAccuracy: 0
      };
    }
    
    const catStat = stats.categoryStats[result.category];
    catStat.total++;
    
    if (result.error) {
      catStat.errors++;
    } else if (result.passed) {
      catStat.passed++;
    } else {
      catStat.failed++;
    }
    
    catStat.totalAccuracy += result.accuracy || 0;
  });
  
  // Calcular médias
  Object.values(stats.categoryStats).forEach(catStat => {
    catStat.avgAccuracy = catStat.total > 0 ? catStat.totalAccuracy / catStat.total : 0;
    catStat.successRate = catStat.total > 0 ? (catStat.passed / catStat.total) * 100 : 0;
  });
  
  const totalAccuracy = allResults.reduce((sum, r) => sum + (r.accuracy || 0), 0);
  stats.avgAccuracy = stats.total > 0 ? totalAccuracy / stats.total : 0;
  stats.successRate = stats.total > 0 ? (stats.passed / stats.total) * 100 : 0;
  
  // Exibir resumo
  console.log(chalk.cyan.bold('\n' + '═'.repeat(70)));
  console.log(chalk.cyan.bold('📊 RESUMO POR CATEGORIA'));
  console.log(chalk.cyan.bold('═'.repeat(70) + '\n'));
  
  Object.entries(stats.categoryStats)
    .sort((a, b) => b[1].successRate - a[1].successRate)
    .forEach(([category, catStat]) => {
      const icon = catStat.successRate >= 70 ? '✅' : catStat.successRate >= 40 ? '⚠️' : '❌';
      console.log(`${icon} ${category.padEnd(25)} ${catStat.passed}/${catStat.total} (${catStat.successRate.toFixed(1)}%) - Precisão: ${catStat.avgAccuracy.toFixed(1)}%`);
    });
  
  // Estatísticas globais
  console.log(chalk.cyan.bold('\n' + '═'.repeat(70)));
  console.log(chalk.cyan.bold('📈 ESTATÍSTICAS GLOBAIS'));
  console.log(chalk.cyan.bold('═'.repeat(70) + '\n'));
  
  console.log(`Total de Casos: ${stats.total}`);
  console.log(`${chalk.green('✅ Aprovados:')} ${stats.passed} (${stats.successRate.toFixed(1)}%)`);
  console.log(`${chalk.red('❌ Reprovados:')} ${stats.failed} (${((stats.failed/stats.total)*100).toFixed(1)}%)`);
  console.log(`${chalk.yellow('⚠️ Erros:')} ${stats.errors} (${((stats.errors/stats.total)*100).toFixed(1)}%)`);
  console.log(`\nPrecisão Média: ${stats.avgAccuracy.toFixed(1)}%`);
  console.log(`Tempo Total: ${(totalTime/1000/60).toFixed(1)} minutos`);
  console.log(`Tempo Médio por Caso: ${(totalTime/stats.total/1000).toFixed(1)}s`);
  
  // Identificar problemas
  const failureKeywords = {};
  allResults.forEach(result => {
    if (!result.passed && result.missing) {
      result.missing.forEach(kw => {
        failureKeywords[kw] = (failureKeywords[kw] || 0) + 1;
      });
    }
  });
  
  const topMissing = Object.entries(failureKeywords)
    .sort((a, b) => b[1] - a[1])
    .slice(0, 10);
  
  if (topMissing.length > 0) {
    console.log(chalk.yellow.bold('\n⚠️ TOP 10 KEYWORDS FALTANTES:'));
    topMissing.forEach(([kw, count], idx) => {
      console.log(`  ${idx + 1}. "${kw}" - faltou em ${count} respostas`);
    });
  }
  
  // Salvar relatório
  const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
  const reportPath = path.join(__dirname, '..', 'test-reports', `batch-test-${timestamp}.json`);
  
  await fs.mkdir(path.dirname(reportPath), { recursive: true });
  await fs.writeFile(reportPath, JSON.stringify({
    timestamp: new Date().toISOString(),
    executionTime: totalTime,
    stats,
    topMissing,
    results: allResults
  }, null, 2));
  
  console.log(chalk.gray(`\n📁 Relatório salvo em: ${reportPath}`));
  
  // Conclusão
  console.log(chalk.cyan.bold('\n' + '═'.repeat(70)));
  if (stats.successRate >= 70) {
    console.log(chalk.green.bold('✅ SISTEMA FUNCIONANDO BEM'));
  } else if (stats.successRate >= 50) {
    console.log(chalk.yellow.bold('⚠️ SISTEMA PRECISA MELHORIAS'));
  } else {
    console.log(chalk.red.bold('❌ SISTEMA COM PROBLEMAS CRÍTICOS'));
  }
  console.log(chalk.cyan.bold('═'.repeat(70)));
}

main().catch(error => {
  console.error(chalk.red('\n❌ ERRO:'), error);
  process.exit(1);
});