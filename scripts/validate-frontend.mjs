#!/usr/bin/env node

/**
 * Script para validar o sistema através do frontend
 * Simula interações do usuário e valida respostas
 */

import puppeteer from 'puppeteer';
import chalk from 'chalk';
import { fileURLToPath } from 'url';
import path from 'path';
import fs from 'fs';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Configuração
const BASE_URL = process.env.FRONTEND_URL || 'http://localhost:5173';
const ADMIN_EMAIL = process.env.ADMIN_EMAIL || 'admin@example.com';
const ADMIN_PASSWORD = process.env.ADMIN_PASSWORD || 'password';

// Casos de teste prioritários
const TEST_CASES = [
  {
    category: 'Legal Citations',
    tests: [
      {
        query: 'Qual artigo da LUOS trata da Certificação em Sustentabilidade?',
        expected: ['LUOS', 'Art. 81', 'Inciso III']
      },
      {
        query: 'O que são ZEIS segundo o PDUS?',
        expected: ['PDUS', 'Art. 92']
      },
      {
        query: 'Qual artigo define o EIV?',
        expected: ['LUOS', 'Art. 89']
      }
    ]
  },
  {
    category: 'Regime Urbanístico',
    tests: [
      {
        query: 'Qual a altura máxima em Boa Vista?',
        expected: ['altura', 'metros', 'Boa Vista']
      },
      {
        query: 'Qual o coeficiente de aproveitamento do Centro Histórico?',
        expected: ['coeficiente', 'básico', 'máximo']
      }
    ]
  },
  {
    category: 'Conceitos',
    tests: [
      {
        query: 'O que é o PDUS?',
        expected: ['Plano Diretor', 'Porto Alegre']
      },
      {
        query: 'O que é gentrificação?',
        expected: ['valorização', 'imobiliária']
      }
    ]
  }
];

async function testChatInterface(browser) {
  console.log(chalk.cyan('\n📱 Testando Interface de Chat\n'));
  
  const page = await browser.newPage();
  await page.goto(`${BASE_URL}/chat`, { waitUntil: 'networkidle2' });
  
  const results = [];
  
  for (const category of TEST_CASES) {
    console.log(chalk.yellow(`\n📂 ${category.category}`));
    
    for (const test of category.tests) {
      console.log(`   Testando: "${test.query.substring(0, 50)}..."`);
      
      try {
        // Digite a pergunta
        await page.waitForSelector('textarea, input[type="text"]', { timeout: 5000 });
        await page.type('textarea, input[type="text"]', test.query);
        
        // Envie a mensagem
        await page.keyboard.press('Enter');
        
        // Aguarde a resposta (max 30 segundos)
        await page.waitForSelector('.message-response, .assistant-message', { 
          timeout: 30000 
        });
        
        // Capture a resposta
        const response = await page.evaluate(() => {
          const messages = document.querySelectorAll('.message-response, .assistant-message');
          const lastMessage = messages[messages.length - 1];
          return lastMessage ? lastMessage.textContent : '';
        });
        
        // Valide a resposta
        const success = test.expected.every(keyword => 
          response.toLowerCase().includes(keyword.toLowerCase())
        );
        
        if (success) {
          console.log(chalk.green(`   ✅ Passou`));
          results.push({ test: test.query, status: 'passed' });
        } else {
          console.log(chalk.red(`   ❌ Falhou - Faltando: ${test.expected.filter(k => !response.toLowerCase().includes(k.toLowerCase()))}`));
          results.push({ test: test.query, status: 'failed', missing: test.expected });
        }
        
        // Aguarde um pouco antes do próximo teste
        await new Promise(resolve => setTimeout(resolve, 2000));
        
      } catch (error) {
        console.log(chalk.red(`   ❌ Erro: ${error.message}`));
        results.push({ test: test.query, status: 'error', error: error.message });
      }
    }
  }
  
  await page.close();
  return results;
}

async function testAdminQuality(browser) {
  console.log(chalk.cyan('\n📊 Testando Admin Quality\n'));
  
  const page = await browser.newPage();
  
  try {
    // Login
    await page.goto(`${BASE_URL}/login`, { waitUntil: 'networkidle2' });
    await page.type('input[type="email"]', ADMIN_EMAIL);
    await page.type('input[type="password"]', ADMIN_PASSWORD);
    await page.click('button[type="submit"]');
    
    // Navegue para quality
    await page.goto(`${BASE_URL}/admin/quality`, { waitUntil: 'networkidle2' });
    
    // Procure pelo botão de executar teste
    const runTestButton = await page.$('button:contains("Executar Teste")');
    if (runTestButton) {
      console.log('   🚀 Iniciando teste de QA...');
      await runTestButton.click();
      
      // Aguarde resultados (pode demorar)
      await page.waitForSelector('.test-results, .qa-results', { 
        timeout: 300000 // 5 minutos
      });
      
      // Capture métricas
      const metrics = await page.evaluate(() => {
        const successRate = document.querySelector('.success-rate, [data-testid="success-rate"]');
        const totalTests = document.querySelector('.total-tests, [data-testid="total-tests"]');
        
        return {
          successRate: successRate ? successRate.textContent : 'N/A',
          totalTests: totalTests ? totalTests.textContent : 'N/A'
        };
      });
      
      console.log(chalk.green(`   ✅ Taxa de Sucesso: ${metrics.successRate}`));
      console.log(chalk.green(`   ✅ Total de Testes: ${metrics.totalTests}`));
      
      return { status: 'success', metrics };
    } else {
      console.log(chalk.yellow('   ⚠️ Botão de teste não encontrado'));
      return { status: 'not_found' };
    }
    
  } catch (error) {
    console.log(chalk.red(`   ❌ Erro: ${error.message}`));
    return { status: 'error', error: error.message };
  } finally {
    await page.close();
  }
}

async function testAdminBenchmark(browser) {
  console.log(chalk.cyan('\n⚡ Testando Admin Benchmark\n'));
  
  const page = await browser.newPage();
  
  try {
    // Assumindo já logado
    await page.goto(`${BASE_URL}/admin/benchmark`, { waitUntil: 'networkidle2' });
    
    // Configure teste de benchmark
    const modelsToTest = ['claude-3-5-sonnet', 'gpt-4o', 'gemini-pro'];
    
    console.log('   📝 Configurando benchmark...');
    
    // Selecione modelos
    for (const model of modelsToTest) {
      const checkbox = await page.$(`input[value="${model}"]`);
      if (checkbox) await checkbox.click();
    }
    
    // Adicione queries de teste
    const testQueries = [
      'Qual artigo da LUOS trata da Certificação em Sustentabilidade?',
      'O que são ZEIS segundo o PDUS?',
      'Qual a altura máxima em Boa Vista?'
    ];
    
    for (const query of testQueries) {
      await page.type('textarea.benchmark-queries', query + '\n');
    }
    
    // Execute benchmark
    const runButton = await page.$('button:contains("Executar Benchmark")');
    if (runButton) {
      await runButton.click();
      
      // Aguarde resultados
      await page.waitForSelector('.benchmark-results', { timeout: 120000 });
      
      // Capture resultados
      const results = await page.evaluate(() => {
        const modelResults = [];
        document.querySelectorAll('.model-result').forEach(result => {
          const model = result.querySelector('.model-name')?.textContent;
          const successRate = result.querySelector('.success-rate')?.textContent;
          const avgTime = result.querySelector('.avg-time')?.textContent;
          
          modelResults.push({ model, successRate, avgTime });
        });
        return modelResults;
      });
      
      console.log('   📊 Resultados do Benchmark:');
      results.forEach(result => {
        console.log(`      ${result.model}: ${result.successRate} (${result.avgTime})`);
      });
      
      return { status: 'success', results };
    } else {
      console.log(chalk.yellow('   ⚠️ Botão de benchmark não encontrado'));
      return { status: 'not_found' };
    }
    
  } catch (error) {
    console.log(chalk.red(`   ❌ Erro: ${error.message}`));
    return { status: 'error', error: error.message };
  } finally {
    await page.close();
  }
}

async function runValidation() {
  console.log(chalk.cyan.bold('\n🧪 VALIDAÇÃO DO FRONTEND E PAINÉIS ADMIN\n'));
  console.log(chalk.gray('=' .repeat(60)));
  
  const browser = await puppeteer.launch({
    headless: process.env.HEADLESS !== 'false',
    args: ['--no-sandbox', '--disable-setuid-sandbox']
  });
  
  const results = {
    chat: null,
    quality: null,
    benchmark: null
  };
  
  try {
    // Teste Chat
    results.chat = await testChatInterface(browser);
    
    // Teste Admin Quality
    if (ADMIN_EMAIL && ADMIN_PASSWORD) {
      results.quality = await testAdminQuality(browser);
      
      // Teste Admin Benchmark
      results.benchmark = await testAdminBenchmark(browser);
    } else {
      console.log(chalk.yellow('\n⚠️ Credenciais admin não configuradas. Pulando testes admin.'));
    }
    
  } finally {
    await browser.close();
  }
  
  // Relatório Final
  console.log(chalk.cyan('\n' + '=' .repeat(60)));
  console.log(chalk.cyan.bold('📊 RELATÓRIO DE VALIDAÇÃO'));
  console.log(chalk.cyan('=' .repeat(60)));
  
  // Chat Results
  if (results.chat) {
    const passed = results.chat.filter(r => r.status === 'passed').length;
    const total = results.chat.length;
    const rate = ((passed / total) * 100).toFixed(1);
    
    console.log(`\n📱 Interface Chat: ${rate}% (${passed}/${total})`);
    if (rate >= 80) {
      console.log(chalk.green('   ✅ APROVADO'));
    } else {
      console.log(chalk.red('   ❌ REPROVADO'));
    }
  }
  
  // Quality Results
  if (results.quality) {
    console.log(`\n📊 Admin Quality:`);
    if (results.quality.status === 'success') {
      console.log(chalk.green('   ✅ FUNCIONANDO'));
      console.log(`   Taxa: ${results.quality.metrics.successRate}`);
    } else {
      console.log(chalk.red('   ❌ COM PROBLEMAS'));
    }
  }
  
  // Benchmark Results
  if (results.benchmark) {
    console.log(`\n⚡ Admin Benchmark:`);
    if (results.benchmark.status === 'success') {
      console.log(chalk.green('   ✅ FUNCIONANDO'));
    } else {
      console.log(chalk.red('   ❌ COM PROBLEMAS'));
    }
  }
  
  // Save Report
  const timestamp = new Date().toISOString().replace(/:/g, '-').split('.')[0];
  const reportPath = path.join(__dirname, '..', 'test-reports', `frontend-validation-${timestamp}.json`);
  
  try {
    const reportDir = path.dirname(reportPath);
    if (!fs.existsSync(reportDir)) {
      fs.mkdirSync(reportDir, { recursive: true });
    }
    
    fs.writeFileSync(reportPath, JSON.stringify({
      timestamp: new Date().toISOString(),
      results
    }, null, 2));
    
    console.log(chalk.gray(`\n📁 Relatório salvo em: ${reportPath}`));
  } catch (error) {
    console.error(chalk.red(`Erro ao salvar relatório: ${error.message}`));
  }
}

// Execute validation
console.log(chalk.cyan('🚀 Iniciando validação do frontend...'));
console.log(chalk.gray(`URL Base: ${BASE_URL}\n`));

runValidation().catch(error => {
  console.error(chalk.red('\n💥 Erro fatal:'), error);
  process.exit(1);
});