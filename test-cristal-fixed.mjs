import { createClient } from '@supabase/supabase-js';

const supabaseUrl = 'https://ngrqwmvuhvjkeohesbxs.supabase.co';
const supabaseKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Im5ncnF3bXZ1aHZqa2VvaGVzYnhzIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc1MzYwOTAxNywiZXhwIjoyMDY5MTg1MDE3fQ.7jVZP70RAjpfFPfehZt5Gr3vSxn8DZ3YyPJNjCwZXEo';

const supabase = createClient(supabaseUrl, supabaseKey);

async function testCristalFixed() {
  console.log('=== Testing with Fixed Queries (no leading spaces) ===\n');

  // Test 1: Cristal data
  console.log('1. Testing Cristal query:');
  const cristalQuery = "SELECT DISTINCT row_data->>'Bairro' as bairro, row_data->>'Zona' as zona FROM document_rows WHERE dataset_id = '1FTENHpX4aLxmAoxvrEeGQn0fej-wxTMQRQs_XBjPQPY' AND row_data->>'Bairro' = 'CRISTAL'";
  
  const { data: cristalResult, error: cristalError } = await supabase
    .rpc('execute_sql_query', { query_text: cristalQuery });
  
  if (cristalError) {
    console.log('❌ Error:', cristalError.message);
  } else {
    console.log('✅ Cristal Result:', cristalResult);
  }

  // Test 2: Índice de aproveitamento médio
  console.log('\n2. Testing índice médio for Cristal:');
  const indexQuery = "SELECT AVG(((row_data->>'Coeficiente de Aproveitamento - Básico')::numeric + (row_data->>'Coeficiente de Aproveitamento - Máximo')::numeric) / 2) as indice_medio FROM document_rows WHERE dataset_id = '17_GMWnJC1sKff-YS0wesgxsvo3tnZdgSSb4JZ0ZjpCk' AND row_data->>'Bairro' = 'CRISTAL'";
  
  const { data: indexResult, error: indexError } = await supabase
    .rpc('execute_sql_query', { query_text: indexQuery });
  
  if (indexError) {
    console.log('❌ Error:', indexError.message);
  } else {
    console.log('✅ Índice médio:', indexResult);
  }

  // Test 3: ZOTs with coef > 4
  console.log('\n3. Testing ZOTs with coeficiente > 4:');
  const zotQuery = "SELECT DISTINCT row_data->>'Zona' as zona, (row_data->>'Coeficiente de Aproveitamento - Máximo')::numeric as ca_maximo FROM document_rows WHERE dataset_id = '17_GMWnJC1sKff-YS0wesgxsvo3tnZdgSSb4JZ0ZjpCk' AND (row_data->>'Coeficiente de Aproveitamento - Máximo')::numeric > 4 ORDER BY 1";
  
  const { data: zotResult, error: zotError } = await supabase
    .rpc('execute_sql_query', { query_text: zotQuery });
  
  if (zotError) {
    console.log('❌ Error:', zotError.message);
  } else {
    console.log('✅ ZOTs > 4:', zotResult);
  }

  // Test 4: Três Figueiras data
  console.log('\n4. Testing Três Figueiras:');
  const tresQuery = "SELECT DISTINCT row_data->>'Bairro' as bairro, row_data->>'Zona' as zona FROM document_rows WHERE dataset_id = '1FTENHpX4aLxmAoxvrEeGQn0fej-wxTMQRQs_XBjPQPY' AND (row_data->>'Bairro' = 'TRÊS FIGUEIRAS' OR row_data->>'Bairro' = 'TRES FIGUEIRAS')";
  
  const { data: tresResult } = await supabase
    .rpc('execute_sql_query', { query_text: tresQuery });
  
  console.log('Três Figueiras Result:', tresResult);

  // Test 5: ZOT 08 bairros
  console.log('\n5. Testing ZOT 08 bairros:');
  const zot08Query = "SELECT row_data->>'Bairro' as bairro, row_data->>'Zona' as zona FROM document_rows WHERE dataset_id = '1FTENHpX4aLxmAoxvrEeGQn0fej-wxTMQRQs_XBjPQPY' AND row_data->>'Zona' LIKE 'ZOT 08%' ORDER BY 2, 1";
  
  const { data: zot08Result } = await supabase
    .rpc('execute_sql_query', { query_text: zot08Query });
  
  console.log(`ZOT 08 total bairros: ${zot08Result?.length || 0}`);
  if (zot08Result && zot08Result.length > 0) {
    console.log('First 10:', zot08Result.slice(0, 10));
  }

  // Test 6: Count all bairros
  console.log('\n6. Testing total bairros count:');
  const countQuery = "SELECT COUNT(DISTINCT row_data->>'Bairro') as total FROM document_rows WHERE dataset_id = '1FTENHpX4aLxmAoxvrEeGQn0fej-wxTMQRQs_XBjPQPY'";
  
  const { data: countResult } = await supabase
    .rpc('execute_sql_query', { query_text: countQuery });
  
  console.log('Total bairros:', countResult);
}

testCristalFixed().catch(console.error);