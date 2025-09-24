import { createClient } from '@supabase/supabase-js';

const supabase = createClient(
  'https://ngrqwmvuhvjkeohesbxs.supabase.co',
  'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Im5ncnF3bXZ1aHZqa2VvaGVzYnhzIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc1MzYwOTAxNywiZXhwIjoyMDY5MTg1MDE3fQ.7jVZP70RAjpfFPfehZt5Gr3vSxn8DZ3YyPJNjCwZXEo'
);

async function testRiskQuery() {
  console.log('🧪 Testando Query de Risco de Desastre\n');
  
  const queries = [
    "Quais bairros têm risco de inundação?",
    "Quais bairros foram afetados pelas enchentes?",
    "Me diz os bairros com alto risco",
    "Qual o risco do Centro Histórico?"
  ];
  
  for (const query of queries) {
    console.log(`\n📝 Query: "${query}"`);
    
    // Teste direto no banco
    console.log('\n🔍 Teste direto no banco:');
    
    if (query.toLowerCase().includes('centro histórico')) {
      const { data, error } = await supabase
        .rpc('get_riscos_bairro', { nome_bairro: 'CENTRO HISTÓRICO' });
      
      if (data && data.length > 0) {
        console.log('✅ Resultado:', data[0]);
      }
    } else if (query.toLowerCase().includes('inundação') || query.toLowerCase().includes('enchente')) {
      const { data, error } = await supabase
        .from('bairros_risco_desastre')
        .select('bairro_nome, nivel_risco_geral, observacoes')
        .eq('risco_inundacao', true)
        .order('nivel_risco_geral', { ascending: false })
        .limit(10);
      
      if (data && data.length > 0) {
        console.log('✅ Bairros com risco de inundação:');
        data.forEach(b => {
          const nivel = b.nivel_risco_geral === 5 ? '🔴 MUITO ALTO' :
                       b.nivel_risco_geral === 3 ? '🟡 MÉDIO' : '🟢 BAIXO';
          console.log(`   - ${b.bairro_nome}: ${nivel}`);
        });
      }
    } else if (query.toLowerCase().includes('alto risco')) {
      const { data, error } = await supabase
        .from('bairros_risco_desastre')
        .select('bairro_nome, nivel_risco_geral, observacoes')
        .gte('nivel_risco_geral', 4)
        .order('nivel_risco_geral', { ascending: false })
        .limit(10);
      
      if (data && data.length > 0) {
        console.log('✅ Bairros com alto risco:');
        data.forEach(b => {
          console.log(`   - ${b.bairro_nome}: Nível ${b.nivel_risco_geral} - ${b.observacoes}`);
        });
      }
    }
  }
  
  // Estatísticas gerais
  console.log('\n\n📊 ESTATÍSTICAS GERAIS:');
  
  const { count: totalBairros } = await supabase
    .from('bairros_risco_desastre')
    .select('*', { count: 'exact', head: true });
  
  const { count: bairrosComRisco } = await supabase
    .from('bairros_risco_desastre')
    .select('*', { count: 'exact', head: true })
    .eq('risco_inundacao', true);
  
  const { count: bairrosAltoRisco } = await supabase
    .from('bairros_risco_desastre')
    .select('*', { count: 'exact', head: true })
    .gte('nivel_risco_geral', 4);
  
  console.log(`Total de bairros cadastrados: ${totalBairros}`);
  console.log(`Bairros com risco de inundação: ${bairrosComRisco}`);
  console.log(`Bairros com alto risco (nível 4+): ${bairrosAltoRisco}`);
}

testRiskQuery().catch(console.error);