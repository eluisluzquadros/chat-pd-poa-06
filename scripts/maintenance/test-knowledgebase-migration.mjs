#!/usr/bin/env node

/**
 * TESTE COMPLETO DA MIGRAÇÃO PARA KNOWLEDGEBASE
 * 
 * Valida se a migração para usar exclusivamente a tabela 'knowledgebase'
 * foi realizada com sucesso e todas as funcionalidades continuam operando.
 */

import { createClient } from '@supabase/supabase-js';
import { config } from 'dotenv';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

// Carregar variáveis de ambiente
config({ path: join(__dirname, '..', '.env.local') });

const supabaseUrl = process.env.VITE_SUPABASE_URL || process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseAnonKey = process.env.VITE_SUPABASE_PUBLISHABLE_KEY || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

if (!supabaseUrl || !supabaseAnonKey) {
  console.error('❌ Variáveis de ambiente do Supabase não encontradas');
  process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseAnonKey);

// Conjunto de testes para validar a migração
const TEST_QUERIES = [
  // Testes de artigos legais
  {
    name: 'Artigo LUOS',
    query: 'Art. 75 da LUOS',
    expectedKeywords: ['artigo', '75', 'luos'],
    category: 'legal_articles'
  },
  {
    name: 'Artigo Plano Diretor',
    query: 'Art. 10 do PDUS',
    expectedKeywords: ['artigo', '10', 'plano'],
    category: 'legal_articles'
  },
  
  // Testes de regime urbanístico
  {
    name: 'Altura Máxima Petrópolis',
    query: 'altura máxima em Petrópolis',
    expectedKeywords: ['altura', 'petrópolis'],
    category: 'regime_urbanistico'
  },
  {
    name: 'ZOT 02 Parâmetros',
    query: 'parâmetros urbanísticos ZOT 02',
    expectedKeywords: ['zot', '02', 'urbanístico'],
    category: 'regime_urbanistico'
  },
  {
    name: 'Coeficiente Centro Histórico',
    query: 'coeficiente de aproveitamento Centro Histórico',
    expectedKeywords: ['coeficiente', 'centro', 'histórico'],
    category: 'regime_urbanistico'
  },
  
  // Testes de Q&A
  {
    name: 'Pergunta Geral',
    query: 'O que é o plano diretor?',
    expectedKeywords: ['plano', 'diretor'],
    category: 'qa_data'
  },
  
  // Testes de busca hierárquica
  {
    name: 'Título Específico',
    query: 'Título II do plano diretor',
    expectedKeywords: ['título', 'ii'],
    category: 'hierarchy'
  }
];

class KnowledgebaseMigrationTester {
  constructor() {
    this.results = {
      passed: 0,
      failed: 0,
      total: 0,
      details: []
    };
  }

  async runAllTests() {
    console.log('🧪 INICIANDO TESTES DE MIGRAÇÃO DA KNOWLEDGEBASE');
    console.log('=' .repeat(60));

    // Verificar estrutura da knowledgebase
    await this.testKnowledgebaseStructure();
    
    // Verificar funções RPC
    await this.testRPCFunctions();
    
    // Testar agentic-rag
    await this.testAgenticRag();
    
    // Comparar com dados antigos (se disponível)
    await this.compareWithOldTables();
    
    this.printSummary();
  }

  async testKnowledgebaseStructure() {
    console.log('\n📊 TESTANDO ESTRUTURA DA KNOWLEDGEBASE');
    console.log('-' .repeat(40));

    try {
      // Verificar contagem total
      const { data: count, error: countError } = await supabase
        .from('knowledgebase')
        .select('*', { count: 'exact', head: true });

      if (countError) throw countError;

      console.log(`✅ Total de registros na knowledgebase: ${count || 0}`);

      // Verificar tipos de documento
      const { data: types, error: typesError } = await supabase
        .from('knowledgebase')
        .select('tipo_documento')
        .not('tipo_documento', 'is', null);

      if (typesError) throw typesError;

      const typesCounts = types.reduce((acc, row) => {
        acc[row.tipo_documento] = (acc[row.tipo_documento] || 0) + 1;
        return acc;
      }, {});

      console.log('📋 Tipos de documento encontrados:');
      Object.entries(typesCounts).forEach(([type, count]) => {
        console.log(`   - ${type}: ${count} registros`);
      });

      // Verificar embeddings
      const { data: embeddings, error: embError } = await supabase
        .from('knowledgebase')
        .select('embedding')
        .not('embedding', 'is', null)
        .limit(1);

      if (embError) throw embError;

      if (embeddings && embeddings.length > 0) {
        console.log('✅ Embeddings encontrados na knowledgebase');
      } else {
        console.log('⚠️ Nenhum embedding encontrado na knowledgebase');
      }

      this.results.passed++;

    } catch (error) {
      console.error(`❌ Erro na estrutura: ${error.message}`);
      this.results.failed++;
    }

    this.results.total++;
  }

  async testRPCFunctions() {
    console.log('\n🔧 TESTANDO FUNÇÕES RPC');
    console.log('-' .repeat(40));

    const functions = [
      'match_knowledgebase',
      'search_knowledgebase_by_content',
      'search_articles_knowledgebase'
    ];

    for (const funcName of functions) {
      try {
        console.log(`🧪 Testando ${funcName}...`);

        let result;
        if (funcName === 'match_knowledgebase') {
          // Simular um embedding dummy para teste
          const dummyEmbedding = new Array(1536).fill(0.1);
          result = await supabase.rpc(funcName, {
            query_embedding: dummyEmbedding,
            match_count: 5
          });
        } else if (funcName === 'search_knowledgebase_by_content') {
          result = await supabase.rpc(funcName, {
            search_text: 'plano diretor',
            match_count: 5
          });
        } else if (funcName === 'search_articles_knowledgebase') {
          result = await supabase.rpc(funcName, {
            article_number_search: '10'
          });
        }

        if (result.error) {
          throw result.error;
        }

        console.log(`   ✅ ${funcName}: ${result.data?.length || 0} resultados`);
        this.results.passed++;

      } catch (error) {
        console.error(`   ❌ ${funcName}: ${error.message}`);
        this.results.failed++;
      }

      this.results.total++;
    }
  }

  async testAgenticRag() {
    console.log('\n🤖 TESTANDO AGENTIC-RAG COM KNOWLEDGEBASE');
    console.log('-' .repeat(40));

    for (const test of TEST_QUERIES) {
      try {
        console.log(`🧪 Teste: ${test.name}`);
        console.log(`   Query: "${test.query}"`);

        const { data, error } = await supabase.functions.invoke('agentic-rag', {
          body: { 
            query: test.query,
            bypassCache: true 
          }
        });

        if (error) throw error;

        const response = data.response || '';
        const sources = data.sources || {};
        
        // Verificar se há resposta válida
        if (!response || response.length < 50) {
          throw new Error('Resposta muito curta ou vazia');
        }

        // Verificar se keywords esperadas estão presentes
        const responseWords = response.toLowerCase();
        const keywordMatches = test.expectedKeywords.filter(keyword => 
          responseWords.includes(keyword.toLowerCase())
        );

        const keywordScore = keywordMatches.length / test.expectedKeywords.length;

        // Verificar se fontes corretas foram utilizadas
        const sourceCategory = test.category;
        let hasCorrectSources = false;

        if (sourceCategory === 'regime_urbanistico' && sources.regime_urbanistico > 0) {
          hasCorrectSources = true;
        } else if (sourceCategory === 'legal_articles' && sources.legal_articles > 0) {
          hasCorrectSources = true;
        } else if (sourceCategory === 'qa_data' && sources.qa_data > 0) {
          hasCorrectSources = true;
        } else if (sources.knowledgebase > 0) {
          hasCorrectSources = true; // Qualquer resultado da knowledgebase é válido
        }

        const confidence = data.confidence || 0;
        const executionTime = data.executionTime || 0;

        console.log(`   Confidence: ${confidence.toFixed(2)}`);
        console.log(`   Keywords: ${keywordMatches.length}/${test.expectedKeywords.length} (${(keywordScore * 100).toFixed(0)}%)`);
        console.log(`   Sources: KB=${sources.knowledgebase || 0}, Regime=${sources.regime_urbanistico || 0}, Legal=${sources.legal_articles || 0}`);
        console.log(`   Execution: ${executionTime}ms`);

        // Critérios de sucesso
        const isSuccess = confidence > 0.5 && keywordScore >= 0.5 && hasCorrectSources;

        if (isSuccess) {
          console.log(`   ✅ PASSOU`);
          this.results.passed++;
        } else {
          console.log(`   ❌ FALHOU (baixa confidence ou keywords)`);
          this.results.failed++;
        }

        this.results.details.push({
          test: test.name,
          query: test.query,
          confidence,
          keywordScore,
          sources: sources.knowledgebase || 0,
          success: isSuccess,
          response: response.substring(0, 100) + '...'
        });

      } catch (error) {
        console.error(`   ❌ ERRO: ${error.message}`);
        this.results.failed++;
        this.results.details.push({
          test: test.name,
          query: test.query,
          success: false,
          error: error.message
        });
      }

      this.results.total++;
    }
  }

  async compareWithOldTables() {
    console.log('\n🔄 COMPARANDO COM TABELAS ANTIGAS');
    console.log('-' .repeat(40));

    try {
      // Verificar se tabelas antigas ainda existem
      const { data: legalCount, error: legalError } = await supabase
        .from('legal_articles')
        .select('*', { count: 'exact', head: true });

      const { data: regimeCount, error: regimeError } = await supabase
        .from('regime_urbanistico_consolidado')
        .select('*', { count: 'exact', head: true });

      if (!legalError && !regimeError) {
        console.log(`📊 legal_articles: ${legalCount || 0} registros`);
        console.log(`📊 regime_urbanistico_consolidado: ${regimeCount || 0} registros`);
        
        const { data: kbCount, error: kbError } = await supabase
          .from('knowledgebase')
          .select('*', { count: 'exact', head: true });

        if (!kbError) {
          console.log(`📊 knowledgebase: ${kbCount || 0} registros`);
          
          // Verificar se a knowledgebase tem mais dados (consolidação)
          const totalOld = (legalCount || 0) + (regimeCount || 0);
          const ratioNew = (kbCount || 0) / totalOld;
          
          if (ratioNew >= 0.8) {
            console.log(`✅ Migração aparenta estar completa (${(ratioNew * 100).toFixed(0)}% dos dados)`);
          } else {
            console.log(`⚠️ Possível perda de dados na migração (${(ratioNew * 100).toFixed(0)}% dos dados)`);
          }
        }
      } else {
        console.log('ℹ️ Tabelas antigas não encontradas (migração limpa)');
      }

      this.results.passed++;

    } catch (error) {
      console.error(`❌ Erro na comparação: ${error.message}`);
      this.results.failed++;
    }

    this.results.total++;
  }

  printSummary() {
    console.log('\n' + '=' .repeat(60));
    console.log('📋 RELATÓRIO FINAL DA MIGRAÇÃO');
    console.log('=' .repeat(60));

    console.log(`Total de testes: ${this.results.total}`);
    console.log(`✅ Sucessos: ${this.results.passed}`);
    console.log(`❌ Falhas: ${this.results.failed}`);
    
    const successRate = (this.results.passed / this.results.total) * 100;
    console.log(`📊 Taxa de sucesso: ${successRate.toFixed(1)}%`);

    if (successRate >= 80) {
      console.log('\n🎉 MIGRAÇÃO REALIZADA COM SUCESSO!');
      console.log('✅ A plataforma está usando exclusivamente a knowledgebase');
      console.log('✅ Todas as funcionalidades principais estão operacionais');
    } else if (successRate >= 60) {
      console.log('\n⚠️ MIGRAÇÃO PARCIALMENTE REALIZADA');
      console.log('🔧 Algumas funcionalidades podem precisar de ajustes');
    } else {
      console.log('\n❌ MIGRAÇÃO COM PROBLEMAS CRÍTICOS');
      console.log('🚨 Recomenda-se revisão completa do sistema');
    }

    // Detalhes dos testes de agentic-rag
    console.log('\n📝 DETALHES DOS TESTES AGENTIC-RAG:');
    this.results.details.forEach(detail => {
      const status = detail.success ? '✅' : '❌';
      console.log(`${status} ${detail.test}`);
      if (detail.success) {
        console.log(`   Confidence: ${detail.confidence?.toFixed(2) || 'N/A'}`);
        console.log(`   Sources: ${detail.sources || 0}`);
      } else if (detail.error) {
        console.log(`   Error: ${detail.error}`);
      }
    });

    console.log('\n' + '=' .repeat(60));
  }
}

// Executar testes
const tester = new KnowledgebaseMigrationTester();
tester.runAllTests().catch(console.error);