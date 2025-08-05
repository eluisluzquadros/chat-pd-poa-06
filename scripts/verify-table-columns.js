import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';

// Load environment variables
dotenv.config({ path: '.env.local' });

const supabaseUrl = process.env.SUPABASE_URL;
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

const supabase = createClient(supabaseUrl, supabaseKey);

async function verifyColumns() {
  console.log('🔍 Verificando colunas e dados\n');

  // 1. Verificar quantos registros existem
  const { count, error: countError } = await supabase
    .from('regime_urbanistico')
    .select('*', { count: 'exact', head: true });

  console.log(`📊 Total de registros em regime_urbanistico: ${count || 0}`);

  // 2. Buscar dados com zona = 'ZOT 8'
  console.log('\n🔍 Buscando registros da ZOT 8:');
  const { data: zot8, error: zot8Error } = await supabase
    .from('regime_urbanistico')
    .select('bairro, zona, altura_maxima')
    .eq('zona', 'ZOT 8')
    .limit(5);

  if (zot8Error) {
    console.error('❌ Erro:', zot8Error.message);
  } else if (zot8 && zot8.length > 0) {
    console.log('✅ Encontrados:');
    zot8.forEach(row => {
      console.log(`   - ${row.bairro}: ${row.zona} - Altura máx: ${row.altura_maxima}m`);
    });
  } else {
    console.log('⚠️ Nenhum registro encontrado para ZOT 8');
  }

  // 3. Verificar todas as zonas únicas
  console.log('\n📋 Todas as zonas disponíveis:');
  const { data: zonas, error: zonasError } = await supabase
    .from('regime_urbanistico')
    .select('zona')
    .order('zona');

  if (!zonasError && zonas) {
    const uniqueZonas = [...new Set(zonas.map(z => z.zona))];
    console.log(`✅ ${uniqueZonas.length} zonas únicas:`);
    uniqueZonas.forEach(zona => {
      console.log(`   - ${zona}`);
    });
  }

  // 4. Verificar dados com valores null
  console.log('\n⚠️ Verificando dados incompletos:');
  const { data: nullData, error: nullError } = await supabase
    .from('regime_urbanistico')
    .select('id, bairro, zona, altura_maxima')
    .is('altura_maxima', null)
    .limit(5);

  if (!nullError && nullData && nullData.length > 0) {
    console.log(`❌ ${nullData.length} registros com altura_maxima NULL:`);
    nullData.forEach(row => {
      console.log(`   - ID ${row.id}: ${row.bairro} (${row.zona})`);
    });
  } else {
    console.log('✅ Nenhum registro com altura_maxima NULL');
  }

  // 5. Verificar estatísticas gerais
  console.log('\n📊 Estatísticas gerais:');
  const { data: stats } = await supabase
    .from('regime_urbanistico')
    .select('altura_maxima');

  if (stats) {
    const alturas = stats.map(s => s.altura_maxima).filter(a => a !== null);
    const min = Math.min(...alturas);
    const max = Math.max(...alturas);
    console.log(`   - Altura mínima: ${min}m`);
    console.log(`   - Altura máxima: ${max}m`);
    console.log(`   - Total com altura definida: ${alturas.length}`);
  }
}

// Executar
verifyColumns().catch(console.error);