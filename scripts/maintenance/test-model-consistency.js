#!/usr/bin/env node

import fetch from 'node-fetch';

console.log('🔍 Testando consistência entre /chat e /quality...\n');

const supabaseUrl = 'https://ngrqwmvuhvjkeohesbxs.supabase.co';
const testQuery = 'Qual é a altura máxima permitida mais alta no novo Plano Diretor?';
const testModel = 'anthropic/claude-3-5-sonnet-20241022';

async function testChatEndpoint() {
  console.log('📡 Testando /chat via agentic-rag...');
  
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
        model: testModel,
        userRole: 'citizen'
      }),
    });

    console.log(`📊 Status: ${response.status}`);
    
    if (!response.ok) {
      const errorText = await response.text();
      console.error('❌ Erro:', errorText);
      return null;
    }

    const data = await response.json();
    console.log('✅ Resposta Chat (primeiros 200 chars):', data.response?.substring(0, 200) + '...');
    console.log('🎯 Confidence:', data.confidence);
    console.log('⏱️ Time:', data.executionTime + 'ms');
    
    return {
      response: data.response,
      confidence: data.confidence,
      executionTime: data.executionTime
    };

  } catch (error) {
    console.error('❌ Erro chat:', error.message);
    return null;
  }
}

async function testQualityEndpoint() {
  console.log('\n📡 Testando /quality via qa-execute-validation-v2...');
  
  try {
    const response = await fetch(`${supabaseUrl}/functions/v1/qa-execute-validation-v2`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Im5ncnF3bXZ1aHZqa2VvaGVzYnhzIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTM2MDkwMTcsImV4cCI6MjA2OTE4NTAxN30.K3uyyzjyAQ17ohQGCUFx_RiMufblLyQzvxEZHakqKrg`,
      },
      body: JSON.stringify({
        mode: 'selected',
        selectedIds: ['altura-maxima-geral'], // Test case específico
        models: [testModel],
        includeSQL: false,
        excludeSQL: true
      }),
    });

    console.log(`📊 Status: ${response.status}`);
    
    if (!response.ok) {
      const errorText = await response.text();
      console.error('❌ Erro:', errorText);
      return null;
    }

    const data = await response.json();
    console.log('✅ Quality executou com sucesso');
    console.log('📈 Results:', data.results?.length || 0, 'runs');
    
    if (data.results && data.results.length > 0) {
      const result = data.results[0];
      console.log('🎯 Model:', result.model);
      console.log('📊 Accuracy:', (result.overallAccuracy * 100).toFixed(1) + '%');
      console.log('⏱️ Avg Time:', result.avgResponseTime + 'ms');
      
      return {
        model: result.model,
        accuracy: result.overallAccuracy,
        avgResponseTime: result.avgResponseTime
      };
    }

    return null;

  } catch (error) {
    console.error('❌ Erro quality:', error.message);
    return null;
  }
}

async function compareResults() {
  console.log('🔄 Comparando resultados entre /chat e /quality...\n');
  
  const chatResult = await testChatEndpoint();
  const qualityResult = await testQualityEndpoint();
  
  console.log('\n📋 RELATÓRIO DE CONSISTÊNCIA:');
  console.log('=' .repeat(50));
  
  if (chatResult && qualityResult) {
    console.log('✅ Ambos os endpoints funcionaram');
    console.log('📤 Chat Response Length:', chatResult.response?.length || 0, 'chars');
    console.log('🎯 Quality Accuracy:', (qualityResult.accuracy * 100).toFixed(1) + '%');
    console.log('⏱️ Response Times - Chat:', chatResult.executionTime + 'ms', '/ Quality:', qualityResult.avgResponseTime + 'ms');
    console.log('🤖 Model Used in Quality:', qualityResult.model);
    
    if (qualityResult.model !== testModel) {
      console.log('⚠️  PROBLEMA: Quality não usou o modelo especificado!');
      console.log('   Esperado:', testModel);
      console.log('   Usado:', qualityResult.model);
    } else {
      console.log('✅ Modelo consistente entre sistemas');
    }
  } else {
    console.log('❌ Falha na comparação');
    if (!chatResult) console.log('   - Chat endpoint falhou');
    if (!qualityResult) console.log('   - Quality endpoint falhou');
  }
}

compareResults();