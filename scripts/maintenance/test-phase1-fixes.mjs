#!/usr/bin/env node

import fetch from 'node-fetch';

const SUPABASE_URL = 'https://ngrqwmvuhvjkeohesbxs.supabase.co';
const SUPABASE_ANON_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Im5ncnF3bXZ1aHZqa2VvaGVzYnhzIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTM2MDkwMTcsImV4cCI6MjA2OTE4NTAxN30.K3uyyzjyAQ17ohQGCUFx_RiMufblLyQzvxEZHakqKrg';

console.log('🧪 TESTE FASE 1 - Correções de Bugs Críticos\n');
console.log('=' .repeat(60));

async function testAgenticRAGPipeline() {
  console.log('🎯 Testando pipeline Agentic-RAG completo...\n');
  
  try {
    // Test the full pipeline with a simple query
    const response = await fetch(`${SUPABASE_URL}/functions/v1/agentic-rag-v2`, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${SUPABASE_ANON_KEY}`,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        query: 'Qual a altura máxima no centro histórico?',
        sessionId: `test-phase1-${Date.now()}`,
        model: 'gpt-3.5-turbo'
      })
    });

    console.log('Status da resposta:', response.status);
    
    if (!response.ok) {
      const errorText = await response.text();
      console.error('❌ Pipeline falhou:', errorText);
      return { success: false, error: errorText };
    }

    const data = await response.json();
    
    console.log('✅ Pipeline executado com sucesso!');
    console.log('📄 Resposta:', data.response?.substring(0, 200) + '...');
    console.log('🎯 Confiança:', data.confidence);
    console.log('🔄 Pipeline usado:', data.metadata?.pipeline);
    console.log('🤖 Agentes usados:', data.metadata?.agents_used);
    
    // Check if it's using the new pipeline
    const isNewPipeline = data.metadata?.pipeline === 'agentic-v2';
    console.log(isNewPipeline ? '✅ Usando pipeline Agentic v2' : '⚠️ Usando pipeline legacy');
    
    return { 
      success: true, 
      data,
      isNewPipeline,
      confidence: data.confidence,
      response: data.response
    };
    
  } catch (error) {
    console.error('❌ Erro no teste:', error.message);
    return { success: false, error: error.message };
  }
}

async function testSessionMemory() {
  console.log('\n📝 Testando tabela session_memory...\n');
  
  try {
    // Check if session_memory table exists and is accessible
    const response = await fetch(
      `${SUPABASE_URL}/rest/v1/session_memory?select=*&limit=1`,
      {
        headers: { 'apikey': SUPABASE_ANON_KEY }
      }
    );
    
    if (!response.ok) {
      const errorText = await response.text();
      console.error('❌ Erro acessando session_memory:', errorText);
      return { success: false, error: errorText };
    }
    
    const data = await response.json();
    console.log('✅ Tabela session_memory acessível');
    console.log('📊 Registros encontrados:', data.length);
    
    return { success: true, recordCount: data.length };
    
  } catch (error) {
    console.error('❌ Erro testando session_memory:', error.message);
    return { success: false, error: error.message };
  }
}

async function testAgentValidator() {
  console.log('\n🔍 Testando agent-validator corrigido...\n');
  
  try {
    // Test the validator with mock agent results
    const mockAgentResults = [
      {
        type: 'urban',
        confidence: 0.8,
        data: {
          parameters: [
            {
              parameter: 'Altura Máxima',
              value: 130,
              zone: 'ZOT 08.1',
              unit: 'm'
            }
          ],
          locations: [
            {
              name: 'Centro Histórico',
              type: 'bairro'
            }
          ]
        }
      },
      {
        type: 'legal',
        confidence: 0.9,
        data: {
          articles: ['LUOS - Art. 89'],
          concepts: ['EIV']
        }
      }
    ];
    
    const response = await fetch(`${SUPABASE_URL}/functions/v1/agent-validator`, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${SUPABASE_ANON_KEY}`,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        agentResults: mockAgentResults,
        query: 'Qual a altura máxima no centro histórico?',
        context: { hasLocationReferences: true }
      })
    });

    console.log('Status da resposta validator:', response.status);
    
    if (!response.ok) {
      const errorText = await response.text();
      console.error('❌ Agent-validator falhou:', errorText);
      return { success: false, error: errorText };
    }

    const data = await response.json();
    
    console.log('✅ Agent-validator funcionando!');
    console.log('🎯 Tipo de resposta:', data.type);
    console.log('🔍 Validação aprovada:', data.data?.valid);
    console.log('📊 Checks executados:', data.metadata?.totalChecks);
    console.log('✅ Checks aprovados:', data.metadata?.passedChecks);
    console.log('⚠️ Issues críticos:', data.metadata?.criticalIssues);
    
    return { 
      success: true, 
      valid: data.data?.valid,
      checks: data.metadata?.totalChecks,
      passed: data.metadata?.passedChecks
    };
    
  } catch (error) {
    console.error('❌ Erro testando agent-validator:', error.message);
    return { success: false, error: error.message };
  }
}

async function testOrchestratorMaster() {
  console.log('\n🎭 Testando orchestrator-master...\n');
  
  try {
    const response = await fetch(`${SUPABASE_URL}/functions/v1/orchestrator-master`, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${SUPABASE_ANON_KEY}`,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        query: 'O que é EIV?',
        sessionId: `test-orchestrator-${Date.now()}`,
        model: 'gpt-3.5-turbo'
      })
    });

    console.log('Status da resposta orchestrator:', response.status);
    
    if (!response.ok) {
      const errorText = await response.text();
      console.error('❌ Orchestrator-master falhou:', errorText);
      return { success: false, error: errorText };
    }

    const data = await response.json();
    
    console.log('✅ Orchestrator-master funcionando!');
    console.log('📄 Resposta:', data.response?.substring(0, 150) + '...');
    console.log('🎯 Confiança:', data.confidence);
    console.log('🤖 Agentes usados:', data.metadata?.agents_used);
    console.log('🔧 Refinado:', data.metadata?.refined);
    
    return { 
      success: true, 
      confidence: data.confidence,
      agentsUsed: data.metadata?.agents_used?.length || 0,
      refined: data.metadata?.refined
    };
    
  } catch (error) {
    console.error('❌ Erro testando orchestrator-master:', error.message);
    return { success: false, error: error.message };
  }
}

// Execute all tests
async function runAllTests() {
  console.log('🚀 Iniciando testes da Fase 1...\n');
  
  const results = {
    sessionMemory: await testSessionMemory(),
    agentValidator: await testAgentValidator(),
    orchestratorMaster: await testOrchestratorMaster(),
    fullPipeline: await testAgenticRAGPipeline()
  };
  
  console.log('\n' + '=' .repeat(60));
  console.log('📊 RESUMO DOS TESTES FASE 1\n');
  
  const successCount = Object.values(results).filter(r => r.success).length;
  const totalTests = Object.keys(results).length;
  
  console.log(`✅ Testes aprovados: ${successCount}/${totalTests}`);
  console.log(`❌ Testes falharam: ${totalTests - successCount}/${totalTests}\n`);
  
  // Detailed results
  Object.entries(results).forEach(([test, result]) => {
    const status = result.success ? '✅' : '❌';
    console.log(`${status} ${test}: ${result.success ? 'PASSOU' : 'FALHOU'}`);
    if (!result.success) {
      console.log(`   Erro: ${result.error}`);
    }
  });
  
  console.log('\n' + '=' .repeat(60));
  
  if (successCount === totalTests) {
    console.log('🎉 FASE 1 CONCLUÍDA COM SUCESSO!');
    console.log('✅ Todos os bugs críticos foram corrigidos');
    console.log('🔄 Pipeline Agentic-RAG operacional');
    console.log('📝 Sistema de memória de sessão funcionando');
    console.log('🔍 Agent-validator corrigido');
    console.log('\n🚀 Pronto para Fase 2: População do Knowledge Graph');
  } else {
    console.log('⚠️ FASE 1 INCOMPLETA');
    console.log('❌ Alguns testes falharam - revisar correções');
  }
}

runAllTests().catch(console.error);