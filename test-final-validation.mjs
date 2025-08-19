#!/usr/bin/env node

import { createClient } from '@supabase/supabase-js';

const supabase = createClient(
  'https://ngrqwmvuhvjkeohesbxs.supabase.co',
  'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Im5ncnF3bXZ1aHZqa2VvaGVzYnhzIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTM2MDkwMTcsImV4cCI6MjA2OTE4NTAxN30.K3uyyzjyAQ17ohQGCUFx_RiMufblLyQzvxEZHakqKrg'
);

console.log('🎯 FINAL VALIDATION: Original User Queries');
console.log('='.repeat(50));

const queries = [
  'zot 2 altura máxima',
  'qual é a altura máxima no bairro petrópolis'
];

for (const query of queries) {
  console.log(`\n📍 "${query}"`);
  
  try {
    const { data, error } = await supabase.functions.invoke('agentic-rag', {
      body: { query, bypassCache: true }
    });

    if (error) {
      console.log(`❌ Error: ${error.message}`);
      continue;
    }

    const regimeResults = data?.sources?.regime_urbanistico || 0;
    
    if (regimeResults > 0) {
      console.log(`✅ SUCCESS: ${regimeResults} regime results`);
      console.log(`Response: ${data.response.substring(0, 200)}...`);
    } else {
      console.log(`❌ FAILED: No regime results`);
    }
  } catch (err) {
    console.log(`❌ Exception: ${err.message}`);
  }
  
  await new Promise(resolve => setTimeout(resolve, 1000));
}

console.log('\n🎉 Ready for /chat testing!');