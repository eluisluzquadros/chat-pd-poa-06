// Script para buscar todos os bairros únicos da base
import { createClient } from '@supabase/supabase-js';

const supabaseUrl = 'https://ngrqwmvuhvjkeohesbxs.supabase.co';
const supabaseKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Im5ncnF3bXZ1aHZqa2VvaGVzYnhzIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc1MzYwOTAxNywiZXhwIjoyMDY5MTg1MDE3fQ.7jVZP70RAjpfFPfehZt5Gr3vSxn8DZ3YyPJNjCwZXEo';

const supabase = createClient(supabaseUrl, supabaseKey);

async function getAllBairros() {
  console.log('🔍 Buscando todos os bairros da base de dados...\n');

  // Buscar da tabela document_rows
  const { data, error } = await supabase
    .from('document_rows')
    .select('row_data->Bairro as bairro')
    .eq('dataset_id', '17_GMWnJC1sKff-YS0wesgxsvo3tnZdgSSb4JZ0ZjpCk')
    .not('row_data->Bairro', 'is', null);

  if (error) {
    console.error('Erro ao buscar bairros:', error);
    return;
  }

  // Extrair bairros únicos
  const bairrosSet = new Set(data.map(row => row.bairro).filter(b => b));
  const bairrosList = Array.from(bairrosSet).sort();

  console.log(`📊 Total de bairros encontrados: ${bairrosList.length}\n`);
  console.log('Lista de bairros:');
  bairrosList.forEach((bairro, index) => {
    console.log(`${(index + 1).toString().padStart(3, ' ')}. ${bairro}`);
  });

  // Salvar lista em arquivo
  const fs = await import('fs');
  fs.writeFileSync('bairros_list.json', JSON.stringify(bairrosList, null, 2));
  console.log('\n✅ Lista salva em bairros_list.json');
  
  return bairrosList;
}

getAllBairros().catch(console.error);