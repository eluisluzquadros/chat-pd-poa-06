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

async function checkMaxHeights() {
  console.log('🔍 VERIFICANDO ALTURAS MÁXIMAS NA TABELA regime_urbanistico\n');
  console.log('=' .repeat(70));
  
  // 1. Buscar as maiores alturas
  console.log('📊 TOP 10 MAIORES ALTURAS:\n');
  
  const { data: topHeights, error: topError } = await supabase
    .from('regime_urbanistico')
    .select('bairro, zona, altura_maxima')
    .not('altura_maxima', 'is', null)
    .order('altura_maxima', { ascending: false })
    .limit(10);
  
  if (!topError && topHeights) {
    topHeights.forEach((row, index) => {
      console.log(`${index + 1}. ${row.bairro} (${row.zona}): ${row.altura_maxima}m`);
    });
  }
  
  // 2. Verificar se existem alturas de 130m
  console.log('\n🔍 VERIFICANDO ALTURAS DE 130m:\n');
  
  const { data: height130, error: error130 } = await supabase
    .from('regime_urbanistico')
    .select('bairro, zona, altura_maxima')
    .eq('altura_maxima', 130);
  
  if (!error130 && height130) {
    if (height130.length > 0) {
      console.log(`✅ Encontrados ${height130.length} registros com 130m:`);
      height130.forEach(row => {
        console.log(`   - ${row.bairro} (${row.zona})`);
      });
    } else {
      console.log('❌ Nenhum registro com 130m encontrado');
    }
  }
  
  // 3. Verificar Centro Histórico
  console.log('\n🔍 VERIFICANDO CENTRO HISTÓRICO:\n');
  
  const { data: centro, error: centroError } = await supabase
    .from('regime_urbanistico')
    .select('bairro, zona, altura_maxima, coef_aproveitamento_basico, coef_aproveitamento_maximo')
    .ilike('bairro', '%CENTRO%');
  
  if (!centroError && centro) {
    centro.forEach(row => {
      console.log(`Bairro: ${row.bairro}`);
      console.log(`  Zona: ${row.zona}`);
      console.log(`  Altura: ${row.altura_maxima}m`);
      console.log(`  CA Básico: ${row.coef_aproveitamento_basico || 'N/A'}`);
      console.log(`  CA Máximo: ${row.coef_aproveitamento_maximo || 'N/A'}`);
      console.log('---');
    });
  }
  
  // 4. Estatísticas gerais
  console.log('\n📈 ESTATÍSTICAS DE ALTURA:\n');
  
  const { data: allHeights } = await supabase
    .from('regime_urbanistico')
    .select('altura_maxima')
    .not('altura_maxima', 'is', null);
  
  if (allHeights) {
    const heights = allHeights.map(r => r.altura_maxima).filter(h => h !== null);
    const max = Math.max(...heights);
    const min = Math.min(...heights);
    const avg = heights.reduce((a, b) => a + b, 0) / heights.length;
    
    console.log(`Altura máxima: ${max}m`);
    console.log(`Altura mínima: ${min}m`);
    console.log(`Altura média: ${avg.toFixed(1)}m`);
    console.log(`Total de registros: ${heights.length}`);
    
    // Contar por faixa de altura
    const ranges = {
      '0-20m': 0,
      '21-40m': 0,
      '41-60m': 0,
      '61-90m': 0,
      '91-130m': 0,
      '>130m': 0
    };
    
    heights.forEach(h => {
      if (h <= 20) ranges['0-20m']++;
      else if (h <= 40) ranges['21-40m']++;
      else if (h <= 60) ranges['41-60m']++;
      else if (h <= 90) ranges['61-90m']++;
      else if (h <= 130) ranges['91-130m']++;
      else ranges['>130m']++;
    });
    
    console.log('\nDistribuição por faixa:');
    Object.entries(ranges).forEach(([range, count]) => {
      if (count > 0) {
        console.log(`  ${range}: ${count} registros (${((count/heights.length)*100).toFixed(1)}%)`);
      }
    });
  }
  
  // 5. Verificar valores únicos de altura
  console.log('\n📋 VALORES ÚNICOS DE ALTURA:\n');
  
  const { data: uniqueHeights } = await supabase.rpc('execute_sql_query', {
    query_text: `
      SELECT DISTINCT altura_maxima 
      FROM regime_urbanistico 
      WHERE altura_maxima IS NOT NULL 
      ORDER BY altura_maxima DESC
    `
  });
  
  if (uniqueHeights && Array.isArray(uniqueHeights)) {
    const values = uniqueHeights.map(r => r.altura_maxima).join(', ');
    console.log(`Valores únicos: ${values}`);
  }
  
  console.log('\n' + '=' .repeat(70));
  console.log('✅ Verificação concluída!');
}

checkMaxHeights().catch(console.error);