#!/usr/bin/env node

/**
 * Teste abrangente da base de conhecimento
 * Valida se o agentic-rag consegue responder corretamente usando apenas dados do Supabase
 */

import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

dotenv.config({ path: join(__dirname, '.env') });

const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL;
const SUPABASE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

if (!SUPABASE_URL || !SUPABASE_KEY) {
  console.error('❌ Missing Supabase credentials');
  process.exit(1);
}

const supabase = createClient(SUPABASE_URL, SUPABASE_KEY);

// Cores para melhor visualização
const colors = {
  reset: '\x1b[0m',
  green: '\x1b[32m',
  red: '\x1b[31m',
  yellow: '\x1b[33m',
  blue: '\x1b[34m',
  bold: '\x1b[1m',
  cyan: '\x1b[36m'
};

// Casos de teste com validações específicas
const testCases = [
  {
    id: 1,
    question: "escreva um resumo de até 25 palavras sobre a lei do plano diretor de porto alegre",
    expectedKeywords: ['plano diretor', 'Porto Alegre', 'desenvolvimento', 'urbano', 'sustentável'],
    maxWords: 25,
    category: 'resumo'
  },
  {
    id: 2,
    question: "qual é a altura máxima do aberta dos morros",
    expectedKeywords: ['Aberta dos Morros', 'altura', 'metros', 'ZOT'],
    expectedValues: ['33', '52', 'metros'],
    category: 'regime_urbanistico'
  },
  {
    id: 3,
    question: "quantos bairros estão 'Protegidos pelo Sistema Atual' para proteção contra enchentes?",
    expectedKeywords: ['bairros', 'protegidos', 'enchentes', 'sistema'],
    expectedNumber: true,
    category: 'dados_especificos'
  },
  {
    id: 4,
    question: "qual artigo da LUOS trata da Certificação em Sustentabilidade Ambiental?",
    expectedKeywords: ['artigo', 'LUOS', 'certificação', 'sustentabilidade', 'ambiental'],
    expectedPattern: /art(igo)?\.?\s*\d+/i,
    category: 'artigo_especifico'
  },
  {
    id: 5,
    question: "como o Regime Volumétrico é tratado na LUOS?",
    expectedKeywords: ['regime volumétrico', 'LUOS', 'altura', 'coeficiente'],
    minWords: 30,
    category: 'conceito'
  },
  {
    id: 6,
    question: "o que afirma literalmente o Art 1º da LUOS?",
    expectedKeywords: ['Art. 1º', 'LUOS', 'Lei de Uso e Ocupação do Solo'],
    literal: true,
    category: 'artigo_literal'
  },
  {
    id: 7,
    question: "do que se trata o Art. 119 da LUOS?",
    expectedKeywords: ['Art. 119', 'LUOS'],
    category: 'artigo_especifico'
  },
  {
    id: 8,
    question: "o Art. 3º O Plano Diretor Urbano Sustentável de Porto Alegre será regido por princípios fundamentais. quais são eles?",
    expectedKeywords: ['Art. 3º', 'princípios', 'fundamentais', 'PDUS'],
    expectedList: true,
    category: 'lista_principios'
  },
  {
    id: 9,
    question: "o que posso construir no bairro Petrópolis",
    expectedKeywords: ['Petrópolis', 'altura máxima', 'coeficiente', 'ZOT'],
    expectedValues: ['60 metros', '90 metros', '3,60', '6,50', '7,50'],
    category: 'regime_bairro'
  },
  {
    id: 10,
    question: "qual a altura máxima da construção dos prédios em Porto Alegre?",
    expectedKeywords: ['altura máxima', 'ZOT', 'varia', 'zona'],
    expectedExplanation: true,
    category: 'parametro_geral'
  },
  {
    id: 11,
    question: "o que diz o artigo 38 da luos?",
    expectedKeywords: ['artigo 38', 'LUOS'],
    category: 'artigo_especifico'
  },
  {
    id: 12,
    question: "o que diz o artigo 5?",
    expectedKeywords: ['artigo 5', 'LUOS', 'PDUS'],
    multipleAnswers: true,
    category: 'artigo_multiplas_leis'
  },
  {
    id: 13,
    question: "resuma a parte I do plano diretor",
    expectedKeywords: ['Parte I', 'plano diretor', 'título', 'capítulo'],
    hierarchical: true,
    category: 'estrutura_hierarquica'
  },
  {
    id: 14,
    question: "resuma o conteúdo do título 1 do pdus",
    expectedKeywords: ['Título 1', 'PDUS', 'disposições'],
    hierarchical: true,
    category: 'estrutura_hierarquica'
  },
  {
    id: 15,
    question: "o que diz o artigo 1 do pdus",
    expectedKeywords: ['artigo 1', 'PDUS', 'Plano Diretor'],
    category: 'artigo_especifico'
  }
];

// Função para validar resposta
function validateResponse(testCase, response) {
  const validation = {
    passed: true,
    issues: [],
    score: 0
  };
  
  const responseText = response.toLowerCase();
  
  // Validar palavras-chave esperadas
  if (testCase.expectedKeywords) {
    const foundKeywords = testCase.expectedKeywords.filter(keyword => 
      responseText.includes(keyword.toLowerCase())
    );
    
    const keywordScore = (foundKeywords.length / testCase.expectedKeywords.length) * 100;
    validation.score += keywordScore * 0.3;
    
    if (foundKeywords.length < testCase.expectedKeywords.length * 0.6) {
      validation.issues.push(`Faltam palavras-chave: ${testCase.expectedKeywords.filter(k => 
        !foundKeywords.includes(k)
      ).join(', ')}`);
      validation.passed = false;
    }
  }
  
  // Validar valores esperados
  if (testCase.expectedValues) {
    const foundValues = testCase.expectedValues.filter(value => 
      response.includes(value)
    );
    
    const valueScore = (foundValues.length / testCase.expectedValues.length) * 100;
    validation.score += valueScore * 0.4;
    
    if (foundValues.length === 0) {
      validation.issues.push(`Nenhum valor esperado encontrado: ${testCase.expectedValues.join(', ')}`);
      validation.passed = false;
    }
  }
  
  // Validar limite de palavras
  if (testCase.maxWords) {
    const wordCount = response.split(/\s+/).length;
    if (wordCount > testCase.maxWords) {
      validation.issues.push(`Resposta muito longa: ${wordCount} palavras (máximo: ${testCase.maxWords})`);
      validation.passed = false;
    } else {
      validation.score += 10;
    }
  }
  
  // Validar mínimo de palavras
  if (testCase.minWords) {
    const wordCount = response.split(/\s+/).length;
    if (wordCount < testCase.minWords) {
      validation.issues.push(`Resposta muito curta: ${wordCount} palavras (mínimo: ${testCase.minWords})`);
      validation.passed = false;
    } else {
      validation.score += 10;
    }
  }
  
  // Validar padrão regex
  if (testCase.expectedPattern) {
    if (!testCase.expectedPattern.test(response)) {
      validation.issues.push('Padrão esperado não encontrado');
      validation.passed = false;
    } else {
      validation.score += 20;
    }
  }
  
  // Validar se contém número
  if (testCase.expectedNumber) {
    if (!/\d+/.test(response)) {
      validation.issues.push('Resposta deveria conter um número');
      validation.passed = false;
    } else {
      validation.score += 10;
    }
  }
  
  // Validar se é lista
  if (testCase.expectedList) {
    const hasListMarkers = /(\d+[\.\)]\s|[-•]\s|[a-z]\)\s)/gi.test(response);
    if (!hasListMarkers) {
      validation.issues.push('Resposta deveria estar em formato de lista');
      validation.passed = false;
    } else {
      validation.score += 10;
    }
  }
  
  // Normalizar score
  validation.score = Math.min(100, Math.max(0, validation.score));
  
  return validation;
}

// Função para testar com Edge Function
async function testWithEdgeFunction(testCase) {
  try {
    const response = await fetch(`${SUPABASE_URL}/functions/v1/agentic-rag`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${SUPABASE_KEY}`
      },
      body: JSON.stringify({
        query: testCase.question,
        sessionId: `test-${Date.now()}`
      })
    });
    
    if (!response.ok) {
      throw new Error(`HTTP ${response.status}`);
    }
    
    const result = await response.json();
    return result.response || '';
  } catch (error) {
    console.error(`Erro ao chamar edge function: ${error.message}`);
    return null;
  }
}

// Função para buscar dados diretamente (validação adicional)
async function validateDataInDatabase(testCase) {
  const checks = [];
  
  // Verificar se dados relacionados existem no banco
  if (testCase.category === 'regime_urbanistico' || testCase.category === 'regime_bairro') {
    const bairroName = testCase.question.match(/aberta dos morros|petrópolis/i)?.[0];
    if (bairroName) {
      const { data, count } = await supabase
        .from('legal_articles')
        .select('*', { count: 'exact', head: true })
        .eq('document_type', 'REGIME_FALLBACK')
        .ilike('full_content', `%${bairroName}%`);
      
      checks.push({
        type: 'regime_data',
        found: count > 0,
        count
      });
    }
  }
  
  if (testCase.category === 'artigo_especifico' || testCase.category === 'artigo_literal') {
    const articleMatch = testCase.question.match(/art(igo)?\.?\s*(\d+)/i);
    if (articleMatch) {
      const articleNumber = parseInt(articleMatch[2]);
      const { data, count } = await supabase
        .from('legal_articles')
        .select('*', { count: 'exact', head: true })
        .eq('article_number', articleNumber);
      
      checks.push({
        type: 'article_data',
        found: count > 0,
        count
      });
    }
  }
  
  return checks;
}

// Função principal de teste
async function runTests() {
  console.log('\n' + '='.repeat(70));
  console.log(`${colors.bold}${colors.cyan}    TESTE ABRANGENTE DA BASE DE CONHECIMENTO${colors.reset}`);
  console.log('='.repeat(70));
  console.log('Validando respostas do agentic-rag com a base de dados do Supabase\n');
  
  const results = {
    total: testCases.length,
    passed: 0,
    failed: 0,
    scores: []
  };
  
  for (const testCase of testCases) {
    console.log(`${colors.bold}Teste #${testCase.id}:${colors.reset} ${testCase.question.substring(0, 60)}...`);
    
    // Verificar dados no banco
    const dbChecks = await validateDataInDatabase(testCase);
    const hasDataInDB = dbChecks.every(check => check.found);
    
    if (dbChecks.length > 0) {
      console.log(`  📊 Dados no BD: ${hasDataInDB ? '✅' : '⚠️'} ${dbChecks.map(c => 
        `${c.type}(${c.count})`).join(', ')}`);
    }
    
    // Testar com Edge Function
    const response = await testWithEdgeFunction(testCase);
    
    if (response) {
      const validation = validateResponse(testCase, response);
      
      if (validation.passed) {
        console.log(`  ${colors.green}✅ PASSOU${colors.reset} (Score: ${validation.score.toFixed(0)}%)`);
        results.passed++;
      } else {
        console.log(`  ${colors.red}❌ FALHOU${colors.reset} (Score: ${validation.score.toFixed(0)}%)`);
        validation.issues.forEach(issue => {
          console.log(`     ${colors.yellow}⚠️ ${issue}${colors.reset}`);
        });
        results.failed++;
      }
      
      results.scores.push(validation.score);
      
      // Mostrar preview da resposta
      const preview = response.substring(0, 150).replace(/\n/g, ' ');
      console.log(`  📝 Resposta: "${preview}${response.length > 150 ? '...' : ''}"`);
    } else {
      console.log(`  ${colors.red}❌ SEM RESPOSTA${colors.reset}`);
      results.failed++;
      results.scores.push(0);
    }
    
    console.log('');
  }
  
  // Resumo final
  console.log('='.repeat(70));
  console.log(`${colors.bold}    RESUMO DOS RESULTADOS${colors.reset}`);
  console.log('='.repeat(70));
  
  const avgScore = results.scores.reduce((a, b) => a + b, 0) / results.scores.length;
  const successRate = (results.passed / results.total) * 100;
  
  console.log(`${colors.bold}Total de Testes:${colors.reset} ${results.total}`);
  console.log(`${colors.green}Passou:${colors.reset} ${results.passed}`);
  console.log(`${colors.red}Falhou:${colors.reset} ${results.failed}`);
  console.log(`${colors.blue}Taxa de Sucesso:${colors.reset} ${successRate.toFixed(1)}%`);
  console.log(`${colors.cyan}Score Médio:${colors.reset} ${avgScore.toFixed(1)}%`);
  
  // Análise por categoria
  console.log(`\n${colors.bold}Análise por Categoria:${colors.reset}`);
  const categories = {};
  testCases.forEach((tc, i) => {
    if (!categories[tc.category]) {
      categories[tc.category] = { total: 0, score: 0 };
    }
    categories[tc.category].total++;
    categories[tc.category].score += results.scores[i] || 0;
  });
  
  Object.entries(categories).forEach(([cat, data]) => {
    const avgCatScore = data.score / data.total;
    const status = avgCatScore >= 70 ? '✅' : avgCatScore >= 50 ? '⚠️' : '❌';
    console.log(`  ${status} ${cat}: ${avgCatScore.toFixed(0)}%`);
  });
  
  // Conclusão
  console.log('\n' + '='.repeat(70));
  if (successRate >= 80) {
    console.log(`${colors.green}${colors.bold}✅ SISTEMA APROVADO!${colors.reset}`);
    console.log('A base de conhecimento está respondendo adequadamente.');
  } else if (successRate >= 60) {
    console.log(`${colors.yellow}${colors.bold}⚠️ SISTEMA PRECISA DE MELHORIAS${colors.reset}`);
    console.log('Algumas áreas precisam de ajustes para melhor performance.');
  } else {
    console.log(`${colors.red}${colors.bold}❌ SISTEMA REPROVADO${colors.reset}`);
    console.log('A base de conhecimento precisa de correções significativas.');
  }
  
  console.log('='.repeat(70));
}

// Executar testes
runTests().catch(console.error);