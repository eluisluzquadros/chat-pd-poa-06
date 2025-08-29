// Verificar dados de CAVALHADA com diferentes abordagens
import { createClient } from '@supabase/supabase-js';

const supabaseUrl = 'https://ngrqwmvuhvjkeohesbxs.supabase.co';
const supabaseKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Im5ncnF3bXZ1aHZqa2VvaGVzYnhzIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc1MzYwOTAxNywiZXhwIjoyMDY5MTg1MDE3fQ.7jVZP70RAjpfFPfehZt5Gr3vSxn8DZ3YyPJNjCwZXEo';

const supabase = createClient(supabaseUrl, supabaseKey);

async function checkCavalhada() {
  console.log('🔍 VERIFICANDO DADOS DE CAVALHADA CORRETAMENTE\n');
  
  // 1. Buscar com diferentes variações
  console.log('1️⃣ Testando diferentes buscas...\n');
  
  const searches = [
    { method: 'ilike', value: '%CAVALHADA%' },
    { method: 'ilike', value: '%cavalhada%' },
    { method: 'ilike', value: '%Cavalhada%' },
    { method: 'eq', value: 'CAVALHADA' },
    { method: 'eq', value: 'Cavalhada' }
  ];
  
  for (const search of searches) {
    const query = supabase
      .from('document_rows')
      .select('row_data')
      .eq('dataset_id', '17_GMWnJC1sKff-YS0wesgxsvo3tnZdgSSb4JZ0ZjpCk');
    
    const { data, error } = search.method === 'ilike' 
      ? await query.ilike('row_data->>Bairro', search.value)
      : await query.eq('row_data->>Bairro', search.value);
    
    console.log(`Busca: ${search.method}('${search.value}')`);
    console.log(`Resultado: ${data?.length || 0} registros encontrados`);
    
    if (data && data.length > 0) {
      // Mostrar ZOTs encontradas
      const zots = new Set();
      data.forEach(row => {
        if (row.row_data?.Zona) {
          zots.add(row.row_data.Zona);
        }
      });
      console.log(`ZOTs: ${Array.from(zots).sort().join(', ')}`);
      
      // Mostrar amostra de dados
      const sample = data[0].row_data;
      console.log('\nAmostra de dados:');
      console.log(`- Bairro: "${sample.Bairro}"`);
      console.log(`- Zona: ${sample.Zona}`);
      console.log(`- Altura Máxima: ${sample['Altura Máxima - Edificação Isolada']}`);
      console.log(`- Coef. Básico: ${sample['Coeficiente de Aproveitamento - Básico']}`);
      console.log(`- Coef. Máximo: ${sample['Coeficiente de Aproveitamento - Máximo']}`);
    }
    console.log('---\n');
  }
  
  // 2. Buscar sem filtro e verificar manualmente
  console.log('2️⃣ Buscando todos os bairros que começam com "C"...\n');
  
  const { data: allData } = await supabase
    .from('document_rows')
    .select('row_data->>Bairro as bairro')
    .eq('dataset_id', '17_GMWnJC1sKff-YS0wesgxsvo3tnZdgSSb4JZ0ZjpCk')
    .ilike('row_data->>Bairro', 'C%')
    .limit(1000);
  
  if (allData) {
    const uniqueBairros = [...new Set(allData.map(d => d.bairro))].sort();
    const cavalhadas = uniqueBairros.filter(b => b && b.toUpperCase().includes('CAVALHADA'));
    
    console.log(`Bairros com "CAVALHADA" no nome:`);
    if (cavalhadas.length > 0) {
      cavalhadas.forEach(b => console.log(`- "${b}"`));
    } else {
      console.log('- Nenhum encontrado');
      
      // Mostrar alguns bairros com C para debug
      console.log('\nAlguns bairros que começam com C:');
      uniqueBairros.slice(0, 10).forEach(b => console.log(`- "${b}"`));
    }
  }
  
  // 3. Testar a query real via API
  console.log('\n3️⃣ Testando query "cavalhada" via API...\n');
  
  const response = await fetch(`${supabaseUrl}/functions/v1/agentic-rag`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Im5ncnF3bXZ1aHZqa2VvaGVzYnhzIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTM2MDkwMTcsImV4cCI6MjA2OTE4NTAxN30.K3uyyzjyAQ17ohQGCUFx_RiMufblLyQzvxEZHakqKrg`,
      'apikey': 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Im5ncnF3bXZ1aHZqa2VvaGVzYnhzIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTM2MDkwMTcsImV4cCI6MjA2OTE4NTAxN30.K3uyyzjyAQ17ohQGCUFx_RiMufblLyQzvxEZHakqKrg'
    },
    body: JSON.stringify({
      message: 'cavalhada',
      sessionId: `test-${Date.now()}`,
      bypassCache: true
    })
  });
  
  const result = await response.json();
  console.log('Resposta da API:');
  console.log(`- Sucesso: ${result.response?.includes('ZOT')}`);
  console.log(`- Tem tabela: ${result.response?.includes('|')}`);
  console.log(`- Preview: ${result.response?.substring(0, 200)}...`);
}

checkCavalhada().catch(console.error);