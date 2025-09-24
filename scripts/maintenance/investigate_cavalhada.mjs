// Script para investigar por que CAVALHADA falha
import { createClient } from '@supabase/supabase-js';

const supabaseUrl = 'https://ngrqwmvuhvjkeohesbxs.supabase.co';
const supabaseKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Im5ncnF3bXZ1aHZqa2VvaGVzYnhzIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc1MzYwOTAxNywiZXhwIjoyMDY5MTg1MDE3fQ.7jVZP70RAjpfFPfehZt5Gr3vSxn8DZ3YyPJNjCwZXEo';

const supabase = createClient(supabaseUrl, supabaseKey);

async function investigate() {
  console.log('🔍 INVESTIGANDO PROBLEMA COM BAIRRO CAVALHADA\n');
  
  // 1. Verificar se existe no cache
  console.log('1️⃣ Verificando cache...');
  const { data: cacheData, error: cacheError } = await supabase
    .from('query_cache')
    .select('query, created_at, hit_count')
    .ilike('query', '%cavalhada%');
  
  if (cacheData && cacheData.length > 0) {
    console.log(`   ⚠️  Encontradas ${cacheData.length} entradas em cache:`);
    cacheData.forEach(entry => {
      console.log(`   - "${entry.query}" (hits: ${entry.hit_count})`);
    });
  } else {
    console.log('   ✅ Nenhuma entrada em cache');
  }
  
  // 2. Verificar dados na base
  console.log('\n2️⃣ Verificando dados do bairro CAVALHADA...');
  const { data: bairroData, error: bairroError } = await supabase
    .from('document_rows')
    .select('row_data')
    .eq('dataset_id', '17_GMWnJC1sKff-YS0wesgxsvo3tnZdgSSb4JZ0ZjpCk')
    .ilike('row_data->Bairro', 'CAVALHADA');
  
  if (bairroData && bairroData.length > 0) {
    console.log(`   ✅ Encontrados ${bairroData.length} registros para CAVALHADA`);
    
    // Extrair ZOTs únicas
    const zots = new Set();
    bairroData.forEach(row => {
      if (row.row_data.Zona) {
        zots.add(row.row_data.Zona);
      }
    });
    
    console.log(`   📊 ZOTs encontradas: ${Array.from(zots).join(', ')}`);
    
    // Mostrar amostra de dados
    if (bairroData[0]) {
      console.log('\n   📋 Amostra de dados:');
      const sample = bairroData[0].row_data;
      console.log(`   - Zona: ${sample.Zona}`);
      console.log(`   - Altura Máxima: ${sample['Altura Máxima - Edificação Isolada']}`);
      console.log(`   - Coef. Básico: ${sample['Coeficiente de Aproveitamento - Básico']}`);
      console.log(`   - Coef. Máximo: ${sample['Coeficiente de Aproveitamento - Máximo']}`);
    }
  } else {
    console.log('   ❌ Nenhum dado encontrado para CAVALHADA');
  }
  
  // 3. Verificar variações do nome
  console.log('\n3️⃣ Verificando variações do nome...');
  const variations = ['CAVALHADA', 'Cavalhada', 'cavalhada', 'CAVALHA'];
  
  for (const variation of variations) {
    const { count } = await supabase
      .from('document_rows')
      .select('*', { count: 'exact', head: true })
      .eq('dataset_id', '1FTENHpX4aLxmAoxvrEeGQn0fej-wxTMQRQs_XBjPQPY')
      .eq('row_data->Bairro', variation);
    
    console.log(`   - "${variation}": ${count || 0} registros`);
  }
  
  // 4. Limpar cache se necessário
  if (cacheData && cacheData.length > 0) {
    console.log('\n4️⃣ Limpando cache de CAVALHADA...');
    const { error: deleteError } = await supabase
      .from('query_cache')
      .delete()
      .ilike('query', '%cavalhada%');
    
    if (!deleteError) {
      console.log('   ✅ Cache limpo com sucesso');
    } else {
      console.log('   ❌ Erro ao limpar cache:', deleteError.message);
    }
  }
  
  console.log('\n📝 CONCLUSÃO:');
  console.log('Se CAVALHADA tem dados na base mas falha nas queries,');
  console.log('o problema pode estar na lógica de processamento ou');
  console.log('em respostas antigas em cache. Após limpar o cache,');
  console.log('teste novamente a query "cavalhada".');
}

investigate().catch(console.error);