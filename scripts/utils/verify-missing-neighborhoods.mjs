import { createClient } from '@supabase/supabase-js';

const supabase = createClient(
  'https://ngrqwmvuhvjkeohesbxs.supabase.co',
  'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Im5ncnF3bXZ1aHZqa2VvaGVzYnhzIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc1MzYwOTAxNywiZXhwIjoyMDY5MTg1MDE3fQ.7jVZP70RAjpfFPfehZt5Gr3vSxn8DZ3YyPJNjCwZXEo'
);

console.log('🔍 Verificando bairros e possíveis variações de nome...\n');

// Buscar todos os bairros na tabela regime_urbanistico
const { data: allBairros } = await supabase
  .from('regime_urbanistico')
  .select('bairro')
  .order('bairro');

console.log(`📊 Total de bairros na tabela: ${allBairros?.length || 0}\n`);

// Buscar variações de Centro Histórico
console.log('🔍 Buscando variações de "CENTRO"...');
const centroVariations = allBairros?.filter(b => 
  b.bairro.toUpperCase().includes('CENTRO') || 
  b.bairro.toUpperCase().includes('HISTÓRICO')
);

if (centroVariations?.length > 0) {
  console.log('Encontradas:');
  centroVariations.forEach(b => console.log(`   - ${b.bairro}`));
} else {
  console.log('   Nenhuma variação de CENTRO encontrada');
}

// Buscar variações de Petrópolis
console.log('\n🔍 Buscando variações de "PETROPOLIS"...');
const petropolisVariations = allBairros?.filter(b => 
  b.bairro.toUpperCase().includes('PETRO') ||
  b.bairro.toUpperCase().includes('PETRÓPOLIS')
);

if (petropolisVariations?.length > 0) {
  console.log('Encontradas:');
  petropolisVariations.forEach(b => console.log(`   - ${b.bairro}`));
} else {
  console.log('   Nenhuma variação de PETROPOLIS encontrada');
}

// Buscar nos dados originais
console.log('\n📋 Verificando dados originais em document_rows...');

const { data: originalData } = await supabase
  .from('document_rows')
  .select('row_data')
  .eq('dataset_id', '17_GMWnJC1sKff-YS0wesgxsvo3tnZdgSSb4JZ0ZjpCk')
  .or('row_data->>Bairro.ilike.%centro%,row_data->>Bairro.ilike.%petro%')
  .limit(10);

console.log(`\nEncontrados ${originalData?.length || 0} registros com CENTRO ou PETRO:`);
originalData?.forEach(row => {
  const bairro = row.row_data.Bairro;
  const zona = row.row_data.Zona;
  console.log(`   - "${bairro}" -> ${zona}`);
});

// Listar todos os bairros únicos
console.log('\n📋 Lista completa de todos os 94 bairros:');
console.log('=====================================\n');

const bairrosList = allBairros?.map(b => b.bairro).sort();
bairrosList?.forEach((bairro, index) => {
  console.log(`${(index + 1).toString().padStart(2, '0')}. ${bairro}`);
});

// Estatísticas por zona
console.log('\n📊 Estatísticas por tipo de zona:');
const { data: zonaStats } = await supabase
  .from('regime_urbanistico')
  .select('zona');

const zonaCounts = {};
zonaStats?.forEach(row => {
  const zona = row.zona;
  zonaCounts[zona] = (zonaCounts[zona] || 0) + 1;
});

Object.entries(zonaCounts)
  .sort((a, b) => b[1] - a[1])
  .forEach(([zona, count]) => {
    console.log(`   ${zona}: ${count} bairros`);
  });

console.log('\n✅ Verificação concluída!');