#!/usr/bin/env node

import fetch from 'node-fetch';

console.log('🔍 Testando consistência COMPLETA entre todos os sistemas...\n');

const supabaseUrl = 'https://ngrqwmvuhvjkeohesbxs.supabase.co';
const testQuery = 'Qual é a altura máxima permitida mais alta no novo Plano Diretor?';
const testModels = [
  'anthropic/claude-3-5-sonnet-20241022',
  'openai/gpt-4o-mini-2024-07-18',
  'google/gemini-1.5-flash-002'
];

async function testChatSystem(model) {
  console.log(`📡 Testando /chat com ${model}...`);
  
  try {
    const response = await fetch(`${supabaseUrl}/functions/v1/agentic-rag`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Im5ncnF3bXZ1aHZqa2VvaGVzYnhzIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTM2MDkwMTcsImV4cCI6MjA2OTE4NTAxN30.K3uyyzjyAQ17ohQGCUFx_RiMufblLyQzvxEZHakqKrg`,
      },
      body: JSON.stringify({
        query: testQuery,
        sessionId: `test-chat-${Date.now()}`,
        model: model,
        userRole: 'citizen',
        bypassCache: true
      }),
    });

    const data = await response.json();
    
    if (!response.ok) {
      console.error(`❌ Chat falhou para ${model}:`, data);
      return null;
    }

    console.log(`✅ Chat OK - Modelo retornado: ${data.model || 'N/A'}`);
    console.log(`   Resposta (100 chars): ${data.response?.substring(0, 100)}...`);
    
    return {
      system: 'chat',
      model: model,
      responseModel: data.model,
      response: data.response,
      confidence: data.confidence,
      executionTime: data.executionTime
    };

  } catch (error) {
    console.error(`❌ Erro chat ${model}:`, error.message);
    return null;
  }
}

async function testQualitySystem(model) {
  console.log(`📡 Testando /quality com ${model}...`);
  
  try {
    const response = await fetch(`${supabaseUrl}/functions/v1/qa-execute-validation-v2`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Im5ncnF3bXZ1aHZqa2VvaGVzYnhzIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTM2MDkwMTcsImV4cCI6MjA2OTE4NTAxN30.K3uyyzjyAQ17ohQGCUFx_RiMufblLyQzvxEZHakqKrg`,
      },
      body: JSON.stringify({
        mode: 'selected',
        selectedIds: ['altura-maxima-geral'],
        models: [model],
        includeSQL: false,
        excludeSQL: true
      }),
    });

    const data = await response.json();
    
    if (!response.ok) {
      console.error(`❌ Quality falhou para ${model}:`, data);
      return null;
    }

    if (data.results && data.results.length > 0) {
      const result = data.results[0];
      console.log(`✅ Quality OK - Modelo usado: ${result.model}`);
      console.log(`   Accuracy: ${(result.overallAccuracy * 100).toFixed(1)}%`);
      
      return {
        system: 'quality',
        model: model,
        responseModel: result.model,
        accuracy: result.overallAccuracy,
        avgResponseTime: result.avgResponseTime
      };
    }

    return null;

  } catch (error) {
    console.error(`❌ Erro quality ${model}:`, error.message);
    return null;
  }
}

async function testBenchmarkSystem(models) {
  console.log(`📡 Testando /benchmark com ${models.length} modelos...`);
  
  try {
    const response = await fetch(`${supabaseUrl}/functions/v1/run-benchmark`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Im5ncnF3bXZ1aHZqa2VvaGVzYnhzIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTM2MDkwMTcsImV4cCI6MjA2OTE4NTAxN30.K3uyyzjyAQ17ohQGCUFx_RiMufblLyQzvxEZHakqKrg`,
      },
      body: JSON.stringify({
        models: models,
        mode: 'selected',
        includeSQL: false,
        excludeSQL: true
      }),
    });

    const data = await response.json();
    
    if (!response.ok) {
      console.error('❌ Benchmark falhou:', data);
      return null;
    }

    console.log(`✅ Benchmark OK - ${data.modelsCount} modelos executados`);
    console.log(`   Modelos executados: ${data.executedModels?.join(', ')}`);
    
    return {
      system: 'benchmark',
      modelsCount: data.modelsCount,
      executedModels: data.executedModels,
      summaries: data.summaries
    };

  } catch (error) {
    console.error('❌ Erro benchmark:', error.message);
    return null;
  }
}

async function runCompleteTest() {
  console.log('🔄 Executando teste completo de consistência...\n');
  
  const results = {
    chat: [],
    quality: [],
    benchmark: null
  };
  
  // Testar Chat com cada modelo
  for (const model of testModels) {
    const chatResult = await testChatSystem(model);
    if (chatResult) results.chat.push(chatResult);
    await new Promise(resolve => setTimeout(resolve, 1000)); // Pausa entre requests
  }
  
  console.log('\n');
  
  // Testar Quality com cada modelo
  for (const model of testModels) {
    const qualityResult = await testQualitySystem(model);
    if (qualityResult) results.quality.push(qualityResult);
    await new Promise(resolve => setTimeout(resolve, 1000)); // Pausa entre requests
  }
  
  console.log('\n');
  
  // Testar Benchmark com todos os modelos
  const benchmarkResult = await testBenchmarkSystem(testModels);
  results.benchmark = benchmarkResult;
  
  // Análise final
  console.log('\n📋 ANÁLISE FINAL DE CONSISTÊNCIA:');
  console.log('=' .repeat(60));
  
  console.log('\n🎯 VERIFICAÇÃO DE MODELOS:');
  testModels.forEach(testModel => {
    const chatResult = results.chat.find(r => r.model === testModel);
    const qualityResult = results.quality.find(r => r.model === testModel);
    
    console.log(`\n📌 Modelo: ${testModel}`);
    console.log(`   Chat:    ${chatResult ? '✅ OK' : '❌ FALHOU'} ${chatResult?.responseModel ? `(retornou: ${chatResult.responseModel})` : ''}`);
    console.log(`   Quality: ${qualityResult ? '✅ OK' : '❌ FALHOU'} ${qualityResult?.responseModel ? `(usou: ${qualityResult.responseModel})` : ''}`);
    
    // Verificar se o modelo retornado é o mesmo solicitado
    if (chatResult && chatResult.responseModel !== testModel) {
      console.log(`   ⚠️  INCONSISTÊNCIA: Chat solicitou ${testModel} mas retornou ${chatResult.responseModel}`);
    }
    if (qualityResult && qualityResult.responseModel !== testModel) {
      console.log(`   ⚠️  INCONSISTÊNCIA: Quality solicitou ${testModel} mas usou ${qualityResult.responseModel}`);
    }
  });
  
  console.log('\n🔧 VERIFICAÇÃO DO BENCHMARK:');
  if (results.benchmark) {
    console.log(`   Status: ✅ OK (${results.benchmark.modelsCount} modelos)`);
    console.log(`   Modelos executados: ${results.benchmark.executedModels?.join(', ')}`);
    
    // Verificar se todos os modelos solicitados foram executados
    const missing = testModels.filter(model => 
      !results.benchmark.executedModels?.includes(model)
    );
    if (missing.length > 0) {
      console.log(`   ⚠️  MODELOS FALTANDO: ${missing.join(', ')}`);
    }
  } else {
    console.log('   Status: ❌ FALHOU');
  }
  
  console.log('\n🏆 RESUMO GERAL:');
  const chatOkCount = results.chat.length;
  const qualityOkCount = results.quality.length;
  const benchmarkOk = results.benchmark ? 1 : 0;
  
  console.log(`   • Chat: ${chatOkCount}/${testModels.length} modelos funcionando`);
  console.log(`   • Quality: ${qualityOkCount}/${testModels.length} modelos funcionando`);
  console.log(`   • Benchmark: ${benchmarkOk}/1 sistema funcionando`);
  
  const allSystemsWorking = chatOkCount === testModels.length && 
                           qualityOkCount === testModels.length && 
                           benchmarkOk === 1;
  
  if (allSystemsWorking) {
    console.log('\n✅ TODOS OS SISTEMAS ESTÃO CONSISTENTES E FUNCIONANDO!');
  } else {
    console.log('\n❌ PROBLEMAS DETECTADOS - SISTEMAS INCONSISTENTES');
  }
}

runCompleteTest();