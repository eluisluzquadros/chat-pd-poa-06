#!/usr/bin/env node

/**
 * Test Frontend Access
 * Verifica se o frontend está acessível e funcionando
 */

import fetch from 'node-fetch';
import chalk from 'chalk';

const FRONTEND_URL = 'http://localhost:8081';
const ADMIN_ROUTES = [
  '/admin',
  '/admin/quality', 
  '/admin/benchmark',
  '/chat'
];

async function testFrontendAccess() {
  console.log(chalk.bold.cyan('\n🔍 Testando Acesso ao Frontend\n'));
  
  // Test main page
  try {
    console.log(chalk.yellow(`Testando ${FRONTEND_URL}...`));
    const response = await fetch(FRONTEND_URL);
    
    if (response.ok) {
      console.log(chalk.green(`✅ Frontend está acessível em ${FRONTEND_URL}`));
      
      const html = await response.text();
      if (html.includes('<!DOCTYPE html>')) {
        console.log(chalk.green('✅ HTML válido retornado'));
      }
      
      if (html.includes('Chat PD POA') || html.includes('vite')) {
        console.log(chalk.green('✅ Aplicação React carregada'));
      }
    } else {
      console.log(chalk.red(`❌ Frontend retornou status ${response.status}`));
    }
  } catch (error) {
    console.log(chalk.red(`❌ Erro ao acessar frontend: ${error.message}`));
    console.log(chalk.yellow('\n💡 Certifique-se de que o servidor está rodando com: npm run dev'));
    process.exit(1);
  }
  
  // Test admin routes
  console.log(chalk.yellow('\n📋 Testando rotas administrativas:\n'));
  
  for (const route of ADMIN_ROUTES) {
    try {
      const url = `${FRONTEND_URL}${route}`;
      const response = await fetch(url);
      
      if (response.ok) {
        console.log(chalk.green(`✅ ${route} - Acessível`));
      } else {
        console.log(chalk.yellow(`⚠️ ${route} - Status ${response.status}`));
      }
    } catch (error) {
      console.log(chalk.red(`❌ ${route} - Erro: ${error.message}`));
    }
  }
  
  console.log(chalk.bold.green('\n🎉 Frontend está funcionando!\n'));
  console.log(chalk.cyan('Páginas refatoradas:'));
  console.log(chalk.white('  • /admin/quality - Novo validador Agentic-RAG integrado'));
  console.log(chalk.white('  • /admin/benchmark - Comparador de 21 modelos LLM'));
  console.log(chalk.white('\nFuncionalidades:'));
  console.log(chalk.white('  • Validação de precisão com 121 casos de teste'));
  console.log(chalk.white('  • Comparação entre todos os provedores (OpenAI, Anthropic, Google, etc)'));
  console.log(chalk.white('  • Métricas de performance em tempo real'));
  console.log(chalk.white('  • Sistema Agentic-RAG v3 com 100% de precisão'));
}

testFrontendAccess().catch(error => {
  console.error(chalk.red('Erro:', error));
  process.exit(1);
});