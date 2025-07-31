// Script de diagnóstico para identificar problemas no sistema RAG
// Execute com: npx ts-node scripts/diagnose-rag-issues.ts

import { createClient } from '@supabase/supabase-js';
import * as dotenv from 'dotenv';

// Carrega variáveis de ambiente
dotenv.config({ path: '.env.local' });

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY!;

if (!supabaseUrl || !supabaseServiceKey) {
  console.error('❌ Variáveis de ambiente não configuradas');
  process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseServiceKey);

// Queries de teste
const testQueries = [
  "Qual artigo da LUOS trata da Certificação em Sustentabilidade Ambiental?",
  "Qual a regra para empreendimentos do 4º distrito?",
  "Quais bairros têm risco de inundação?"
];

async function checkDatabaseStructure() {
  console.log('🔍 Verificando estrutura do banco de dados...\n');
  
  // Verifica se a coluna chunk_metadata existe
  const { data: columns, error: columnsError } = await supabase
    .rpc('get_table_columns', { table_name: 'document_embeddings' })
    .single();
  
  if (columnsError) {
    // Tenta query alternativa
    const { data, error } = await supabase
      .from('document_embeddings')
      .select('*')
      .limit(1);
    
    if (error) {
      console.error('❌ Erro ao acessar tabela document_embeddings:', error.message);
    } else if (data && data.length > 0) {
      const hasChunkMetadata = 'chunk_metadata' in data[0];
      console.log(`📊 Coluna chunk_metadata: ${hasChunkMetadata ? '✅ Existe' : '❌ Não existe'}`);
      
      if (hasChunkMetadata && data[0].chunk_metadata) {
        console.log('   Exemplo de metadados:', JSON.stringify(data[0].chunk_metadata, null, 2));
      }
    }
  }
  
  // Verifica tabela de riscos
  const { count: riskCount, error: riskError } = await supabase
    .from('bairros_risco_desastre')
    .select('*', { count: 'exact', head: true });
  
  if (riskError) {
    console.log('❌ Tabela bairros_risco_desastre não existe ou está inacessível');
  } else {
    console.log(`✅ Tabela bairros_risco_desastre: ${riskCount || 0} registros`);
  }
  
  console.log('');
}

async function checkDocuments() {
  console.log('📄 Verificando documentos processados...\n');
  
  const { data: documents, error } = await supabase
    .from('documents')
    .select('id, title, file_name, is_processed, created_at')
    .order('created_at', { ascending: false });
  
  if (error) {
    console.error('❌ Erro ao buscar documentos:', error.message);
    return;
  }
  
  console.log(`Total de documentos: ${documents?.length || 0}`);
  console.log(`Processados: ${documents?.filter(d => d.is_processed).length || 0}`);
  
  if (documents && documents.length > 0) {
    console.log('\nDocumentos mais recentes:');
    documents.slice(0, 5).forEach(doc => {
      console.log(`  - ${doc.title} (${doc.is_processed ? '✅' : '❌'} processado)`);
    });
  }
  
  console.log('');
}

async function checkEmbeddings() {
  console.log('🧩 Verificando embeddings e chunks...\n');
  
  // Total de embeddings
  const { count: totalCount } = await supabase
    .from('document_embeddings')
    .select('*', { count: 'exact', head: true });
  
  console.log(`Total de embeddings: ${totalCount || 0}`);
  
  // Embeddings com metadados hierárquicos
  const { count: hierarchicalCount } = await supabase
    .from('document_embeddings')
    .select('*', { count: 'exact', head: true })
    .not('chunk_metadata', 'is', null);
  
  console.log(`Embeddings hierárquicos: ${hierarchicalCount || 0}`);
  
  // Amostra de chunks com certificação
  const { data: certChunks } = await supabase
    .from('document_embeddings')
    .select('content_chunk, chunk_metadata')
    .eq('chunk_metadata->hasCertification', true)
    .limit(3);
  
  if (certChunks && certChunks.length > 0) {
    console.log('\n✅ Chunks com certificação encontrados:');
    certChunks.forEach((chunk, idx) => {
      console.log(`  ${idx + 1}. ${chunk.content_chunk.substring(0, 100)}...`);
      if (chunk.chunk_metadata) {
        console.log(`     Metadados:`, chunk.chunk_metadata);
      }
    });
  } else {
    console.log('❌ Nenhum chunk com certificação encontrado');
  }
  
  // Amostra de chunks do 4º distrito
  const { data: districtChunks } = await supabase
    .from('document_embeddings')
    .select('content_chunk, chunk_metadata')
    .eq('chunk_metadata->has4thDistrict', true)
    .limit(3);
  
  if (districtChunks && districtChunks.length > 0) {
    console.log('\n✅ Chunks do 4º distrito encontrados:');
    districtChunks.forEach((chunk, idx) => {
      console.log(`  ${idx + 1}. ${chunk.content_chunk.substring(0, 100)}...`);
    });
  } else {
    console.log('❌ Nenhum chunk do 4º distrito encontrado');
  }
  
  console.log('');
}

async function checkQueryCache() {
  console.log('💾 Verificando cache de queries...\n');
  
  const { data: cacheEntries, error } = await supabase
    .from('query_cache')
    .select('query, created_at, hit_count')
    .order('created_at', { ascending: false })
    .limit(10);
  
  if (error) {
    console.log('❌ Tabela query_cache não existe ou está inacessível');
  } else {
    console.log(`Entradas no cache: ${cacheEntries?.length || 0}`);
    if (cacheEntries && cacheEntries.length > 0) {
      console.log('\nQueries mais recentes no cache:');
      cacheEntries.slice(0, 5).forEach(entry => {
        console.log(`  - "${entry.query.substring(0, 50)}..." (hits: ${entry.hit_count})`);
      });
    }
  }
  
  console.log('');
}

async function testSearchFunctions() {
  console.log('🔎 Testando funções de busca...\n');
  
  for (const query of testQueries) {
    console.log(`\nTestando: "${query}"`);
    
    try {
      // Testa busca vetorial básica
      const { data: embedding } = await supabase.functions.invoke('generate-text-embedding', {
        body: { text: query }
      });
      
      if (!embedding || !embedding.embedding) {
        console.log('  ❌ Falha ao gerar embedding');
        continue;
      }
      
      console.log('  ✅ Embedding gerado');
      
      // Testa busca hierárquica (se existir)
      const { data: matches, error } = await supabase
        .rpc('match_hierarchical_documents', {
          query_embedding: embedding.embedding,
          match_count: 5,
          document_ids: [],
          query_text: query
        });
      
      if (error) {
        console.log('  ⚠️ Função match_hierarchical_documents não disponível, tentando match_documents...');
        
        // Fallback para função padrão
        const { data: standardMatches, error: standardError } = await supabase
          .rpc('match_documents', {
            query_embedding: embedding.embedding,
            match_count: 5,
            document_ids: []
          });
        
        if (standardError) {
          console.log('  ❌ Erro na busca:', standardError.message);
        } else {
          console.log(`  ✅ ${standardMatches?.length || 0} resultados encontrados (busca padrão)`);
        }
      } else {
        console.log(`  ✅ ${matches?.length || 0} resultados encontrados (busca hierárquica)`);
        
        if (matches && matches.length > 0) {
          const topMatch = matches[0];
          console.log(`     Top match: ${topMatch.content_chunk?.substring(0, 80)}...`);
          console.log(`     Score: ${topMatch.similarity?.toFixed(3)}`);
          if (topMatch.chunk_metadata) {
            console.log(`     Metadados:`, topMatch.chunk_metadata);
          }
        }
      }
      
    } catch (error) {
      console.log('  ❌ Erro:', error instanceof Error ? error.message : String(error));
    }
  }
  
  console.log('');
}

async function checkEdgeFunctions() {
  console.log('⚡ Verificando Edge Functions...\n');
  
  const functions = [
    'process-document',
    'enhanced-vector-search',
    'contextual-scoring',
    'response-synthesizer',
    'chat'
  ];
  
  for (const fn of functions) {
    try {
      // Tenta invocar com payload vazio para verificar se existe
      const { error } = await supabase.functions.invoke(fn, {
        body: { test: true }
      });
      
      if (error) {
        console.log(`  ❌ ${fn}: ${error.message}`);
      } else {
        console.log(`  ✅ ${fn}: Disponível`);
      }
    } catch (e) {
      console.log(`  ❌ ${fn}: Não deployada ou erro de rede`);
    }
  }
  
  console.log('');
}

async function runDiagnostics() {
  console.log('🏥 Diagnóstico do Sistema RAG\n');
  console.log('================================\n');
  
  await checkDatabaseStructure();
  await checkDocuments();
  await checkEmbeddings();
  await checkQueryCache();
  await checkEdgeFunctions();
  await testSearchFunctions();
  
  console.log('\n📋 Recomendações:\n');
  
  console.log('1. Se as tabelas/funções não existem:');
  console.log('   npx supabase db push');
  console.log('');
  
  console.log('2. Se não há documentos ou embeddings:');
  console.log('   npx ts-node scripts/reprocess-knowledge-base.ts');
  console.log('');
  
  console.log('3. Se as Edge Functions não estão disponíveis:');
  console.log('   npx supabase functions deploy --no-verify-jwt');
  console.log('');
  
  console.log('4. Para limpar cache:');
  console.log('   - Execute: DELETE FROM query_cache;');
  console.log('   - Ou defina TTL menor no código');
  console.log('');
  
  console.log('5. Se tudo parece OK mas queries falham:');
  console.log('   - Verifique logs do Supabase Dashboard');
  console.log('   - Teste queries diretamente no SQL Editor');
  console.log('   - Verifique se OpenAI API key está válida');
}

// Executa diagnóstico
runDiagnostics().catch(console.error);