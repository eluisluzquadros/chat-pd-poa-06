import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';

// Load environment variables
dotenv.config({ path: '.env.local' });

const supabaseUrl = process.env.SUPABASE_URL;
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

const supabase = createClient(supabaseUrl, supabaseKey);

async function checkTableStructure() {
  console.log('🔍 Verificando Estrutura das Tabelas\n');
  console.log('=' .repeat(50));

  // Verificar colunas da tabela regime_urbanistico
  console.log('\n📊 Estrutura da tabela regime_urbanistico:');
  
  const { data: columns, error } = await supabase
    .rpc('execute_sql_query', { 
      query_text: `
        SELECT 
          column_name,
          data_type,
          is_nullable,
          column_default
        FROM information_schema.columns 
        WHERE table_name = 'regime_urbanistico'
        AND table_schema = 'public'
        ORDER BY ordinal_position
      ` 
    });

  if (error) {
    console.error('❌ Erro ao verificar estrutura:', error.message);
  } else if (columns && columns.length > 0) {
    console.log('✅ Colunas encontradas:');
    columns.forEach(col => {
      console.log(`   - ${col.column_name} (${col.data_type}) ${col.is_nullable === 'NO' ? 'NOT NULL' : ''}`);
    });
  } else {
    console.log('⚠️ Tabela não encontrada ou sem colunas');
  }

  // Verificar uma amostra de dados
  console.log('\n📝 Amostra de dados (1 registro):');
  
  const { data: sample, error: sampleError } = await supabase
    .from('regime_urbanistico')
    .select('*')
    .limit(1);

  if (sampleError) {
    console.error('❌ Erro ao buscar amostra:', sampleError.message);
  } else if (sample && sample.length > 0) {
    console.log('✅ Registro de exemplo:');
    const record = sample[0];
    Object.keys(record).forEach(key => {
      const value = record[key];
      if (value !== null && value !== undefined) {
        console.log(`   - ${key}: ${typeof value === 'object' ? JSON.stringify(value) : value}`);
      }
    });
  }

  // Verificar colunas da tabela zots_bairros
  console.log('\n📊 Estrutura da tabela zots_bairros:');
  
  const { data: zotsColumns, error: zotsError } = await supabase
    .rpc('execute_sql_query', { 
      query_text: `
        SELECT 
          column_name,
          data_type
        FROM information_schema.columns 
        WHERE table_name = 'zots_bairros'
        AND table_schema = 'public'
        ORDER BY ordinal_position
      ` 
    });

  if (zotsError) {
    console.error('❌ Erro:', zotsError.message);
  } else if (zotsColumns && zotsColumns.length > 0) {
    console.log('✅ Colunas encontradas:');
    zotsColumns.forEach(col => {
      console.log(`   - ${col.column_name} (${col.data_type})`);
    });
  }

  // Verificar se existem dados específicos
  console.log('\n🔍 Verificando dados específicos:');
  
  // Buscar ZOT 8
  const { data: zot8Data, error: zot8Error } = await supabase
    .rpc('execute_sql_query', { 
      query_text: `
        SELECT * 
        FROM regime_urbanistico 
        WHERE zona LIKE '%8%' 
        LIMIT 5
      ` 
    });

  if (!zot8Error && zot8Data && zot8Data.length > 0) {
    console.log('\n✅ Registros com "8" na zona:');
    zot8Data.forEach(row => {
      console.log(`   - Zona: ${row.zona}, Bairro: ${row.bairro}`);
    });
  }

  console.log('\n✅ Verificação concluída!');
}

// Executar
checkTableStructure();