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

console.log('🔍 Verificando estrutura do banco de dados\n');

async function checkDatabase() {
  // Verificar tabela regime_urbanistico
  console.log('📊 Tabela regime_urbanistico:');
  const { count: regimeCount } = await supabase
    .from('regime_urbanistico')
    .select('*', { count: 'exact', head: true });
  console.log(`  Total de registros: ${regimeCount}`);
  
  // Verificar alguns registros de exemplo
  const { data: samples } = await supabase
    .from('regime_urbanistico')
    .select('bairro, zona, altura_maxima, coef_aproveitamento_basico, coef_aproveitamento_maximo')
    .limit(5);
  
  console.log('\n  Exemplos de registros:');
  samples?.forEach(s => {
    console.log(`    ${s.bairro} / ${s.zona}: ${s.altura_maxima}m, CA básico=${s.coef_aproveitamento_basico || 'null'}, CA máximo=${s.coef_aproveitamento_maximo || 'null'}`);
  });
  
  // Verificar ZOT 04 especificamente
  console.log('\n📍 Registros da ZOT 04:');
  const { data: zot04 } = await supabase
    .from('regime_urbanistico')
    .select('*')
    .eq('zona', 'ZOT 04');
  
  console.log(`  Total: ${zot04?.length || 0} registros`);
  zot04?.slice(0, 3).forEach(z => {
    console.log(`    ${z.bairro}: altura=${z.altura_maxima}m, CA básico=${z.coef_aproveitamento_basico}, CA máximo=${z.coef_aproveitamento_maximo}`);
  });
  
  // Verificar outras ZOTs com coeficientes
  console.log('\n📍 ZOTs com coeficientes definidos:');
  const { data: withCoef } = await supabase
    .from('regime_urbanistico')
    .select('zona, coef_aproveitamento_basico, coef_aproveitamento_maximo')
    .not('coef_aproveitamento_basico', 'is', null)
    .limit(10);
  
  const uniqueZones = [...new Set(withCoef?.map(w => w.zona))];
  console.log(`  ZOTs com CA definido: ${uniqueZones.join(', ')}`);
  
  // Verificar qa_test_cases
  console.log('\n📊 Tabela qa_test_cases:');
  const { count: qaCount } = await supabase
    .from('qa_test_cases')
    .select('*', { count: 'exact', head: true });
  console.log(`  Total de casos de teste: ${qaCount}`);
  
  // Verificar cache
  console.log('\n📊 Tabela query_cache:');
  const { count: cacheCount } = await supabase
    .from('query_cache')
    .select('*', { count: 'exact', head: true });
  console.log(`  Total de queries em cache: ${cacheCount}`);
}

checkDatabase().catch(console.error);