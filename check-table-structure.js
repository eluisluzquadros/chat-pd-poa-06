import { createClient } from '@supabase/supabase-js';

const supabaseUrl = 'https://ngrqwmvuhvjkeohesbxs.supabase.co';
const supabaseServiceKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Im5ncnF3bXZ1aHZqa2VvaGVzYnhzIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc1MzYwOTAxNywiZXhwIjoyMDY5MTg1MDE3fQ.7jVZP70RAjpfFPfehZt5Gr3vSxn8DZ3YyPJNjCwZXEo';

const supabase = createClient(supabaseUrl, supabaseServiceKey);

async function checkTableStructure() {
  console.log('🔍 Checking qa_test_cases table structure...\n');

  try {
    // Get one record to see the structure
    const { data, error } = await supabase
      .from('qa_test_cases')
      .select('*')
      .limit(1);

    if (error) {
      console.error('❌ Error fetching table structure:', error);
      return;
    }

    if (data && data.length > 0) {
      console.log('📋 Table columns:');
      console.log(Object.keys(data[0]));
      console.log('\n📝 Sample record:');
      console.log(JSON.stringify(data[0], null, 2));
    }

  } catch (error) {
    console.error('❌ Unexpected error:', error);
  }
}

checkTableStructure();