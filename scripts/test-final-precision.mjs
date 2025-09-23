#!/usr/bin/env node

/**
 * TESTE FINAL DE PRECISÃO
 * Valida se o sistema atinge 95% de precisão
 */

import fetch from 'node-fetch';
import dotenv from 'dotenv';
import chalk from 'chalk';

dotenv.config({ path: '.env' });

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || 'https://ngrqwmvuhvjkeohesbxs.supabase.co';
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

// Queries críticas para validação final
const VALIDATION_QUERIES = [
  // Artigos específicos
  "o que diz o artigo 38 da luos?",
  "o que afirma literalmente o Art 1º da LUOS?",
  "o que diz o artigo 1 do pdus",
  
  // Regime urbanístico
  "qual é a altura máxima em petrópolis?",
  "o que posso construir no bairro Petrópolis",
  "qual o coeficiente de aproveitamento no centro?",
  
  // Conceitos
  "Como o Regime Volumétrico é tratado na LUOS?",
  "o que é taxa de ocupação?",
  "definição de sustentabilidade urbana",
  
  // Princípios e diretrizes
  "quais são os princípios fundamentais do plano diretor?",
  "principais diretrizes do PDUS",
  
  // Resumos
  "resuma o título 1 do pdus",
  "resumo das normas ambientais",
  
  // Buscas gerais
  "quais zonas existem na cidade?",
  "altura máxima de construção em Porto Alegre"
];

async function testQuery(query) {
  const startTime = Date.now();
  
  try {
    const response = await fetch(`${supabaseUrl}/functions/v1/agentic-rag`, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${supabaseKey}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        query,
        model: 'openai/gpt-4-turbo-preview',
        bypassCache: true,
        session_id: `test-final-${Date.now()}`
      })
    });
    
    if (!response.ok) {
      return {
        success: false,
        error: `HTTP ${response.status}`,
        time: Date.now() - startTime
      };
    }
    
    const data = await response.json();
    
    // Validação de conteúdo específico
    const hasSpecificContent = 
      data.response && 
      data.response.length > 100 &&
      !data.response.toLowerCase().includes('não foi possível encontrar') &&
      !data.response.toLowerCase().includes('erro ao processar') &&
      !data.response.toLowerCase().includes('desculpe') &&
      (data.response.includes('Art.') || 
       data.response.includes('altura') ||
       data.response.includes('coeficiente') ||
       data.response.includes('PDUS') ||
       data.response.includes('LUOS') ||
       data.response.includes('ZOT') ||
       data.response.includes('zona') ||
       data.response.includes('taxa'));
    
    return {
      success: true,
      hasSpecificContent,
      confidence: data.confidence || 0,
      time: Date.now() - startTime,
      responseLength: data.response?.length || 0
    };
  } catch (error) {
    return {
      success: false,
      error: error.message,
      time: Date.now() - startTime
    };
  }
}

async function runFinalTest() {
  console.log(chalk.bold.cyan('\n' + '=' .repeat(70)));
  console.log(chalk.bold.cyan('🎯 TESTE FINAL DE PRECISÃO - META 95%'));
  console.log(chalk.bold.cyan('=' .repeat(70)));
  
  console.log(chalk.white(`\n📝 Testando ${VALIDATION_QUERIES.length} queries críticas...\n`));
  
  const results = [];
  let successCount = 0;
  let contentCount = 0;
  
  for (let i = 0; i < VALIDATION_QUERIES.length; i++) {
    const query = VALIDATION_QUERIES[i];
    process.stdout.write(`${i + 1}/${VALIDATION_QUERIES.length}: "${query.substring(0, 35)}..." `);
    
    const result = await testQuery(query);
    results.push({ query, ...result });
    
    if (result.success) {
      successCount++;
      if (result.hasSpecificContent) {
        contentCount++;
        console.log(chalk.green(`✅ (${(result.time/1000).toFixed(1)}s)`));
      } else {
        console.log(chalk.yellow(`⚠️ Generic`));
      }
    } else {
      console.log(chalk.red(`❌ ${result.error}`));
    }
    
    // Pequeno delay entre requests
    await new Promise(r => setTimeout(r, 1500));
  }
  
  // Calcular métricas finais
  const precision = (contentCount / VALIDATION_QUERIES.length) * 100;
  
  console.log(chalk.bold.cyan('\n' + '=' .repeat(70)));
  console.log(chalk.bold.cyan('📊 RESULTADO FINAL'));
  console.log(chalk.bold.cyan('=' .repeat(70)));
  
  console.log(chalk.white('\n📈 Métricas:'));
  console.log(`  Queries Testadas: ${VALIDATION_QUERIES.length}`);
  console.log(`  Respostas Válidas: ${contentCount}`);
  console.log(`  Falhas/Genéricas: ${VALIDATION_QUERIES.length - contentCount}`);
  
  console.log(chalk.white('\n🎯 Precisão:'));
  console.log(chalk.bold(`  ATUAL: ${precision.toFixed(1)}%`));
  console.log(chalk.bold(`  META:  95.0%`));
  
  if (precision >= 95) {
    console.log(chalk.bold.green('\n✅ META ATINGIDA! Sistema com 95%+ de precisão!'));
    console.log(chalk.green('O sistema está pronto para produção!'));
  } else if (precision >= 90) {
    console.log(chalk.yellow(`\n⚠️ Muito próximo! Faltam ${(95 - precision).toFixed(1)}% para a meta.`));
    console.log(chalk.yellow('Pequenos ajustes podem elevar a precisão.'));
  } else if (precision >= 80) {
    console.log(chalk.yellow(`\n⚠️ Bom resultado. Gap de ${(95 - precision).toFixed(1)}% para a meta.`));
  } else {
    console.log(chalk.red(`\n❌ Precisão abaixo do esperado. Gap de ${(95 - precision).toFixed(1)}%.`));
  }
  
  // Análise de falhas
  const failures = results.filter(r => !r.hasSpecificContent);
  if (failures.length > 0 && failures.length <= 5) {
    console.log(chalk.white('\n🔍 Queries que falharam:'));
    failures.forEach((f, i) => {
      console.log(`  ${i + 1}. "${f.query}"`);
    });
  }
  
  return precision;
}

// Executar teste
runFinalTest()
  .then(precision => {
    if (precision >= 95) {
      process.exit(0);
    } else {
      process.exit(1);
    }
  })
  .catch(error => {
    console.error(chalk.red('❌ Erro:', error));
    process.exit(1);
  });