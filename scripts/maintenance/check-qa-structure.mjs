import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

// Load environment variables
dotenv.config({ path: join(__dirname, '.env.local') });

const SUPABASE_URL = process.env.SUPABASE_URL || process.env.NEXT_PUBLIC_SUPABASE_URL;
const SUPABASE_SERVICE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY;

const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_KEY);

async function checkStructure() {
  console.log('🔍 Verificando estrutura da tabela qa_test_cases...\n');
  
  // Buscar um registro de exemplo
  const { data: sample, error } = await supabase
    .from('qa_test_cases')
    .select('*')
    .limit(1)
    .single();
  
  if (error) {
    console.error('Erro:', error);
    return;
  }
  
  console.log('📊 Estrutura da tabela (campos):');
  console.log(Object.keys(sample));
  
  console.log('\n📝 Exemplo de registro:');
  console.log(JSON.stringify(sample, null, 2));
}

checkStructure().catch(console.error);