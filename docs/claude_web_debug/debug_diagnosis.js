// 🔍 SCRIPT DE DIAGNÓSTICO CRÍTICO
// Verificar se os dados REGIME_FALLBACK e QA_CATEGORY existem

import { createClient } from '@supabase/supabase-js'

const supabaseUrl = process.env.SUPABASE_URL
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY
const supabase = createClient(supabaseUrl, supabaseServiceKey)

async function diagnosticoCritico() {
  console.log('🔍 DIAGNÓSTICO CRÍTICO - Sistema Agentic-RAG')
  console.log('=====================================')
  
  try {
    // 1. VERIFICAR dados REGIME_FALLBACK e QA_CATEGORY
    console.log('\n📊 1. VERIFICANDO DADOS FALTANTES...')
    
    const { data: legalData, error: legalError } = await supabase
      .from('legal_articles')
      .select('document_type')
      .in('document_type', ['REGIME_FALLBACK', 'QA_CATEGORY'])
    
    if (legalError) {
      console.error('❌ Erro ao consultar legal_articles:', legalError)
    } else {
      const regimeFallbackCount = legalData?.filter(d => d.document_type === 'REGIME_FALLBACK').length || 0
      const qaCategoryCount = legalData?.filter(d => d.document_type === 'QA_CATEGORY').length || 0
      
      console.log(`📋 REGIME_FALLBACK: ${regimeFallbackCount} registros (esperado: 864)`)
      console.log(`📋 QA_CATEGORY: ${qaCategoryCount} registros (esperado: 16)`)
      
      if (regimeFallbackCount === 0) {
        console.log('🚨 CRÍTICO: Dados REGIME_FALLBACK não existem!')
      }
      if (qaCategoryCount === 0) {
        console.log('🚨 CRÍTICO: Dados QA_CATEGORY não existem!')
      }
    }

    // 2. VERIFICAR estrutura da tabela legal_articles
    console.log('\n🏗️ 2. VERIFICANDO ESTRUTURA DA TABELA...')
    
    const { data: allDocTypes } = await supabase
      .from('legal_articles')
      .select('document_type')
      .limit(1000)
    
    const docTypeCounts = {}
    allDocTypes?.forEach(item => {
      docTypeCounts[item.document_type] = (docTypeCounts[item.document_type] || 0) + 1
    })
    
    console.log('📊 Document types encontrados:')
    Object.entries(docTypeCounts).forEach(([type, count]) => {
      console.log(`   • ${type}: ${count} registros`)
    })

    // 3. VERIFICAR schema da tabela legal_articles
    console.log('\n🔍 3. VERIFICANDO SCHEMA...')
    
    const { data: sampleRecord } = await supabase
      .from('legal_articles')
      .select('*')
      .limit(1)
      .single()
    
    if (sampleRecord) {
      console.log('📋 Campos disponíveis:', Object.keys(sampleRecord))
      console.log('📋 Tem campo "content":', 'content' in sampleRecord)
      console.log('📋 Tem campo "full_content":', 'full_content' in sampleRecord)
    }

    // 4. VERIFICAR tabela qa_test_cases
    console.log('\n📚 4. VERIFICANDO QA_TEST_CASES...')
    
    const { data: qaData, error: qaError } = await supabase
      .from('qa_test_cases')
      .select('*')
      .limit(1)
    
    if (qaError) {
      console.error('❌ Erro ao consultar qa_test_cases:', qaError)
    } else {
      console.log(`📋 qa_test_cases: ${qaData?.length || 0} registros encontrados`)
      if (qaData?.length > 0) {
        console.log('📋 Campos em qa_test_cases:', Object.keys(qaData[0]))
      }
    }

    // 5. VERIFICAR RPC match_legal_articles
    console.log('\n⚙️ 5. VERIFICANDO RPC FUNCTION...')
    
    try {
      const { data: rpcResult, error: rpcError } = await supabase
        .rpc('match_legal_articles', {
          query_embedding: new Array(1536).fill(0.1), // embedding fake para teste
          match_threshold: 0.1,
          match_count: 1
        })
      
      if (rpcError) {
        console.error('❌ RPC match_legal_articles com erro:', rpcError.message)
      } else {
        console.log(`✅ RPC match_legal_articles funcionando: ${rpcResult?.length || 0} resultados`)
      }
    } catch (error) {
      console.error('❌ Erro ao testar RPC:', error.message)
    }

  } catch (error) {
    console.error('❌ ERRO CRÍTICO no diagnóstico:', error)
  }
  
  console.log('\n🏁 DIAGNÓSTICO COMPLETO')
  console.log('=====================================')
}

// Executar diagnóstico
diagnosticoCritico().catch(console.error)