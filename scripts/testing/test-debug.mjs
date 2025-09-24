#!/usr/bin/env node

import fetch from 'node-fetch';
import dotenv from 'dotenv';

dotenv.config({ path: '.env.local' });

const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL;
const SUPABASE_ANON_KEY = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

console.log('🔍 DEBUG: Testing each function individually\n');

// Test 1: Query Analyzer
async function testQueryAnalyzer() {
  console.log('1️⃣ Testing query-analyzer...');
  try {
    const response = await fetch(`${SUPABASE_URL}/functions/v1/query-analyzer`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${SUPABASE_ANON_KEY}`,
      },
      body: JSON.stringify({
        query: 'O que são ZEIS segundo o PDUS?'
      })
    });
    
    if (response.ok) {
      const result = await response.json();
      console.log('✅ Query Analyzer OK');
      console.log('   Intent:', result.intent);
      console.log('   Strategy:', result.strategy);
      return result;
    } else {
      console.log(`❌ Query Analyzer failed: ${response.status}`);
      const error = await response.text();
      console.log('   Error:', error.substring(0, 200));
      return null;
    }
  } catch (error) {
    console.log('❌ Query Analyzer error:', error.message);
    return null;
  }
}

// Test 2: Response Synthesizer
async function testResponseSynthesizer(analysisResult) {
  console.log('\n2️⃣ Testing response-synthesizer...');
  try {
    const response = await fetch(`${SUPABASE_URL}/functions/v1/response-synthesizer`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${SUPABASE_ANON_KEY}`,
      },
      body: JSON.stringify({
        originalQuery: 'O que são ZEIS segundo o PDUS?',
        analysisResult: analysisResult || {
          intent: 'conceptual',
          strategy: 'unstructured_only',
          metadata: {
            isLegalQuery: true,
            expectedArticles: ['Art. 92']
          }
        },
        sqlResults: null,
        vectorResults: null,
        model: 'anthropic/claude-3-5-sonnet-20241022'
      })
    });
    
    if (response.ok) {
      const result = await response.json();
      console.log('✅ Response Synthesizer OK');
      console.log('   Response length:', result.response?.length || 0);
      return result;
    } else {
      console.log(`❌ Response Synthesizer failed: ${response.status}`);
      const error = await response.text();
      console.log('   Error:', error.substring(0, 300));
      return null;
    }
  } catch (error) {
    console.log('❌ Response Synthesizer error:', error.message);
    return null;
  }
}

// Test 3: Enhanced Vector Search
async function testEnhancedVectorSearch() {
  console.log('\n3️⃣ Testing enhanced-vector-search...');
  try {
    const response = await fetch(`${SUPABASE_URL}/functions/v1/enhanced-vector-search`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${SUPABASE_ANON_KEY}`,
      },
      body: JSON.stringify({
        query: 'ZEIS zonas especiais de interesse social',
        searchType: 'legal_articles',
        expectedArticles: ['Art. 92'],
        limit: 3
      })
    });
    
    if (response.ok) {
      const result = await response.json();
      console.log('✅ Enhanced Vector Search OK');
      console.log('   Results found:', result.results?.length || 0);
      return result;
    } else {
      console.log(`❌ Enhanced Vector Search failed: ${response.status}`);
      const error = await response.text();
      console.log('   Error:', error.substring(0, 200));
      return null;
    }
  } catch (error) {
    console.log('❌ Enhanced Vector Search error:', error.message);
    return null;
  }
}

// Run all tests
async function runDebugTests() {
  const analysisResult = await testQueryAnalyzer();
  await testResponseSynthesizer(analysisResult);
  await testEnhancedVectorSearch();
  
  console.log('\n✅ Debug tests completed');
}

runDebugTests().catch(console.error);