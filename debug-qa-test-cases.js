// Debug script to check qa_test_cases table
import { createClient } from '@supabase/supabase-js';

const supabaseUrl = 'https://ngrqwmvuhvjkeohesbxs.supabase.co';
const supabaseAnonKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Im5ncnF3bXZ1aHZqa2VvaGVzYnhzIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTM2MDkwMTcsImV4cCI6MjA2OTE4NTAxN30.K3uyyzjyAQ17ohQGCUFx_RiMufblLyQzvxEZHakqKrg';

if (!supabaseUrl || !supabaseAnonKey) {
  console.error('❌ Missing Supabase environment variables');
  process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseAnonKey);

async function debugTestCases() {
  console.log('🔍 Debugging qa_test_cases table...\n');

  try {
    // Count total records
    const { count, error: countError } = await supabase
      .from('qa_test_cases')
      .select('*', { count: 'exact', head: true });

    if (countError) {
      console.error('❌ Error counting records:', countError);
      return;
    }

    console.log(`📊 Total records in qa_test_cases: ${count || 0}\n`);

    // Fetch all records
    const { data, error } = await supabase
      .from('qa_test_cases')
      .select('*')
      .order('created_at', { ascending: false });

    if (error) {
      console.error('❌ Error fetching records:', error);
      return;
    }

    if (!data || data.length === 0) {
      console.log('⚠️  No test cases found in the database');
      console.log('\n💡 You need to add test cases using the "Adicionar Caso de Teste" button in the admin dashboard');
      return;
    }

    console.log(`✅ Found ${data.length} test cases:\n`);

    // Display each test case
    data.forEach((testCase, index) => {
      console.log(`📝 Test Case ${index + 1}:`);
      console.log(`   ID: ${testCase.id}`);
      console.log(`   Question: ${testCase.question || '[EMPTY]'}`);
      console.log(`   Expected Answer: ${testCase.expected_answer || '[EMPTY]'}`);
      console.log(`   Category: ${testCase.category || '[EMPTY]'}`);
      console.log(`   Difficulty: ${testCase.difficulty || '[EMPTY]'}`);
      console.log(`   Active: ${testCase.is_active}`);
      console.log(`   SQL Related: ${testCase.is_sql_related}`);
      console.log(`   Tags: ${testCase.tags ? testCase.tags.join(', ') : '[NO TAGS]'}`);
      console.log(`   Created: ${new Date(testCase.created_at).toLocaleString('pt-BR')}`);
      console.log('');
    });

  } catch (error) {
    console.error('❌ Unexpected error:', error);
  }
}

debugTestCases();