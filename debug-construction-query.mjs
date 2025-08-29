import { createClient } from '@supabase/supabase-js';

const supabaseUrl = 'https://ngrqwmvuhvjkeohesbxs.supabase.co';
const anonKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Im5ncnF3bXZ1aHZqa2VvaGVzYnhzIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTM2MDkwMTcsImV4cCI6MjA2OTE4NTAxN30.K3uyyzjyAQ17ohQGCUFx_RiMufblLyQzvxEZHakqKrg';

const supabase = createClient(supabaseUrl, anonKey);

async function debugConstruction() {
  console.log('=== DEBUG: Pipeline de Construção ===\n');

  // Test simples
  const { data, error } = await supabase.functions.invoke('agentic-rag', {
    body: {
      message: 'o que pode ser construído no bairro petrópolis?',
      userRole: 'user', 
      sessionId: 'debug-construction',
      bypassCache: true
    }
  });

  if (error) {
    console.log('Erro:', error);
    return;
  }

  console.log('=== AGENT TRACE ===');
  data.agentTrace?.forEach(step => {
    console.log(`\n${step.step}:`);
    
    if (step.step === 'query_analysis' && step.result) {
      console.log('- Intent:', step.result.intent);
      console.log('- Is Construction Query:', step.result.isConstructionQuery);
      console.log('- Strategy:', step.result.strategy);
      console.log('- Entities:', step.result.entities);
    }
    
    if (step.step === 'sql_generation' && step.result?.executionResults) {
      console.log('- Queries executadas:', step.result.executionResults.length);
      step.result.executionResults.forEach((result, idx) => {
        console.log(`\nQuery ${idx + 1}:`, result.query?.substring(0, 100) + '...');
        if (result.data) {
          console.log('Dados retornados:', result.data.length, 'linhas');
          if (result.data[0]) {
            console.log('Exemplo:', JSON.stringify(result.data[0], null, 2));
          }
        } else if (result.error) {
          console.log('ERRO:', result.error);
        }
      });
    }
    
    if (step.step === 'response_synthesis' && step.result) {
      console.log('- Confidence:', step.result.confidence);
      console.log('- Sources:', step.result.sources);
    }
  });

  console.log('\n\n=== RESPOSTA FINAL ===');
  console.log(data.response?.substring(0, 1000));
}

debugConstruction().catch(console.error);