// Analisar a diferença entre as queries e por que algumas funcionaram e outras não
import { createClient } from '@supabase/supabase-js';

const supabaseUrl = 'https://ngrqwmvuhvjkeohesbxs.supabase.co';
const supabaseKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Im5ncnF3bXZ1aHZqa2VvaGVzYnhzIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc1MzYwOTAxNywiZXhwIjoyMDY5MTg1MDE3fQ.7jVZP70RAjpfFPfehZt5Gr3vSxn8DZ3YyPJNjCwZXEo';

const supabase = createClient(supabaseUrl, supabaseKey);

async function analyzeQuerySyntax() {
  console.log('🔍 ANALISANDO DIFERENÇAS DE SINTAXE NAS QUERIES\n');
  
  // Testar diferentes sintaxes para o mesmo bairro
  const testBairros = ['CAVALHADA', 'TRÊS FIGUEIRAS', 'CRISTAL'];
  
  for (const bairro of testBairros) {
    console.log(`\n🏘️  Testando ${bairro}:\n`);
    
    // Sintaxe 1: -> com ilike direto (INCORRETA)
    console.log('1. Sintaxe: row_data->Bairro com ilike');
    try {
      const { data: data1, error: error1 } = await supabase
        .from('document_rows')
        .select('row_data')
        .eq('dataset_id', '17_GMWnJC1sKff-YS0wesgxsvo3tnZdgSSb4JZ0ZjpCk')
        .ilike('row_data->Bairro', bairro);
      
      console.log(`   Resultado: ${data1?.length || 0} registros`);
      if (error1) console.log(`   Erro: ${error1.message}`);
    } catch (e) {
      console.log(`   Erro: ${e.message}`);
    }
    
    // Sintaxe 2: ->> com ilike e wildcards (CORRETA)
    console.log('\n2. Sintaxe: row_data->>Bairro com ilike e %');
    const { data: data2, error: error2 } = await supabase
      .from('document_rows')
      .select('row_data')
      .eq('dataset_id', '17_GMWnJC1sKff-YS0wesgxsvo3tnZdgSSb4JZ0ZjpCk')
      .ilike('row_data->>Bairro', `%${bairro}%`);
    
    console.log(`   Resultado: ${data2?.length || 0} registros`);
    
    // Sintaxe 3: ->> com eq exato
    console.log('\n3. Sintaxe: row_data->>Bairro com eq');
    const { data: data3, error: error3 } = await supabase
      .from('document_rows')
      .select('row_data')
      .eq('dataset_id', '17_GMWnJC1sKff-YS0wesgxsvo3tnZdgSSb4JZ0ZjpCk')
      .eq('row_data->>Bairro', bairro);
    
    console.log(`   Resultado: ${data3?.length || 0} registros`);
    
    // Verificar o valor exato do campo Bairro
    if (data2 && data2.length > 0) {
      console.log(`\n   Valor exato do campo Bairro: "${data2[0].row_data.Bairro}"`);
      console.log(`   Tem espaços extras? ${data2[0].row_data.Bairro !== bairro}`);
      console.log(`   Comprimento: ${data2[0].row_data.Bairro.length} vs ${bairro.length}`);
    }
  }
  
  // Analisar todos os valores únicos de Bairro
  console.log('\n\n📊 ANÁLISE DE TODOS OS BAIRROS:\n');
  
  const { data: allData } = await supabase
    .from('document_rows')
    .select('row_data->Bairro as bairro')
    .eq('dataset_id', '17_GMWnJC1sKff-YS0wesgxsvo3tnZdgSSb4JZ0ZjpCk')
    .limit(1000);
  
  if (allData) {
    const bairrosUnicos = [...new Set(allData.map(d => d.bairro).filter(Boolean))];
    
    // Verificar bairros com possíveis problemas
    const bairrosComEspacos = bairrosUnicos.filter(b => b !== b.trim());
    const bairrosComEspacosDuplos = bairrosUnicos.filter(b => b.includes('  '));
    
    console.log(`Total de bairros únicos: ${bairrosUnicos.length}`);
    console.log(`Bairros com espaços no início/fim: ${bairrosComEspacos.length}`);
    console.log(`Bairros com espaços duplos: ${bairrosComEspacosDuplos.length}`);
    
    if (bairrosComEspacos.length > 0) {
      console.log('\nBairros com espaços extras:');
      bairrosComEspacos.slice(0, 5).forEach(b => {
        console.log(`   - "${b}" (comprimento: ${b.length})`);
      });
    }
  }
}

analyzeQuerySyntax().catch(console.error);