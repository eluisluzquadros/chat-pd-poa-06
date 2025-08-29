#!/usr/bin/env node

import fetch from 'node-fetch';
import fs from 'fs';

const SUPABASE_URL = 'https://ngrqwmvuhvjkeohesbxs.supabase.co';
const ANON_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Im5ncnF3bXZ1aHZqa2VvaGVzYnhzIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTM2MDkwMTcsImV4cCI6MjA2OTE4NTAxN30.K3uyyzjyAQ17ohQGCUFx_RiMufblLyQzvxEZHakqKrg';

console.log('🧪 Sistema de Benchmark QA - Trade-off Analysis\n');

// Casos de teste QA
const testCases = [
  {
    id: 'greeting_1',
    query: 'oi',
    expectedKeywords: ['olá', 'assistente', 'plano diretor'],
    category: 'greeting',
    complexity: 'simple'
  },
  {
    id: 'zones_centro',
    query: 'Quais são as zonas do Centro Histórico?',
    expectedKeywords: ['ZOT', '08.1', 'Centro Histórico'],
    category: 'zone_query',
    complexity: 'medium'
  },
  {
    id: 'height_petropolis',
    query: 'Qual a altura máxima permitida no bairro Petrópolis?',
    expectedKeywords: ['altura', 'metros', 'Petrópolis'],
    category: 'construction_rules',
    complexity: 'medium'
  },
  {
    id: 'list_all_neighborhoods',
    query: 'Liste todos os bairros de Porto Alegre',
    expectedKeywords: ['bairros', 'Porto Alegre', '94'],
    category: 'comprehensive_list',
    complexity: 'high'
  },
  {
    id: 'plano_diretor_info',
    query: 'O que é o Plano Diretor?',
    expectedKeywords: ['plano', 'diretor', 'desenvolvimento', 'urbano'],
    category: 'conceptual',
    complexity: 'medium'
  }
];

// Modelos para testar
const models = [
  { provider: 'openai', model: 'gpt-3.5-turbo', costPer1kTokens: 0.0015 },
  { provider: 'openai', model: 'gpt-3.5-turbo-16k', costPer1kTokens: 0.003 },
  { provider: 'openai', model: 'gpt-4', costPer1kTokens: 0.03 },
  { provider: 'anthropic', model: 'claude-3-haiku', costPer1kTokens: 0.00025 },
  { provider: 'anthropic', model: 'claude-3-sonnet', costPer1kTokens: 0.003 },
  { provider: 'google', model: 'gemini-pro', costPer1kTokens: 0.00025 }
];

// Métricas de qualidade
function calculateQualityScore(response, testCase) {
  let score = 0;
  const maxScore = 100;
  
  // 1. Verificar presença de palavras-chave esperadas (40 pontos)
  const keywordScore = 40;
  const foundKeywords = testCase.expectedKeywords.filter(keyword => 
    response.toLowerCase().includes(keyword.toLowerCase())
  );
  score += (foundKeywords.length / testCase.expectedKeywords.length) * keywordScore;
  
  // 2. Comprimento da resposta (20 pontos)
  const lengthScore = 20;
  if (testCase.complexity === 'simple' && response.length > 50) score += lengthScore;
  else if (testCase.complexity === 'medium' && response.length > 200) score += lengthScore;
  else if (testCase.complexity === 'high' && response.length > 500) score += lengthScore;
  else score += lengthScore * 0.5;
  
  // 3. Ausência de mensagem de erro (20 pontos)
  const errorScore = 20;
  if (!response.includes('versão Beta') && !response.includes('erro')) {
    score += errorScore;
  }
  
  // 4. Confiança reportada (20 pontos)
  // (Isso seria obtido da resposta da API)
  
  return Math.min(score, maxScore);
}

// Testar um caso com o sistema atual
async function testCase(testCase) {
  const startTime = Date.now();
  
  try {
    const response = await fetch(`${SUPABASE_URL}/functions/v1/agentic-rag`, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${ANON_KEY}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        query: testCase.query,
        sessionId: `benchmark-${Date.now()}`,
        bypassCache: true
      })
    });
    
    const responseTime = Date.now() - startTime;
    
    if (response.ok) {
      const data = await response.json();
      const qualityScore = calculateQualityScore(data.response, testCase);
      
      return {
        testCaseId: testCase.id,
        success: true,
        responseTime,
        response: data.response,
        confidence: data.confidence,
        qualityScore,
        tokensUsed: data.tokensUsed || 0,
        model: data.model || 'gpt-3.5-turbo',
        executionTime: data.executionTime
      };
    } else {
      return {
        testCaseId: testCase.id,
        success: false,
        responseTime,
        error: `HTTP ${response.status}`,
        qualityScore: 0
      };
    }
  } catch (error) {
    return {
      testCaseId: testCase.id,
      success: false,
      responseTime: Date.now() - startTime,
      error: error.message,
      qualityScore: 0
    };
  }
}

// Executar benchmark completo
async function runBenchmark() {
  console.log('📊 Executando benchmark com casos de teste...\n');
  
  const results = [];
  
  for (const test of testCases) {
    console.log(`\nTestando: "${test.query}"`);
    const result = await testCase(test);
    results.push(result);
    
    if (result.success) {
      console.log(`✅ Sucesso - Tempo: ${result.responseTime}ms - Qualidade: ${result.qualityScore.toFixed(1)}/100`);
    } else {
      console.log(`❌ Erro: ${result.error}`);
    }
    
    // Pequena pausa entre testes
    await new Promise(resolve => setTimeout(resolve, 1000));
  }
  
  // Análise agregada
  console.log('\n\n📈 ANÁLISE DE RESULTADOS:');
  console.log('='.repeat(60));
  
  const successfulTests = results.filter(r => r.success);
  const avgResponseTime = successfulTests.reduce((sum, r) => sum + r.responseTime, 0) / successfulTests.length;
  const avgQuality = successfulTests.reduce((sum, r) => sum + r.qualityScore, 0) / successfulTests.length;
  
  console.log(`Taxa de sucesso: ${(successfulTests.length / results.length * 100).toFixed(1)}%`);
  console.log(`Tempo médio de resposta: ${avgResponseTime.toFixed(0)}ms`);
  console.log(`Qualidade média: ${avgQuality.toFixed(1)}/100`);
  
  // Análise por categoria
  console.log('\n📊 Análise por categoria:');
  const categories = [...new Set(testCases.map(tc => tc.category))];
  
  categories.forEach(category => {
    const categoryTests = testCases.filter(tc => tc.category === category);
    const categoryResults = results.filter(r => 
      categoryTests.some(tc => tc.id === r.testCaseId) && r.success
    );
    
    if (categoryResults.length > 0) {
      const avgTime = categoryResults.reduce((sum, r) => sum + r.responseTime, 0) / categoryResults.length;
      const avgScore = categoryResults.reduce((sum, r) => sum + r.qualityScore, 0) / categoryResults.length;
      
      console.log(`\n${category}:`);
      console.log(`  - Tempo médio: ${avgTime.toFixed(0)}ms`);
      console.log(`  - Qualidade média: ${avgScore.toFixed(1)}/100`);
    }
  });
  
  // Salvar resultados
  const benchmarkReport = {
    timestamp: new Date().toISOString(),
    model: 'gpt-3.5-turbo',
    results,
    summary: {
      successRate: (successfulTests.length / results.length * 100),
      avgResponseTime,
      avgQuality,
      totalTests: results.length
    }
  };
  
  fs.writeFileSync('benchmark-results.json', JSON.stringify(benchmarkReport, null, 2));
  console.log('\n✅ Resultados salvos em benchmark-results.json');
  
  // Recomendações
  console.log('\n💡 RECOMENDAÇÕES:');
  console.log('='.repeat(60));
  
  if (avgResponseTime > 5000) {
    console.log('⚠️  Tempo de resposta alto - considere usar modelos mais rápidos para queries simples');
  }
  
  if (avgQuality < 70) {
    console.log('⚠️  Qualidade abaixo do ideal - considere usar modelos mais avançados para queries complexas');
  }
  
  console.log('\n📌 Próximos passos:');
  console.log('1. Implementar teste com múltiplos modelos');
  console.log('2. Criar análise de custo-benefício');
  console.log('3. Implementar seleção dinâmica de modelo baseada no tipo de query');
}

// Executar
runBenchmark().catch(console.error);