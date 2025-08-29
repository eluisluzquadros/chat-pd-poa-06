import { createClient } from '@supabase/supabase-js';

const supabase = createClient(
  'https://ngrqwmvuhvjkeohesbxs.supabase.co',
  'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Im5ncnF3bXZ1aHZqa2VvaGVzYnhzIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc1MzYwOTAxNywiZXhwIjoyMDY5MTg1MDE3fQ.7jVZP70RAjpfFPfehZt5Gr3vSxn8DZ3YyPJNjCwZXEo'
);

async function testDocumentProcessing() {
  console.log('🧪 Testando processamento de documentos...\n');

  try {
    // Teste 1: Processar todos os documentos da knowledgebase
    console.log('📄 Teste 1: Processamento em lote da knowledgebase');
    
    const { data: batchResult, error: batchError } = await supabase.functions.invoke('process-document', {
      body: { 
        processFromFilesystem: true 
      }
    });

    if (batchError) {
      console.error('❌ Erro no processamento em lote:', batchError);
    } else {
      console.log('✅ Processamento em lote completado:');
      console.log(`  - Total de documentos: ${batchResult.summary?.total_documents || 0}`);
      console.log(`  - Processados: ${batchResult.summary?.processed || 0}`);
      console.log(`  - Total de chunks: ${batchResult.summary?.total_chunks || 0}`);
      
      // Mostra resultados detalhados
      console.log('\n📋 Resultados detalhados:');
      batchResult.results?.forEach((result, index) => {
        console.log(`  ${index + 1}. ${result.file || 'Unknown'}`);
        console.log(`     Status: ${result.status}`);
        console.log(`     Chunks: ${result.chunks_processed || result.chunks || 0}`);
        if (result.error) {
          console.log(`     Erro: ${result.error}`);
        }
      });
    }

    // Teste 2: Verificar documentos processados no banco
    console.log('\n📊 Teste 2: Verificando estado dos documentos no banco');
    
    const { data: documents, error: docsError } = await supabase
      .from('documents')
      .select('id, metadata, type, is_processed, processing_error')
      .order('created_at', { ascending: false });

    if (docsError) {
      console.error('❌ Erro ao buscar documentos:', docsError);
    } else {
      console.log(`✅ Encontrados ${documents.length} documentos:`);
      documents.forEach((doc, index) => {
        console.log(`  ${index + 1}. ${doc.metadata?.title || doc.id}`);
        console.log(`     Tipo: ${doc.type}`);
        console.log(`     Processado: ${doc.is_processed ? '✅' : '❌'}`);
        if (doc.processing_error) {
          console.log(`     Erro: ${doc.processing_error}`);
        }
      });
    }

    // Teste 3: Verificar embeddings gerados
    console.log('\n🔍 Teste 3: Verificando embeddings gerados');

    const { count: totalEmbeddings, error: embeddingsError } = await supabase
      .from('document_embeddings')
      .select('*', { count: 'exact', head: true });

    if (embeddingsError) {
      console.error('❌ Erro ao contar embeddings:', embeddingsError);
    } else {
      console.log(`✅ Total de embeddings no sistema: ${totalEmbeddings || 0}`);
    }

    // Teste 4: Verificar detalhes por documento
    console.log('\n📈 Teste 4: Estatísticas por documento');

    const { data: embeddingStats, error: statsError } = await supabase
      .from('document_embeddings')
      .select('document_id, documents!inner(metadata)')
      .order('document_id');

    if (statsError) {
      console.error('❌ Erro ao buscar estatísticas:', statsError);
    } else {
      // Agrupando por documento
      const documentStats = {};
      embeddingStats.forEach(embedding => {
        const docId = embedding.document_id;
        const title = embedding.documents?.metadata?.title || docId;
        
        if (!documentStats[docId]) {
          documentStats[docId] = {
            title,
            chunks: 0
          };
        }
        documentStats[docId].chunks++;
      });

      console.log('📊 Estatísticas por documento:');
      Object.values(documentStats).forEach((stats, index) => {
        console.log(`  ${index + 1}. ${stats.title}`);
        console.log(`     Chunks: ${stats.chunks}`);
      });
    }

    // Teste 5: Teste de busca simples
    console.log('\n🔎 Teste 5: Teste de busca simples');

    const testQueries = [
      'certificação sustentabilidade ambiental',
      '4º distrito',
      'altura edificações',
      'zoneamento urbano'
    ];

    for (const query of testQueries) {
      console.log(`\n🔍 Buscando: "${query}"`);
      
      const { data: searchResults, error: searchError } = await supabase
        .from('document_embeddings')
        .select('content_chunk, chunk_metadata')
        .textSearch('content_chunk', query)
        .limit(3);

      if (searchError) {
        console.log(`   ❌ Erro na busca: ${searchError.message}`);
      } else {
        console.log(`   ✅ Encontrados ${searchResults.length} resultados`);
        searchResults.forEach((result, index) => {
          console.log(`   ${index + 1}. ${result.content_chunk.substring(0, 100)}...`);
        });
      }
    }

    console.log('\n✅ Todos os testes concluídos!');

  } catch (error) {
    console.error('❌ Erro geral nos testes:', error);
  }
}

testDocumentProcessing();