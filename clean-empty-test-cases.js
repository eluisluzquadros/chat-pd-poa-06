import { createClient } from '@supabase/supabase-js';

const supabaseUrl = 'https://ngrqwmvuhvjkeohesbxs.supabase.co';
const supabaseServiceKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Im5ncnF3bXZ1aHZqa2VvaGVzYnhzIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc1MzYwOTAxNywiZXhwIjoyMDY5MTg1MDE3fQ.7jVZP70RAjpfFPfehZt5Gr3vSxn8DZ3YyPJNjCwZXEo';

const supabase = createClient(supabaseUrl, supabaseServiceKey);

async function cleanEmptyTestCases() {
  console.log('🧹 Cleaning empty test cases...\n');

  try {
    // Delete all records where question or expected_answer is empty/null
    const { data, error } = await supabase
      .from('qa_test_cases')
      .delete()
      .or('question.is.null,question.eq.,expected_answer.is.null,expected_answer.eq.')
      .select();

    if (error) {
      console.error('❌ Error deleting empty records:', error);
      return;
    }

    console.log(`✅ Deleted ${data?.length || 0} empty test cases`);

    // Count remaining records
    const { count } = await supabase
      .from('qa_test_cases')
      .select('*', { count: 'exact', head: true });

    console.log(`📊 Remaining test cases: ${count || 0}`);

    if (count === 0) {
      console.log('\n💡 All test cases were empty and have been removed.');
      console.log('   Use the "Adicionar Caso de Teste" button in the admin interface to add new test cases.');
    }

  } catch (error) {
    console.error('❌ Unexpected error:', error);
  }
}

cleanEmptyTestCases();