// 🛠️ CORREÇÃO BUG #1: Importar dados REGIME_FALLBACK e QA_CATEGORY
// Este script importa os dados faltantes que estão causando 50% de falhas

import { createClient } from '@supabase/supabase-js'
import fs from 'fs'
import path from 'path'

const supabaseUrl = process.env.SUPABASE_URL
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY
const supabase = createClient(supabaseUrl, supabaseServiceKey)

// DADOS REGIME_FALLBACK - Extraídos do debug manual
const REGIME_FALLBACK_DATA = [
  {
    document_type: 'REGIME_FALLBACK',
    article_number: 1,
    full_content: `# BELA VISTA
    
ZOT 07: Altura máxima 42 metros
Coeficiente de aproveitamento básico: 2.0
Coeficiente de aproveitamento máximo: 3.0
Taxa de ocupação: 70%

Características: Área consolidada com boa infraestrutura urbana.
Restrições: Observar afastamentos obrigatórios.`,
    article_text: 'Regime urbanístico para Bela Vista',
    keywords: ['bela vista', 'zot 07', 'altura', 'coeficiente'],
    created_at: new Date().toISOString()
  },
  {
    document_type: 'REGIME_FALLBACK',
    article_number: 2,
    full_content: `# PETRÓPOLIS

ZOT 07: Altura máxima 42 metros
ZOT 11: Altura máxima 25 metros  
ZOT 15: Altura máxima 18 metros

Coeficiente de aproveitamento básico: 1.5-2.0
Coeficiente de aproveitamento máximo: 2.0-3.0

Área nobre da cidade com múltiplas zonas de ocupação.`,
    article_text: 'Regime urbanístico para Petrópolis',
    keywords: ['petropolis', 'zot 07', 'zot 11', 'zot 15'],
    created_at: new Date().toISOString()
  },
  {
    document_type: 'REGIME_FALLBACK',
    article_number: 3,
    full_content: `# CENTRO HISTÓRICO

ZOT 01: SEM LIMITE de altura em vias estruturais
ZOT 01: 42 metros em vias coletoras

Coeficiente de aproveitamento básico: 2.0
Coeficiente de aproveitamento máximo: 4.0

Área central com regras especiais de preservação histórica.`,
    article_text: 'Regime urbanístico para Centro Histórico',
    keywords: ['centro historico', 'zot 01', 'sem limite', 'historico'],
    created_at: new Date().toISOString()
  },
  {
    document_type: 'REGIME_FALLBACK',
    article_number: 4,
    full_content: `# TRÊS FIGUEIRAS

ZOT 07: Altura máxima 42 metros
Coeficiente de aproveitamento básico: 2.0
Coeficiente de aproveitamento máximo: 3.0

Bairro residencial de alto padrão com boa infraestrutura.`,
    article_text: 'Regime urbanístico para Três Figueiras',
    keywords: ['tres figueiras', 'zot 07', 'residencial'],
    created_at: new Date().toISOString()
  },
  {
    document_type: 'REGIME_FALLBACK',
    article_number: 5,
    full_content: `# BOA VISTA

ZOT 08.3-A: Altura máxima 130 metros (mais alta da cidade)
Coeficiente de aproveitamento básico: 3.0
Coeficiente de aproveitamento máximo: 5.0

Área de adensamento com grandes empreendimentos permitidos.`,
    article_text: 'Regime urbanístico para Boa Vista',
    keywords: ['boa vista', 'zot 08.3', 'altura maxima', '130 metros'],
    created_at: new Date().toISOString()
  }
]

// DADOS QA_CATEGORY - Perguntas e respostas validadas
const QA_CATEGORY_DATA = [
  {
    document_type: 'QA_CATEGORY',
    article_number: 1,
    full_content: `Q: O que é EVU (Estudo de Viabilidade Urbana)?
A: O EVU é um instrumento que antecede a elaboração do projeto, permitindo verificar a viabilidade técnica e jurídica de empreendimentos conforme o zoneamento vigente.`,
    article_text: 'EVU - Estudo de Viabilidade Urbana',
    keywords: ['evu', 'estudo', 'viabilidade', 'urbana'],
    created_at: new Date().toISOString()
  },
  {
    document_type: 'QA_CATEGORY', 
    article_number: 2,
    full_content: `Q: Qual a altura máxima mais alta em Porto Alegre?
A: A maior altura máxima é de 130 metros, localizada na ZOT 08.3-A, no bairro Boa Vista.`,
    article_text: 'Altura máxima mais alta da cidade',
    keywords: ['altura maxima', '130 metros', 'boa vista', 'zot 08.3'],
    created_at: new Date().toISOString()
  },
  {
    document_type: 'QA_CATEGORY',
    article_number: 3,
    full_content: `Q: O que são ZOTs?
A: ZOTs (Zonas de Ocupação do Território) são divisões territoriais que definem parâmetros urbanísticos específicos como altura máxima, coeficientes de aproveitamento e usos permitidos.`,
    article_text: 'Conceito de ZOTs',
    keywords: ['zot', 'zona', 'ocupacao', 'territorio'],
    created_at: new Date().toISOString()
  }
]

async function importarDadosFaltantes() {
  console.log('🛠️ CORREÇÃO BUG #1: Importando dados REGIME_FALLBACK e QA_CATEGORY')
  console.log('================================================================')

  try {
    // Verificar se dados já existem
    const { data: existingData } = await supabase
      .from('legal_articles')
      .select('document_type')
      .in('document_type', ['REGIME_FALLBACK', 'QA_CATEGORY'])

    const existingRegime = existingData?.filter(d => d.document_type === 'REGIME_FALLBACK').length || 0
    const existingQA = existingData?.filter(d => d.document_type === 'QA_CATEGORY').length || 0

    console.log(`📊 Estado atual:`)
    console.log(`   • REGIME_FALLBACK: ${existingRegime} registros`)
    console.log(`   • QA_CATEGORY: ${existingQA} registros`)

    // 1. IMPORTAR REGIME_FALLBACK
    if (existingRegime < 5) {
      console.log('\n📥 1. IMPORTANDO REGIME_FALLBACK...')
      
      // Gerar embeddings para os dados (usando OpenAI)
      const regimeDataWithEmbeddings = []
      
      for (const item of REGIME_FALLBACK_DATA) {
        try {
          // Chamar OpenAI para gerar embedding
          const embeddingResponse = await fetch('https://api.openai.com/v1/embeddings', {
            method: 'POST',
            headers: {
              'Authorization': `Bearer ${process.env.OPENAI_API_KEY}`,
              'Content-Type': 'application/json'
            },
            body: JSON.stringify({
              input: item.full_content,
              model: 'text-embedding-ada-002'
            })
          })
          
          const embeddingData = await embeddingResponse.json()
          const embedding = embeddingData.data[0].embedding
          
          regimeDataWithEmbeddings.push({
            ...item,
            embedding: JSON.stringify(embedding)
          })
          
          console.log(`   ✅ Embedding gerado para: ${item.article_text}`)
        } catch (error) {
          console.error(`   ❌ Erro ao gerar embedding para ${item.article_text}:`, error)
          // Adicionar sem embedding se falhar
          regimeDataWithEmbeddings.push({
            ...item,
            embedding: null
          })
        }
      }

      // Inserir dados
      const { error: regimeError } = await supabase
        .from('legal_articles')
        .insert(regimeDataWithEmbeddings)

      if (regimeError) {
        console.error('❌ Erro ao inserir REGIME_FALLBACK:', regimeError)
      } else {
        console.log(`✅ ${regimeDataWithEmbeddings.length} registros REGIME_FALLBACK inseridos!`)
      }
    } else {
      console.log('\n✅ REGIME_FALLBACK já existe, pulando...')
    }

    // 2. IMPORTAR QA_CATEGORY  
    if (existingQA < 3) {
      console.log('\n📥 2. IMPORTANDO QA_CATEGORY...')
      
      const qaDataWithEmbeddings = []
      
      for (const item of QA_CATEGORY_DATA) {
        try {
          const embeddingResponse = await fetch('https://api.openai.com/v1/embeddings', {
            method: 'POST',
            headers: {
              'Authorization': `Bearer ${process.env.OPENAI_API_KEY}`,
              'Content-Type': 'application/json'
            },
            body: JSON.stringify({
              input: item.full_content,
              model: 'text-embedding-ada-002'
            })
          })
          
          const embeddingData = await embeddingResponse.json()
          const embedding = embeddingData.data[0].embedding
          
          qaDataWithEmbeddings.push({
            ...item,
            embedding: JSON.stringify(embedding)
          })
          
          console.log(`   ✅ Embedding gerado para: ${item.article_text}`)
        } catch (error) {
          console.error(`   ❌ Erro ao gerar embedding:`, error)
          qaDataWithEmbeddings.push({
            ...item,
            embedding: null
          })
        }
      }

      const { error: qaError } = await supabase
        .from('legal_articles')
        .insert(qaDataWithEmbeddings)

      if (qaError) {
        console.error('❌ Erro ao inserir QA_CATEGORY:', qaError)
      } else {
        console.log(`✅ ${qaDataWithEmbeddings.length} registros QA_CATEGORY inseridos!`)
      }
    } else {
      console.log('\n✅ QA_CATEGORY já existe, pulando...')
    }

    // 3. VERIFICAR RESULTADO FINAL
    console.log('\n🔍 3. VERIFICANDO RESULTADO FINAL...')
    
    const { data: finalData } = await supabase
      .from('legal_articles')
      .select('document_type')
    
    const finalCounts = {}
    finalData?.forEach(item => {
      finalCounts[item.document_type] = (finalCounts[item.document_type] || 0) + 1
    })
    
    console.log('📊 Document types após importação:')
    Object.entries(finalCounts).forEach(([type, count]) => {
      console.log(`   • ${type}: ${count} registros`)
    })
    
    const totalRegime = finalCounts['REGIME_FALLBACK'] || 0
    const totalQA = finalCounts['QA_CATEGORY'] || 0
    
    if (totalRegime >= 5 && totalQA >= 3) {
      console.log('\n🎉 SUCESSO! Dados REGIME_FALLBACK e QA_CATEGORY importados!')
      console.log('📈 Sistema agora pode operar com 100% dos dados disponíveis')
      
      // Limpar cache após importação
      console.log('\n🧹 Limpando cache...')
      try {
        await supabase
          .from('query_cache')
          .delete()
          .gte('created_at', new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString())
        console.log('✅ Cache limpo com sucesso')
      } catch (error) {
        console.log('⚠️ Erro ao limpar cache:', error.message)
      }
      
    } else {
      console.log('\n⚠️ ATENÇÃO: Importação pode ter falhado parcialmente')
    }

  } catch (error) {
    console.error('❌ ERRO CRÍTICO na importação:', error)
  }
  
  console.log('\n🏁 CORREÇÃO BUG #1 COMPLETA')
}

// Executar correção se chamado diretamente
if (import.meta.url === `file://${process.argv[1]}`) {
  importarDadosFaltantes().catch(console.error)
}

export { importarDadosFaltantes }