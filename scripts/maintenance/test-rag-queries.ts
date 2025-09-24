// Script para testar queries RAG específicas
// Execute com: npx tsx scripts/test-rag-queries.ts

import { createClient } from '@supabase/supabase-js';
import * as dotenv from 'dotenv';

dotenv.config({ path: '.env.local' });

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY!;
const openaiKey = process.env.OPENAI_API_KEY!;

if (!supabaseUrl || !supabaseServiceKey) {
  console.error('❌ Variáveis de ambiente não configuradas');
  process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseServiceKey);

// Queries de teste
const testQueries = [
  {
    query: "Qual artigo da LUOS trata da Certificação em Sustentabilidade Ambiental?",
    expectedKeywords: ["Art. 81", "III", "certificação", "sustentabilidade"]
  },
  {
    query: "Qual a regra para empreendimentos do 4º distrito?",
    expectedKeywords: ["Art. 74", "4º distrito", "empreendimentos"]
  },
  {
    query: "Quais bairros têm risco de inundação?",
    expectedKeywords: ["Navegantes", "Humaitá", "inundação", "risco"]
  }
];

// Função para gerar embedding
async function generateEmbedding(text: string): Promise<number[] | null> {
  if (!openaiKey) {
    console.log('⚠️ OpenAI key não configurada, pulando geração de embedding');
    return null;
  }

  try {
    const response = await fetch('https://api.openai.com/v1/embeddings', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${openaiKey}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        model: 'text-embedding-ada-002',
        input: text,
      }),
    });

    if (!response.ok) {
      console.error('❌ Erro ao gerar embedding:', response.statusText);
      return null;
    }

    const data = await response.json();
    return data.data[0].embedding;
  } catch (error) {
    console.error('❌ Erro ao gerar embedding:', error);
    return null;
  }
}

async function testQuery(queryInfo: typeof testQueries[0]) {
  console.log(`\n📝 Testando: "${queryInfo.query}"`);
  console.log('─'.repeat(80));
  
  // Tentar primeiro com embedding existente no cache
  const { data: cacheData } = await supabase
    .from('query_cache')
    .select('embedding')
    .eq('query', queryInfo.query)
    .single();
  
  let embedding = cacheData?.embedding;
  
  // Se não tem no cache, gerar novo
  if (!embedding) {
    console.log('⚙️ Gerando embedding...');
    embedding = await generateEmbedding(queryInfo.query);
    
    if (!embedding) {
      // Busca alternativa sem embedding
      console.log('🔍 Tentando busca por texto...');
      
      const { data: textResults } = await supabase
        .from('document_embeddings')
        .select('content_chunk, chunk_metadata')
        .or(`content_chunk.ilike.%${queryInfo.expectedKeywords[0]}%,content_chunk.ilike.%${queryInfo.expectedKeywords[1]}%`)
        .limit(5);
      
      if (textResults && textResults.length > 0) {
        console.log(`✅ ${textResults.length} resultados encontrados por busca textual`);
        
        for (let i = 0; i < Math.min(3, textResults.length); i++) {
          const result = textResults[i];
          console.log(`\n📄 Resultado ${i + 1}:`);
          console.log(`Texto: ${result.content_chunk.substring(0, 200)}...`);
          if (result.chunk_metadata) {
            console.log(`Metadados:`, result.chunk_metadata);
          }
        }
      } else {
        console.log('❌ Nenhum resultado encontrado');
      }
      
      return;
    }
  }
  
  // Busca vetorial com função hierárquica
  try {
    const { data: results, error } = await supabase
      .rpc('match_hierarchical_documents', {
        query_embedding: embedding,
        match_count: 5,
        query_text: queryInfo.query
      });
    
    if (error) {
      console.error('❌ Erro na busca hierárquica:', error.message);
      
      // Fallback para busca padrão
      const { data: standardResults, error: standardError } = await supabase
        .rpc('match_documents', {
          query_embedding: embedding,
          match_count: 5
        });
      
      if (standardError) {
        console.error('❌ Erro na busca padrão:', standardError.message);
        return;
      }
      
      if (standardResults && standardResults.length > 0) {
        console.log(`✅ ${standardResults.length} resultados encontrados (busca padrão)`);
        displayResults(standardResults, queryInfo.expectedKeywords);
      }
    } else if (results && results.length > 0) {
      console.log(`✅ ${results.length} resultados encontrados (busca hierárquica)`);
      displayResults(results, queryInfo.expectedKeywords);
    } else {
      console.log('❌ Nenhum resultado encontrado');
    }
  } catch (error) {
    console.error('❌ Erro na busca:', error);
  }
}

function displayResults(results: any[], expectedKeywords: string[]) {
  for (let i = 0; i < Math.min(3, results.length); i++) {
    const result = results[i];
    console.log(`\n📄 Resultado ${i + 1}:`);
    console.log(`Score: ${result.similarity?.toFixed(3) || result.boosted_score?.toFixed(3) || 'N/A'}`);
    console.log(`Texto: ${result.content_chunk.substring(0, 200)}...`);
    
    if (result.chunk_metadata) {
      console.log(`Metadados:`, result.chunk_metadata);
    }
    
    // Verificar keywords esperadas
    const foundKeywords = expectedKeywords.filter(kw => 
      result.content_chunk.toLowerCase().includes(kw.toLowerCase())
    );
    
    if (foundKeywords.length > 0) {
      console.log(`✅ Keywords encontradas: ${foundKeywords.join(', ')}`);
    } else {
      console.log(`⚠️ Nenhuma keyword esperada encontrada`);
    }
  }
}

async function checkSystemStatus() {
  console.log('🔍 Verificando status do sistema RAG\n');
  
  // Verificar chunks com metadados
  const { count: totalChunks } = await supabase
    .from('document_embeddings')
    .select('*', { count: 'exact', head: true });
  
  const { count: chunksWithMetadata } = await supabase
    .from('document_embeddings')
    .select('*', { count: 'exact', head: true })
    .not('chunk_metadata', 'is', null);
  
  const { count: certificationChunks } = await supabase
    .from('document_embeddings')
    .select('*', { count: 'exact', head: true })
    .eq('chunk_metadata->hasCertification', true);
  
  const { count: fourthDistrictChunks } = await supabase
    .from('document_embeddings')
    .select('*', { count: 'exact', head: true })
    .eq('chunk_metadata->has4thDistrict', true);
  
  console.log('📊 Status do Sistema:');
  console.log(`   Total de chunks: ${totalChunks || 0}`);
  console.log(`   Chunks com metadados: ${chunksWithMetadata || 0}`);
  console.log(`   Chunks com certificação: ${certificationChunks || 0}`);
  console.log(`   Chunks do 4º distrito: ${fourthDistrictChunks || 0}`);
  console.log('');
}

async function main() {
  console.log('🧪 Teste do Sistema RAG Otimizado\n');
  console.log('URL Supabase:', supabaseUrl);
  console.log('═'.repeat(80));
  
  await checkSystemStatus();
  
  console.log('🔎 Executando queries de teste...');
  console.log('═'.repeat(80));
  
  for (const queryInfo of testQueries) {
    await testQuery(queryInfo);
  }
  
  console.log('\n' + '═'.repeat(80));
  console.log('✅ Testes concluídos!\n');
  
  console.log('💡 Dicas:');
  console.log('1. Se os resultados não são específicos, verifique os metadados dos chunks');
  console.log('2. Se não há resultados, verifique se os embeddings foram gerados');
  console.log('3. Use o SQL Editor para queries diretas de debug');
}

main().catch(console.error);