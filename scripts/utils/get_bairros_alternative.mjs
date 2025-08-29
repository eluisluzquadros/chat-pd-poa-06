// Script alternativo para buscar bairros
import { createClient } from '@supabase/supabase-js';

const supabaseUrl = 'https://ngrqwmvuhvjkeohesbxs.supabase.co';
const supabaseKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Im5ncnF3bXZ1aHZqa2VvaGVzYnhzIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc1MzYwOTAxNywiZXhwIjoyMDY5MTg1MDE3fQ.7jVZP70RAjpfFPfehZt5Gr3vSxn8DZ3YyPJNjCwZXEo';

const supabase = createClient(supabaseUrl, supabaseKey);

async function getBairrosFromDataset() {
  console.log('🔍 Buscando bairros do dataset de ZOTs vs Bairros...\n');

  // Primeiro, vamos ver o que tem na tabela
  const { data: sample, error: sampleError } = await supabase
    .from('document_rows')
    .select('dataset_id, row_data')
    .limit(5);

  if (sampleError) {
    console.error('Erro ao buscar amostra:', sampleError);
    return;
  }

  console.log('📋 Amostra de dados encontrados:');
  sample.forEach(row => {
    console.log(`Dataset: ${row.dataset_id}`);
    console.log(`Dados: ${JSON.stringify(row.row_data).substring(0, 200)}...\n`);
  });

  // Buscar do dataset correto
  const { data, error } = await supabase
    .from('document_rows')
    .select('row_data')
    .eq('dataset_id', '1FTENHpX4aLxmAoxvrEeGQn0fej-wxTMQRQs_XBjPQPY');

  if (error) {
    console.error('Erro ao buscar dados:', error);
    return;
  }

  console.log(`\n📊 Registros encontrados: ${data?.length || 0}`);

  if (data && data.length > 0) {
    // Extrair bairros únicos
    const bairrosSet = new Set();
    data.forEach(row => {
      if (row.row_data && row.row_data.Bairro) {
        bairrosSet.add(row.row_data.Bairro);
      }
    });

    const bairrosList = Array.from(bairrosSet).sort();
    
    console.log(`\n📊 Total de bairros únicos: ${bairrosList.length}\n`);
    console.log('Lista de bairros:');
    bairrosList.forEach((bairro, index) => {
      console.log(`${(index + 1).toString().padStart(3, ' ')}. ${bairro}`);
    });

    // Salvar lista
    const fs = await import('fs');
    fs.writeFileSync('bairros_porto_alegre.json', JSON.stringify(bairrosList, null, 2));
    console.log('\n✅ Lista salva em bairros_porto_alegre.json');
    
    return bairrosList;
  }
}

getBairrosFromDataset().catch(console.error);