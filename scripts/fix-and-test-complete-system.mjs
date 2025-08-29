#!/usr/bin/env node
import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';
import fs from 'fs/promises';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

// Load environment
dotenv.config({ path: join(__dirname, '../.env.local') });

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!supabaseUrl || !supabaseServiceKey) {
  console.error('❌ Missing Supabase credentials');
  process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseServiceKey);

// Test queries that are failing
const problemQueries = [
  "O que diz sobre outorga onerosa do direito de construir?",
  "Quais são as regras para EIV?",
  "Como funciona o Estudo de Impacto de Vizinhança?",
  "Qual a altura máxima no Centro Histórico?",
  "O que são ZEIS?"
];

// All supported models
const ALL_MODELS = [
  'openai/gpt-4',
  'openai/gpt-4-turbo',
  'openai/gpt-3.5-turbo',
  'openai/gpt-4o',
  'openai/gpt-4o-mini',
  'anthropic/claude-3-5-sonnet-20241022',
  'anthropic/claude-3-5-haiku-20241022',
  'anthropic/claude-3-opus-20240229',
  'google/gemini-1.5-pro',
  'google/gemini-1.5-flash',
  'google/gemini-1.5-flash-8b',
  'deepseek/deepseek-chat',
  'deepseek/deepseek-coder',
  'groq/llama-3.1-70b-versatile',
  'groq/mixtral-8x7b-32768',
  'zhipuai/glm-4-plus',
  'zhipuai/glm-4-0520',
  'zhipuai/glm-4-long',
  'zhipuai/glm-4-air',
  'zhipuai/glm-4-airx',
  'zhipuai/glm-4-flash'
];

async function testEndpoint(endpoint, query, model = 'gpt-3.5-turbo') {
  console.log(`\n🔍 Testing ${endpoint} with model ${model}`);
  console.log(`   Query: "${query}"`);
  
  try {
    const startTime = Date.now();
    
    const { data, error } = await supabase.functions.invoke(endpoint, {
      body: {
        query: query,
        message: query,
        model: model,
        sessionId: `test-${Date.now()}`,
        bypassCache: true,
        options: {
          useAgenticRAG: endpoint.includes('v2'),
          skipRefinement: false
        }
      }
    });

    const elapsed = Date.now() - startTime;

    if (error) {
      console.error(`   ❌ Error: ${error.message}`);
      return { success: false, error: error.message, endpoint, model, query };
    }

    if (!data || !data.response) {
      console.error(`   ❌ Empty response`);
      return { success: false, error: 'Empty response', endpoint, model, query };
    }

    console.log(`   ✅ Success (${elapsed}ms)`);
    console.log(`   Response preview: ${data.response.substring(0, 100)}...`);
    console.log(`   Confidence: ${data.confidence || 0}`);
    
    return {
      success: true,
      endpoint,
      model,
      query,
      response: data.response,
      confidence: data.confidence,
      time: elapsed,
      metadata: data.metadata
    };

  } catch (error) {
    console.error(`   ❌ Exception: ${error.message}`);
    return { success: false, error: error.message, endpoint, model, query };
  }
}

async function testDirectOrchestrator(query, model = 'gpt-3.5-turbo') {
  console.log(`\n🎯 Testing orchestrator-master directly`);
  console.log(`   Query: "${query}"`);
  console.log(`   Model: ${model}`);
  
  try {
    const { data, error } = await supabase.functions.invoke('orchestrator-master', {
      body: {
        query: query,
        sessionId: `test-direct-${Date.now()}`,
        model: model,
        options: {
          skipRefinement: false,
          useKnowledgeGraph: true
        }
      }
    });

    if (error) {
      console.error(`   ❌ Orchestrator error: ${error.message}`);
      return false;
    }

    console.log(`   ✅ Orchestrator success`);
    console.log(`   Response: ${data.response?.substring(0, 100)}...`);
    return true;

  } catch (error) {
    console.error(`   ❌ Orchestrator exception: ${error.message}`);
    return false;
  }
}

async function testAllModels(query) {
  console.log(`\n📊 Testing all models for query: "${query}"`);
  const results = [];
  
  // Test a subset of models for speed
  const testModels = [
    'gpt-3.5-turbo',
    'gpt-4',
    'anthropic/claude-3-5-sonnet-20241022',
    'google/gemini-1.5-flash',
    'deepseek/deepseek-chat'
  ];
  
  for (const model of testModels) {
    const result = await testEndpoint('agentic-rag-v2', query, model);
    results.push(result);
    
    // Small delay to avoid rate limiting
    await new Promise(resolve => setTimeout(resolve, 1000));
  }
  
  const successful = results.filter(r => r.success).length;
  const failed = results.filter(r => !r.success).length;
  
  console.log(`\n📈 Results for "${query}":`);
  console.log(`   ✅ Successful: ${successful}/${testModels.length}`);
  console.log(`   ❌ Failed: ${failed}/${testModels.length}`);
  
  if (failed > 0) {
    console.log(`   Failed models:`);
    results.filter(r => !r.success).forEach(r => {
      console.log(`     - ${r.model}: ${r.error}`);
    });
  }
  
  return results;
}

async function loadAllTestCases() {
  console.log('\n📚 Loading all QA test cases...');
  
  const { data: testCases, error } = await supabase
    .from('qa_test_cases')
    .select('*')
    .order('category');
    
  if (error) {
    console.error('❌ Error loading test cases:', error);
    return [];
  }
  
  console.log(`✅ Loaded ${testCases.length} test cases`);
  
  // Group by category
  const byCategory = {};
  testCases.forEach(tc => {
    if (!byCategory[tc.category]) {
      byCategory[tc.category] = [];
    }
    byCategory[tc.category].push(tc);
  });
  
  console.log('\n📊 Test cases by category:');
  Object.entries(byCategory).forEach(([cat, cases]) => {
    console.log(`   ${cat}: ${cases.length} cases`);
  });
  
  return testCases;
}

async function runCompleteValidation(testCases, models = ['gpt-3.5-turbo']) {
  console.log('\n🚀 Starting complete system validation');
  console.log(`   Test cases: ${testCases.length}`);
  console.log(`   Models: ${models.join(', ')}`);
  
  const results = {
    total: 0,
    passed: 0,
    failed: 0,
    errors: [],
    byModel: {},
    byCategory: {}
  };
  
  for (const model of models) {
    results.byModel[model] = { total: 0, passed: 0, failed: 0 };
    
    for (const testCase of testCases) {
      console.log(`\n🧪 Testing: ${testCase.question.substring(0, 50)}...`);
      console.log(`   Model: ${model}`);
      console.log(`   Category: ${testCase.category}`);
      
      const result = await testEndpoint('agentic-rag-v2', testCase.question, model);
      
      results.total++;
      results.byModel[model].total++;
      
      if (!results.byCategory[testCase.category]) {
        results.byCategory[testCase.category] = { total: 0, passed: 0, failed: 0 };
      }
      results.byCategory[testCase.category].total++;
      
      if (result.success) {
        // Simple validation: check if response is not empty and has reasonable length
        const isValid = result.response && result.response.length > 20;
        
        if (isValid) {
          results.passed++;
          results.byModel[model].passed++;
          results.byCategory[testCase.category].passed++;
          console.log(`   ✅ PASSED`);
        } else {
          results.failed++;
          results.byModel[model].failed++;
          results.byCategory[testCase.category].failed++;
          results.errors.push({
            testCase: testCase.question,
            model,
            error: 'Invalid response'
          });
          console.log(`   ❌ FAILED: Invalid response`);
        }
      } else {
        results.failed++;
        results.byModel[model].failed++;
        results.byCategory[testCase.category].failed++;
        results.errors.push({
          testCase: testCase.question,
          model,
          error: result.error
        });
        console.log(`   ❌ FAILED: ${result.error}`);
      }
      
      // Small delay between tests
      await new Promise(resolve => setTimeout(resolve, 500));
    }
  }
  
  return results;
}

async function generateReport(results) {
  console.log('\n' + '='.repeat(80));
  console.log('📊 VALIDATION REPORT');
  console.log('='.repeat(80));
  
  const overallAccuracy = (results.passed / results.total * 100).toFixed(2);
  
  console.log('\n📈 Overall Results:');
  console.log(`   Total Tests: ${results.total}`);
  console.log(`   Passed: ${results.passed} (${overallAccuracy}%)`);
  console.log(`   Failed: ${results.failed}`);
  
  console.log('\n🤖 Results by Model:');
  Object.entries(results.byModel).forEach(([model, stats]) => {
    const accuracy = (stats.passed / stats.total * 100).toFixed(2);
    console.log(`   ${model}:`);
    console.log(`     - Passed: ${stats.passed}/${stats.total} (${accuracy}%)`);
  });
  
  console.log('\n📚 Results by Category:');
  Object.entries(results.byCategory).forEach(([category, stats]) => {
    const accuracy = (stats.passed / stats.total * 100).toFixed(2);
    console.log(`   ${category}: ${stats.passed}/${stats.total} (${accuracy}%)`);
  });
  
  if (results.errors.length > 0) {
    console.log('\n❌ Top Errors:');
    const errorCounts = {};
    results.errors.forEach(e => {
      const key = e.error || 'Unknown';
      errorCounts[key] = (errorCounts[key] || 0) + 1;
    });
    
    Object.entries(errorCounts)
      .sort((a, b) => b[1] - a[1])
      .slice(0, 5)
      .forEach(([error, count]) => {
        console.log(`   ${error}: ${count} occurrences`);
      });
  }
  
  // Save report to file
  const reportPath = join(__dirname, `../test-reports/validation-${Date.now()}.json`);
  await fs.mkdir(join(__dirname, '../test-reports'), { recursive: true });
  await fs.writeFile(reportPath, JSON.stringify(results, null, 2));
  console.log(`\n💾 Report saved to: ${reportPath}`);
  
  return overallAccuracy;
}

async function main() {
  console.log('🔧 System Complete Test and Fix Tool');
  console.log('=====================================\n');
  
  // Step 1: Test problem queries
  console.log('STEP 1: Testing Problem Queries');
  console.log('-'.repeat(40));
  
  for (const query of problemQueries) {
    await testEndpoint('agentic-rag-v2', query);
    await testDirectOrchestrator(query);
  }
  
  // Step 2: Test different models
  console.log('\n\nSTEP 2: Testing Multiple Models');
  console.log('-'.repeat(40));
  
  await testAllModels(problemQueries[0]);
  
  // Step 3: Load all test cases
  console.log('\n\nSTEP 3: Loading Test Cases');
  console.log('-'.repeat(40));
  
  const testCases = await loadAllTestCases();
  
  if (testCases.length === 0) {
    console.error('❌ No test cases found. Exiting.');
    return;
  }
  
  // Step 4: Run complete validation (limited for testing)
  console.log('\n\nSTEP 4: Running Complete Validation');
  console.log('-'.repeat(40));
  
  // For testing, use only first 10 test cases and 2 models
  const limitedTestCases = testCases.slice(0, 10);
  const testModels = ['gpt-3.5-turbo', 'gpt-4'];
  
  const results = await runCompleteValidation(limitedTestCases, testModels);
  
  // Step 5: Generate report
  console.log('\n\nSTEP 5: Generating Report');
  console.log('-'.repeat(40));
  
  const accuracy = await generateReport(results);
  
  // Final status
  console.log('\n' + '='.repeat(80));
  console.log('🎯 FINAL STATUS');
  console.log('='.repeat(80));
  
  if (parseFloat(accuracy) >= 80) {
    console.log('✅ System validation PASSED with ' + accuracy + '% accuracy');
  } else {
    console.log('⚠️ System validation needs improvement: ' + accuracy + '% accuracy');
  }
  
  console.log('\n📝 Recommendations:');
  console.log('1. Deploy updated edge functions');
  console.log('2. Clear query cache');
  console.log('3. Verify API keys for all models');
  console.log('4. Check Supabase logs for detailed errors');
  console.log('5. Run full validation with all test cases');
}

// Run the script
main().catch(console.error);