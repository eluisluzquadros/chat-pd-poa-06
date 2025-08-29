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

async function checkCorrectTables() {
  console.log('🔍 VERIFICANDO TABELAS CORRETAS DE REGIME URBANÍSTICO\n');
  console.log('=' .repeat(70));
  
  // ESTAS SÃO AS TABELAS QUE DEVERIAM ESTAR SENDO USADAS!
  console.log('📊 TABELA regime_urbanistico (385 registros):\n');
  
  // 1. Verificar estrutura da tabela regime_urbanistico
  const { data: columns, error: colError } = await supabase.rpc('execute_sql_query', {
    query_text: `
      SELECT column_name, data_type 
      FROM information_schema.columns 
      WHERE table_name = 'regime_urbanistico' 
      ORDER BY ordinal_position
    `
  });
  
  if (!colError && columns) {
    console.log('Colunas da tabela regime_urbanistico:');
    if (Array.isArray(columns)) {
      columns.forEach(col => {
        console.log(`  - ${col.column_name}: ${col.data_type}`);
      });
    } else {
      console.log('  Resultado não é array:', typeof columns, columns);
    }
  } else if (colError) {
    console.log('  Erro ao buscar colunas:', colError);
  }
  
  // 2. Buscar dados de Petrópolis
  console.log('\n🔍 BUSCANDO PETRÓPOLIS NA TABELA regime_urbanistico:\n');
  
  const { data: petropolis, error: petroError } = await supabase
    .from('regime_urbanistico')
    .select('*')
    .or('bairro.ilike.%Petrópolis%,bairro.ilike.%petropolis%,nome_bairro.ilike.%Petrópolis%')
    .limit(5);
  
  if (!petroError && petropolis && petropolis.length > 0) {
    console.log(`✅ ENCONTRADO! ${petropolis.length} registros de Petrópolis:`);
    petropolis.forEach(p => {
      console.log('\n' + JSON.stringify(p, null, 2));
    });
  } else {
    console.log('❌ Petrópolis não encontrado. Vamos listar alguns bairros existentes:');
    
    // Listar alguns bairros para entender a estrutura
    const { data: sample, error: sampleError } = await supabase
      .from('regime_urbanistico')
      .select('*')
      .limit(5);
    
    if (!sampleError && sample) {
      console.log('\nAmostra de dados na tabela:');
      sample.forEach(s => {
        console.log(`  Bairro: ${s.bairro || s.nome_bairro || s.nome || 'N/A'}`);
        console.log(`  ZOT: ${s.zot || s.zona || 'N/A'}`);
        console.log(`  Altura: ${s.altura_maxima || s.altura || 'N/A'}`);
        console.log(`  CA Básico: ${s.coef_basico || s.ca_basico || 'N/A'}`);
        console.log('  ---');
      });
    }
  }
  
  // 3. Verificar outras tabelas criadas
  console.log('\n📊 OUTRAS TABELAS IMPORTANTES:\n');
  
  const importantTables = [
    'bairros_risco_desastre',
    'regime_urbanistico_zona',
    'regime_urbanistico_bairro',
    'zoneamento_territorial',
    'indicadores_urbanisticos'
  ];
  
  for (const table of importantTables) {
    const { count, error } = await supabase
      .from(table)
      .select('*', { count: 'exact', head: true });
    
    if (!error) {
      console.log(`✅ ${table}: ${count || 0} registros`);
      
      // Se tem dados, buscar Petrópolis
      if (count > 0) {
        const { data, error: searchError } = await supabase
          .from(table)
          .select('*')
          .or('bairro.ilike.%Petrópolis%,nome_bairro.ilike.%Petrópolis%,nome.ilike.%Petrópolis%')
          .limit(1);
        
        if (!searchError && data && data.length > 0) {
          console.log(`   → Petrópolis encontrado nesta tabela!`);
        }
      }
    } else {
      console.log(`❌ ${table}: ${error.message}`);
    }
  }
  
  // 4. Buscar em TODAS as colunas da regime_urbanistico
  console.log('\n🔍 BUSCA AMPLA POR PETRÓPOLIS:\n');
  
  const { data: allSearch, error: allError } = await supabase.rpc('execute_sql_query', {
    query_text: `
      SELECT * FROM regime_urbanistico 
      WHERE regime_urbanistico::text ILIKE '%Petrópolis%'
      OR regime_urbanistico::text ILIKE '%petropolis%'
      OR regime_urbanistico::text ILIKE '%PETROPOLIS%'
      LIMIT 5
    `
  });
  
  if (!allError && allSearch && allSearch.length > 0) {
    console.log(`✅ Encontrado via busca ampla: ${allSearch.length} registros`);
    console.log(JSON.stringify(allSearch[0], null, 2));
  } else {
    console.log('❌ Não encontrado nem com busca ampla');
  }
  
  // 5. Listar TODOS os nomes de bairros únicos
  console.log('\n📋 LISTA DE BAIRROS DISPONÍVEIS:\n');
  
  const { data: bairrosList } = await supabase.rpc('execute_sql_query', {
    query_text: `
      SELECT DISTINCT 
        COALESCE(bairro, nome_bairro, nome) as nome_bairro
      FROM regime_urbanistico 
      WHERE COALESCE(bairro, nome_bairro, nome) IS NOT NULL
      ORDER BY 1
      LIMIT 20
    `
  });
  
  if (bairrosList && bairrosList.length > 0) {
    console.log('Primeiros 20 bairros:');
    bairrosList.forEach(b => {
      console.log(`  - ${b.nome_bairro}`);
    });
  }
  
  console.log('\n' + '=' .repeat(70));
  console.log('✅ Verificação concluída!');
  
  console.log('\n⚠️ PROBLEMA IDENTIFICADO:');
  console.log('O sql-generator precisa buscar na tabela regime_urbanistico');
  console.log('e não em document_rows!');
}

checkCorrectTables().catch(console.error);