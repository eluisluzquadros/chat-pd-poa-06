import { createClient } from '@supabase/supabase-js';

const supabase = createClient(
  'https://ngrqwmvuhvjkeohesbxs.supabase.co',
  'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Im5ncnF3bXZ1aHZqa2VvaGVzYnhzIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc1MzYwOTAxNywiZXhwIjoyMDY5MTg1MDE3fQ.7jVZP70RAjpfFPfehZt5Gr3vSxn8DZ3YyPJNjCwZXEo'
);

async function createTables() {
  console.log('🚀 Criando estruturas SQL necessárias...\n');
  
  // Primeiro, vamos verificar o que existe
  console.log('📊 Verificando tabelas existentes...');
  
  const { data: tables, error: tablesError } = await supabase
    .from('information_schema.tables')
    .select('table_name')
    .eq('table_schema', 'public')
    .in('table_name', ['document_embeddings', 'bairros_risco_desastre', 'query_cache']);
  
  if (tablesError) {
    console.log('Erro ao verificar tabelas:', tablesError.message);
  } else {
    console.log('Tabelas encontradas:', tables?.map(t => t.table_name).join(', ') || 'nenhuma');
  }
  
  // Verificar se podemos criar a tabela document_embeddings
  console.log('\n🔧 Tentando criar tabela document_embeddings...');
  
  // Como não podemos executar DDL diretamente, vamos verificar e sugerir
  const { count, error: checkError } = await supabase
    .from('document_embeddings')
    .select('*', { count: 'exact', head: true });
  
  if (checkError && checkError.message.includes('does not exist')) {
    console.log('❌ Tabela document_embeddings não existe');
    console.log('📋 Execute o seguinte SQL no Dashboard:\n');
    
    const createTableSQL = `
-- Criar tabela document_embeddings
CREATE TABLE IF NOT EXISTS document_embeddings (
  id SERIAL PRIMARY KEY,
  document_id UUID REFERENCES documents(id) ON DELETE CASCADE,
  content_chunk TEXT NOT NULL,
  embedding vector(1536),
  chunk_metadata JSONB DEFAULT NULL,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Criar índices
CREATE INDEX IF NOT EXISTS idx_document_embeddings_document_id 
ON document_embeddings(document_id);

CREATE INDEX IF NOT EXISTS idx_document_embeddings_metadata 
ON document_embeddings USING gin(chunk_metadata);`;
    
    console.log(createTableSQL);
  } else {
    console.log('✅ Tabela document_embeddings já existe');
  }
  
  // Verificar funções
  console.log('\n🔍 Verificando funções...');
  
  try {
    // Testar se match_documents existe
    const { error: funcError } = await supabase.rpc('match_documents', {
      query_embedding: Array(1536).fill(0),
      match_count: 1,
      document_ids: []
    });
    
    if (funcError) {
      console.log('❌ Função match_documents não existe ou tem erro:', funcError.message);
      console.log('\n📋 Copie e execute EXECUTE_THIS_SQL.sql no Dashboard');
    } else {
      console.log('✅ Função match_documents existe');
    }
  } catch (e) {
    console.log('❌ Erro ao verificar função:', e.message);
  }
  
  // Verificar se há documentos processados
  console.log('\n📄 Verificando documentos...');
  
  const { count: docCount } = await supabase
    .from('documents')
    .select('*', { count: 'exact', head: true });
  
  console.log(`Total de documentos: ${docCount || 0}`);
  
  // Limpar cache
  console.log('\n🧹 Limpando cache de queries...');
  
  const { error: cacheError } = await supabase
    .from('query_cache')
    .delete()
    .gte('id', 0);
  
  if (cacheError) {
    console.log('⚠️ Erro ao limpar cache:', cacheError.message);
  } else {
    console.log('✅ Cache limpo com sucesso');
  }
  
  console.log('\n📋 PRÓXIMOS PASSOS:');
  console.log('1. Se a tabela document_embeddings não existe:');
  console.log('   - Copie o SQL acima e execute no Dashboard');
  console.log('   - Ou execute o arquivo EXECUTE_THIS_SQL.sql completo');
  console.log('\n2. Deploy das Edge Functions:');
  console.log('   npx supabase functions deploy process-document --project-ref ngrqwmvuhvjkeohesbxs');
  console.log('   npx supabase functions deploy enhanced-vector-search --project-ref ngrqwmvuhvjkeohesbxs');
  console.log('\n3. Reprocessar documentos:');
  console.log('   npx tsx scripts/reprocess-knowledge-base.ts');
}

createTables().catch(console.error);