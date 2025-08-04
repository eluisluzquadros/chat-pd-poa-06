import { createClient } from '@supabase/supabase-js';

const supabase = createClient(
  'https://ngrqwmvuhvjkeohesbxs.supabase.co',
  'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Im5ncnF3bXZ1aHZqa2VvaGVzYnhzIiwicm9sZSI6ImFub24iLCJpYXQiOjE3MzU5MjA2MTIsImV4cCI6MjA1MTQ5NjYxMn0.9lz0zqLRUsLei1tuF9qL45RU9Cjue-6Qs1BvKQ3VQME'
);

async function checkStructure() {
  console.log('🔍 Checking qa_test_cases structure\n');

  // Get a few test cases
  const { data: testCases, error } = await supabase
    .from('qa_test_cases')
    .select('*')
    .limit(3);

  if (error) {
    console.error('Error fetching test cases:', error);
    return;
  }

  if (testCases && testCases.length > 0) {
    console.log('Sample test case:');
    const sample = testCases[0];
    
    console.log('\nAll fields:');
    Object.entries(sample).forEach(([key, value]) => {
      const type = typeof value;
      const preview = type === 'string' && value.length > 50 
        ? value.substring(0, 50) + '...' 
        : value;
      console.log(`  ${key}: [${type}] ${preview}`);
    });

    console.log('\n🔑 ID fields analysis:');
    testCases.forEach((tc, i) => {
      console.log(`\nTest case ${i + 1}:`);
      console.log(`  id: ${tc.id} (type: ${typeof tc.id})`);
      console.log(`  test_id: ${tc.test_id} (type: ${typeof tc.test_id})`);
      
      // Check if id looks like a UUID
      const isUUID = tc.id && tc.id.match(/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i);
      console.log(`  id is UUID: ${isUUID ? 'YES' : 'NO'}`);
    });
  }

  // Check what the validation results table expects
  console.log('\n📊 Checking qa_validation_results structure:');
  
  // Try to insert a test record to see what format it expects
  const testRunId = 'test-' + Date.now();
  
  // First create a test run
  const { data: testRun } = await supabase
    .from('qa_validation_runs')
    .insert({
      id: testRunId,
      model: 'test',
      status: 'running',
      total_tests: 1,
      passed_tests: 0,
      overall_accuracy: 0,
      avg_response_time_ms: 0,
      started_at: new Date().toISOString()
    })
    .select()
    .single();

  if (testRun && testCases[0]) {
    // Try with UUID (id field)
    console.log('\nTrying to insert with UUID (id field):');
    const { error: uuidError } = await supabase
      .from('qa_validation_results')
      .insert({
        test_case_id: testCases[0].id,
        validation_run_id: testRun.id,
        model: 'test',
        actual_answer: 'test',
        is_correct: true,
        accuracy_score: 1.0,
        response_time_ms: 100
      });
    
    if (uuidError) {
      console.log('  ❌ Failed with UUID:', uuidError.message);
    } else {
      console.log('  ✅ Success with UUID!');
    }

    // Try with integer (test_id field)
    console.log('\nTrying to insert with integer (test_id field):');
    const { error: intError } = await supabase
      .from('qa_validation_results')
      .insert({
        test_case_id: testCases[0].test_id,
        validation_run_id: testRun.id,
        model: 'test',
        actual_answer: 'test',
        is_correct: true,
        accuracy_score: 1.0,
        response_time_ms: 100
      });
    
    if (intError) {
      console.log('  ❌ Failed with integer:', intError.message);
    } else {
      console.log('  ✅ Success with integer!');
    }

    // Clean up
    await supabase.from('qa_validation_results').delete().eq('validation_run_id', testRun.id);
    await supabase.from('qa_validation_runs').delete().eq('id', testRun.id);
  }

  console.log('\n✅ Analysis complete!');
}

checkStructure().catch(console.error);