#!/usr/bin/env node
/**
 * Teste Abrangente do Sistema Agentic-RAG
 * Valida todas as funcionalidades após implementação do compliance ABNT
 */

import fetch from 'node-fetch';
import dotenv from 'dotenv';
import { createClient } from '@supabase/supabase-js';

dotenv.config({ path: '.env' });

const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL;
const SUPABASE_ANON_KEY = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

const supabase = createClient(SUPABASE_URL, process.env.SUPABASE_SERVICE_ROLE_KEY);

// Categorias de teste
const TEST_CATEGORIES = {
  ARTIGOS_ESPECIFICOS: 'Artigos Específicos',
  HIERARQUIA_LUOS: 'Hierarquia LUOS',
  HIERARQUIA_PDUS: 'Hierarquia PDUS',
  ANEXOS: 'Anexos e Tabelas',
  NAVEGACAO: 'Navegação e Contexto',
  COMPLEXAS: 'Queries Complexas',
  ARTIGO_4: 'Art. 4º LUOS (Corrigido)'
};

// Conjunto de testes abrangentes
const TEST_QUERIES = [
  // 1. ARTIGOS ESPECÍFICOS
  {
    category: TEST_CATEGORIES.ARTIGOS_ESPECIFICOS,
    query: 'O que diz o Art. 119 da LUOS?',
    expectedKeywords: ['projetos protocolados', 'entrada em vigor', 'disposições transitórias'],
    description: 'Busca artigo específico das disposições finais'
  },
  {
    category: TEST_CATEGORIES.ARTIGOS_ESPECIFICOS,
    query: 'Qual o conteúdo do artigo 1 do PDUS?',
    expectedKeywords: ['Plano Diretor', 'instrumento básico', 'política urbana'],
    description: 'Busca primeiro artigo do PDUS'
  },
  {
    category: TEST_CATEGORIES.ARTIGOS_ESPECIFICOS,
    query: 'O que estabelece o Art. 75 da LUOS?',
    expectedKeywords: ['regime volumétrico', 'componentes'],
    description: 'Busca artigo sobre regime volumétrico'
  },
  
  // 2. HIERARQUIA LUOS
  {
    category: TEST_CATEGORIES.HIERARQUIA_LUOS,
    query: 'Sobre o que trata o Título X da LUOS?',
    expectedKeywords: ['Disposições Finais', 'Transitórias'],
    description: 'Busca título das disposições finais'
  },
  {
    category: TEST_CATEGORIES.HIERARQUIA_LUOS,
    query: 'O que diz o Título VII da LUOS?',
    expectedKeywords: ['Licenciamento', 'Urbanístico', 'Edilício'],
    description: 'Busca título do licenciamento'
  },
  {
    category: TEST_CATEGORIES.HIERARQUIA_LUOS,
    query: 'Qual o conteúdo do Capítulo I do Título V da LUOS?',
    expectedKeywords: ['Loteamento'],
    description: 'Busca capítulo específico'
  },
  {
    category: TEST_CATEGORIES.HIERARQUIA_LUOS,
    query: 'O que estabelece a Seção I do Capítulo III do Título VI?',
    expectedKeywords: ['Taxa de Permeabilidade'],
    description: 'Busca seção específica'
  },
  
  // 3. HIERARQUIA PDUS
  {
    category: TEST_CATEGORIES.HIERARQUIA_PDUS,
    query: 'Sobre o que trata a Parte I do PDUS?',
    expectedKeywords: ['Plano Estratégico'],
    description: 'Busca parte do PDUS'
  },
  {
    category: TEST_CATEGORIES.HIERARQUIA_PDUS,
    query: 'O que diz o Título III da Parte I do PDUS?',
    expectedKeywords: ['Modelo Espacial'],
    description: 'Busca título do modelo espacial'
  },
  {
    category: TEST_CATEGORIES.HIERARQUIA_PDUS,
    query: 'Quais são as Macrozonas definidas no PDUS?',
    expectedKeywords: ['Macrozona', '9', 'nove'],
    description: 'Busca sobre macrozonas'
  },
  
  // 4. ART. 4º LUOS (VERIFICAÇÃO DA CORREÇÃO)
  {
    category: TEST_CATEGORIES.ARTIGO_4,
    query: 'O que diz o Art. 4 da LUOS?',
    expectedKeywords: ['zoneamento', 'ZOT', 'Zonas de Ordenamento Territorial', 'macrozoneamento'],
    description: 'Verifica se Art. 4º foi corrigido'
  },
  {
    category: TEST_CATEGORIES.ARTIGO_4,
    query: 'Como o Art. 4º define o zoneamento municipal?',
    expectedKeywords: ['classifica', 'território', 'características', 'desenvolvimento local'],
    description: 'Verifica conteúdo completo do Art. 4º'
  },
  
  // 5. ANEXOS
  {
    category: TEST_CATEGORIES.ANEXOS,
    query: 'Quais são as tabelas das ZOTs?',
    expectedKeywords: ['ZOT', 'tabela', '16'],
    description: 'Busca anexos de tabelas'
  },
  {
    category: TEST_CATEGORIES.ANEXOS,
    query: 'O que contém o anexo sobre Taxa de Permeabilidade?',
    expectedKeywords: ['medidas alternativas', 'permeabilidade'],
    description: 'Busca anexo específico'
  },
  
  // 6. NAVEGAÇÃO E CONTEXTO
  {
    category: TEST_CATEGORIES.NAVEGACAO,
    query: 'Em qual título está o Art. 77 da LUOS?',
    expectedKeywords: ['Título VI', 'Uso e Ocupação do Solo'],
    description: 'Testa navegação hierárquica'
  },
  {
    category: TEST_CATEGORIES.NAVEGACAO,
    query: 'Quais artigos tratam do EIV?',
    expectedKeywords: ['90', '105', 'Estudo de Impacto de Vizinhança'],
    description: 'Busca por tema específico'
  },
  
  // 7. QUERIES COMPLEXAS
  {
    category: TEST_CATEGORIES.COMPLEXAS,
    query: 'Quais são todos os títulos da LUOS e seus temas?',
    expectedKeywords: ['Título I', 'Título X', 'Disposições Gerais', 'Disposições Finais'],
    description: 'Lista completa de títulos'
  },
  {
    category: TEST_CATEGORIES.COMPLEXAS,
    query: 'Explique a estrutura hierárquica do PDUS',
    expectedKeywords: ['Parte', 'Título', 'Capítulo', 'três partes'],
    description: 'Compreensão da estrutura completa'
  },
  {
    category: TEST_CATEGORIES.COMPLEXAS,
    query: 'Qual a diferença entre ZOT e Macrozona?',
    expectedKeywords: ['LUOS', 'PDUS', 'ordenamento territorial'],
    description: 'Comparação entre conceitos'
  }
];

// Função para testar uma query
async function testQuery(testCase) {
  try {
    const startTime = Date.now();
    
    const response = await fetch(`${SUPABASE_URL}/functions/v1/agentic-rag`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${SUPABASE_ANON_KEY}`,
      },
      body: JSON.stringify({
        message: testCase.query,
        bypassCache: true,
        model: 'openai/gpt-4-turbo-preview'
      }),
    });
    
    const responseTime = Date.now() - startTime;
    
    if (!response.ok) {
      return {
        success: false,
        error: `HTTP ${response.status}`,
        responseTime
      };
    }
    
    const data = await response.json();
    const responseText = data.response?.toLowerCase() || '';
    
    // Verificar palavras-chave esperadas
    const foundKeywords = testCase.expectedKeywords.filter(keyword => 
      responseText.includes(keyword.toLowerCase())
    );
    
    // Verificar respostas negativas (não encontrou)
    const negativeResponses = [
      'não inclui',
      'não encontrei',
      'não tenho',
      'não posso fornecer',
      'não foi possível'
    ];
    
    const hasNegativeResponse = negativeResponses.some(neg => responseText.includes(neg));
    
    // Calcular score
    const keywordScore = foundKeywords.length / testCase.expectedKeywords.length;
    const success = keywordScore >= 0.5 && !hasNegativeResponse;
    
    return {
      success,
      keywordScore,
      foundKeywords,
      missingKeywords: testCase.expectedKeywords.filter(k => !foundKeywords.includes(k)),
      hasNegativeResponse,
      responseTime,
      responsePreview: data.response?.substring(0, 200) + '...',
      sources: data.sources
    };
    
  } catch (error) {
    return {
      success: false,
      error: error.message,
      responseTime: 0
    };
  }
}

// Executar todos os testes
async function runComprehensiveTests() {
  console.log('🚀 TESTE ABRANGENTE DO SISTEMA AGENTIC-RAG');
  console.log('=' .repeat(70));
  console.log(`📅 Data: ${new Date().toLocaleString('pt-BR')}`);
  console.log(`📊 Total de testes: ${TEST_QUERIES.length}`);
  console.log('=' .repeat(70));
  
  const results = {
    total: TEST_QUERIES.length,
    passed: 0,
    failed: 0,
    byCategory: {},
    failedTests: [],
    avgResponseTime: 0
  };
  
  let totalResponseTime = 0;
  
  // Executar testes por categoria
  for (const category of Object.values(TEST_CATEGORIES)) {
    const categoryTests = TEST_QUERIES.filter(t => t.category === category);
    if (categoryTests.length === 0) continue;
    
    console.log(`\n📁 ${category.toUpperCase()}`);
    console.log('-' .repeat(70));
    
    results.byCategory[category] = {
      total: categoryTests.length,
      passed: 0,
      failed: 0
    };
    
    for (const testCase of categoryTests) {
      process.stdout.write(`  🧪 ${testCase.description}... `);
      
      const result = await testQuery(testCase);
      totalResponseTime += result.responseTime || 0;
      
      if (result.success) {
        console.log(`✅ PASSOU (${result.responseTime}ms)`);
        results.passed++;
        results.byCategory[category].passed++;
        
        if (result.keywordScore < 1) {
          console.log(`     ⚠️ Keywords parciais: encontrou ${result.foundKeywords.length}/${testCase.expectedKeywords.length}`);
        }
      } else {
        console.log(`❌ FALHOU`);
        results.failed++;
        results.byCategory[category].failed++;
        
        results.failedTests.push({
          ...testCase,
          result
        });
        
        if (result.error) {
          console.log(`     Erro: ${result.error}`);
        } else if (result.hasNegativeResponse) {
          console.log(`     Sistema respondeu que não tem a informação`);
        } else if (result.missingKeywords?.length > 0) {
          console.log(`     Keywords faltando: ${result.missingKeywords.join(', ')}`);
        }
      }
      
      // Delay entre testes
      await new Promise(resolve => setTimeout(resolve, 500));
    }
    
    // Resumo da categoria
    const catResult = results.byCategory[category];
    const catSuccessRate = (catResult.passed / catResult.total * 100).toFixed(1);
    console.log(`  📊 Resultado: ${catResult.passed}/${catResult.total} (${catSuccessRate}%)`);
  }
  
  // Calcular média de tempo de resposta
  results.avgResponseTime = Math.round(totalResponseTime / TEST_QUERIES.length);
  
  // Relatório final
  console.log('\n' + '=' .repeat(70));
  console.log('📊 RELATÓRIO FINAL');
  console.log('=' .repeat(70));
  
  const successRate = (results.passed / results.total * 100).toFixed(1);
  
  console.log(`\n📈 Taxa de Sucesso Geral: ${successRate}%`);
  console.log(`   ✅ Testes aprovados: ${results.passed}/${results.total}`);
  console.log(`   ❌ Testes falhados: ${results.failed}/${results.total}`);
  console.log(`   ⏱️ Tempo médio de resposta: ${results.avgResponseTime}ms`);
  
  console.log('\n📊 Resultados por Categoria:');
  for (const [category, catResult] of Object.entries(results.byCategory)) {
    const rate = (catResult.passed / catResult.total * 100).toFixed(1);
    const status = rate >= 80 ? '✅' : rate >= 60 ? '⚠️' : '❌';
    console.log(`   ${status} ${category}: ${catResult.passed}/${catResult.total} (${rate}%)`);
  }
  
  if (results.failedTests.length > 0) {
    console.log('\n❌ TESTES QUE FALHARAM:');
    console.log('-' .repeat(70));
    
    results.failedTests.forEach((test, idx) => {
      console.log(`\n${idx + 1}. ${test.description}`);
      console.log(`   Query: "${test.query}"`);
      console.log(`   Categoria: ${test.category}`);
      
      if (test.result.error) {
        console.log(`   Erro: ${test.result.error}`);
      }
      if (test.result.responsePreview) {
        console.log(`   Resposta: ${test.result.responsePreview}`);
      }
      if (test.result.missingKeywords?.length > 0) {
        console.log(`   Keywords não encontradas: ${test.result.missingKeywords.join(', ')}`);
      }
    });
  }
  
  // Avaliação final
  console.log('\n' + '=' .repeat(70));
  console.log('🎯 AVALIAÇÃO FINAL:');
  
  if (successRate >= 90) {
    console.log('✅ EXCELENTE: Sistema funcionando perfeitamente!');
  } else if (successRate >= 75) {
    console.log('⚠️ BOM: Sistema funcional mas com alguns problemas');
  } else if (successRate >= 60) {
    console.log('⚠️ REGULAR: Sistema precisa de melhorias');
  } else {
    console.log('❌ CRÍTICO: Sistema com problemas graves');
  }
  
  // Verificação específica do Art. 4º
  const art4Tests = results.byCategory[TEST_CATEGORIES.ARTIGO_4];
  if (art4Tests && art4Tests.passed === art4Tests.total) {
    console.log('\n✅ ESPECIAL: Art. 4º da LUOS está funcionando corretamente!');
  }
  
  console.log('\n' + '=' .repeat(70));
  console.log('TESTE CONCLUÍDO');
  
  return results;
}

// Executar testes
runComprehensiveTests()
  .then(results => {
    if (results.failed > 0) {
      process.exit(1);
    }
  })
  .catch(console.error);