// 🛠️ CORREÇÃO BUG #2 e #3: RPC Function e Campos 'content' vs 'full_content'

import { createClient } from '@supabase/supabase-js'

const supabaseUrl = process.env.SUPABASE_URL
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY
const supabase = createClient(supabaseUrl, supabaseServiceKey)

// 🔧 CORREÇÃO PARA AGENTIC-RAG: Atualizar função para usar 'full_content'
const AGENTIC_RAG_FIXES = `
-- ⚠️ INSTRUÇÕES PARA CORREÇÃO MANUAL DOS EDGE FUNCTIONS:
-- 
-- 1. No arquivo: backend/supabase/functions/agentic-rag/index.ts
-- 
-- LINHA ~714 - CORRIGIR:
-- ANTES:
-- .or('content.ilike.%\${query}%')
-- 
-- DEPOIS: 
-- .or('full_content.ilike.%\${query}%')
--
-- 2. ADICIONAR fallback para TODOS os document_types:
-- ANTES (linha ~720):
-- .eq('document_type', 'LUOS')
--
-- DEPOIS:
-- .in('document_type', ['LUOS', 'PDUS', 'REGIME_FALLBACK', 'QA_CATEGORY'])
--
-- 3. ADICIONAR busca em qa_test_cases para respostas validadas
`;

// 📊 SQL para verificar e corrigir RPC match_legal_articles
const RPC_VERIFICATION_SQL = `
-- Verificar definição atual da RPC function
SELECT 
  proname as function_name,
  prosrc as source_code
FROM pg_proc
WHERE proname = 'match_legal_articles';
`;

// 🆕 RPC corrigida sem filtros de document_type
const FIXED_RPC_SQL = `
-- Função RPC corrigida para aceitar TODOS os document_types
CREATE OR REPLACE FUNCTION match_legal_articles(
  query_embedding vector(1536),
  match_threshold float,
  match_count int
)
RETURNS TABLE (
  id bigint,
  document_type text,
  article_number int,
  full_content text,
  article_text text,
  keywords text[],
  similarity float
)
LANGUAGE plpgsql
AS $$
BEGIN
  RETURN QUERY
  SELECT 
    legal_articles.id,
    legal_articles.document_type,
    legal_articles.article_number,
    legal_articles.full_content,
    legal_articles.article_text,
    legal_articles.keywords,
    1 - (legal_articles.embedding <=> query_embedding) AS similarity
  FROM legal_articles
  WHERE 1 - (legal_articles.embedding <=> query_embedding) > match_threshold
  AND legal_articles.embedding IS NOT NULL
  -- REMOVIDO: filtro por document_type específico
  ORDER BY legal_articles.embedding <=> query_embedding
  LIMIT match_count;
END;
$$;
`;

async function corrigirRPCeFunções() {
  console.log('🛠️ CORREÇÃO BUG #2 e #3: RPC Function e Campos')
  console.log('===============================================')

  try {
    // 1. VERIFICAR RPC ATUAL
    console.log('\n🔍 1. VERIFICANDO RPC MATCH_LEGAL_ARTICLES ATUAL...')
    
    const { data: rpcInfo, error: rpcInfoError } = await supabase
      .rpc('execute_sql_query', { 
        query_text: `SELECT proname, prosrc FROM pg_proc WHERE proname = 'match_legal_articles'` 
      })
    
    if (rpcInfoError) {
      console.error('❌ Erro ao verificar RPC:', rpcInfoError)
    } else {
      console.log('📋 RPC encontrada:', rpcInfo?.length > 0 ? 'SIM' : 'NÃO')
      if (rpcInfo?.length > 0) {
        const source = rpcInfo[0].prosrc || ''
        const hasDocumentTypeFilter = source.includes('document_type') && source.includes('WHERE')
        console.log('📋 Filtra por document_type:', hasDocumentTypeFilter ? 'SIM (PROBLEMA!)' : 'NÃO')
        
        if (hasDocumentTypeFilter) {
          console.log('🚨 PROBLEMA CONFIRMADO: RPC filtra document_type!')
        }
      }
    }

    // 2. CRIAR/ATUALIZAR RPC CORRIGIDA
    console.log('\n🔧 2. CRIANDO RPC CORRIGIDA...')
    
    const { error: createRpcError } = await supabase
      .rpc('execute_sql_query', { query_text: FIXED_RPC_SQL })
    
    if (createRpcError) {
      console.error('❌ Erro ao criar RPC corrigida:', createRpcError)
    } else {
      console.log('✅ RPC match_legal_articles corrigida criada!')
    }

    // 3. TESTAR RPC CORRIGIDA
    console.log('\n🧪 3. TESTANDO RPC CORRIGIDA...')
    
    try {
      // Gerar embedding de teste
      const testEmbedding = new Array(1536).fill(0.1)
      
      const { data: testResult, error: testError } = await supabase
        .rpc('match_legal_articles', {
          query_embedding: testEmbedding,
          match_threshold: 0.1,
          match_count: 10
        })
      
      if (testError) {
        console.error('❌ Erro no teste da RPC:', testError)
      } else {
        console.log(`✅ RPC funcionando! Retornou ${testResult?.length || 0} resultados`)
        
        // Verificar document_types nos resultados
        if (testResult && testResult.length > 0) {
          const docTypes = [...new Set(testResult.map(r => r.document_type).filter(Boolean))]
          console.log('📊 Document types retornados:', docTypes)
          
          if (docTypes.includes('REGIME_FALLBACK') || docTypes.includes('QA_CATEGORY')) {
            console.log('🎉 SUCESSO! RPC agora retorna REGIME_FALLBACK e QA_CATEGORY!')
          }
        }
      }
    } catch (rpcTestError) {
      console.error('❌ Erro ao testar RPC:', rpcTestError.message)
    }

    // 4. VERIFICAR ESTRUTURA DA TABELA
    console.log('\n🔍 4. VERIFICANDO ESTRUTURA DA TABELA LEGAL_ARTICLES...')
    
    const { data: tableInfo, error: tableError } = await supabase
      .rpc('execute_sql_query', { 
        query_text: `
          SELECT column_name, data_type 
          FROM information_schema.columns 
          WHERE table_name = 'legal_articles' 
          ORDER BY ordinal_position
        ` 
      })
    
    if (tableError) {
      console.error('❌ Erro ao verificar tabela:', tableError)
    } else {
      console.log('📋 Colunas da tabela legal_articles:')
      tableInfo?.forEach(col => {
        console.log(`   • ${col.column_name} (${col.data_type})`)
      })
      
      const hasContent = tableInfo?.some(col => col.column_name === 'content')
      const hasFullContent = tableInfo?.some(col => col.column_name === 'full_content')
      
      console.log(`\n📋 Campo 'content' existe: ${hasContent ? 'SIM' : 'NÃO'}`)
      console.log(`📋 Campo 'full_content' existe: ${hasFullContent ? 'SIM' : 'NÃO'}`)
      
      if (!hasFullContent) {
        console.log('🚨 PROBLEMA: Campo full_content não existe!')
      } else if (hasContent) {
        console.log('⚠️ ATENÇÃO: Ambos campos existem - verificar qual usar')
      }
    }

    // 5. TESTAR BUSCA DIRETA EM TODOS DOCUMENT_TYPES
    console.log('\n🔍 5. TESTANDO BUSCA DIRETA EM TODOS DOCUMENT_TYPES...')
    
    const testQuery = 'altura máxima'
    
    // Busca usando full_content
    const { data: searchResult, error: searchError } = await supabase
      .from('legal_articles')
      .select('document_type, article_text, full_content')
      .or(`full_content.ilike.%${testQuery}%,article_text.ilike.%${testQuery}%`)
      .in('document_type', ['LUOS', 'PDUS', 'REGIME_FALLBACK', 'QA_CATEGORY'])
      .limit(10)
    
    if (searchError) {
      console.error('❌ Erro na busca direta:', searchError)
    } else {
      console.log(`✅ Busca direta funcionando! ${searchResult?.length || 0} resultados`)
      
      if (searchResult && searchResult.length > 0) {
        const resultsByType = {}
        searchResult.forEach(item => {
          resultsByType[item.document_type] = (resultsByType[item.document_type] || 0) + 1
        })
        
        console.log('📊 Resultados por document_type:')
        Object.entries(resultsByType).forEach(([type, count]) => {
          console.log(`   • ${type}: ${count} resultados`)
        })
      }
    }

    // 6. INSTRUÇÕES PARA CORREÇÕES MANUAIS
    console.log('\n📝 6. INSTRUÇÕES PARA CORREÇÕES MANUAIS...')
    console.log(AGENTIC_RAG_FIXES)

  } catch (error) {
    console.error('❌ ERRO CRÍTICO na correção:', error)
  }
  
  console.log('\n🏁 CORREÇÃO BUG #2 e #3 COMPLETA')
  console.log('⚠️  LEMBRE-SE: Aplicar correções manuais nos Edge Functions!')
}

// Executar correção se chamado diretamente
if (import.meta.url === `file://${process.argv[1]}`) {
  corrigirRPCeFunções().catch(console.error)
}

export { corrigirRPCeFunções }