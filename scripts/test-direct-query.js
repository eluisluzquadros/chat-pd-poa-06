import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';

// Load environment variables
dotenv.config({ path: '.env.local' });

const supabaseUrl = process.env.SUPABASE_URL;
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

const supabase = createClient(supabaseUrl, supabaseKey);

async function testDirectQuery() {
  console.log('🧪 Teste Direto das Novas Tabelas\n');
  console.log('=' .repeat(50));

  // Teste 1: Verificar dados na tabela regime_urbanistico
  console.log('\n1️⃣ Testando tabela regime_urbanistico:');
  
  const { data: regimeData, error: regimeError } = await supabase
    .from('regime_urbanistico')
    .select('zona, altura_max_m, ca_max, bairro')
    .eq('zona', 'ZOT 8')
    .limit(5);

  if (regimeError) {
    console.error('❌ Erro:', regimeError.message);
  } else if (regimeData && regimeData.length > 0) {
    console.log('✅ Dados encontrados:');
    regimeData.forEach(row => {
      console.log(`   - Zona: ${row.zona}, Bairro: ${row.bairro}, Altura: ${row.altura_max_m}m, CA: ${row.ca_max}`);
    });
  } else {
    console.log('⚠️ Nenhum dado encontrado para ZOT 8');
  }

  // Teste 2: Buscar parâmetros do Centro Histórico
  console.log('\n2️⃣ Testando parâmetros do Centro Histórico:');
  
  const { data: centroData, error: centroError } = await supabase
    .from('regime_urbanistico')
    .select('zona, altura_max_m, ca_max, to_max')
    .ilike('bairro', '%CENTRO%')
    .limit(5);

  if (centroError) {
    console.error('❌ Erro:', centroError.message);
  } else if (centroData && centroData.length > 0) {
    console.log('✅ Parâmetros encontrados:');
    centroData.forEach(row => {
      console.log(`   - Zona: ${row.zona}, Altura: ${row.altura_max_m}m, CA: ${row.ca_max}, TO: ${row.to_max}`);
    });
  } else {
    console.log('⚠️ Nenhum dado encontrado para Centro');
  }

  // Teste 3: Contar registros totais
  console.log('\n3️⃣ Estatísticas das tabelas:');
  
  const { count: regimeCount } = await supabase
    .from('regime_urbanistico')
    .select('*', { count: 'exact', head: true });

  const { count: zotsCount } = await supabase
    .from('zots_bairros')
    .select('*', { count: 'exact', head: true });

  console.log(`   📊 regime_urbanistico: ${regimeCount} registros`);
  console.log(`   📊 zots_bairros: ${zotsCount} registros`);

  // Teste 4: Buscar zonas com altura > 20m
  console.log('\n4️⃣ Zonas com altura > 20 metros:');
  
  const { data: alturaData, error: alturaError } = await supabase
    .from('regime_urbanistico')
    .select('zona, altura_max_m, bairro')
    .gt('altura_max_m', 20)
    .order('altura_max_m', { ascending: false })
    .limit(10);

  if (alturaError) {
    console.error('❌ Erro:', alturaError.message);
  } else if (alturaData && alturaData.length > 0) {
    console.log('✅ Zonas encontradas:');
    alturaData.forEach(row => {
      console.log(`   - ${row.zona} (${row.bairro}): ${row.altura_max_m}m`);
    });
  } else {
    console.log('⚠️ Nenhuma zona com altura > 20m encontrada');
  }

  // Teste 5: Testar SQL direto via RPC
  console.log('\n5️⃣ Teste SQL direto via RPC:');
  
  const { data: sqlData, error: sqlError } = await supabase
    .rpc('execute_sql_query', { 
      query_text: `
        SELECT zona, altura_max_m, ca_max 
        FROM regime_urbanistico 
        WHERE zona = 'ZOT 8' 
        LIMIT 1
      ` 
    });

  if (sqlError) {
    console.error('❌ Erro SQL:', sqlError.message);
  } else if (sqlData && sqlData.length > 0) {
    console.log('✅ Resultado SQL:');
    console.log('   ', sqlData[0]);
  } else {
    console.log('⚠️ Nenhum resultado do SQL');
  }

  console.log('\n✅ Testes diretos concluídos!');
}

// Executar
testDirectQuery();