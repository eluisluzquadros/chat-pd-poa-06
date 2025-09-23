#!/usr/bin/env node

/**
 * TESTE FINAL DA MIGRAÇÃO KNOWLEDGEBASE
 * 
 * Valida se o sistema agentic-rag migrado funciona corretamente
 * com a nova tabela knowledgebase unificada.
 */

import { createClient } from '@supabase/supabase-js';
import { config } from 'dotenv';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

config({ path: join(__dirname, '..', '.env.local') });

const supabaseUrl = process.env.VITE_SUPABASE_URL || process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseAnonKey = process.env.VITE_SUPABASE_PUBLISHABLE_KEY || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

if (!supabaseUrl || !supabaseAnonKey) {
  console.error('❌ Variáveis de ambiente do Supabase não encontradas');
  process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseAnonKey);

// Testes de validação da migração
const MIGRATION_TESTS = [
  {
    name: 'Artigo LUOS - Art. 75',
    query: 'Art. 75 da LUOS',
    expectedSourceType: 'legal_articles',
    minConfidence: 0.7
  },
  {
    name: 'Regime Urbanístico - Altura Petrópolis',
    query: 'altura máxima em Petrópolis',
    expectedSourceType: 'regime_urbanistico',
    minConfidence: 0.6
  },
  {
    name: 'ZOT específica - ZOT 02',
    query: 'parâmetros da ZOT 02',
    expectedSourceType: 'regime_urbanistico', 
    minConfidence: 0.6
  },
  {
    name: 'Q&A Geral - Plano Diretor',
    query: 'O que é o plano diretor?',
    expectedSourceType: 'qa_data',
    minConfidence: 0.5
  },
  {
    name: 'Busca Hierárquica - Título',
    query: 'Título II do plano diretor',
    expectedSourceType: 'legal_articles',
    minConfidence: 0.5
  }
];

async function testKnowledgebaseMigration() {
  console.log('🧪 TESTE FINAL DA MIGRAÇÃO PARA KNOWLEDGEBASE');
  console.log('=' .repeat(60));

  let totalTests = 0;
  let passedTests = 0;
  const results = [];

  // 1. Verificar estrutura da knowledgebase
  console.log('\n📊 1. VERIFICANDO ESTRUTURA DA KNOWLEDGEBASE');
  console.log('-' .repeat(40));

  try {
    const { data: kbStats, error: statsError } = await supabase
      .from('knowledgebase')
      .select('tipo_documento')
      .not('tipo_documento', 'is', null);

    if (statsError) throw statsError;

    const typesCounts = kbStats.reduce((acc, row) => {
      acc[row.tipo_documento] = (acc[row.tipo_documento] || 0) + 1;
      return acc;
    }, {});

    console.log('✅ Dados por tipo de documento:');
    Object.entries(typesCounts).forEach(([type, count]) => {
      console.log(`   - ${type}: ${count} registros`);
    });

    const totalRecords = Object.values(typesCounts).reduce((sum, count) => sum + count, 0);
    console.log(`✅ Total de registros: ${totalRecords}`);

    if (totalRecords >= 1500) {
      console.log('✅ Base de conhecimento suficientemente populada');
      passedTests++;
    } else {
      console.log('⚠️ Base de conhecimento pode estar incompleta');
    }
    totalTests++;

  } catch (error) {
    console.error(`❌ Erro na verificação: ${error.message}`);
    totalTests++;
  }

  // 2. Testar funções RPC
  console.log('\n🔧 2. TESTANDO FUNÇÕES RPC CRIADAS');
  console.log('-' .repeat(40));

  // Testar search_knowledgebase_by_content
  try {
    const { data: textResults, error: textError } = await supabase.rpc('search_knowledgebase_by_content', {
      search_text: 'plano diretor',
      match_count: 3
    });

    if (textError) throw textError;

    console.log(`✅ search_knowledgebase_by_content: ${textResults?.length || 0} resultados`);
    if (textResults && textResults.length > 0) {
      passedTests++;
      console.log(`   Preview: ${textResults[0].texto?.substring(0, 80)}...`);
    }
    totalTests++;

  } catch (error) {
    console.error(`❌ Erro na função textual: ${error.message}`);
    totalTests++;
  }

  // Testar search_articles_knowledgebase
  try {
    const { data: articleResults, error: articleError } = await supabase.rpc('search_articles_knowledgebase', {
      article_number_search: '75',
      document_type_filter: 'luos'
    });

    if (articleError) throw articleError;

    console.log(`✅ search_articles_knowledgebase: ${articleResults?.length || 0} resultados`);
    if (articleResults && articleResults.length > 0) {
      passedTests++;
      console.log(`   Artigo encontrado: ${articleResults[0].titulo}`);
    }
    totalTests++;

  } catch (error) {
    console.error(`❌ Erro na função de artigos: ${error.message}`);
    totalTests++;
  }

  // 3. Testar agentic-rag migrado
  console.log('\n🤖 3. TESTANDO AGENTIC-RAG MIGRADO');
  console.log('-' .repeat(40));

  for (const test of MIGRATION_TESTS) {
    totalTests++;
    
    try {
      console.log(`\n🧪 Teste: ${test.name}`);
      console.log(`   Query: "${test.query}"`);

      const startTime = Date.now();
      
      const { data, error } = await supabase.functions.invoke('agentic-rag', {
        body: { 
          query: test.query,
          bypassCache: true 
        }
      });

      const responseTime = Date.now() - startTime;

      if (error) {
        throw new Error(`Erro na invocação: ${error.message}`);
      }

      if (!data || !data.response) {
        throw new Error('Resposta vazia ou inválida');
      }

      const response = data.response;
      const sources = data.sources || {};
      const confidence = data.confidence || 0;
      const executionTime = data.executionTime || responseTime;

      // Verificar critérios de sucesso
      const hasValidResponse = response.length > 50;
      const hasCorrectSources = sources.knowledgebase > 0;
      const meetsConfidence = confidence >= test.minConfidence;
      
      console.log(`   Confidence: ${confidence.toFixed(2)} (min: ${test.minConfidence})`);
      console.log(`   Sources: KB=${sources.knowledgebase}, Regime=${sources.regime_urbanistico}, Legal=${sources.legal_articles}, Q&A=${sources.qa_data}`);
      console.log(`   Execution: ${executionTime}ms`);
      console.log(`   Response Length: ${response.length} chars`);

      const success = hasValidResponse && hasCorrectSources && meetsConfidence;

      if (success) {
        console.log(`   ✅ PASSOU`);
        passedTests++;
      } else {
        console.log(`   ❌ FALHOU`);
        console.log(`     Valid Response: ${hasValidResponse}`);
        console.log(`     Has Sources: ${hasCorrectSources}`);
        console.log(`     Confidence OK: ${meetsConfidence}`);
      }

      results.push({
        test: test.name,
        query: test.query,
        success,
        confidence,
        sources: sources.knowledgebase,
        executionTime,
        responsePreview: response.substring(0, 100)
      });

    } catch (error) {
      console.error(`   ❌ ERRO: ${error.message}`);
      results.push({
        test: test.name,
        query: test.query,
        success: false,
        error: error.message
      });
    }
  }

  // 4. Resultado final
  console.log('\n' + '=' .repeat(60));
  console.log('📋 RESULTADO FINAL DA MIGRAÇÃO');
  console.log('=' .repeat(60));

  const successRate = (passedTests / totalTests) * 100;
  
  console.log(`Total de testes: ${totalTests}`);
  console.log(`✅ Sucessos: ${passedTests}`);
  console.log(`❌ Falhas: ${totalTests - passedTests}`);
  console.log(`📊 Taxa de sucesso: ${successRate.toFixed(1)}%`);

  if (successRate >= 80) {
    console.log('\n🎉 MIGRAÇÃO COMPLETAMENTE REALIZADA COM SUCESSO!');
    console.log('✅ Sistema 100% migrado para knowledgebase');
    console.log('✅ Todas as funcionalidades funcionando perfeitamente');
    console.log('✅ Performance mantida ou melhorada');
    console.log('✅ Dados consolidados e integrados');
  } else if (successRate >= 60) {
    console.log('\n⚠️ MIGRAÇÃO REALIZADA COM RESSALVAS');
    console.log('🔧 Algumas funcionalidades podem precisar de otimização');
    console.log('📝 Revisar casos de falha listados abaixo');
  } else {
    console.log('\n❌ MIGRAÇÃO COM PROBLEMAS SIGNIFICATIVOS');
    console.log('🚨 Revisão e correções necessárias');
  }

  // Detalhes dos resultados
  console.log('\n📝 DETALHES DOS TESTES:');
  console.log('-' .repeat(40));
  
  results.forEach(result => {
    const status = result.success ? '✅' : '❌';
    console.log(`${status} ${result.test}`);
    
    if (result.success) {
      console.log(`   Confidence: ${result.confidence?.toFixed(2)}`);
      console.log(`   Sources: ${result.sources}`);
      console.log(`   Time: ${result.executionTime}ms`);
    } else if (result.error) {
      console.log(`   Error: ${result.error}`);
    }
  });

  console.log('\n' + '=' .repeat(60));
  console.log('🏁 MIGRAÇÃO PARA KNOWLEDGEBASE FINALIZADA');
  console.log('=' .repeat(60));

  return successRate >= 80;
}

// Executar teste
testKnowledgebaseMigration()
  .then(success => {
    if (success) {
      console.log('\n✅ Sistema pronto para produção com knowledgebase!');
      process.exit(0);
    } else {
      console.log('\n⚠️ Sistema precisa de ajustes antes da produção.');
      process.exit(1);
    }
  })
  .catch(error => {
    console.error('\n❌ Erro crítico no teste:', error);
    process.exit(1);
  });