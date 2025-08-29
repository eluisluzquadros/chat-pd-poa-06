#!/usr/bin/env node

import { createClient } from '@supabase/supabase-js';
import fetch from 'node-fetch';
import dotenv from 'dotenv';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

dotenv.config({ path: path.join(__dirname, '..', '.env.local') });

const SUPABASE_URL = process.env.SUPABASE_URL;
const SUPABASE_ANON_KEY = process.env.SUPABASE_ANON_KEY;
const SUPABASE_SERVICE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY;

const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_KEY);

console.log('⚡ VALIDAÇÃO RÁPIDA DA BASE DE CONHECIMENTO');
console.log('==========================================\n');

// Testar apenas casos representativos de cada categoria
const testSamples = [
  { category: 'altura_maxima', question: 'Qual a altura máxima no Centro Histórico?', keywords: ['altura', 'metros', 'centro'] },
  { category: 'bairros', question: 'Quais são os índices do bairro Moinhos de Vento?', keywords: ['moinhos', 'índices', 'coeficiente'] },
  { category: 'coeficiente_aproveitamento', question: 'O que é coeficiente de aproveitamento?', keywords: ['coeficiente', 'aproveitamento', 'construir'] },
  { category: 'conceitual', question: 'O que é o Plano Diretor?', keywords: ['plano', 'diretor', 'urbano'] },
  { category: 'geral', question: 'O que são ZEIS?', keywords: ['zeis', 'social', 'habitação'] },
  { category: 'luos', question: 'Qual artigo trata sobre recuos?', keywords: ['artigo', 'recuo', 'afastamento'] },
  { category: 'regime_urbanistico', question: 'Qual o regime urbanístico do Centro?', keywords: ['regime', 'centro', 'zot'] },
  { category: 'riscos', question: 'Quais áreas têm risco de inundação?', keywords: ['risco', 'inundação', 'enchente'] },
  { category: 'zot', question: 'O que é ZOT?', keywords: ['zot', 'zona', 'ocupação'] },
  { category: 'zoneamento', question: 'Quantas zonas existem em Porto Alegre?', keywords: ['zona', 'porto alegre', 'quantidade'] }
];

async function testCategory(sample) {
  const start = Date.now();
  
  try {
    const response = await fetch(`${SUPABASE_URL}/functions/v1/agentic-rag`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${SUPABASE_ANON_KEY}`,
      },
      body: JSON.stringify({
        query: sample.question,
        sessionId: 'validation-test',
        bypassCache: false,
        model: 'openai/gpt-3.5-turbo'
      })
    });
    
    const result = await response.json();
    const time = Date.now() - start;
    
    // Verificar palavras-chave
    const responseText = (result.response || '').toLowerCase();
    const foundKeywords = sample.keywords.filter(k => responseText.includes(k));
    const score = foundKeywords.length / sample.keywords.length;
    
    return {
      category: sample.category,
      question: sample.question,
      passed: score >= 0.5,
      score: score,
      time: time,
      confidence: result.confidence || 0,
      response: result.response ? result.response.substring(0, 100) : 'Sem resposta'
    };
    
  } catch (error) {
    return {
      category: sample.category,
      question: sample.question,
      passed: false,
      score: 0,
      time: Date.now() - start,
      error: error.message
    };
  }
}

async function runValidation() {
  const results = [];
  
  console.log('📝 Testando categorias principais...\n');
  
  for (const sample of testSamples) {
    process.stdout.write(`${sample.category}: `);
    
    const result = await testCategory(sample);
    results.push(result);
    
    if (result.passed) {
      console.log(`✅ ${(result.score * 100).toFixed(0)}% (${result.time}ms)`);
    } else {
      console.log(`❌ ${(result.score * 100).toFixed(0)}% (${result.time}ms)`);
    }
    
    await new Promise(r => setTimeout(r, 500));
  }
  
  // Estatísticas
  console.log('\n📊 RESULTADOS DA VALIDAÇÃO:');
  console.log('=============================');
  
  const passed = results.filter(r => r.passed).length;
  const avgScore = results.reduce((sum, r) => sum + r.score, 0) / results.length;
  const avgTime = results.reduce((sum, r) => sum + r.time, 0) / results.length;
  const avgConfidence = results.reduce((sum, r) => sum + (r.confidence || 0), 0) / results.length;
  
  console.log(`\nCategorias testadas: ${results.length}`);
  console.log(`✅ Passou: ${passed}/${results.length} (${(passed/results.length*100).toFixed(0)}%)`);
  console.log(`📊 Score médio: ${(avgScore * 100).toFixed(1)}%`);
  console.log(`🎯 Confiança média: ${(avgConfidence * 100).toFixed(1)}%`);
  console.log(`⏱️ Tempo médio: ${avgTime.toFixed(0)}ms`);
  
  // Detalhes por categoria
  console.log('\n📂 DETALHES POR CATEGORIA:');
  console.log('─'.repeat(50));
  
  for (const result of results) {
    const status = result.passed ? '✅' : '❌';
    console.log(`\n${status} ${result.category}:`);
    console.log(`   Score: ${(result.score * 100).toFixed(0)}%`);
    console.log(`   Tempo: ${result.time}ms`);
    if (result.error) {
      console.log(`   Erro: ${result.error}`);
    } else {
      console.log(`   Preview: ${result.response}...`);
    }
  }
  
  // Comparação com baseline
  const currentAccuracy = (passed / results.length) * 100;
  const baselineAccuracy = 20; // Acurácia anterior em /admin/quality
  
  console.log('\n🎯 COMPARAÇÃO COM BASELINE:');
  console.log('─'.repeat(50));
  console.log(`Acurácia anterior (/admin/quality): ${baselineAccuracy}%`);
  console.log(`Acurácia atual: ${currentAccuracy.toFixed(1)}%`);
  
  if (currentAccuracy > baselineAccuracy) {
    const improvement = currentAccuracy - baselineAccuracy;
    console.log(`\n🎉 MELHORIA DE ${improvement.toFixed(1)} PONTOS PERCENTUAIS!`);
    console.log('✅ BASE DE CONHECIMENTO SIGNIFICATIVAMENTE MELHORADA!');
  }
  
  // Avaliação final
  console.log('\n📈 AVALIAÇÃO FINAL:');
  console.log('─'.repeat(50));
  
  if (currentAccuracy >= 80) {
    console.log('✅ EXCELENTE - Base está muito boa!');
  } else if (currentAccuracy >= 60) {
    console.log('🟡 BOM - Base funcional');
  } else if (currentAccuracy >= 40) {
    console.log('⚠️ REGULAR - Precisa melhorias');
  } else {
    console.log('❌ RUIM - Problemas críticos');
  }
  
  // Salvar resumo no banco
  const summary = {
    timestamp: new Date().toISOString(),
    categories_tested: results.length,
    passed: passed,
    accuracy: currentAccuracy,
    avg_score: avgScore,
    avg_confidence: avgConfidence,
    avg_time: avgTime,
    improvement_from_baseline: currentAccuracy - baselineAccuracy,
    details: results
  };
  
  // Salvar no banco como metadata de teste
  const { error } = await supabase
    .from('qa_validation_results')
    .insert({
      model: 'openai/gpt-3.5-turbo',
      accuracy: currentAccuracy,
      categories_passed: passed,
      total_categories: results.length,
      avg_score: avgScore,
      avg_confidence: avgConfidence,
      avg_response_time: avgTime,
      metadata: summary
    });
  
  if (!error) {
    console.log('\n💾 Resultados salvos no banco para análise');
  }
  
  console.log('\n📝 PRÓXIMOS PASSOS:');
  console.log('1. Verificar resultados detalhados em /admin/quality');
  console.log('2. Implementar reinforcement learning');
  console.log('3. Ajustar respostas das categorias com baixo score');
}

runValidation().catch(console.error);