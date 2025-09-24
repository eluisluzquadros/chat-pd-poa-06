import { createClient } from '@supabase/supabase-js';

const supabaseUrl = 'https://ngrqwmvuhvjkeohesbxs.supabase.co';
const serviceKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Im5ncnF3bXZ1aHZqa2VvaGVzYnhzIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc1MzYwOTAxNywiZXhwIjoyMDY5MTg1MDE3fQ.7jVZP70RAjpfFPfehZt5Gr3vSxn8DZ3YyPJNjCwZXEo';

const supabase = createClient(supabaseUrl, serviceKey);

async function debugSQL() {
  console.log('=== Debug SQL Execution ===\n');

  // Test 1: All bairros
  console.log('1. Testing all bairros query:');
  const { data: bairros, error: bErr } = await supabase.rpc('execute_sql_query', {
    query_text: "SELECT DISTINCT row_data->>'Bairro' as bairro FROM document_rows WHERE dataset_id = '17_GMWnJC1sKff-YS0wesgxsvo3tnZdgSSb4JZ0ZjpCk' AND row_data->>'Bairro' IS NOT NULL ORDER BY 1"
  });
  console.log('Found:', bairros?.length, 'bairros');
  if (bErr) console.log('Error:', bErr);

  // Test 2: Três Figueiras details
  console.log('\n2. Testing Três Figueiras:');
  const { data: tresFig, error: tfErr } = await supabase.rpc('execute_sql_query', {
    query_text: "SELECT row_data->>'Zona' as zona, row_data->>'Altura Máxima - Edificação Isolada' as altura_maxima, row_data->>'Coeficiente de Aproveitamento - Básico' as ca_basico, row_data->>'Coeficiente de Aproveitamento - Máximo' as ca_maximo FROM document_rows WHERE dataset_id = '17_GMWnJC1sKff-YS0wesgxsvo3tnZdgSSb4JZ0ZjpCk' AND UPPER(row_data->>'Bairro') = 'TRÊS FIGUEIRAS'"
  });
  console.log('Found:', tresFig?.length, 'rows');
  console.log('Data:', tresFig);
  if (tfErr) console.log('Error:', tfErr);

  // Test 3: ZOT 8 bairros
  console.log('\n3. Testing ZOT 8 bairros:');
  const { data: zot8, error: z8Err } = await supabase.rpc('execute_sql_query', {
    query_text: "SELECT DISTINCT row_data->>'Bairro' as bairro FROM document_rows WHERE dataset_id = '17_GMWnJC1sKff-YS0wesgxsvo3tnZdgSSb4JZ0ZjpCk' AND (row_data->>'Zona' = 'ZOT 08' OR row_data->>'Zona' LIKE 'ZOT 08.%')"
  });
  console.log('Found:', zot8?.length, 'bairros with ZOT 8');
  if (z8Err) console.log('Error:', z8Err);

  // Test if the issue is with the edge function limiting results
  console.log('\n4. Testing if sql-generator limits results:');
  const { data: directCall } = await supabase.functions.invoke('sql-generator', {
    body: {
      query: 'liste todos os bairros de porto alegre',
      analysisResult: {
        requiredDatasets: ['17_GMWnJC1sKff-YS0wesgxsvo3tnZdgSSb4JZ0ZjpCk'],
        strategy: 'structured_only'
      }
    }
  });
  
  console.log('SQL Generator response:', JSON.stringify(directCall, null, 2));
}

debugSQL().catch(console.error);