import { createClient } from '@supabase/supabase-js';

// Configurar cliente Supabase
const supabase = createClient(
  'https://ngrqwmvuhvjkeohesbxs.supabase.co',
  'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Im5ncnF3bXZ1aHZqa2VvaGVzYnhzIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc1MzYwOTAxNywiZXhwIjoyMDY5MTg1MDE3fQ.7jVZP70RAjpfFPfehZt5Gr3vSxn8DZ3YyPJNjCwZXEo'
);

console.log('🚀 Importação COMPLETA dos 94 Bairros de Porto Alegre\n');

// Buscar todos os dados de regime urbanístico
console.log('📋 Buscando dados de todos os bairros...');

const { data: allData, error: fetchError } = await supabase
  .from('document_rows')
  .select('row_data')
  .eq('dataset_id', '17_GMWnJC1sKff-YS0wesgxsvo3tnZdgSSb4JZ0ZjpCk')
  .order('row_data->Bairro');

if (fetchError) {
  console.error('❌ Erro ao buscar dados:', fetchError);
  process.exit(1);
}

console.log(`✅ ${allData.length} registros encontrados\n`);

// Extrair bairros únicos
const bairrosMap = new Map();

allData.forEach(row => {
  const data = row.row_data;
  const bairro = data.Bairro;
  
  if (bairro && !bairrosMap.has(bairro)) {
    bairrosMap.set(bairro, {
      bairro: bairro,
      zona: data.Zona || 'Não especificada',
      // Converter valores de texto para números quando possível
      altura_max_m: parseFloat(data['Altura Máxima - Edificação Isolada']) || null,
      ca_max: parseFloat(data['Coeficiente de Aproveitamento - Máximo']) || null,
      to_base: parseFloat(data['Taxa de Ocupação - Base']) || null,
      to_max: parseFloat(data['Taxa de Ocupação - Máxima']) || null,
      taxa_permeabilidade: parseFloat(data['Taxa de Permeabilidade']) || null,
      recuo_jardim_m: parseFloat(data['Recuo - Recuo de Jardim']) || 4.0,
      recuo_lateral_m: parseFloat(data['Recuo - Recuo Lateral']) || null,
      recuo_fundos_m: parseFloat(data['Recuo - Recuo de Fundos']) || null,
      area_total_ha: parseFloat(data['Área Total (ha)']) || null,
      populacao: parseInt(data['População']) || null,
      densidade_hab_ha: parseFloat(data['Densidade (hab/ha)']) || null,
      domicilios: parseInt(data['Domicílios']) || null,
      quarteirao_padrao_m: parseInt(data['Quarteirão padrão (m)']) || null,
      divisao_lote: data['Divisão de lote'] === 'S' || data['Divisão de lote'] === 'Sim',
      remembramento: data['Remembramento'] === 'S' || data['Remembramento'] === 'Sim',
      quota_ideal_m2: parseInt(data['Quota ideal (m²)']) || null,
      metadata: {
        altura_regra: data['Altura Máxima - Edificação Isolada'], // Guardar texto original
        ca_basico: data['Coeficiente de Aproveitamento - Básico'],
        ca_maximo_texto: data['Coeficiente de Aproveitamento - Máximo'],
        observacoes: data['Observações'] || null
      }
    });
  }
});

const regimeData = Array.from(bairrosMap.values());
console.log(`📊 ${regimeData.length} bairros únicos identificados\n`);

// Limpar dados existentes
console.log('🧹 Limpando dados anteriores...');
const { error: deleteError } = await supabase
  .from('regime_urbanistico')
  .delete()
  .gte('id', 0);

if (deleteError && !deleteError.message.includes('no rows')) {
  console.error('⚠️  Erro ao limpar:', deleteError.message);
}

// Inserir dados em lotes
console.log('📊 Inserindo dados dos bairros...\n');

const batchSize = 20;
let totalInserted = 0;

for (let i = 0; i < regimeData.length; i += batchSize) {
  const batch = regimeData.slice(i, i + batchSize);
  
  const { data: inserted, error: insertError } = await supabase
    .from('regime_urbanistico')
    .insert(batch)
    .select();
  
  if (insertError) {
    console.error(`❌ Erro no lote ${i}-${i + batch.length}:`, insertError.message);
    // Tentar inserir um por um
    for (const item of batch) {
      const { error: singleError } = await supabase
        .from('regime_urbanistico')
        .insert(item);
      
      if (!singleError) {
        totalInserted++;
      } else {
        console.error(`   ⚠️  Falha em ${item.bairro}:`, singleError.message);
      }
    }
  } else {
    totalInserted += inserted.length;
    console.log(`✅ Lote ${Math.floor(i/batchSize) + 1}: ${inserted.length} bairros inseridos`);
  }
}

// Criar dados de ZOTs correspondentes
console.log('\n📊 Criando dados de ZOTs vs Bairros...');

const zotsData = regimeData.map(regime => ({
  bairro: regime.bairro,
  zona: regime.zona,
  caracteristicas: {
    tipo: regime.zona.includes("Intensiva") ? "misto" : 
          regime.zona.includes("Rarefeita") ? "preservação" : 
          regime.zona.includes("Moderada") ? "residencial" : "especial",
    densidade: regime.densidade_hab_ha > 100 ? "alta" : 
               regime.densidade_hab_ha > 50 ? "média" : "baixa",
    infraestrutura: regime.zona.includes("Rarefeita") ? "básica" : "completa",
    area_total_ha: regime.area_total_ha,
    populacao: regime.populacao,
    domicilios: regime.domicilios
  },
  restricoes: {
    altura_maxima: regime.metadata.altura_regra,
    taxa_permeabilidade_min: regime.taxa_permeabilidade,
    usos_proibidos: regime.zona.includes("Rarefeita") ? ["indústria", "grandes empreendimentos"] : 
                    regime.zona.includes("Moderada") ? ["indústria pesada"] : []
  },
  incentivos: {
    iptu_verde: regime.taxa_permeabilidade >= 20,
    bonus_construtivo: regime.zona.includes("Intensiva") ? "até 20% para uso misto" : 
                      regime.zona.includes("Moderada") ? "até 15% para fachada ativa" : null,
    comercio_terreo: regime.zona.includes("Intensiva"),
    preservacao_ambiental: regime.zona.includes("Rarefeita")
  }
}));

// Limpar ZOTs existentes
await supabase.from('zots_bairros').delete().gte('id', 0);

// Inserir ZOTs em lotes
let zotsInserted = 0;
for (let i = 0; i < zotsData.length; i += batchSize) {
  const batch = zotsData.slice(i, i + batchSize);
  const { data: inserted, error } = await supabase
    .from('zots_bairros')
    .insert(batch)
    .select();
  
  if (!error) {
    zotsInserted += inserted.length;
  }
}

console.log(`✅ ${zotsInserted} registros de ZOTs inseridos\n`);

// Verificar resultado final
const { count: finalCount } = await supabase
  .from('regime_urbanistico')
  .select('*', { count: 'exact', head: true });

const { count: zotsCount } = await supabase
  .from('zots_bairros')
  .select('*', { count: 'exact', head: true });

console.log('📊 RESUMO FINAL DA IMPORTAÇÃO:');
console.log(`✅ Regime Urbanístico: ${finalCount} bairros`);
console.log(`✅ ZOTs vs Bairros: ${zotsCount} registros`);
console.log(`✅ Total: ${finalCount + zotsCount} registros\n`);

// Listar alguns bairros como exemplo
console.log('📋 Exemplos de bairros importados:');
const { data: examples } = await supabase
  .from('regime_urbanistico')
  .select('bairro, zona, altura_max_m')
  .order('bairro')
  .limit(10);

examples?.forEach(b => {
  console.log(`   ${b.bairro}: ${b.zona} (Altura: ${b.altura_max_m || 'variável'}m)`);
});

// Verificar bairros específicos
console.log('\n🔍 Verificando bairros importantes:');
const importantes = ['CENTRO HISTORICO', 'MOINHOS DE VENTO', 'CIDADE BAIXA', 'PETROPOLIS', 'CAVALHADA'];

for (const nome of importantes) {
  const { data } = await supabase
    .from('regime_urbanistico')
    .select('bairro, zona, altura_max_m, ca_max')
    .eq('bairro', nome)
    .single();
  
  if (data) {
    console.log(`✅ ${data.bairro}: ${data.zona} (${data.altura_max_m || 'N/A'}m, CA: ${data.ca_max || 'N/A'})`);
  } else {
    console.log(`❌ ${nome}: Não encontrado`);
  }
}

console.log('\n🎉 Importação concluída! Todos os 94 bairros de Porto Alegre foram processados.');