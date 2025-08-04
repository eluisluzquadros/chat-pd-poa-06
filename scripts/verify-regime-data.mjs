#!/usr/bin/env node
// Script para verificar e diagnosticar dados do regime urbanístico

import { createClient } from '@supabase/supabase-js';

const supabaseUrl = 'https://ngrqwmvuhvjkeohesbxs.supabase.co';
const supabaseServiceKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Im5ncnF3bXZ1aHZqa2VvaGVzYnhzIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc1MzYwOTAxNywiZXhwIjoyMDY5MTg1MDE3fQ.7jVZP70RAjpfFPfehZt5Gr3vSxn8DZ3YyPJNjCwZXEo';

const supabase = createClient(supabaseUrl, supabaseServiceKey);

async function checkRegimeData() {
  console.log('🔍 Verificando dados do regime urbanístico...\n');

  // 1. Verificar se existem dados em document_rows
  const { data: datasetCheck, error: datasetError } = await supabase
    .from('document_rows')
    .select('dataset_id')
    .eq('dataset_id', '17_GMWnJC1sKff-YS0wesgxsvo3tnZdgSSb4JZ0ZjpCk')
    .limit(1);

  if (datasetError) {
    console.error('❌ Erro ao verificar dataset:', datasetError.message);
    return;
  }

  if (!datasetCheck || datasetCheck.length === 0) {
    console.log('⚠️ Dataset do regime urbanístico NÃO encontrado!');
    console.log('   ID esperado: 17_GMWnJC1sKff-YS0wesgxsvo3tnZdgSSb4JZ0ZjpCk\n');
    
    // Verificar datasets disponíveis
    const { data: datasets } = await supabase
      .from('document_rows')
      .select('dataset_id')
      .limit(10);
    
    console.log('📦 Datasets disponíveis:');
    const uniqueDatasets = [...new Set(datasets?.map(d => d.dataset_id))];
    uniqueDatasets.forEach(id => console.log(`   - ${id}`));
    
  } else {
    console.log('✅ Dataset do regime urbanístico encontrado!\n');
    
    // 2. Buscar alturas máximas
    const { data: alturas, error: alturasError } = await supabase
      .from('document_rows')
      .select('row_data')
      .eq('dataset_id', '17_GMWnJC1sKff-YS0wesgxsvo3tnZdgSSb4JZ0ZjpCk')
      .not('row_data->Altura Máxima - Edificação Isolada', 'is', null)
      .limit(100);

    if (alturasError) {
      console.error('❌ Erro ao buscar alturas:', alturasError.message);
      return;
    }

    // Processar e ordenar alturas
    const alturasProcessadas = alturas
      ?.map(row => ({
        zona: row.row_data['Zona'],
        altura: parseFloat(row.row_data['Altura Máxima - Edificação Isolada'])
      }))
      .filter(item => !isNaN(item.altura))
      .sort((a, b) => b.altura - a.altura);

    console.log('📏 Top 10 Alturas Máximas:');
    alturasProcessadas?.slice(0, 10).forEach(item => {
      console.log(`   ${item.zona}: ${item.altura} metros`);
    });

    console.log(`\n📊 Estatísticas:`);
    console.log(`   Total de zonas com altura definida: ${alturasProcessadas?.length}`);
    console.log(`   Altura máxima: ${alturasProcessadas?.[0]?.altura} metros`);
    console.log(`   Altura mínima: ${alturasProcessadas?.[alturasProcessadas.length - 1]?.altura} metros`);
  }

  // 3. Verificar tabela regime_urbanistico
  const { data: regimeTable, error: regimeError } = await supabase
    .from('regime_urbanistico')
    .select('*')
    .limit(1);

  console.log('\n📋 Tabela regime_urbanistico:');
  if (regimeError) {
    console.log('   ❌ Não existe ou erro ao acessar');
  } else {
    console.log('   ✅ Existe e acessível');
  }
}

checkRegimeData().catch(console.error);