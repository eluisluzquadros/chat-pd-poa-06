#!/usr/bin/env node

import fetch from 'node-fetch';
import dotenv from 'dotenv';
import { promises as fs } from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

dotenv.config({ path: path.resolve(__dirname, '.env') });

const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL;
const SUPABASE_ANON_KEY = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
const EDGE_FUNCTION_URL = `${SUPABASE_URL}/functions/v1/agentic-rag`;

// Test queries focusing on critical issues
const testQueries = [
  // 1. Article 119 LUOS - Previously failing
  {
    id: 'art119',
    query: 'O que diz o Art. 119 da LUOS?',
    expectedKeywords: ['projetos', 'protocolados', 'anteriormente', 'disposições transitórias'],
    category: 'Artigo Específico'
  },
  
  // 2. Article 4 LUOS - New content
  {
    id: 'art4',
    query: 'O que estabelece o Art. 4º da LUOS?',
    expectedKeywords: ['zoneamento', 'ZOT', 'Zonas de Ordenamento Territorial'],
    category: 'Artigo Novo'
  },
  
  // 3. Título X LUOS - Hierarchy test
  {
    id: 'titulo10',
    query: 'Sobre o que trata o Título X da LUOS?',
    expectedKeywords: ['disposições finais', 'transitórias'],
    category: 'Hierarquia'
  },
  
  // 4. Article context test
  {
    id: 'context77',
    query: 'Em qual título e capítulo está o Art. 77 da LUOS?',
    expectedKeywords: ['Título VI', 'Taxa de Permeabilidade'],
    category: 'Navegação'
  },
  
  // 5. PDUS test
  {
    id: 'pdus1',
    query: 'O que diz o artigo 1 do PDUS?',
    expectedKeywords: ['plano diretor', 'desenvolvimento urbano'],
    category: 'PDUS'
  },
  
  // 6. ZOT query
  {
    id: 'zot',
    query: 'Quais são as características da ZOT 8?',
    expectedKeywords: ['residencial', 'comércio', 'serviços'],
    category: 'ZOT'
  }
];

async function testQuery(testCase) {
  const startTime = Date.now();
  
  try {
    console.log(`\n📝 Testing: ${testCase.query}`);
    console.log(`   Category: ${testCase.category}`);
    
    const response = await fetch(EDGE_FUNCTION_URL, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${SUPABASE_ANON_KEY}`,
        'apikey': SUPABASE_ANON_KEY
      },
      body: JSON.stringify({
        query: testCase.query,
        sessionId: 'test-session-' + Date.now(),
        modelPreference: 'gpt-4o-mini'
      })
    });

    const responseTime = Date.now() - startTime;
    
    if (!response.ok) {
      const errorText = await response.text();
      throw new Error(`HTTP ${response.status}: ${errorText}`);
    }

    const result = await response.json();
    
    // Check for keywords in response (try both 'answer' and 'response' fields)
    const responseText = result.answer || result.response || '';
    const foundKeywords = testCase.expectedKeywords.filter(keyword => 
      responseText.toLowerCase().includes(keyword.toLowerCase())
    );
    
    const passed = foundKeywords.length >= Math.ceil(testCase.expectedKeywords.length * 0.5);
    
    return {
      id: testCase.id,
      query: testCase.query,
      category: testCase.category,
      passed,
      responseTime,
      foundKeywords,
      expectedKeywords: testCase.expectedKeywords,
      answer: responseText.substring(0, 200) + '...',
      confidence: result.confidence || 0,
      tokensUsed: result.tokensUsed || 0
    };
    
  } catch (error) {
    return {
      id: testCase.id,
      query: testCase.query,
      category: testCase.category,
      passed: false,
      error: error.message,
      responseTime: Date.now() - startTime
    };
  }
}

async function main() {
  console.log('🚀 AGENTIC-RAG POST-FIX TEST SUITE');
  console.log('=' .repeat(60));
  console.log(`Time: ${new Date().toLocaleString('pt-BR')}`);
  console.log(`Endpoint: ${EDGE_FUNCTION_URL}`);
  console.log('=' .repeat(60));
  
  const results = [];
  
  // Run tests sequentially
  for (const testCase of testQueries) {
    const result = await testQuery(testCase);
    results.push(result);
    
    // Brief pause between requests
    await new Promise(resolve => setTimeout(resolve, 1000));
  }
  
  // Generate report
  console.log('\n' + '=' .repeat(60));
  console.log('📊 TEST RESULTS SUMMARY');
  console.log('=' .repeat(60));
  
  const byCategory = {};
  results.forEach(r => {
    if (!byCategory[r.category]) {
      byCategory[r.category] = { passed: 0, failed: 0, tests: [] };
    }
    byCategory[r.category].tests.push(r);
    if (r.passed) {
      byCategory[r.category].passed++;
    } else {
      byCategory[r.category].failed++;
    }
  });
  
  // Display results by category
  Object.entries(byCategory).forEach(([category, data]) => {
    const successRate = (data.passed / (data.passed + data.failed) * 100).toFixed(0);
    const icon = successRate >= 80 ? '✅' : successRate >= 50 ? '⚠️' : '❌';
    
    console.log(`\n${icon} ${category}: ${successRate}% (${data.passed}/${data.tests.length})`);
    
    data.tests.forEach(test => {
      const status = test.passed ? '✅' : '❌';
      const time = `${(test.responseTime / 1000).toFixed(1)}s`;
      
      if (test.error) {
        console.log(`   ${status} ${test.id}: ERROR - ${test.error}`);
      } else {
        const keywordRatio = test.foundKeywords ? 
          `${test.foundKeywords.length}/${test.expectedKeywords.length}` : 'N/A';
        console.log(`   ${status} ${test.id}: ${keywordRatio} keywords found (${time})`);
        
        if (!test.passed && test.foundKeywords) {
          console.log(`      Missing: ${test.expectedKeywords.filter(k => 
            !test.foundKeywords.includes(k)
          ).join(', ')}`);
        }
      }
    });
  });
  
  // Overall statistics
  const totalPassed = results.filter(r => r.passed).length;
  const totalTests = results.length;
  const overallRate = (totalPassed / totalTests * 100).toFixed(0);
  const avgTime = results
    .filter(r => !r.error)
    .reduce((sum, r) => sum + r.responseTime, 0) / results.filter(r => !r.error).length;
  
  console.log('\n' + '=' .repeat(60));
  console.log('📈 OVERALL METRICS');
  console.log('=' .repeat(60));
  console.log(`Success Rate: ${overallRate}% (${totalPassed}/${totalTests})`);
  console.log(`Average Response Time: ${(avgTime / 1000).toFixed(1)}s`);
  
  // Critical issues
  const criticalFails = results.filter(r => 
    ['art119', 'art4', 'context77'].includes(r.id) && !r.passed
  );
  
  if (criticalFails.length > 0) {
    console.log('\n⚠️  CRITICAL ISSUES:');
    criticalFails.forEach(fail => {
      console.log(`   - ${fail.query}: ${fail.error || 'Keywords not found'}`);
    });
  }
  
  // Save detailed report
  const reportPath = path.join(__dirname, 'AGENTIC_RAG_POST_FIX_REPORT.json');
  await fs.writeFile(reportPath, JSON.stringify(results, null, 2));
  console.log(`\n📝 Detailed report saved to: ${reportPath}`);
  
  // Final verdict
  console.log('\n' + '=' .repeat(60));
  if (overallRate >= 80) {
    console.log('✅ SYSTEM READY: Tests passed successfully!');
  } else if (overallRate >= 50) {
    console.log('⚠️  PARTIAL SUCCESS: Some improvements needed');
  } else {
    console.log('❌ SYSTEM NOT READY: Major issues detected');
  }
  console.log('=' .repeat(60));
}

main().catch(console.error);