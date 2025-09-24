import { createClient } from '@supabase/supabase-js';

const supabaseUrl = 'https://ngrqwmvuhvjkeohesbxs.supabase.co';
const supabaseKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Im5ncnF3bXZ1aHZqa2VvaGVzYnhzIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc1MzYwOTAxNywiZXhwIjoyMDY5MTg1MDE3fQ.7jVZP70RAjpfFPfehZt5Gr3vSxn8DZ3YyPJNjCwZXEo';

const supabase = createClient(supabaseUrl, supabaseKey);

async function testQueries() {
  console.log('=== Testing Supabase Queries ===\n');

  // Test 1: Check if document_rows exists
  console.log('1. Testing document_rows table:');
  const { data: rows, error: rowsError } = await supabase
    .from('document_rows')
    .select('count')
    .limit(1);
  
  if (rowsError) {
    console.log('❌ Error:', rowsError.message);
  } else {
    console.log('✅ Table exists');
  }

  // Test 2: Count total rows
  console.log('\n2. Counting total rows:');
  const { count, error: countError } = await supabase
    .from('document_rows')
    .select('*', { count: 'exact', head: true });
  
  if (countError) {
    console.log('❌ Error:', countError.message);
  } else {
    console.log(`✅ Total rows: ${count}`);
  }

  // Test 3: Get sample data
  console.log('\n3. Getting sample data:');
  const { data: sampleData, error: sampleError } = await supabase
    .from('document_rows')
    .select('dataset_id, row_data')
    .limit(3);
  
  if (sampleError) {
    console.log('❌ Error:', sampleError.message);
  } else {
    console.log('✅ Sample data:');
    sampleData?.forEach((row, i) => {
      console.log(`Row ${i + 1}:`, {
        dataset_id: row.dataset_id,
        keys: row.row_data ? Object.keys(row.row_data).slice(0, 5) : 'null'
      });
    });
  }

  // Test 4: Test execute_sql_query function
  console.log('\n4. Testing execute_sql_query RPC:');
  const { data: rpcData, error: rpcError } = await supabase
    .rpc('execute_sql_query', { 
      query_text: 'SELECT COUNT(*) as total FROM document_rows' 
    });
  
  if (rpcError) {
    console.log('❌ RPC Error:', rpcError.message);
  } else {
    console.log('✅ RPC Result:', rpcData);
  }

  // Test 5: Check for Cristal data
  console.log('\n5. Searching for Cristal:');
  const { data: cristalData, error: cristalError } = await supabase
    .from('document_rows')
    .select('row_data')
    .ilike('row_data->Bairro', '%cristal%')
    .limit(5);
  
  if (cristalError) {
    console.log('❌ Error:', cristalError.message);
    
    // Try alternative approach
    console.log('Trying alternative search...');
    const { data: altData, error: altError } = await supabase
      .from('document_rows')
      .select('row_data')
      .limit(100);
    
    if (!altError && altData) {
      const cristalRows = altData.filter(row => 
        row.row_data?.Bairro?.toLowerCase().includes('cristal')
      );
      console.log(`Found ${cristalRows.length} rows with Cristal`);
    }
  } else {
    console.log(`✅ Found ${cristalData?.length || 0} rows`);
  }

  // Test 6: Check document_metadata
  console.log('\n6. Checking document_metadata:');
  const { data: metadata, error: metaError } = await supabase
    .from('document_metadata')
    .select('id, title, schema')
    .limit(5);
  
  if (metaError) {
    console.log('❌ Error:', metaError.message);
  } else {
    console.log('✅ Metadata found:');
    metadata?.forEach(doc => {
      console.log(`- ${doc.id}: ${doc.title}`);
    });
  }

  // Test 7: Check specific datasets
  console.log('\n7. Checking specific datasets:');
  const datasetIds = [
    '17_GMWnJC1sKff-YS0wesgxsvo3tnZdgSSb4JZ0ZjpCk',
    '1FTENHpX4aLxmAoxvrEeGQn0fej-wxTMQRQs_XBjPQPY'
  ];
  
  for (const id of datasetIds) {
    const { count: dsCount } = await supabase
      .from('document_rows')
      .select('*', { count: 'exact', head: true })
      .eq('dataset_id', id);
    
    console.log(`Dataset ${id}: ${dsCount || 0} rows`);
  }
}

testQueries().catch(console.error);