#!/usr/bin/env node

/**
 * TESTE CRÍTICO - Verificar retrocesso após integração v3
 */

import fetch from 'node-fetch';
import dotenv from 'dotenv';
import chalk from 'chalk';

dotenv.config({ path: '.env' });

const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL || 'https://ngrqwmvuhvjkeohesbxs.supabase.co';
const ANON_KEY = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

async function testCriticalQueries() {
  console.log(chalk.red.bold('\n🚨 TESTE DE RETROCESSO CRÍTICO\n'));
  
  const criticalQueries = [
    {
      query: "o que diz o artigo 75 da LUOS?",
      expected: "regime volumétrico",
      type: "article"
    },
    {
      query: "altura máxima no bairro PETRÓPOLIS",
      expected: "60m",
      type: "regime"
    },
    {
      query: "o que diz o artigo 1 da LUOS?",
      expected: "Lei de Uso e Ocupação",
      type: "article"
    }
  ];
  
  let failures = 0;
  
  for (const test of criticalQueries) {
    console.log(chalk.blue(`\nTestando: ${test.query}`));
    console.log(chalk.gray('─'.repeat(50)));
    
    try {
      const response = await fetch(`${SUPABASE_URL}/functions/v1/agentic-rag`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${ANON_KEY}`
        },
        body: JSON.stringify({
          query: test.query,
          sessionId: `test-critical-${Date.now()}`,
          bypassCache: true
        })
      });
      
      // Check if response is HTML (error page)
      const contentType = response.headers.get('content-type');
      if (contentType && contentType.includes('text/html')) {
        console.log(chalk.red('❌ ERRO: Retornando HTML ao invés de JSON!'));
        console.log(chalk.red('Function está com erro interno!'));
        failures++;
        continue;
      }
      
      const data = await response.json();
      
      if (data.error) {
        console.log(chalk.red('❌ ERRO:'), data.error);
        failures++;
      } else if (!data.response) {
        console.log(chalk.red('❌ Resposta vazia'));
        failures++;
      } else if (data.response.includes('não encontrei') || data.response.includes('não há informações')) {
        console.log(chalk.red('❌ Resposta genérica'));
        console.log(chalk.gray(data.response.substring(0, 100)));
        failures++;
      } else if (test.expected && !data.response.toLowerCase().includes(test.expected.toLowerCase())) {
        console.log(chalk.yellow('⚠️ Resposta não contém esperado:'), test.expected);
        console.log(chalk.gray(data.response.substring(0, 150)));
        failures++;
      } else {
        console.log(chalk.green('✅ OK'));
        console.log(chalk.gray(data.response.substring(0, 150)));
      }
      
    } catch (error) {
      console.log(chalk.red('❌ ERRO FATAL:'), error.message);
      failures++;
    }
  }
  
  console.log(chalk.blue('\n' + '═'.repeat(50)));
  
  if (failures === 0) {
    console.log(chalk.green.bold('✅ TODOS OS TESTES PASSARAM!'));
  } else if (failures < criticalQueries.length) {
    console.log(chalk.yellow.bold(`⚠️ ${failures}/${criticalQueries.length} TESTES FALHARAM`));
    console.log(chalk.yellow('Sistema parcialmente funcional'));
  } else {
    console.log(chalk.red.bold(`❌ TODOS OS ${failures} TESTES FALHARAM!`));
    console.log(chalk.red.bold('SISTEMA COMPLETAMENTE QUEBRADO!'));
    console.log(chalk.red('\n🚨 AÇÃO URGENTE NECESSÁRIA:'));
    console.log(chalk.red('1. Fazer rollback do agentic-rag'));
    console.log(chalk.red('2. Reverter integração v3'));
    console.log(chalk.red('3. Restaurar versão anterior'));
  }
}

testCriticalQueries().catch(console.error);