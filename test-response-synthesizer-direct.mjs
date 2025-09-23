#!/usr/bin/env node

import { createClient } from '@supabase/supabase-js';

const supabaseUrl = 'https://ngrqwmvuhvjkeohesbxs.supabase.co';
const anonKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Im5ncnF3bXZ1aHZqa2VvaGVzYnhzIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTM2MDkwMTcsImV4cCI6MjA2OTE4NTAxN30.K3uyyzjyAQ17ohQGCUFx_RiMufblLyQzvxEZHakqKrg';

const supabase = createClient(supabaseUrl, anonKey);

console.log('🔍 TESTE DIRETO: Response Synthesizer\n');

async function testResponseSynthesizer() {
  console.log('📝 Testando response-synthesizer com dados mockados...');
  
  try {
    // Simular dados que deveriam vir do agentic-rag
    const mockAgentResults = [
      {
        agent: 'knowledgebase_search',
        data: {
          knowledgebase_data: [
            {
              id: 'test-1',
              tipo_documento: 'PDUS',
              titulo: 'Audiência Pública Final',
              pergunta: 'Quantas contribuições foram recebidas na audiência pública final?',
              resposta: 'Foram recebidas 346 contribuições durante a audiência pública final do PDUS.',
              texto: 'Durante o processo de participação social, a audiência pública final registrou o recebimento de 346 contribuições da sociedade civil.',
              relevance_score: 0.95
            }
          ]
        },
        confidence: 0.9
      }
    ];

    const { data, error } = await supabase.functions.invoke('response-synthesizer', {
      body: {
        originalQuery: 'Quantas contribuições foram recebidas na audiência pública final?',
        agentResults: mockAgentResults
      }
    });

    if (error) {
      console.error('❌ Erro no response-synthesizer:', error);
      return;
    }

    console.log('✅ Response-synthesizer funcionou!');
    console.log('\n📝 RESPOSTA:');
    console.log(data.response);
    
    console.log('\n📊 METADADOS:');
    console.log('- Confidence:', data.confidence);
    console.log('- Sources:', data.sources);
    
    // Verificar se contém "346"
    const contains346 = data.response?.includes('346');
    console.log(`🎯 Resposta contém "346": ${contains346 ? 'SIM ✅' : 'NÃO ❌'}`);
    
  } catch (error) {
    console.error('❌ Erro fatal:', error);
  }
}

testResponseSynthesizer().catch(console.error);