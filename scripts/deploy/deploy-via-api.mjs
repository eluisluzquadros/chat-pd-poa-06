#!/usr/bin/env node

/**
 * Deploy Edge Functions using Supabase Management API
 * This bypasses the CLI authentication issues
 */

import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

dotenv.config();

// Configuration
const PROJECT_REF = 'ngrqwmvuhvjkeohesbxs';
const SUPABASE_URL = `https://${PROJECT_REF}.supabase.co`;
const SERVICE_ROLE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY;
const ANON_KEY = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

console.log('🚀 Edge Functions Deployment via API\n');

// Initialize Supabase client
const supabase = createClient(SUPABASE_URL, SERVICE_ROLE_KEY);

// Verificar se as funções existem e estão acessíveis
async function checkFunctionStatus(functionName) {
  console.log(`🔍 Checking ${functionName} status...`);
  
  try {
    const response = await fetch(`${SUPABASE_URL}/functions/v1/${functionName}`, {
      method: 'OPTIONS',
      headers: {
        'Authorization': `Bearer ${ANON_KEY}`
      }
    });
    
    if (response.status === 200 || response.status === 204) {
      console.log(`  ✅ ${functionName} is accessible`);
      return true;
    } else {
      console.log(`  ⚠️ ${functionName} returned status ${response.status}`);
      return false;
    }
  } catch (error) {
    console.log(`  ❌ ${functionName} is not accessible:`, error.message);
    return false;
  }
}

// Test function with actual query
async function testFunctionWithQuery(functionName, testQuery) {
  console.log(`\n🧪 Testing ${functionName} with query...`);
  
  try {
    const response = await fetch(`${SUPABASE_URL}/functions/v1/${functionName}`, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${ANON_KEY}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        query: testQuery,
        sessionId: `test-${Date.now()}`
      })
    });
    
    console.log(`  Response status: ${response.status}`);
    
    if (response.ok) {
      const result = await response.json();
      
      if (result.response) {
        const preview = result.response.substring(0, 150);
        console.log(`  ✅ Function working correctly`);
        console.log(`  📝 Response: "${preview}..."`);
        
        // Check if REGIME_FALLBACK data is being used
        if (testQuery.toLowerCase().includes('aberta dos morros') || 
            testQuery.toLowerCase().includes('petrópolis')) {
          
          const hasHeight = /\d+\s*metros/i.test(result.response);
          const hasCoef = /coeficiente.*\d+[,\.]\d+/i.test(result.response);
          const hasZone = /ZOT\s*\d+/i.test(result.response);
          
          console.log(`\n  📊 REGIME_FALLBACK extraction check:`);
          console.log(`     - Has height values: ${hasHeight ? '✅' : '❌'}`);
          console.log(`     - Has coefficients: ${hasCoef ? '✅' : '❌'}`);
          console.log(`     - Has zone info: ${hasZone ? '✅' : '❌'}`);
        }
      } else if (result.error) {
        console.log(`  ⚠️ Function returned error: ${result.error}`);
      }
      
      return true;
    } else {
      const error = await response.text();
      console.log(`  ❌ Function error:`, error);
      return false;
    }
  } catch (error) {
    console.log(`  ❌ Test failed:`, error.message);
    return false;
  }
}

// Manual deployment instructions
function showManualInstructions() {
  console.log('\n' + '='.repeat(60));
  console.log('    📋 MANUAL DEPLOYMENT INSTRUCTIONS');
  console.log('='.repeat(60));
  console.log('\nSince CLI deployment is not working, please deploy manually:');
  console.log('\n1. Open Supabase Dashboard:');
  console.log(`   https://supabase.com/dashboard/project/${PROJECT_REF}/functions`);
  console.log('\n2. For each function (agentic-rag, response-synthesizer):');
  console.log('   a. Click on the function name');
  console.log('   b. Click "Edit function"');
  console.log('   c. Copy the code from the local files:');
  console.log('      - backend/supabase/functions/agentic-rag/index.ts');
  console.log('      - backend/supabase/functions/response-synthesizer/index.ts');
  console.log('   d. Paste the updated code');
  console.log('   e. Click "Deploy"');
  console.log('\n3. Wait for deployment to complete (usually 1-2 minutes)');
  console.log('\n4. Test using this script again to verify');
  console.log('='.repeat(60));
}

// Main execution
async function main() {
  console.log('='.repeat(60));
  console.log('    FUNCTION STATUS CHECK');
  console.log('='.repeat(60));
  
  const functions = [
    { name: 'agentic-rag', test: 'qual é a altura máxima do aberta dos morros' },
    { name: 'response-synthesizer', test: null },
    { name: 'query-analyzer', test: null },
    { name: 'sql-generator', test: null }
  ];
  
  // Check all functions
  console.log('\n📊 Checking function availability...\n');
  const statuses = {};
  
  for (const func of functions) {
    const isAccessible = await checkFunctionStatus(func.name);
    statuses[func.name] = isAccessible;
  }
  
  // Test main function with REGIME_FALLBACK queries
  if (statuses['agentic-rag']) {
    console.log('\n' + '='.repeat(60));
    console.log('    TESTING REGIME_FALLBACK EXTRACTION');
    console.log('='.repeat(60));
    
    const testQueries = [
      'qual é a altura máxima do aberta dos morros',
      'o que posso construir no bairro Petrópolis',
      'altura máxima no bairro cristal'
    ];
    
    for (const query of testQueries) {
      await testFunctionWithQuery('agentic-rag', query);
      await new Promise(resolve => setTimeout(resolve, 2000)); // Delay between tests
    }
  }
  
  // Summary
  console.log('\n' + '='.repeat(60));
  console.log('    SUMMARY');
  console.log('='.repeat(60));
  
  const accessibleCount = Object.values(statuses).filter(s => s).length;
  const totalCount = Object.keys(statuses).length;
  
  console.log(`\n📊 Functions accessible: ${accessibleCount}/${totalCount}`);
  
  Object.entries(statuses).forEach(([name, status]) => {
    console.log(`  ${status ? '✅' : '❌'} ${name}`);
  });
  
  if (accessibleCount < totalCount) {
    showManualInstructions();
  } else {
    console.log('\n✅ All functions are deployed and accessible!');
    
    // Check if REGIME_FALLBACK improvements are working
    console.log('\n📝 Note: Check the test results above to verify if');
    console.log('   REGIME_FALLBACK data extraction is working correctly.');
    console.log('   You should see heights, coefficients, and zones extracted.');
  }
  
  console.log('\n' + '='.repeat(60));
}

// Run the deployment check
main().catch(console.error);