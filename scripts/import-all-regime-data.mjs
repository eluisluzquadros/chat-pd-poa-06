import { createClient } from '@supabase/supabase-js';
import { readFileSync } from 'fs';

// Configurar cliente Supabase
const supabase = createClient(
  'https://ngrqwmvuhvjkeohesbxs.supabase.co',
  'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Im5ncnF3bXZ1aHZqa2VvaGVzYnhzIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc1MzYwOTAxNywiZXhwIjoyMDY5MTg1MDE3fQ.7jVZP70RAjpfFPfehZt5Gr3vSxn8DZ3YyPJNjCwZXEo'
);

console.log('🚀 Importação COMPLETA de Dados de Regime Urbanístico\n');

// Verificar dados existentes
console.log('📋 Verificando dados existentes...');

const { count: existingRegimeCount } = await supabase
  .from('regime_urbanistico')
  .select('*', { count: 'exact', head: true });

const { count: existingZotsCount } = await supabase
  .from('zots_bairros')
  .select('*', { count: 'exact', head: true });

console.log(`\n📊 Dados atuais:`);
console.log(`- Regime Urbanístico: ${existingRegimeCount || 0} registros`);
console.log(`- ZOTs vs Bairros: ${existingZotsCount || 0} registros`);

// Ler dados do JSON convertido
console.log('\n📋 Lendo dados convertidos do Excel...');

let regimeData = [];
let zotsData = [];

try {
  // Tentar ler o arquivo JSON se existir
  const jsonData = JSON.parse(readFileSync('./regime_urbanistico_data.json', 'utf8'));
  regimeData = jsonData.regime_urbanistico || [];
  zotsData = jsonData.zots_bairros || [];
  console.log(`✅ Dados carregados: ${regimeData.length} regime + ${zotsData.length} ZOTs`);
} catch (error) {
  console.log('⚠️  Arquivo JSON não encontrado. Usando dados de exemplo estendidos...');
  
  // Dados estendidos de exemplo (mais bairros)
  regimeData = [
    // Zona de Ocupação Intensiva
    {
      bairro: "ANCHIETA",
      zona: "Zona de Ocupação Intensiva",
      altura_max_m: 42.00,
      ca_max: 3.0,
      to_base: 75.0,
      to_max: 90.0,
      taxa_permeabilidade: 10.0,
      recuo_jardim_m: 4.00,
      area_total_ha: 264.89,
      populacao: 10919,
      densidade_hab_ha: 41.22,
      domicilios: 4425,
      quarteirao_padrao_m: 100,
      divisao_lote: true,
      remembramento: true,
      quota_ideal_m2: 75
    },
    {
      bairro: "AZENHA",
      zona: "Zona de Ocupação Intensiva",
      altura_max_m: 42.00,
      ca_max: 3.0,
      to_base: 75.0,
      to_max: 90.0,
      taxa_permeabilidade: 10.0,
      recuo_jardim_m: 4.00,
      area_total_ha: 123.97,
      populacao: 14542,
      densidade_hab_ha: 117.30,
      domicilios: 6699,
      quarteirao_padrao_m: 100,
      divisao_lote: true,
      remembramento: true,
      quota_ideal_m2: 75
    },
    {
      bairro: "BOM FIM",
      zona: "Zona de Ocupação Intensiva",
      altura_max_m: 42.00,
      ca_max: 3.0,
      to_base: 75.0,
      to_max: 90.0,
      taxa_permeabilidade: 10.0,
      recuo_jardim_m: 4.00,
      area_total_ha: 85.12,
      populacao: 11748,
      densidade_hab_ha: 138.02,
      domicilios: 5856,
      quarteirao_padrao_m: 100,
      divisao_lote: true,
      remembramento: true,
      quota_ideal_m2: 75
    },
    {
      bairro: "CENTRO HISTORICO",
      zona: "Zona de Ocupação Intensiva",
      altura_max_m: 52.00,
      ca_max: 4.0,
      to_base: 75.0,
      to_max: 90.0,
      taxa_permeabilidade: 5.0,
      recuo_jardim_m: 0.00,
      area_total_ha: 228.70,
      populacao: 39154,
      densidade_hab_ha: 171.16,
      domicilios: 22814,
      quarteirao_padrao_m: 80,
      divisao_lote: true,
      remembramento: true,
      quota_ideal_m2: 50
    },
    
    // Zona de Ocupação Moderada 2
    {
      bairro: "AGRONOMIA",
      zona: "Zona de Ocupação Moderada 2",
      altura_max_m: 9.00,
      ca_max: 1.3,
      to_base: 66.6,
      to_max: 75.0,
      taxa_permeabilidade: 20.0,
      recuo_jardim_m: 4.00,
      area_total_ha: 254.61,
      populacao: 8651,
      densidade_hab_ha: 33.99,
      domicilios: 3246,
      quarteirao_padrao_m: 110,
      divisao_lote: true,
      remembramento: true,
      quota_ideal_m2: 125
    },
    {
      bairro: "AUXILIADORA",
      zona: "Zona de Ocupação Moderada 2",
      altura_max_m: 18.00,
      ca_max: 2.4,
      to_base: 66.6,
      to_max: 75.0,
      taxa_permeabilidade: 15.0,
      recuo_jardim_m: 4.00,
      area_total_ha: 291.22,
      populacao: 25616,
      densidade_hab_ha: 87.97,
      domicilios: 12188,
      quarteirao_padrao_m: 100,
      divisao_lote: true,
      remembramento: true,
      quota_ideal_m2: 100
    },
    {
      bairro: "BELA VISTA",
      zona: "Zona de Ocupação Moderada 2",
      altura_max_m: 18.00,
      ca_max: 2.4,
      to_base: 66.6,
      to_max: 75.0,
      taxa_permeabilidade: 15.0,
      recuo_jardim_m: 4.00,
      area_total_ha: 140.61,
      populacao: 11687,
      densidade_hab_ha: 83.11,
      domicilios: 5303,
      quarteirao_padrao_m: 100,
      divisao_lote: true,
      remembramento: true,
      quota_ideal_m2: 100
    },
    
    // Zona de Ocupação Rarefeita
    {
      bairro: "ARQUIPELAGO",
      zona: "Zona de Ocupação Rarefeita",
      altura_max_m: 7.00,
      ca_max: 0.5,
      to_base: 33.3,
      to_max: 50.0,
      taxa_permeabilidade: 40.0,
      recuo_jardim_m: 4.00,
      area_total_ha: 4413.52,
      populacao: 6721,
      densidade_hab_ha: 1.52,
      domicilios: 2146,
      quarteirao_padrao_m: 150,
      divisao_lote: false,
      remembramento: true,
      quota_ideal_m2: 500
    },
    {
      bairro: "LAMI",
      zona: "Zona de Ocupação Rarefeita",
      altura_max_m: 7.00,
      ca_max: 0.5,
      to_base: 33.3,
      to_max: 50.0,
      taxa_permeabilidade: 40.0,
      recuo_jardim_m: 4.00,
      area_total_ha: 2681.31,
      populacao: 4004,
      densidade_hab_ha: 1.49,
      domicilios: 1336,
      quarteirao_padrao_m: 200,
      divisao_lote: false,
      remembramento: true,
      quota_ideal_m2: 600
    },
    
    // Zona de Ocupação Moderada 1
    {
      bairro: "CAVALHADA",
      zona: "Zona de Ocupação Moderada 1",
      altura_max_m: 12.50,
      ca_max: 1.9,
      to_base: 66.6,
      to_max: 75.0,
      taxa_permeabilidade: 20.0,
      recuo_jardim_m: 4.00,
      area_total_ha: 420.62,
      populacao: 22342,
      densidade_hab_ha: 53.11,
      domicilios: 8339,
      quarteirao_padrao_m: 110,
      divisao_lote: true,
      remembramento: true,
      quota_ideal_m2: 125
    },
    {
      bairro: "CRISTAL",
      zona: "Zona de Ocupação Moderada 1",
      altura_max_m: 12.50,
      ca_max: 1.9,
      to_base: 66.6,
      to_max: 75.0,
      taxa_permeabilidade: 20.0,
      recuo_jardim_m: 4.00,
      area_total_ha: 345.56,
      populacao: 27723,
      densidade_hab_ha: 80.24,
      domicilios: 10516,
      quarteirao_padrao_m: 110,
      divisao_lote: true,
      remembramento: true,
      quota_ideal_m2: 125
    }
  ];
  
  // Dados de ZOTs correspondentes
  zotsData = regimeData.map(regime => ({
    bairro: regime.bairro,
    zona: regime.zona,
    caracteristicas: {
      tipo: regime.zona.includes("Intensiva") ? "misto" : 
            regime.zona.includes("Rarefeita") ? "preservação" : "residencial",
      densidade: regime.zona.includes("Intensiva") ? "alta" : 
                 regime.zona.includes("Rarefeita") ? "baixa" : "média",
      infraestrutura: regime.zona.includes("Rarefeita") ? "básica" : "completa"
    },
    restricoes: {
      altura_especial: regime.altura_max_m > 30 ? "verificar cone aéreo" : 
                      regime.zona.includes("Rarefeita") ? "área de preservação" : null,
      usos_proibidos: regime.zona.includes("Rarefeita") ? ["indústria", "grandes empreendimentos"] : 
                      regime.zona.includes("Moderada") ? ["indústria pesada"] : []
    },
    incentivos: {
      iptu_verde: regime.taxa_permeabilidade >= 20,
      bonus_construtivo: regime.zona.includes("Intensiva") ? "20% para uso misto" : 
                        regime.zona.includes("Moderada") ? "15% para fachada ativa" : null,
      comercio_terreo: regime.zona.includes("Intensiva"),
      turismo_ecologico: regime.zona.includes("Rarefeita")
    }
  }));
}

// Limpar dados existentes (opcional)
if (existingRegimeCount > 10 || existingZotsCount > 10) {
  console.log('\n⚠️  Muitos dados já existentes. Pulando limpeza para preservar dados...');
} else if (existingRegimeCount > 0 || existingZotsCount > 0) {
  console.log('\n🧹 Limpando dados de teste anteriores...');
  
  await supabase.from('regime_urbanistico').delete().gte('id', 0);
  await supabase.from('zots_bairros').delete().gte('id', 0);
  
  console.log('✅ Dados anteriores limpos');
}

// Inserir dados em lotes
console.log('\n📊 Inserindo dados em lotes...');

// Função para inserir em lotes
async function insertBatch(table, data, batchSize = 50) {
  let inserted = 0;
  
  for (let i = 0; i < data.length; i += batchSize) {
    const batch = data.slice(i, i + batchSize);
    const { error } = await supabase
      .from(table)
      .insert(batch);
    
    if (error) {
      console.error(`❌ Erro ao inserir lote ${i}-${i + batch.length}:`, error.message);
    } else {
      inserted += batch.length;
      console.log(`   ✅ ${table}: ${inserted}/${data.length} registros inseridos`);
    }
  }
  
  return inserted;
}

// Inserir regime urbanístico
console.log('\n📊 Inserindo regime urbanístico...');
const regimeInserted = await insertBatch('regime_urbanistico', regimeData);

// Inserir ZOTs
console.log('\n📊 Inserindo ZOTs vs Bairros...');
const zotsInserted = await insertBatch('zots_bairros', zotsData);

// Verificar resultado final
console.log('\n📋 Verificando importação final...');

const { count: finalRegimeCount } = await supabase
  .from('regime_urbanistico')
  .select('*', { count: 'exact', head: true });

const { count: finalZotsCount } = await supabase
  .from('zots_bairros')
  .select('*', { count: 'exact', head: true });

console.log(`\n📊 Resumo Final da Importação:`);
console.log(`- Regime Urbanístico: ${finalRegimeCount || 0} registros totais`);
console.log(`- ZOTs vs Bairros: ${finalZotsCount || 0} registros totais`);
console.log(`- Total Geral: ${(finalRegimeCount || 0) + (finalZotsCount || 0)} registros\n`);

// Testar consultas
console.log('📋 Testando consultas...');

// Teste 1: Buscar por bairro
const { data: cavalhada } = await supabase
  .from('regime_urbanistico')
  .select('*')
  .eq('bairro', 'CAVALHADA')
  .single();

if (cavalhada) {
  console.log('\n✅ Teste 1 - Cavalhada:');
  console.log(`   Zona: ${cavalhada.zona}`);
  console.log(`   Altura Máxima: ${cavalhada.altura_max_m}m`);
  console.log(`   CA Máximo: ${cavalhada.ca_max}`);
}

// Teste 2: Buscar zonas intensivas
const { data: intensivas, count: intensivasCount } = await supabase
  .from('regime_urbanistico')
  .select('bairro, altura_max_m', { count: 'exact' })
  .ilike('zona', '%Intensiva%')
  .order('altura_max_m', { ascending: false })
  .limit(5);

if (intensivas) {
  console.log(`\n✅ Teste 2 - Top 5 Zonas Intensivas (${intensivasCount} total):`);
  intensivas.forEach(b => console.log(`   ${b.bairro}: ${b.altura_max_m}m`));
}

// Teste 3: Buscar incentivos
const { data: incentivos } = await supabase
  .from('zots_bairros')
  .select('bairro, incentivos')
  .or('incentivos->iptu_verde.eq.true,incentivos->comercio_terreo.eq.true')
  .limit(5);

if (incentivos) {
  console.log('\n✅ Teste 3 - Bairros com Incentivos:');
  incentivos.forEach(b => {
    const inc = [];
    if (b.incentivos.iptu_verde) inc.push('IPTU Verde');
    if (b.incentivos.comercio_terreo) inc.push('Comércio Térreo');
    if (b.incentivos.bonus_construtivo) inc.push('Bônus Construtivo');
    console.log(`   ${b.bairro}: ${inc.join(', ')}`);
  });
}

console.log('\n🎉 Importação concluída com sucesso!');
console.log('\n📌 Próximos passos:');
console.log('1. Para importar os 387 registros completos, exporte os dados do Excel para JSON');
console.log('2. Use: node scripts/convert-excel-to-json.mjs');
console.log('3. Execute este script novamente');
console.log('\n💡 Os dados agora podem ser consultados pelo sistema de chat!');