#!/usr/bin/env node

/**
 * Script para validar o sistema através das APIs administrativas
 * Executa testes de QA e benchmark programaticamente
 */

import { createClient } from '@supabase/supabase-js';
import fetch from 'node-fetch';
import chalk from 'chalk';
import { config } from 'dotenv';
import { fileURLToPath } from 'url';
import path from 'path';
import fs from 'fs';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

config({ path: path.join(__dirname, '..', '.env.local') });

const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL;
const SUPABASE_ANON_KEY = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
const SUPABASE_SERVICE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY;

const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_KEY || SUPABASE_ANON_KEY);

// Casos de teste para validação
const VALIDATION_QUERIES = [
  // Citações Legais
  { query: 'Qual artigo da LUOS trata da Certificação em Sustentabilidade?', category: 'legal', expectedArticle: '81' },
  { query: 'O que são ZEIS segundo o PDUS?', category: 'legal', expectedArticle: '92' },
  { query: 'Qual artigo define o EIV?', category: 'legal', expectedArticle: '89' },
  { query: 'O que a LUOS diz sobre o 4º Distrito?', category: 'legal', expectedArticle: '74' },
  
  // Regime Urbanístico
  { query: 'Qual a altura máxima em Boa Vista?', category: 'regime', expectedKeywords: ['altura', 'metros'] },
  { query: 'Qual o coeficiente de aproveitamento do Centro Histórico?', category: 'regime', expectedKeywords: ['coeficiente'] },
  
  // Conceitos
  { query: 'O que é o PDUS?', category: 'conceitual', expectedKeywords: ['plano', 'diretor'] },
  { query: 'O que é gentrificação?', category: 'conceitual', expectedKeywords: ['valorização'] },
  
  // Bairros
  { query: 'Quais bairros têm altura máxima acima de 50m?', category: 'bairros', expectedKeywords: ['bairros'] },
  { query: 'Vila Nova do Sul existe?', category: 'bairros', expectedKeywords: ['não existe'] }
];

/**
 * Executa teste de qualidade (QA)
 */
async function runQualityTest() {
  console.log(chalk.cyan('\n📊 EXECUTANDO TESTE DE QUALIDADE (QA)\n'));
  
  // Buscar todos os casos de teste do banco
  const { data: testCases, error } = await supabase
    .from('qa_test_cases')
    .select('*')
    .order('category', { ascending: true });
  
  if (error) {
    console.error(chalk.red('❌ Erro ao buscar casos de teste:'), error);
    return null;
  }
  
  console.log(`📋 ${testCases.length} casos de teste carregados`);
  
  const results = {
    total: 0,
    passed: 0,
    failed: 0,
    byCategory: {},
    errors: []
  };
  
  // Processar em lotes para evitar sobrecarga
  const batchSize = 5;
  const batches = [];
  
  for (let i = 0; i < testCases.length; i += batchSize) {
    batches.push(testCases.slice(i, i + batchSize));
  }
  
  console.log(`📦 Processando em ${batches.length} lotes de ${batchSize} testes\n`);
  
  for (let batchIndex = 0; batchIndex < batches.length; batchIndex++) {
    const batch = batches[batchIndex];
    console.log(`Lote ${batchIndex + 1}/${batches.length}:`);
    
    const batchPromises = batch.map(async (testCase) => {
      try {
        const response = await fetch(`${SUPABASE_URL}/functions/v1/agentic-rag`, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${SUPABASE_ANON_KEY}`,
          },
          body: JSON.stringify({
            query: testCase.question,
            sessionId: 'qa-test',
            bypassCache: false
          })
        });
        
        if (response.ok) {
          const result = await response.json();
          return {
            ...testCase,
            success: result.response && result.response.length > 10,
            response: result.response
          };
        } else {
          return {
            ...testCase,
            success: false,
            error: `HTTP ${response.status}`
          };
        }
      } catch (error) {
        return {
          ...testCase,
          success: false,
          error: error.message
        };
      }
    });
    
    const batchResults = await Promise.all(batchPromises);
    
    // Processar resultados do lote
    batchResults.forEach(result => {
      results.total++;
      
      const category = result.category || 'geral';
      if (!results.byCategory[category]) {
        results.byCategory[category] = { total: 0, passed: 0, failed: 0 };
      }
      
      results.byCategory[category].total++;
      
      if (result.success) {
        results.passed++;
        results.byCategory[category].passed++;
        process.stdout.write(chalk.green('.'));
      } else {
        results.failed++;
        results.byCategory[category].failed++;
        results.errors.push({
          question: result.question,
          error: result.error
        });
        process.stdout.write(chalk.red('x'));
      }
    });
    
    console.log(); // Nova linha após cada lote
    
    // Pausa entre lotes
    if (batchIndex < batches.length - 1) {
      await new Promise(resolve => setTimeout(resolve, 1000));
    }
  }
  
  return results;
}

/**
 * Executa teste de benchmark entre modelos
 */
async function runBenchmarkTest() {
  console.log(chalk.cyan('\n⚡ EXECUTANDO TESTE DE BENCHMARK\n'));
  
  const models = [
    'anthropic/claude-3-5-sonnet-20241022',
    'openai/gpt-4o-2024-11-20',
    'google/gemini-1.5-pro-002'
  ];
  
  const benchmarkResults = {};
  
  for (const model of models) {
    console.log(`\n📝 Testando modelo: ${model}`);
    benchmarkResults[model] = {
      total: 0,
      passed: 0,
      failed: 0,
      totalTime: 0,
      responses: []
    };
    
    for (const testCase of VALIDATION_QUERIES.slice(0, 5)) { // Usar apenas 5 queries para benchmark
      const startTime = Date.now();
      
      try {
        const response = await fetch(`${SUPABASE_URL}/functions/v1/agentic-rag`, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${SUPABASE_ANON_KEY}`,
          },
          body: JSON.stringify({
            query: testCase.query,
            model: model,
            sessionId: 'benchmark-test',
            bypassCache: true
          })
        });
        
        const elapsedTime = Date.now() - startTime;
        benchmarkResults[model].totalTime += elapsedTime;
        benchmarkResults[model].total++;
        
        if (response.ok) {
          const result = await response.json();
          
          // Validar resposta
          let isValid = false;
          if (testCase.expectedArticle) {
            isValid = result.response.includes(`Art. ${testCase.expectedArticle}`);
          } else if (testCase.expectedKeywords) {
            isValid = testCase.expectedKeywords.some(keyword => 
              result.response.toLowerCase().includes(keyword.toLowerCase())
            );
          }
          
          if (isValid) {
            benchmarkResults[model].passed++;
            process.stdout.write(chalk.green('.'));
          } else {
            benchmarkResults[model].failed++;
            process.stdout.write(chalk.yellow('?'));
          }
          
          benchmarkResults[model].responses.push({
            query: testCase.query,
            time: elapsedTime,
            valid: isValid
          });
        } else {
          benchmarkResults[model].failed++;
          process.stdout.write(chalk.red('x'));
        }
      } catch (error) {
        benchmarkResults[model].failed++;
        process.stdout.write(chalk.red('!'));
      }
      
      // Pequena pausa entre queries
      await new Promise(resolve => setTimeout(resolve, 500));
    }
  }
  
  return benchmarkResults;
}

/**
 * Gera relatório de validação
 */
function generateReport(qaResults, benchmarkResults) {
  console.log(chalk.cyan('\n' + '=' .repeat(60)));
  console.log(chalk.cyan.bold('📊 RELATÓRIO DE VALIDAÇÃO DO SISTEMA'));
  console.log(chalk.cyan('=' .repeat(60)));
  
  // QA Results
  if (qaResults) {
    const successRate = ((qaResults.passed / qaResults.total) * 100).toFixed(1);
    
    console.log(chalk.bold('\n📋 Teste de Qualidade (QA):'));
    console.log(`   Taxa de Sucesso: ${successRate}%`);
    console.log(`   ✅ Passou: ${qaResults.passed}/${qaResults.total}`);
    console.log(`   ❌ Falhou: ${qaResults.failed}/${qaResults.total}`);
    
    console.log('\n   Por Categoria:');
    Object.entries(qaResults.byCategory).forEach(([category, stats]) => {
      const catRate = ((stats.passed / stats.total) * 100).toFixed(1);
      const emoji = catRate >= 80 ? '✅' : catRate >= 60 ? '⚠️' : '❌';
      console.log(`   ${emoji} ${category.padEnd(25)} ${catRate}% (${stats.passed}/${stats.total})`);
    });
    
    if (qaResults.errors.length > 0) {
      console.log(chalk.red(`\n   Erros encontrados: ${qaResults.errors.length}`));
    }
  }
  
  // Benchmark Results
  if (benchmarkResults) {
    console.log(chalk.bold('\n⚡ Teste de Benchmark:'));
    
    const modelStats = Object.entries(benchmarkResults).map(([model, stats]) => {
      const successRate = ((stats.passed / stats.total) * 100).toFixed(1);
      const avgTime = Math.round(stats.totalTime / stats.total);
      
      return {
        model: model.split('/')[1], // Simplificar nome
        successRate,
        avgTime
      };
    }).sort((a, b) => parseFloat(b.successRate) - parseFloat(a.successRate));
    
    console.log('\n   Ranking de Modelos:');
    modelStats.forEach((stat, index) => {
      const medal = index === 0 ? '🥇' : index === 1 ? '🥈' : '🥉';
      console.log(`   ${medal} ${stat.model.padEnd(25)} ${stat.successRate}% - ${stat.avgTime}ms avg`);
    });
  }
  
  // Validação Final
  console.log(chalk.cyan('\n' + '=' .repeat(60)));
  
  const qaSuccess = qaResults ? (qaResults.passed / qaResults.total) * 100 : 0;
  
  if (qaSuccess >= 95) {
    console.log(chalk.green.bold('✅ SISTEMA VALIDADO - Taxa de sucesso >= 95%'));
  } else if (qaSuccess >= 80) {
    console.log(chalk.yellow.bold('⚠️ SISTEMA PARCIALMENTE VALIDADO - Taxa entre 80-95%'));
  } else {
    console.log(chalk.red.bold('❌ SISTEMA NÃO VALIDADO - Taxa < 80%'));
  }
  
  return {
    qa: qaResults,
    benchmark: benchmarkResults,
    validationStatus: qaSuccess >= 95 ? 'APPROVED' : qaSuccess >= 80 ? 'PARTIAL' : 'FAILED'
  };
}

/**
 * Salva resultados em arquivo
 */
function saveResults(report) {
  const timestamp = new Date().toISOString().replace(/:/g, '-').split('.')[0];
  const reportPath = path.join(__dirname, '..', 'test-reports', `admin-validation-${timestamp}.json`);
  
  try {
    const reportDir = path.dirname(reportPath);
    if (!fs.existsSync(reportDir)) {
      fs.mkdirSync(reportDir, { recursive: true });
    }
    
    fs.writeFileSync(reportPath, JSON.stringify(report, null, 2));
    console.log(chalk.gray(`\n📁 Relatório salvo em: ${reportPath}`));
    
    // Também salvar um resumo em markdown
    const mdPath = path.join(__dirname, '..', 'test-reports', `admin-validation-${timestamp}.md`);
    const mdContent = `# Relatório de Validação do Sistema
**Data:** ${new Date().toISOString()}
**Status:** ${report.validationStatus}

## Teste de Qualidade (QA)
- Taxa de Sucesso: ${((report.qa.passed / report.qa.total) * 100).toFixed(1)}%
- Total de Testes: ${report.qa.total}
- Passou: ${report.qa.passed}
- Falhou: ${report.qa.failed}

## Benchmark de Modelos
${Object.entries(report.benchmark).map(([model, stats]) => 
  `- ${model}: ${((stats.passed / stats.total) * 100).toFixed(1)}% sucesso`
).join('\n')}
`;
    
    fs.writeFileSync(mdPath, mdContent);
    console.log(chalk.gray(`📄 Resumo markdown salvo em: ${mdPath}`));
    
  } catch (error) {
    console.error(chalk.red(`Erro ao salvar relatório: ${error.message}`));
  }
}

/**
 * Função principal
 */
async function runValidation() {
  console.log(chalk.cyan.bold('🚀 VALIDAÇÃO COMPLETA DO SISTEMA RAG\n'));
  console.log(chalk.gray('Este processo pode levar vários minutos...\n'));
  
  try {
    // Executar teste de QA
    const qaResults = await runQualityTest();
    
    // Executar teste de Benchmark
    const benchmarkResults = await runBenchmarkTest();
    
    // Gerar relatório
    const report = generateReport(qaResults, benchmarkResults);
    
    // Salvar resultados
    saveResults(report);
    
    console.log(chalk.cyan('\n✅ Validação completa finalizada!'));
    
  } catch (error) {
    console.error(chalk.red('\n💥 Erro durante validação:'), error);
    process.exit(1);
  }
}

// Executar validação
runValidation();