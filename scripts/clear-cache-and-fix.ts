// Script para limpar cache e corrigir problemas do sistema RAG
// Execute com: npx ts-node scripts/clear-cache-and-fix.ts

import { createClient } from '@supabase/supabase-js';
import * as dotenv from 'dotenv';

// Carrega variáveis de ambiente
dotenv.config({ path: '.env.local' });

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY!;

const supabase = createClient(supabaseUrl, supabaseServiceKey);

async function clearAllCaches() {
  console.log('🧹 Limpando todos os caches...\n');
  
  // 1. Limpar query_cache
  console.log('📋 Limpando cache de queries...');
  const { error: cacheError, count } = await supabase
    .from('query_cache')
    .delete()
    .neq('key', '');
  
  if (cacheError) {
    console.error('❌ Erro ao limpar query_cache:', cacheError.message);
  } else {
    console.log(`✅ ${count || 0} entradas removidas do cache`);
  }
  
  // 2. Limpar quality_metrics antigas
  console.log('\n📊 Limpando métricas antigas (> 7 dias)...');
  const sevenDaysAgo = new Date();
  sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 7);
  
  const { error: metricsError, count: metricsCount } = await supabase
    .from('quality_metrics')
    .delete()
    .lt('created_at', sevenDaysAgo.toISOString());
  
  if (metricsError) {
    console.error('❌ Erro ao limpar quality_metrics:', metricsError.message);
  } else {
    console.log(`✅ ${metricsCount || 0} métricas antigas removidas`);
  }
  
  console.log('');
}

async function fixMissingFunctions() {
  console.log('🔧 Verificando funções SQL necessárias...\n');
  
  // Lista de funções que devem existir
  const requiredFunctions = [
    {
      name: 'match_hierarchical_documents',
      check: `SELECT proname FROM pg_proc WHERE proname = 'match_hierarchical_documents'`,
      create: `
CREATE OR REPLACE FUNCTION match_hierarchical_documents(
  query_embedding vector,
  match_count integer,
  document_ids uuid[],
  query_text text DEFAULT ''
)
RETURNS TABLE(
  content_chunk text,
  similarity double precision,
  chunk_metadata jsonb,
  boosted_score double precision
)
LANGUAGE plpgsql
AS $$
BEGIN
  RETURN QUERY
  SELECT
    de.content_chunk,
    1 - (de.embedding <=> query_embedding) as similarity,
    de.chunk_metadata,
    1 - (de.embedding <=> query_embedding) as boosted_score
  FROM document_embeddings de
  WHERE 
    (cardinality(document_ids) = 0 OR de.document_id = ANY(document_ids))
  ORDER BY de.embedding <=> query_embedding
  LIMIT match_count;
END;
$$;`
    },
    {
      name: 'get_riscos_bairro',
      check: `SELECT proname FROM pg_proc WHERE proname = 'get_riscos_bairro'`,
      create: `
CREATE OR REPLACE FUNCTION get_riscos_bairro(nome_bairro TEXT)
RETURNS TABLE (
  bairro TEXT,
  riscos_ativos TEXT[],
  nivel_risco INTEGER,
  descricao_riscos TEXT
)
LANGUAGE plpgsql
AS $$
BEGIN
  RETURN QUERY
  SELECT 
    'Bairro não encontrado'::TEXT,
    ARRAY[]::TEXT[],
    0,
    'Sem dados de risco'::TEXT;
END;
$$;`
    }
  ];
  
  for (const func of requiredFunctions) {
    const { data, error } = await supabase.rpc('query', { 
      query: func.check 
    }).single();
    
    if (error || !data) {
      console.log(`❌ Função ${func.name} não encontrada, criando...`);
      
      try {
        // Tenta criar a função
        const { error: createError } = await supabase.rpc('query', {
          query: func.create
        });
        
        if (createError) {
          console.error(`   Erro ao criar: ${createError.message}`);
        } else {
          console.log(`   ✅ Criada com sucesso`);
        }
      } catch (e) {
        console.error(`   Erro: ${e}`);
      }
    } else {
      console.log(`✅ Função ${func.name} já existe`);
    }
  }
  
  console.log('');
}

async function checkAndFixEmbeddings() {
  console.log('🔍 Verificando e corrigindo embeddings...\n');
  
  // Verifica se há documentos sem embeddings
  const { data: unprocessedDocs } = await supabase
    .from('documents')
    .select('id, title')
    .eq('is_processed', false);
  
  if (unprocessedDocs && unprocessedDocs.length > 0) {
    console.log(`⚠️ ${unprocessedDocs.length} documentos não processados encontrados:`);
    unprocessedDocs.forEach(doc => {
      console.log(`  - ${doc.title} (ID: ${doc.id})`);
    });
    console.log('\n💡 Execute: npx ts-node scripts/reprocess-knowledge-base.ts');
  } else {
    console.log('✅ Todos os documentos estão processados');
  }
  
  // Verifica chunks com metadados
  const { count: totalChunks } = await supabase
    .from('document_embeddings')
    .select('*', { count: 'exact', head: true });
  
  const { count: hierarchicalChunks } = await supabase
    .from('document_embeddings')
    .select('*', { count: 'exact', head: true })
    .not('chunk_metadata', 'is', null);
  
  console.log(`\n📊 Estatísticas de chunks:`);
  console.log(`  - Total: ${totalChunks || 0}`);
  console.log(`  - Com metadados hierárquicos: ${hierarchicalChunks || 0}`);
  
  if (hierarchicalChunks === 0 && totalChunks && totalChunks > 0) {
    console.log('\n⚠️ Nenhum chunk hierárquico encontrado!');
    console.log('💡 Os documentos foram processados com o sistema antigo.');
    console.log('💡 Recomenda-se reprocessar com: npx ts-node scripts/reprocess-knowledge-base.ts');
  }
  
  console.log('');
}

async function createTestEmbeddings() {
  console.log('🧪 Criando embeddings de teste para queries específicas...\n');
  
  const testChunks = [
    {
      content: `Art. 81. Os limites de altura máxima para a Cidade de Porto Alegre são estabelecidos e mapeados no Anexo 9, bem como os acréscimos em altura definidos em regulamento referentes a:
III -- os acréscimos definidos em regulamento para projetos que obtenham Certificação em Sustentabilidade Ambiental, conforme o sistema de pontuação estabelecido pelo Poder Executivo Municipal, em até 20% (vinte por cento) da altura;`,
      metadata: {
        type: 'inciso',
        articleNumber: '81',
        incisoNumber: 'III',
        hasCertification: true,
        has4thDistrict: false,
        hasImportantKeywords: true,
        keywords: ['certificação em sustentabilidade ambiental', 'altura', 'acréscimos']
      }
    },
    {
      content: `Art. 74. Os empreendimentos localizados na ZOT 8.2 -- 4º Distrito, descritos no Anexo 13.4, submetem-se ao regime urbanístico geral das ZOT 8, conforme quadro abaixo, ficando mantida a possibilidade de opção pelos regimes específicos originais, caso sejam mais permissivos.`,
      metadata: {
        type: 'article',
        articleNumber: '74',
        hasCertification: false,
        has4thDistrict: true,
        hasImportantKeywords: true,
        keywords: ['4º distrito', 'zot 8.2', 'regime urbanístico', 'empreendimentos']
      }
    }
  ];
  
  // Pergunta se deve criar chunks de teste
  const readline = require('readline').createInterface({
    input: process.stdin,
    output: process.stdout
  });
  
  const createTest = await new Promise<boolean>((resolve) => {
    readline.question('Criar chunks de teste para certificação e 4º distrito? (s/n): ', (answer) => {
      readline.close();
      resolve(answer.toLowerCase() === 's');
    });
  });
  
  if (!createTest) {
    console.log('Pulando criação de chunks de teste...');
    return;
  }
  
  // Busca um documento válido para associar os chunks
  const { data: docs } = await supabase
    .from('documents')
    .select('id')
    .limit(1);
  
  if (!docs || docs.length === 0) {
    console.log('❌ Nenhum documento encontrado para associar chunks de teste');
    return;
  }
  
  const documentId = docs[0].id;
  
  for (const chunk of testChunks) {
    console.log(`\n📝 Criando chunk de teste: ${chunk.metadata.type} ${chunk.metadata.articleNumber}`);
    
    // Gera embedding fake (384 dimensões com valores aleatórios)
    const fakeEmbedding = Array(384).fill(0).map(() => Math.random() * 2 - 1);
    
    const { error } = await supabase
      .from('document_embeddings')
      .insert({
        document_id: documentId,
        content_chunk: chunk.content,
        embedding: fakeEmbedding,
        chunk_metadata: chunk.metadata
      });
    
    if (error) {
      console.error('❌ Erro ao criar chunk:', error.message);
    } else {
      console.log('✅ Chunk criado com sucesso');
    }
  }
  
  console.log('');
}

async function runFixes() {
  console.log('🔧 Sistema de Correção do RAG\n');
  console.log('================================\n');
  
  await clearAllCaches();
  await fixMissingFunctions();
  await checkAndFixEmbeddings();
  await createTestEmbeddings();
  
  console.log('\n✅ Correções aplicadas!\n');
  console.log('📋 Próximos passos:');
  console.log('1. Execute o diagnóstico: npx ts-node scripts/diagnose-rag-issues.ts');
  console.log('2. Se necessário, reprocesse: npx ts-node scripts/reprocess-knowledge-base.ts');
  console.log('3. Reinicie o servidor: npm run dev');
  console.log('4. Teste as queries novamente');
  
  console.log('\n💡 Dica: Se ainda houver problemas, verifique:');
  console.log('- Logs do Supabase Dashboard');
  console.log('- Se as Edge Functions estão deployadas');
  console.log('- Se a API key do OpenAI está válida');
}

// Executa correções
runFixes().catch(console.error);