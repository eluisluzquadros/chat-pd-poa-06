#!/usr/bin/env node

import { createClient } from '@supabase/supabase-js';

const supabaseUrl = 'https://ngrqwmvuhvjkeohesbxs.supabase.co';
const anonKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Im5ncnF3bXZ1aHZqa2VvaGVzYnhzIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTM2MDkwMTcsImV4cCI6MjA2OTE4NTAxN30.K3uyyzjyAQ17ohQGCUFx_RiMufblLyQzvxEZHakqKrg';

const supabase = createClient(supabaseUrl, anonKey);

console.log('🚀 TESTE PIPELINE COMPLETO: Agentic-RAG + Response-Synthesizer\n');

async function testCompletePipeline() {
  const testCases = [
    {
      name: "Pergunta Crítica - 346 Contribuições",
      query: "Quantas contribuições foram recebidas na audiência pública final?"
    },
    {
      name: "Pergunta de Verificação - Processo Participativo",
      query: "Como foi a participação na audiência pública do plano diretor?"
    },
    {
      name: "Pergunta Geral - PDUS",
      query: "O que é o PDUS?"
    }
  ];

  for (const testCase of testCases) {
    console.log(`\n${'='.repeat(60)}`);
    console.log(`📝 TESTE: ${testCase.name}`);
    console.log(`🔍 Query: "${testCase.query}"`);
    console.log(`${'='.repeat(60)}`);
    
    const startTime = Date.now();
    
    try {
      // Chamar agentic-rag
      const { data, error } = await supabase.functions.invoke('agentic-rag', {
        body: {
          query: testCase.query,
          sessionId: `test-pipeline-${Date.now()}`,
          bypassCache: true
        }
      });
      
      const elapsed = Date.now() - startTime;
      
      if (error) {
        console.error('❌ ERRO no agentic-rag:', error);
        continue;
      }
      
      console.log(`⏱️ Tempo de execução: ${elapsed}ms`);
      
      if (data && data.response) {
        console.log('\n✅ RESPOSTA RECEBIDA:');
        console.log(data.response);
        
        console.log('\n📊 METADADOS:');
        console.log('- Confidence:', data.confidence);
        console.log('- Execution Time:', data.executionTime, 'ms');
        console.log('- Sources:', JSON.stringify(data.sources, null, 2));
        
        // Verificar se contém informações específicas
        const response = data.response.toLowerCase();
        
        if (testCase.name.includes('346')) {
          const contains346 = response.includes('346');
          console.log(`🎯 Contém "346": ${contains346 ? '✅ SIM' : '❌ NÃO'}`);
          
          if (contains346) {
            console.log('🏆 SUCESSO: Resposta correta para pergunta crítica!');
          } else {
            console.log('⚠️ FALHA: Não retornou informação sobre 346 contribuições');
          }
        }
        
        if (data.agentTrace) {
          console.log('\n📋 Agent Trace:');
          data.agentTrace.forEach((step, i) => {
            console.log(`  ${i + 1}. ${step.step} (conf: ${step.confidence || 'N/A'})`);
          });
        }
        
      } else {
        console.error('❌ ERRO: Resposta vazia ou inválida');
        console.log('Data recebida:', JSON.stringify(data, null, 2));
      }
      
    } catch (error) {
      console.error('❌ ERRO FATAL:', error);
    }
    
    // Pausa entre testes
    await new Promise(resolve => setTimeout(resolve, 1000));
  }
  
  console.log('\n' + '='.repeat(60));
  console.log('🏁 TESTES PIPELINE COMPLETOS');
  console.log('='.repeat(60));
}

testCompletePipeline().catch(console.error);