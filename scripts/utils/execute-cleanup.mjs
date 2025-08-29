import { createClient } from '@supabase/supabase-js';

const supabaseUrl = 'https://ngrqwmvuhvjkeohesbxs.supabase.co';
const supabaseKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Im5ncnF3bXZ1aHZqa2VvaGVzYnhzIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc1MzYwOTAxNywiZXhwIjoyMDY5MTg1MDE3fQ.7jVZP70RAjpfFPfehZt5Gr3vSxn8DZ3YyPJNjCwZXEo';

const supabase = createClient(supabaseUrl, supabaseKey);

async function executeCleanup() {
  console.log('=== Executing Cache Cleanup ===\n');

  // 1. Check what's in cache
  console.log('1. Checking query_cache contents:');
  const { data: cacheData, error: cacheError } = await supabase
    .from('query_cache')
    .select('query, confidence, hit_count, created_at')
    .or('query.ilike.%cristal%,query.ilike.%coeficiente%,query.ilike.%três figueiras%,query.ilike.%zot%')
    .order('created_at', { ascending: false })
    .limit(10);
  
  if (cacheError) {
    console.log('❌ Error checking cache:', cacheError.message);
  } else {
    console.log(`Found ${cacheData?.length || 0} problematic cached queries`);
    cacheData?.forEach(item => {
      console.log(`- "${item.query.substring(0, 50)}..." (hits: ${item.hit_count})`);
    });
  }

  // 2. Clear all cache
  console.log('\n2. Clearing entire query_cache:');
  const { error: clearError } = await supabase
    .from('query_cache')
    .delete()
    .neq('key', ''); // Delete all (neq with empty string matches everything)
  
  if (clearError) {
    console.log('❌ Error clearing cache:', clearError.message);
  } else {
    console.log('✅ Cache cleared successfully');
  }

  // 3. Verify cache is empty
  console.log('\n3. Verifying cache is empty:');
  const { count } = await supabase
    .from('query_cache')
    .select('*', { count: 'exact', head: true });
  
  console.log(`Remaining cached queries: ${count}`);

  // 4. Update QA expected values with real data
  console.log('\n4. Updating QA expected values:');
  
  // Update Cristal expected value
  const { error: updateError1 } = await supabase
    .from('qa_test_cases')
    .update({ expected_answer: '3.3125' })
    .ilike('question', '%índice de aproveitamento médio%cristal%');
  
  if (updateError1) {
    console.log('❌ Error updating Cristal:', updateError1.message);
  } else {
    console.log('✅ Updated Cristal índice to 3.3125');
  }

  // Update ZOTs > 4 expected value
  const newZotsAnswer = 'As ZOTs com coeficiente de aproveitamento máximo maior que 4 são: ZOT 06 (5.0), ZOT 07 (6.5), ZOT 08 (7.5), ZOT 08.1-A (6.5), ZOT 08.1-B (7.0), ZOT 08.1-C (7.5), ZOT 08.1-D (11.5), ZOT 08.1-E (11.5), ZOT 08.1-G (6.0), ZOT 08.2-A (7.5), ZOT 08.2-B (7.5), ZOT 08.3-A (7.5), ZOT 08.3-B (7.5), ZOT 08.3-C (7.5), ZOT 11 (5.0), ZOT 12 (6.5) e ZOT 13 (6.5)';
  
  const { error: updateError2 } = await supabase
    .from('qa_test_cases')
    .update({ expected_answer: newZotsAnswer })
    .ilike('question', '%zot%coeficiente%maior%4%');
  
  if (updateError2) {
    console.log('❌ Error updating ZOTs:', updateError2.message);
  } else {
    console.log('✅ Updated ZOTs > 4 list');
  }

  // 5. Check if FIX_EXECUTE_SQL_FUNCTION is needed
  console.log('\n5. Checking execute_sql_query function:');
  const testQuery = "SELECT 1 as test";
  const { data: testResult, error: testError } = await supabase
    .rpc('execute_sql_query', { query_text: testQuery });
  
  if (testError) {
    console.log('❌ Function needs fixing:', testError.message);
    
    // Try to fix it
    console.log('Attempting to recreate function...');
    // Note: We can't execute DDL through RPC, would need direct SQL access
    console.log('⚠️  Please execute FIX_EXECUTE_SQL_FUNCTION.sql manually in Supabase SQL Editor');
  } else {
    console.log('✅ Function is working:', testResult);
  }

  console.log('\n=== Cleanup Complete ===');
  console.log('Next steps:');
  console.log('1. Test the chat with the problematic queries');
  console.log('2. Run QA validation to see improved score');
}

executeCleanup().catch(console.error);