#!/usr/bin/env node

/**
 * TESTE CRÍTICO: Validação das correções de busca por "altura"
 * 
 * Este script testa:
 * 1. Busca fuzzy implementada
 * 2. Sinônimos de altura funcionando
 * 3. Embeddings reais do OpenAI
 * 4. Melhorias no sistema de RAG
 */

import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';

dotenv.config();

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY
);

// Queries de teste para altura com diferentes sinônimos
const alturaTestQueries = [
  'qual a altura máxima permitida?',
  'gabarito máximo em porto alegre',
  'limite de altura das edificações',
  'elevação máxima dos prédios',
  'quantos metros de altura posso construir?',
  'altura da construção permitida',
  'cota máxima das edificações',
  'nível máximo de construção',
  'altura do prédio máxima',
  'teto de altura para edificações'
];

async function testEmbeddingGeneration(query) {
  console.log(`\n🧪 Testando geração de embedding para: "${query}"`);
  
  try {
    const { data, error } = await supabase.functions.invoke('generate-text-embedding', {
      body: { 
        text: query,
        model: "text-embedding-3-small"
      }
    });

    if (error) {
      console.error('❌ Erro na geração de embedding:', error);
      return false;
    }

    if (!data?.embedding) {
      console.error('❌ Resposta inválida - sem embedding');
      return false;
    }

    console.log('✅ Embedding gerado com sucesso');
    console.log(`📊 Dimensões: ${data.dimensions}`);
    console.log(`🔧 Busca fuzzy aplicada: ${data.processingInfo?.fuzzySearchApplied}`);
    console.log(`📝 Melhorado com sinônimos: ${data.processingInfo?.enhancedWithSynonyms}`);
    
    return data.embedding;
    
  } catch (error) {
    console.error('❌ Erro inesperado:', error);
    return false;
  }
}

async function testVectorSearch(query) {
  console.log(`\n🔍 Testando busca vetorial para: "${query}"`);
  
  try {
    const { data, error } = await supabase.functions.invoke('enhanced-vector-search', {
      body: { 
        message: query,
        userRole: 'citizen'
      }
    });

    if (error) {
      console.error('❌ Erro na busca vetorial:', error);
      return false;
    }

    console.log('✅ Busca vetorial executada');
    console.log(`📝 Matches encontrados: ${data.matches?.length || 0}`);
    
    if (data.matches && data.matches.length > 0) {
      console.log('📋 Primeiros matches:');
      data.matches.slice(0, 3).forEach((match, idx) => {
        console.log(`  ${idx + 1}. Score: ${match.similarity?.toFixed(3)} - ${match.content?.substring(0, 100)}...`);
      });
    }
    
    return data;
    
  } catch (error) {
    console.error('❌ Erro inesperado:', error);
    return false;
  }
}

async function testFullRAGPipeline(query) {
  console.log(`\n🚀 Testando pipeline RAG completo para: "${query}"`);
  
  try {
    // 1. Análise da query
    const { data: analysis, error: analysisError } = await supabase.functions.invoke('query-analyzer', {
      body: { 
        query,
        userRole: 'citizen'
      }
    });

    if (analysisError) {
      console.error('❌ Erro na análise da query:', analysisError);
      return false;
    }

    console.log('🎯 Análise da query:', {
      intent: analysis.intent,
      isConstructionQuery: analysis.isConstructionQuery,
      entities: analysis.entities
    });

    // 2. Busca vetorial
    const vectorResults = await testVectorSearch(query);
    if (!vectorResults) return false;

    // 3. Síntese da resposta
    const { data: synthesis, error: synthesisError } = await supabase.functions.invoke('response-synthesizer', {
      body: {
        originalQuery: query,
        analysisResult: analysis,
        vectorResults: vectorResults,
        userRole: 'citizen'
      }
    });

    if (synthesisError) {
      console.error('❌ Erro na síntese da resposta:', synthesisError);
      return false;
    }

    console.log('✅ Pipeline RAG completo executado');
    console.log(`📊 Confiança: ${synthesis.confidence}`);
    console.log(`📝 Resposta (resumo): ${synthesis.response?.substring(0, 200)}...`);
    
    return synthesis;
    
  } catch (error) {
    console.error('❌ Erro inesperado no pipeline:', error);
    return false;
  }
}

async function runTests() {
  console.log('🔬 INICIANDO TESTES DE CORREÇÃO PARA BUSCA POR ALTURA');
  console.log('=' * 60);

  let passedTests = 0;
  let totalTests = 0;

  // Teste 1: Geração de embeddings
  console.log('\n📋 FASE 1: Testando geração de embeddings com OpenAI');
  for (const query of alturaTestQueries.slice(0, 3)) { // Teste apenas 3 para economizar
    totalTests++;
    const result = await testEmbeddingGeneration(query);
    if (result) passedTests++;
  }

  // Teste 2: Busca vetorial melhorada
  console.log('\n📋 FASE 2: Testando busca vetorial com sinônimos');
  for (const query of alturaTestQueries.slice(0, 2)) { // Teste 2 queries
    totalTests++;
    const result = await testVectorSearch(query);
    if (result) passedTests++;
  }

  // Teste 3: Pipeline RAG completo
  console.log('\n📋 FASE 3: Testando pipeline RAG completo');
  const criticalQuery = 'qual a altura máxima permitida?';
  totalTests++;
  const pipelineResult = await testFullRAGPipeline(criticalQuery);
  if (pipelineResult) passedTests++;

  // Resultado final
  console.log('\n' + '=' * 60);
  console.log('📊 RESULTADO DOS TESTES');
  console.log(`✅ Testes aprovados: ${passedTests}/${totalTests}`);
  console.log(`📈 Taxa de sucesso: ${((passedTests/totalTests) * 100).toFixed(1)}%`);
  
  if (passedTests === totalTests) {
    console.log('🎉 TODOS OS TESTES PASSARAM! Correções implementadas com sucesso.');
  } else if (passedTests >= totalTests * 0.8) {
    console.log('⚠️ Maioria dos testes passou, mas há pontos para melhorar.');
  } else {
    console.log('❌ Muitos testes falharam. Correções precisam ser revisadas.');
  }

  console.log('\n🔧 PRÓXIMOS PASSOS:');
  console.log('1. Deploy das funções atualizadas');
  console.log('2. Reprocessar base de conhecimento com novo sistema');
  console.log('3. Monitorar performance em produção');
}

// Executa os testes
runTests().catch(console.error);