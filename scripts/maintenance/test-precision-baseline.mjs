#!/usr/bin/env node

/**
 * TESTE DE PRECISÃO BASELINE
 * Mede a precisão atual do sistema após resolver rate limits
 */

import fetch from 'node-fetch';
import dotenv from 'dotenv';
import chalk from 'chalk';

dotenv.config({ path: '.env' });

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || 'https://ngrqwmvuhvjkeohesbxs.supabase.co';
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

// 15 perguntas críticas mencionadas pelo usuário
const CRITICAL_QUESTIONS = [
  "escreva um resumo de até 25 palavras sobre a lei do plano diretor urbano sustentável",
  "qual é a altura máxima e coef. básico e máx do aberta dos morros?",
  "Quantos bairros estão 'Protegidos pelo Sistema Atual' para precipitação máxima 1h",
  "Qual artigo da LUOS trata da Certificação em Sustentabilidade Ambiental?",
  "Como o Regime Volumétrico é tratado na LUOS?",
  "o que afirma literalmente o Art 1º da LUOS?",
  "do que se trata o Art. 119 da LUOS?",
  "o Art. 3º O Plano Diretor Urbano Sustentável de Porto Alegre é estruturado a partir de princípios fundamentais. Quais são?",
  "o que posso construir no bairro Petrópolis",
  "qual a altura máxima da construção dos prédios em Porto Alegre",
  "o que diz o artigo 38 da luos?",
  "o que diz o artigo 5?",
  "resuma a parte I do plano diretor",
  "resuma o conteúdo do título 1 do pdus",
  "o que diz o artigo 1 do pdus"
];

/**
 * Call chat endpoint
 */
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
        session_id: `test-${Date.now()}`,
        model: 'openai/gpt-4-turbo-preview',
        bypassCache: true
      }),
      timeout: 45000
    });
    
    if (!response.ok) {
      const error = await response.text();
      return {
        success: false,
        error: `HTTP ${response.status}`,
        time: Date.now() - startTime
      };
    }
    
    const data = await response.json();
    
    // Check if response has specific content
    const hasSpecificContent = 
      data.response && 
      data.response.length > 100 &&
      !data.response.includes('não foi possível encontrar') &&
      !data.response.includes('erro ao processar') &&
      (data.response.includes('Art.') || 
       data.response.includes('altura') ||
       data.response.includes('PDUS') ||
       data.response.includes('LUOS') ||
       data.response.includes('ZOT'));
    
    return {
      success: true,
      hasSpecificContent,
      confidence: data.confidence || 0,
      responseLength: data.response?.length || 0,
      time: Date.now() - startTime,
      preview: data.response?.substring(0, 100)
    };
  } catch (error) {
    return {
      success: false,
      error: error.message,
      time: Date.now() - startTime
    };
  }
}

/**
 * Run precision test
 */
async function runPrecisionTest() {
  console.log(chalk.bold.cyan('\n' + '=' .repeat(70)));
  console.log(chalk.bold.cyan('📊 TESTE DE PRECISÃO BASELINE - 15 PERGUNTAS CRÍTICAS'));
  console.log(chalk.bold.cyan('=' .repeat(70)));
  
  console.log(chalk.yellow('\n⏳ Testando sistema após renovação de créditos...\n'));
  
  const results = [];
  let successCount = 0;
  let contentCount = 0;
  let totalTime = 0;
  let totalConfidence = 0;
  
  for (let i = 0; i < CRITICAL_QUESTIONS.length; i++) {
    const query = CRITICAL_QUESTIONS[i];
    process.stdout.write(chalk.gray(`Q${i + 1}: "${query.substring(0, 40)}..." `));
    
    const result = await testQuery(query);
    results.push({ query, ...result });
    
    if (result.success) {
      successCount++;
      totalTime += result.time;
      totalConfidence += result.confidence;
      
      if (result.hasSpecificContent) {
        contentCount++;
        console.log(chalk.green(`✅ OK (${(result.time/1000).toFixed(1)}s)`));
      } else {
        console.log(chalk.yellow(`⚠️ Generic (${(result.time/1000).toFixed(1)}s)`));
      }
    } else {
      console.log(chalk.red(`❌ ${result.error}`));
    }
    
    // Small delay to avoid overwhelming the API
    await new Promise(resolve => setTimeout(resolve, 1000));
  }
  
  // Calculate metrics
  const successRate = (successCount / CRITICAL_QUESTIONS.length) * 100;
  const contentRate = (contentCount / CRITICAL_QUESTIONS.length) * 100;
  const avgTime = successCount > 0 ? totalTime / successCount : 0;
  const avgConfidence = successCount > 0 ? totalConfidence / successCount : 0;
  
  console.log(chalk.bold.cyan('\n' + '=' .repeat(70)));
  console.log(chalk.bold.cyan('📈 RESULTADOS'));
  console.log(chalk.bold.cyan('=' .repeat(70)));
  
  console.log(chalk.white('\n📊 Métricas Gerais:'));
  console.log(`  Taxa de Sucesso: ${successRate.toFixed(1)}% (${successCount}/${CRITICAL_QUESTIONS.length})`);
  console.log(`  Taxa de Conteúdo Válido: ${contentRate.toFixed(1)}% (${contentCount}/${CRITICAL_QUESTIONS.length})`);
  console.log(`  Tempo Médio: ${(avgTime/1000).toFixed(1)}s`);
  console.log(`  Confiança Média: ${(avgConfidence * 100).toFixed(1)}%`);
  
  // Analysis
  console.log(chalk.white('\n📝 Análise:'));
  
  if (contentRate >= 95) {
    console.log(chalk.bold.green('✅ META ATINGIDA! Sistema com 95%+ de precisão!'));
  } else if (contentRate >= 80) {
    console.log(chalk.yellow(`⚠️ Próximo da meta. Faltam ${(95 - contentRate).toFixed(1)}% para 95%`));
  } else if (contentRate >= 50) {
    console.log(chalk.yellow(`⚠️ Sistema funcional mas precisa melhorias. Gap: ${(95 - contentRate).toFixed(1)}%`));
  } else {
    console.log(chalk.red(`❌ Sistema precisa melhorias significativas. Gap: ${(95 - contentRate).toFixed(1)}%`));
  }
  
  // Identify problem areas
  const failures = results.filter(r => !r.hasSpecificContent);
  if (failures.length > 0) {
    console.log(chalk.white('\n🔍 Queries Problemáticas:'));
    failures.slice(0, 5).forEach((f, i) => {
      console.log(`  ${i + 1}. "${f.query.substring(0, 50)}..."`);
      if (f.preview) {
        console.log(chalk.gray(`     → ${f.preview.substring(0, 60)}...`));
      }
    });
  }
  
  // Recommendations
  console.log(chalk.white('\n💡 Recomendações para Atingir 95%:'));
  
  if (avgTime > 10000) {
    console.log('  • Otimizar performance (tempo médio muito alto)');
  }
  
  if (avgConfidence < 0.85) {
    console.log('  • Melhorar confidence scoring e validação');
  }
  
  if (contentRate < 95) {
    const gap = 95 - contentRate;
    if (gap > 30) {
      console.log('  • Implementar query understanding genérico');
      console.log('  • Adicionar multi-strategy search');
      console.log('  • Implementar re-ranking semântico');
    } else if (gap > 15) {
      console.log('  • Melhorar extração de entidades');
      console.log('  • Adicionar validação de qualidade');
    } else {
      console.log('  • Ajuste fino em prompt engineering');
      console.log('  • Otimizar ranking de resultados');
    }
  }
  
  console.log(chalk.bold.cyan('\n' + '=' .repeat(70)));
  console.log(chalk.white('📊 PRECISÃO ATUAL:', chalk.bold(`${contentRate.toFixed(1)}%`)));
  console.log(chalk.white('🎯 META:', chalk.bold('95.0%')));
  console.log(chalk.white('📈 GAP:', chalk.bold(`${Math.max(0, 95 - contentRate).toFixed(1)}%`)));
  console.log(chalk.bold.cyan('=' .repeat(70)));
}

// Execute
runPrecisionTest().catch(error => {
  console.error(chalk.red('❌ Erro:', error));
  process.exit(1);
});