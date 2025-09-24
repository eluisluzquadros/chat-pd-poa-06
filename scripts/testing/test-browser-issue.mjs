import { createClient } from '@supabase/supabase-js';

const supabaseUrl = 'https://ngrqwmvuhvjkeohesbxs.supabase.co';
const anonKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Im5ncnF3bXZ1aHZqa2VvaGVzYnhzIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTM2MDkwMTcsImV4cCI6MjA2OTE4NTAxN30.K3uyyzjyAQ17ohQGCUFx_RiMufblLyQzvxEZHakqKrg';

const supabase = createClient(supabaseUrl, anonKey);

async function debugBrowserIssue() {
  console.log('=== Debugging Browser Issue ===\n');

  // Test the exact same call the browser makes
  const testQuery = 'Qual é o índice de aproveitamento médio do bairro Cristal?';
  
  console.log('1. Testing agentic-rag with bypassCache:');
  const { data, error } = await supabase.functions.invoke('agentic-rag', {
    body: {
      message: testQuery,
      userRole: 'user',
      sessionId: 'browser-test-' + Date.now(),
      userId: 'test-user',
      bypassCache: true
    }
  });

  if (error) {
    console.log('❌ Error:', error);
    return;
  }

  console.log('Response type:', typeof data);
  console.log('Response keys:', Object.keys(data || {}));
  console.log('Full response:', JSON.stringify(data, null, 2));
  
  // Check if it's still cached
  if (data?.sources?.cached) {
    console.log('\n⚠️  STILL RETURNING CACHED RESPONSE!');
    console.log('Cache status:', data.sources);
  }

  // Check the actual response content
  if (data?.response) {
    const responseStart = data.response.substring(0, 200);
    console.log('\nResponse preview:', responseStart);
    
    if (responseStart.includes('não posso fornecer') || responseStart.includes('não está dentro do escopo')) {
      console.log('\n❌ STILL GETTING WRONG RESPONSE!');
    } else if (responseStart.includes('3.3125') || responseStart.includes('3,3125')) {
      console.log('\n✅ CORRECT RESPONSE!');
    }
  }

  // Test SQL execution directly
  console.log('\n\n2. Testing SQL execution directly:');
  const sqlQuery = "SELECT AVG(((row_data->>'Coeficiente de Aproveitamento - Básico')::numeric + (row_data->>'Coeficiente de Aproveitamento - Máximo')::numeric) / 2) as indice_medio FROM document_rows WHERE dataset_id = '17_GMWnJC1sKff-YS0wesgxsvo3tnZdgSSb4JZ0ZjpCk' AND row_data->>'Bairro' = 'CRISTAL'";
  
  const { data: sqlData, error: sqlError } = await supabase
    .rpc('execute_sql_query', { query_text: sqlQuery });
  
  console.log('Direct SQL result:', sqlData);

  // Check edge function logs
  console.log('\n\n3. Checking recent edge function invocations:');
  console.log('Go to: https://supabase.com/dashboard/project/ngrqwmvuhvjkeohesbxs/functions/agentic-rag/logs');
  console.log('Look for recent errors or cache hits');

  // Test with a completely new query
  console.log('\n\n4. Testing with a new unique query:');
  const uniqueQuery = `Qual é o índice de aproveitamento médio do bairro Cristal? (teste ${Date.now()})`;
  
  const { data: newData, error: newError } = await supabase.functions.invoke('agentic-rag', {
    body: {
      message: uniqueQuery,
      userRole: 'user',
      sessionId: 'unique-test-' + Date.now(),
      bypassCache: true
    }
  });

  if (newData?.response) {
    const newResponseStart = newData.response.substring(0, 200);
    console.log('New query response:', newResponseStart);
  }
}

debugBrowserIssue().catch(console.error);