#!/usr/bin/env node

import { createClient } from '@supabase/supabase-js';

const supabaseUrl = 'https://ngrqwmvuhvjkeohesbxs.supabase.co';
const anonKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Im5ncnF3bXZ1aHZqa2VvaGVzYnhzIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTM2MDkwMTcsImV4cCI6MjA2OTE4NTAxN30.K3uyyzjyAQ17ohQGCUFx_RiMufblLyQzvxEZHakqKrg';

const supabase = createClient(supabaseUrl, anonKey);

console.log('🏥 VALIDAÇÃO DE SAÚDE DO SISTEMA\n');

async function validateSystemHealth() {
  let healthScore = 0;
  let totalTests = 0;
  
  // TESTE 1: Conectividade com Supabase
  totalTests++;
  console.log('📡 Teste 1: Conectividade Supabase...');
  try {
    const { data, error } = await supabase.from('knowledgebase').select('id').limit(1);
    if (!error && data) {
      console.log('✅ Conectividade OK');
      healthScore++;
    } else {
      console.log('❌ Erro de conectividade:', error);
    }
  } catch (error) {
    console.log('❌ Erro fatal de conectividade:', error.message);
  }
  
  // TESTE 2: Dados na knowledgebase
  totalTests++;
  console.log('\n📚 Teste 2: Integridade da knowledgebase...');
  try {
    const { data, error } = await supabase
      .from('knowledgebase')
      .select('id')
      .limit(10);
    
    if (!error && data && data.length > 0) {
      console.log(`✅ Knowledgebase contém ${data.length} registros (amostra)`);
      healthScore++;
    } else {
      console.log('❌ Knowledgebase vazia ou erro:', error);
    }
  } catch (error) {
    console.log('❌ Erro ao acessar knowledgebase:', error.message);
  }
  
  // TESTE 3: Dados específicos sobre 346 contribuições
  totalTests++;
  console.log('\n🎯 Teste 3: Dados sobre 346 contribuições...');
  try {
    const { data, error } = await supabase
      .from('knowledgebase')
      .select('*')
      .ilike('resposta', '%346%')
      .limit(1);
    
    if (!error && data && data.length > 0) {
      console.log('✅ Dados sobre 346 contribuições encontrados');
      console.log(`   Pergunta: ${data[0].pergunta?.substring(0, 60)}...`);
      healthScore++;
    } else {
      console.log('❌ Dados sobre 346 contribuições não encontrados');
    }
  } catch (error) {
    console.log('❌ Erro ao buscar dados 346:', error.message);
  }
  
  // TESTE 4: Edge function agentic-rag
  totalTests++;
  console.log('\n🤖 Teste 4: Edge function agentic-rag...');
  try {
    const { data, error } = await supabase.functions.invoke('agentic-rag', {
      body: {
        query: 'teste de conectividade',
        sessionId: 'health-check'
      }
    });
    
    if (!error && data) {
      console.log('✅ Agentic-rag responde');
      if (data.response) {
        console.log(`   Resposta: ${data.response.substring(0, 60)}...`);
        healthScore++;
      } else {
        console.log('⚠️ Agentic-rag retorna sem resposta válida');
      }
    } else {
      console.log('❌ Erro no agentic-rag:', error);
    }
  } catch (error) {
    console.log('❌ Erro fatal no agentic-rag:', error.message);
  }
  
  // TESTE 5: Edge function response-synthesizer
  totalTests++;
  console.log('\n🔧 Teste 5: Edge function response-synthesizer...');
  try {
    const mockData = [{
      agent: 'test',
      data: {
        knowledgebase_data: [{
          pergunta: 'Teste',
          resposta: 'Resposta de teste'
        }]
      }
    }];
    
    const { data, error } = await supabase.functions.invoke('response-synthesizer', {
      body: {
        originalQuery: 'teste',
        agentResults: mockData
      }
    });
    
    if (!error && data && data.response) {
      console.log('✅ Response-synthesizer funciona');
      console.log(`   Resposta: ${data.response.substring(0, 60)}...`);
      healthScore++;
    } else {
      console.log('❌ Erro no response-synthesizer:', error);
    }
  } catch (error) {
    console.log('❌ Erro fatal no response-synthesizer:', error.message);
  }
  
  // TESTE 6: Pergunta crítica completa
  totalTests++;
  console.log('\n🎯 Teste 6: Pergunta crítica completa (346 contribuições)...');
  try {
    const { data, error } = await supabase.functions.invoke('agentic-rag', {
      body: {
        query: 'Quantas contribuições foram recebidas na audiência pública final?',
        sessionId: 'critical-test',
        bypassCache: true
      }
    });
    
    if (!error && data && data.response) {
      const contains346 = data.response.includes('346');
      if (contains346) {
        console.log('✅ SUCESSO CRÍTICO: Pergunta sobre 346 contribuições funciona!');
        healthScore++;
      } else {
        console.log('❌ FALHA CRÍTICA: Não retorna informação sobre 346 contribuições');
        console.log(`   Resposta: ${data.response.substring(0, 200)}...`);
      }
    } else {
      console.log('❌ FALHA CRÍTICA: Erro na pergunta principal:', error);
    }
  } catch (error) {
    console.log('❌ FALHA CRÍTICA: Erro fatal na pergunta principal:', error.message);
  }
  
  // RESULTADO FINAL
  console.log('\n' + '='.repeat(60));
  console.log('📊 RESULTADO DA VALIDAÇÃO DE SAÚDE');
  console.log('='.repeat(60));
  console.log(`🏥 Score: ${healthScore}/${totalTests} (${Math.round(healthScore/totalTests*100)}%)`);
  
  if (healthScore === totalTests) {
    console.log('✅ SISTEMA 100% SAUDÁVEL');
  } else if (healthScore >= totalTests * 0.8) {
    console.log('⚠️ SISTEMA PARCIALMENTE SAUDÁVEL');
  } else {
    console.log('❌ SISTEMA COM PROBLEMAS GRAVES');
  }
  
  console.log('\n🎯 Status específico para 346 contribuições:');
  console.log(healthScore >= 5 ? '✅ FUNCIONANDO' : '❌ COM PROBLEMAS');
  
  console.log('\n📋 Próximos passos recomendados:');
  if (healthScore < totalTests) {
    console.log('1. Verificar logs das edge functions');
    console.log('2. Verificar conectividade de rede');
    console.log('3. Verificar configurações de ambiente');
  } else {
    console.log('✅ Sistema funcionando corretamente!');
  }
}

validateSystemHealth().catch(console.error);