#!/usr/bin/env node

/**
 * TESTE URGENTE - Verificar possível retrocesso após integração v3
 */

import fetch from 'node-fetch';
import dotenv from 'dotenv';
import chalk from 'chalk';

dotenv.config({ path: '.env' });

const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL || 'https://ngrqwmvuhvjkeohesbxs.supabase.co';
const ANON_KEY = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

const questions = [
  "escreva um resumo de até 25 palavras sobre a lei do plano diretor de porto alegre",
  "qual é a altura máxima e coef. básico e máx do aberta dos morros para cada zot",
  "Quantos bairros estão 'Protegidos pelo Sistema Atual' para proteção contra enchentes?",
  "Qual artigo da LUOS trata da Certificação em Sustentabilidade Ambiental?",
  "Como o Regime Volumétrico é tratado na LUOS?",
  "o que afirma literalmente o Art 1º da LUOS?",
  "do que se trata o Art. 119 da LUOS?",
  "O Art. 3º O Plano Diretor Urbano Sustentável de Porto Alegre será regido por princípios fundamentais. quais são eles?",
  "o que posso construir no bairro Petrópolis",
  "qual a altura máxima da construção dos prédios em Porto Alegre?",
  "o que diz o artigo 38 da luos?",
  "o que diz o artigo 5?",
  "resuma a parte I do plano diretor",
  "resuma o conteúdo do título 1 do pdus",
  "o que diz o artigo 1 do pdus"
];

async function testQuery(query, index) {
  console.log(chalk.blue(`\n${index + 1}. ${query}`));
  console.log(chalk.gray('─'.repeat(70)));
  
  try {
    const response = await fetch(`${SUPABASE_URL}/functions/v1/agentic-rag`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${ANON_KEY}`
      },
      body: JSON.stringify({
        query,
        sessionId: `test-retrocesso-${Date.now()}`,
        bypassCache: true
      })
    });

    const data = await response.json();
    
    if (data.error) {
      console.log(chalk.red('❌ ERRO:'), data.error);
      return { success: false, error: data.error };
    }
    
    // Analyze response quality
    const response_text = data.response || '';
    const hasContent = response_text.length > 50;
    const isGeneric = response_text.includes('não encontrei') || 
                      response_text.includes('não há informações') ||
                      response_text.includes('consulte diretamente');
    
    if (isGeneric) {
      console.log(chalk.red('❌ RESPOSTA GENÉRICA'));
    } else if (!hasContent) {
      console.log(chalk.yellow('⚠️ RESPOSTA MUITO CURTA'));
    } else {
      console.log(chalk.green('✅ RESPOSTA OK'));
    }
    
    // Show preview
    console.log(chalk.white(response_text.substring(0, 150) + '...'));
    
    return {
      success: !isGeneric && hasContent,
      generic: isGeneric,
      length: response_text.length,
      confidence: data.confidence
    };
    
  } catch (error) {
    console.log(chalk.red('❌ ERRO FATAL:'), error.message);
    return { success: false, fatal: true, error: error.message };
  }
}

async function runTests() {
  console.log(chalk.red.bold('\n🚨 TESTE DE RETROCESSO - VERIFICAÇÃO URGENTE\n'));
  
  const results = [];
  
  for (let i = 0; i < questions.length; i++) {
    const result = await testQuery(questions[i], i);
    results.push(result);
    await new Promise(resolve => setTimeout(resolve, 1000));
  }
  
  // Summary
  console.log(chalk.blue('\n' + '═'.repeat(70)));
  console.log(chalk.cyan.bold('📊 RESUMO DOS RESULTADOS'));
  console.log(chalk.blue('═'.repeat(70)));
  
  const successful = results.filter(r => r.success).length;
  const generic = results.filter(r => r.generic).length;
  const fatal = results.filter(r => r.fatal).length;
  
  console.log(chalk.green(`✅ Respostas válidas: ${successful}/15`));
  console.log(chalk.red(`❌ Respostas genéricas: ${generic}/15`));
  console.log(chalk.red(`💀 Erros fatais: ${fatal}/15`));
  
  const successRate = (successful / 15 * 100).toFixed(1);
  
  if (successRate < 50) {
    console.log(chalk.red.bold(`\n🚨 RETROCESSO CRÍTICO DETECTADO! Taxa: ${successRate}%`));
    console.log(chalk.red('Sistema está PIOR que antes da integração!'));
  } else if (successRate < 80) {
    console.log(chalk.yellow.bold(`\n⚠️ RETROCESSO PARCIAL! Taxa: ${successRate}%`));
    console.log(chalk.yellow('Sistema perdeu capacidade em algumas áreas.'));
  } else {
    console.log(chalk.green.bold(`\n✅ Sistema OK! Taxa: ${successRate}%`));
  }
  
  // Detailed breakdown
  console.log(chalk.cyan('\n📋 Detalhamento:'));
  questions.forEach((q, i) => {
    const r = results[i];
    const icon = r.success ? '✅' : r.generic ? '🔸' : '❌';
    console.log(`${icon} ${i+1}. ${q.substring(0, 50)}...`);
  });
}

runTests().catch(console.error);