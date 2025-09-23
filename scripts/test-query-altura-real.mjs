#!/usr/bin/env node

/**
 * Real Height Query Test - Tests actual API endpoints
 * Tests the real RAG system with height-related queries
 */

import { createClient } from '@supabase/supabase-js';
import { config } from 'dotenv';

// Load environment variables
config();

const supabaseUrl = process.env.SUPABASE_URL;
const supabaseAnonKey = process.env.SUPABASE_ANON_KEY;

if (!supabaseUrl || !supabaseAnonKey) {
  console.error('❌ Missing Supabase environment variables');
  console.error('Please check your .env file contains:');
  console.error('SUPABASE_URL=your_supabase_url');
  console.error('SUPABASE_ANON_KEY=your_anon_key');
  process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseAnonKey);

const COLORS = {
  reset: '\x1b[0m',
  bright: '\x1b[1m',
  red: '\x1b[31m',
  green: '\x1b[32m',
  yellow: '\x1b[33m',
  blue: '\x1b[34m',
  cyan: '\x1b[36m'
};

function colorize(text, color) {
  return `${COLORS[color]}${text}${COLORS.reset}`;
}

function logSection(title) {
  console.log('\n' + '='.repeat(60));
  console.log(colorize(title, 'cyan'));
  console.log('='.repeat(60));
}

const heightQueries = [
  {
    query: 'altura',
    description: 'Basic height search',
    expectedTerms: ['altura', 'elevação', 'metros']
  },
  {
    query: 'elevação do terreno',
    description: 'Terrain elevation search',
    expectedTerms: ['elevação', 'terreno', 'topografia']
  },
  {
    query: 'cota altimétrica',
    description: 'Altimetric elevation search',
    expectedTerms: ['cota', 'altimétrica', 'altitude']
  },
  {
    query: 'altura máxima dos bairros',
    description: 'Maximum neighborhood height',
    expectedTerms: ['altura', 'máxima', 'bairros']
  },
  {
    query: 'nível do mar',
    description: 'Sea level reference',
    expectedTerms: ['nível', 'mar', 'altitude']
  }
];

async function testVectorSearch(queryData) {
  console.log(`\n🔍 Testing: ${queryData.description}`);
  console.log(`Query: "${queryData.query}"`);
  
  const startTime = Date.now();
  
  try {
    const { data, error } = await supabase.functions.invoke('enhanced-vector-search', {
      body: {
        query: queryData.query,
        limit: 5,
        threshold: 0.3
      }
    });
    
    const responseTime = Date.now() - startTime;
    
    if (error) {
      console.log(colorize(`❌ Error: ${error.message}`, 'red'));
      return {
        success: false,
        error: error.message,
        responseTime
      };
    }
    
    console.log(colorize(`⏱️  Response time: ${responseTime}ms`, 'blue'));
    
    if (data && data.results && data.results.length > 0) {
      console.log(colorize(`📊 Found ${data.results.length} results`, 'green'));
      
      // Check top similarity
      const topSimilarity = data.results[0].similarity;
      console.log(colorize(`🎯 Top similarity: ${topSimilarity.toFixed(3)}`, 'blue'));
      
      // Check for expected terms
      const allContent = data.results.map(r => r.content.toLowerCase()).join(' ');
      const foundTerms = queryData.expectedTerms.filter(term => 
        allContent.includes(term.toLowerCase())
      );
      
      console.log(colorize(`🔑 Found terms: ${foundTerms.join(', ')}`, 'yellow'));
      
      // Show top results
      console.log('\n📝 Top 3 Results:');
      data.results.slice(0, 3).forEach((result, index) => {
        console.log(`${index + 1}. Similarity: ${result.similarity.toFixed(3)}`);
        console.log(`   Content: ${result.content.substring(0, 150)}...`);
        if (result.metadata?.source) {
          console.log(`   Source: ${result.metadata.source}`);
        }
      });
      
      return {
        success: true,
        resultCount: data.results.length,
        topSimilarity,
        foundTerms,
        responseTime,
        results: data.results
      };
    } else {
      console.log(colorize('⚠️  No results found', 'yellow'));
      return {
        success: true,
        resultCount: 0,
        responseTime
      };
    }
    
  } catch (error) {
    console.log(colorize(`❌ Exception: ${error.message}`, 'red'));
    return {
      success: false,
      error: error.message,
      responseTime: Date.now() - startTime
    };
  }
}

async function testRAGResponse(query) {
  console.log(`\n🤖 Testing RAG Response for: "${query}"`);
  
  const startTime = Date.now();
  
  try {
    const { data, error } = await supabase.functions.invoke('response-synthesizer', {
      body: {
        query,
        context_limit: 5
      }
    });
    
    const responseTime = Date.now() - startTime;
    
    if (error) {
      console.log(colorize(`❌ Error: ${error.message}`, 'red'));
      return { success: false, error: error.message, responseTime };
    }
    
    console.log(colorize(`⏱️  Response time: ${responseTime}ms`, 'blue'));
    
    if (data && data.response) {
      console.log(colorize(`📝 Response length: ${data.response.length} characters`, 'green'));
      console.log(colorize(`📚 Context items: ${data.context?.length || 0}`, 'blue'));
      
      console.log('\n📖 Generated Response:');
      console.log(colorize(data.response, 'yellow'));
      
      if (data.context && data.context.length > 0) {
        console.log('\n📚 Context Sources:');
        data.context.forEach((item, index) => {
          console.log(`${index + 1}. ${item.content.substring(0, 100)}... (${item.similarity?.toFixed(3)})`);
        });
      }
      
      return {
        success: true,
        responseLength: data.response.length,
        contextCount: data.context?.length || 0,
        responseTime,
        response: data.response
      };
    } else {
      console.log(colorize('⚠️  No response generated', 'yellow'));
      return { success: true, responseLength: 0, responseTime };
    }
    
  } catch (error) {
    console.log(colorize(`❌ Exception: ${error.message}`, 'red'));
    return {
      success: false,
      error: error.message,
      responseTime: Date.now() - startTime
    };
  }
}

async function testDocumentProcessing() {
  console.log(`\n📄 Testing Document Processing`);
  
  const testDocument = `
    Porto Alegre possui características topográficas diversas, com elevações
    que variam significativamente ao longo da cidade. A altura média da cidade
    é de aproximadamente 10 metros acima do nível do mar, mas algumas áreas
    podem chegar a cotas altimétricas mais elevadas, especialmente nas regiões
    mais distantes do centro. A topografia influencia diretamente o
    desenvolvimento urbano e as características dos diferentes bairros.
  `;
  
  const startTime = Date.now();
  
  try {
    const { data, error } = await supabase.functions.invoke('process-document', {
      body: {
        content: testDocument,
        metadata: {
          title: 'Teste QA - Topografia Porto Alegre',
          source: 'qa-test',
          type: 'test_document'
        }
      }
    });
    
    const responseTime = Date.now() - startTime;
    
    if (error) {
      console.log(colorize(`❌ Error: ${error.message}`, 'red'));
      return { success: false, error: error.message, responseTime };
    }
    
    console.log(colorize(`⏱️  Processing time: ${responseTime}ms`, 'blue'));
    
    if (data) {
      console.log(colorize(`✅ Document processed successfully`, 'green'));
      console.log(colorize(`📊 Chunks generated: ${data.chunks?.length || 0}`, 'blue'));
      
      if (data.chunks && data.chunks.length > 0) {
        console.log('\n📝 Generated Chunks:');
        data.chunks.forEach((chunk, index) => {
          console.log(`${index + 1}. Length: ${chunk.content?.length || 0} chars`);
          console.log(`   Content: ${chunk.content?.substring(0, 100) || 'N/A'}...`);
        });
      }
      
      return {
        success: true,
        chunkCount: data.chunks?.length || 0,
        responseTime,
        chunks: data.chunks
      };
    }
    
  } catch (error) {
    console.log(colorize(`❌ Exception: ${error.message}`, 'red'));
    return {
      success: false,
      error: error.message,
      responseTime: Date.now() - startTime
    };
  }
}

async function runAllTests() {
  logSection('🧪 RAG System - Height Query Tests');
  
  const results = {
    vectorSearch: [],
    ragResponses: [],
    documentProcessing: null,
    summary: {
      totalTests: 0,
      passedTests: 0,
      failedTests: 0,
      totalResponseTime: 0
    }
  };
  
  // Test vector search for each height query
  console.log(colorize('\n🔍 Vector Search Tests', 'cyan'));
  for (const queryData of heightQueries) {
    const result = await testVectorSearch(queryData);
    results.vectorSearch.push({
      query: queryData.query,
      description: queryData.description,
      ...result
    });
    
    results.summary.totalTests++;
    results.summary.totalResponseTime += result.responseTime;
    
    if (result.success && result.resultCount > 0) {
      results.summary.passedTests++;
    } else if (!result.success) {
      results.summary.failedTests++;
    }
  }
  
  // Test RAG responses
  console.log(colorize('\n🤖 RAG Response Tests', 'cyan'));
  const ragQueries = [
    'Qual a altura de Porto Alegre?',
    'Como variam as elevações na cidade?',
    'Quais são as cotas altimétricas dos bairros?'
  ];
  
  for (const query of ragQueries) {
    const result = await testRAGResponse(query);
    results.ragResponses.push({
      query,
      ...result
    });
    
    results.summary.totalTests++;
    results.summary.totalResponseTime += result.responseTime;
    
    if (result.success && result.responseLength > 0) {
      results.summary.passedTests++;
    } else if (!result.success) {
      results.summary.failedTests++;
    }
  }
  
  // Test document processing
  console.log(colorize('\n📄 Document Processing Test', 'cyan'));
  const docResult = await testDocumentProcessing();
  results.documentProcessing = docResult;
  
  results.summary.totalTests++;
  results.summary.totalResponseTime += docResult.responseTime;
  
  if (docResult.success) {
    results.summary.passedTests++;
  } else {
    results.summary.failedTests++;
  }
  
  // Display final summary
  logSection('📊 Test Summary');
  
  console.log(colorize(`✅ Passed: ${results.summary.passedTests}/${results.summary.totalTests}`, 'green'));
  console.log(colorize(`❌ Failed: ${results.summary.failedTests}/${results.summary.totalTests}`, 'red'));
  console.log(colorize(`⏱️  Total time: ${results.summary.totalResponseTime}ms`, 'blue'));
  console.log(colorize(`📊 Average time: ${Math.round(results.summary.totalResponseTime / results.summary.totalTests)}ms`, 'blue'));
  
  // Recommendations
  console.log(colorize('\n📋 Recommendations:', 'yellow'));
  
  if (results.summary.failedTests > 0) {
    console.log('• Check Supabase function deployments');
    console.log('• Verify environment variables are correct');
    console.log('• Ensure knowledge base has height-related content');
  }
  
  if (results.vectorSearch.some(r => r.resultCount === 0)) {
    console.log('• Consider lowering similarity threshold for some queries');
    console.log('• Add more height-related content to knowledge base');
  }
  
  const avgResponseTime = results.summary.totalResponseTime / results.summary.totalTests;
  if (avgResponseTime > 5000) {
    console.log('• Consider optimizing function performance');
    console.log('• Check database indexing for vector searches');
  }
  
  console.log(colorize('\n🎉 QA Testing Complete!', 'green'));
  
  return results;
}

// Run tests if called directly
if (import.meta.url === `file://${process.argv[1]}`) {
  runAllTests()
    .then(results => {
      console.log('\n📊 Final Results:', JSON.stringify(results.summary, null, 2));
    })
    .catch(error => {
      console.error(colorize(`❌ Test execution failed: ${error.message}`, 'red'));
      process.exit(1);
    });
}

export { runAllTests };