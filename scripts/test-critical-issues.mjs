#!/usr/bin/env node

import fetch from 'node-fetch';
import dotenv from 'dotenv';
import path from 'path';
import { fileURLToPath } from 'url';
import chalk from 'chalk';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

dotenv.config({ path: path.join(__dirname, '..', '.env.local') });

const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL;
const SUPABASE_ANON_KEY = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

if (!SUPABASE_URL || !SUPABASE_ANON_KEY) {
  console.error(chalk.red('❌ Erro: Variáveis de ambiente não configuradas'));
  process.exit(1);
}

console.log(chalk.blue('\n🔍 TESTE DE PROBLEMAS CRÍTICOS IDENTIFICADOS\n'));
console.log(chalk.gray('=' .repeat(60)));

// Casos de teste críticos identificados pelo usuário
const criticalTests = [
  {
    id: 1,
    category: 'Citação de Lei',
    question: "Qual artigo da LUOS trata da Certificação em Sustentabilidade Ambiental?",
    expectedContent: ["Art. 81", "III", "LUOS"],
    description: "Deve citar Art. 81 - III da LUOS"
  },
  {
    id: 2,
    category: 'Diferenciação de Bairros',
    question: "Qual a altura máxima no bairro Boa Vista?",
    expectedContent: ["BOA VISTA"],
    unexpectedContent: ["BOA VISTA DO SUL"],
    description: "Deve diferenciar Boa Vista de Boa Vista do Sul"
  },
  {
    id: 3,
    category: 'Diferenciação de Bairros',
    question: "Quais os parâmetros construtivos de Boa Vista do Sul?",
    expectedContent: ["BOA VISTA DO SUL"],
    unexpectedContent: ["BOA VISTA"],
    description: "Deve retornar APENAS Boa Vista do Sul"
  },
  {
    id: 4,
    category: 'Citação de Lei',
    question: "O que são ZEIS segundo o PDUS?",
    expectedContent: ["Art.", "PDUS", "Zonas Especiais de Interesse Social"],
    description: "Deve citar artigo específico do PDUS sobre ZEIS"
  },
  {
    id: 5,
    category: 'Citação de Lei',
    question: "Qual artigo define o Estudo de Impacto de Vizinhança?",
    expectedContent: ["Art. 89", "EIV"],
    description: "Deve citar Art. 89 da LUOS"
  }
];

// Função para testar uma query
async function testQuery(test) {
  const startTime = Date.now();
  
  try {
    console.log(chalk.cyan(`\n📝 Teste ${test.id}: ${test.category}`));
    console.log(chalk.gray(`   Pergunta: "${test.question}"`));
    console.log(chalk.gray(`   Esperado: ${test.description}`));
    
    const response = await fetch(`${SUPABASE_URL}/functions/v1/agentic-rag`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${SUPABASE_ANON_KEY}`,
      },
      body: JSON.stringify({
        query: test.question,
        sessionId: `test-critical-${Date.now()}`,
        bypassCache: true
      })
    });

    if (!response.ok) {
      throw new Error(`HTTP error! status: ${response.status}`);
    }

    const result = await response.json();
    const responseTime = Date.now() - startTime;
    const responseText = result.response || '';
    
    // Verificar conteúdo esperado
    let score = 0;
    let maxScore = 0;
    const checks = [];
    
    // Verificar conteúdo esperado
    if (test.expectedContent) {
      for (const expected of test.expectedContent) {
        maxScore += 20;
        const found = responseText.includes(expected);
        if (found) {
          score += 20;
          checks.push(chalk.green(`   ✓ Contém "${expected}"`));
        } else {
          checks.push(chalk.red(`   ✗ Não contém "${expected}"`));
        }
      }
    }
    
    // Verificar conteúdo inesperado
    if (test.unexpectedContent) {
      for (const unexpected of test.unexpectedContent) {
        maxScore += 20;
        const notFound = !responseText.includes(unexpected);
        if (notFound) {
          score += 20;
          checks.push(chalk.green(`   ✓ Não contém "${unexpected}" (correto)`));
        } else {
          checks.push(chalk.red(`   ✗ Contém "${unexpected}" (incorreto)`));
        }
      }
    }
    
    const percentage = maxScore > 0 ? Math.round((score / maxScore) * 100) : 0;
    const passed = percentage >= 70;
    
    // Resultado
    if (passed) {
      console.log(chalk.green(`   ✅ PASSOU (${percentage}%)`));
    } else {
      console.log(chalk.red(`   ❌ FALHOU (${percentage}%)`));
    }
    
    console.log(chalk.gray(`   Tempo: ${responseTime}ms`));
    
    // Mostrar checks
    checks.forEach(check => console.log(check));
    
    // Mostrar trecho da resposta
    const snippet = responseText.substring(0, 200);
    console.log(chalk.gray(`\n   Resposta (trecho): "${snippet}..."`));
    
    return {
      test,
      passed,
      score: percentage,
      responseTime,
      checks
    };
    
  } catch (error) {
    console.log(chalk.red(`   ❌ ERRO: ${error.message}`));
    return {
      test,
      passed: false,
      score: 0,
      error: error.message
    };
  }
}

// Executar todos os testes
async function runCriticalTests() {
  console.log(chalk.yellow('\n🚀 Iniciando testes críticos...'));
  console.log(chalk.gray(`   ${criticalTests.length} casos selecionados`));
  
  const results = [];
  
  for (const test of criticalTests) {
    const result = await testQuery(test);
    results.push(result);
    
    // Pausa entre testes
    await new Promise(resolve => setTimeout(resolve, 1500));
  }
  
  // Relatório final
  console.log(chalk.blue('\n' + '=' .repeat(60)));
  console.log(chalk.blue('📊 RELATÓRIO FINAL DOS TESTES CRÍTICOS'));
  console.log(chalk.blue('=' .repeat(60)));
  
  const passed = results.filter(r => r.passed).length;
  const failed = results.filter(r => !r.passed).length;
  const avgScore = Math.round(
    results.reduce((acc, r) => acc + (r.score || 0), 0) / results.length
  );
  
  // Estatísticas por categoria
  const categories = {};
  results.forEach(r => {
    const cat = r.test.category;
    if (!categories[cat]) {
      categories[cat] = { total: 0, passed: 0 };
    }
    categories[cat].total++;
    if (r.passed) categories[cat].passed++;
  });
  
  console.log(chalk.white(`\n📈 Estatísticas Gerais:`));
  console.log(chalk.green(`   ✅ Passou: ${passed}/${criticalTests.length}`));
  console.log(chalk.red(`   ❌ Falhou: ${failed}/${criticalTests.length}`));
  console.log(chalk.yellow(`   📊 Score médio: ${avgScore}%`));
  
  console.log(chalk.white(`\n📊 Por Categoria:`));
  Object.entries(categories).forEach(([cat, stats]) => {
    const catRate = Math.round((stats.passed / stats.total) * 100);
    const color = catRate >= 70 ? chalk.green : catRate >= 40 ? chalk.yellow : chalk.red;
    console.log(color(`   ${cat}: ${stats.passed}/${stats.total} (${catRate}%)`));
  });
  
  // Taxa de sucesso geral
  const successRate = Math.round((passed / criticalTests.length) * 100);
  
  console.log(chalk.white(`\n🎯 Taxa de Sucesso Geral: ${successRate}%`));
  
  if (successRate >= 80) {
    console.log(chalk.green('   ✅ Sistema está funcionando adequadamente!'));
  } else if (successRate >= 50) {
    console.log(chalk.yellow('   ⚠️ Sistema precisa de melhorias'));
  } else {
    console.log(chalk.red('   ❌ Sistema com problemas críticos'));
  }
  
  // Problemas identificados
  if (failed > 0) {
    console.log(chalk.red('\n❌ Testes que falharam:'));
    results
      .filter(r => !r.passed)
      .forEach(r => {
        console.log(chalk.red(`   - ${r.test.category}: ${r.test.description} (${r.score}%)`));
      });
  }
  
  // Análise final
  console.log(chalk.cyan('\n💡 Análise dos Problemas:'));
  
  const citationFailures = results.filter(r => 
    r.test.category === 'Citação de Lei' && !r.passed
  ).length;
  
  const differentiationFailures = results.filter(r => 
    r.test.category === 'Diferenciação de Bairros' && !r.passed
  ).length;
  
  if (citationFailures > 0) {
    console.log(chalk.yellow(`   - ${citationFailures} falhas em citação de artigos de lei`));
    console.log(chalk.gray('     → Sistema não está extraindo artigos dos documentos'));
  }
  
  if (differentiationFailures > 0) {
    console.log(chalk.yellow(`   - ${differentiationFailures} falhas em diferenciação de bairros`));
    console.log(chalk.gray('     → SQL está usando ILIKE em vez de matching exato'));
  }
  
  console.log(chalk.cyan('\n🔧 Correções Necessárias:'));
  if (citationFailures > 0) {
    console.log(chalk.cyan('   1. Response-synthesizer deve extrair artigos dos metadados'));
    console.log(chalk.cyan('   2. Enhanced-vector-search deve retornar metadados de fonte'));
  }
  if (differentiationFailures > 0) {
    console.log(chalk.cyan('   3. SQL-generator deve usar WHERE bairro = "NOME" (exato)'));
    console.log(chalk.cyan('   4. Query-analyzer deve validar bairros contra lista real'));
  }
  
  console.log(chalk.gray('\n📁 Teste concluído em ' + new Date().toLocaleTimeString('pt-BR')));
}

// Executar testes
runCriticalTests().catch(error => {
  console.error(chalk.red('❌ Erro fatal:'), error);
  process.exit(1);
});