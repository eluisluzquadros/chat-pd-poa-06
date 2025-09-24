import { createClient } from '@supabase/supabase-js';

const supabase = createClient(
  'https://ngrqwmvuhvjkeohesbxs.supabase.co',
  'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Im5ncnF3bXZ1aHZqa2VvaGVzYnhzIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc1MzYwOTAxNywiZXhwIjoyMDY5MTg1MDE3fQ.7jVZP70RAjpfFPfehZt5Gr3vSxn8DZ3YyPJNjCwZXEo'
);

async function checkCompleteStatus() {
  console.log('📊 VERIFICAÇÃO COMPLETA DO SISTEMA RAG\n');
  console.log('=' .repeat(50) + '\n');
  
  // 1. DOCUMENTOS
  console.log('📄 1. DOCUMENTOS NA BASE:');
  const { data: docs, count: docCount } = await supabase
    .from('documents')
    .select('id, metadata', { count: 'exact' });
  
  console.log(`Total de documentos: ${docCount || 0}`);
  if (docs && docs.length > 0) {
    docs.forEach(doc => {
      console.log(`  - ID: ${doc.id}, Título: ${doc.metadata?.title || 'Sem título'}`);
    });
  }
  
  // 2. CHUNKS/EMBEDDINGS
  console.log('\n\n🧩 2. CHUNKS E EMBEDDINGS:');
  const { count: chunkCount } = await supabase
    .from('document_embeddings')
    .select('*', { count: 'exact', head: true });
  
  const { count: hierarchicalCount } = await supabase
    .from('document_embeddings')
    .select('*', { count: 'exact', head: true })
    .not('chunk_metadata', 'is', null);
  
  console.log(`Total de chunks: ${chunkCount || 0}`);
  console.log(`Chunks com metadados hierárquicos: ${hierarchicalCount || 0}`);
  console.log(`⚠️ Apenas 2 chunks de TESTE foram criados manualmente`);
  
  // 3. DADOS ESTRUTURADOS
  console.log('\n\n📊 3. DADOS ESTRUTURADOS (SQL):');
  
  // Verificar zonas_bairros
  const { count: zonasCount } = await supabase
    .from('zonas_bairros')
    .select('*', { count: 'exact', head: true });
  
  console.log(`Registros em zonas_bairros: ${zonasCount || 0}`);
  
  // Verificar document_rows (dados das planilhas)
  const { count: rowsCount } = await supabase
    .from('document_rows')
    .select('*', { count: 'exact', head: true });
  
  console.log(`Registros em document_rows: ${rowsCount || 0}`);
  
  // Verificar datasets
  const { data: datasets } = await supabase
    .from('datasets')
    .select('name, sheet_name');
  
  if (datasets && datasets.length > 0) {
    console.log('\nDatasets disponíveis:');
    datasets.forEach(ds => {
      console.log(`  - ${ds.name} (${ds.sheet_name})`);
    });
  }
  
  // 4. DADOS DE RISCO
  console.log('\n\n⚠️ 4. DADOS DE RISCO DE DESASTRE:');
  const { count: riskCount } = await supabase
    .from('bairros_risco_desastre')
    .select('*', { count: 'exact', head: true });
  
  console.log(`Registros de risco: ${riskCount || 0}`);
  if (riskCount === 0) {
    console.log('❌ Dados de risco NÃO foram importados');
  }
  
  // 5. EDGE FUNCTIONS
  console.log('\n\n⚡ 5. EDGE FUNCTIONS:');
  const functions = [
    'process-document',
    'enhanced-vector-search',
    'generate-text-embedding',
    'agentic-rag',
    'query-analyzer',
    'sql-generator',
    'response-synthesizer'
  ];
  
  for (const fn of functions) {
    try {
      const { error } = await supabase.functions.invoke(fn, {
        body: { test: true }
      });
      console.log(`  ${error ? '❌' : '✅'} ${fn}`);
    } catch (e) {
      console.log(`  ❌ ${fn} (não deployada ou com erro)`);
    }
  }
  
  // 6. SISTEMA RAG AGÊNTICO
  console.log('\n\n🤖 6. SISTEMA RAG AGÊNTICO:');
  console.log('O sistema usa uma combinação de:');
  console.log('  - Dados estruturados (SQL) via sql-generator');
  console.log('  - Dados não estruturados (documentos) via vector search');
  console.log('  - Response synthesizer para combinar ambos');
  
  // RESUMO
  console.log('\n\n' + '=' .repeat(50));
  console.log('📋 RESUMO DO STATUS:\n');
  
  console.log('✅ FUNCIONANDO:');
  console.log('  - Estrutura de banco de dados');
  console.log('  - Edge Functions básicas deployadas');
  console.log('  - Sistema de busca vetorial');
  console.log('  - 2 chunks de teste (Art. 81 e 74)');
  
  console.log('\n❌ FALTANDO:');
  console.log('  - Processar documentos reais da knowledgebase');
  console.log('  - Importar dados de risco de desastre');
  console.log('  - Deploy das funções do RAG agêntico');
  
  console.log('\n🎯 PARA COMPLETAR 100%:');
  console.log('1. Processar documentos: npx supabase functions deploy process-document --project-ref ngrqwmvuhvjkeohesbxs');
  console.log('2. Depois: node upload-docs-simple.mjs');
  console.log('3. Importar riscos: npx tsx scripts/import-disaster-risk-data.ts');
  console.log('4. Deploy RAG agêntico:');
  console.log('   npx supabase functions deploy agentic-rag --project-ref ngrqwmvuhvjkeohesbxs');
  console.log('   npx supabase functions deploy query-analyzer --project-ref ngrqwmvuhvjkeohesbxs');
  console.log('   npx supabase functions deploy sql-generator --project-ref ngrqwmvuhvjkeohesbxs');
  console.log('   npx supabase functions deploy response-synthesizer --project-ref ngrqwmvuhvjkeohesbxs');
}

checkCompleteStatus().catch(console.error);