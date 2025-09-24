import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

// Load environment variables
dotenv.config({ path: join(__dirname, '..', '.env.local') });

const supabaseUrl = process.env.SUPABASE_URL || process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!supabaseUrl || !supabaseServiceKey) {
  console.error('❌ Missing environment variables');
  process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseServiceKey);

async function testLLMMetrics() {
  console.log('🧪 Testing llm_metrics table...\n');
  
  // 1. Verificar se a tabela existe
  console.log('1️⃣ Checking if table exists...');
  const { data: tableCheck, error: tableError } = await supabase
    .from('llm_metrics')
    .select('count')
    .limit(1);
  
  if (tableError) {
    console.error('❌ Table does not exist or is not accessible:', tableError);
    return;
  }
  
  console.log('✅ Table exists!');
  
  // 2. Verificar estrutura da tabela
  console.log('\n2️⃣ Checking table structure...');
  const { data: columns, error: columnsError } = await supabase.rpc('execute_sql_query', {
    query_text: `
      SELECT column_name, data_type, is_nullable
      FROM information_schema.columns
      WHERE table_schema = 'public' AND table_name = 'llm_metrics'
      ORDER BY ordinal_position;
    `
  });
  
  if (!columnsError && columns) {
    console.log('✅ Table columns:');
    columns.forEach(col => {
      console.log(`   - ${col.column_name}: ${col.data_type} (nullable: ${col.is_nullable})`);
    });
  }
  
  // 3. Verificar políticas RLS
  console.log('\n3️⃣ Checking RLS policies...');
  const { data: policies, error: policiesError } = await supabase.rpc('execute_sql_query', {
    query_text: `
      SELECT polname, polcmd, polroles
      FROM pg_policies
      WHERE schemaname = 'public' AND tablename = 'llm_metrics';
    `
  });
  
  if (!policiesError && policies) {
    console.log('✅ RLS Policies:');
    policies.forEach(pol => {
      console.log(`   - ${pol.polname}: ${pol.polcmd}`);
    });
  }
  
  // 4. Contar registros existentes
  console.log('\n4️⃣ Counting existing records...');
  const { count, error: countError } = await supabase
    .from('llm_metrics')
    .select('*', { count: 'exact', head: true });
  
  if (!countError) {
    console.log(`✅ Total records in table: ${count || 0}`);
  }
  
  console.log('\n✨ Test completed!');
}

testLLMMetrics().catch(console.error);