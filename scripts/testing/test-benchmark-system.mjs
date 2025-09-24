#!/usr/bin/env node

import fetch from 'node-fetch';

const SUPABASE_URL = 'https://ngrqwmvuhvjkeohesbxs.supabase.co';
const ANON_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Im5ncnF3bXZ1aHZqa2VvaGVzYnhzIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTM2MDkwMTcsImV4cCI6MjA2OTE4NTAxN30.K3uyyzjyAQ17ohQGCUFx_RiMufblLyQzvxEZHakqKrg';

console.log('🎯 TESTE DO SISTEMA DE BENCHMARK QA\n');

// Casos de teste padrão
const TEST_CASES = [
  {
    id: 'greeting_simple',
    query: 'oi',
    expectedKeywords: ['olá', 'assistente', 'plano diretor'],
    category: 'greeting',
    complexity: 'simple'
  },
  {
    id: 'zones_specific',
    query: 'Quais são as zonas do Centro Histórico?',
    expectedKeywords: ['ZOT', '08.1', 'Centro Histórico', 'zona'],
    category: 'zone_query',
    complexity: 'medium'
  },
  {
    id: 'construction_height',
    query: 'Qual a altura máxima permitida no bairro Petrópolis?',
    expectedKeywords: ['altura', 'metros', 'Petrópolis', 'máxima'],
    category: 'construction_rules',
    complexity: 'medium'
  },
  {
    id: 'list_comprehensive',
    query: 'Liste todos os bairros de Porto Alegre',
    expectedKeywords: ['bairros', 'Porto Alegre', 'lista'],
    category: 'comprehensive_list',
    complexity: 'high'
  }
];

// Modelos para testar
const MODELS_TO_TEST = [
  { provider: 'openai', model: 'gpt-3.5-turbo' },
  { provider: 'openai', model: 'gpt-3.5-turbo-16k' },
  { provider: 'anthropic', model: 'claude-3-haiku-20240307' }
];

async function testModel(testCase, modelConfig) {
  const startTime = Date.now();
  
  try {
    // Por enquanto, testar apenas com o modelo padrão
    // Em produção, seria passado o modelo específico
    const response = await fetch(`${SUPABASE_URL}/functions/v1/agentic-rag`, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${ANON_KEY}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        query: testCase.query,
        sessionId: `benchmark-${Date.now()}`,
        bypassCache: true,
        // modelConfig seria passado aqui em produção
      })
    });
    
    const responseTime = Date.now() - startTime;
    
    if (response.ok) {
      const data = await response.json();
      
      // Calcular score de qualidade
      let qualityScore = 60; // Base score
      
      // Verificar palavras-chave esperadas
      const responseText = data.response.toLowerCase();
      const keywordMatches = testCase.expectedKeywords.filter(keyword => 
        responseText.includes(keyword.toLowerCase())
      );
      
      qualityScore += (keywordMatches.length / testCase.expectedKeywords.length) * 20;
      
      // Verificar comprimento da resposta
      if (responseText.length > 100) qualityScore += 10;
      if (responseText.length > 500) qualityScore += 10;
      
      return {
        success: true,
        responseTime,
        qualityScore: Math.min(100, qualityScore),
        response: data.response,
        confidence: data.confidence || 0.8,
        model: data.model || 'gpt-3.5-turbo-16k'
      };
    } else {
      return {
        success: false,
        responseTime,
        qualityScore: 0,
        error: `HTTP ${response.status}`
      };
    }
  } catch (error) {
    return {
      success: false,
      responseTime: Date.now() - startTime,
      qualityScore: 0,
      error: error.message
    };
  }
}

async function runBenchmark() {
  console.log('🚀 Iniciando benchmark com casos de teste...\n');
  
  const results = [];
  
  for (const testCase of TEST_CASES) {
    console.log(`\n📋 Testando: "${testCase.query}"`);
    console.log('─'.repeat(60));
    
    // Por enquanto, testar apenas com o modelo atual
    const result = await testModel(testCase, MODELS_TO_TEST[0]);
    
    if (result.success) {
      console.log(`✅ Sucesso em ${result.responseTime}ms`);
      console.log(`🎯 Qualidade: ${result.qualityScore.toFixed(0)}%`);
      console.log(`📝 Resposta: ${result.response.substring(0, 150)}...`);
    } else {
      console.log(`❌ Erro: ${result.error}`);
    }
    
    results.push({
      testCase,
      ...result
    });
    
    // Aguardar entre testes
    await new Promise(resolve => setTimeout(resolve, 1000));
  }
  
  // Resumo
  console.log('\n\n' + '='.repeat(60));
  console.log('📊 RESUMO DO BENCHMARK');
  console.log('='.repeat(60));
  
  const successful = results.filter(r => r.success).length;
  const avgResponseTime = results.reduce((sum, r) => sum + r.responseTime, 0) / results.length;
  const avgQuality = results
    .filter(r => r.success)
    .reduce((sum, r) => sum + r.qualityScore, 0) / successful;
  
  console.log(`\n✅ Taxa de sucesso: ${(successful / results.length * 100).toFixed(0)}%`);
  console.log(`⏱️  Tempo médio de resposta: ${avgResponseTime.toFixed(0)}ms`);
  console.log(`🎯 Qualidade média: ${avgQuality.toFixed(1)}%`);
  
  console.log('\n💡 ANÁLISE DE TRADE-OFF:');
  console.log('├── Modelo atual: gpt-3.5-turbo-16k');
  console.log('├── Custo estimado: $0.004 por 1000 tokens');
  console.log('├── Velocidade: Boa (média ' + avgResponseTime.toFixed(0) + 'ms)');
  console.log('└── Qualidade: ' + (avgQuality >= 80 ? 'Excelente' : avgQuality >= 60 ? 'Boa' : 'Regular'));
  
  console.log('\n🎯 RECOMENDAÇÕES:');
  if (avgResponseTime < 5000) {
    console.log('✅ Performance está excelente para produção');
  } else if (avgResponseTime < 10000) {
    console.log('⚠️  Performance aceitável, considerar otimizações');
  } else {
    console.log('❌ Performance precisa melhorar para produção');
  }
  
  if (avgQuality >= 80) {
    console.log('✅ Qualidade das respostas está excelente');
  } else if (avgQuality >= 60) {
    console.log('⚠️  Qualidade boa, mas pode ser melhorada');
  } else {
    console.log('❌ Qualidade precisa melhorar significativamente');
  }
  
  console.log('\n📝 PRÓXIMOS PASSOS:');
  console.log('1. Aplicar migração do banco de dados');
  console.log('2. Implementar seleção dinâmica de modelo');
  console.log('3. Executar benchmark completo com todos os modelos');
  console.log('4. Configurar regras de otimização baseadas nos resultados');
}

runBenchmark().catch(console.error);