#!/usr/bin/env node

/**
 * Test specific problematic queries
 */

import { createClient } from '@supabase/supabase-js';

const SUPABASE_URL = 'https://ngrqwmvuhvjkeohesbxs.supabase.co';
const SUPABASE_ANON_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Im5ncnF3bXZ1aHZqa2VvaGVzYnhzIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTM2MDkwMTcsImV4cCI6MjA2OTE4NTAxN30.K3uyyzjyAQ17ohQGCUFx_RiMufblLyQzvxEZHakqKrg';

const supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY);

console.log('🧪 Testing Specific Problematic Queries');
console.log('=' .repeat(50));

const queries = [
  'zot 2 altura máxima',
  'qual é a altura máxima no bairro petrópolis',
  'altura máxima jardim são pedro',
  'coeficiente aproveitamento zot 8'
];

async function testQuery(query) {
  console.log(`\n📍 Testing: "${query}"`);
  console.log('-'.repeat(40));
  
  try {
    const startTime = Date.now();
    
    const { data, error } = await supabase.functions.invoke('agentic-rag', {
      body: { query, bypassCache: true }
    });

    const elapsed = Date.now() - startTime;

    if (error) {
      console.log(`❌ Error: ${error.message}`);
      return;
    }

    if (data?.sources) {
      console.log(`📊 Sources: ${JSON.stringify(data.sources)}`);
      
      if (data.sources.regime_urbanistico > 0) {
        console.log(`✅ SUCCESS: Found ${data.sources.regime_urbanistico} regime results`);
        
        // Check if response contains specific expected info
        const response = data.response.toLowerCase();
        if (query.includes('zot 2') && response.includes('9')) {
          console.log('✅ Contains expected "9m" for ZOT 02');
        }
        if (query.includes('petrópolis') && (response.includes('60') || response.includes('90'))) {
          console.log('✅ Contains expected heights for Petrópolis');
        }
        
        console.log(`📄 Response preview: ${data.response.substring(0, 300)}...`);
      } else {
        console.log(`❌ FAILED: No regime results found`);
        console.log(`📄 Response: ${data.response.substring(0, 200)}...`);
      }
    }
  } catch (err) {
    console.log(`❌ Exception: ${err.message}`);
  }
}

async function main() {
  for (const query of queries) {
    await testQuery(query);
    // Small delay between requests
    await new Promise(resolve => setTimeout(resolve, 1000));
  }
  
  console.log('\n' + '='.repeat(50));
  console.log('✅ TESTS COMPLETED');
}

main().catch(console.error);