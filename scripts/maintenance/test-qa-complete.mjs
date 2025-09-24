#!/usr/bin/env node

import fetch from 'node-fetch';
import { config } from 'dotenv';
import { fileURLToPath } from 'url';
import path from 'path';
import fs from 'fs';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

config({ path: path.join(__dirname, '..', '.env.local') });

const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL;
const SUPABASE_ANON_KEY = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

// Function to test a single query with retry logic
async function testQuery(testCase, retries = 2) {
  const startTime = Date.now();
  
  for (let attempt = 1; attempt <= retries; attempt++) {
    try {
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), 20000); // 20s timeout
      
      const response = await fetch(`${SUPABASE_URL}/functions/v1/agentic-rag`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${SUPABASE_ANON_KEY}`,
        },
        body: JSON.stringify({
          query: testCase.pergunta,
          bypassCache: false, // Use cache for faster results
          model: 'anthropic/claude-3-5-sonnet-20241022'
        }),
        signal: controller.signal
      });
      
      clearTimeout(timeoutId);
      const elapsedTime = Date.now() - startTime;
      
      if (!response.ok) {
        if (attempt === retries) {
          return {
            ...testCase,
            resultado: 'erro',
            erro: `HTTP ${response.status}`,
            tempo: elapsedTime
          };
        }
        continue; // Retry
      }
      
      const data = await response.json();
      
      return {
        ...testCase,
        resultado: 'sucesso',
        resposta: data.response?.substring(0, 200),
        tempo: elapsedTime,
        confidence: data.confidence
      };
      
    } catch (error) {
      if (attempt === retries) {
        return {
          ...testCase,
          resultado: 'erro',
          erro: error.message,
          tempo: Date.now() - startTime
        };
      }
      // Wait before retry
      await new Promise(resolve => setTimeout(resolve, 1000));
    }
  }
}

// Process tests in batches
async function processBatch(batch, batchNumber, totalBatches) {
  console.log(`\n📦 Lote ${batchNumber}/${totalBatches} (${batch.length} testes)`);
  
  const results = [];
  for (let i = 0; i < batch.length; i++) {
    const test = batch[i];
    process.stdout.write(`  ${i + 1}/${batch.length} - ${test.pergunta.substring(0, 30)}... `);
    
    const result = await testQuery(test);
    results.push(result);
    
    if (result.resultado === 'sucesso') {
      console.log(`✅ ${result.tempo}ms`);
    } else {
      console.log(`❌ ${result.erro}`);
    }
    
    // Small delay between tests
    await new Promise(resolve => setTimeout(resolve, 500));
  }
  
  return results;
}

async function runCompleteTest() {
  console.log('🚀 TESTE COMPLETO DO SISTEMA RAG');
  console.log('=' .repeat(60));
  
  // Load all test cases
  const testFilePath = path.join(__dirname, '..', 'data', 'qa_test_cases.json');
  
  let allTests = [];
  try {
    const fileContent = fs.readFileSync(testFilePath, 'utf8');
    allTests = JSON.parse(fileContent);
    console.log(`\n📋 Total de casos de teste carregados: ${allTests.length}`);
  } catch (error) {
    console.error('❌ Erro ao carregar casos de teste:', error.message);
    process.exit(1);
  }
  
  // Process in batches of 10
  const batchSize = 10;
  const batches = [];
  for (let i = 0; i < allTests.length; i += batchSize) {
    batches.push(allTests.slice(i, i + batchSize));
  }
  
  console.log(`📊 Dividido em ${batches.length} lotes de até ${batchSize} testes`);
  console.log(`⏱️  Tempo estimado: ${Math.ceil(allTests.length * 8 / 60)} minutos`);
  
  // Process all batches
  const allResults = [];
  for (let i = 0; i < batches.length; i++) {
    const batchResults = await processBatch(batches[i], i + 1, batches.length);
    allResults.push(...batchResults);
    
    // Pause between batches
    if (i < batches.length - 1) {
      console.log('   ⏳ Pausa entre lotes...');
      await new Promise(resolve => setTimeout(resolve, 2000));
    }
  }
  
  // Generate statistics
  const stats = {
    total: allResults.length,
    sucesso: allResults.filter(r => r.resultado === 'sucesso').length,
    erro: allResults.filter(r => r.resultado === 'erro').length,
    tempoMedio: Math.round(allResults.reduce((sum, r) => sum + (r.tempo || 0), 0) / allResults.length),
    porCategoria: {}
  };
  
  // Group by category
  allResults.forEach(result => {
    const categoria = result.categoria || 'geral';
    if (!stats.porCategoria[categoria]) {
      stats.porCategoria[categoria] = {
        total: 0,
        sucesso: 0,
        erro: 0
      };
    }
    stats.porCategoria[categoria].total++;
    if (result.resultado === 'sucesso') {
      stats.porCategoria[categoria].sucesso++;
    } else {
      stats.porCategoria[categoria].erro++;
    }
  });
  
  // Print summary
  console.log('\n' + '='.repeat(60));
  console.log('📊 RELATÓRIO FINAL');
  console.log('='.repeat(60));
  
  const taxaSucesso = ((stats.sucesso / stats.total) * 100).toFixed(1);
  console.log(`\n📈 Taxa de Sucesso Geral: ${taxaSucesso}%`);
  console.log(`   ✅ Sucesso: ${stats.sucesso}/${stats.total}`);
  console.log(`   ❌ Erro: ${stats.erro}/${stats.total}`);
  console.log(`   ⏱️  Tempo médio: ${stats.tempoMedio}ms`);
  
  console.log('\n📂 Por Categoria:');
  Object.entries(stats.porCategoria).forEach(([categoria, dados]) => {
    const taxaCat = ((dados.sucesso / dados.total) * 100).toFixed(1);
    console.log(`   ${categoria}: ${taxaCat}% (${dados.sucesso}/${dados.total})`);
  });
  
  // Save detailed results
  const timestamp = new Date().toISOString().replace(/:/g, '-').split('.')[0];
  const reportPath = path.join(__dirname, '..', 'test-reports', `complete-test-${timestamp}.json`);
  
  try {
    const reportDir = path.dirname(reportPath);
    if (!fs.existsSync(reportDir)) {
      fs.mkdirSync(reportDir, { recursive: true });
    }
    
    fs.writeFileSync(reportPath, JSON.stringify({
      timestamp: new Date().toISOString(),
      stats,
      results: allResults
    }, null, 2));
    
    console.log(`\n📁 Relatório detalhado salvo em: ${reportPath}`);
  } catch (error) {
    console.error('❌ Erro ao salvar relatório:', error.message);
  }
  
  // Final verdict
  console.log('\n' + '='.repeat(60));
  if (taxaSucesso >= 80) {
    console.log('✅ SISTEMA APROVADO - Taxa de sucesso acima de 80%');
  } else if (taxaSucesso >= 60) {
    console.log('⚠️  SISTEMA PARCIALMENTE APROVADO - Taxa entre 60-80%');
  } else {
    console.log('❌ SISTEMA REPROVADO - Taxa abaixo de 60%');
  }
  console.log('='.repeat(60));
}

// Run the complete test
runCompleteTest().catch(error => {
  console.error('💥 Erro fatal:', error);
  process.exit(1);
});