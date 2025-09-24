#!/usr/bin/env node

/**
 * TESTE DE PERGUNTAS CRÍTICAS - VALIDAÇÃO DE CONTEÚDO
 * Verifica se o agentic-rag consegue responder corretamente às 15 perguntas essenciais
 * Valida o CONTEÚDO das respostas, não apenas a existência delas
 */

import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';
import chalk from 'chalk';
import fetch from 'node-fetch';

dotenv.config({ path: '.env' });

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || 'https://ngrqwmvuhvjkeohesbxs.supabase.co';
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

// Test cases with content validation
const CRITICAL_QUESTIONS = [
  {
    id: 1,
    question: "escreva um resumo de até 25 palavras sobre a lei do plano diretor de porto alegre",
    validators: [
      { type: 'word_count', max: 30 }, // Allow some flexibility
      { type: 'contains_any', terms: ['PDUS', 'Plano Diretor', 'Porto Alegre', 'sustentável', 'urbano'] },
      { type: 'contains_any', terms: ['2025', 'desenvolvimento', 'sustentabilidade', 'cidade'] }
    ],
    category: 'summary'
  },
  {
    id: 2,
    question: "qual é a altura máxima e coef. básico e máx do aberta dos morros para cada zot",
    validators: [
      { type: 'contains', term: 'ABERTA DOS MORROS' },
      { type: 'contains_any', terms: ['ZOT', 'zona'] },
      { type: 'contains_any', terms: ['altura', 'metros', 'm'] },
      { type: 'contains_any', terms: ['coeficiente', 'aproveitamento', 'básico', 'máximo'] },
      { type: 'contains_number', min: 1 } // Should have numeric values
    ],
    category: 'regime_urbanistico'
  },
  {
    id: 3,
    question: 'Quantos bairros estão "Protegidos pelo Sistema Atual" para proteção contra enchentes?',
    validators: [
      { type: 'contains_any', terms: ['bairros', 'proteção', 'enchentes', 'inundação'] },
      { type: 'contains_number', min: 1 }, // Should mention a specific number
      { type: 'contains_any', terms: ['protegidos', 'sistema', 'atual', 'drenagem'] }
    ],
    category: 'risk_management'
  },
  {
    id: 4,
    question: "Qual artigo da LUOS trata da Certificação em Sustentabilidade Ambiental?",
    validators: [
      { type: 'contains_any', terms: ['Art', 'Artigo'] },
      { type: 'contains_number', min: 1, max: 200 }, // Article number
      { type: 'contains_any', terms: ['certificação', 'sustentabilidade', 'ambiental'] },
      { type: 'contains', term: 'LUOS' }
    ],
    category: 'article_search'
  },
  {
    id: 5,
    question: "Como o Regime Volumétrico é tratado na LUOS?",
    validators: [
      { type: 'contains_any', terms: ['regime volumétrico', 'volumetria', 'volume'] },
      { type: 'contains', term: 'LUOS' },
      { type: 'contains_any', terms: ['altura', 'aproveitamento', 'edificação', 'construção'] },
      { type: 'min_length', value: 100 } // Should be a substantive answer
    ],
    category: 'concept_explanation'
  },
  {
    id: 6,
    question: "o que afirma literalmente o Art 1º da LUOS?",
    validators: [
      { type: 'contains', term: 'Art. 1º' },
      { type: 'contains', term: 'LUOS' },
      { type: 'contains_any', terms: ['Lei de Uso', 'ocupação', 'solo', 'estabelece'] },
      { type: 'min_length', value: 50 } // Should quote the actual article
    ],
    category: 'article_literal'
  },
  {
    id: 7,
    question: "do que se trata o Art. 119 da LUOS?",
    validators: [
      { type: 'contains', term: '119' },
      { type: 'contains', term: 'LUOS' },
      { type: 'contains_any', terms: ['disposições', 'transitórias', 'finais'] },
      { type: 'min_length', value: 50 }
    ],
    category: 'article_content'
  },
  {
    id: 8,
    question: "o Art. 3º O Plano Diretor Urbano Sustentável de Porto Alegre será regido por princípios fundamentais. quais são eles?",
    validators: [
      { type: 'contains', term: 'Art. 3º' },
      { type: 'contains_any', terms: ['PDUS', 'Plano Diretor'] },
      { type: 'contains', term: 'princípios' },
      { type: 'contains_list', min_items: 3 }, // Should list multiple principles
      { type: 'contains_any', terms: ['sustentabilidade', 'participação', 'equidade', 'função social'] }
    ],
    category: 'principles'
  },
  {
    id: 9,
    question: "o que posso construir no bairro Petrópolis",
    validators: [
      { type: 'contains', term: 'PETRÓPOLIS' },
      { type: 'contains_any', terms: ['altura', 'metros', 'm'] },
      { type: 'contains_any', terms: ['coeficiente', 'aproveitamento'] },
      { type: 'contains_any', terms: ['ZOT', 'zona'] },
      { type: 'contains_number', min: 1 } // Should have specific values
    ],
    category: 'regime_urbanistico'
  },
  {
    id: 10,
    question: "qual a altura máxima da construção dos prédios em Porto Alegre?",
    validators: [
      { type: 'contains_any', terms: ['altura máxima', 'metros', 'm'] },
      { type: 'contains_any', terms: ['varia', 'depende', 'zona', 'bairro'] },
      { type: 'contains_number', min: 1 }, // Should mention specific heights
      { type: 'contains_any', terms: ['ZOT', 'regime urbanístico', 'zoneamento'] }
    ],
    category: 'height_limits'
  },
  {
    id: 11,
    question: "o que diz o artigo 38 da luos?",
    validators: [
      { type: 'contains', term: '38' },
      { type: 'contains', term: 'LUOS' },
      { type: 'min_length', value: 50 },
      { type: 'contains_any', terms: ['Art.', 'Artigo'] }
    ],
    category: 'article_content'
  },
  {
    id: 12,
    question: "o que diz o artigo 5?",
    validators: [
      { type: 'contains', term: '5' },
      { type: 'contains_any', terms: ['PDUS', 'LUOS', 'COE'] }, // Should mention multiple laws
      { type: 'contains_multiple_laws', min: 2 }, // Should show at least 2 different laws
      { type: 'contains_any', terms: ['diferentes leis', 'múltiplas leis', 'cada lei', 'ambas'] }
    ],
    category: 'multiple_laws'
  },
  {
    id: 13,
    question: "resuma a parte I do plano diretor",
    validators: [
      { type: 'contains_any', terms: ['Parte I', 'PARTE I', 'primeira parte'] },
      { type: 'contains_any', terms: ['PDUS', 'Plano Diretor'] },
      { type: 'contains_any', terms: ['Título', 'Capítulo'] }, // Should show hierarchy
      { type: 'min_length', value: 200 }, // Should be a comprehensive summary
      { type: 'contains_any', terms: ['princípios', 'objetivos', 'diretrizes'] }
    ],
    category: 'hierarchy_summary'
  },
  {
    id: 14,
    question: "resuma o conteúdo do título 1 do pdus",
    validators: [
      { type: 'contains_any', terms: ['Título I', 'TÍTULO I', 'Título 1'] },
      { type: 'contains', term: 'PDUS' },
      { type: 'contains_any', terms: ['disposições', 'princípios', 'objetivos'] },
      { type: 'min_length', value: 150 },
      { type: 'contains_any', terms: ['Art.', 'artigos'] }
    ],
    category: 'title_summary'
  },
  {
    id: 15,
    question: "o que diz o artigo 1 do pdus",
    validators: [
      { type: 'contains', term: 'Art. 1º' },
      { type: 'contains', term: 'PDUS' },
      { type: 'contains_any', terms: ['Plano Diretor', 'Porto Alegre'] },
      { type: 'min_length', value: 50 },
      { type: 'contains_any', terms: ['institui', 'estabelece', 'define'] }
    ],
    category: 'article_content'
  }
];

/**
 * Validate response content
 */
function validateResponse(response, validators) {
  const results = [];
  let allPassed = true;
  
  for (const validator of validators) {
    let passed = false;
    let details = '';
    
    switch (validator.type) {
      case 'contains':
        passed = response.toLowerCase().includes(validator.term.toLowerCase());
        details = `Contains "${validator.term}": ${passed ? '✓' : '✗'}`;
        break;
        
      case 'contains_any':
        passed = validator.terms.some(term => 
          response.toLowerCase().includes(term.toLowerCase())
        );
        const foundTerms = validator.terms.filter(term => 
          response.toLowerCase().includes(term.toLowerCase())
        );
        details = `Contains any of [${validator.terms.slice(0, 3).join(', ')}...]: ${passed ? `✓ (found: ${foundTerms.join(', ')})` : '✗'}`;
        break;
        
      case 'contains_number':
        const numbers = response.match(/\d+/g);
        if (numbers) {
          const nums = numbers.map(n => parseInt(n)).filter(n => !isNaN(n));
          passed = nums.some(n => n >= (validator.min || 0) && n <= (validator.max || Infinity));
        }
        details = `Contains number ${validator.min ? `>= ${validator.min}` : ''}: ${passed ? '✓' : '✗'}`;
        break;
        
      case 'min_length':
        passed = response.length >= validator.value;
        details = `Min length ${validator.value}: ${response.length} chars ${passed ? '✓' : '✗'}`;
        break;
        
      case 'word_count':
        const words = response.split(/\s+/).filter(w => w.length > 0);
        passed = words.length <= validator.max;
        details = `Word count <= ${validator.max}: ${words.length} words ${passed ? '✓' : '✗'}`;
        break;
        
      case 'contains_list':
        // Check if response contains a list (bullets, numbers, or multiple items)
        const listPatterns = [/\n[-•*]/g, /\n\d+\./g, /[IVX]+\./g];
        const listMatches = listPatterns.some(pattern => pattern.test(response));
        const itemCount = response.split(/\n[-•*\d]+\.?/).length - 1;
        passed = listMatches && itemCount >= validator.min_items;
        details = `Contains list with >= ${validator.min_items} items: ${passed ? `✓ (${itemCount} items)` : '✗'}`;
        break;
        
      case 'contains_multiple_laws':
        const laws = ['PDUS', 'LUOS', 'COE'];
        const foundLaws = laws.filter(law => response.includes(law));
        passed = foundLaws.length >= validator.min;
        details = `Multiple laws (>= ${validator.min}): ${passed ? `✓ (${foundLaws.join(', ')})` : '✗'}`;
        break;
    }
    
    results.push({ passed, details });
    if (!passed) allPassed = false;
  }
  
  return { allPassed, results };
}

/**
 * Call the agentic-rag Edge Function
 */
async function callAgenticRAG(query) {
  try {
    const response = await fetch(`${supabaseUrl}/functions/v1/agentic-rag`, {
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
    });
    
    if (!response.ok) {
      throw new Error(`HTTP error! status: ${response.status}`);
    }
    
    const data = await response.json();
    return data;
  } catch (error) {
    console.error('Error calling agentic-rag:', error);
    return { response: '', error: error.message };
  }
}

/**
 * Run all critical tests
 */
async function runCriticalTests() {
  console.log(chalk.bold.cyan('\n🎯 TESTE DE PERGUNTAS CRÍTICAS - VALIDAÇÃO DE CONTEÚDO\n'));
  console.log(chalk.gray('=' .repeat(70)));
  console.log(chalk.yellow('📋 Total de perguntas: ' + CRITICAL_QUESTIONS.length));
  console.log(chalk.yellow('🎯 Meta: 100% das respostas com conteúdo correto\n'));
  
  const results = [];
  let totalPassed = 0;
  let totalFailed = 0;
  
  // Test each question
  for (let i = 0; i < CRITICAL_QUESTIONS.length; i++) {
    const test = CRITICAL_QUESTIONS[i];
    console.log(chalk.bold.blue(`\n${i + 1}. [${test.category}] ${test.question.substring(0, 60)}...`));
    
    // Call the Edge Function
    const startTime = Date.now();
    const result = await callAgenticRAG(test.question);
    const executionTime = Date.now() - startTime;
    
    if (result.error) {
      console.log(chalk.red(`   ❌ ERROR: ${result.error}`));
      results.push({
        ...test,
        passed: false,
        error: result.error,
        executionTime
      });
      totalFailed++;
      continue;
    }
    
    if (!result.response || result.response.length < 10) {
      console.log(chalk.red(`   ❌ EMPTY RESPONSE`));
      results.push({
        ...test,
        passed: false,
        error: 'Empty or too short response',
        executionTime
      });
      totalFailed++;
      continue;
    }
    
    // Validate content
    const validation = validateResponse(result.response, test.validators);
    
    if (validation.allPassed) {
      console.log(chalk.green(`   ✅ PASSED (${executionTime}ms)`));
      totalPassed++;
    } else {
      console.log(chalk.red(`   ❌ FAILED - Content validation failed`));
      totalFailed++;
    }
    
    // Show validation details
    validation.results.forEach(r => {
      const icon = r.passed ? chalk.green('     ✓') : chalk.red('     ✗');
      console.log(`${icon} ${r.details}`);
    });
    
    // Show response preview
    const preview = result.response.substring(0, 150).replace(/\n/g, ' ');
    console.log(chalk.gray(`   📝 Response preview: "${preview}..."`));
    
    results.push({
      ...test,
      passed: validation.allPassed,
      validation,
      response: result.response,
      executionTime
    });
  }
  
  // Generate summary report
  console.log(chalk.bold.cyan('\n' + '=' .repeat(70)));
  console.log(chalk.bold.cyan('📊 RELATÓRIO FINAL'));
  console.log(chalk.bold.cyan('=' .repeat(70)));
  
  const successRate = (totalPassed / CRITICAL_QUESTIONS.length) * 100;
  const avgTime = results.reduce((sum, r) => sum + (r.executionTime || 0), 0) / results.length;
  
  console.log(chalk.bold.white('\n📈 MÉTRICAS GERAIS:'));
  console.log(`   Total de testes: ${CRITICAL_QUESTIONS.length}`);
  console.log(`   Passou: ${chalk.green(totalPassed)}`);
  console.log(`   Falhou: ${chalk.red(totalFailed)}`);
  console.log(`   Taxa de sucesso: ${successRate >= 80 ? chalk.green : chalk.red}(${successRate.toFixed(1)}%)`);
  console.log(`   Tempo médio: ${avgTime.toFixed(0)}ms`);
  
  // Category breakdown
  console.log(chalk.bold.white('\n📊 POR CATEGORIA:'));
  const categories = {};
  results.forEach(r => {
    if (!categories[r.category]) {
      categories[r.category] = { passed: 0, failed: 0 };
    }
    if (r.passed) {
      categories[r.category].passed++;
    } else {
      categories[r.category].failed++;
    }
  });
  
  for (const [cat, stats] of Object.entries(categories)) {
    const catRate = (stats.passed / (stats.passed + stats.failed)) * 100;
    const color = catRate === 100 ? chalk.green : catRate >= 50 ? chalk.yellow : chalk.red;
    console.log(`   ${cat}: ${color(`${catRate.toFixed(0)}%`)} (${stats.passed}/${stats.passed + stats.failed})`);
  }
  
  // Failed tests details
  if (totalFailed > 0) {
    console.log(chalk.bold.red('\n❌ TESTES QUE FALHARAM:'));
    results.filter(r => !r.passed).forEach(r => {
      console.log(chalk.red(`   ${r.id}. ${r.question.substring(0, 50)}...`));
      if (r.validation) {
        r.validation.results.filter(v => !v.passed).forEach(v => {
          console.log(chalk.red(`      - ${v.details}`));
        });
      }
    });
  }
  
  // Success examples
  if (totalPassed > 0) {
    console.log(chalk.bold.green('\n✅ EXEMPLOS DE SUCESSO:'));
    results.filter(r => r.passed).slice(0, 3).forEach(r => {
      console.log(chalk.green(`   ${r.id}. ${r.question.substring(0, 50)}...`));
      const preview = r.response.substring(0, 100).replace(/\n/g, ' ');
      console.log(chalk.gray(`      "${preview}..."`));
    });
  }
  
  // Final verdict
  console.log(chalk.bold.cyan('\n' + '=' .repeat(70)));
  console.log(chalk.bold.cyan('🎯 VEREDITO FINAL'));
  console.log(chalk.bold.cyan('=' .repeat(70)));
  
  if (successRate === 100) {
    console.log(chalk.bold.green('\n🏆 PERFEITO! Todas as perguntas críticas foram respondidas corretamente!'));
  } else if (successRate >= 80) {
    console.log(chalk.bold.yellow(`\n✅ BOM! ${successRate.toFixed(1)}% de sucesso nas perguntas críticas.`));
  } else if (successRate >= 60) {
    console.log(chalk.bold.yellow(`\n⚠️ ACEITÁVEL. ${successRate.toFixed(1)}% de sucesso, mas precisa melhorar.`));
  } else {
    console.log(chalk.bold.red(`\n❌ INSUFICIENTE! Apenas ${successRate.toFixed(1)}% de sucesso.`));
  }
  
  // Save detailed report
  const reportPath = './test-results-critical-questions.json';
  const fs = await import('fs/promises');
  await fs.writeFile(reportPath, JSON.stringify({
    timestamp: new Date().toISOString(),
    totalTests: CRITICAL_QUESTIONS.length,
    passed: totalPassed,
    failed: totalFailed,
    successRate,
    avgExecutionTime: avgTime,
    categories,
    results: results.map(r => ({
      ...r,
      response: r.response ? r.response.substring(0, 500) : null // Truncate for report
    }))
  }, null, 2));
  
  console.log(chalk.gray(`\n📁 Relatório detalhado salvo em: ${reportPath}`));
  
  return {
    success: successRate >= 80,
    rate: successRate,
    passed: totalPassed,
    failed: totalFailed
  };
}

// Execute the tests
runCriticalTests().catch(error => {
  console.error(chalk.red('❌ Erro fatal:', error));
  process.exit(1);
});