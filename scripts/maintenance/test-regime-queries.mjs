#!/usr/bin/env node

/**
 * Test regime urbanístico queries through agentic-rag
 */

import { createClient } from '@supabase/supabase-js';

const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL || 'https://ngrqwmvuhvjkeohesbxs.supabase.co';
const SUPABASE_ANON_KEY = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Im5ncnF3bXZ1aHZqa2VvaGVzYnhzIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTM2MDkwMTcsImV4cCI6MjA2OTE4NTAxN30.K3uyyzjyAQ17ohQGCUFx_RiMufblLyQzvxEZHakqKrg';

const supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY);

console.log('🏗️ TESTING REGIME URBANÍSTICO QUERIES');
console.log('=' .repeat(50));

const testQueries = [
  'zot 2 altura máxima',
  'qual é a altura máxima no bairro petrópolis',
  'altura máxima jardim são pedro',
  'ZOT 13 parâmetros',
  'coeficiente aproveitamento centro',
  'regime urbanístico jardim floresta'
];

async function testQuery(query) {
  console.log(`\n📍 Query: "${query}"`);
  console.log('-'.repeat(40));
  
  try {
    const startTime = Date.now();
    
    const { data, error } = await supabase.functions.invoke('agentic-rag', {
      body: { 
        query,
        bypassCache: true 
      }
    });

    const elapsed = Date.now() - startTime;

    if (error) {
      console.log(`❌ Error: ${error.message}`);
      return;
    }

    if (data?.response) {
      console.log(`✅ Response received (${elapsed}ms)`);
      console.log(`📊 Sources: ${JSON.stringify(data.sources)}`);
      
      // Check if response contains regime info
      const hasRegimeInfo = data.response.toLowerCase().includes('altura') || 
                           data.response.toLowerCase().includes('zot') ||
                           data.response.toLowerCase().includes('coeficiente') ||
                           data.response.toLowerCase().includes('bairro');
      
      if (hasRegimeInfo) {
        console.log('✅ Contains regime urbanístico information');
        console.log('\nResponse preview:');
        console.log(data.response.substring(0, 300) + '...');
      } else {
        console.log('⚠️ Response may not contain regime information');
        console.log('\nFull response:');
        console.log(data.response);
      }
    } else {
      console.log('❌ No response received');
    }
  } catch (err) {
    console.log(`❌ Exception: ${err.message}`);
  }
}

async function main() {
  // First check if data exists
  console.log('\n📊 Checking regime_urbanistico_consolidado table...');
  const { count, error } = await supabase
    .from('regime_urbanistico_consolidado')
    .select('*', { count: 'exact', head: true });
  
  if (error) {
    console.log(`⚠️ Cannot access table: ${error.message}`);
    console.log('Note: RLS may be blocking access. Execute 18-fix-regime-rls.sql first.');
  } else {
    console.log(`✅ Table has ${count || 0} records`);
  }

  // Test each query
  for (const query of testQueries) {
    await testQuery(query);
    // Small delay between requests
    await new Promise(resolve => setTimeout(resolve, 1000));
  }

  console.log('\n' + '='.repeat(50));
  console.log('✅ TESTS COMPLETED');
}

main().catch(console.error);