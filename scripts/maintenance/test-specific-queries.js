import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';

dotenv.config({ path: '.env.local' });

const supabase = createClient(
  process.env.SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY
);

async function testSpecificQueries() {
  console.log('🧪 Teste de Queries Específicas\n');
  console.log('=' .repeat(50));

  // Teste 1: Buscar dados do Jardim São Pedro
  console.log('\n1️⃣ Dados do Jardim São Pedro:');
  
  const { data: jardimData, error: jardimError } = await supabase
    .from('regime_urbanistico')
    .select('*')
    .ilike('bairro', '%JARDIM SÃO PEDRO%')
    .limit(1);

  if (jardimError) {
    console.error('❌ Erro:', jardimError.message);
  } else if (jardimData && jardimData.length > 0) {
    console.log('✅ Dados encontrados:');
    const data = jardimData[0];
    console.log(`   - Bairro: ${data.bairro}`);
    console.log(`   - Zona: ${data.zona}`);
    console.log(`   - Altura Máxima: ${data.altura_maxima}m`);
    console.log(`   - Coef. Básico: ${data.coef_basico_4d}`);
    console.log(`   - Coef. Máximo: ${data.coef_maximo_4d}`);
    console.log(`   - Taxa Permeab. > 1500m²: ${data.taxa_permeabilidade_acima_1500}`);
    console.log(`   - Taxa Permeab. < 1500m²: ${data.taxa_permeabilidade_ate_1500}`);
  } else {
    console.log('⚠️ Nenhum dado encontrado');
  }

  // Teste 2: Buscar taxa de permeabilidade da ZOT 13
  console.log('\n2️⃣ Taxa de Permeabilidade da ZOT 13:');
  
  const { data: permeabData, error: permeabError } = await supabase
    .from('regime_urbanistico')
    .select('zona, bairro, taxa_permeabilidade_acima_1500, taxa_permeabilidade_ate_1500')
    .eq('zona', 'ZOT 13')
    .limit(1);

  if (permeabError) {
    console.error('❌ Erro:', permeabError.message);
  } else if (permeabData && permeabData.length > 0) {
    console.log('✅ Dados encontrados:');
    const data = permeabData[0];
    console.log(`   - Zona: ${data.zona}`);
    console.log(`   - Taxa para terrenos > 1500m²: ${data.taxa_permeabilidade_acima_1500}%`);
    console.log(`   - Taxa para terrenos ≤ 1500m²: ${data.taxa_permeabilidade_ate_1500}%`);
  } else {
    console.log('⚠️ Nenhum dado encontrado');
  }

  // Teste 3: Verificar colunas disponíveis
  console.log('\n3️⃣ Colunas disponíveis na tabela:');
  
  const { data: sampleData, error: sampleError } = await supabase
    .from('regime_urbanistico')
    .select('*')
    .limit(1);

  if (!sampleError && sampleData && sampleData.length > 0) {
    const columns = Object.keys(sampleData[0]);
    console.log('✅ Colunas encontradas:');
    columns.forEach(col => {
      const value = sampleData[0][col];
      if (col.includes('permeab') || col.includes('coef') || col.includes('altura')) {
        console.log(`   - ${col}: ${value}`);
      }
    });
  }

  console.log('\n✅ Testes concluídos!');
}

// Executar
testSpecificQueries();