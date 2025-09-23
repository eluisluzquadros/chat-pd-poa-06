#!/usr/bin/env node

import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';
import chalk from 'chalk';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Load environment variables
dotenv.config({ path: '.env.local' });

const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL;
const SUPABASE_ANON_KEY = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

if (!SUPABASE_URL || !SUPABASE_ANON_KEY) {
  console.error(chalk.red('❌ Missing environment variables. Check your .env.local file.'));
  process.exit(1);
}

const supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY);

// Comprehensive test suite
const testSuites = {
  legalCitations: [
    {
      query: "Qual artigo da LUOS trata da Certificação em Sustentabilidade Ambiental?",
      expectedPatterns: ["LUOS", "Art. 81", "Inciso III", "Certificação", "Sustentabilidade"],
      category: "legal",
      priority: "high"
    },
    {
      query: "O que diz a lei sobre o 4º distrito?",
      expectedPatterns: ["LUOS", "Art. 74", "4º Distrito", "ZOT 8.2"],
      category: "legal",
      priority: "high"
    },
    {
      query: "Qual artigo trata das ZEIS?",
      expectedPatterns: ["PDUS", "Art. 92", "Zonas Especiais", "Interesse Social"],
      category: "legal",
      priority: "high"
    },
    {
      query: "Onde está definida a outorga onerosa?",
      expectedPatterns: ["LUOS", "Art. 86", "Outorga Onerosa"],
      category: "legal",
      priority: "medium"
    },
    {
      query: "Qual artigo fala sobre o EIV?",
      expectedPatterns: ["LUOS", "Art. 89", "EIV", "Estudo", "Impacto", "Vizinhança"],
      category: "legal",
      priority: "medium"
    }
  ],
  
  bairroDifferentiation: [
    {
      query: "Qual a altura máxima no bairro Boa Vista?",
      expectedBairro: "BOA VISTA",
      notExpected: ["BOA VISTA DO SUL"],
      category: "bairro",
      priority: "high"
    },
    {
      query: "Parâmetros urbanísticos de Vila Nova",
      expectedBairro: "VILA NOVA",
      notExpected: ["VILA NOVA DO SUL"],
      category: "bairro",
      priority: "high"
    },
    {
      query: "O que posso construir no Centro Histórico?",
      expectedBairro: "CENTRO HISTÓRICO",
      notExpected: ["CENTRO"],
      category: "bairro",
      priority: "medium"
    },
    {
      query: "Boa Vista do Sul existe?",
      shouldFail: true,
      expectedError: "não existe",
      category: "bairro",
      priority: "low"
    }
  ],
  
  hybridQueries: [
    {
      query: "Qual a altura máxima permitida no bairro Petrópolis segundo o artigo da LUOS?",
      expectedPatterns: ["PETRÓPOLIS", "altura", "metros", "Art.", "LUOS"],
      category: "hybrid",
      priority: "high"
    },
    {
      query: "Coeficiente de aproveitamento do bairro Três Figueiras e qual artigo define isso?",
      expectedPatterns: ["TRÊS FIGUEIRAS", "coeficiente", "Art.", "LUOS"],
      category: "hybrid",
      priority: "medium"
    }
  ],
  
  dataAccuracy: [
    {
      query: "Qual a altura máxima mais alta permitida em Porto Alegre?",
      expectedPatterns: ["90", "metros"],
      notExpected: ["40m", "150m", "200m"],
      category: "data",
      priority: "high"
    },
    {
      query: "Quantos bairros têm risco de inundação?",
      expectedPatterns: ["57", "bairros", "risco", "inundação"],
      category: "data",
      priority: "medium"
    }
  ]
};

// Function to call the RAG API
async function callRAG(query, model = 'openai/gpt-4o-mini-2024-07-18') {
  try {
    const response = await fetch(`${SUPABASE_URL}/functions/v1/agentic-rag`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${SUPABASE_ANON_KEY}`,
      },
      body: JSON.stringify({
        query,
        model,
        bypassCache: true
      })
    });

    if (!response.ok) {
      const errorText = await response.text();
      throw new Error(`HTTP ${response.status}: ${errorText}`);
    }

    const data = await response.json();
    return data.response || '';
  } catch (error) {
    console.error(chalk.red(`Error calling RAG API: ${error.message}`));
    return null;
  }
}

// Function to validate response
function validateResponse(response, test) {
  const validation = {
    passed: false,
    score: 0,
    matches: {},
    issues: []
  };

  if (!response) {
    validation.issues.push('No response received');
    return validation;
  }

  const responseUpper = response.toUpperCase();
  
  // Check expected patterns
  if (test.expectedPatterns) {
    for (const pattern of test.expectedPatterns) {
      const found = responseUpper.includes(pattern.toUpperCase());
      validation.matches[pattern] = found;
      if (!found) {
        validation.issues.push(`Missing: ${pattern}`);
      }
    }
  }
  
  // Check expected bairro
  if (test.expectedBairro) {
    const found = responseUpper.includes(test.expectedBairro);
    validation.matches[test.expectedBairro] = found;
    if (!found) {
      validation.issues.push(`Bairro not found: ${test.expectedBairro}`);
    }
  }
  
  // Check not expected patterns
  if (test.notExpected) {
    for (const pattern of test.notExpected) {
      const found = responseUpper.includes(pattern.toUpperCase());
      if (found) {
        validation.matches[`NOT_${pattern}`] = false;
        validation.issues.push(`Should not contain: ${pattern}`);
      } else {
        validation.matches[`NOT_${pattern}`] = true;
      }
    }
  }
  
  // Check for expected error
  if (test.shouldFail && test.expectedError) {
    const hasError = response.toLowerCase().includes(test.expectedError);
    validation.matches['error'] = hasError;
    if (!hasError) {
      validation.issues.push(`Should have error: ${test.expectedError}`);
    }
  }
  
  // Calculate score
  const totalChecks = Object.keys(validation.matches).length;
  const passedChecks = Object.values(validation.matches).filter(v => v).length;
  validation.score = totalChecks > 0 ? (passedChecks / totalChecks) : 0;
  validation.passed = validation.score >= 0.8;
  
  return validation;
}

// Main test function
async function runCompleteValidation() {
  console.log(chalk.cyan('\n════════════════════════════════════════════════════════════════'));
  console.log(chalk.cyan.bold('     🧪 VALIDAÇÃO COMPLETA DO SISTEMA RAG - PLANO DIRETOR POA'));
  console.log(chalk.cyan('════════════════════════════════════════════════════════════════\n'));
  
  const results = {
    total: 0,
    passed: 0,
    failed: 0,
    byCategory: {},
    byPriority: {},
    details: []
  };
  
  // Run all test suites
  for (const [suiteName, tests] of Object.entries(testSuites)) {
    console.log(chalk.yellow.bold(`\n📋 ${suiteName.toUpperCase()}`));
    console.log(chalk.gray('─'.repeat(60)));
    
    for (const test of tests) {
      results.total++;
      
      console.log(chalk.blue(`\n🔍 Testing: ${test.query.substring(0, 60)}...`));
      
      const startTime = Date.now();
      const response = await callRAG(test.query);
      const responseTime = Date.now() - startTime;
      
      const validation = validateResponse(response, test);
      validation.responseTime = responseTime;
      
      // Update statistics
      if (!results.byCategory[test.category]) {
        results.byCategory[test.category] = { total: 0, passed: 0 };
      }
      if (!results.byPriority[test.priority]) {
        results.byPriority[test.priority] = { total: 0, passed: 0 };
      }
      
      results.byCategory[test.category].total++;
      results.byPriority[test.priority].total++;
      
      if (validation.passed) {
        results.passed++;
        results.byCategory[test.category].passed++;
        results.byPriority[test.priority].passed++;
        console.log(chalk.green(`   ✅ PASSED (${(validation.score * 100).toFixed(0)}%) - ${responseTime}ms`));
      } else {
        results.failed++;
        console.log(chalk.red(`   ❌ FAILED (${(validation.score * 100).toFixed(0)}%) - ${responseTime}ms`));
        if (validation.issues.length > 0) {
          console.log(chalk.red(`   Issues: ${validation.issues.join(', ')}`));
        }
      }
      
      // Store detailed result
      results.details.push({
        suite: suiteName,
        query: test.query,
        category: test.category,
        priority: test.priority,
        validation,
        response: response ? response.substring(0, 200) + '...' : null
      });
    }
  }
  
  // Print comprehensive summary
  console.log(chalk.cyan('\n════════════════════════════════════════════════════════════════'));
  console.log(chalk.cyan.bold('                     📊 RELATÓRIO FINAL'));
  console.log(chalk.cyan('════════════════════════════════════════════════════════════════\n'));
  
  // Overall statistics
  const overallRate = ((results.passed / results.total) * 100).toFixed(1);
  console.log(chalk.bold('📈 Estatísticas Gerais:'));
  console.log(`   Total de testes: ${results.total}`);
  console.log(`   ✅ Passou: ${results.passed} (${chalk.green(overallRate + '%')})`);
  console.log(`   ❌ Falhou: ${results.failed} (${chalk.red(((results.failed / results.total) * 100).toFixed(1) + '%')})`);
  
  // By category
  console.log(chalk.bold('\n📊 Por Categoria:'));
  for (const [category, stats] of Object.entries(results.byCategory)) {
    const rate = ((stats.passed / stats.total) * 100).toFixed(0);
    const color = rate >= 80 ? chalk.green : rate >= 50 ? chalk.yellow : chalk.red;
    console.log(`   ${category}: ${stats.passed}/${stats.total} (${color(rate + '%')})`);
  }
  
  // By priority
  console.log(chalk.bold('\n🎯 Por Prioridade:'));
  for (const [priority, stats] of Object.entries(results.byPriority)) {
    const rate = ((stats.passed / stats.total) * 100).toFixed(0);
    const color = rate >= 80 ? chalk.green : rate >= 50 ? chalk.yellow : chalk.red;
    console.log(`   ${priority}: ${stats.passed}/${stats.total} (${color(rate + '%')})`);
  }
  
  // Final verdict
  console.log(chalk.bold('\n🏆 Veredito Final:'));
  if (overallRate >= 80) {
    console.log(chalk.green.bold('   ✅ SISTEMA APROVADO - Pronto para produção'));
  } else if (overallRate >= 60) {
    console.log(chalk.yellow.bold('   ⚠️  SISTEMA PARCIALMENTE APROVADO - Requer melhorias'));
  } else {
    console.log(chalk.red.bold('   ❌ SISTEMA REPROVADO - Correções críticas necessárias'));
  }
  
  // Critical issues
  const criticalFailures = results.details
    .filter(d => d.priority === 'high' && !d.validation.passed)
    .map(d => `${d.category}: ${d.query.substring(0, 40)}...`);
    
  if (criticalFailures.length > 0) {
    console.log(chalk.red.bold('\n⚠️  Falhas Críticas (Alta Prioridade):'));
    criticalFailures.forEach(f => console.log(chalk.red(`   • ${f}`)));
  }
  
  // Save detailed report
  const timestamp = new Date().toISOString().replace(/:/g, '-').split('.')[0];
  const reportPath = path.join(__dirname, '..', 'test-reports', `complete-validation-${timestamp}.json`);
  
  try {
    const dir = path.dirname(reportPath);
    if (!fs.existsSync(dir)) {
      fs.mkdirSync(dir, { recursive: true });
    }
    
    fs.writeFileSync(reportPath, JSON.stringify(results, null, 2));
    console.log(chalk.gray(`\n📁 Relatório detalhado salvo em: ${reportPath}`));
  } catch (error) {
    console.error(chalk.red(`Erro ao salvar relatório: ${error.message}`));
  }
  
  // Return exit code based on results
  process.exit(overallRate >= 60 ? 0 : 1);
}

// Run validation
console.log(chalk.cyan('🚀 Iniciando validação completa do sistema...'));
runCompleteValidation().catch(error => {
  console.error(chalk.red('Erro fatal:'), error);
  process.exit(1);
});