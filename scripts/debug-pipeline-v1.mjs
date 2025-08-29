#!/usr/bin/env node

import { createClient } from '@supabase/supabase-js';

const SUPABASE_URL = 'https://ngrqwmvuhvjkeohesbxs.supabase.co';
const ANON_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Im5ncnF3bXZ1aHZqa2VvaGVzYnhzIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTM2MDkwMTcsImV4cCI6MjA2OTE4NTAxN30.K3uyyzjyAQ17ohQGCUFx_RiMufblLyQzvxEZHakqKrg';

const supabase = createClient(SUPABASE_URL, ANON_KEY);

console.log('🔍 DEBUG COMPLETO PIPELINE V1\n');

async function debugPipelineV1() {
  const testQuery = 'Moro no bairro sarandi. qual o risco da minha casa alagar?';
  
  console.log('=== ETAPA 1: TESTE DIRETO AGENTIC-RAG V1 ===');
  
  try {
    const { data: ragData, error: ragError } = await supabase.functions.invoke('agentic-rag', {
      body: {
        message: testQuery,
        userRole: 'user',
        sessionId: `debug-${Date.now()}`,
        bypassCache: true
      }
    });

    if (ragError) {
      console.log('❌ Erro no agentic-rag:', ragError);
      return;
    }

    console.log('✅ agentic-rag v1 respondeu');
    console.log('📊 Confidence:', ragData.confidence);
    console.log('📝 Response (primeiros 200 chars):', ragData.response?.substring(0, 200));
    
    if (ragData.agentTrace) {
      console.log('\n=== AGENT TRACE ===');
      ragData.agentTrace.forEach((agent, i) => {
        console.log(`🤖 Agent ${i}: ${agent.type}`);
        console.log(`   - Confidence: ${agent.confidence}`);
        console.log(`   - Has data: ${agent.hasRegimeData || agent.hasRiskData || agent.hasZotData || 'none'}`);
        
        if (agent.regimeData?.length > 0) {
          console.log(`   - Regime records: ${agent.regimeData.length}`);
        }
        if (agent.riskData?.length > 0) {
          console.log(`   - Risk records: ${agent.riskData.length}`);
        }
      });
    }

    console.log('\n=== ETAPA 2: VERIFICAR DADOS SQL DIRETAMENTE ===');
    
    // Testar dados de risco para Sarandi
    const { data: riskData, error: riskError } = await supabase
      .from('neighborhood_risk_analysis')
      .select('*')
      .ilike('neighborhood', '%sarandi%');
    
    if (riskError) {
      console.log('❌ Erro ao buscar dados de risco:', riskError);
    } else {
      console.log(`✅ Encontrados ${riskData?.length || 0} registros de risco para Sarandi`);
      if (riskData?.length > 0) {
        console.log('📊 Primeiro registro:', {
          neighborhood: riskData[0].neighborhood,
          flood_risk_level: riskData[0].flood_risk_level,
          risk_description: riskData[0].risk_description?.substring(0, 100)
        });
      }
    }

    console.log('\n=== ETAPA 3: TESTE RESPONSE-SYNTHESIZER ===');
    
    // Testar response-synthesizer com dados sintéticos
    const mockAgentData = [
      {
        type: 'validator',
        confidence: 0.9,
        hasRegimeData: false,
        hasRiskData: false,
        hasZotData: false,
        hasLegalData: false
      }
    ];

    if (riskData?.length > 0) {
      mockAgentData.push({
        type: 'geographic',
        confidence: 0.9,
        hasRiskData: true,
        riskData: riskData.slice(0, 3), // Primeiros 3 registros
        hasRegimeData: false,
        hasZotData: false,
        hasLegalData: false
      });
    }

    const { data: synthData, error: synthError } = await supabase.functions.invoke('response-synthesizer', {
      body: {
        query: testQuery,
        agents: mockAgentData
      }
    });

    if (synthError) {
      console.log('❌ Erro no response-synthesizer:', synthError);
    } else {
      console.log('✅ response-synthesizer funcionou');
      console.log('📝 Response:', synthData.response?.substring(0, 300));
    }

  } catch (error) {
    console.error('❌ Erro geral:', error.message);
  }
}

debugPipelineV1().catch(console.error);