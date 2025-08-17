import { createClient } from '@supabase/supabase-js';
import OpenAI from 'openai';

// Configuração
const supabaseUrl = 'https://ngrqwmvuhvjkeohesbxs.supabase.co';
const supabaseKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Im5ncnF3bXZ1aHZqa2VvaGVzYnhzIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc1MzYwOTAxNywiZXhwIjoyMDY5MTg1MDE3fQ.7jVZP70RAjpfFPfehZt5Gr3vSxn8DZ3YyPJNjCwZXEo';

const supabase = createClient(supabaseUrl, supabaseKey);

const openai = new OpenAI({
  apiKey: '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'
});

// Gerar embedding
async function generateEmbedding(text) {
  try {
    const response = await openai.embeddings.create({
      model: 'text-embedding-ada-002',
      input: text.substring(0, 8000)
    });
    return response.data[0].embedding;
  } catch (error) {
    console.error('Erro ao gerar embedding:', error.message);
    return null;
  }
}

async function processDocuments() {
  console.log('🚀 PROCESSANDO DOCUMENTOS COM EMBEDDINGS\n');
  console.log('=' .repeat(50));
  
  // 1. Buscar document_sections que mencionam artigos importantes
  console.log('\n📚 Buscando artigos na base de conhecimento...');
  
  const articlesToFind = [
    { number: 1, pattern: 'Art. 1' },
    { number: 3, pattern: 'Art. 3' },
    { number: 75, pattern: 'Art. 75' },
    { number: 81, pattern: 'Art. 81' },
    { number: 119, pattern: 'Art. 119' },
    { number: 192, pattern: 'Art. 192' }
  ];
  
  let processedCount = 0;
  
  for (const article of articlesToFind) {
    console.log(`\n🔍 Buscando ${article.pattern}...`);
    
    // Buscar em document_sections
    const { data: sections } = await supabase
      .from('document_sections')
      .select('id, content')
      .or(`content.ilike.%${article.pattern}%,content.ilike.%Artigo ${article.number}%`)
      .limit(3);
    
    if (sections && sections.length > 0) {
      console.log(`  ✅ Encontrados ${sections.length} sections`);
      
      for (const section of sections) {
        // Extrair o artigo do texto
        const articlePattern = new RegExp(
          `Art\\.\\s*${article.number}[º°]?\\s*[-–.]?\\s*(.*?)(?=Art\\.\\s*\\d+|$)`,
          'is'
        );
        
        const match = articlePattern.exec(section.content);
        if (match) {
          const articleText = match[0].trim();
          console.log(`  📝 Artigo extraído: ${articleText.substring(0, 100)}...`);
          
          // Gerar embedding
          console.log('  🔄 Gerando embedding...');
          const embedding = await generateEmbedding(articleText);
          
          if (embedding) {
            // Atualizar section com embedding
            const { error } = await supabase
              .from('document_sections')
              .update({ 
                embedding,
                metadata: { 
                  ...section.metadata,
                  has_article: article.number,
                  processed_with_embeddings: true
                }
              })
              .eq('id', section.id);
            
            if (!error) {
              console.log('  ✅ Embedding salvo!');
              processedCount++;
            } else {
              console.log('  ❌ Erro ao salvar:', error.message);
            }
          }
          
          break; // Processar apenas o primeiro match
        }
      }
    } else {
      console.log(`  ⚠️  ${article.pattern} não encontrado`);
    }
  }
  
  // 2. Processar informações sobre enchentes
  console.log('\n🌊 Processando informação sobre enchentes...');
  
  const { data: floodSections } = await supabase
    .from('document_sections')
    .select('id, content')
    .or('content.ilike.%25 bairros%,content.ilike.%protegidos%,content.ilike.%enchente%')
    .limit(5);
  
  if (floodSections && floodSections.length > 0) {
    console.log(`✅ Encontradas ${floodSections.length} sections sobre enchentes`);
    
    for (const section of floodSections) {
      if (section.content.includes('25 bairros')) {
        console.log('🔄 Gerando embedding para proteção contra enchentes...');
        const embedding = await generateEmbedding(section.content);
        
        if (embedding) {
          await supabase
            .from('document_sections')
            .update({ 
              embedding,
              metadata: { 
                topic: 'flood_protection',
                processed_with_embeddings: true
              }
            })
            .eq('id', section.id);
          
          console.log('✅ Embedding salvo!');
          processedCount++;
          break;
        }
      }
    }
  }
  
  // 3. Processar dados de bairros (Alberta dos Morros)
  console.log('\n🏘️ Processando dados de bairros...');
  
  const bairros = ['Alberta dos Morros', 'Três Figueiras', 'Centro Histórico', 'Petrópolis', 'Cavalhada'];
  
  for (const bairro of bairros) {
    const { data: bairroSections } = await supabase
      .from('document_sections')
      .select('id, content')
      .ilike('content', `%${bairro}%`)
      .limit(2);
    
    if (bairroSections && bairroSections.length > 0) {
      console.log(`✅ ${bairro}: ${bairroSections.length} sections encontradas`);
      
      for (const section of bairroSections) {
        // Verificar se contém dados de altura ou coeficiente
        if (section.content.match(/altura|coeficiente|ZOT-\d+/i)) {
          console.log(`  🔄 Gerando embedding para ${bairro}...`);
          const embedding = await generateEmbedding(section.content);
          
          if (embedding) {
            await supabase
              .from('document_sections')
              .update({ 
                embedding,
                metadata: { 
                  bairro: bairro,
                  has_regime_data: true,
                  processed_with_embeddings: true
                }
              })
              .eq('id', section.id);
            
            console.log('  ✅ Embedding salvo!');
            processedCount++;
            break;
          }
        }
      }
    }
  }
  
  // 4. Criar função de busca por similaridade
  console.log('\n🔧 Verificando função de busca semântica...');
  
  // Testar busca semântica
  const testQuery = 'altura máxima Alberta dos Morros';
  console.log(`\n🧪 Testando busca semântica: "${testQuery}"`);
  
  const queryEmbedding = await generateEmbedding(testQuery);
  if (queryEmbedding) {
    // Buscar por similaridade
    const { data: similarDocs } = await supabase.rpc('match_documents', {
      query_embedding: queryEmbedding,
      match_threshold: 0.7,
      match_count: 3
    }).select('*');
    
    if (similarDocs && similarDocs.length > 0) {
      console.log(`✅ Encontrados ${similarDocs.length} documentos similares`);
      similarDocs.forEach((doc, i) => {
        console.log(`  ${i+1}. Similaridade: ${doc.similarity?.toFixed(3) || 'N/A'}`);
        console.log(`     ${doc.content?.substring(0, 100) || 'Sem conteúdo'}...`);
      });
    } else {
      console.log('⚠️  Nenhum documento similar encontrado (função match_documents pode não existir)');
    }
  }
  
  // Resumo final
  console.log('\n' + '=' .repeat(50));
  console.log('📊 RESUMO:');
  console.log(`✅ Documentos processados com embeddings: ${processedCount}`);
  
  if (processedCount > 0) {
    console.log('\n🎉 EMBEDDINGS GERADOS COM SUCESSO!');
    console.log('Sistema RAG agora tem capacidade de busca semântica.');
  } else {
    console.log('\n⚠️  Nenhum documento foi processado com embeddings.');
  }
}

// Executar
processDocuments().catch(console.error);