import { createClient } from '@supabase/supabase-js';

const supabase = createClient(
  'https://ngrqwmvuhvjkeohesbxs.supabase.co',
  'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Im5ncnF3bXZ1aHZqa2VvaGVzYnhzIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc1MzYwOTAxNywiZXhwIjoyMDY5MTg1MDE3fQ.7jVZP70RAjpfFPfehZt5Gr3vSxn8DZ3YyPJNjCwZXEo'
);

async function validateDocumentExtraction() {
  console.log('🔍 Validando extração de conteúdo dos documentos...\n');

  try {
    // Buscar todos os documentos processados
    const { data: documents, error: docsError } = await supabase
      .from('documents')
      .select('id, metadata, type, content, is_processed')
      .eq('is_processed', true)
      .order('created_at', { ascending: false });

    if (docsError) {
      console.error('❌ Erro ao buscar documentos:', docsError);
      return;
    }

    console.log(`📄 Encontrados ${documents.length} documentos processados:`);

    for (const doc of documents) {
      const title = doc.metadata?.title || doc.id;
      console.log(`\n📋 Analisando: ${title}`);
      console.log(`   Tipo: ${doc.type}`);
      console.log(`   Processado: ${doc.is_processed ? '✅' : '❌'}`);
      
      // Validar conteúdo extraído
      if (doc.content) {
        const contentLength = doc.content.length;
        console.log(`   📝 Conteúdo extraído: ${contentLength} caracteres`);
        
        // Mostrar preview do conteúdo
        const preview = doc.content.substring(0, 200).replace(/\n/g, ' ');
        console.log(`   📖 Preview: "${preview}..."`);
        
        // Verificar se contém elementos esperados baseado no tipo
        const content = doc.content.toLowerCase();
        let validationResults = [];
        
        if (title.includes('LUOS')) {
          validationResults = [
            { test: 'Contém artigos', result: content.includes('art.') },
            { test: 'Menciona certificação', result: content.includes('certificação') },
            { test: 'Menciona 4º distrito', result: content.includes('4º distrito') },
            { test: 'Menciona altura', result: content.includes('altura') }
          ];
        } else if (title.includes('PLANO_DIRETOR')) {
          validationResults = [
            { test: 'Contém artigos', result: content.includes('art.') },
            { test: 'Menciona desenvolvimento', result: content.includes('desenvolvimento') },
            { test: 'Menciona sustentável', result: content.includes('sustentável') },
            { test: 'Menciona mobilidade', result: content.includes('mobilidade') }
          ];
        } else if (title.includes('Objetivos')) {
          validationResults = [
            { test: 'Contém objetivos', result: content.includes('objetivo') },
            { test: 'Menciona sustentável', result: content.includes('sustentável') },
            { test: 'Menciona habitação', result: content.includes('habitação') },
            { test: 'Menciona 4º distrito', result: content.includes('4º distrito') }
          ];
        } else if (title.includes('QA')) {
          validationResults = [
            { test: 'Contém perguntas', result: content.includes('pergunta') },
            { test: 'Contém respostas', result: content.includes('resposta') },
            { test: 'Menciona certificação', result: content.includes('certificação') },
            { test: 'Menciona zoneamento', result: content.includes('zoneamento') }
          ];
        } else if (title.includes('Regime_Urbanistico') || title.includes('Excel') || title.includes('xlsx')) {
          validationResults = [
            { test: 'Contém dados estruturados', result: content.includes('planilha') || content.includes('|') },
            { test: 'Tem conteúdo mínimo', result: contentLength > 100 }
          ];
        }
        
        // Mostrar resultados de validação
        if (validationResults.length > 0) {
          console.log('   🔍 Validações de conteúdo:');
          validationResults.forEach(validation => {
            const icon = validation.result ? '✅' : '❌';
            console.log(`     ${icon} ${validation.test}`);
          });
        }
        
      } else {
        console.log('   ❌ Nenhum conteúdo extraído!');
      }

      // Verificar embeddings associados
      const { count: embeddingCount, error: embeddingError } = await supabase
        .from('document_embeddings')
        .select('*', { count: 'exact', head: true })
        .eq('document_id', doc.id);

      if (embeddingError) {
        console.log(`   ❌ Erro ao contar embeddings: ${embeddingError.message}`);
      } else {
        console.log(`   🔢 Embeddings gerados: ${embeddingCount || 0}`);
        
        if (embeddingCount > 0) {
          // Buscar um exemplo de embedding
          const { data: sampleEmbedding, error: sampleError } = await supabase
            .from('document_embeddings')
            .select('content_chunk, chunk_metadata, keywords, priority_score')
            .eq('document_id', doc.id)
            .limit(1);

          if (!sampleError && sampleEmbedding.length > 0) {
            const sample = sampleEmbedding[0];
            console.log(`   📝 Exemplo de chunk: "${sample.content_chunk.substring(0, 100)}..."`);
            
            if (sample.keywords && sample.keywords.length > 0) {
              console.log(`   🏷️ Palavras-chave: ${sample.keywords.join(', ')}`);
            }
            
            if (sample.priority_score) {
              console.log(`   ⭐ Prioridade: ${sample.priority_score}`);
            }
          }
        }
      }
    }

    // Teste de qualidade geral do conteúdo extraído
    console.log('\n📊 Resumo de qualidade da extração:');
    
    let totalDocuments = documents.length;
    let documentsWithContent = documents.filter(doc => doc.content && doc.content.length > 100).length;
    let documentsWithGoodContent = documents.filter(doc => doc.content && doc.content.length > 500).length;
    
    console.log(`📄 Total de documentos: ${totalDocuments}`);
    console.log(`✅ Com conteúdo válido (>100 chars): ${documentsWithContent}/${totalDocuments}`);
    console.log(`🌟 Com conteúdo rico (>500 chars): ${documentsWithGoodContent}/${totalDocuments}`);
    
    // Verificar total de embeddings
    const { count: totalEmbeddings, error: totalEmbeddingsError } = await supabase
      .from('document_embeddings')
      .select('*', { count: 'exact', head: true });

    if (!totalEmbeddingsError) {
      console.log(`🔢 Total de embeddings no sistema: ${totalEmbeddings || 0}`);
      
      const avgEmbeddingsPerDoc = totalDocuments > 0 ? Math.round((totalEmbeddings || 0) / totalDocuments) : 0;
      console.log(`📈 Média de embeddings por documento: ${avgEmbeddingsPerDoc}`);
    }

    console.log('\n✅ Validação de extração concluída!');

  } catch (error) {
    console.error('❌ Erro durante validação:', error);
  }
}

validateDocumentExtraction();