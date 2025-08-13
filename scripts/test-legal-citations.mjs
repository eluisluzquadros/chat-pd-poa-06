#!/usr/bin/env node

import { createClient } from '@supabase/supabase-js';
import fetch from 'node-fetch';
import dotenv from 'dotenv';
import path from 'path';
import { fileURLToPath } from 'url';
import chalk from 'chalk';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

dotenv.config({ path: path.join(__dirname, '..', '.env.local') });

const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL;
const SUPABASE_ANON_KEY = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

if (!SUPABASE_URL || !SUPABASE_ANON_KEY) {
  console.error(chalk.red('❌ Erro: Variáveis de ambiente não configuradas'));
  process.exit(1);
}

const supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY);

console.log(chalk.blue('\n🔍 TESTE DE CITAÇÕES LEGAIS NO PIPELINE RAG\n'));
console.log(chalk.gray('=' .repeat(60)));

// Casos de teste que exigem citação de artigos específicos
const testCases = [
  {
    id: 1,
    question: "Qual artigo da LUOS trata da Certificação em Sustentabilidade Ambiental?",
    expectedArticle: "Art. 81",
    expectedInciso: "III",
    expectedLaw: "LUOS",
    description: "Certificação em Sustentabilidade"
  },
  {
    id: 2,
    question: "O que a LUOS diz sobre o 4º Distrito?",
    expectedArticle: "Art. 74",
    expectedLaw: "LUOS",
    description: "4º Distrito"
  },
  {
    id: 3,
    question: "Qual artigo trata das ZEIS segundo o PDUS?",
    expectedArticle: "Art.",
    expectedLaw: "PDUS",
    description: "ZEIS - Zonas Especiais de Interesse Social"
  },
  {
    id: 4,
    question: "O que diz o artigo sobre Outorga Onerosa na LUOS?",
    expectedArticle: "Art. 86",
    expectedLaw: "LUOS",
    description: "Outorga Onerosa"
  },
  {
    id: 5,
    question: "Qual artigo da LUOS define o Estudo de Impacto de Vizinhança?",
    expectedArticle: "Art. 89",
    expectedLaw: "LUOS",
    description: "Estudo de Impacto de Vizinhança (EIV)"
  },
  {
    id: 6,
    question: "O que estabelece o PDUS sobre instrumentos de política urbana?",
    expectedArticle: "Art.",
    expectedLaw: "PDUS",
    description: "Instrumentos de Política Urbana"
  },
  {
    id: 7,
    question: "Quais são as regras do artigo sobre altura máxima de edificação?",
    expectedArticle: "Art. 81",
    expectedLaw: "LUOS",
    description: "Altura Máxima de Edificação"
  },
  {
    id: 8,
    question: "O que define o coeficiente de aproveitamento segundo a LUOS?",
    expectedArticle: "Art. 82",
    expectedLaw: "LUOS",
    description: "Coeficiente de Aproveitamento"
  }
];

// Função para testar uma query
async function testQuery(testCase) {
  console.log(chalk.cyan(`\n📝 Teste ${testCase.id}: ${testCase.description}`));
  console.log(chalk.gray(`   Pergunta: "${testCase.question}"`));
  
  const startTime = Date.now();
  
  try {
    // Chamar o pipeline RAG
    const response = await fetch(`${SUPABASE_URL}/functions/v1/agentic-rag`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${SUPABASE_ANON_KEY}`,
      },
      body: JSON.stringify({
        query: testCase.question,
        sessionId: `test-legal-${Date.now()}`,
        bypassCache: true
      })
    });

    if (!response.ok) {
      throw new Error(`HTTP error! status: ${response.status}`);
    }

    const result = await response.json();
    const responseTime = Date.now() - startTime;
    
    // Analisar a resposta
    const responseText = result.response || '';
    
    // Verificar se contém citação de artigo
    const hasArticleCitation = responseText.includes(testCase.expectedArticle) || 
                              responseText.match(/Art\.?\s*\d+/i);
    
    // Verificar se menciona a lei correta
    const mentionsCorrectLaw = responseText.includes(testCase.expectedLaw);
    
    // Verificar se tem inciso quando esperado
    const hasInciso = !testCase.expectedInciso || 
                     responseText.includes(testCase.expectedInciso) ||
                     responseText.match(/Inciso\s+[IVX]+/i);
    
    // Extrair citações encontradas
    const citationsFound = responseText.match(/Art\.?\s*\d+(?:\s*-?\s*[IVX]+)?/gi) || [];
    
    // Calcular score
    let score = 0;
    let maxScore = 0;
    
    // Critério 1: Tem alguma citação de artigo (30 pontos)
    maxScore += 30;
    if (hasArticleCitation) score += 30;
    
    // Critério 2: Cita o artigo correto (40 pontos)
    maxScore += 40;
    if (responseText.includes(testCase.expectedArticle)) score += 40;
    
    // Critério 3: Menciona a lei correta (20 pontos)
    maxScore += 20;
    if (mentionsCorrectLaw) score += 20;
    
    // Critério 4: Inclui inciso quando necessário (10 pontos)
    if (testCase.expectedInciso) {
      maxScore += 10;
      if (hasInciso) score += 10;
    }
    
    const percentage = Math.round((score / maxScore) * 100);
    const passed = percentage >= 70;
    
    // Exibir resultado
    if (passed) {
      console.log(chalk.green(`   ✅ PASSOU (${percentage}%)`));
    } else {
      console.log(chalk.red(`   ❌ FALHOU (${percentage}%)`));
    }
    
    console.log(chalk.gray(`   Tempo: ${responseTime}ms`));
    console.log(chalk.gray(`   Citações encontradas: ${citationsFound.join(', ') || 'Nenhuma'}`));
    
    // Detalhes da análise
    console.log(chalk.gray('\n   Análise detalhada:'));
    console.log(chalk.gray(`   - Tem citação de artigo: ${hasArticleCitation ? '✓' : '✗'}`));
    console.log(chalk.gray(`   - Artigo correto (${testCase.expectedArticle}): ${responseText.includes(testCase.expectedArticle) ? '✓' : '✗'}`));
    console.log(chalk.gray(`   - Lei correta (${testCase.expectedLaw}): ${mentionsCorrectLaw ? '✓' : '✗'}`));
    if (testCase.expectedInciso) {
      console.log(chalk.gray(`   - Inciso correto (${testCase.expectedInciso}): ${hasInciso ? '✓' : '✗'}`));
    }
    
    // Mostrar trecho relevante da resposta
    const relevantPart = responseText.substring(0, 300);
    console.log(chalk.gray(`\n   Trecho da resposta:`));
    console.log(chalk.gray(`   "${relevantPart}..."`));
    
    return {
      testCase,
      passed,
      score: percentage,
      responseTime,
      citationsFound,
      response: responseText
    };
    
  } catch (error) {
    console.log(chalk.red(`   ❌ ERRO: ${error.message}`));
    return {
      testCase,
      passed: false,
      score: 0,
      error: error.message
    };
  }
}

// Executar todos os testes
async function runAllTests() {
  console.log(chalk.yellow('\n🚀 Iniciando testes de citações legais...'));
  console.log(chalk.gray(`   Testando ${testCases.length} casos`));
  
  const results = [];
  
  for (const testCase of testCases) {
    const result = await testQuery(testCase);
    results.push(result);
    
    // Pequena pausa entre testes
    await new Promise(resolve => setTimeout(resolve, 1000));
  }
  
  // Relatório final
  console.log(chalk.blue('\n' + '=' .repeat(60)));
  console.log(chalk.blue('📊 RELATÓRIO FINAL'));
  console.log(chalk.blue('=' .repeat(60)));
  
  const passed = results.filter(r => r.passed).length;
  const failed = results.filter(r => !r.passed).length;
  const avgScore = Math.round(
    results.reduce((acc, r) => acc + (r.score || 0), 0) / results.length
  );
  
  console.log(chalk.white(`\n📈 Estatísticas:`));
  console.log(chalk.green(`   ✅ Passou: ${passed}/${testCases.length}`));
  console.log(chalk.red(`   ❌ Falhou: ${failed}/${testCases.length}`));
  console.log(chalk.yellow(`   📊 Score médio: ${avgScore}%`));
  
  // Taxa de sucesso
  const successRate = Math.round((passed / testCases.length) * 100);
  
  console.log(chalk.white(`\n🎯 Taxa de Sucesso: ${successRate}%`));
  
  if (successRate >= 80) {
    console.log(chalk.green('   ✅ Sistema está citando artigos adequadamente!'));
  } else if (successRate >= 50) {
    console.log(chalk.yellow('   ⚠️ Sistema precisa melhorar citações de artigos'));
  } else {
    console.log(chalk.red('   ❌ Sistema está falhando em citar artigos de lei'));
  }
  
  // Listar casos que falharam
  if (failed > 0) {
    console.log(chalk.red('\n❌ Casos que falharam:'));
    results
      .filter(r => !r.passed)
      .forEach(r => {
        console.log(chalk.red(`   - Teste ${r.testCase.id}: ${r.testCase.description} (${r.score}%)`));
      });
  }
  
  // Análise de problemas comuns
  console.log(chalk.yellow('\n🔍 Análise de Problemas:'));
  
  const noCitations = results.filter(r => !r.citationsFound || r.citationsFound.length === 0).length;
  const wrongArticles = results.filter(r => r.citationsFound && r.citationsFound.length > 0 && r.score < 70).length;
  
  if (noCitations > 0) {
    console.log(chalk.red(`   - ${noCitations} respostas sem nenhuma citação de artigo`));
  }
  if (wrongArticles > 0) {
    console.log(chalk.yellow(`   - ${wrongArticles} respostas com artigos incorretos`));
  }
  
  // Recomendações
  console.log(chalk.cyan('\n💡 Recomendações:'));
  if (successRate < 80) {
    console.log(chalk.cyan('   1. Verificar se o query-analyzer está detectando queries legais'));
    console.log(chalk.cyan('   2. Confirmar que enhanced-vector-search retorna metadados de artigos'));
    console.log(chalk.cyan('   3. Validar que response-synthesizer formata citações corretamente'));
    console.log(chalk.cyan('   4. Revisar embeddings dos documentos legais na base'));
  }
  
  // Salvar relatório
  const report = {
    timestamp: new Date().toISOString(),
    totalTests: testCases.length,
    passed,
    failed,
    successRate,
    avgScore,
    results: results.map(r => ({
      id: r.testCase.id,
      description: r.testCase.description,
      passed: r.passed,
      score: r.score,
      citationsFound: r.citationsFound
    }))
  };
  
  const fs = await import('fs');
  const reportPath = path.join(__dirname, '..', 'test-reports', `legal-citations-${Date.now()}.json`);
  
  // Criar diretório se não existir
  const reportDir = path.dirname(reportPath);
  if (!fs.existsSync(reportDir)) {
    fs.mkdirSync(reportDir, { recursive: true });
  }
  
  fs.writeFileSync(reportPath, JSON.stringify(report, null, 2));
  console.log(chalk.gray(`\n📁 Relatório salvo em: ${reportPath}`));
}

// Executar testes
runAllTests().catch(error => {
  console.error(chalk.red('❌ Erro fatal:'), error);
  process.exit(1);
});