#!/usr/bin/env node

/**
 * TESTE RÁPIDO DAS MELHORIAS - Valida correções implementadas
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

const criticalTests = [
  {
    category: 'Artigos Legais',
    query: 'Qual artigo da LUOS define o Estudo de Impacto de Vizinhança?',
    expected: ['LUOS', 'Art. 89'],
    notExpected: ['Art. 90']
  },
  {
    category: 'Artigos Legais',
    query: 'O que são ZEIS e em qual artigo estão definidas?',
    expected: ['PDUS', 'Art. 92', 'ZEIS'],
    notExpected: ['LUOS']
  },
  {
    category: 'Artigos Legais',
    query: 'Onde está definida a certificação em sustentabilidade?',
    expected: ['LUOS', 'Art. 81'],
    notExpected: []
  },
  {
    category: 'Bairros',
    query: 'Qual a altura máxima no bairro Boa Vista?',
    expected: ['Boa Vista', 'metros'],
    notExpected: ['Boa Vista do Sul']
  },
  {
    category: 'Bairros',
    query: 'Quais os parâmetros urbanísticos do Centro Histórico?',
    expected: ['Centro Histórico', 'altura'],
    notExpected: []
  },
  {
    category: 'Conceitos',
    query: 'O que é outorga onerosa e onde está definida?',
    expected: ['LUOS', 'Art. 86', 'outorga'],
    notExpected: []
  },
  {
    category: 'Coeficientes',
    query: 'Qual artigo define o coeficiente de aproveitamento?',
    expected: ['LUOS', 'Art. 82'],
    notExpected: []
  },
  {
    category: 'Preservação',
    query: 'Onde estão definidas as áreas de preservação permanente?',
    expected: ['PDUS', 'Art. 95'],
    notExpected: ['LUOS']
  }
];

async function testQuery(test) {
  const startTime = Date.now();
  
  try {
    const response = await fetch(`${SUPABASE_URL}/functions/v1/agentic-rag`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${SUPABASE_ANON_KEY}`,
      },
      body: JSON.stringify({
        query: test.query,
        sessionId: 'test-improvements-' + Date.now(),
        bypassCache: true,
        model: 'gpt-3.5-turbo'
      })
    });

    const result = await response.json();
    const executionTime = Date.now() - startTime;
    
    if (!result.response) {
      return {
        ...test,
        passed: false,
        error: 'Sem resposta',
        executionTime
      };
    }
    
    const responseLower = result.response.toLowerCase();
    
    // Verificar palavras esperadas
    const foundExpected = test.expected.filter(word => 
      responseLower.includes(word.toLowerCase())
    );
    
    // Verificar palavras não esperadas
    const foundUnexpected = test.notExpected.filter(word => 
      responseLower.includes(word.toLowerCase())
    );
    
    const passed = foundExpected.length === test.expected.length && 
                   foundUnexpected.length === 0;
    
    return {
      ...test,
      passed,
      foundExpected,
      missingExpected: test.expected.filter(w => !foundExpected.includes(w)),
      foundUnexpected,
      response: result.response.substring(0, 200),
      executionTime
    };
    
  } catch (error) {
    return {
      ...test,
      passed: false,
      error: error.message
    };
  }
}

async function main() {
  console.log(chalk.cyan.bold('\n🧪 TESTE RÁPIDO DAS MELHORIAS IMPLEMENTADAS\n'));
  console.log(chalk.yellow('Verificando se as correções melhoraram o sistema...\n'));
  
  const results = [];
  const categoryStats = {};
  
  for (let i = 0; i < criticalTests.length; i++) {
    const test = criticalTests[i];
    process.stdout.write(chalk.gray(`${i + 1}/${criticalTests.length} [${test.category}] ${test.query.substring(0, 40)}... `));
    
    const result = await testQuery(test);
    results.push(result);
    
    // Atualizar estatísticas por categoria
    if (!categoryStats[test.category]) {
      categoryStats[test.category] = { total: 0, passed: 0 };
    }
    categoryStats[test.category].total++;
    if (result.passed) categoryStats[test.category].passed++;
    
    // Mostrar resultado
    if (result.error) {
      console.log(chalk.red(`❌ Erro: ${result.error}`));
    } else if (result.passed) {
      console.log(chalk.green(`✅ Correto! (${result.executionTime}ms)`));
    } else {
      console.log(chalk.red(`❌ Incorreto (${result.executionTime}ms)`));
      if (result.missingExpected.length > 0) {
        console.log(chalk.yellow(`   Faltou: ${result.missingExpected.join(', ')}`));
      }
      if (result.foundUnexpected.length > 0) {
        console.log(chalk.yellow(`   Não deveria ter: ${result.foundUnexpected.join(', ')}`));
      }
    }
    
    // Pequena pausa
    await new Promise(resolve => setTimeout(resolve, 1000));
  }
  
  // Estatísticas
  const totalPassed = results.filter(r => r.passed).length;
  const successRate = (totalPassed / results.length) * 100;
  
  console.log(chalk.cyan.bold('\n' + '═'.repeat(70)));
  console.log(chalk.cyan.bold('📊 RESUMO POR CATEGORIA'));
  console.log(chalk.cyan.bold('═'.repeat(70) + '\n'));
  
  Object.entries(categoryStats).forEach(([category, stats]) => {
    const catRate = (stats.passed / stats.total) * 100;
    const icon = catRate >= 70 ? '✅' : catRate >= 40 ? '⚠️' : '❌';
    console.log(`${icon} ${category.padEnd(20)} ${stats.passed}/${stats.total} (${catRate.toFixed(0)}%)`);
  });
  
  console.log(chalk.cyan.bold('\n' + '═'.repeat(70)));
  console.log(chalk.cyan.bold('📈 RESULTADO GERAL'));
  console.log(chalk.cyan.bold('═'.repeat(70) + '\n'));
  
  console.log(`Total de testes: ${results.length}`);
  console.log(`${chalk.green('✅ Corretos:')} ${totalPassed}`);
  console.log(`${chalk.red('❌ Incorretos:')} ${results.length - totalPassed}`);
  console.log(`\nTaxa de sucesso: ${chalk.bold(successRate.toFixed(1) + '%')}`);
  
  // Comparação com teste anterior
  const previousRate = 16.7; // Taxa anterior de artigos corretos
  const improvement = successRate - previousRate;
  
  if (improvement > 0) {
    console.log(chalk.green(`\n📈 Melhoria de ${improvement.toFixed(1)}% em relação ao teste anterior!`));
  } else if (improvement < 0) {
    console.log(chalk.red(`\n📉 Piora de ${Math.abs(improvement).toFixed(1)}% em relação ao teste anterior`));
  } else {
    console.log(chalk.yellow(`\n➡️ Mesma taxa do teste anterior`));
  }
  
  // Conclusão
  console.log(chalk.cyan.bold('\n' + '═'.repeat(70)));
  if (successRate >= 80) {
    console.log(chalk.green.bold('🎉 EXCELENTE! Sistema muito melhorado!'));
  } else if (successRate >= 60) {
    console.log(chalk.yellow.bold('⚠️ BOM PROGRESSO! Ainda precisa melhorias.'));
  } else if (successRate > previousRate) {
    console.log(chalk.yellow.bold('📈 MELHOROU! Mas ainda precisa de mais trabalho.'));
  } else {
    console.log(chalk.red.bold('❌ AINDA COM PROBLEMAS! Revisar implementação.'));
  }
  console.log(chalk.cyan.bold('═'.repeat(70)));
}

main().catch(error => {
  console.error(chalk.red('\n❌ ERRO:'), error);
  process.exit(1);
});