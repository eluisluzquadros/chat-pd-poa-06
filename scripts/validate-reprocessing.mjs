#!/usr/bin/env node

/**
 * Script de Validação do Reprocessamento
 * Testa queries críticas para verificar se o reprocessamento foi bem-sucedido
 */

import fetch from 'node-fetch';
import dotenv from 'dotenv';
import { createClient } from '@supabase/supabase-js';

dotenv.config({ path: '.env.local' });

const SUPABASE_URL = process.env.SUPABASE_URL || 'https://ngrqwmvuhvjkeohesbxs.supabase.co';
const SUPABASE_ANON_KEY = process.env.SUPABASE_ANON_KEY;

if (!SUPABASE_ANON_KEY) {
  console.error('❌ SUPABASE_ANON_KEY não configurada');
  process.exit(1);
}

const supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY);

// Casos de teste para validação
const testCases = [
  // Teste 1: Regime Urbanístico Básico
  {
    id: 'regime_basico',
    query: 'Qual a altura máxima permitida no bairro Centro Histórico?',
    expectedKeywords: ['altura', 'máxima', 'metro', 'm'],
    expectedFormat: 'should_contain_number',
    category: 'Regime Urbanístico'
  },
  
  // Teste 2: Múltiplas Zonas
  {
    id: 'multiplas_zonas',
    query: 'Liste todas as zonas do bairro Moinhos de Vento com seus coeficientes',
    expectedKeywords: ['ZOT', 'coeficiente', 'aproveitamento'],
    expectedFormat: 'should_contain_table_or_list',
    category: 'Regime Urbanístico'
  },
  
  // Teste 3: Artigo Legal Específico
  {
    id: 'artigo_81',
    query: 'O que diz o artigo 81 inciso III sobre certificação de sustentabilidade?',
    expectedKeywords: ['certificação', 'sustentabilidade', 'ambiental', 'acréscimo'],
    expectedFormat: 'should_reference_article',
    category: 'Legislação'
  },
  
  // Teste 4: 4º Distrito
  {
    id: 'quarto_distrito',
    query: 'Quais são as regras especiais para empreendimentos no 4º distrito?',
    expectedKeywords: ['4º distrito', 'quarto distrito', 'artigo 74', 'ZOT', 'revitalização'],
    expectedFormat: 'should_contain_rules',
    category: 'Legislação'
  },
  
  // Teste 5: Outorga Onerosa
  {
    id: 'outorga_onerosa',
    query: 'Como funciona a outorga onerosa do direito de construir?',
    expectedKeywords: ['outorga onerosa', 'direito de construir', 'contrapartida', 'artigo'],
    expectedFormat: 'should_explain_process',
    category: 'Instrumentos Urbanísticos'
  },
  
  // Teste 6: ZEIS
  {
    id: 'zeis',
    query: 'O que são as ZEIS e onde estão localizadas?',
    expectedKeywords: ['ZEIS', 'zonas especiais', 'interesse social', 'habitação'],
    expectedFormat: 'should_define_and_locate',
    category: 'Zoneamento'
  },
  
  // Teste 7: Comparação entre Bairros
  {
    id: 'comparacao_bairros',
    query: 'Compare o regime urbanístico dos bairros Petrópolis e Bela Vista',
    expectedKeywords: ['Petrópolis', 'Bela Vista', 'altura', 'coeficiente'],
    expectedFormat: 'should_compare_data',
    category: 'Regime Urbanístico'
  },
  
  // Teste 8: Query do QA Document
  {
    id: 'qa_document',
    query: 'Quais são os principais objetivos do novo Plano Diretor de Porto Alegre?',
    expectedKeywords: ['objetivo', 'desenvolvimento', 'sustentável', 'urbano'],
    expectedFormat: 'should_list_objectives',
    category: 'Objetivos PDUS'
  },
  
  // Teste 9: Coeficiente Específico
  {
    id: 'coef_especifico',
    query: 'Qual o coeficiente de aproveitamento máximo na ZOT-1?',
    expectedKeywords: ['coeficiente', 'aproveitamento', 'máximo', 'ZOT-1'],
    expectedFormat: 'should_contain_number',
    category: 'Regime Urbanístico'
  },
  
  // Teste 10: Estudo de Impacto
  {
    id: 'eiv',
    query: 'Quando é necessário apresentar Estudo de Impacto de Vizinhança (EIV)?',
    expectedKeywords: ['estudo', 'impacto', 'vizinhança', 'EIV', 'empreendimento'],
    expectedFormat: 'should_explain_requirements',
    category: 'Instrumentos Urbanísticos'
  }
];

// Função para testar uma query
async function testQuery(testCase) {
  console.log(`\n🧪 Teste ${testCase.id}: ${testCase.category}`);
  console.log(`   Query: "${testCase.query}"`);
  
  try {
    const startTime = Date.now();
    
    // Fazer chamada para o agentic-rag
    const response = await fetch(`${SUPABASE_URL}/functions/v1/agentic-rag`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${SUPABASE_ANON_KEY}`
      },
      body: JSON.stringify({
        query: testCase.query,
        bypassCache: true // Forçar busca nova
      })
    });
    
    const responseTime = Date.now() - startTime;
    
    if (!response.ok) {
      console.log(`   ❌ Erro HTTP: ${response.status}`);
      return { passed: false, error: `HTTP ${response.status}` };
    }
    
    const result = await response.json();
    const responseText = result.response || '';
    
    // Validar resposta
    let passed = true;
    const issues = [];
    
    // Verificar se não é resposta vazia ou erro
    if (!responseText || responseText.length < 50) {
      passed = false;
      issues.push('Resposta muito curta ou vazia');
    }
    
    // Verificar se contém "não encontrei" ou mensagens de erro
    const errorPhrases = [
      'não encontrei',
      'não foi possível',
      'não há informações',
      'desculpe',
      'erro ao processar'
    ];
    
    for (const phrase of errorPhrases) {
      if (responseText.toLowerCase().includes(phrase)) {
        passed = false;
        issues.push(`Resposta indica falha: "${phrase}"`);
      }
    }
    
    // Verificar palavras-chave esperadas
    const foundKeywords = [];
    const missingKeywords = [];
    
    for (const keyword of testCase.expectedKeywords) {
      if (responseText.toLowerCase().includes(keyword.toLowerCase())) {
        foundKeywords.push(keyword);
      } else {
        missingKeywords.push(keyword);
      }
    }
    
    // Pelo menos 50% das palavras-chave devem estar presentes
    const keywordRatio = foundKeywords.length / testCase.expectedKeywords.length;
    if (keywordRatio < 0.5) {
      passed = false;
      issues.push(`Apenas ${(keywordRatio * 100).toFixed(0)}% das palavras-chave encontradas`);
    }
    
    // Verificar formato esperado
    switch (testCase.expectedFormat) {
      case 'should_contain_number':
        if (!/\d+/.test(responseText)) {
          passed = false;
          issues.push('Resposta deveria conter números');
        }
        break;
        
      case 'should_contain_table_or_list':
        if (!responseText.includes('|') && !responseText.includes('•') && !responseText.includes('-')) {
          passed = false;
          issues.push('Resposta deveria conter tabela ou lista');
        }
        break;
        
      case 'should_reference_article':
        if (!/artigo\s+\d+/i.test(responseText)) {
          passed = false;
          issues.push('Resposta deveria referenciar artigo');
        }
        break;
    }
    
    // Exibir resultado
    if (passed) {
      console.log(`   ✅ PASSOU`);
      console.log(`   ⏱️ Tempo: ${responseTime}ms`);
      console.log(`   📝 Palavras-chave: ${foundKeywords.join(', ')}`);
    } else {
      console.log(`   ❌ FALHOU`);
      console.log(`   ⏱️ Tempo: ${responseTime}ms`);
      console.log(`   ⚠️ Problemas: ${issues.join('; ')}`);
      console.log(`   📝 Palavras-chave encontradas: ${foundKeywords.join(', ')}`);
      console.log(`   ❌ Palavras-chave faltando: ${missingKeywords.join(', ')}`);
    }
    
    // Preview da resposta
    console.log(`   📄 Preview: ${responseText.substring(0, 150)}...`);
    
    return {
      passed,
      responseTime,
      keywordRatio,
      issues,
      foundKeywords,
      missingKeywords
    };
    
  } catch (error) {
    console.log(`   ❌ Erro: ${error.message}`);
    return { passed: false, error: error.message };
  }
}

// Função principal
async function runValidation() {
  console.log('🚀 === VALIDAÇÃO DO REPROCESSAMENTO ===');
  console.log(`📅 Data/Hora: ${new Date().toLocaleString('pt-BR')}`);
  console.log(`🔗 Supabase URL: ${SUPABASE_URL}`);
  console.log(`📊 Total de testes: ${testCases.length}`);
  
  // Verificar primeiro as contagens no banco
  console.log('\n📊 === VERIFICANDO BANCO DE DADOS ===');
  
  const { count: regimeCount } = await supabase
    .from('regime_urbanistico')
    .select('*', { count: 'exact', head: true });
  
  const { count: sectionsCount } = await supabase
    .from('document_sections')
    .select('*', { count: 'exact', head: true });
  
  console.log(`✅ Regime urbanístico: ${regimeCount || 0} registros`);
  console.log(`✅ Document sections: ${sectionsCount || 0} chunks`);
  
  if (!regimeCount || regimeCount < 100) {
    console.warn('\n⚠️ AVISO: Poucos registros de regime urbanístico. Execute o reprocessamento primeiro!');
  }
  
  if (!sectionsCount || sectionsCount < 500) {
    console.warn('\n⚠️ AVISO: Poucos document sections. Execute o reprocessamento primeiro!');
  }
  
  // Executar testes
  console.log('\n🧪 === EXECUTANDO TESTES ===');
  
  const results = {
    total: testCases.length,
    passed: 0,
    failed: 0,
    byCategory: {},
    totalTime: 0,
    errors: []
  };
  
  for (const testCase of testCases) {
    const result = await testQuery(testCase);
    
    if (result.passed) {
      results.passed++;
    } else {
      results.failed++;
      results.errors.push({
        id: testCase.id,
        query: testCase.query,
        issues: result.issues || [result.error]
      });
    }
    
    // Estatísticas por categoria
    if (!results.byCategory[testCase.category]) {
      results.byCategory[testCase.category] = { passed: 0, failed: 0 };
    }
    
    if (result.passed) {
      results.byCategory[testCase.category].passed++;
    } else {
      results.byCategory[testCase.category].failed++;
    }
    
    if (result.responseTime) {
      results.totalTime += result.responseTime;
    }
    
    // Aguardar um pouco entre testes para não sobrecarregar
    await new Promise(resolve => setTimeout(resolve, 1000));
  }
  
  // Relatório final
  console.log('\n📊 === RELATÓRIO FINAL ===\n');
  
  const successRate = (results.passed / results.total * 100).toFixed(1);
  const avgTime = (results.totalTime / results.total).toFixed(0);
  
  console.log(`✅ Testes aprovados: ${results.passed}/${results.total} (${successRate}%)`);
  console.log(`❌ Testes falhados: ${results.failed}/${results.total}`);
  console.log(`⏱️ Tempo médio de resposta: ${avgTime}ms`);
  
  console.log('\n📈 Resultados por categoria:');
  for (const [category, stats] of Object.entries(results.byCategory)) {
    const catSuccessRate = (stats.passed / (stats.passed + stats.failed) * 100).toFixed(0);
    console.log(`   ${category}: ${stats.passed}/${stats.passed + stats.failed} (${catSuccessRate}%)`);
  }
  
  if (results.errors.length > 0) {
    console.log('\n❌ Testes que falharam:');
    for (const error of results.errors) {
      console.log(`   - ${error.id}: ${error.issues.join(', ')}`);
    }
  }
  
  // Conclusão
  console.log('\n🎯 === CONCLUSÃO ===\n');
  
  if (successRate >= 80) {
    console.log('✅ Reprocessamento BEM-SUCEDIDO! Taxa de sucesso acima de 80%');
  } else if (successRate >= 60) {
    console.log('⚠️ Reprocessamento PARCIAL. Taxa de sucesso entre 60-80%');
    console.log('   Recomenda-se revisar os testes que falharam.');
  } else {
    console.log('❌ Reprocessamento FALHOU. Taxa de sucesso abaixo de 60%');
    console.log('   É necessário executar o reprocessamento novamente.');
  }
  
  // Recomendações
  if (results.failed > 0) {
    console.log('\n💡 === RECOMENDAÇÕES ===\n');
    
    const failedCategories = Object.entries(results.byCategory)
      .filter(([_, stats]) => stats.failed > 0)
      .map(([cat, _]) => cat);
    
    if (failedCategories.includes('Regime Urbanístico')) {
      console.log('• Verificar importação da planilha Excel de regime urbanístico');
      console.log('• Confirmar que todos os campos foram mapeados corretamente');
    }
    
    if (failedCategories.includes('Legislação')) {
      console.log('• Revisar chunking de documentos legais (LUOS e Plano Diretor)');
      console.log('• Verificar se artigos estão sendo preservados integralmente');
    }
    
    if (failedCategories.includes('Instrumentos Urbanísticos')) {
      console.log('• Verificar embeddings do documento PDPOA2025-QA.docx');
      console.log('• Confirmar que pares Q&A estão sendo preservados');
    }
  }
  
  process.exit(results.failed > results.total * 0.4 ? 1 : 0);
}

// Executar validação
runValidation().catch(console.error);