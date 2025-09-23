#!/usr/bin/env node

import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Load environment variables
dotenv.config({ path: path.join(__dirname, '..', '.env.local') });

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

if (!supabaseUrl || !supabaseAnonKey) {
  console.error('❌ Missing Supabase environment variables');
  process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseAnonKey);

// Test cases
const testCases = [
  {
    id: 1,
    query: "Qual a altura máxima permitida para construções no Centro Histórico?",
    expectedKeywords: ["30 metros", "centro histórico", "altura máxima"],
    category: "altura_maxima"
  },
  {
    id: 2,
    query: "O que é outorga onerosa do direito de construir?",
    expectedKeywords: ["outorga onerosa", "direito de construir", "coeficiente", "adicional"],
    category: "conceitos"
  },
  {
    id: 3,
    query: "Quais são os usos permitidos na zona residencial?",
    expectedKeywords: ["zona residencial", "uso permitido", "habitação", "comércio"],
    category: "uso_solo"
  },
  {
    id: 4,
    query: "Qual o coeficiente de aproveitamento no bairro Boa Vista?",
    expectedKeywords: ["coeficiente", "aproveitamento", "boa vista"],
    category: "parametros"
  },
  {
    id: 5,
    query: "O que é EIV - Estudo de Impacto de Vizinhança?",
    expectedKeywords: ["EIV", "estudo", "impacto", "vizinhança"],
    category: "conceitos"
  }
];

async function testEndpoint(endpoint, testCase) {
  console.log(`\n🔍 Testing ${endpoint} with: "${testCase.query}"`);
  
  const startTime = Date.now();
  
  try {
    const { data, error } = await supabase.functions.invoke(endpoint, {
      body: {
        message: testCase.query,
        query: testCase.query, // Send both for compatibility
        userRole: 'user',
        sessionId: `test-${Date.now()}`,
        userId: 'test-user',
        model: 'gpt-3.5-turbo',
        bypassCache: true,
        options: {
          useAgenticRAG: true
        }
      }
    });

    const responseTime = Date.now() - startTime;

    if (error) {
      console.error(`❌ Error: ${error.message}`);
      return {
        success: false,
        error: error.message,
        responseTime
      };
    }

    if (!data || !data.response) {
      console.error(`❌ Empty response`);
      return {
        success: false,
        error: 'Empty response',
        responseTime
      };
    }

    // Check for expected keywords
    const response = data.response.toLowerCase();
    const foundKeywords = testCase.expectedKeywords.filter(keyword => 
      response.includes(keyword.toLowerCase())
    );

    const accuracy = foundKeywords.length / testCase.expectedKeywords.length;
    const passed = accuracy >= 0.5;

    console.log(`${passed ? '✅' : '❌'} Response received in ${responseTime}ms`);
    console.log(`   Accuracy: ${(accuracy * 100).toFixed(0)}%`);
    console.log(`   Found keywords: ${foundKeywords.join(', ')}`);
    console.log(`   Missing keywords: ${testCase.expectedKeywords.filter(k => !foundKeywords.includes(k)).join(', ')}`);
    
    if (data.response.length > 200) {
      console.log(`   Response preview: ${data.response.substring(0, 200)}...`);
    } else {
      console.log(`   Response: ${data.response}`);
    }

    return {
      success: passed,
      accuracy,
      responseTime,
      foundKeywords,
      response: data.response
    };

  } catch (err) {
    console.error(`❌ Exception: ${err.message}`);
    return {
      success: false,
      error: err.message,
      responseTime: Date.now() - startTime
    };
  }
}

async function runTests() {
  console.log('🚀 Starting Unified RAG Tests');
  console.log('================================\n');

  const endpoints = ['agentic-rag', 'agentic-rag-v2'];
  const results = {};

  for (const endpoint of endpoints) {
    console.log(`\n📋 Testing endpoint: ${endpoint}`);
    console.log('─'.repeat(50));
    
    results[endpoint] = {
      total: 0,
      passed: 0,
      failed: 0,
      totalAccuracy: 0,
      totalResponseTime: 0,
      errors: []
    };

    for (const testCase of testCases) {
      const result = await testEndpoint(endpoint, testCase);
      
      results[endpoint].total++;
      results[endpoint].totalResponseTime += result.responseTime || 0;
      
      if (result.success) {
        results[endpoint].passed++;
        results[endpoint].totalAccuracy += result.accuracy;
      } else {
        results[endpoint].failed++;
        results[endpoint].errors.push({
          query: testCase.query,
          error: result.error
        });
      }

      // Small delay between tests
      await new Promise(resolve => setTimeout(resolve, 1000));
    }
  }

  // Print summary
  console.log('\n' + '='.repeat(60));
  console.log('📊 TEST RESULTS SUMMARY');
  console.log('='.repeat(60));

  for (const [endpoint, stats] of Object.entries(results)) {
    console.log(`\n${endpoint}:`);
    console.log(`  ✅ Passed: ${stats.passed}/${stats.total}`);
    console.log(`  ❌ Failed: ${stats.failed}/${stats.total}`);
    console.log(`  📈 Success Rate: ${((stats.passed / stats.total) * 100).toFixed(1)}%`);
    console.log(`  🎯 Avg Accuracy: ${stats.passed > 0 ? ((stats.totalAccuracy / stats.passed) * 100).toFixed(1) : 0}%`);
    console.log(`  ⏱️  Avg Response Time: ${(stats.totalResponseTime / stats.total).toFixed(0)}ms`);
    
    if (stats.errors.length > 0) {
      console.log(`  ⚠️  Errors:`);
      stats.errors.forEach(err => {
        console.log(`     - "${err.query}": ${err.error}`);
      });
    }
  }

  // Test direct orchestrator-master
  console.log('\n' + '='.repeat(60));
  console.log('🔧 Testing orchestrator-master directly');
  console.log('='.repeat(60));

  const orchestratorResult = await testEndpoint('orchestrator-master', testCases[0]);
  console.log(`\nDirect orchestrator test: ${orchestratorResult.success ? '✅ PASSED' : '❌ FAILED'}`);

  // Overall assessment
  const v2Stats = results['agentic-rag-v2'];
  const overallSuccess = v2Stats.passed >= v2Stats.total * 0.7;

  console.log('\n' + '='.repeat(60));
  console.log(overallSuccess ? 
    '✅ SYSTEM IS WORKING (70%+ success rate)' : 
    '❌ SYSTEM HAS ISSUES (< 70% success rate)'
  );
  console.log('='.repeat(60));
}

// Run tests
runTests().catch(console.error);