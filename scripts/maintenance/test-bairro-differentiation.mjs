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
const SUPABASE_SERVICE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!SUPABASE_URL || !SUPABASE_ANON_KEY) {
  console.error(chalk.red('❌ Erro: Variáveis de ambiente não configuradas'));
  process.exit(1);
}

const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_KEY || SUPABASE_ANON_KEY);

console.log(chalk.blue('\n🏘️ TESTE DE DIFERENCIAÇÃO DE BAIRROS\n'));
console.log(chalk.gray('=' .repeat(60)));

// Primeiro, vamos buscar os bairros reais no banco
async function getActualNeighborhoods() {
  console.log(chalk.yellow('📍 Buscando bairros na base de dados...'));
  
  const { data, error } = await supabase
    .from('regime_urbanistico')
    .select('bairro')
    .order('bairro');
  
  if (error) {
    console.error(chalk.red('Erro ao buscar bairros:'), error);
    return [];
  }
  
  // Obter lista única de bairros
  const uniqueBairros = [...new Set(data.map(d => d.bairro))];
  console.log(chalk.green(`   Encontrados ${uniqueBairros.length} bairros únicos`));
  
  return uniqueBairros;
}

// Identificar bairros com nomes similares
function findSimilarNeighborhoods(bairros) {
  const similar = [];
  
  for (let i = 0; i < bairros.length; i++) {
    for (let j = i + 1; j < bairros.length; j++) {
      const b1 = bairros[i];
      const b2 = bairros[j];
      
      // Verificar se um contém o outro (possível confusão)
      if (b1.includes(b2) || b2.includes(b1)) {
        similar.push({ pair: [b1, b2], type: 'substring' });
      }
      
      // Verificar se têm palavras em comum
      const words1 = b1.split(/\s+/);
      const words2 = b2.split(/\s+/);
      const commonWords = words1.filter(w => words2.includes(w) && w.length > 3);
      
      if (commonWords.length > 0 && !similar.some(s => 
        (s.pair[0] === b1 && s.pair[1] === b2) || 
        (s.pair[0] === b2 && s.pair[1] === b1)
      )) {
        similar.push({ 
          pair: [b1, b2], 
          type: 'common_words',
          common: commonWords 
        });
      }
    }
  }
  
  return similar;
}

// Casos de teste para diferenciação
const testCases = [
  {
    id: 1,
    query: "Qual a altura máxima no bairro Boa Vista?",
    expectedBairro: "BOA VISTA",
    notExpected: ["BOA VISTA DO SUL"],
    description: "Diferenciação: Boa Vista vs Boa Vista do Sul"
  },
  {
    id: 2,
    query: "Quais são os parâmetros construtivos da Boa Vista do Sul?",
    expectedBairro: "BOA VISTA DO SUL",
    notExpected: ["BOA VISTA"],
    description: "Diferenciação: Boa Vista do Sul vs Boa Vista"
  },
  {
    id: 3,
    query: "O que posso construir em Vila Nova?",
    expectedBairro: "VILA NOVA",
    notExpected: ["VILA NOVA DO SUL"],
    description: "Diferenciação: Vila Nova vs Vila Nova do Sul"
  },
  {
    id: 4,
    query: "Altura máxima na Vila Nova do Sul",
    expectedBairro: "VILA NOVA DO SUL",
    notExpected: ["VILA NOVA"],
    description: "Diferenciação: Vila Nova do Sul vs Vila Nova"
  },
  {
    id: 5,
    query: "Regime urbanístico do Centro",
    expectedBairro: "CENTRO",
    notExpected: ["CENTRO HISTÓRICO", "CENTRO SUL"],
    description: "Diferenciação: Centro vs Centro Histórico"
  },
  {
    id: 6,
    query: "Parâmetros do Centro Histórico",
    expectedBairro: "CENTRO HISTÓRICO",
    notExpected: ["CENTRO"],
    description: "Diferenciação: Centro Histórico vs Centro"
  }
];

// Função para testar uma query
async function testBairroQuery(testCase, actualBairros) {
  console.log(chalk.cyan(`\n📝 Teste ${testCase.id}: ${testCase.description}`));
  console.log(chalk.gray(`   Pergunta: "${testCase.query}"`));
  
  // Verificar se o bairro esperado existe no banco
  const expectedExists = actualBairros.includes(testCase.expectedBairro);
  if (!expectedExists) {
    console.log(chalk.yellow(`   ⚠️ Bairro esperado "${testCase.expectedBairro}" não existe no banco`));
    // Tentar encontrar correspondência
    const similar = actualBairros.filter(b => 
      b.includes(testCase.expectedBairro.split(' ')[0])
    );
    if (similar.length > 0) {
      console.log(chalk.yellow(`   Bairros similares encontrados: ${similar.join(', ')}`));
    }
  }
  
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
        query: testCase.query,
        sessionId: `test-bairro-${Date.now()}`,
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
    
    // Verificar se menciona o bairro correto
    const mentionsCorrectBairro = responseText.includes(testCase.expectedBairro) ||
                                  responseText.toLowerCase().includes(testCase.expectedBairro.toLowerCase());
    
    // Verificar se NÃO menciona bairros errados
    let mentionsWrongBairro = false;
    let wrongBairroFound = '';
    
    for (const wrong of testCase.notExpected) {
      if (actualBairros.includes(wrong) && 
          (responseText.includes(wrong) || responseText.toLowerCase().includes(wrong.toLowerCase()))) {
        mentionsWrongBairro = true;
        wrongBairroFound = wrong;
        break;
      }
    }
    
    // Extrair todos os bairros mencionados
    const bairrosMentioned = actualBairros.filter(b => 
      responseText.includes(b) || responseText.toLowerCase().includes(b.toLowerCase())
    );
    
    // Calcular score
    let score = 0;
    let maxScore = 100;
    
    // Critério 1: Menciona o bairro correto (50 pontos)
    if (mentionsCorrectBairro) score += 50;
    
    // Critério 2: NÃO menciona bairros errados (50 pontos)
    if (!mentionsWrongBairro) score += 50;
    
    const passed = score === 100;
    
    // Exibir resultado
    if (passed) {
      console.log(chalk.green(`   ✅ PASSOU (100%)`));
    } else {
      console.log(chalk.red(`   ❌ FALHOU (${score}%)`));
    }
    
    console.log(chalk.gray(`   Tempo: ${responseTime}ms`));
    console.log(chalk.gray(`   Bairros mencionados: ${bairrosMentioned.join(', ') || 'Nenhum'}`));
    
    // Detalhes da análise
    console.log(chalk.gray('\n   Análise detalhada:'));
    console.log(chalk.gray(`   - Menciona bairro correto (${testCase.expectedBairro}): ${mentionsCorrectBairro ? '✓' : '✗'}`));
    console.log(chalk.gray(`   - Evita bairros incorretos: ${!mentionsWrongBairro ? '✓' : '✗'}`));
    
    if (mentionsWrongBairro) {
      console.log(chalk.red(`   - ⚠️ Mencionou incorretamente: ${wrongBairroFound}`));
    }
    
    // Mostrar trecho relevante da resposta
    const relevantPart = responseText.substring(0, 300);
    console.log(chalk.gray(`\n   Trecho da resposta:`));
    console.log(chalk.gray(`   "${relevantPart}..."`));
    
    return {
      testCase,
      passed,
      score,
      responseTime,
      bairrosMentioned,
      mentionsWrongBairro,
      wrongBairroFound
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
  // Buscar bairros reais
  const actualBairros = await getActualNeighborhoods();
  
  if (actualBairros.length === 0) {
    console.error(chalk.red('❌ Não foi possível obter lista de bairros'));
    return;
  }
  
  // Identificar pares similares
  console.log(chalk.yellow('\n🔍 Analisando bairros com nomes similares...'));
  const similarPairs = findSimilarNeighborhoods(actualBairros);
  
  if (similarPairs.length > 0) {
    console.log(chalk.yellow(`   Encontrados ${similarPairs.length} pares de bairros similares:`));
    similarPairs.slice(0, 10).forEach(s => {
      console.log(chalk.gray(`   - ${s.pair[0]} ↔ ${s.pair[1]} (${s.type})`));
    });
    if (similarPairs.length > 10) {
      console.log(chalk.gray(`   ... e mais ${similarPairs.length - 10} pares`));
    }
  }
  
  console.log(chalk.yellow('\n🚀 Iniciando testes de diferenciação...'));
  console.log(chalk.gray(`   Testando ${testCases.length} casos`));
  
  const results = [];
  
  for (const testCase of testCases) {
    const result = await testBairroQuery(testCase, actualBairros);
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
    results.reduce((acc, r) => acc + r.score, 0) / results.length
  );
  
  console.log(chalk.white(`\n📈 Estatísticas:`));
  console.log(chalk.green(`   ✅ Passou: ${passed}/${testCases.length}`));
  console.log(chalk.red(`   ❌ Falhou: ${failed}/${testCases.length}`));
  console.log(chalk.yellow(`   📊 Score médio: ${avgScore}%`));
  
  // Taxa de sucesso
  const successRate = Math.round((passed / testCases.length) * 100);
  
  console.log(chalk.white(`\n🎯 Taxa de Sucesso: ${successRate}%`));
  
  if (successRate === 100) {
    console.log(chalk.green('   ✅ Sistema diferencia perfeitamente todos os bairros!'));
  } else if (successRate >= 80) {
    console.log(chalk.yellow('   ⚠️ Sistema tem boa diferenciação mas precisa melhorar'));
  } else {
    console.log(chalk.red('   ❌ Sistema está confundindo bairros similares'));
  }
  
  // Listar casos que falharam
  if (failed > 0) {
    console.log(chalk.red('\n❌ Casos que falharam:'));
    results
      .filter(r => !r.passed)
      .forEach(r => {
        console.log(chalk.red(`   - Teste ${r.testCase.id}: ${r.testCase.description}`));
        if (r.wrongBairroFound) {
          console.log(chalk.red(`     Confundiu com: ${r.wrongBairroFound}`));
        }
      });
  }
  
  // Análise de problemas comuns
  console.log(chalk.yellow('\n🔍 Análise de Problemas:'));
  
  const confusionCount = results.filter(r => r.mentionsWrongBairro).length;
  const noMentionCount = results.filter(r => !r.bairrosMentioned || r.bairrosMentioned.length === 0).length;
  
  if (confusionCount > 0) {
    console.log(chalk.red(`   - ${confusionCount} casos com confusão entre bairros similares`));
  }
  if (noMentionCount > 0) {
    console.log(chalk.yellow(`   - ${noMentionCount} respostas sem mencionar nenhum bairro`));
  }
  
  // Recomendações
  console.log(chalk.cyan('\n💡 Recomendações:'));
  if (successRate < 100) {
    console.log(chalk.cyan('   1. Implementar matching EXATO de nomes de bairros no sql-generator'));
    console.log(chalk.cyan('   2. Adicionar validação de ambiguidade no query-analyzer'));
    console.log(chalk.cyan('   3. Usar WHERE bairro = "NOME EXATO" em vez de ILIKE'));
    console.log(chalk.cyan('   4. Adicionar confirmação quando detectar ambiguidade'));
  }
  
  // Salvar relatório
  const report = {
    timestamp: new Date().toISOString(),
    totalTests: testCases.length,
    passed,
    failed,
    successRate,
    avgScore,
    totalBairros: actualBairros.length,
    similarPairs: similarPairs.length,
    results: results.map(r => ({
      id: r.testCase.id,
      description: r.testCase.description,
      passed: r.passed,
      score: r.score,
      bairrosMentioned: r.bairrosMentioned,
      wrongBairro: r.wrongBairroFound
    }))
  };
  
  const fs = await import('fs');
  const reportPath = path.join(__dirname, '..', 'test-reports', `bairro-differentiation-${Date.now()}.json`);
  
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