#!/usr/bin/env node

/**
 * Teste de Validação do /chat endpoint
 * Valida se o agentic-rag consegue responder corretamente usando apenas a base do Supabase
 */

import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

dotenv.config({ path: join(__dirname, '.env') });

const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL;
const SUPABASE_KEY = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

if (!SUPABASE_URL || !SUPABASE_KEY) {
  console.error('❌ Missing SUPABASE_URL or SUPABASE_KEY');
  process.exit(1);
}

const supabase = createClient(SUPABASE_URL, SUPABASE_KEY);

// Definição dos testes com validação de conteúdo
const testCases = [
  {
    id: 1,
    question: "escreva um resumo de até 25 palavras sobre a lei do plano diretor de porto alegre",
    expectedKeywords: ['plano', 'diretor', 'porto alegre', 'urbano', 'sustentável'],
    maxWords: 25,
    description: "Resumo conciso do plano diretor"
  },
  {
    id: 2,
    question: "qual é a altura máxima do aberta dos morros",
    expectedKeywords: ['metros', 'altura', 'ZOT'],
    expectedValues: [/\d+\s*metros?/i],
    description: "Altura máxima de Aberta dos Morros"
  },
  {
    id: 3,
    question: 'quantos bairros estão "Protegidos pelo Sistema Atual" para proteção contra enchentes?',
    expectedKeywords: ['bairros', 'proteção', 'enchente'],
    expectedValues: [/\d+\s*bairros?/i],
    description: "Quantidade de bairros protegidos"
  },
  {
    id: 4,
    question: "qual artigo da LUOS trata da Certificação em Sustentabilidade Ambiental?",
    expectedKeywords: ['artigo', 'LUOS', 'sustentabilidade'],
    expectedValues: [/art\.?\s*\d+/i],
    description: "Artigo sobre sustentabilidade"
  },
  {
    id: 5,
    question: "como o Regime Volumétrico é tratado na LUOS?",
    expectedKeywords: ['regime', 'volumétrico', 'LUOS', 'altura', 'coeficiente'],
    description: "Regime volumétrico na LUOS"
  },
  {
    id: 6,
    question: "o que afirma literalmente o Art 1º da LUOS?",
    expectedKeywords: ['art', '1', 'LUOS', 'lei'],
    mustContain: ['institui', 'uso', 'ocupação', 'solo'],
    description: "Conteúdo literal do Art. 1º LUOS"
  },
  {
    id: 7,
    question: "do que se trata o Art. 119 da LUOS?",
    expectedKeywords: ['art', '119', 'LUOS'],
    description: "Conteúdo do Art. 119 LUOS"
  },
  {
    id: 8,
    question: "o Art. 3º O Plano Diretor Urbano Sustentável de Porto Alegre será regido por princípios fundamentais. quais são eles?",
    expectedKeywords: ['princípios', 'fundamentais', 'plano diretor'],
    mustContain: ['sustentabilidade', 'participação', 'equidade'],
    description: "Princípios do Art. 3º"
  },
  {
    id: 9,
    question: "o que posso construir no bairro Petrópolis",
    expectedKeywords: ['Petrópolis', 'altura', 'coeficiente', 'metros'],
    expectedValues: [/\d+\s*metros?/i, /\d+[,\.]\d+/],
    description: "Parâmetros construtivos de Petrópolis"
  },
  {
    id: 10,
    question: "qual a altura máxima da construção dos prédios em Porto Alegre?",
    expectedKeywords: ['altura', 'máxima', 'metros', 'porto alegre'],
    expectedValues: [/\d+\s*metros?/i],
    description: "Altura máxima geral em POA"
  },
  {
    id: 11,
    question: "o que diz o artigo 38 da luos?",
    expectedKeywords: ['artigo', '38', 'LUOS'],
    description: "Conteúdo do Art. 38 LUOS"
  },
  {
    id: 12,
    question: "o que diz o artigo 5?",
    expectedKeywords: ['artigo', '5', 'lei'],
    mustContain: ['LUOS', 'PDUS'],
    description: "Art. 5 contextualizando diferentes leis"
  },
  {
    id: 13,
    question: "resuma a parte I do plano diretor",
    expectedKeywords: ['parte', 'I', 'plano diretor', 'título', 'capítulo'],
    description: "Resumo da Parte I com estrutura hierárquica"
  },
  {
    id: 14,
    question: "resuma o conteúdo do título 1 do pdus",
    expectedKeywords: ['título', '1', 'PDUS', 'disposições', 'preliminares'],
    description: "Resumo do Título 1 do PDUS"
  },
  {
    id: 15,
    question: "o que diz o artigo 1 do pdus",
    expectedKeywords: ['artigo', '1', 'PDUS', 'plano diretor'],
    mustContain: ['institui', 'Porto Alegre'],
    description: "Conteúdo do Art. 1 do PDUS"
  }
];

// Função para validar resposta
function validateResponse(testCase, response) {
  const result = {
    passed: true,
    issues: [],
    score: 100
  };

  const responseText = response.toLowerCase();

  // 1. Validar palavras-chave esperadas
  if (testCase.expectedKeywords) {
    const foundKeywords = testCase.expectedKeywords.filter(kw => 
      responseText.includes(kw.toLowerCase())
    );
    const keywordScore = (foundKeywords.length / testCase.expectedKeywords.length) * 100;
    
    if (keywordScore < 60) {
      result.issues.push(`Faltam palavras-chave: ${testCase.expectedKeywords.filter(kw => 
        !responseText.includes(kw.toLowerCase())
      ).join(', ')}`);
      result.score -= (100 - keywordScore) * 0.3;
    }
  }

  // 2. Validar valores esperados (números, artigos)
  if (testCase.expectedValues) {
    const foundValues = testCase.expectedValues.filter(pattern => 
      pattern.test(response)
    );
    
    if (foundValues.length === 0) {
      result.issues.push('Não encontrou valores numéricos esperados');
      result.score -= 30;
    }
  }

  // 3. Validar conteúdo obrigatório
  if (testCase.mustContain) {
    const foundMust = testCase.mustContain.filter(term => 
      responseText.includes(term.toLowerCase())
    );
    
    if (foundMust.length < testCase.mustContain.length * 0.5) {
      result.issues.push(`Falta conteúdo essencial: ${testCase.mustContain.filter(term => 
        !responseText.includes(term.toLowerCase())
      ).join(', ')}`);
      result.score -= 40;
    }
  }

  // 4. Validar limite de palavras
  if (testCase.maxWords) {
    const wordCount = response.split(/\s+/).length;
    if (wordCount > testCase.maxWords) {
      result.issues.push(`Excedeu limite de ${testCase.maxWords} palavras (${wordCount} palavras)`);
      result.score -= 20;
    }
  }

  // 5. Verificar se não é resposta genérica/erro
  const errorPhrases = [
    'não encontrei informações',
    'não há dados',
    'erro ao processar',
    'não foi possível',
    'contexto fornecido não inclui'
  ];
  
  if (errorPhrases.some(phrase => responseText.includes(phrase))) {
    result.issues.push('Resposta indica falta de dados');
    result.score -= 50;
  }

  result.passed = result.score >= 60;
  return result;
}

// Função para testar uma pergunta
async function testQuestion(testCase, timeout = 30000) {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), timeout);
  
  try {
    console.log(`\n📝 Teste ${testCase.id}: ${testCase.description}`);
    console.log(`   Pergunta: "${testCase.question}"`);
    
    const startTime = Date.now();
    
    // Chamar o agentic-rag
    const { data, error } = await supabase.functions.invoke('agentic-rag', {
      body: {
        query: testCase.question,
        message: testCase.question,
        sessionId: `test-${testCase.id}-${Date.now()}`,
        userRole: 'tester',
        bypassCache: true,
        options: {
          useAgenticRAG: true,
          useKnowledgeGraph: true,
          useHierarchicalChunks: true
        }
      },
      signal: controller.signal
    });
    
    clearTimeout(timer);
    const responseTime = Date.now() - startTime;
    
    if (error) {
      console.log(`   ❌ Erro: ${error.message}`);
      return {
        ...testCase,
        success: false,
        error: error.message,
        responseTime
      };
    }
    
    if (!data || !data.response) {
      console.log(`   ❌ Resposta vazia`);
      return {
        ...testCase,
        success: false,
        error: 'Resposta vazia',
        responseTime
      };
    }
    
    // Validar conteúdo da resposta
    const validation = validateResponse(testCase, data.response);
    
    if (validation.passed) {
      console.log(`   ✅ Passou (Score: ${validation.score.toFixed(0)}%)`);
    } else {
      console.log(`   ❌ Falhou (Score: ${validation.score.toFixed(0)}%)`);
      validation.issues.forEach(issue => {
        console.log(`      ⚠️ ${issue}`);
      });
    }
    
    // Mostrar preview da resposta
    const preview = data.response.substring(0, 150).replace(/\n/g, ' ');
    console.log(`   📄 Resposta: "${preview}${data.response.length > 150 ? '...' : ''}"`);
    console.log(`   ⏱️ Tempo: ${responseTime}ms | Confiança: ${(data.confidence * 100).toFixed(0)}%`);
    
    return {
      ...testCase,
      success: validation.passed,
      score: validation.score,
      issues: validation.issues,
      response: data.response,
      confidence: data.confidence,
      responseTime,
      sources: data.sources
    };
    
  } catch (error) {
    clearTimeout(timer);
    
    if (error.name === 'AbortError') {
      console.log(`   ❌ Timeout após ${timeout}ms`);
      return {
        ...testCase,
        success: false,
        error: 'Timeout',
        responseTime: timeout
      };
    }
    
    console.log(`   ❌ Erro: ${error.message}`);
    return {
      ...testCase,
      success: false,
      error: error.message,
      responseTime: 0
    };
  }
}

// Função principal
async function main() {
  console.log('='.repeat(70));
  console.log('   VALIDAÇÃO DO ENDPOINT /CHAT COM AGENTIC-RAG');
  console.log('='.repeat(70));
  console.log(`\n📊 Total de testes: ${testCases.length}`);
  console.log('🎯 Objetivo: Validar conteúdo das respostas, não apenas presença\n');
  
  const results = [];
  let passed = 0;
  let failed = 0;
  let totalScore = 0;
  let totalTime = 0;
  
  // Executar testes sequencialmente
  for (const testCase of testCases) {
    const result = await testQuestion(testCase);
    results.push(result);
    
    if (result.success) {
      passed++;
      totalScore += result.score || 100;
    } else {
      failed++;
      totalScore += result.score || 0;
    }
    
    totalTime += result.responseTime || 0;
    
    // Pequena pausa entre testes
    await new Promise(resolve => setTimeout(resolve, 1000));
  }
  
  // Relatório final
  console.log('\n' + '='.repeat(70));
  console.log('   RELATÓRIO FINAL');
  console.log('='.repeat(70));
  
  const successRate = (passed / testCases.length) * 100;
  const avgScore = totalScore / testCases.length;
  const avgTime = totalTime / testCases.length;
  
  console.log(`\n📈 Taxa de Sucesso: ${successRate.toFixed(1)}% (${passed}/${testCases.length})`);
  console.log(`📊 Score Médio: ${avgScore.toFixed(1)}%`);
  console.log(`⏱️ Tempo Médio: ${avgTime.toFixed(0)}ms`);
  
  // Análise por categoria
  console.log('\n📋 Análise Detalhada:');
  
  const categories = {
    'Artigos LUOS': [4, 5, 6, 7, 11],
    'Artigos PDUS': [12, 14, 15],
    'Regime Urbanístico': [2, 9, 10],
    'Princípios e Estrutura': [1, 8, 13],
    'Proteção e Riscos': [3]
  };
  
  Object.entries(categories).forEach(([category, ids]) => {
    const categoryResults = results.filter(r => ids.includes(r.id));
    const categoryPassed = categoryResults.filter(r => r.success).length;
    const categoryRate = (categoryPassed / categoryResults.length) * 100;
    console.log(`   ${category}: ${categoryRate.toFixed(0)}% (${categoryPassed}/${categoryResults.length})`);
  });
  
  // Problemas mais comuns
  console.log('\n⚠️ Problemas Identificados:');
  const allIssues = results.flatMap(r => r.issues || []);
  const issueCount = {};
  allIssues.forEach(issue => {
    const key = issue.split(':')[0];
    issueCount[key] = (issueCount[key] || 0) + 1;
  });
  
  Object.entries(issueCount)
    .sort((a, b) => b[1] - a[1])
    .slice(0, 5)
    .forEach(([issue, count]) => {
      console.log(`   - ${issue}: ${count} ocorrências`);
    });
  
  // Testes que falharam
  if (failed > 0) {
    console.log('\n❌ Testes que Falharam:');
    results.filter(r => !r.success).forEach(r => {
      console.log(`   ${r.id}. ${r.description}`);
      if (r.issues && r.issues.length > 0) {
        r.issues.forEach(issue => console.log(`      - ${issue}`));
      }
    });
  }
  
  // Conclusão
  console.log('\n' + '='.repeat(70));
  if (successRate >= 80) {
    console.log('✅ SISTEMA APROVADO - Atende aos requisitos mínimos');
  } else if (successRate >= 60) {
    console.log('⚠️ SISTEMA PARCIALMENTE FUNCIONAL - Necessita melhorias');
  } else {
    console.log('❌ SISTEMA REPROVADO - Necessita correções urgentes');
  }
  
  console.log('\n💡 Recomendações:');
  if (avgScore < 80) {
    console.log('   - Melhorar extração de dados específicos (artigos, valores)');
  }
  if (avgTime > 10000) {
    console.log('   - Otimizar performance das queries');
  }
  if (results.some(r => r.error === 'Timeout')) {
    console.log('   - Resolver problemas de timeout em queries complexas');
  }
  
  console.log('\n' + '='.repeat(70));
  
  // Salvar resultados em arquivo JSON
  const fs = await import('fs');
  const reportData = {
    timestamp: new Date().toISOString(),
    summary: {
      total: testCases.length,
      passed,
      failed,
      successRate,
      avgScore,
      avgTime
    },
    results,
    issues: issueCount
  };
  
  fs.writeFileSync(
    'chat-validation-report.json',
    JSON.stringify(reportData, null, 2)
  );
  
  console.log('\n📄 Relatório salvo em: chat-validation-report.json');
}

// Executar testes
main().catch(console.error);