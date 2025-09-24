import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';

dotenv.config({ path: '.env.local' });

const supabase = createClient(
  process.env.SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY
);

async function checkAllHeights() {
  console.log('🔍 Verificando TODAS as zonas com altura > 50 metros\n');
  console.log('=' .repeat(50));

  // Buscar todas as zonas com altura > 50
  const { data, error } = await supabase
    .from('regime_urbanistico')
    .select('zona, altura_maxima, bairro')
    .gt('altura_maxima', 50)
    .order('altura_maxima', { ascending: false });

  if (error) {
    console.error('❌ Erro:', error.message);
    return;
  }

  if (!data || data.length === 0) {
    console.log('⚠️ Nenhuma zona com altura > 50m encontrada');
    return;
  }

  // Agrupar por zona e altura
  const zonaMap = new Map();
  
  data.forEach(row => {
    const key = `${row.zona}_${row.altura_maxima}`;
    if (!zonaMap.has(key)) {
      zonaMap.set(key, {
        zona: row.zona,
        altura: row.altura_maxima,
        bairros: []
      });
    }
    if (!zonaMap.get(key).bairros.includes(row.bairro)) {
      zonaMap.get(key).bairros.push(row.bairro);
    }
  });

  // Ordenar e exibir
  const zonas = Array.from(zonaMap.values()).sort((a, b) => {
    // Primeiro ordenar por altura (maior primeiro)
    if (b.altura !== a.altura) return b.altura - a.altura;
    // Depois por nome da zona
    return a.zona.localeCompare(b.zona);
  });

  console.log(`✅ Encontradas ${zonas.length} zonas distintas com altura > 50m:\n`);

  zonas.forEach((z, i) => {
    console.log(`${i+1}. ${z.zona}: ${z.altura} metros`);
    console.log(`   Bairros: ${z.bairros.slice(0, 3).join(', ')}${z.bairros.length > 3 ? ` e mais ${z.bairros.length - 3}...` : ''}`);
    console.log();
  });

  // Verificar especificamente a ZOT 8
  console.log('🔍 Verificando ZOT 8 especificamente:');
  
  const { data: zot8Data, error: zot8Error } = await supabase
    .from('regime_urbanistico')
    .select('zona, altura_maxima, bairro')
    .eq('zona', 'ZOT 8')
    .limit(5);

  if (!zot8Error && zot8Data && zot8Data.length > 0) {
    console.log(`✅ ZOT 8 encontrada:`);
    console.log(`   Altura: ${zot8Data[0].altura_maxima} metros`);
    console.log(`   Bairros: ${zot8Data.map(d => d.bairro).join(', ')}`);
  } else {
    console.log('❌ ZOT 8 não encontrada ou sem dados');
  }

  // Estatísticas
  console.log('\n📊 Estatísticas:');
  console.log(`   Total de registros: ${data.length}`);
  console.log(`   Zonas únicas: ${zonas.length}`);
  console.log(`   Altura máxima encontrada: ${Math.max(...zonas.map(z => z.altura))} metros`);
  console.log(`   Altura mínima (> 50m): ${Math.min(...zonas.map(z => z.altura))} metros`);

  console.log('\n✅ Verificação concluída!');
}

// Executar
checkAllHeights();