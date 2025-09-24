#!/usr/bin/env node

/**
 * Teste rápido das interfaces do sistema
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

// Teste rápido com apenas 3 casos críticos
const CRITICAL_TESTS = [
  {
    query: 'Qual artigo da LUOS trata da Certificação em Sustentabilidade?',
    expected: ['LUOS', 'Art. 81'],
    name: 'Citação Legal'
  },
  {
    query: 'Qual a altura máxima em Boa Vista?',
    expected: ['altura', 'Boa Vista'],
    name: 'Regime Urbanístico'
  },
  {
    query: 'O que é o PDUS?',
    expected: ['Plano Diretor'],
    name: 'Conceito'
  }
];

async function quickTest() {
  console.log(chalk.cyan.bold('🚀 TESTE RÁPIDO DAS INTERFACES\n'));
  
  const results = {
    chat: { passed: 0, total: 0 },
    summary: []
  };
  
  console.log(chalk.cyan('📱 Testando /chat (API):\n'));
  
  for (const test of CRITICAL_TESTS) {
    const startTime = Date.now();
    console.log(`   ${test.name}...`);
    
    try {
      const controller = new AbortController();
      const timeout = setTimeout(() => controller.abort(), 15000);
      
      const response = await fetch(`${SUPABASE_URL}/functions/v1/agentic-rag`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${SUPABASE_ANON_KEY}`,
        },
        body: JSON.stringify({
          query: test.query,
          sessionId: 'quick-test',
          bypassCache: false
        }),
        signal: controller.signal
      });
      
      clearTimeout(timeout);
      const time = Date.now() - startTime;
      results.chat.total++;
      
      if (response.ok) {
        const result = await response.json();
        const hasExpected = test.expected.every(keyword => 
          result.response && result.response.toLowerCase().includes(keyword.toLowerCase())
        );
        
        if (hasExpected) {
          results.chat.passed++;
          console.log(chalk.green(`   ✅ ${test.name} - OK (${time}ms)`));
          results.summary.push({ test: test.name, status: 'passed', time });
        } else {
          console.log(chalk.red(`   ❌ ${test.name} - Resposta incompleta`));
          results.summary.push({ test: test.name, status: 'failed', time });
        }
      } else {
        console.log(chalk.red(`   ❌ ${test.name} - Erro ${response.status}`));
        results.summary.push({ test: test.name, status: 'error', time });
      }
      
    } catch (error) {
      if (error.name === 'AbortError') {
        console.log(chalk.yellow(`   ⚠️ ${test.name} - Timeout`));
      } else {
        console.log(chalk.red(`   ❌ ${test.name} - ${error.message}`));
      }
      results.summary.push({ test: test.name, status: 'error' });
    }
  }
  
  // Resumo
  const successRate = ((results.chat.passed / results.chat.total) * 100).toFixed(0);
  
  console.log(chalk.cyan('\n' + '=' .repeat(50)));
  console.log(chalk.cyan.bold('📊 RESUMO DA VALIDAÇÃO'));
  console.log(chalk.cyan('=' .repeat(50)));
  
  console.log(`\n📱 Interface /chat:`);
  console.log(`   Taxa de Sucesso: ${successRate}%`);
  console.log(`   Resultados: ${results.chat.passed}/${results.chat.total} testes passaram`);
  
  console.log(`\n📊 /admin/quality:`);
  console.log(chalk.gray('   Para testar: https://chat-pd-poa.vercel.app/admin/quality'));
  console.log(chalk.gray('   Executar "Teste de QA" no painel'));
  
  console.log(`\n⚡ /admin/benchmark:`);
  console.log(chalk.gray('   Para testar: https://chat-pd-poa.vercel.app/admin/benchmark'));
  console.log(chalk.gray('   Comparar modelos no painel'));
  
  // Status final
  console.log('\n' + '=' .repeat(50));
  if (successRate >= 80) {
    console.log(chalk.green.bold('✅ SISTEMA OPERACIONAL'));
    console.log(chalk.gray('\nPróximos passos:'));
    console.log('1. Acesse os painéis admin para testes completos');
    console.log('2. Execute: node test-all-121-cases.mjs para validação completa');
  } else {
    console.log(chalk.yellow.bold('⚠️ SISTEMA COM PROBLEMAS'));
    console.log(chalk.gray('\nVerifique os logs das Edge Functions'));
  }
  
  return results;
}

// Executar teste
quickTest().catch(error => {
  console.error(chalk.red('Erro:', error));
  process.exit(1);
});