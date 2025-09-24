import { createClient } from '@supabase/supabase-js';

const supabase = createClient(
  'https://ngrqwmvuhvjkeohesbxs.supabase.co',
  'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Im5ncnF3bXZ1aHZqa2VvaGVzYnhzIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc1MzYwOTAxNywiZXhwIjoyMDY5MTg1MDE3fQ.7jVZP70RAjpfFPfehZt5Gr3vSxn8DZ3YyPJNjCwZXEo'
);

async function checkDatabaseSchema() {
  console.log('🔍 Verificando estrutura do banco de dados...\n');

  try {
    // Verificar estrutura da tabela documents
    console.log('📋 Estrutura da tabela documents:');
    const { data: documentsColumns, error: docsError } = await supabase
      .rpc('get_table_columns', { table_name: 'documents' })
      .single();

    if (docsError) {
      console.log('   Tentando buscar uma amostra para ver quais colunas existem...');
      
      const { data: sampleDoc, error: sampleError } = await supabase
        .from('documents')
        .select('*')
        .limit(1);

      if (sampleError) {
        console.error('❌ Erro ao buscar documento:', sampleError);
      } else if (sampleDoc && sampleDoc.length > 0) {
        console.log('✅ Colunas encontradas na tabela documents:');
        Object.keys(sampleDoc[0]).forEach(column => {
          console.log(`   - ${column}`);
        });
      }
    }

    // Verificar estrutura da tabela document_embeddings
    console.log('\n📊 Estrutura da tabela document_embeddings:');
    const { data: sampleEmbedding, error: embeddingError } = await supabase
      .from('document_embeddings')
      .select('*')
      .limit(1);

    if (embeddingError) {
      console.error('❌ Erro ao buscar embedding:', embeddingError);
    } else if (sampleEmbedding && sampleEmbedding.length > 0) {
      console.log('✅ Colunas encontradas na tabela document_embeddings:');
      Object.keys(sampleEmbedding[0]).forEach(column => {
        console.log(`   - ${column}`);
      });
    }

    // Verificar documentos existentes (com busca simplificada)
    console.log('\n📄 Documentos existentes:');
    const { data: documents, error: listError } = await supabase
      .from('documents')
      .select('id, metadata, type, is_processed')
      .limit(10);

    if (listError) {
      console.error('❌ Erro ao listar documentos:', listError);
    } else {
      console.log(`✅ Encontrados ${documents.length} documentos:`);
      documents.forEach((doc, index) => {
        const title = doc.metadata?.title || doc.id;
        console.log(`   ${index + 1}. ${title}`);
        console.log(`      Tipo: ${doc.type}`);
        console.log(`      Processado: ${doc.is_processed ? '✅' : '❌'}`);
      });
    }

    // Verificar embeddings existentes
    console.log('\n🔢 Embeddings existentes:');
    const { count: embeddingCount, error: countError } = await supabase
      .from('document_embeddings')
      .select('*', { count: 'exact', head: true });

    if (countError) {
      console.error('❌ Erro ao contar embeddings:', countError);
    } else {
      console.log(`✅ Total de embeddings: ${embeddingCount || 0}`);
    }

    // Testar a edge function process-document diretamente
    console.log('\n🧪 Testando Edge Function diretamente:');
    
    // Primeiro, vamos ver se existe algum documento não processado
    const { data: unprocessedDocs, error: unprocessedError } = await supabase
      .from('documents')
      .select('id, metadata')
      .eq('is_processed', false)
      .limit(1);

    if (unprocessedError) {
      console.error('❌ Erro ao buscar documentos não processados:', unprocessedError);
    } else if (unprocessedDocs && unprocessedDocs.length > 0) {
      const testDoc = unprocessedDocs[0];
      console.log(`📄 Testando processamento do documento: ${testDoc.metadata?.title || testDoc.id}`);
      
      const { data: processResult, error: processError } = await supabase.functions.invoke('process-document', {
        body: { 
          documentId: testDoc.id 
        }
      });

      if (processError) {
        console.error('❌ Erro no processamento:', processError);
      } else {
        console.log('✅ Processamento bem-sucedido:', processResult);
      }
    } else {
      console.log('📄 Nenhum documento não processado encontrado para testar');
    }

  } catch (error) {
    console.error('❌ Erro geral:', error);
  }
}

checkDatabaseSchema();