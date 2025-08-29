#!/usr/bin/env node

/**
 * Test REGIME_FALLBACK data extraction and formatting
 * Focus on queries that should use REGIME_FALLBACK data
 */

import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

dotenv.config({ path: join(__dirname, '.env') });

const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL;
const SUPABASE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

const supabase = createClient(SUPABASE_URL, SUPABASE_KEY);

// Test queries specifically for REGIME_FALLBACK
const regimeTests = [
  {
    id: 1,
    question: "qual é a altura máxima do aberta dos morros",
    expectedValues: ['33', '52', 'metros', 'ZOT'],
    description: "Should extract heights from REGIME_FALLBACK"
  },
  {
    id: 2,
    question: "o que posso construir no bairro Petrópolis",
    expectedValues: ['60', '90', 'metros', 'coeficiente', 'ZOT'],
    description: "Should extract Petrópolis regime data"
  },
  {
    id: 3,
    question: "altura máxima no bairro cristal",
    expectedValues: ['altura', 'metros', 'cristal'],
    description: "Should find Cristal regime data"
  }
];

// First verify data exists in database
async function verifyRegimeFallbackData() {
  console.log('\n📊 Verificando REGIME_FALLBACK na base...\n');
  
  // Check total count
  const { count } = await supabase
    .from('legal_articles')
    .select('*', { count: 'exact', head: true })
    .eq('document_type', 'REGIME_FALLBACK');
  
  console.log(`✅ Total REGIME_FALLBACK records: ${count}`);
  
  // Check for specific bairros
  for (const test of regimeTests) {
    const bairroMatch = test.question.match(/aberta dos morros|petrópolis|cristal/i);
    if (bairroMatch) {
      const { data, count: bairroCount } = await supabase
        .from('legal_articles')
        .select('full_content, keywords', { count: 'exact' })
        .eq('document_type', 'REGIME_FALLBACK')
        .ilike('full_content', `%${bairroMatch[0]}%`)
        .limit(1);
      
      if (data && data[0]) {
        console.log(`✅ ${bairroMatch[0]}: ${bairroCount} records found`);
        
        // Check for expected values in content
        const content = data[0].full_content || '';
        const hasHeight = /\d+\s*metros/i.test(content);
        const hasCoef = /coeficiente.*\d+[,\.]\d+/i.test(content);
        const hasZone = /ZOT\s*\d+/i.test(content);
        
        console.log(`  - Has height: ${hasHeight ? '✓' : '✗'}`);
        console.log(`  - Has coefficient: ${hasCoef ? '✓' : '✗'}`);
        console.log(`  - Has zone: ${hasZone ? '✓' : '✗'}`);
        
        if (data[0].keywords) {
          console.log(`  - Keywords: ${data[0].keywords.slice(0, 3).join(', ')}`);
        }
      } else {
        console.log(`❌ ${bairroMatch[0]}: Not found in REGIME_FALLBACK`);
      }
    }
  }
}

// Test edge function with timeout
async function testEdgeFunction(test, timeout = 10000) {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), timeout);
  
  try {
    console.log(`\n🎯 Testing: "${test.question}"`);
    console.log(`   ${test.description}`);
    
    const response = await fetch(`${SUPABASE_URL}/functions/v1/agentic-rag`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${SUPABASE_KEY}`
      },
      body: JSON.stringify({
        query: test.question,
        sessionId: `regime-test-${test.id}`
      }),
      signal: controller.signal
    });
    
    clearTimeout(timer);
    
    if (!response.ok) {
      console.log(`   ❌ HTTP Error: ${response.status}`);
      return { success: false, error: `HTTP ${response.status}` };
    }
    
    const result = await response.json();
    const responseText = result.response || '';
    
    // Check for expected values
    const foundValues = test.expectedValues.filter(value => 
      responseText.toLowerCase().includes(value.toLowerCase())
    );
    
    const successRate = (foundValues.length / test.expectedValues.length) * 100;
    
    if (successRate >= 60) {
      console.log(`   ✅ SUCCESS (${successRate.toFixed(0)}%)`);
      console.log(`   📝 Found: ${foundValues.join(', ')}`);
    } else {
      console.log(`   ❌ FAILED (only ${successRate.toFixed(0)}%)`);
      console.log(`   📝 Missing: ${test.expectedValues.filter(v => 
        !foundValues.includes(v)).join(', ')}`);
    }
    
    // Show response preview
    const preview = responseText.substring(0, 200).replace(/\n/g, ' ');
    console.log(`   💬 Response: "${preview}${responseText.length > 200 ? '...' : ''}"`);
    
    return { 
      success: successRate >= 60, 
      successRate,
      foundValues,
      response: responseText 
    };
    
  } catch (error) {
    clearTimeout(timer);
    
    if (error.name === 'AbortError') {
      console.log(`   ❌ TIMEOUT after ${timeout}ms`);
      return { success: false, error: 'Timeout' };
    }
    
    console.log(`   ❌ Error: ${error.message}`);
    return { success: false, error: error.message };
  }
}

// Test direct extraction from REGIME_FALLBACK
async function testDirectExtraction() {
  console.log('\n🔬 Testing Direct Data Extraction...\n');
  
  // Simulate what response-synthesizer should do
  const { data } = await supabase
    .from('legal_articles')
    .select('full_content')
    .eq('document_type', 'REGIME_FALLBACK')
    .ilike('full_content', '%aberta dos morros%')
    .limit(1);
  
  if (data && data[0]) {
    const content = data[0].full_content;
    console.log('📄 Raw content sample:', content.substring(0, 300));
    
    // Test extraction patterns
    const heightPattern = /(\d{1,3})\s*metros/gi;
    const heights = content.match(heightPattern);
    console.log('🏗️ Heights found:', heights || 'none');
    
    const coefPattern = /coeficiente[^0-9]*(\d+[,\.]\d+)/gi;
    const coefficients = content.match(coefPattern);
    console.log('📊 Coefficients found:', coefficients || 'none');
    
    const zonePattern = /ZOT\s*\d+[A-Z\-]*\d*/gi;
    const zones = content.match(zonePattern);
    console.log('🗺️ Zones found:', zones || 'none');
  }
}

// Main test execution
async function main() {
  console.log('='.repeat(60));
  console.log('    TESTE REGIME_FALLBACK DATA EXTRACTION');
  console.log('='.repeat(60));
  
  // Step 1: Verify data exists
  await verifyRegimeFallbackData();
  
  // Step 2: Test direct extraction
  await testDirectExtraction();
  
  // Step 3: Test edge function
  console.log('\n' + '='.repeat(60));
  console.log('    TESTING EDGE FUNCTION RESPONSES');
  console.log('='.repeat(60));
  
  let passed = 0;
  let failed = 0;
  
  for (const test of regimeTests) {
    const result = await testEdgeFunction(test);
    if (result.success) {
      passed++;
    } else {
      failed++;
    }
    
    // Small delay between tests
    await new Promise(resolve => setTimeout(resolve, 1000));
  }
  
  // Summary
  console.log('\n' + '='.repeat(60));
  console.log('    SUMMARY');
  console.log('='.repeat(60));
  
  const total = passed + failed;
  const successRate = total > 0 ? (passed / total) * 100 : 0;
  
  console.log(`\n📈 Success Rate: ${successRate.toFixed(0)}%`);
  console.log(`✅ Passed: ${passed}/${total}`);
  console.log(`❌ Failed: ${failed}/${total}`);
  
  if (successRate < 60) {
    console.log('\n⚠️ CRITICAL: REGIME_FALLBACK extraction not working properly');
    console.log('Check that:');
    console.log('1. agentic-rag is querying REGIME_FALLBACK');
    console.log('2. response-synthesizer is extracting values from full_content');
    console.log('3. Data is being properly formatted in response');
  } else if (successRate < 80) {
    console.log('\n⚠️ System needs improvements for REGIME_FALLBACK handling');
  } else {
    console.log('\n✅ REGIME_FALLBACK extraction working properly!');
  }
  
  console.log('\n' + '='.repeat(60));
}

main().catch(console.error);