#!/usr/bin/env node

import { createClient } from '@supabase/supabase-js';
import fetch from 'node-fetch';
import { config } from 'dotenv';
import { fileURLToPath } from 'url';
import path from 'path';
import fs from 'fs';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

config({ path: path.join(__dirname, '.env.local') });

const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL;
const SUPABASE_ANON_KEY = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

const supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY);

// Test a single case
async function testCase(testCase) {
  const start = Date.now();
  
  try {
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 25000); // 25s timeout
    
    const response = await fetch(`${SUPABASE_URL}/functions/v1/agentic-rag`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${SUPABASE_ANON_KEY}`,
      },
      body: JSON.stringify({
        query: testCase.question,
        sessionId: 'test-complete',
        bypassCache: false // Use cache for performance
      }),
      signal: controller.signal
    });
    
    clearTimeout(timeoutId);
    
    if (!response.ok) {
      return { 
        id: testCase.id,
        success: false, 
        error: `HTTP ${response.status}`,
        time: Date.now() - start
      };
    }
    
    const result = await response.json();
    const time = Date.now() - start;
    const success = result.response && result.response.length > 10;
    
    return { 
      id: testCase.id,
      success, 
      time, 
      confidence: result.confidence || 0,
      response: result.response ? result.response.substring(0, 150) : '',
      category: testCase.category
    };
  } catch (error) {
    return { 
      id: testCase.id,
      success: false, 
      error: error.message,
      time: Date.now() - start,
      category: testCase.category
    };
  }
}

async function runCompleteTest() {
  console.log('🚀 TESTE COMPLETO - TODOS OS 121 CASOS');
  console.log('=' .repeat(60));
  
  // Fetch all test cases from database
  console.log('\n📋 Carregando casos de teste do banco de dados...');
  const { data: testCases, error } = await supabase
    .from('qa_test_cases')
    .select('*')
    .order('category', { ascending: true })
    .order('id', { ascending: true });
  
  if (error || !testCases) {
    console.error('❌ Erro ao buscar casos de teste:', error);
    return;
  }
  
  console.log(`✅ ${testCases.length} casos carregados`);
  console.log(`⏱️  Tempo estimado: ${Math.round(testCases.length * 10 / 60)} minutos\n`);
  
  // Group by category
  const categories = [...new Set(testCases.map(tc => tc.category))];
  const results = [];
  const categoryStats = {};
  
  // Process each category
  for (const category of categories) {
    const categoryTests = testCases.filter(tc => tc.category === category);
    console.log(`\n📂 ${category} (${categoryTests.length} testes)`);
    
    categoryStats[category] = {
      total: categoryTests.length,
      passed: 0,
      failed: 0,
      totalTime: 0
    };
    
    // Process tests in the category
    for (let i = 0; i < categoryTests.length; i++) {
      const tc = categoryTests[i];
      process.stdout.write(`  ${i + 1}/${categoryTests.length} - ${tc.question.substring(0, 40)}... `);
      
      const result = await testCase(tc);
      results.push(result);
      
      if (result.success) {
        console.log(`✅ ${result.time}ms`);
        categoryStats[category].passed++;
      } else {
        console.log(`❌ ${result.error || 'Failed'}`);
        categoryStats[category].failed++;
      }
      
      categoryStats[category].totalTime += result.time || 0;
      
      // Small delay between tests to avoid overwhelming the server
      await new Promise(resolve => setTimeout(resolve, 500));
    }
    
    // Category summary
    const catRate = ((categoryStats[category].passed / categoryStats[category].total) * 100).toFixed(1);
    const avgTime = Math.round(categoryStats[category].totalTime / categoryStats[category].total);
    console.log(`  📊 Categoria ${category}: ${catRate}% sucesso, tempo médio: ${avgTime}ms`);
  }
  
  // Calculate overall statistics
  const totalTests = results.length;
  const passedTests = results.filter(r => r.success).length;
  const failedTests = results.filter(r => !r.success).length;
  const avgTime = Math.round(results.reduce((sum, r) => sum + (r.time || 0), 0) / totalTests);
  const overallRate = ((passedTests / totalTests) * 100).toFixed(1);
  
  // Print final summary
  console.log('\n' + '='.repeat(60));
  console.log('📊 RELATÓRIO FINAL COMPLETO');
  console.log('='.repeat(60));
  
  console.log(`\n📈 Taxa de Sucesso Geral: ${overallRate}%`);
  console.log(`   ✅ Passou: ${passedTests}/${totalTests}`);
  console.log(`   ❌ Falhou: ${failedTests}/${totalTests}`);
  console.log(`   ⏱️  Tempo médio: ${avgTime}ms`);
  
  console.log('\n📂 Resultados por Categoria:');
  console.log('   ' + '-'.repeat(50));
  
  // Sort categories by success rate
  const sortedCategories = Object.entries(categoryStats)
    .sort((a, b) => {
      const rateA = (a[1].passed / a[1].total) * 100;
      const rateB = (b[1].passed / b[1].total) * 100;
      return rateB - rateA;
    });
  
  sortedCategories.forEach(([category, stats]) => {
    const rate = ((stats.passed / stats.total) * 100).toFixed(1);
    const avgCatTime = Math.round(stats.totalTime / stats.total);
    const emoji = rate >= 80 ? '✅' : rate >= 60 ? '⚠️' : '❌';
    
    console.log(`   ${emoji} ${category.padEnd(25)} ${rate.padStart(6)}% (${stats.passed}/${stats.total}) - ${avgCatTime}ms`);
  });
  
  // Identify problem areas
  console.log('\n🔍 Análise de Problemas:');
  const problemCategories = sortedCategories.filter(([_, stats]) => {
    const rate = (stats.passed / stats.total) * 100;
    return rate < 80;
  });
  
  if (problemCategories.length > 0) {
    console.log('   Categorias com taxa < 80%:');
    problemCategories.forEach(([category, stats]) => {
      const rate = ((stats.passed / stats.total) * 100).toFixed(1);
      console.log(`   • ${category}: ${rate}% (${stats.failed} falhas)`);
    });
  } else {
    console.log('   ✅ Todas as categorias com taxa >= 80%');
  }
  
  // Failed tests details
  const failedResults = results.filter(r => !r.success);
  if (failedResults.length > 0) {
    console.log(`\n❌ Testes que falharam (${failedResults.length}):`);
    const errorTypes = {};
    failedResults.forEach(r => {
      const errorType = r.error || 'Unknown';
      errorTypes[errorType] = (errorTypes[errorType] || 0) + 1;
    });
    
    Object.entries(errorTypes).forEach(([error, count]) => {
      console.log(`   • ${error}: ${count} casos`);
    });
  }
  
  // Save detailed report
  const timestamp = new Date().toISOString().replace(/:/g, '-').split('.')[0];
  const reportPath = path.join(__dirname, 'test-reports', `complete-121-${timestamp}.json`);
  
  try {
    const reportDir = path.dirname(reportPath);
    if (!fs.existsSync(reportDir)) {
      fs.mkdirSync(reportDir, { recursive: true });
    }
    
    fs.writeFileSync(reportPath, JSON.stringify({
      timestamp: new Date().toISOString(),
      summary: {
        total: totalTests,
        passed: passedTests,
        failed: failedTests,
        successRate: overallRate,
        avgResponseTime: avgTime
      },
      byCategory: categoryStats,
      results: results
    }, null, 2));
    
    console.log(`\n📁 Relatório detalhado salvo em: ${reportPath}`);
  } catch (error) {
    console.error('❌ Erro ao salvar relatório:', error.message);
  }
  
  // Final verdict
  console.log('\n' + '='.repeat(60));
  if (overallRate >= 80) {
    console.log('🎉 SISTEMA APROVADO - Taxa de sucesso >= 80%');
  } else if (overallRate >= 60) {
    console.log('⚠️  SISTEMA PARCIALMENTE APROVADO - Taxa entre 60-80%');
  } else {
    console.log('❌ SISTEMA REPROVADO - Taxa < 60%');
  }
  console.log('='.repeat(60));
  
  // Performance assessment
  console.log('\n⚡ Avaliação de Performance:');
  if (avgTime < 5000) {
    console.log('   ✅ Excelente - Tempo médio < 5s');
  } else if (avgTime < 10000) {
    console.log('   ⚠️  Adequado - Tempo médio entre 5-10s');
  } else {
    console.log('   ❌ Lento - Tempo médio > 10s');
  }
  
  console.log('\n✅ Teste completo finalizado!');
}

// Run the complete test
runCompleteTest().catch(error => {
  console.error('💥 Erro fatal:', error);
  process.exit(1);
});