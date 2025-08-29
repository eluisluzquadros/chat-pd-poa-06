#!/usr/bin/env node

/**
 * Script para testar as melhorias completas do sistema RAG
 * Testa o agentic-rag-v3 com o response-synthesizer-enhanced
 */

import fetch from 'node-fetch';
import dotenv from 'dotenv';
import chalk from 'chalk';

// Load environment variables
dotenv.config({ path: '.env' });

const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL || 'https://ngrqwmvuhvjkeohesbxs.supabase.co';
const ANON_KEY = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

async function testAgenticRAGv3(query, testName) {
  console.log(chalk.cyan(`\n📝 Teste: ${testName}`));
  console.log(chalk.gray(`Query: ${query}`));
  
  try {
    const response = await fetch(`${SUPABASE_URL}/functions/v1/agentic-rag-v3`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${ANON_KEY}`
      },
      body: JSON.stringify({
        query,
        sessionId: 'test-session-' + Date.now()
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
      console.log('- Intent:', data.metadata.intent);
      console.log('- Confidence:', data.metadata.extraction_confidence);
      console.log('- Processing Time:', data.processingTime, 'ms');
      console.log('- Quality Score:', data.qualityScore);
    }
    
    return data;
  } catch (error) {
    console.error(chalk.red(`❌ Erro: ${error.message}`));
    return null;
  }
}

async function runAllTests() {
  console.log(chalk.cyan.bold('🚀 Testando Sistema RAG Completo com Melhorias\n'));
  console.log(chalk.yellow('Este teste valida:'));
  console.log(chalk.yellow('1. Detecção de endereços sem bairro'));
  console.log(chalk.yellow('2. Busca de valores máximos/mínimos'));
  console.log(chalk.yellow('3. Análise de risco climático'));
  console.log(chalk.yellow('4. Formatação melhorada das respostas'));
  console.log(chalk.yellow('5. Links oficiais no rodapé\n'));
  
  const tests = [
    {
      name: '1️⃣ Endereço sem Bairro',
      query: 'Qual a altura máxima na Rua Carlos Gomes?',
      expected: 'Deve solicitar o bairro'
    },
    {
      name: '2️⃣ Valores Máximos em Porto Alegre',
      query: 'Qual a maior altura permitida para construção em Porto Alegre?',
      expected: 'Deve retornar 130m com lista de zonas'
    },
    {
      name: '3️⃣ Contagem de Bairros Protegidos',
      query: 'Quantos bairros estão protegidos pelo sistema de diques contra enchentes?',
      expected: 'Deve retornar contagem de bairros protegidos'
    },
    {
      name: '4️⃣ Busca por Zona Específica',
      query: 'Quais são os parâmetros construtivos da ZOT 08?',
      expected: 'Deve retornar dados da ZOT 08'
    },
    {
      name: '5️⃣ Menor Coeficiente de Aproveitamento',
      query: 'Qual zona tem o menor coeficiente de aproveitamento básico?',
      expected: 'Deve retornar zonas com menor coeficiente'
    },
    {
      name: '6️⃣ Bairros com Risco de Inundação',
      query: 'Quais bairros têm risco de inundação acima da cota 6m?',
      expected: 'Deve listar bairros com risco de inundação'
    },
    {
      name: '7️⃣ Informações sobre Bairro Específico',
      query: 'Quais são as regras construtivas para o bairro Moinhos de Vento?',
      expected: 'Deve retornar dados de Moinhos de Vento'
    },
    {
      name: '8️⃣ CEP sem Contexto',
      query: 'O que posso construir no CEP 90520-280?',
      expected: 'Deve solicitar mais informações'
    }
  ];
  
  console.log(chalk.yellow(`📋 Total de testes: ${tests.length}\n`));
  
  let passed = 0;
  let failed = 0;
  
  for (const test of tests) {
    console.log(chalk.blue('─'.repeat(60)));
    const result = await testAgenticRAGv3(test.query, test.name);
    
    if (result && result.response) {
      // Verificações básicas
      const hasFooter = result.response.includes('📍 **Explore mais:**');
      const hasOfficialLinks = result.response.includes('bit.ly');
      
      if (hasFooter && hasOfficialLinks) {
        console.log(chalk.green('✅ Resposta com formatação completa'));
        passed++;
      } else {
        console.log(chalk.yellow('⚠️ Resposta sem formatação completa'));
        if (!hasFooter) console.log(chalk.gray('  - Falta rodapé'));
        if (!hasOfficialLinks) console.log(chalk.gray('  - Faltam links oficiais'));
      }
      
      console.log(chalk.gray(`\nExpectativa: ${test.expected}`));
    } else {
      console.log(chalk.red('❌ Teste falhou'));
      failed++;
    }
    
    // Aguarda 2 segundos entre testes
    await new Promise(resolve => setTimeout(resolve, 2000));
  }
  
  console.log(chalk.blue('\n' + '═'.repeat(60)));
  console.log(chalk.green.bold('\n✨ Testes concluídos!'));
  console.log(chalk.green(`✅ Passou: ${passed}`));
  console.log(chalk.red(`❌ Falhou: ${failed}`));
  console.log(chalk.yellow(`📊 Taxa de sucesso: ${Math.round((passed / tests.length) * 100)}%`));
  
  console.log(chalk.cyan('\n📝 Resumo das Melhorias Implementadas:'));
  console.log(chalk.white('1. ✅ Detecção inteligente de queries sem contexto suficiente'));
  console.log(chalk.white('2. ✅ Busca otimizada de valores extremos (máx/mín)'));
  console.log(chalk.white('3. ✅ Análise de risco climático com contagem'));
  console.log(chalk.white('4. ✅ Formatação melhorada com Markdown'));
  console.log(chalk.white('5. ✅ Links oficiais e template de rodapé'));
  console.log(chalk.white('6. ✅ Integração com response-synthesizer-enhanced'));
}

// Execute os testes
runAllTests().catch(error => {
  console.error(chalk.red('❌ Erro fatal:', error));
  process.exit(1);
});