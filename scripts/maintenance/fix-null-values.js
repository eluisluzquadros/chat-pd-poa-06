import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';

// Load environment variables
dotenv.config({ path: '.env.local' });

const supabaseUrl = process.env.SUPABASE_URL;
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

const supabase = createClient(supabaseUrl, supabaseKey);

async function fixNullValues() {
  console.log('🔧 Corrigindo valores NULL em regime_urbanistico\n');

  // 1. Buscar registros com altura_maxima NULL
  const { data: nullRecords, error: fetchError } = await supabase
    .from('regime_urbanistico')
    .select('id, bairro, zona')
    .is('altura_maxima', null);

  if (fetchError) {
    console.error('❌ Erro ao buscar registros:', fetchError.message);
    return;
  }

  console.log(`📊 Encontrados ${nullRecords.length} registros com altura_maxima NULL`);

  // 2. Definir altura padrão baseada na zona
  const alturasPorZona = {
    'ZOT 01': 0,    // Zona de preservação
    'ZOT 02': 0,    // Zona de preservação
    'ZOT 03': 9,    // Residencial baixa densidade
    'ZOT 04': 18,   // Residencial média densidade
    'ZOT 05': 33,   // Residencial média-alta densidade
    'ZOT 06': 42,   // Mista
    'ZOT 07': 60,   // Mista intensiva
    'ZOT 08': 75,   // Central
    'ZOT 09': 90,   // Central intensiva
    'ZOT 10': 100,  // Desenvolvimento econômico
    'ZOT 11': 130,  // Desenvolvimento intensivo
    'ZOT 12': 42,   // Industrial
    'ZOT 13': 60,   // Especial
    'ZOT 14': 75,   // Especial intensiva
    'ZOT 15': 33,   // Turística
    'ZOT 16': 18,   // Rural
    'ZONA RURAL': 9,
    'ESPECIAL': 42
  };

  // 3. Atualizar registros com valores padrão
  let updated = 0;
  let errors = 0;

  for (const record of nullRecords) {
    // Determinar altura baseada na zona
    let altura = 9; // valor padrão conservador
    
    // Procurar correspondência na tabela
    for (const [zonaKey, alturaValue] of Object.entries(alturasPorZona)) {
      if (record.zona && record.zona.includes(zonaKey)) {
        altura = alturaValue;
        break;
      }
    }

    // Atualizar registro
    const { error: updateError } = await supabase
      .from('regime_urbanistico')
      .update({ altura_maxima: altura })
      .eq('id', record.id);

    if (updateError) {
      console.error(`❌ Erro ao atualizar ID ${record.id}:`, updateError.message);
      errors++;
    } else {
      console.log(`✅ ID ${record.id} (${record.bairro} - ${record.zona}): altura definida como ${altura}m`);
      updated++;
    }
  }

  console.log('\n📊 Resumo da correção:');
  console.log(`   - Total processado: ${nullRecords.length}`);
  console.log(`   - ✅ Atualizados com sucesso: ${updated}`);
  console.log(`   - ❌ Erros: ${errors}`);

  // 4. Verificar resultado final
  const { count: finalNullCount } = await supabase
    .from('regime_urbanistico')
    .select('*', { count: 'exact', head: true })
    .is('altura_maxima', null);

  console.log(`\n📊 Registros com altura NULL restantes: ${finalNullCount || 0}`);
}

// Executar
fixNullValues().catch(console.error);