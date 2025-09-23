#!/usr/bin/env node

/**
 * TESTE DE CITAÇÃO DE ARTIGOS - Verifica se artigos estão sendo citados corretamente
 */

import fetch from 'node-fetch';
import chalk from 'chalk';
import { config } from 'dotenv';
import { fileURLToPath } from 'url';
import path from 'path';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

config({ path: path.join(__dirname, '..', '.env.local') });

const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL;
const SUPABASE_ANON_KEY = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

const testCases = [
  {
    query: "Qual artigo da LUOS define o Estudo de Impacto de Vizinhança?",
    expectedArticle: "LUOS - Art. 89",
    wrongArticle: "Art. 90"
  },
  {
    query: "O que são ZEIS segundo o PDUS?",
    expectedArticle: "PDUS - Art. 92",
    wrongArticle: "sem citar artigo"
  },
  {
    query: "Qual artigo trata da Certificação em Sustentabilidade Ambiental?",
    expectedArticle: "LUOS - Art. 81",
    wrongArticle: "Art. 82"
  },
  {
    query: "Onde está definida a outorga onerosa?",
    expectedArticle: "LUOS - Art. 86",
    wrongArticle: "sem artigo"
  },
  {
    query: "Qual artigo define o coeficiente de aproveitamento?",
    expectedArticle: "LUOS - Art. 82",
    wrongArticle: "sem especificar"
  },
  {
    query: "Onde estão definidas as áreas de preservação permanente?",
    expectedArticle: "PDUS - Art. 95",
    wrongArticle: "LUOS"
  }
];

async function testArticleCitation(testCase) {
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
        sessionId: 'test-articles-' + Date.now(),
        bypassCache: true,
        model: 'gpt-3.5-turbo'
      })
    });

    const result = await response.json();
    const executionTime = Date.now() - startTime;
    
    // Verificar se contém o artigo correto
    const hasCorrectArticle = result.response && result.response.includes(testCase.expectedArticle);
    const hasWrongPattern = testCase.wrongArticle && result.response && result.response.includes(testCase.wrongArticle);
    
    return {
      query: testCase.query,
      expectedArticle: testCase.expectedArticle,
      hasCorrectArticle,
      hasWrongPattern,
      passed: hasCorrectArticle && !hasWrongPattern,
      response: result.response,
      executionTime
    };
    
  } catch (error) {
    return {
      query: testCase.query,
      expectedArticle: testCase.expectedArticle,
      passed: false,
      error: error.message
    };
  }
}

async function main() {
  console.log(chalk.cyan.bold('\n📚 TESTE DE CITAÇÃO DE ARTIGOS LEGAIS\n'));
  console.log(chalk.yellow('Verificando se o sistema está citando os artigos corretamente...\n'));
  
  const results = [];
  
  for (let i = 0; i < testCases.length; i++) {
    const testCase = testCases[i];
    console.log(chalk.gray(`${i + 1}/${testCases.length} - Testando: ${testCase.query.substring(0, 50)}...`));
    
    const result = await testArticleCitation(testCase);
    results.push(result);
    
    if (result.error) {
      console.log(chalk.red(`  ❌ Erro: ${result.error}`));
    } else if (result.passed) {
      console.log(chalk.green(`  ✅ Correto! Citou: ${result.expectedArticle}`));
    } else {
      console.log(chalk.red(`  ❌ Incorreto!`));
      if (!result.hasCorrectArticle) {
        console.log(chalk.yellow(`     Esperado: ${result.expectedArticle}`));
      }
      if (result.hasWrongPattern) {
        console.log(chalk.yellow(`     Encontrou padrão errado: ${testCase.wrongArticle}`));
      }
    }
    
    // Pequena pausa
    await new Promise(resolve => setTimeout(resolve, 1000));
  }
  
  // Resumo
  const passed = results.filter(r => r.passed).length;
  const failed = results.length - passed;
  const successRate = (passed / results.length) * 100;
  
  console.log(chalk.cyan.bold('\n' + '═'.repeat(60)));
  console.log(chalk.cyan.bold('📊 RESUMO DOS TESTES'));
  console.log(chalk.cyan.bold('═'.repeat(60) + '\n'));
  
  console.log(`Total de testes: ${results.length}`);
  console.log(`${chalk.green('✅ Corretos:')} ${passed}`);
  console.log(`${chalk.red('❌ Incorretos:')} ${failed}`);
  console.log(`Taxa de acerto: ${successRate.toFixed(1)}%`);
  
  // Detalhes dos erros
  if (failed > 0) {
    console.log(chalk.yellow.bold('\n⚠️ ARTIGOS CITADOS INCORRETAMENTE:\n'));
    results.filter(r => !r.passed).forEach(r => {
      console.log(`❌ "${r.query}"`);
      console.log(`   Esperado: ${r.expectedArticle}`);
      if (r.response) {
        const excerpt = r.response.substring(0, 150).replace(/\n/g, ' ');
        console.log(`   Resposta: ${excerpt}...`);
      }
      console.log();
    });
  }
  
  // Conclusão
  console.log(chalk.cyan.bold('═'.repeat(60)));
  if (successRate === 100) {
    console.log(chalk.green.bold('🎉 PERFEITO! Todos os artigos citados corretamente!'));
  } else if (successRate >= 70) {
    console.log(chalk.yellow.bold('⚠️ BOM PROGRESSO! Maioria dos artigos corretos.'));
  } else {
    console.log(chalk.red.bold('❌ PRECISA MELHORAR! Muitos artigos incorretos.'));
  }
  console.log(chalk.cyan.bold('═'.repeat(60)));
}

main().catch(error => {
  console.error(chalk.red('\n❌ ERRO:'), error);
  process.exit(1);
});