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
  console.log('🔧 Creating llm_metrics table...');
  
  const { error } = await supabase.rpc('exec_sql', {
    sql: `
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

      -- Criar índices para melhor performance
      CREATE INDEX IF NOT EXISTS idx_llm_metrics_session_id ON public.llm_metrics(session_id);
      CREATE INDEX IF NOT EXISTS idx_llm_metrics_user_id ON public.llm_metrics(user_id);
      CREATE INDEX IF NOT EXISTS idx_llm_metrics_created_at ON public.llm_metrics(created_at DESC);
      CREATE INDEX IF NOT EXISTS idx_llm_metrics_model_name ON public.llm_metrics(model_name);

      -- Habilitar RLS
      ALTER TABLE public.llm_metrics ENABLE ROW LEVEL SECURITY;

      -- Políticas de segurança
      DROP POLICY IF EXISTS "Users can view their own metrics" ON public.llm_metrics;
      CREATE POLICY "Users can view their own metrics" ON public.llm_metrics
          FOR SELECT USING (auth.uid() = user_id);

      DROP POLICY IF EXISTS "Service role can insert metrics" ON public.llm_metrics;
      CREATE POLICY "Service role can insert metrics" ON public.llm_metrics
          FOR INSERT WITH CHECK (true);

      DROP POLICY IF EXISTS "Service role can update metrics" ON public.llm_metrics;
      CREATE POLICY "Service role can update metrics" ON public.llm_metrics
          FOR UPDATE USING (true);

      -- Grant permissions
      GRANT ALL ON public.llm_metrics TO service_role;
      GRANT SELECT ON public.llm_metrics TO authenticated;

      -- Adicionar comentário na tabela
      COMMENT ON TABLE public.llm_metrics IS 'Armazena métricas de uso dos modelos LLM';
    `
  });

  if (error) {
    console.error('❌ Error creating table:', error);
    // Tentar criar via SQL direto se exec_sql não existir
    const { error: directError } = await supabase
      .from('llm_metrics')
      .select('count')
      .limit(1);
    
    if (directError?.message?.includes('does not exist')) {
      console.log('⚠️ Table does not exist, needs manual creation');
      console.log('📋 Please run the SQL script: scripts/fix-llm-metrics.sql');
    }
  } else {
    console.log('✅ Table llm_metrics created successfully');
  }
}

async function testTable() {
  console.log('🧪 Testing llm_metrics table...');
  
  const { data, error } = await supabase
    .from('llm_metrics')
    .select('count')
    .limit(1);
  
  if (error) {
    console.error('❌ Error accessing table:', error);
    return false;
  }
  
  console.log('✅ Table llm_metrics is accessible');
  return true;
}

async function main() {
  console.log('🚀 Starting LLM Metrics fix...\n');
  
  await createLLMMetricsTable();
  await testTable();
  
  console.log('\n✨ Process completed!');
}

main().catch(console.error);