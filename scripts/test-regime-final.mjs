#!/usr/bin/env node

/**
 * Final test of regime urbanístico queries after RLS fix
 */

import { createClient } from '@supabase/supabase-js';

const SUPABASE_URL = 'https://ngrqwmvuhvjkeohesbxs.supabase.co';
const SUPABASE_ANON_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Im5ncnF3bXZ1aHZqa2VvaGVzYnhzIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTM2MDkwMTcsImV4cCI6MjA2OTE4NTAxN30.K3uyyzjyAQ17ohQGCUFx_RiMufblLyQzvxEZHakqKrg';

const supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY);

console.log('🚀 FINAL TEST: Regime Urbanístico Queries');
console.log('=' .repeat(50));

async function testDataAccess() {
  console.log('\n📊 Testing data access with ANON key...');
  
  const { count, error } = await supabase
    .from('regime_urbanistico_consolidado')
    .select('*', { count: 'exact', head: true });
  
  if (error) {
    console.log(`❌ Cannot access data: ${error.message}`);
    console.log('⚠️  Execute scripts/emergency-sql/18-fix-regime-rls.sql first!');
    return false;
  } else {
    console.log(`✅ Data accessible: ${count} records`);
    return true;
  }
}

async function testSpecificQueries() {
  console.log('\n🔍 Testing specific queries...');
  
  // Test ZOT 02
  const { data: z2 } = await supabase
    .from('regime_urbanistico_consolidado')
    .select('*')
    .eq('Zona', 'ZOT 02')
    .limit(3);
  
  console.log(`\n📍 ZOT 02 results: ${z2?.length || 0}`);
  if (z2?.length) {
    z2.forEach(r => 
      console.log(`   - ${r.Bairro}: ${r.Altura_Maxima___Edificacao_Isolada}m, CA ${r.Coeficiente_de_Aproveitamento___Basico}`)
    );
  }
  
  // Test Petrópolis
  const { data: pet } = await supabase
    .from('regime_urbanistico_consolidado')
    .select('*')
    .eq('Bairro', 'PETRÓPOLIS')
    .limit(3);
  
  console.log(`\n🏠 PETRÓPOLIS results: ${pet?.length || 0}`);
  if (pet?.length) {
    pet.forEach(r => 
      console.log(`   - ${r.Zona}: ${r.Altura_Maxima___Edificacao_Isolada}m, CA ${r.Coeficiente_de_Aproveitamento___Basico}`)
    );
  }
}

async function testAgenticRAG() {
  console.log('\n🤖 Testing Agentic-RAG Edge Function...');
  
  const testQueries = [
    'zot 2 altura máxima',
    'altura máxima petrópolis'
  ];
  
  for (const query of testQueries) {
    console.log(`\n📍 Query: "${query}"`);
    
    try {
      const { data, error } = await supabase.functions.invoke('agentic-rag', {
        body: { query, bypassCache: true }
      });
      
      if (error) {
        console.log(`❌ Error: ${error.message}`);
        continue;
      }
      
      if (data?.sources?.regime_urbanistico > 0) {
        console.log(`✅ Found ${data.sources.regime_urbanistico} regime results`);
        console.log(`📄 Response preview: ${data.response.substring(0, 200)}...`);
      } else {
        console.log(`⚠️  No regime results found (sources: ${JSON.stringify(data.sources)})`);
      }
    } catch (err) {
      console.log(`❌ Exception: ${err.message}`);
    }
  }
}

async function main() {
  const dataAccessible = await testDataAccess();
  
  if (dataAccessible) {
    await testSpecificQueries();
    await testAgenticRAG();
    
    console.log('\n' + '='.repeat(50));
    console.log('✅ ALL TESTS COMPLETED');
    console.log('🎯 Regime urbanístico queries should now work in /chat');
  }
}

main().catch(console.error);