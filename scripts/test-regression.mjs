#!/usr/bin/env node

/**
 * Teste de regressão para garantir que a acurácia não caia abaixo de 85%
 * Executa testes críticos e alerta se houver degradação
 */

import { createClient } from '@supabase/supabase-js';
import fetch from 'node-fetch';
import dotenv from 'dotenv';
import path from 'path';
import { fileURLToPath } from 'url';
import fs from 'fs/promises';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

dotenv.config({ path: path.join(__dirname, '..', '.env.local') });

const SUPABASE_URL = process.env.SUPABASE_URL;
const SUPABASE_ANON_KEY = process.env.SUPABASE_ANON_KEY;

// Limites mínimos de acurácia aceitáveis
const THRESHOLDS = {
  overall: 85,        // Acurácia geral mínima
  critical: 60,       // Acurácia mínima para categorias críticas
  categories: {
    altura_maxima: 60,
    regime_urbanistico: 60,
    coeficiente_aproveitamento: 80,
    conceitual: 90,
    zot: 90
  }
};

// Casos de teste críticos que DEVEM passar
const CRITICAL_TESTS = [
  {
    id: 'altura_centro',
    question: 'Qual a altura máxima no Centro Histórico?',
    mustContain: ['75', 'metro', 'altura'],
    category: 'altura_maxima'
  },
  {
    id: 'coef_aproveitamento',
    question: 'O que é coeficiente de aproveitamento?',
    mustContain: ['coeficiente', 'construir', 'terreno'],
    category: 'coeficiente_aproveitamento'
  },
  {
    id: 'zot_definicao',
    question: 'O que é ZOT?',
    mustContain: ['zona', 'ocupação', 'transitória'],
    category: 'zot'
  },
  {
    id: 'plano_diretor',
    question: 'O que é o Plano Diretor?',
    mustContain: ['plano', 'diretor', 'urbano'],
    category: 'conceitual'
  },
  {
    id: 'regime_centro',
    question: 'Qual o regime urbanístico do Centro?',
    mustContain: ['regime', 'centro'],
    category: 'regime_urbanistico'
  }
];

async function testCase(test) {
  const start = Date.now();
  
  try {
    const response = await fetch(`${SUPABASE_URL}/functions/v1/agentic-rag`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${SUPABASE_ANON_KEY}`,
      },
      body: JSON.stringify({
        query: test.question,
        sessionId: 'regression-test',
        bypassCache: true, // Sempre testar fresh
        model: 'openai/gpt-3.5-turbo'
      })
    });
    
    const result = await response.json();
    const responseText = (result.response || '').toLowerCase();
    
    // Verificar palavras obrigatórias
    const foundWords = test.mustContain.filter(word => 
      responseText.includes(word.toLowerCase())
    );
    
    const passed = foundWords.length >= Math.ceil(test.mustContain.length * 0.6);
    const score = foundWords.length / test.mustContain.length;
    
    return {
      id: test.id,
      category: test.category,
      passed,
      score,
      time: Date.now() - start,
      response: result.response ? result.response.substring(0, 100) : null
    };
    
  } catch (error) {
    return {
      id: test.id,
      category: test.category,
      passed: false,
      score: 0,
      time: Date.now() - start,
      error: error.message
    };
  }
}

async function runRegressionTests() {
  console.log('🔄 TESTE DE REGRESSÃO - CHAT PD POA');
  console.log('=====================================\n');
  console.log(`📅 Data: ${new Date().toLocaleString('pt-BR')}`);
  console.log(`🎯 Threshold mínimo: ${THRESHOLDS.overall}%\n`);
  
  const results = [];
  const categoryScores = {};
  
  console.log('📝 Executando testes críticos...\n');
  
  for (const test of CRITICAL_TESTS) {
    process.stdout.write(`  ${test.id}: `);
    const result = await testCase(test);
    results.push(result);
    
    // Acumular scores por categoria
    if (!categoryScores[test.category]) {
      categoryScores[test.category] = { total: 0, passed: 0, scores: [] };
    }
    categoryScores[test.category].total++;
    if (result.passed) categoryScores[test.category].passed++;
    categoryScores[test.category].scores.push(result.score);
    
    if (result.passed) {
      console.log(`✅ ${(result.score * 100).toFixed(0)}% (${result.time}ms)`);
    } else {
      console.log(`❌ ${(result.score * 100).toFixed(0)}% (${result.time}ms)`);
    }
    
    await new Promise(r => setTimeout(r, 500));
  }
  
  // Calcular estatísticas
  const totalPassed = results.filter(r => r.passed).length;
  const overallAccuracy = (totalPassed / results.length) * 100;
  
  console.log('\n📊 RESULTADOS POR CATEGORIA:');
  console.log('─'.repeat(50));
  
  const failedCategories = [];
  
  for (const [category, stats] of Object.entries(categoryScores)) {
    const accuracy = (stats.passed / stats.total) * 100;
    const avgScore = stats.scores.reduce((a, b) => a + b, 0) / stats.scores.length * 100;
    const threshold = THRESHOLDS.categories[category] || THRESHOLDS.critical;
    
    const status = accuracy >= threshold ? '✅' : '❌';
    console.log(`${status} ${category}: ${accuracy.toFixed(0)}% (mínimo: ${threshold}%)`);
    
    if (accuracy < threshold) {
      failedCategories.push({ category, accuracy, threshold });
    }
  }
  
  console.log('\n📈 RESUMO GERAL:');
  console.log('─'.repeat(50));
  console.log(`Acurácia geral: ${overallAccuracy.toFixed(1)}%`);
  console.log(`Threshold mínimo: ${THRESHOLDS.overall}%`);
  
  // Verificar se passou no teste de regressão
  const passed = overallAccuracy >= THRESHOLDS.overall && failedCategories.length === 0;
  
  if (passed) {
    console.log('\n✅ TESTE DE REGRESSÃO PASSOU!');
    console.log('A acurácia está dentro dos limites aceitáveis.');
  } else {
    console.log('\n❌ TESTE DE REGRESSÃO FALHOU!');
    
    if (overallAccuracy < THRESHOLDS.overall) {
      console.log(`⚠️ Acurácia geral (${overallAccuracy.toFixed(1)}%) está abaixo do mínimo (${THRESHOLDS.overall}%)`);
    }
    
    if (failedCategories.length > 0) {
      console.log('\n⚠️ Categorias com problemas:');
      failedCategories.forEach(cat => {
        console.log(`  - ${cat.category}: ${cat.accuracy.toFixed(0)}% < ${cat.threshold}%`);
      });
    }
    
    console.log('\n🔧 AÇÕES RECOMENDADAS:');
    console.log('1. Verificar últimas mudanças no código');
    console.log('2. Revisar Edge Functions deployment');
    console.log('3. Checar integridade da base de dados');
    console.log('4. Executar scripts/validate-qa-fast.mjs para diagnóstico');
  }
  
  // Salvar resultado para histórico
  const report = {
    timestamp: new Date().toISOString(),
    passed,
    overallAccuracy,
    thresholds: THRESHOLDS,
    categoryScores,
    failedCategories,
    details: results
  };
  
  const reportPath = path.join(__dirname, '..', 'regression-report.json');
  await fs.writeFile(reportPath, JSON.stringify(report, null, 2));
  
  console.log(`\n💾 Relatório salvo em: regression-report.json`);
  
  // Retornar código de saída apropriado
  process.exit(passed ? 0 : 1);
}

// Executar testes
runRegressionTests().catch(error => {
  console.error('❌ Erro ao executar testes:', error);
  process.exit(1);
});