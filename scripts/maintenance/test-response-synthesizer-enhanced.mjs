#!/usr/bin/env node

/**
 * Script para testar o response-synthesizer-enhanced
 */

import fetch from 'node-fetch';
import dotenv from 'dotenv';
import chalk from 'chalk';

// Load environment variables
dotenv.config({ path: '.env' });

const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL || 'https://ngrqwmvuhvjkeohesbxs.supabase.co';
const ANON_KEY = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

async function testResponseSynthesizer(query, testName) {
  console.log(chalk.cyan(`\n📝 Teste: ${testName}`));
  console.log(chalk.gray(`Query: ${query}`));
  
  try {
    const response = await fetch(`${SUPABASE_URL}/functions/v1/response-synthesizer-enhanced`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${ANON_KEY}`
      },
      body: JSON.stringify({
        originalQuery: query,
        agentResults: [
          {
            agent: 'test',
            data: {
              urban_data: []
            }
          }
        ]
      })
    });

    if (!response.ok) {
      throw new Error(`HTTP error! status: ${response.status}`);
    }

    const data = await response.json();
    
    console.log(chalk.green('✅ Resposta recebida:'));
    console.log(data.response);
    
    if (data.metadata) {
      console.log(chalk.yellow('\n📊 Metadata:'));
      console.log(JSON.stringify(data.metadata, null, 2));
    }
    
    return data;
  } catch (error) {
    console.error(chalk.red(`❌ Erro: ${error.message}`));
    return null;
  }
}

async function runAllTests() {
  console.log(chalk.cyan.bold('🚀 Testando Response Synthesizer Enhanced\n'));
  
  const tests = [
    {
      name: 'Teste de Endereço sem Bairro',
      query: 'Qual a altura máxima na Rua Luiz Voelcker?'
    },
    {
      name: 'Teste de Endereço com CEP',
      query: 'O que posso construir no CEP 90520-000?'
    },
    {
      name: 'Teste de Valores Máximos',
      query: 'Qual a maior altura permitida em Porto Alegre?'
    },
    {
      name: 'Teste de Valores Mínimos',
      query: 'Qual zona tem o menor coeficiente de aproveitamento?'
    },
    {
      name: 'Teste de Risco Climático - Contagem',
      query: 'Quantos bairros estão protegidos pelo sistema atual contra enchentes?'
    },
    {
      name: 'Teste de Risco Climático - Lista',
      query: 'Quais bairros têm risco de inundação?'
    },
    {
      name: 'Teste de Bairro sem Indicador',
      query: 'Informações sobre o bairro Petrópolis'
    },
    {
      name: 'Teste de Zona Específica',
      query: 'O que posso construir na ZOT 08?'
    }
  ];
  
  console.log(chalk.yellow(`📋 Total de testes: ${tests.length}\n`));
  
  for (const test of tests) {
    await testResponseSynthesizer(test.query, test.name);
    
    // Aguarda 1 segundo entre testes
    await new Promise(resolve => setTimeout(resolve, 1000));
  }
  
  console.log(chalk.green.bold('\n✨ Testes concluídos!'));
}

// Execute os testes
runAllTests().catch(error => {
  console.error(chalk.red('❌ Erro fatal:', error));
  process.exit(1);
});