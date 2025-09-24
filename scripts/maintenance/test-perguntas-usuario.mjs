#!/usr/bin/env node

/**
 * Script para testar as perguntas específicas do usuário
 * Valida que o sistema consegue responder usando apenas a base de conhecimento do Supabase
 */

import fetch from 'node-fetch';
import dotenv from 'dotenv';
import chalk from 'chalk';

// Load environment variables
dotenv.config({ path: '.env' });

const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL || 'https://ngrqwmvuhvjkeohesbxs.supabase.co';
const ANON_KEY = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

async function testQuery(query, testNumber) {
  console.log(chalk.blue(`\n${'═'.repeat(60)}`));
  console.log(chalk.cyan(`📝 Pergunta ${testNumber}:`));
  console.log(chalk.white(query));
  console.log(chalk.blue(`${'─'.repeat(60)}`));
  
  try {
    const response = await fetch(`${SUPABASE_URL}/functions/v1/agentic-rag`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${ANON_KEY}`
      },
      body: JSON.stringify({
        query,
        message: query,
        sessionId: 'test-' + Date.now(),
        model: 'gpt-3.5-turbo',
        bypassCache: true
      })
    });

    if (!response.ok) {
      throw new Error(`HTTP error! status: ${response.status}`);
    }

    const data = await response.json();
    
    console.log(chalk.green('✅ Resposta:'));
    
    // Limita a resposta para melhor visualização
    const lines = data.response.split('\n');
    const preview = lines.slice(0, 15).join('\n');
    console.log(preview);
    
    if (lines.length > 15) {
      console.log(chalk.gray(`... [${lines.length - 15} linhas omitidas]`));
    }
    
    // Mostra métricas
    console.log(chalk.yellow('\n📊 Métricas:'));
    console.log(`  • Confiança: ${data.confidence || 'N/A'}`);
    console.log(`  • Fontes: legal=${data.sources?.legal_articles || 0}, regime=${data.sources?.regime_urbanistico || 0}`);
    console.log(`  • Tempo: ${data.executionTime || 'N/A'}ms`);
    
    return {
      success: true,
      hasContent: data.response && data.response.length > 50,
      confidence: data.confidence
    };
  } catch (error) {
    console.error(chalk.red(`❌ Erro: ${error.message}`));
    return {
      success: false,
      error: error.message
    };
  }
}

async function runAllTests() {
  console.log(chalk.cyan.bold('\n🚀 TESTE DE PERGUNTAS ESPECÍFICAS DO USUÁRIO'));
  console.log(chalk.yellow('Usando apenas a base de conhecimento do Supabase\n'));
  
  const perguntas = [
    "escreva um resumo de até 25 palavras sobre a lei do plano diretor de porto alegre",
    "qual é a altura máxima e coef. básico e máx do aberta dos morros para cada zot",
    "Quantos bairros estão 'Protegidos pelo Sistema Atual' para proteção contra enchentes?",
    "Qual artigo da LUOS trata da Certificação em Sustentabilidade Ambiental?",
    "Como o Regime Volumétrico é tratado na LUOS?",
    "o que afirma literalmente o Art 1º da LUOS?",
    "do que se trata o Art. 119 da LUOS?",
    "O Art. 3º O Plano Diretor Urbano Sustentável de Porto Alegre será regido por princípios fundamentais. quais são eles?",
    "o que posso construir no bairro Petrópolis",
    "Qual a altura máxima da construção dos prédios em Porto Alegre?",
    "o que diz o artigo 38 da luos?",
    "o que diz o artigo 5?",
    "resuma a parte I do plano diretor"
  ];
  
  const resultados = [];
  let sucessos = 0;
  let falhas = 0;
  
  for (let i = 0; i < perguntas.length; i++) {
    const resultado = await testQuery(perguntas[i], i + 1);
    resultados.push(resultado);
    
    if (resultado.success && resultado.hasContent) {
      sucessos++;
    } else {
      falhas++;
    }
    
    // Aguarda um pouco entre as perguntas
    await new Promise(resolve => setTimeout(resolve, 1500));
  }
  
  // Resumo final
  console.log(chalk.blue(`\n${'═'.repeat(60)}`));
  console.log(chalk.cyan.bold('📊 RESUMO FINAL'));
  console.log(chalk.blue(`${'═'.repeat(60)}`));
  
  console.log(chalk.green(`✅ Respostas com sucesso: ${sucessos}/${perguntas.length}`));
  console.log(chalk.red(`❌ Falhas ou sem conteúdo: ${falhas}/${perguntas.length}`));
  
  const taxaSucesso = (sucessos / perguntas.length) * 100;
  console.log(chalk.yellow(`📈 Taxa de sucesso: ${taxaSucesso.toFixed(1)}%`));
  
  // Análise detalhada
  console.log(chalk.cyan('\n📋 Análise por Pergunta:'));
  perguntas.forEach((p, i) => {
    const r = resultados[i];
    const status = r.success && r.hasContent ? '✅' : '❌';
    const conf = r.confidence ? `(${(r.confidence * 100).toFixed(0)}%)` : '';
    console.log(`${status} P${i + 1}: ${p.substring(0, 50)}... ${conf}`);
  });
  
  // Conclusão
  if (taxaSucesso >= 90) {
    console.log(chalk.green.bold('\n🎉 EXCELENTE! Sistema com alta acurácia (>90%)'));
  } else if (taxaSucesso >= 70) {
    console.log(chalk.yellow.bold('\n⚠️ BOM! Sistema funcionando mas pode melhorar (70-90%)'));
  } else {
    console.log(chalk.red.bold('\n❌ ATENÇÃO! Sistema precisa de ajustes (<70%)'));
  }
}

// Execute os testes
console.log(chalk.gray('Iniciando testes em 3 segundos...'));
setTimeout(() => {
  runAllTests().catch(error => {
    console.error(chalk.red('❌ Erro fatal:', error));
    process.exit(1);
  });
}, 3000);