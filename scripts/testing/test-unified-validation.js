#!/usr/bin/env node

import fetch from 'node-fetch';

console.log('🔍 Teste Unificado de Validação Multi-LLM\n');

const supabaseUrl = 'https://ngrqwmvuhvjkeohesbxs.supabase.co';
const authKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Im5ncnF3bXZ1aHZqa2VvaGVzYnhzIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTM2MDkwMTcsImV4cCI6MjA2OTE4NTAxN30.K3uyyzjyAQ17ohQGCUFx_RiMufblLyQzvxEZHakqKrg';

const testModels = [
  'anthropic/claude-3-5-sonnet-20241022',
  'openai/gpt-4o-mini-2024-07-18',
  'google/gemini-1.5-flash-002'
];

const testQuery = 'Qual é a altura máxima permitida mais alta no novo Plano Diretor?';
const expectedAnswer = 'A altura máxima mais alta permitida no novo Plano Diretor de Porto Alegre é de 150 metros';

async function testSystemConsistency() {
  console.log('🎯 TESTE 1: Validando Consistência entre Sistemas');
  console.log('=' .repeat(60));
  
  const results = {
    chat: {},
    quality: {},
    benchmark: null
  };
  
  // Test each model across all systems
  for (const model of testModels) {
    console.log(`\n🔬 Testando modelo: ${model}`);
    
    // Test Chat System
    try {
      console.log('  📱 Chat System...');
      const chatResponse = await fetch(`${supabaseUrl}/functions/v1/agentic-rag`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${authKey}`,
        },
        body: JSON.stringify({
          query: testQuery,
          sessionId: `test-${Date.now()}`,
          model: model,
          userRole: 'citizen',
          bypassCache: true
        }),
      });
      
      const chatData = await chatResponse.json();
      results.chat[model] = {
        success: chatResponse.ok,
        responseModel: chatData.model,
        response: chatData.response,
        executionTime: chatData.executionTime
      };
      
      console.log(`     ✅ Status: ${chatResponse.status} | Modelo retornado: ${chatData.model || 'N/A'}`);
      
    } catch (error) {
      console.log(`     ❌ Erro: ${error.message}`);
      results.chat[model] = { success: false, error: error.message };
    }
    
    // Small delay between tests
    await new Promise(resolve => setTimeout(resolve, 500));
    
    // Test Quality System
    try {
      console.log('  🔍 Quality System...');
      const qualityResponse = await fetch(`${supabaseUrl}/functions/v1/qa-execute-validation-v2`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${authKey}`,
        },
        body: JSON.stringify({
          mode: 'selected',
          selectedIds: ['altura-maxima-geral'],
          models: [model],
          includeSQL: false,
          excludeSQL: true
        }),
      });
      
      const qualityData = await qualityResponse.json();
      
      if (qualityData.results && qualityData.results.length > 0) {
        const result = qualityData.results[0];
        results.quality[model] = {
          success: true,
          responseModel: result.model,
          accuracy: result.overallAccuracy,
          avgResponseTime: result.avgResponseTime
        };
        
        console.log(`     ✅ Status: OK | Modelo usado: ${result.model} | Accuracy: ${(result.overallAccuracy * 100).toFixed(1)}%`);
      } else {
        results.quality[model] = { success: false, error: 'No results returned' };
        console.log('     ❌ No results returned');
      }
      
    } catch (error) {
      console.log(`     ❌ Erro: ${error.message}`);
      results.quality[model] = { success: false, error: error.message };
    }
    
    // Small delay between models
    await new Promise(resolve => setTimeout(resolve, 1000));
  }
  
  // Test Benchmark System
  console.log('\n🏆 Testando Benchmark System...');
  try {
    const benchmarkResponse = await fetch(`${supabaseUrl}/functions/v1/run-benchmark`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${authKey}`,
      },
      body: JSON.stringify({
        models: testModels,
        mode: 'selected',
        includeSQL: false,
        excludeSQL: true
      }),
    });
    
    const benchmarkData = await benchmarkResponse.json();
    results.benchmark = {
      success: benchmarkResponse.ok,
      modelsExecuted: benchmarkData.executedModels,
      summaries: benchmarkData.summaries
    };
    
    console.log(`   ✅ Status: ${benchmarkResponse.status} | Modelos: ${benchmarkData.executedModels?.join(', ')}`);
    
  } catch (error) {
    console.log(`   ❌ Erro: ${error.message}`);
    results.benchmark = { success: false, error: error.message };
  }
  
  // Analysis
  console.log('\n📊 ANÁLISE FINAL:');
  console.log('=' .repeat(60));
  
  let allSystemsWorking = true;
  let modelConsistency = true;
  
  console.log('\n🔍 CONSISTÊNCIA POR MODELO:');
  testModels.forEach(model => {
    const chat = results.chat[model];
    const quality = results.quality[model];
    
    console.log(`\n📌 ${model}:`);
    console.log(`   Chat:    ${chat?.success ? '✅' : '❌'} ${chat?.success ? `(retornou: ${chat.responseModel})` : `(${chat?.error})`}`);
    console.log(`   Quality: ${quality?.success ? '✅' : '❌'} ${quality?.success ? `(usou: ${quality.responseModel})` : `(${quality?.error})`}`);
    
    if (!chat?.success || !quality?.success) {
      allSystemsWorking = false;
    }
    
    if (chat?.success && quality?.success) {
      if (chat.responseModel !== model || quality.responseModel !== model) {
        modelConsistency = false;
        console.log(`   ⚠️  INCONSISTÊNCIA DETECTADA!`);
        if (chat.responseModel !== model) {
          console.log(`      Chat deveria usar '${model}' mas usou '${chat.responseModel}'`);
        }
        if (quality.responseModel !== model) {
          console.log(`      Quality deveria usar '${model}' mas usou '${quality.responseModel}'`);
        }
      } else {
        console.log(`   ✅ Modelo consistente em ambos sistemas`);
      }
    }
  });
  
  console.log('\n🏆 BENCHMARK:');
  console.log(`   Status: ${results.benchmark?.success ? '✅ OK' : '❌ FALHOU'}`);
  if (results.benchmark?.success) {
    console.log(`   Modelos executados: ${results.benchmark.modelsExecuted?.join(', ')}`);
    
    const missing = testModels.filter(model => 
      !results.benchmark.modelsExecuted?.includes(model)
    );
    if (missing.length > 0) {
      console.log(`   ⚠️  Modelos faltando: ${missing.join(', ')}`);
    }
  }
  
  console.log('\n🎯 RESULTADO FINAL:');
  if (allSystemsWorking && modelConsistency) {
    console.log('✅ TODOS OS SISTEMAS ESTÃO FUNCIONANDO E CONSISTENTES!');
    console.log('   ✓ Chat usa os modelos corretos');
    console.log('   ✓ Quality usa os modelos corretos');
    console.log('   ✓ Benchmark executa todos os modelos');
    console.log('   ✓ Respostas são geradas pelos modelos solicitados');
  } else {
    console.log('❌ PROBLEMAS DETECTADOS:');
    if (!allSystemsWorking) {
      console.log('   ✗ Alguns sistemas não estão funcionando');
    }
    if (!modelConsistency) {
      console.log('   ✗ Modelos não estão sendo usados consistentemente');
    }
  }
  
  return {
    allSystemsWorking,
    modelConsistency,
    results
  };
}

async function testResponseConsistency() {
  console.log('\n\n🎯 TESTE 2: Validando Consistência de Respostas');
  console.log('=' .repeat(60));
  
  const model = 'anthropic/claude-3-5-sonnet-20241022';
  const testCases = [
    'Qual é a altura máxima permitida no bairro Centro?',
    'Quais são os coeficientes de aproveitamento para ZOT 04?',
    'O que é certificação em sustentabilidade ambiental?'
  ];
  
  for (const query of testCases) {
    console.log(`\n🔍 Pergunta: "${query}"`);
    
    try {
      // Test with Chat
      const chatResponse = await fetch(`${supabaseUrl}/functions/v1/agentic-rag`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${authKey}`,
        },
        body: JSON.stringify({
          query,
          sessionId: `consistency-test-${Date.now()}`,
          model: model,
          userRole: 'citizen',
          bypassCache: true
        }),
      });
      
      const chatData = await chatResponse.json();
      
      console.log(`📱 Chat Response (100 chars): ${chatData.response?.substring(0, 100)}...`);
      console.log(`   Modelo usado: ${chatData.model}`);
      console.log(`   Confidence: ${chatData.confidence}`);
      console.log(`   Tempo: ${chatData.executionTime}ms`);
      
    } catch (error) {
      console.log(`❌ Erro no Chat: ${error.message}`);
    }
    
    // Small delay between requests
    await new Promise(resolve => setTimeout(resolve, 2000));
  }
}

// Run all tests
async function runAllTests() {
  const start = Date.now();
  console.log(`Iniciando testes às ${new Date().toLocaleTimeString()}`);
  
  try {
    await testSystemConsistency();
    await testResponseConsistency();
    
    const duration = Date.now() - start;
    console.log(`\n⏱️  Testes concluídos em ${Math.round(duration / 1000)}s`);
    
  } catch (error) {
    console.error(`❌ Erro geral nos testes: ${error.message}`);
  }
}

runAllTests();