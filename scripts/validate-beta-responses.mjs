#!/usr/bin/env node

import fetch from 'node-fetch';
import chalk from 'chalk';
import dotenv from 'dotenv';
import { createClient } from '@supabase/supabase-js';
import { fileURLToPath } from 'url';
import path from 'path';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

dotenv.config({ path: path.join(__dirname, '../.env.local') });

const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL;
const SUPABASE_ANON_KEY = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
const SUPABASE_SERVICE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!SUPABASE_URL || !SUPABASE_ANON_KEY || !SUPABASE_SERVICE_KEY) {
  console.error(chalk.red('❌ Missing Supabase configuration'));
  process.exit(1);
}

const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_KEY);

// Testes específicos para validar quando BETA_RESPONSE deve ou não ser usado
const BETA_VALIDATION_TESTS = [
  {
    id: 'beta-1',
    name: 'Query com dados disponíveis',
    query: 'O que são ZOTs?',
    shouldBeBeta: false,
    reason: 'Dados disponíveis na knowledge base'
  },
  {
    id: 'beta-2',
    name: 'Localização inexistente',
    query: 'Regras para construir em Gramado',
    shouldBeBeta: true,
    reason: 'Gramado não é bairro de Porto Alegre'
  },
  {
    id: 'beta-3',
    name: 'Artigo LUOS específico',
    query: 'Art. 81 da LUOS fala sobre o que?',
    shouldBeBeta: false,
    reason: 'Artigo existe na base legal'
  },
  {
    id: 'beta-4',
    name: 'Pergunta fora do escopo',
    query: 'Como fazer um bolo de chocolate?',
    shouldBeBeta: true,
    reason: 'Totalmente fora do escopo urbano'
  },
  {
    id: 'beta-5',
    name: 'Bairro válido',
    query: 'Regras para o Centro Histórico',
    shouldBeBeta: false,
    reason: 'Centro Histórico é bairro válido'
  },
  {
    id: 'beta-6',
    name: 'ZOT específica',
    query: 'Parâmetros da ZOT 07',
    shouldBeBeta: false,
    reason: 'ZOT 07 existe e tem dados'
  },
  {
    id: 'beta-7',
    name: 'Legislação inexistente',
    query: 'Art. 999 da LUOS',
    shouldBeBeta: true,
    reason: 'Artigo não existe'
  },
  {
    id: 'beta-8',
    name: 'Conceito geral PDUS',
    query: 'Objetivos do Plano Diretor',
    shouldBeBeta: false,
    reason: 'Conceito fundamental disponível'
  }
];

async function validateBetaResponses() {
  console.log(chalk.cyan.bold('\n🧪 VALIDAÇÃO DE RESPOSTAS BETA\n'));
  console.log(chalk.gray('Verificando se BETA_RESPONSE é usado apropriadamente...\n'));
  
  // Primeiro, vamos verificar casos recentes no banco
  console.log(chalk.blue('📊 Analisando respostas BETA recentes no banco...\n'));
  
  const { data: recentChats, error } = await supabase
    .from('chat_history')
    .select('id, user_message, assistant_message, created_at')
    .gte('created_at', new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString())
    .order('created_at', { ascending: false })
    .limit(50);
  
  if (error) {
    console.error(chalk.red('❌ Erro ao buscar chats recentes:'), error);
  } else {
    const betaResponses = recentChats.filter(chat => 
      chat.assistant_message?.includes('versão Beta') || 
      chat.assistant_message?.includes('BETA_RESPONSE')
    );
    
    console.log(`📈 Últimas 24h: ${betaResponses.length}/${recentChats.length} respostas BETA (${(betaResponses.length/recentChats.length*100).toFixed(1)}%)`);
    
    if (betaResponses.length > 0) {
      console.log('\n🔍 Exemplos de respostas BETA recentes:');
      betaResponses.slice(0, 3).forEach((chat, i) => {
        console.log(chalk.gray(`${i+1}. "${chat.user_message}" → BETA`));
      });
    }
  }
  
  console.log(chalk.blue('\n🧪 Testando casos específicos...\n'));
  
  const results = {
    total: BETA_VALIDATION_TESTS.length,
    correct: 0,
    incorrect: 0,
    falsePositives: 0, // Respondeu BETA quando não deveria
    falseNegatives: 0  // Não respondeu BETA quando deveria
  };
  
  for (const test of BETA_VALIDATION_TESTS) {
    process.stdout.write(`${test.id}: ${test.name}... `);
    
    try {
      const response = await fetch(`${SUPABASE_URL}/functions/v1/agentic-rag-v2`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${SUPABASE_ANON_KEY}`,
        },
        body: JSON.stringify({
          query: test.query,
          bypassCache: true,
          model: 'anthropic/claude-3-5-sonnet-20241022'
        })
      });
      
      if (!response.ok) {
        console.log(chalk.red(`❌ HTTP ${response.status}`));
        results.incorrect++;
        continue;
      }
      
      const result = await response.json();
      const text = result.response || '';
      const isBetaResponse = text.includes('versão Beta') || text.includes('BETA_RESPONSE');
      
      // Verificar se a resposta está correta
      const correct = (test.shouldBeBeta && isBetaResponse) || (!test.shouldBeBeta && !isBetaResponse);
      
      if (correct) {
        results.correct++;
        console.log(chalk.green(`✅ ${isBetaResponse ? 'BETA' : 'DATA'}`));
      } else {
        results.incorrect++;
        if (test.shouldBeBeta && !isBetaResponse) {
          results.falseNegatives++;
          console.log(chalk.red(`❌ FALSE NEGATIVE (deveria ser BETA)`));
          console.log(chalk.gray(`   Razão: ${test.reason}`));
        } else if (!test.shouldBeBeta && isBetaResponse) {
          results.falsePositives++;
          console.log(chalk.red(`❌ FALSE POSITIVE (não deveria ser BETA)`));
          console.log(chalk.gray(`   Razão: ${test.reason}`));
        }
      }
      
    } catch (error) {
      console.log(chalk.red(`❌ Error: ${error.message}`));
      results.incorrect++;
    }
    
    // Delay entre testes
    await new Promise(resolve => setTimeout(resolve, 1500));
  }
  
  // Resultados finais
  console.log(chalk.cyan('\n' + '═'.repeat(60)));
  console.log(chalk.cyan.bold('📊 RESULTADOS DA VALIDAÇÃO BETA'));
  console.log(chalk.cyan('═'.repeat(60) + '\n'));
  
  const accuracy = (results.correct / results.total * 100).toFixed(1);
  const fpRate = (results.falsePositives / results.total * 100).toFixed(1);
  const fnRate = (results.falseNegatives / results.total * 100).toFixed(1);
  
  console.log(chalk.bold('Métricas de Precisão:'));
  console.log(`  Acurácia Geral: ${accuracy}%`);
  console.log(`  Falsos Positivos: ${fpRate}% (${results.falsePositives} casos)`);
  console.log(`  Falsos Negativos: ${fnRate}% (${results.falseNegatives} casos)`);
  console.log(`  Corretos: ${results.correct}/${results.total}`);
  console.log(`  Incorretos: ${results.incorrect}/${results.total}`);
  
  // Análise
  console.log(chalk.cyan('\n📋 Análise:'));
  if (results.falsePositives > 0) {
    console.log(chalk.yellow(`⚠️ ${results.falsePositives} casos onde sistema disse BETA mas tinha dados`));
    console.log(chalk.gray('   → Pode indicar problema na busca da knowledge base'));
  }
  if (results.falseNegatives > 0) {
    console.log(chalk.yellow(`⚠️ ${results.falseNegatives} casos onde sistema inventou dados em vez de usar BETA`));
    console.log(chalk.gray('   → Pode indicar problema na validação dos agentes'));
  }
  
  // Veredicto final
  console.log(chalk.cyan('\n' + '═'.repeat(60)));
  
  if (accuracy >= 90 && results.falseNegatives == 0) {
    console.log(chalk.green.bold('✅ BETA_RESPONSE FUNCIONANDO CORRETAMENTE'));
    console.log(chalk.green('Sistema usando BETA apropriadamente, sem invenção de dados.'));
  } else if (accuracy >= 75) {
    console.log(chalk.yellow.bold('⚠️ BETA_RESPONSE PARCIALMENTE CORRETO'));
    console.log(chalk.yellow('Algumas melhorias necessárias na lógica de validação.'));
  } else {
    console.log(chalk.red.bold('❌ PROBLEMAS NO BETA_RESPONSE'));
    console.log(chalk.red('Sistema ainda inventando dados ou usando BETA incorretamente.'));
  }
  
  // Recomendações
  if (results.falsePositives > results.falseNegatives) {
    console.log(chalk.blue('\n💡 Recomendação: Melhorar busca na knowledge base'));
  } else if (results.falseNegatives > 0) {
    console.log(chalk.blue('\n💡 Recomendação: Tornar agent-validator mais rigoroso'));
  }
  
  // Salvar relatório
  const timestamp = new Date().toISOString().replace(/:/g, '-').split('.')[0];
  const reportPath = path.join(__dirname, '../test-reports', `beta-validation-${timestamp}.json`);
  
  try {
    const fs = await import('fs');
    const reportDir = path.dirname(reportPath);
    
    if (!fs.existsSync(reportDir)) {
      fs.mkdirSync(reportDir, { recursive: true });
    }
    
    fs.writeFileSync(reportPath, JSON.stringify({
      timestamp: new Date().toISOString(),
      accuracy: parseFloat(accuracy),
      falsePositiveRate: parseFloat(fpRate),
      falseNegativeRate: parseFloat(fnRate),
      results,
      verdict: accuracy >= 90 && results.falseNegatives == 0 ? 'CORRECT' : 'NEEDS_IMPROVEMENT'
    }, null, 2));
    
    console.log(chalk.gray(`\n📁 Report saved to: ${reportPath}`));
  } catch (error) {
    console.error(chalk.red(`Failed to save report: ${error.message}`));
  }
}

console.log(chalk.cyan('🚀 Iniciando validação de respostas BETA...'));
validateBetaResponses().catch(error => {
  console.error(chalk.red('\n💥 Fatal error:'), error);
  process.exit(1);
});