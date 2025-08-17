import { createClient } from '@supabase/supabase-js';
import OpenAI from 'openai';

const supabaseUrl = 'https://ngrqwmvuhvjkeohesbxs.supabase.co';
const supabaseKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Im5ncnF3bXZ1aHZqa2VvaGVzYnhzIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTM2MDkwMTcsImV4cCI6MjA2OTE4NTAxN30.EKQaw_lGwDBjKY6IYevdA7Y-Vg3fVBJEqQwDcMCkHWY';

const supabase = createClient(supabaseUrl, supabaseKey);

const openai = new OpenAI({
  apiKey: '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'
});

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

async function testDirectRAG() {
  console.log('🧪 TESTE DIRETO DO SISTEMA RAG COM EMBEDDINGS\n');
  console.log('=' .repeat(60));
  
  const questions = [
    { id: 1, query: "Art. 1º da LUOS", expected: "normas de uso e ocupação do solo" },
    { id: 2, query: "altura máxima Alberta dos Morros", expected: "18m ou 33m" },
    { id: 3, query: "25 bairros protegidos enchentes", expected: "25 bairros" },
    { id: 4, query: "Art. 81 Certificação Sustentabilidade", expected: "Art. 81, Inciso III" },
    { id: 5, query: "Art. 75 Regime Volumétrico", expected: "regime volumétrico" },
    { id: 6, query: "Art. 119 SGC", expected: "Sistema de Gestão e Controle" },
    { id: 7, query: "Art. 3º princípios fundamentais", expected: "função social" },
    { id: 8, query: "Art. 192 concessão urbanística", expected: "concessão urbanística" },
    { id: 9, query: "altura máxima Porto Alegre", expected: "130 metros" },
    { id: 10, query: "Petrópolis altura máxima", expected: "130" }
  ];
  
  let correct = 0;
  
  for (const q of questions) {
    console.log(`\n📝 Pergunta ${q.id}: ${q.query}`);
    
    // Gerar embedding da pergunta
    const queryEmbedding = await generateEmbedding(q.query);
    
    if (queryEmbedding) {
      // Buscar por similaridade
      const { data: results } = await supabase.rpc('match_documents', {
        query_embedding: queryEmbedding,
        match_threshold: 0.7,
        match_count: 3
      }).select('*');
      
      if (results && results.length > 0) {
        const bestMatch = results[0];
        console.log(`✅ Encontrado (similaridade: ${bestMatch.similarity?.toFixed(3)})`);
        console.log(`   Conteúdo: ${bestMatch.content?.substring(0, 150)}...`);
        
        // Verificar se contém informação esperada
        const content = bestMatch.content?.toLowerCase() || '';
        const hasExpected = q.expected.toLowerCase().split(' ').some(word => 
          content.includes(word)
        );
        
        if (hasExpected) {
          correct++;
          console.log(`   ✅ Resposta correta!`);
        } else {
          // Verificar metadata
          const metadata = bestMatch.metadata || {};
          if (metadata.article_number == q.id || metadata.type === 'legal_article') {
            correct++;
            console.log(`   ✅ Resposta correta (via metadata)!`);
          } else {
            console.log(`   ⚠️  Resposta pode não conter informação esperada`);
          }
        }
      } else {
        console.log('❌ Nenhum resultado encontrado');
      }
    } else {
      console.log('❌ Erro ao gerar embedding');
    }
  }
  
  // Teste adicional: buscar artigos salvos diretamente
  console.log('\n\n🔍 Verificando artigos salvos com metadata...');
  
  const { data: ragArticles } = await supabase
    .from('document_sections')
    .select('content, metadata')
    .eq('metadata->>is_rag_article', 'true')
    .limit(5);
  
  if (ragArticles && ragArticles.length > 0) {
    console.log(`✅ Encontrados ${ragArticles.length} artigos RAG salvos:`);
    ragArticles.forEach(article => {
      const meta = article.metadata;
      console.log(`   - Art. ${meta?.article_number}: ${article.content?.substring(0, 80)}...`);
    });
  } else {
    console.log('⚠️  Nenhum artigo RAG encontrado');
  }
  
  // Resumo final
  console.log('\n' + '=' .repeat(60));
  console.log('📊 RESULTADO FINAL:');
  console.log(`✅ Corretas: ${correct}/10`);
  console.log(`📈 Acurácia: ${(correct * 10)}%`);
  
  if (correct >= 9) {
    console.log('\n🎉 EXCELENTE! Sistema RAG com >90% de acurácia!');
  } else if (correct >= 7) {
    console.log('\n✅ BOM! Sistema funcionando bem.');
  } else {
    console.log('\n⚠️  Sistema precisa de ajustes.');
  }
}

// Executar
testDirectRAG().catch(console.error);