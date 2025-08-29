import { createClient } from '@supabase/supabase-js';

const supabaseUrl = 'https://ngrqwmvuhvjkeohesbxs.supabase.co';
const supabaseAnonKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Im5ncnF3bXZ1aHZqa2VvaGVzYnhzIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTM2MDkwMTcsImV4cCI6MjA2OTE4NTAxN30.K3uyyzjyAQ17ohQGCUFx_RiMufblLyQzvxEZHakqKrg';

const supabase = createClient(supabaseUrl, supabaseAnonKey);

const testMessage = "qual é a altura máxima do bairro petrópolis?";

const models = [
  'openai/gpt-3.5-turbo',
  'openai/gpt-4o-mini',
  'openai/gpt-4o',
  'openai/gpt-4.1',
  'anthropic/claude-4-opus',
  'anthropic/claude-4-sonnet',
  'anthropic/claude-3-5-sonnet-20241022',
  'google/gemini-1.5-flash',
  'google/gemini-2.0-flash',
  'deepseek/deepseek-chat',
  'zhipuai/glm-4.5'
];

async function testModel(model) {
  console.log(`\n🔍 Testing ${model}...`);
  
  try {
    const { data, error } = await supabase.functions.invoke('agentic-rag', {
      body: {
        message: testMessage,
        model: model,
        sessionId: `test-${Date.now()}`,
        bypassCache: true
      }
    });

    if (error) {
      console.error(`❌ ${model}: Error - ${error.message}`);
      return { model, success: false, error: error.message };
    }

    if (!data) {
      console.error(`❌ ${model}: No data returned`);
      return { model, success: false, error: 'No data returned' };
    }

    console.log(`✅ ${model}: Success`);
    console.log(`   Response length: ${data.response?.length || 0} chars`);
    console.log(`   Confidence: ${data.confidence || 0}`);
    console.log(`   First 200 chars: ${data.response?.substring(0, 200) || 'No response'}...`);
    
    return { 
      model, 
      success: true, 
      responseLength: data.response?.length || 0,
      confidence: data.confidence || 0,
      hasFooter: data.response?.includes('Explore mais:') || false
    };

  } catch (err) {
    console.error(`❌ ${model}: Exception - ${err.message}`);
    return { model, success: false, error: err.message };
  }
}

async function testAllModels() {
  console.log('🚀 Testing all models with the question:', testMessage);
  console.log('=' . repeat(80));

  const results = [];
  
  // Test models in sequence to avoid rate limiting
  for (const model of models) {
    const result = await testModel(model);
    results.push(result);
    // Wait 1 second between requests
    await new Promise(resolve => setTimeout(resolve, 1000));
  }

  console.log('\n' + '=' . repeat(80));
  console.log('📊 SUMMARY:');
  console.log('=' . repeat(80));
  
  const successful = results.filter(r => r.success);
  const failed = results.filter(r => !r.success);
  
  console.log(`\n✅ Successful: ${successful.length}/${models.length}`);
  successful.forEach(r => {
    console.log(`   - ${r.model}: ${r.responseLength} chars, confidence: ${r.confidence}, footer: ${r.hasFooter ? 'YES' : 'NO'}`);
  });
  
  console.log(`\n❌ Failed: ${failed.length}/${models.length}`);
  failed.forEach(r => {
    console.log(`   - ${r.model}: ${r.error}`);
  });
}

testAllModels();