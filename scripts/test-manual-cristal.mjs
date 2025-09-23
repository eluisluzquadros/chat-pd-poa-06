import { createClient } from '@supabase/supabase-js';

const supabaseUrl = 'https://ngrqwmvuhvjkeohesbxs.supabase.co';
const anonKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Im5ncnF3bXZ1aHZqa2VvaGVzYnhzIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTM2MDkwMTcsImV4cCI6MjA2OTE4NTAxN30.K3uyyzjyAQ17ohQGCUFx_RiMufblLyQzvxEZHakqKrg';

const supabase = createClient(supabaseUrl, anonKey);

async function testCristalFlow() {
  console.log('=== Testing Complete Cristal Flow ===\n');

  // 1. Test Query Analyzer
  console.log('1. Testing Query Analyzer:');
  const { data: analysisData, error: analysisError } = await supabase.functions.invoke('query-analyzer', {
    body: {
      query: 'Qual é o índice de aproveitamento médio do bairro Cristal?'
    }
  });
  
  if (analysisError) {
    console.log('❌ Analysis Error:', analysisError);
    return;
  }
  
  console.log('✅ Analysis Result:', analysisData);
  
  // 2. Test SQL Generator
  console.log('\n2. Testing SQL Generator:');
  const { data: sqlData, error: sqlError } = await supabase.functions.invoke('sql-generator', {
    body: {
      query: 'Qual é o índice de aproveitamento médio do bairro Cristal?',
      analysisResult: analysisData
    }
  });
  
  if (sqlError) {
    console.log('❌ SQL Error:', sqlError);
    return;
  }
  
  console.log('✅ SQL Result:', JSON.stringify(sqlData, null, 2));
  
  // 3. Test full Agentic RAG
  console.log('\n3. Testing Agentic RAG:');
  const { data: ragData, error: ragError } = await supabase.functions.invoke('agentic-rag', {
    body: {
      message: 'Qual é o índice de aproveitamento médio do bairro Cristal?',
      userRole: 'user',
      sessionId: 'test-' + Date.now()
    }
  });
  
  if (ragError) {
    console.log('❌ RAG Error:', ragError);
    return;
  }
  
  console.log('✅ RAG Result:', ragData);
  
  // 4. Test other problematic queries
  console.log('\n\n=== Testing Other Queries ===');
  
  const testQueries = [
    'Quais as ZOT com coeficiente de aproveitamento maior do que 4?',
    'O que pode ser construído no bairro Três Figueiras?',
    'zot 8 pertence a que bairro?'
  ];
  
  for (const query of testQueries) {
    console.log(`\nTesting: "${query}"`);
    const { data, error } = await supabase.functions.invoke('agentic-rag', {
      body: {
        message: query,
        userRole: 'user',
        sessionId: 'test-' + Date.now()
      }
    });
    
    if (error) {
      console.log('❌ Error:', error);
    } else {
      console.log('✅ Response preview:', data.response?.substring(0, 100) + '...');
    }
  }
}

testCristalFlow().catch(console.error);