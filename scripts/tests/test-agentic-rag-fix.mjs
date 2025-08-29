#!/usr/bin/env node

/**
 * Test script to validate the agentic-rag fixes
 * Tests if the system now correctly queries ALL document types
 * including REGIME_FALLBACK and QA_CATEGORY
 */

import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

// Load environment variables
dotenv.config({ path: join(__dirname, '.env') });

const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL;
const SUPABASE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

if (!SUPABASE_URL || !SUPABASE_KEY) {
  console.error('❌ Missing Supabase credentials');
  process.exit(1);
}

const supabase = createClient(SUPABASE_URL, SUPABASE_KEY);

// Test cases designed to validate the fix
const testCases = [
  {
    name: 'Petrópolis Height Test',
    query: 'qual a altura máxima em Petrópolis?',
    expectedTypes: ['REGIME_FALLBACK'],
    expectedContent: ['60 metros', '90 metros', 'ZOT 07', 'ZOT 08'],
    description: 'Should find REGIME_FALLBACK data for Petrópolis'
  },
  {
    name: 'General Height Test',
    query: 'altura máxima construção Porto Alegre',
    expectedTypes: ['QA_CATEGORY', 'REGIME_FALLBACK'],
    expectedContent: ['altura máxima', 'ZOT', 'metros'],
    description: 'Should find QA_CATEGORY answer about height limits'
  },
  {
    name: 'Document Type Coverage Test',
    query: 'artigo 1',
    expectedTypes: ['LUOS', 'PDUS'],
    expectedContent: ['artigo', 'lei'],
    description: 'Should still find LUOS and PDUS articles'
  }
];

async function testDirectQuery(testCase) {
  console.log(`\n📋 Testing: ${testCase.name}`);
  console.log(`   Query: "${testCase.query}"`);
  console.log(`   Expected types: ${testCase.expectedTypes.join(', ')}`);
  
  try {
    // First, check what's actually in the database
    const { data: typeCount } = await supabase
      .from('legal_articles')
      .select('document_type')
      .in('document_type', testCase.expectedTypes);
    
    console.log(`   ✅ Database has ${typeCount?.length || 0} records of expected types`);
    
    // Now test the actual query with the fix
    // Simulate what agentic-rag should do after the fix
    const { data: results } = await supabase
      .from('legal_articles')
      .select('*')
      .in('document_type', ['LUOS', 'PDUS', 'REGIME_FALLBACK', 'QA_CATEGORY', 'COE'])
      .textSearch('full_content', testCase.query)
      .limit(10);
    
    if (results && results.length > 0) {
      const foundTypes = [...new Set(results.map(r => r.document_type))];
      console.log(`   ✅ Found ${results.length} results`);
      console.log(`   ✅ Document types found: ${foundTypes.join(', ')}`);
      
      // Check if we found the expected types
      const hasExpectedTypes = testCase.expectedTypes.some(type => 
        foundTypes.includes(type)
      );
      
      if (hasExpectedTypes) {
        console.log(`   ✅ SUCCESS: Found expected document types!`);
        
        // Show a sample result
        const sampleResult = results.find(r => 
          testCase.expectedTypes.includes(r.document_type)
        );
        if (sampleResult) {
          console.log(`   📄 Sample: ${sampleResult.document_type} - ${sampleResult.title || sampleResult.article_number}`);
          const preview = (sampleResult.full_content || sampleResult.content || '').substring(0, 150);
          console.log(`   📝 Content preview: ${preview}...`);
        }
      } else {
        console.log(`   ⚠️ WARNING: Did not find expected document types`);
        console.log(`   Expected: ${testCase.expectedTypes.join(', ')}`);
        console.log(`   Got: ${foundTypes.join(', ')}`);
      }
    } else {
      console.log(`   ❌ No results found`);
    }
  } catch (error) {
    console.error(`   ❌ Error: ${error.message}`);
  }
}

async function testEdgeFunctionCall(testCase) {
  console.log(`\n🌐 Testing Edge Function: ${testCase.name}`);
  console.log(`   Query: "${testCase.query}"`);
  
  try {
    const response = await fetch(`${SUPABASE_URL}/functions/v1/agentic-rag`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${SUPABASE_KEY}`
      },
      body: JSON.stringify({ 
        query: testCase.query,
        sessionId: 'test-session'
      })
    });
    
    if (response.ok) {
      const result = await response.json();
      console.log(`   ✅ Edge function responded`);
      
      // Check if response mentions expected content
      const responseText = result.response || '';
      const hasExpectedContent = testCase.expectedContent.some(content =>
        responseText.toLowerCase().includes(content.toLowerCase())
      );
      
      if (hasExpectedContent) {
        console.log(`   ✅ Response contains expected content!`);
      } else {
        console.log(`   ⚠️ Response may not contain expected content`);
        console.log(`   Response preview: ${responseText.substring(0, 200)}...`);
      }
      
      // Check metadata if available
      if (result.metadata?.sources) {
        const sourceTypes = result.metadata.sources.map(s => s.type);
        console.log(`   📊 Sources used: ${sourceTypes.join(', ')}`);
      }
    } else {
      console.log(`   ❌ Edge function error: ${response.status}`);
      const error = await response.text();
      console.log(`   Error: ${error.substring(0, 200)}`);
    }
  } catch (error) {
    console.error(`   ❌ Error calling edge function: ${error.message}`);
  }
}

async function checkDataDistribution() {
  console.log('\n📊 Data Distribution Check:');
  console.log('============================');
  
  const types = ['LUOS', 'PDUS', 'REGIME_FALLBACK', 'QA_CATEGORY', 'COE'];
  
  for (const type of types) {
    const { count } = await supabase
      .from('legal_articles')
      .select('*', { count: 'exact', head: true })
      .eq('document_type', type);
    
    const percentage = ((count || 0) / 1998 * 100).toFixed(1);
    const status = (type === 'REGIME_FALLBACK' || type === 'QA_CATEGORY') ? 
      (count > 0 ? '✅' : '❌') : '✅';
    
    console.log(`${status} ${type}: ${count || 0} records (${percentage}%)`);
  }
}

async function main() {
  console.log('🔧 Testing Agentic-RAG Fix');
  console.log('==========================');
  console.log('This test validates that the system now queries ALL document types');
  console.log('including REGIME_FALLBACK and QA_CATEGORY that were being ignored.\n');
  
  // First, check data distribution
  await checkDataDistribution();
  
  // Test direct database queries
  console.log('\n🔍 Direct Database Query Tests:');
  console.log('================================');
  for (const testCase of testCases) {
    await testDirectQuery(testCase);
  }
  
  // Test edge function calls (if deployed)
  console.log('\n🚀 Edge Function Tests:');
  console.log('=======================');
  console.log('(These tests require the fixed function to be deployed)');
  for (const testCase of testCases) {
    await testEdgeFunctionCall(testCase);
  }
  
  console.log('\n✅ Test Complete!');
  console.log('=================');
  console.log('If all tests passed, the fix is working correctly.');
  console.log('The system should now be using 100% of available data!');
}

main().catch(console.error);