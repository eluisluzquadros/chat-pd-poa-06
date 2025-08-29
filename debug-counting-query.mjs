import { createClient } from '@supabase/supabase-js';

const supabaseUrl = 'https://ngrqwmvuhvjkeohesbxs.supabase.co';
const anonKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Im5ncnF3bXZ1aHZqa2VvaGVzYnhzIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTM2MDkwMTcsImV4cCI6MjA2OTE4NTAxN30.K3uyyzjyAQ17ohQGCUFx_RiMufblLyQzvxEZHakqKrg';

const supabase = createClient(supabaseUrl, anonKey);

async function debugCountingQuery() {
  console.log('🔍 DEBUG: Query de Contagem - Acima da Cota de Inundação 2024\n');

  const testQuery = 'Quantos bairros estão classificados como "Acima da Cota de Inundação 2024"?';
  
  try {
    // Step 1: Testar agentic-rag completo
    console.log('📞 Testando agentic-rag completo...');
    const { data: agenticData, error: agenticError } = await supabase.functions.invoke('agentic-rag', {
      body: {
        message: testQuery,
        userRole: 'user',
        sessionId: 'debug-counting-' + Date.now(),
        bypassCache: true
      }
    });

    if (agenticError) {
      console.error('❌ Erro no agentic-rag:', agenticError);
      return;
    }

    console.log('\n🎯 RESULTADO AGENTIC-RAG:');
    console.log('Response:', agenticData.response);
    
    // Analisar trace do agente
    if (agenticData.agentTrace) {
      console.log('\n📋 AGENT TRACE:');
      agenticData.agentTrace.forEach((step, idx) => {
        console.log(`${idx + 1}. ${step.step} (${new Date(step.timestamp).toISOString()})`);
        
        if (step.step === 'query_analysis' && step.result) {
          console.log('   📊 Analysis:', JSON.stringify(step.result, null, 2));
        }
        
        if (step.step === 'sql_generation' && step.result?.executionResults) {
          console.log('   🔍 SQL Results:');
          step.result.executionResults.forEach((sqlResult, sqlIdx) => {
            console.log(`     Query ${sqlIdx + 1}:`, sqlResult.query);
            console.log(`     Data count:`, sqlResult.data?.length || 0);
            if (sqlResult.data && sqlResult.data.length > 0) {
              console.log(`     First result:`, JSON.stringify(sqlResult.data[0], null, 2));
            }
          });
        }
        
        if (step.step === 'response_synthesis' && step.result) {
          console.log('   📝 Synthesis result:', JSON.stringify(step.result, null, 2));
        }
      });
    }

    // Step 2: Verificar se response-synthesizer recebeu dados
    console.log('\n🧪 VERIFICANDO DADOS NO RESPONSE-SYNTHESIZER...');
    
  } catch (error) {
    console.error('❌ Erro no debug:', error);
  }
}

debugCountingQuery().catch(console.error);