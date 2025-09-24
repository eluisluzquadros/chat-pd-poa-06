import { createClient } from '@supabase/supabase-js';

const supabaseUrl = 'https://ngrqwmvuhvjkeohesbxs.supabase.co';
const anonKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Im5ncnF3bXZ1aHZqa2VvaGVzYnhzIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTM2MDkwMTcsImV4cCI6MjA2OTE4NTAxN30.K3uyyzjyAQ17ohQGCUFx_RiMufblLyQzvxEZHakqKrg';

const supabase = createClient(supabaseUrl, anonKey);

async function debugZOT8() {
  console.log('=== Debug ZOT 8 Issue ===\n');

  // Call the full RAG pipeline
  const { data, error } = await supabase.functions.invoke('agentic-rag', {
    body: {
      message: 'zot 8 pertence a que bairro?',
      userRole: 'user',
      sessionId: 'debug-zot8-' + Date.now(),
      bypassCache: true
    }
  });

  if (error) {
    console.log('Error:', error);
    return;
  }

  // Check the agent trace to see what SQL was executed
  console.log('Agent Trace:');
  data.agentTrace?.forEach(step => {
    if (step.step === 'sql_generation' && step.result?.executionResults) {
      console.log('\nSQL Results:');
      step.result.executionResults.forEach(result => {
        console.log('Query:', result.query);
        console.log('Data count:', result.data?.length);
        if (result.data && result.data.length > 0) {
          console.log('First 5:', result.data.slice(0, 5));
          console.log('Total unique bairros:', result.data.length);
        }
      });
    }
  });

  // Check what was synthesized
  console.log('\n\nFinal Response:');
  console.log(data.response);
}

debugZOT8().catch(console.error);