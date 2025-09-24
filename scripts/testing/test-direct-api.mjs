#!/usr/bin/env node

/**
 * Direct API Testing Script
 * Tests Supabase functions directly with fetch
 */

import fetch from 'node-fetch';
import { config } from 'dotenv';

// Load environment variables
config();

const SUPABASE_URL = process.env.SUPABASE_URL;
const SUPABASE_ANON_KEY = process.env.SUPABASE_ANON_KEY;

if (!SUPABASE_URL || !SUPABASE_ANON_KEY) {
  console.error('❌ Environment variables not found');
  console.log('Available env vars:', Object.keys(process.env).filter(key => key.includes('SUPABASE')));
  
  // Try reading .env file directly
  try {
    const fs = await import('fs');
    const envContent = fs.readFileSync('.env', 'utf8');
    console.log('\n📄 .env file content:');
    console.log(envContent.split('\n').map(line => 
      line.includes('=') ? `${line.split('=')[0]}=***` : line
    ).join('\n'));
  } catch (error) {
    console.log('Could not read .env file:', error.message);
  }
  
  process.exit(1);
}

const COLORS = {
  reset: '\x1b[0m',
  green: '\x1b[32m',
  red: '\x1b[31m',
  yellow: '\x1b[33m',
  blue: '\x1b[34m',
  cyan: '\x1b[36m'
};

function colorize(text, color) {
  return `${COLORS[color]}${text}${COLORS.reset}`;
}

async function testFunction(functionName, payload) {
  console.log(`\n🔍 Testing function: ${functionName}`);
  console.log(`📤 Payload:`, JSON.stringify(payload, null, 2));
  
  const url = `${SUPABASE_URL}/functions/v1/${functionName}`;
  
  const startTime = Date.now();
  
  try {
    const response = await fetch(url, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${SUPABASE_ANON_KEY}`,
        'Content-Type': 'application/json',
        'Accept': 'application/json'
      },
      body: JSON.stringify(payload)
    });
    
    const responseTime = Date.now() - startTime;
    
    console.log(colorize(`⏱️  Response time: ${responseTime}ms`, 'blue'));
    console.log(colorize(`📊 Status: ${response.status} ${response.statusText}`, 
      response.ok ? 'green' : 'red'));
    
    const contentType = response.headers.get('content-type');
    console.log(`📋 Content-Type: ${contentType}`);
    
    let data;
    try {
      const text = await response.text();
      console.log(`📝 Raw response: ${text.substring(0, 200)}...`);
      
      data = JSON.parse(text);
    } catch (parseError) {
      console.log(colorize(`⚠️  Could not parse JSON response`, 'yellow'));
      data = { error: 'Invalid JSON response' };
    }
    
    if (response.ok) {
      console.log(colorize('✅ Function call successful', 'green'));
      
      if (data.results) {
        console.log(`📊 Results count: ${data.results.length}`);
        if (data.results.length > 0) {
          console.log(`🎯 Top similarity: ${data.results[0].similarity?.toFixed(3) || 'N/A'}`);
        }
      }
      
      if (data.response) {
        console.log(`📝 Response length: ${data.response.length} chars`);
        console.log(`📖 Response preview: ${data.response.substring(0, 150)}...`);
      }
      
      if (data.chunks) {
        console.log(`📄 Chunks generated: ${data.chunks.length}`);
      }
      
    } else {
      console.log(colorize(`❌ Function call failed: ${data.error || data.message || 'Unknown error'}`, 'red'));
    }
    
    return {
      success: response.ok,
      status: response.status,
      data,
      responseTime
    };
    
  } catch (error) {
    const responseTime = Date.now() - startTime;
    console.log(colorize(`❌ Request failed: ${error.message}`, 'red'));
    
    return {
      success: false,
      error: error.message,
      responseTime
    };
  }
}

async function runHeightSearchTests() {
  console.log(colorize('\n🔍 HEIGHT SEARCH TESTS', 'cyan'));
  console.log('='.repeat(50));
  
  const heightQueries = [
    'altura',
    'elevação do terreno',
    'cota altimétrica',
    'altura máxima dos bairros',
    'nível do mar'
  ];
  
  const results = [];
  
  for (const query of heightQueries) {
    const result = await testFunction('enhanced-vector-search', {
      query,
      limit: 5,
      threshold: 0.3
    });
    
    results.push({
      query,
      ...result
    });
  }
  
  return results;
}

async function runRAGTests() {
  console.log(colorize('\n🤖 RAG RESPONSE TESTS', 'cyan'));
  console.log('='.repeat(50));
  
  const ragQueries = [
    'Qual a altura de Porto Alegre?',
    'Como variam as elevações na cidade?',
    'Quais são as cotas altimétricas dos bairros?'
  ];
  
  const results = [];
  
  for (const query of ragQueries) {
    const result = await testFunction('response-synthesizer', {
      query,
      context_limit: 5
    });
    
    results.push({
      query,
      ...result
    });
  }
  
  return results;
}

async function runDocumentProcessingTest() {
  console.log(colorize('\n📄 DOCUMENT PROCESSING TEST', 'cyan'));
  console.log('='.repeat(50));
  
  const testDocument = `
    Porto Alegre possui características topográficas diversas, com elevações
    que variam significativamente ao longo da cidade. A altura média da cidade
    é de aproximadamente 10 metros acima do nível do mar, mas algumas áreas
    podem chegar a cotas altimétricas mais elevadas, especialmente nas regiões
    mais distantes do centro. A topografia influencia diretamente o
    desenvolvimento urbano e as características dos diferentes bairros.
  `;
  
  const result = await testFunction('process-document', {
    content: testDocument,
    metadata: {
      title: 'Teste QA - Topografia Porto Alegre',
      source: 'qa-test',
      type: 'test_document'
    }
  });
  
  return result;
}

async function runAllTests() {
  console.log(colorize('🧪 RAG SYSTEM QA TESTS', 'cyan'));
  console.log('='.repeat(60));
  console.log(`🌐 Supabase URL: ${SUPABASE_URL.substring(0, 30)}...`);
  console.log(`🔑 API Key: ${SUPABASE_ANON_KEY.substring(0, 20)}...`);
  
  const testResults = {
    heightSearch: [],
    ragResponses: [],
    documentProcessing: null,
    summary: {
      totalTests: 0,
      passedTests: 0,
      failedTests: 0,
      totalResponseTime: 0
    }
  };
  
  try {
    // Test height search
    testResults.heightSearch = await runHeightSearchTests();
    
    // Test RAG responses
    testResults.ragResponses = await runRAGTests();
    
    // Test document processing
    testResults.documentProcessing = await runDocumentProcessingTest();
    
    // Calculate summary
    const allTests = [
      ...testResults.heightSearch,
      ...testResults.ragResponses,
      testResults.documentProcessing
    ];
    
    testResults.summary.totalTests = allTests.length;
    testResults.summary.passedTests = allTests.filter(t => t.success).length;
    testResults.summary.failedTests = allTests.filter(t => !t.success).length;
    testResults.summary.totalResponseTime = allTests.reduce((sum, t) => sum + t.responseTime, 0);
    
    // Display summary
    console.log(colorize('\n📊 TEST SUMMARY', 'cyan'));
    console.log('='.repeat(50));
    console.log(colorize(`✅ Passed: ${testResults.summary.passedTests}/${testResults.summary.totalTests}`, 'green'));
    console.log(colorize(`❌ Failed: ${testResults.summary.failedTests}/${testResults.summary.totalTests}`, 'red'));
    console.log(colorize(`⏱️  Total time: ${testResults.summary.totalResponseTime}ms`, 'blue'));
    console.log(colorize(`📊 Average time: ${Math.round(testResults.summary.totalResponseTime / testResults.summary.totalTests)}ms`, 'blue'));
    
    // Recommendations
    console.log(colorize('\n📋 RECOMMENDATIONS', 'yellow'));
    
    if (testResults.summary.failedTests > 0) {
      console.log('❗ Some tests failed. Check:');
      console.log('  • Supabase function deployments');
      console.log('  • Environment variables');
      console.log('  • Knowledge base content');
    }
    
    const passRate = testResults.summary.passedTests / testResults.summary.totalTests;
    if (passRate >= 0.8) {
      console.log(colorize('🎉 System is working well!', 'green'));
    } else if (passRate >= 0.6) {
      console.log(colorize('⚠️  System needs attention', 'yellow'));
    } else {
      console.log(colorize('🚨 System has significant issues', 'red'));
    }
    
    return testResults;
    
  } catch (error) {
    console.error(colorize(`❌ Test execution failed: ${error.message}`, 'red'));
    console.error(error.stack);
    process.exit(1);
  }
}

// Run tests
runAllTests()
  .then(results => {
    console.log(colorize('\n🏁 QA Testing Complete!', 'green'));
    
    // Save results to file
    import('fs').then(fs => {
      const reportPath = `qa-test-results-${Date.now()}.json`;
      fs.writeFileSync(reportPath, JSON.stringify(results, null, 2));
      console.log(colorize(`📄 Results saved to: ${reportPath}`, 'blue'));
    });
  })
  .catch(error => {
    console.error(colorize(`❌ Tests failed: ${error.message}`, 'red'));
    process.exit(1);
  });