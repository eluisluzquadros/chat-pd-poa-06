#!/usr/bin/env node

/**
 * TESTE COMPLETO - TODOS OS 121 CASOS DE TESTE
 * Executa todos os casos cadastrados e gera relatório detalhado
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

// Avaliar resposta com base em keywords esperadas
function evaluateResponse(response, expectedKeywords) {
  if (!response) return { passed: false, accuracy: 0, missing: expectedKeywords };
  
  const responseLower = response.toLowerCase();
  const found = [];
  const missing = [];
  
  expectedKeywords.forEach(keyword => {
    if (responseLower.includes(keyword.toLowerCase())) {
      found.push(keyword);
    } else {
      missing.push(keyword);
    }
  });
  
  const accuracy = expectedKeywords.length > 0 
    ? (found.length / expectedKeywords.length) * 100 
    : 0;
    
  return {
    passed: accuracy >= 60, // Considera sucesso se acertar 60% das keywords
    accuracy,
    found,
    missing
  };
}

async function testCase(testCase, index, total) {
  const startTime = Date.now();
  
  process.stdout.write(chalk.gray(`  ${index}/${total} - ${testCase.question.substring(0, 50)}... `));
  
  try {
    const response = await fetch(`${SUPABASE_URL}/functions/v1/agentic-rag`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${SUPABASE_ANON_KEY}`,
      },
      body: JSON.stringify({
        query: testCase.question,
        sessionId: 'test-complete-' + Date.now(),
        bypassCache: true,
        model: 'gpt-3.5-turbo'
      }),
      signal: AbortSignal.timeout(30000) // 30 second timeout
    });

    const result = await response.json();
    const executionTime = Date.now() - startTime;
    
    // Avaliar resposta
    const evaluation = evaluateResponse(result.response, testCase.keywords || []);
    
    if (evaluation.passed) {
      console.log(chalk.green(`✅ ${evaluation.accuracy.toFixed(0)}% (${executionTime}ms)`));
    } else {
      console.log(chalk.red(`❌ ${evaluation.accuracy.toFixed(0)}% (${executionTime}ms)`));
    }
    
    return {
      id: testCase.id,
      category: testCase.category,
      question: testCase.question,
      response: result.response || 'Sem resposta',
      ...evaluation,
      executionTime,
      confidence: result.confidence || 0
    };
    
  } catch (error) {
    console.log(chalk.red(`❌ Erro: ${error.message}`));
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

async function main() {
  console.log(chalk.cyan.bold('\n🚀 TESTE COMPLETO - 121 CASOS DO PLANO DIRETOR POA\n'));
  console.log(chalk.yellow('Este teste levará aproximadamente 10-15 minutos...\n'));
  
  // Buscar todos os casos de teste
  const { data: testCases, error } = await supabase
    .from('qa_test_cases')
    .select('*')
    .order('category', { ascending: true })
    .order('id', { ascending: true });
  
  if (error || !testCases) {
    console.error(chalk.red('❌ Erro ao buscar casos de teste:'), error);
    process.exit(1);
  }
  
  console.log(chalk.green(`✅ ${testCases.length} casos de teste carregados\n`));
  
  // Agrupar por categoria
  const categories = {};
  testCases.forEach(tc => {
    if (!categories[tc.category]) {
      categories[tc.category] = [];
    }
    categories[tc.category].push(tc);
  });
  
  // Estatísticas globais
  const globalStats = {
    total: 0,
    passed: 0,
    failed: 0,
    errors: 0,
    totalAccuracy: 0,
    totalTime: 0,
    categoryStats: {}
  };
  
  // Processar por categoria
  for (const [category, cases] of Object.entries(categories)) {
    console.log(chalk.cyan.bold(`\n📂 ${category} (${cases.length} testes)\n`));
    
    const categoryResults = {
      total: cases.length,
      passed: 0,
      failed: 0,
      errors: 0,
      totalAccuracy: 0,
      totalTime: 0,
      results: []
    };
    
    for (let i = 0; i < cases.length; i++) {
      const result = await testCase(cases[i], i + 1, cases.length);
      categoryResults.results.push(result);
      
      if (result.error) {
        categoryResults.errors++;
      } else if (result.passed) {
        categoryResults.passed++;
      } else {
        categoryResults.failed++;
      }
      
      categoryResults.totalAccuracy += result.accuracy || 0;
      categoryResults.totalTime += result.executionTime || 0;
      
      // Pequena pausa para não sobrecarregar
      if (i < cases.length - 1) {
        await new Promise(resolve => setTimeout(resolve, 500));
      }
    }
    
    // Calcular médias da categoria
    categoryResults.avgAccuracy = categoryResults.totalAccuracy / categoryResults.total;
    categoryResults.avgTime = categoryResults.totalTime / categoryResults.total;
    categoryResults.successRate = (categoryResults.passed / categoryResults.total) * 100;
    
    globalStats.categoryStats[category] = categoryResults;
    globalStats.total += categoryResults.total;
    globalStats.passed += categoryResults.passed;
    globalStats.failed += categoryResults.failed;
    globalStats.errors += categoryResults.errors;
    globalStats.totalAccuracy += categoryResults.totalAccuracy;
    globalStats.totalTime += categoryResults.totalTime;
  }
  
  // Calcular médias globais
  globalStats.avgAccuracy = globalStats.totalAccuracy / globalStats.total;
  globalStats.avgTime = globalStats.totalTime / globalStats.total;
  globalStats.successRate = (globalStats.passed / globalStats.total) * 100;
  
  // Exibir resumo por categoria
  console.log(chalk.cyan.bold('\n' + '═'.repeat(70)));
  console.log(chalk.cyan.bold('📊 RESUMO POR CATEGORIA'));
  console.log(chalk.cyan.bold('═'.repeat(70) + '\n'));
  
  Object.entries(globalStats.categoryStats).forEach(([category, stats]) => {
    const icon = stats.successRate >= 70 ? '✅' : stats.successRate >= 40 ? '⚠️' : '❌';
    console.log(`${icon} ${chalk.bold(category.padEnd(25))} ${stats.passed}/${stats.total} (${stats.successRate.toFixed(1)}%) - Precisão: ${stats.avgAccuracy.toFixed(1)}%`);
  });
  
  // Exibir estatísticas globais
  console.log(chalk.cyan.bold('\n' + '═'.repeat(70)));
  console.log(chalk.cyan.bold('📈 ESTATÍSTICAS GLOBAIS'));
  console.log(chalk.cyan.bold('═'.repeat(70) + '\n'));
  
  console.log(`Total de Casos: ${globalStats.total}`);
  console.log(`${chalk.green('✅ Aprovados:')} ${globalStats.passed} (${globalStats.successRate.toFixed(1)}%)`);
  console.log(`${chalk.red('❌ Reprovados:')} ${globalStats.failed} (${((globalStats.failed/globalStats.total)*100).toFixed(1)}%)`);
  console.log(`${chalk.yellow('⚠️ Erros:')} ${globalStats.errors} (${((globalStats.errors/globalStats.total)*100).toFixed(1)}%)`);
  console.log(`\nPrecisão Média: ${globalStats.avgAccuracy.toFixed(1)}%`);
  console.log(`Tempo Médio por Caso: ${(globalStats.avgTime/1000).toFixed(1)}s`);
  console.log(`Tempo Total de Execução: ${(globalStats.totalTime/1000/60).toFixed(1)} minutos`);
  
  // Identificar principais problemas
  console.log(chalk.yellow.bold('\n' + '═'.repeat(70)));
  console.log(chalk.yellow.bold('⚠️ PRINCIPAIS DESAFIOS IDENTIFICADOS'));
  console.log(chalk.yellow.bold('═'.repeat(70) + '\n'));
  
  // Analisar padrões de falha
  const failurePatterns = {};
  Object.values(globalStats.categoryStats).forEach(catStats => {
    catStats.results.forEach(result => {
      if (!result.passed && result.missing) {
        result.missing.forEach(keyword => {
          failurePatterns[keyword] = (failurePatterns[keyword] || 0) + 1;
        });
      }
    });
  });
  
  // Top 10 keywords mais faltantes
  const sortedPatterns = Object.entries(failurePatterns)
    .sort((a, b) => b[1] - a[1])
    .slice(0, 10);
  
  console.log('Top 10 Keywords Mais Faltantes:');
  sortedPatterns.forEach(([keyword, count], idx) => {
    console.log(`  ${idx + 1}. "${keyword}" - faltou em ${count} respostas`);
  });
  
  // Categorias com pior desempenho
  const worstCategories = Object.entries(globalStats.categoryStats)
    .sort((a, b) => a[1].successRate - b[1].successRate)
    .slice(0, 5);
  
  console.log('\nCategorias com Menor Taxa de Sucesso:');
  worstCategories.forEach(([category, stats]) => {
    console.log(`  • ${category}: ${stats.successRate.toFixed(1)}% (${stats.passed}/${stats.total})`);
  });
  
  // Salvar relatório completo
  const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
  const reportPath = path.join(__dirname, '..', 'test-reports', `complete-test-${timestamp}.json`);
  
  await fs.mkdir(path.dirname(reportPath), { recursive: true });
  await fs.writeFile(reportPath, JSON.stringify({
    timestamp: new Date().toISOString(),
    summary: {
      total: globalStats.total,
      passed: globalStats.passed,
      failed: globalStats.failed,
      errors: globalStats.errors,
      successRate: globalStats.successRate,
      avgAccuracy: globalStats.avgAccuracy,
      avgTime: globalStats.avgTime,
      totalTime: globalStats.totalTime
    },
    categoryStats: globalStats.categoryStats,
    failurePatterns: sortedPatterns,
    worstCategories: worstCategories.map(([cat, stats]) => ({
      category: cat,
      successRate: stats.successRate,
      passed: stats.passed,
      total: stats.total
    }))
  }, null, 2));
  
  console.log(chalk.gray(`\n📁 Relatório completo salvo em: ${reportPath}`));
  
  // Conclusão
  console.log(chalk.cyan.bold('\n' + '═'.repeat(70)));
  if (globalStats.successRate >= 80) {
    console.log(chalk.green.bold('🎉 SISTEMA COM BOA PERFORMANCE!'));
    console.log('O sistema está funcionando adequadamente para a maioria dos casos.');
  } else if (globalStats.successRate >= 60) {
    console.log(chalk.yellow.bold('⚠️ SISTEMA FUNCIONAL COM MELHORIAS NECESSÁRIAS'));
    console.log('O sistema funciona mas precisa de ajustes para melhorar a precisão.');
  } else {
    console.log(chalk.red.bold('❌ SISTEMA PRECISA DE CORREÇÕES SIGNIFICATIVAS'));
    console.log('A taxa de sucesso está abaixo do aceitável. Revisão urgente necessária.');
  }
  console.log(chalk.cyan.bold('═'.repeat(70)));
}

main().catch(error => {
  console.error(chalk.red('\n❌ ERRO FATAL:'), error);
  process.exit(1);
});