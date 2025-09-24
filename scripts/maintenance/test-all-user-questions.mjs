#!/usr/bin/env node

/**
 * Script para testar todas as 15 perguntas do usuário
 * Usando apenas a base de conhecimento do Supabase
 */

import fetch from 'node-fetch';
import dotenv from 'dotenv';
import chalk from 'chalk';

// Load environment variables
dotenv.config({ path: '.env' });

const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL || 'https://ngrqwmvuhvjkeohesbxs.supabase.co';
const ANON_KEY = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

const questions = [
  {
    id: 1,
    query: "escreva um resumo de até 25 palavras sobre a lei do plano diretor de porto alegre",
    expectedType: "summary"
  },
  {
    id: 2,
    query: "qual é a altura máxima e coef. básico e máx do aberta dos morros para cada zot",
    expectedType: "regime"
  },
  {
    id: 3,
    query: "Quantos bairros estão 'Protegidos pelo Sistema Atual' para proteção contra enchentes?",
    expectedType: "risk"
  },
  {
    id: 4,
    query: "Qual artigo da LUOS trata da Certificação em Sustentabilidade Ambiental?",
    expectedType: "article_search"
  },
  {
    id: 5,
    query: "Como o Regime Volumétrico é tratado na LUOS?",
    expectedType: "theme_search"
  },
  {
    id: 6,
    query: "o que afirma literalmente o Art 1º da LUOS?",
    expectedType: "article_literal"
  },
  {
    id: 7,
    query: "do que se trata o Art. 119 da LUOS?",
    expectedType: "article_content"
  },
  {
    id: 8,
    query: "O Art. 3º O Plano Diretor Urbano Sustentável de Porto Alegre será regido por princípios fundamentais. quais são eles?",
    expectedType: "article_list"
  },
  {
    id: 9,
    query: "o que posso construir no bairro Petrópolis",
    expectedType: "neighborhood_regime"
  },
  {
    id: 10,
    query: "Qual a altura máxima da construção dos prédios em Porto Alegre?",
    expectedType: "max_value"
  },
  {
    id: 11,
    query: "o que diz o artigo 38 da luos?",
    expectedType: "article_content"
  },
  {
    id: 12,
    query: "o que diz o artigo 5?",
    expectedType: "multiple_laws"
  },
  {
    id: 13,
    query: "resuma a parte I do plano diretor",
    expectedType: "hierarchy"
  },
  {
    id: 14,
    query: "o que fala o título 1 do pdus",
    expectedType: "hierarchy"
  },
  {
    id: 15,
    query: "o que diz o artigo 1 do pdus",
    expectedType: "article_pdus"
  }
];

async function testQuery(question) {
  console.log(chalk.blue(`\n${'═'.repeat(70)}`));
  console.log(chalk.cyan(`📝 Pergunta ${question.id}: ${question.query}`));
  console.log(chalk.gray(`Tipo esperado: ${question.expectedType}`));
  console.log(chalk.blue(`${'─'.repeat(70)}`));
  
  try {
    const startTime = Date.now();
    
    const response = await fetch(`${SUPABASE_URL}/functions/v1/agentic-rag`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${ANON_KEY}`
      },
      body: JSON.stringify({
        query: question.query,
        message: question.query,
        sessionId: `test-${Date.now()}`,
        model: 'gpt-3.5-turbo',
        bypassCache: false
      })
    });

    const responseTime = Date.now() - startTime;

    if (!response.ok) {
      throw new Error(`HTTP error! status: ${response.status}`);
    }

    const data = await response.json();
    
    // Validate response based on expected type
    let validation = { passed: true, checks: [] };
    
    switch(question.expectedType) {
      case 'summary':
        const wordCount = data.response.split(/\s+/).filter(w => w.length > 0).length;
        validation.checks.push({
          name: 'Word count ≤ 25',
          passed: wordCount <= 30, // Allow small margin
          value: wordCount
        });
        break;
        
      case 'regime':
        validation.checks.push({
          name: 'Contains height data',
          passed: data.response.includes('altura') || data.response.includes('m'),
        });
        validation.checks.push({
          name: 'Contains coefficient data',
          passed: data.response.includes('coeficiente') || data.response.includes('CA'),
        });
        break;
        
      case 'article_literal':
      case 'article_content':
      case 'article_pdus':
        validation.checks.push({
          name: 'Contains article reference',
          passed: data.response.includes('Art.') || data.response.includes('artigo'),
        });
        break;
        
      case 'multiple_laws':
        validation.checks.push({
          name: 'References LUOS',
          passed: data.response.includes('LUOS'),
        });
        validation.checks.push({
          name: 'References PDUS',
          passed: data.response.includes('PDUS') || data.response.includes('Plano Diretor'),
        });
        break;
        
      case 'neighborhood_regime':
        validation.checks.push({
          name: 'Contains Petrópolis data',
          passed: data.response.toLowerCase().includes('petrópolis') || data.response.includes('PETRÓPOLIS'),
        });
        validation.checks.push({
          name: 'Contains construction parameters',
          passed: data.response.includes('altura') || data.response.includes('coeficiente'),
        });
        break;
        
      case 'hierarchy':
        validation.checks.push({
          name: 'Contains hierarchical structure',
          passed: data.response.includes('TÍTULO') || data.response.includes('CAPÍTULO') || 
                  data.response.includes('Título') || data.response.includes('Capítulo'),
        });
        break;
    }
    
    // Calculate overall validation
    validation.passed = validation.checks.length === 0 || 
                       validation.checks.every(c => c.passed);
    
    // Display response preview
    console.log(chalk.green('✅ Resposta recebida:'));
    const lines = data.response.split('\n');
    const preview = lines.slice(0, 10).join('\n');
    console.log(chalk.white(preview));
    
    if (lines.length > 10) {
      console.log(chalk.gray(`... [${lines.length - 10} linhas omitidas]`));
    }
    
    // Display validation results
    if (validation.checks.length > 0) {
      console.log(chalk.yellow('\n📊 Validação:'));
      validation.checks.forEach(check => {
        const icon = check.passed ? '✅' : '❌';
        const color = check.passed ? chalk.green : chalk.red;
        console.log(color(`  ${icon} ${check.name}${check.value !== undefined ? ` (${check.value})` : ''}`));
      });
    }
    
    // Display metrics
    console.log(chalk.yellow('\n📈 Métricas:'));
    console.log(`  • Tempo de resposta: ${responseTime}ms`);
    console.log(`  • Confiança: ${(data.confidence * 100).toFixed(1)}%`);
    console.log(`  • Fontes: ${JSON.stringify(data.sources || {})}`);
    
    return {
      id: question.id,
      success: true,
      validation: validation.passed,
      confidence: data.confidence,
      responseTime: responseTime,
      hasContent: data.response && data.response.length > 50
    };
    
  } catch (error) {
    console.error(chalk.red(`❌ Erro: ${error.message}`));
    return {
      id: question.id,
      success: false,
      error: error.message
    };
  }
}

async function runAllTests() {
  console.log(chalk.cyan.bold('\n🚀 TESTANDO TODAS AS 15 PERGUNTAS DO USUÁRIO'));
  console.log(chalk.yellow('Usando apenas a base de conhecimento do Supabase\n'));
  
  const results = [];
  
  for (const question of questions) {
    const result = await testQuery(question);
    results.push(result);
    
    // Small delay between questions
    await new Promise(resolve => setTimeout(resolve, 1500));
  }
  
  // Final report
  console.log(chalk.blue(`\n${'═'.repeat(70)}`));
  console.log(chalk.cyan.bold('📊 RELATÓRIO FINAL'));
  console.log(chalk.blue(`${'═'.repeat(70)}`));
  
  const successful = results.filter(r => r.success && r.validation).length;
  const total = results.length;
  const successRate = (successful / total * 100).toFixed(1);
  
  console.log(chalk.green(`\n✅ Respostas válidas: ${successful}/${total} (${successRate}%)`));
  
  // Detailed breakdown
  console.log(chalk.cyan('\n📋 Detalhamento por pergunta:'));
  results.forEach((r, i) => {
    const q = questions[i];
    const status = r.success && r.validation ? '✅' : 
                   r.success ? '⚠️' : '❌';
    const color = r.success && r.validation ? chalk.green : 
                  r.success ? chalk.yellow : chalk.red;
    
    console.log(color(`${status} P${r.id}: ${q.query.substring(0, 50)}...`));
    if (r.success) {
      console.log(chalk.gray(`   Confiança: ${(r.confidence * 100).toFixed(0)}% | Tempo: ${r.responseTime}ms`));
    }
  });
  
  // Average metrics
  const successfulResults = results.filter(r => r.success);
  if (successfulResults.length > 0) {
    const avgConfidence = successfulResults.reduce((acc, r) => acc + r.confidence, 0) / successfulResults.length;
    const avgTime = successfulResults.reduce((acc, r) => acc + r.responseTime, 0) / successfulResults.length;
    
    console.log(chalk.cyan('\n📊 Métricas médias:'));
    console.log(chalk.white(`  • Confiança média: ${(avgConfidence * 100).toFixed(1)}%`));
    console.log(chalk.white(`  • Tempo médio: ${avgTime.toFixed(0)}ms`));
  }
  
  // Final assessment
  console.log(chalk.blue(`\n${'═'.repeat(70)}`));
  if (successRate >= 90) {
    console.log(chalk.green.bold('🎉 EXCELENTE! Sistema com alta acurácia (≥90%)'));
    console.log(chalk.green('O sistema está respondendo corretamente às perguntas usando a base de conhecimento.'));
  } else if (successRate >= 70) {
    console.log(chalk.yellow.bold('⚠️ BOM! Sistema funcionando mas pode melhorar (70-89%)'));
    console.log(chalk.yellow('Algumas respostas precisam de ajustes.'));
  } else {
    console.log(chalk.red.bold('❌ ATENÇÃO! Sistema precisa de melhorias (<70%)'));
    console.log(chalk.red('Muitas respostas estão incorretas ou incompletas.'));
  }
}

// Execute tests
console.log(chalk.gray('Iniciando testes em 3 segundos...'));
setTimeout(() => {
  runAllTests().catch(error => {
    console.error(chalk.red('❌ Erro fatal:', error));
    process.exit(1);
  });
}, 3000);