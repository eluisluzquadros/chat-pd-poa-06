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

async function createLLMMetricsTable() {
  console.log('🔧 Creating llm_metrics table using execute_sql_query...');
  
  try {
    // Tentar usar execute_sql_query se existir
    const { data, error } = await supabase.rpc('execute_sql_query', {
      query_text: `
        -- Criar tabela llm_metrics se não existir
        CREATE TABLE IF NOT EXISTS public.llm_metrics (
            id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
            created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
            session_id UUID,
            user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
            model_name TEXT NOT NULL,
            provider TEXT,
            prompt_tokens INTEGER,
            completion_tokens INTEGER,
            total_tokens INTEGER,
            execution_time_ms INTEGER,
            cost DECIMAL(10, 6),
            request_type TEXT,
            success BOOLEAN DEFAULT true,
            error_message TEXT,
            metadata JSONB DEFAULT '{}'::jsonb
        );
      `
    });

    if (error) {
      console.error('❌ Error with execute_sql_query:', error);
      
      // Tentar criar a tabela de outra forma
      console.log('🔧 Trying alternative method...');
      
      // Primeiro verificar se já existe
      const { data: checkData, error: checkError } = await supabase
        .from('llm_metrics')
        .select('id')
        .limit(1);
      
      if (checkError?.message?.includes('does not exist')) {
        console.log('❌ Table definitely does not exist');
        console.log('📋 Manual creation required. Please run this SQL in Supabase Dashboard:');
        console.log(`
=== SQL TO RUN IN SUPABASE DASHBOARD ===

-- Criar tabela llm_metrics
CREATE TABLE IF NOT EXISTS public.llm_metrics (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    session_id UUID,
    user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
    model_name TEXT NOT NULL,
    provider TEXT,
    prompt_tokens INTEGER,
    completion_tokens INTEGER,
    total_tokens INTEGER,
    execution_time_ms INTEGER,
    cost DECIMAL(10, 6),
    request_type TEXT,
    success BOOLEAN DEFAULT true,
    error_message TEXT,
    metadata JSONB DEFAULT '{}'::jsonb
);

-- Criar índices
CREATE INDEX IF NOT EXISTS idx_llm_metrics_session_id ON public.llm_metrics(session_id);
CREATE INDEX IF NOT EXISTS idx_llm_metrics_user_id ON public.llm_metrics(user_id);
CREATE INDEX IF NOT EXISTS idx_llm_metrics_created_at ON public.llm_metrics(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_llm_metrics_model_name ON public.llm_metrics(model_name);

-- Habilitar RLS
ALTER TABLE public.llm_metrics ENABLE ROW LEVEL SECURITY;

-- Políticas de segurança
CREATE POLICY "Users can view their own metrics" ON public.llm_metrics
    FOR SELECT USING (auth.uid() = user_id OR auth.uid() IN (
        SELECT id FROM auth.users WHERE raw_user_meta_data->>'role' = 'admin'
    ));

CREATE POLICY "Service role can do everything" ON public.llm_metrics
    FOR ALL USING (true);

-- Permissões
GRANT ALL ON public.llm_metrics TO service_role;
GRANT SELECT ON public.llm_metrics TO authenticated;
GRANT INSERT ON public.llm_metrics TO authenticated;

=========================================
        `);
        return false;
      } else if (!checkError) {
        console.log('✅ Table already exists!');
        return true;
      }
    } else {
      console.log('✅ Table created successfully using execute_sql_query');
      return true;
    }
  } catch (err) {
    console.error('❌ Unexpected error:', err);
    return false;
  }
}

async function testTable() {
  console.log('🧪 Testing llm_metrics table...');
  
  try {
    // Tentar inserir um registro de teste
    const testData = {
      model_name: 'test-model',
      provider: 'test',
      prompt_tokens: 10,
      completion_tokens: 20,
      total_tokens: 30,
      execution_time_ms: 100,
      cost: 0.001,
      request_type: 'test',
      success: true
    };
    
    const { data: insertData, error: insertError } = await supabase
      .from('llm_metrics')
      .insert([testData])
      .select();
    
    if (insertError) {
      console.error('❌ Error inserting test data:', insertError);
      return false;
    }
    
    console.log('✅ Test insert successful');
    
    // Deletar o registro de teste
    if (insertData && insertData[0]) {
      const { error: deleteError } = await supabase
        .from('llm_metrics')
        .delete()
        .eq('id', insertData[0].id);
      
      if (!deleteError) {
        console.log('✅ Test record cleaned up');
      }
    }
    
    return true;
  } catch (err) {
    console.error('❌ Test failed:', err);
    return false;
  }
}

async function main() {
  console.log('🚀 Starting LLM Metrics table creation...\n');
  
  const created = await createLLMMetricsTable();
  
  if (created) {
    await testTable();
  }
  
  console.log('\n✨ Process completed!');
}

main().catch(console.error);