#!/usr/bin/env node

import { createClient } from '@supabase/supabase-js';

const supabaseUrl = 'https://ngrqwmvuhvjkeohesbxs.supabase.co';
const anonKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Im5ncnF3bXZ1aHZqa2VvaGVzYnhzIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTM2MDkwMTcsImV4cCI6MjA2OTE4NTAxN30.K3uyyzjyAQ17ohQGCUFx_RiMufblLyQzvxEZHakqKrg';

const supabase = createClient(supabaseUrl, anonKey);

console.log('🔍 TESTE CRÍTICO: 346 Contribuições\n');

async function testCriticalQuery() {
  const testQuery = "Quantas contribuições foram recebidas na audiência pública final?";
  
  console.log(`📝 Query: "${testQuery}"`);
  console.log('=' * 60);
  
  try {
    // Primeiro: verificar se os dados existem na knowledgebase
    console.log('\n🔍 FASE 1: Verificando dados na knowledgebase...');
    
    const { data: kbData, error: kbError } = await supabase
      .rpc('search_knowledgebase_by_content', {
        search_text: 'contribuições audiência pública',
        match_count: 5
      });
    
    if (kbError) {
      console.error('❌ Erro ao buscar na knowledgebase:', kbError);
      return;
    }
    
    console.log(`✅ Encontrados ${kbData?.length || 0} resultados na knowledgebase`);
    if (kbData && kbData.length > 0) {
      console.log('📋 Primeiro resultado:');
      console.log('- Tipo:', kbData[0].tipo_documento);
      console.log('- Título:', kbData[0].titulo);
      console.log('- Resposta:', kbData[0].resposta?.substring(0, 200));
      
      // Verificar se algum contém "346"
      const has346 = kbData.some(item => 
        item.resposta?.includes('346') || 
        item.texto?.includes('346') ||
        item.pergunta?.includes('346')
      );
      console.log(`🎯 Contém "346": ${has346 ? 'SIM' : 'NÃO'}`);
    }
    
    // Segundo: testar agentic-rag diretamente
    console.log('\n🔍 FASE 2: Testando agentic-rag...');
    
    const startTime = Date.now();
    const { data: ragData, error: ragError } = await supabase.functions.invoke('agentic-rag', {
      body: { 
        query: testQuery,
        sessionId: `test-critical-${Date.now()}`,
        bypassCache: true
      }
    });
    
    const elapsed = Date.now() - startTime;
    
    if (ragError) {
      console.error('❌ Erro no agentic-rag:', ragError);
      return;
    }
    
    console.log(`⏱️ Tempo de execução: ${elapsed}ms`);
    console.log('📊 Status da resposta:', ragData ? 'OK' : 'ERRO');
    
    if (ragData) {
      console.log('\n📝 RESPOSTA COMPLETA:');
      console.log(ragData.response);
      
      console.log('\n📊 METADADOS:');
      console.log('- Confidence:', ragData.confidence);
      console.log('- Execution Time:', ragData.executionTime, 'ms');
      console.log('- Sources:', ragData.sources);
      
      // Verificar se contém "346"
      const contains346 = ragData.response?.includes('346');
      console.log(`🎯 Resposta contém "346": ${contains346 ? 'SIM ✅' : 'NÃO ❌'}`);
      
      if (ragData.agentTrace) {
        console.log('\n📋 Agent Trace:');
        ragData.agentTrace.forEach((step, i) => {
          console.log(`  ${i + 1}. ${step.step} (${step.confidence || 'N/A'})`);
        });
      }
    }
    
    console.log('\n' + '='.repeat(60));
    console.log('🏁 TESTE CONCLUÍDO');
    
  } catch (error) {
    console.error('❌ Erro fatal:', error);
  }
}

testCriticalQuery().catch(console.error);