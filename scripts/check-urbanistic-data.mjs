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

async function checkUrbanisticData() {
  console.log('🔍 Verificando Dados Urbanísticos no Banco\n');
  console.log('=' .repeat(70));
  
  // 1. Verificar tabelas relacionadas a regime urbanístico
  console.log('📊 TABELAS DE REGIME URBANÍSTICO:\n');
  
  const tables = [
    'regime_urbanistico',
    'regime_urbanistico_zona',
    'regime_urbanistico_view',
    'document_rows',
    'bairros',
    'zonas',
    'zoneamento'
  ];
  
  for (const table of tables) {
    try {
      const { count, error } = await supabase
        .from(table)
        .select('*', { count: 'exact', head: true });
      
      if (!error) {
        console.log(`✅ ${table}: ${count || 0} registros`);
      } else {
        console.log(`❌ ${table}: ${error.message}`);
      }
    } catch (err) {
      console.log(`⚠️ ${table}: Erro ao acessar`);
    }
  }
  
  // 2. Buscar especificamente por Petrópolis
  console.log('\n🔍 BUSCANDO DADOS DO BAIRRO PETRÓPOLIS:\n');
  
  // Tentar em document_rows
  console.log('1. Buscando em document_rows...');
  const { data: docRows, error: docError } = await supabase
    .from('document_rows')
    .select('*')
    .or('content.ilike.%Petrópolis%,content.ilike.%petropolis%,content.ilike.%PETROPOLIS%')
    .limit(5);
  
  if (!docError && docRows && docRows.length > 0) {
    console.log(`   ✅ Encontrados ${docRows.length} registros`);
    docRows.forEach(row => {
      console.log(`   - ${row.content.substring(0, 100)}...`);
    });
  } else {
    console.log('   ❌ Nenhum registro encontrado em document_rows');
  }
  
  // Tentar buscar dados estruturados de Petrópolis
  console.log('\n2. Buscando dados estruturados de zonas/bairros...');
  
  // Query para buscar altura máxima e coeficientes
  const queries = [
    {
      sql: `SELECT DISTINCT 
              content->>'bairro' as bairro,
              content->>'zona' as zona,
              content->>'altura_maxima' as altura_maxima,
              content->>'coef_basico' as coef_basico,
              content->>'coef_maximo' as coef_maximo
            FROM document_rows 
            WHERE content::text ILIKE '%Petrópolis%'
            OR content->>'bairro' ILIKE '%Petrópolis%'
            LIMIT 5`,
      description: 'Dados JSON de Petrópolis'
    },
    {
      sql: `SELECT DISTINCT 
              substring(content from 'altura.{0,20}(\d+\.?\d*)\s*metros') as altura,
              substring(content from 'CA.{0,20}básico.{0,20}(\d+\.?\d*)') as ca_basico,
              substring(content from 'CA.{0,20}máximo.{0,20}(\d+\.?\d*)') as ca_maximo
            FROM document_rows 
            WHERE content ILIKE '%Petrópolis%'
            AND (content ILIKE '%altura%' OR content ILIKE '%coeficiente%')
            LIMIT 5`,
      description: 'Extração de padrões de texto'
    }
  ];
  
  for (const query of queries) {
    console.log(`\n   Testando: ${query.description}`);
    
    const { data, error } = await supabase.rpc('execute_sql_query', {
      query_text: query.sql
    });
    
    if (!error && data && data.length > 0) {
      console.log(`   ✅ Encontrados ${data.length} registros:`);
      data.forEach(row => {
        console.log(`      ${JSON.stringify(row)}`);
      });
    } else {
      console.log(`   ❌ Nenhum dado encontrado ou erro: ${error?.message}`);
    }
  }
  
  // 3. Verificar se existem tabelas específicas de regime urbanístico
  console.log('\n3. Verificando tabelas de regime urbanístico...');
  
  const regimeQuery = `
    SELECT table_name 
    FROM information_schema.tables 
    WHERE table_schema = 'public' 
    AND table_name LIKE '%regime%'
    OR table_name LIKE '%urban%'
    OR table_name LIKE '%bairro%'
    OR table_name LIKE '%zona%'
    OR table_name LIKE '%zot%'
  `;
  
  const { data: tables2, error: tablesError } = await supabase.rpc('execute_sql_query', {
    query_text: regimeQuery
  });
  
  if (!tablesError && tables2) {
    console.log(`\n📋 Tabelas relacionadas encontradas:`);
    tables2.forEach(t => {
      console.log(`   - ${t.table_name}`);
    });
  }
  
  // 4. Buscar dados específicos de Petrópolis em qualquer tabela
  console.log('\n4. Buscando Petrópolis em todas as tabelas encontradas...');
  
  if (tables2 && tables2.length > 0) {
    for (const table of tables2.slice(0, 10)) { // Limitar a 10 tabelas
      const tableName = table.table_name;
      
      // Pular tabelas de sistema
      if (tableName.includes('migration') || tableName.includes('schema')) continue;
      
      try {
        const searchQuery = `
          SELECT * FROM ${tableName}
          WHERE ${tableName}::text ILIKE '%Petrópolis%'
          OR ${tableName}::text ILIKE '%petropolis%'
          LIMIT 2
        `;
        
        const { data, error } = await supabase.rpc('execute_sql_query', {
          query_text: searchQuery
        });
        
        if (!error && data && data.length > 0) {
          console.log(`   ✅ ${tableName}: ${data.length} registros com Petrópolis`);
          console.log(`      Amostra: ${JSON.stringify(data[0]).substring(0, 200)}...`);
        }
      } catch (err) {
        // Silently skip tables that can't be searched
      }
    }
  }
  
  // 5. Verificar dados corretos esperados
  console.log('\n📌 DADOS ESPERADOS PARA PETRÓPOLIS:');
  console.log('   Segundo qa_test_cases:');
  console.log('   - Zona: ZOT 07');
  console.log('   - Altura máxima: 52 metros');
  console.log('   - CA básico: 3.6');
  console.log('   - CA máximo: (valor não especificado no teste)');
  
  console.log('\n' + '=' .repeat(70));
  console.log('✅ Verificação concluída!');
}

checkUrbanisticData().catch(console.error);