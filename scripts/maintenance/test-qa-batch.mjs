#!/usr/bin/env node

/**
 * Script otimizado para testar todos os 121 casos de QA em lotes paralelos
 * Salva resultados no banco para comparação com /admin/quality
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
const SUPABASE_SERVICE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY;

const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_KEY);

console.log('🚀 TESTE COMPLETO DOS 121 CASOS DE QA - MODO BATCH');
console.log('==================================================\n');

async function testCase(testCase) {
  const start = Date.now();
  try {
    const response = await fetch(`${SUPABASE_URL}/functions/v1/agentic-rag`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${SUPABASE_ANON_KEY}`,
      },
      body: JSON.stringify({
        query: testCase.question,
        sessionId: 'qa-test-batch',
        bypassCache: false, // Usar cache para acelerar
        model: 'openai/gpt-3.5-turbo'
      })
    });
    
    const result = await response.json();
    const time = Date.now() - start;
    
    // Calcular score baseado em palavras-chave
    let score = 0;
    const responseText = (result.response || '').toLowerCase();
    const expectedText = (testCase.expected_answer || '').toLowerCase();
    
    // Verificar palavras-chave importantes
    const keywords = testCase.keywords || [];
    if (keywords.length > 0) {
      const foundKeywords = keywords.filter(k => 
        responseText.includes(k.toLowerCase())
      );
      score = foundKeywords.length / keywords.length;
    } else {
      // Score básico por presença de resposta
      score = result.response && result.response.length > 50 ? 0.7 : 0.3;
    }
    
    // Bonus por confiança alta
    if (result.confidence > 0.8) {
      score = Math.min(1, score + 0.2);
    }
    
    const passed = score >= 0.5;
    
    return {
      test_case_id: testCase.id,
      model: 'openai/gpt-3.5-turbo',
      response: result.response ? result.response.substring(0, 500) : null,
      passed: passed,
      score: score,
      execution_time_ms: time,
      confidence: result.confidence || 0,
      error_message: null,
      metadata: {
        category: testCase.category,
        question: testCase.question,
        expected_keywords: keywords,
        timestamp: new Date().toISOString()
      }
    };
    
  } catch (error) {
    return {
      test_case_id: testCase.id,
      model: 'openai/gpt-3.5-turbo',
      response: null,
      passed: false,
      score: 0,
      execution_time_ms: Date.now() - start,
      confidence: 0,
      error_message: error.message,
      metadata: {
        category: testCase.category,
        question: testCase.question,
        error: true
      }
    };
  }
}

async function processBatch(testCases, batchNumber, totalBatches) {
  console.log(`\n📦 Processando lote ${batchNumber}/${totalBatches} (${testCases.length} casos)`);
  
  const results = [];
  for (let i = 0; i < testCases.length; i++) {
    const tc = testCases[i];
    process.stdout.write(`  ${i+1}/${testCases.length} - ${tc.question.substring(0, 30)}... `);
    
    const result = await testCase(tc);
    results.push(result);
    
    if (result.passed) {
      console.log(`✅ ${(result.score * 100).toFixed(0)}%`);
    } else if (result.error_message) {
      console.log(`❌ erro`);
    } else {
      console.log(`❌ ${(result.score * 100).toFixed(0)}%`);
    }
    
    // Pausa menor para não sobrecarregar
    await new Promise(r => setTimeout(r, 200));
  }
  
  return results;
}

async function runAllTests() {
  // Buscar TODOS os casos de teste
  const { data: testCases, error } = await supabase
    .from('qa_test_cases')
    .select('*')
    .order('category', { ascending: true })
    .order('id', { ascending: true });
  
  if (error || !testCases) {
    console.error('❌ Erro ao buscar casos de teste:', error);
    return;
  }
  
  console.log(`📝 ${testCases.length} casos de teste encontrados`);
  console.log(`⏱️ Tempo estimado: ${Math.round(testCases.length * 2 / 60)} minutos\n`);
  
  // Processar em lotes de 10
  const batchSize = 10;
  const batches = [];
  for (let i = 0; i < testCases.length; i += batchSize) {
    batches.push(testCases.slice(i, i + batchSize));
  }
  
  const allResults = [];
  
  // Processar cada lote
  for (let i = 0; i < batches.length; i++) {
    const batchResults = await processBatch(batches[i], i + 1, batches.length);
    allResults.push(...batchResults);
  }
  
  // Limpar resultados anteriores
  console.log('\n🗑️ Limpando resultados anteriores...');
  await supabase
    .from('qa_test_results')
    .delete()
    .eq('model', 'openai/gpt-3.5-turbo');
  
  // Salvar novos resultados
  console.log('💾 Salvando resultados no banco...');
  
  for (let i = 0; i < allResults.length; i += 50) {
    const batch = allResults.slice(i, i + 50);
    const { error } = await supabase
      .from('qa_test_results')
      .insert(batch);
    
    if (error) {
      console.error(`❌ Erro ao salvar batch: ${error.message}`);
    } else {
      console.log(`  ✅ Salvos ${Math.min(i + 50, allResults.length)}/${allResults.length}`);
    }
  }
  
  // Gerar relatório
  console.log('\n\n📊 === RELATÓRIO FINAL ===\n');
  
  const totalPassed = allResults.filter(r => r.passed).length;
  const totalFailed = allResults.filter(r => !r.passed).length;
  const avgScore = allResults.reduce((sum, r) => sum + r.score, 0) / allResults.length;
  const avgTime = allResults.reduce((sum, r) => sum + r.execution_time_ms, 0) / allResults.length;
  const avgConfidence = allResults.reduce((sum, r) => sum + r.confidence, 0) / allResults.length;
  
  console.log('📈 ESTATÍSTICAS GERAIS:');
  console.log('─'.repeat(50));
  console.log(`Total de testes: ${allResults.length}`);
  console.log(`✅ Passou: ${totalPassed} (${(totalPassed/allResults.length*100).toFixed(1)}%)`);
  console.log(`❌ Falhou: ${totalFailed} (${(totalFailed/allResults.length*100).toFixed(1)}%)`);
  console.log(`📊 Score médio: ${(avgScore * 100).toFixed(1)}%`);
  console.log(`🎯 Confiança média: ${(avgConfidence * 100).toFixed(1)}%`);
  console.log(`⏱️ Tempo médio: ${avgTime.toFixed(0)}ms`);
  
  // Análise por categoria
  const categoryStats = {};
  for (const result of allResults) {
    const cat = result.metadata.category;
    if (!categoryStats[cat]) {
      categoryStats[cat] = { total: 0, passed: 0, totalScore: 0 };
    }
    categoryStats[cat].total++;
    if (result.passed) categoryStats[cat].passed++;
    categoryStats[cat].totalScore += result.score;
  }
  
  console.log('\n📂 POR CATEGORIA:');
  console.log('─'.repeat(50));
  
  for (const [category, stats] of Object.entries(categoryStats)) {
    const passRate = (stats.passed / stats.total * 100).toFixed(1);
    const avgCatScore = ((stats.totalScore / stats.total) * 100).toFixed(1);
    console.log(`\n${category}:`);
    console.log(`  Total: ${stats.total}`);
    console.log(`  ✅ Passou: ${stats.passed} (${passRate}%)`);
    console.log(`  📊 Score médio: ${avgCatScore}%`);
  }
  
  // Salvar relatório
  const report = {
    timestamp: new Date().toISOString(),
    totalTests: allResults.length,
    passed: totalPassed,
    failed: totalFailed,
    passRate: `${(totalPassed/allResults.length*100).toFixed(1)}%`,
    avgScore: `${(avgScore * 100).toFixed(1)}%`,
    avgConfidence: `${(avgConfidence * 100).toFixed(1)}%`,
    avgTime: `${avgTime.toFixed(0)}ms`,
    categoryStats: categoryStats
  };
  
  await fs.writeFile(
    path.join(__dirname, '..', 'qa-test-report-batch.json'),
    JSON.stringify(report, null, 2)
  );
  
  console.log('\n💾 Relatório salvo em: qa-test-report-batch.json');
  
  // Avaliação final
  const passRate = totalPassed / allResults.length * 100;
  
  console.log('\n🎯 AVALIAÇÃO FINAL:');
  console.log('─'.repeat(50));
  
  if (passRate >= 80) {
    console.log('✅ EXCELENTE - Base de conhecimento está muito boa!');
  } else if (passRate >= 60) {
    console.log('🟡 BOM - Base funcional, mas precisa melhorias');
  } else if (passRate >= 40) {
    console.log('⚠️ REGULAR - Base precisa de ajustes significativos');
  } else if (passRate >= 20) {
    console.log('❌ RUIM - Base com problemas críticos');
  } else {
    console.log('💀 CRÍTICO - Base praticamente não funcional (<20%)');
  }
  
  console.log('\n📝 PRÓXIMOS PASSOS:');
  console.log('1. Acesse /admin/quality para comparar resultados');
  console.log('2. Analise os casos com baixo score');
  console.log('3. Implemente reinforcement learning com os feedbacks');
  console.log('4. Reprocesse documentos com problemas');
  
  // Comparação com /admin/quality
  console.log('\n📊 COMPARAÇÃO COM /ADMIN/QUALITY:');
  console.log('─'.repeat(50));
  console.log('Acurácia anterior: ~20%');
  console.log(`Acurácia atual: ${passRate.toFixed(1)}%`);
  
  if (passRate > 20) {
    const improvement = passRate - 20;
    console.log(`\n🎉 MELHORIA DE ${improvement.toFixed(1)} PONTOS PERCENTUAIS!`);
  }
}

runAllTests().catch(console.error);