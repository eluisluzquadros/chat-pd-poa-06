import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

// Load environment variables
dotenv.config({ path: join(__dirname, '..', '.env.local') });

const SUPABASE_URL = process.env.SUPABASE_URL || process.env.NEXT_PUBLIC_SUPABASE_URL;
const SUPABASE_SERVICE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY;

const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_KEY);

async function testMaxHeight() {
  console.log('🏢 TESTANDO QUERY DE ALTURA MÁXIMA\n');
  console.log('=' .repeat(50));
  
  // 1. Testar RPC
  const query = 'SELECT bairro, zona, altura_maxima FROM regime_urbanistico WHERE altura_maxima IS NOT NULL ORDER BY altura_maxima DESC LIMIT 5';
  
  console.log('1. Testando RPC execute_sql_query:');
  const { data: rpcData, error: rpcError } = await supabase
    .rpc('execute_sql_query', { query_text: query });
  
  if (rpcError) {
    console.log('   ❌ Erro RPC:', rpcError.message);
  } else if (rpcData) {
    console.log('   ✅ RPC funcionou! Top 5 alturas:');
    rpcData.forEach(r => console.log(`      ${r.bairro} / ${r.zona}: ${r.altura_maxima}m`));
  }
  
  // 2. Testar query direta
  console.log('\n2. Testando query direta via Supabase:');
  const { data, error } = await supabase
    .from('regime_urbanistico')
    .select('bairro, zona, altura_maxima')
    .not('altura_maxima', 'is', null)
    .order('altura_maxima', { ascending: false })
    .limit(5);
  
  if (!error && data) {
    console.log('   ✅ Query direta funcionou! Top 5 alturas:');
    data.forEach(r => console.log(`      ${r.bairro} / ${r.zona}: ${r.altura_maxima}m`));
    
    const maxHeight = data[0]?.altura_maxima;
    console.log(`\n   📊 ALTURA MÁXIMA DO PLANO: ${maxHeight}m`);
    
    if (maxHeight === 130) {
      console.log('   ✅ Valor correto!');
    } else {
      console.log('   ❌ ERRO: Deveria ser 130m!');
    }
  } else {
    console.log('   ❌ Erro:', error?.message);
  }
  
  // 3. Verificar problema dos coeficientes
  console.log('\n3. Verificando coeficientes de Três Figueiras:');
  const { data: tfData, error: tfError } = await supabase
    .from('regime_urbanistico')
    .select('zona, altura_maxima, coef_aproveitamento_basico, coef_aproveitamento_maximo')
    .eq('bairro', 'TRÊS FIGUEIRAS')
    .order('zona');
  
  if (!tfError && tfData) {
    console.log('   Dados encontrados:');
    tfData.forEach(r => {
      console.log(`   ${r.zona}:`);
      console.log(`      Altura: ${r.altura_maxima}m`);
      console.log(`      CA básico: ${r.coef_aproveitamento_basico || 'null'}`);
      console.log(`      CA máximo: ${r.coef_aproveitamento_maximo || 'null'}`);
    });
  }
  
  console.log('\n' + '=' .repeat(50));
}

testMaxHeight().catch(console.error);