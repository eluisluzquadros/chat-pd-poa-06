// Buscar o nome correto de CAVALHADA na base
import { createClient } from '@supabase/supabase-js';

const supabaseUrl = 'https://ngrqwmvuhvjkeohesbxs.supabase.co';
const supabaseKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Im5ncnF3bXZ1aHZqa2VvaGVzYnhzIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc1MzYwOTAxNywiZXhwIjoyMDY5MTg1MDE3fQ.7jVZP70RAjpfFPfehZt5Gr3vSxn8DZ3YyPJNjCwZXEo';

const supabase = createClient(supabaseUrl, supabaseKey);

async function findCorrectName() {
  console.log('🔍 Procurando variações de CAVALHADA na base...\n');
  
  // Buscar todos os bairros que contêm "CAVALH"
  const { data, error } = await supabase
    .from('document_rows')
    .select('row_data->Bairro as bairro')
    .eq('dataset_id', '17_GMWnJC1sKff-YS0wesgxsvo3tnZdgSSb4JZ0ZjpCk')
    .ilike('row_data->Bairro', '%CAVALH%');
  
  if (data && data.length > 0) {
    const uniqueBairros = [...new Set(data.map(d => d.bairro))];
    console.log('✅ Encontradas as seguintes variações:');
    uniqueBairros.forEach(b => console.log(`   - ${b}`));
  } else {
    console.log('❌ Nenhuma variação com "CAVALH" encontrada');
  }
  
  // Tentar outras possibilidades
  console.log('\n🔍 Verificando outras possibilidades...');
  
  const possibilities = [
    'CAVALHADA',
    'CAVALADA',
    'CAVALHADA DO SUL',
    'VILA CAVALHADA',
    'JARDIM CAVALHADA'
  ];
  
  for (const name of possibilities) {
    const { count } = await supabase
      .from('document_rows')
      .select('*', { count: 'exact', head: true })
      .eq('dataset_id', '17_GMWnJC1sKff-YS0wesgxsvo3tnZdgSSb4JZ0ZjpCk')
      .eq('row_data->Bairro', name);
    
    if (count > 0) {
      console.log(`   ✅ "${name}": ${count} registros encontrados`);
    }
  }
  
  // Verificar na lista completa de bairros
  console.log('\n🔍 Verificando na lista de 94 bairros...');
  const fs = await import('fs');
  const bairrosList = JSON.parse(fs.readFileSync('bairros_porto_alegre.json', 'utf8'));
  
  const cavalhada = bairrosList.find(b => b.includes('CAVALH'));
  if (cavalhada) {
    console.log(`   ✅ Nome na lista oficial: "${cavalhada}"`);
  } else {
    console.log('   ❌ CAVALHADA não está na lista dos 94 bairros');
    
    // Procurar nomes similares
    const similar = bairrosList.filter(b => 
      b.includes('CAVA') || 
      b.includes('CALHA') || 
      b.includes('ALHA')
    );
    
    if (similar.length > 0) {
      console.log('\n   🤔 Bairros com nomes similares:');
      similar.forEach(b => console.log(`      - ${b}`));
    }
  }
  
  // Verificar se CAVALHADA está no dataset de ZOTs vs Bairros
  console.log('\n🔍 Verificando no dataset ZOTs vs Bairros...');
  const { data: zotData } = await supabase
    .from('document_rows')
    .select('row_data')
    .eq('dataset_id', '1FTENHpX4aLxmAoxvrEeGQn0fej-wxTMQRQs_XBjPQPY')
    .limit(500);
  
  if (zotData) {
    const allBairros = zotData.map(r => r.row_data.Bairro).filter(Boolean);
    const uniqueBairrosZot = [...new Set(allBairros)].sort();
    
    const hasCalvalhada = uniqueBairrosZot.find(b => b && b.includes('CAVALH'));
    if (hasCalvalhada) {
      console.log(`   ✅ Encontrado no dataset: "${hasCalvalhada}"`);
    } else {
      console.log('   ❌ CAVALHADA não encontrada no dataset de ZOTs');
    }
  }
}

findCorrectName().catch(console.error);