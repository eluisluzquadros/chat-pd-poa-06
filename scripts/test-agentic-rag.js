import { createClient } from '@supabase/supabase-js';

const supabase = createClient(
  'https://ngrqwmvuhvjkeohesbxs.supabase.co',
  'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Im5ncnF3bXZ1aHZqa2VvaGVzYnhzIiwicm9sZSI6ImFub24iLCJpYXQiOjE3MzU5MjA2MTIsImV4cCI6MjA1MTQ5NjYxMn0.9lz0zqLRUsLei1tuF9qL45RU9Cjue-6Qs1BvKQ3VQME'
);

async function testAgenticRAG() {
  console.log('🧪 Testing agentic-rag function directly\n');

  const testQuery = 'O que o plano prevê sobre a política ambiental do município?';
  
  console.log('📝 Test query:', testQuery);
  console.log('🔄 Calling agentic-rag...\n');

  try {
    const { data, error } = await supabase.functions.invoke('agentic-rag', {
      body: {
        message: testQuery,
        userRole: 'user',
        sessionId: 'test-session',
        userId: 'test-user',
        model: 'openai/gpt-3.5-turbo'
      }
    });

    if (error) {
      console.error('❌ Error from agentic-rag:', error);
      console.log('Error details:', JSON.stringify(error, null, 2));
    } else {
      console.log('✅ Response received:');
      console.log('Response:', data.response?.substring(0, 200) + '...');
      console.log('Confidence:', data.confidence);
      console.log('Execution time:', data.executionTime + 'ms');
      
      if (data.error) {
        console.log('⚠️ Function returned error:', data.error);
      }
      
      if (data.agentTrace) {
        console.log('\n📊 Agent trace:');
        data.agentTrace.forEach(trace => {
          console.log(`  - ${trace.step}${trace.error ? `: ${trace.error}` : ''}`);
        });
      }
    }
  } catch (error) {
    console.error('❌ Unexpected error:', error);
  }

  console.log('\n🔍 Testing with different model...\n');

  try {
    const { data, error } = await supabase.functions.invoke('agentic-rag', {
      body: {
        message: testQuery,
        userRole: 'user',
        sessionId: 'test-session-2',
        userId: 'test-user',
        model: 'gpt-4.1'  // Test with short model name
      }
    });

    if (error) {
      console.error('❌ Error with gpt-4.1:', error);
    } else {
      console.log('✅ Response with gpt-4.1 received');
      if (data.error) {
        console.log('⚠️ Function returned error:', data.error);
      }
    }
  } catch (error) {
    console.error('❌ Unexpected error with gpt-4.1:', error);
  }
}

testAgenticRAG().catch(console.error);