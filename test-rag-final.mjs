import { createClient } from '@supabase/supabase-js';

const supabase = createClient(
  'https://ngrqwmvuhvjkeohesbxs.supabase.co',
  'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Im5ncnF3bXZ1aHZqa2VvaGVzYnhzIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc1MzYwOTAxNywiZXhwIjoyMDY5MTg1MDE3fQ.7jVZP70RAjpfFPfehZt5Gr3vSxn8DZ3YyPJNjCwZXEo'
);

async function testRAG() {
  console.log('🧪 Testando Sistema RAG\n');
  
  const queries = [
    "Qual artigo da LUOS trata da Certificação em Sustentabilidade Ambiental?",
    "Qual a regra para empreendimentos do 4º distrito?",
    "O que diz sobre altura de edificação?"
  ];
  
  for (const query of queries) {
    console.log(`\n📝 Query: "${query}"`);
    
    try {
      // 1. Gerar embedding
      const { data: embData, error: embError } = await supabase.functions
        .invoke('generate-text-embedding', {
          body: { text: query }
        });
      
      if (embError) {
        console.log('❌ Erro ao gerar embedding:', embError.message);
        continue;
      }
      
      console.log('✅ Embedding gerado');
      
      // 2. Buscar documentos similares
      const { data: matches, error: matchError } = await supabase
        .rpc('match_documents', {
          query_embedding: embData.embedding,
          match_count: 3,
          document_ids: []
        });
      
      if (matchError) {
        console.log('❌ Erro na busca:', matchError.message);
        
        // Tentar busca hierárquica
        const { data: hierMatches, error: hierError } = await supabase
          .rpc('match_hierarchical_documents', {
            query_embedding: embData.embedding,
            match_count: 3,
            document_ids: [],
            query_text: query
          });
        
        if (hierError) {
          console.log('❌ Busca hierárquica também falhou:', hierError.message);
        } else if (hierMatches && hierMatches.length > 0) {
          console.log('✅ Busca hierárquica encontrou:', hierMatches.length, 'resultados');
          
          const topMatch = hierMatches[0];
          console.log('\n🎯 Melhor resultado:');
          console.log('Conteúdo:', topMatch.content_chunk.substring(0, 150) + '...');
          console.log('Score:', topMatch.boosted_score?.toFixed(3) || topMatch.similarity?.toFixed(3));
          
          if (topMatch.chunk_metadata) {
            console.log('Metadados:', {
              tipo: topMatch.chunk_metadata.type,
              artigo: topMatch.chunk_metadata.articleNumber,
              inciso: topMatch.chunk_metadata.incisoNumber,
              certificação: topMatch.chunk_metadata.hasCertification,
              '4º distrito': topMatch.chunk_metadata.has4thDistrict
            });
          }
        }
      } else if (matches && matches.length > 0) {
        console.log('✅ Busca encontrou:', matches.length, 'resultados');
        
        const topMatch = matches[0];
        console.log('\n🎯 Melhor resultado:');
        console.log('Conteúdo:', topMatch.content_chunk.substring(0, 150) + '...');
        console.log('Score:', topMatch.similarity?.toFixed(3));
        
        if (topMatch.chunk_metadata) {
          console.log('Metadados:', topMatch.chunk_metadata);
        }
      }
      
    } catch (error) {
      console.log('❌ Erro geral:', error.message);
    }
  }
  
  // Verificar chunks existentes
  console.log('\n\n📊 Verificando chunks no banco:');
  
  const { data: chunks, count } = await supabase
    .from('document_embeddings')
    .select('content_chunk, chunk_metadata', { count: 'exact' })
    .not('chunk_metadata', 'is', null)
    .limit(5);
  
  console.log(`Total de chunks com metadados: ${count || 0}`);
  
  if (chunks && chunks.length > 0) {
    console.log('\nExemplos de chunks:');
    chunks.forEach((chunk, idx) => {
      console.log(`\n${idx + 1}. ${chunk.content_chunk.substring(0, 80)}...`);
      console.log('   Metadados:', chunk.chunk_metadata);
    });
  }
}

testRAG().catch(console.error);