import { createClient } from '@supabase/supabase-js';

const supabaseUrl = 'https://ngrqwmvuhvjkeohesbxs.supabase.co';
const supabaseKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Im5ncnF3bXZ1aHZqa2VvaGVzYnhzIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc1MzYwOTAxNywiZXhwIjoyMDY5MTg1MDE3fQ.7jVZP70RAjpfFPfehZt5Gr3vSxn8DZ3YyPJNjCwZXEo';

const supabase = createClient(supabaseUrl, supabaseKey);

async function testCristal() {
  console.log('=== Testing Cristal Data ===\n');

  // Test 1: Get all unique bairros
  console.log('1. Getting unique bairros:');
  const { data: allData } = await supabase
    .from('document_rows')
    .select('row_data')
    .eq('dataset_id', '1FTENHpX4aLxmAoxvrEeGQn0fej-wxTMQRQs_XBjPQPY')
    .limit(400);
  
  if (allData) {
    const bairros = [...new Set(allData.map(row => row.row_data?.Bairro).filter(Boolean))];
    console.log(`Total unique bairros: ${bairros.length}`);
    
    // Check for Cristal variations
    const cristalVariations = bairros.filter(b => 
      b.toLowerCase().includes('cristal') || 
      b.toLowerCase().includes('crystal')
    );
    
    if (cristalVariations.length > 0) {
      console.log('Found Cristal variations:', cristalVariations);
    } else {
      console.log('Cristal not found. Sample bairros:', bairros.slice(0, 10));
    }
  }

  // Test 2: Direct RPC test for Cristal
  console.log('\n2. Testing RPC with Cristal query:');
  const cristalQuery = `
    SELECT DISTINCT row_data->>'Bairro' as bairro
    FROM document_rows 
    WHERE dataset_id = '1FTENHpX4aLxmAoxvrEeGQn0fej-wxTMQRQs_XBjPQPY'
    AND row_data->>'Bairro' LIKE '%CRISTAL%'
  `;
  
  const { data: rpcResult, error: rpcError } = await supabase
    .rpc('execute_sql_query', { query_text: cristalQuery });
  
  if (rpcError) {
    console.log('❌ RPC Error:', rpcError.message);
  } else {
    console.log('✅ RPC Result:', rpcResult);
  }

  // Test 3: Check all bairros starting with C
  console.log('\n3. Bairros starting with C:');
  const cQuery = `
    SELECT DISTINCT row_data->>'Bairro' as bairro
    FROM document_rows 
    WHERE dataset_id = '1FTENHpX4aLxmAoxvrEeGQn0fej-wxTMQRQs_XBjPQPY'
    AND row_data->>'Bairro' LIKE 'C%'
    ORDER BY row_data->>'Bairro'
  `;
  
  const { data: cBairros } = await supabase
    .rpc('execute_sql_query', { query_text: cQuery });
  
  console.log('Bairros with C:', cBairros);

  // Test 4: Test índice calculation
  console.log('\n4. Testing índice de aproveitamento for any bairro:');
  const indexQuery = `
    SELECT 
      row_data->>'Bairro' as bairro,
      row_data->>'Zona' as zona,
      row_data->>'Coeficiente de Aproveitamento - Básico' as ca_basico,
      row_data->>'Coeficiente de Aproveitamento - Máximo' as ca_maximo
    FROM document_rows 
    WHERE dataset_id = '17_GMWnJC1sKff-YS0wesgxsvo3tnZdgSSb4JZ0ZjpCk'
    AND row_data->>'Bairro' IS NOT NULL
    LIMIT 5
  `;
  
  const { data: indexData } = await supabase
    .rpc('execute_sql_query', { query_text: indexQuery });
  
  console.log('Sample índice data:', indexData);

  // Test 5: ZOTs with coef > 4
  console.log('\n5. Testing ZOTs with coeficiente > 4:');
  const zotQuery = `
    SELECT DISTINCT
      row_data->>'Zona' as zona,
      (row_data->>'Coeficiente de Aproveitamento - Máximo')::numeric as ca_maximo
    FROM document_rows 
    WHERE dataset_id = '17_GMWnJC1sKff-YS0wesgxsvo3tnZdgSSb4JZ0ZjpCk'
    AND row_data->>'Coeficiente de Aproveitamento - Máximo' IS NOT NULL
    AND (row_data->>'Coeficiente de Aproveitamento - Máximo')::numeric > 4
    ORDER BY row_data->>'Zona'
  `;
  
  const { data: zotData, error: zotError } = await supabase
    .rpc('execute_sql_query', { query_text: zotQuery });
  
  if (zotError) {
    console.log('❌ ZOT Error:', zotError.message);
  } else {
    console.log('✅ ZOTs > 4:', zotData);
  }
}

testCristal().catch(console.error);