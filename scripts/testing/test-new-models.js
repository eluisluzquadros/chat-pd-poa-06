import { createClient } from '@supabase/supabase-js';

const supabaseUrl = 'https://ngrqwmvuhvjkeohesbxs.supabase.co';
const supabaseAnonKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Im5ncnF3bXZ1aHZqa2VvaGVzYnhzIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTM2MDkwMTcsImV4cCI6MjA2OTE4NTAxN30.K3uyyzjyAQ17ohQGCUFx_RiMufblLyQzvxEZHakqKrg';

const supabase = createClient(supabaseUrl, supabaseAnonKey);

// Modelos atualizados para testar
const newModels = [
  // Anthropic - novos modelos
  { provider: 'anthropic', model: 'claude-opus-4.1', name: 'Claude Opus 4.1 (Mais recente)' },
  { provider: 'anthropic', model: 'claude-4-opus', name: 'Claude 4 Opus (nome compatível)' },
  { provider: 'anthropic', model: 'claude-4-sonnet', name: 'Claude 4 Sonnet' },
  
  // OpenAI - verificar mapeamentos
  { provider: 'openai', model: 'gpt-4o', name: 'GPT-4o' },
  { provider: 'openai', model: 'gpt-4.1', name: 'GPT-4.1 (Turbo)' },
  
  // Google - novo Gemini 2.0
  { provider: 'google', model: 'gemini-2.0-flash', name: 'Gemini 2.0 Flash' },
  
  // ZhipuAI - GLM-4 Plus
  { provider: 'zhipuai', model: 'glm-4.5', name: 'GLM-4 Plus' }
];

async function testModel(modelInfo) {
  const { provider, model, name } = modelInfo;
  console.log(`\n🔍 Testing ${name} (${provider}/${model})...`);
  
  try {
    const { data, error } = await supabase.functions.invoke('agentic-rag', {
      body: {
        message: "Olá, você pode me dizer qual modelo você é?",
        model: `${provider}/${model}`,
        sessionId: `test-${Date.now()}`,
        bypassCache: true
      }
    });

    if (error) {
      console.error(`❌ Error: ${error.message}`);
      return { ...modelInfo, success: false, error: error.message };
    }

    if (!data || !data.response) {
      console.error(`❌ No response received`);
      return { ...modelInfo, success: false, error: 'No response' };
    }

    console.log(`✅ Success!`);
    console.log(`   Response: ${data.response.substring(0, 150)}...`);
    console.log(`   Model used: ${data.model || 'not specified'}`);
    
    return { 
      ...modelInfo, 
      success: true, 
      responseLength: data.response.length,
      modelUsed: data.model
    };

  } catch (err) {
    console.error(`❌ Exception: ${err.message}`);
    return { ...modelInfo, success: false, error: err.message };
  }
}

async function testAllNewModels() {
  console.log('🚀 Testing new LLM models configuration');
  console.log('=' . repeat(80));

  const results = [];
  
  for (const model of newModels) {
    const result = await testModel(model);
    results.push(result);
    // Wait between requests
    await new Promise(resolve => setTimeout(resolve, 2000));
  }

  console.log('\n' + '=' . repeat(80));
  console.log('📊 TEST SUMMARY:');
  console.log('=' . repeat(80));
  
  const successful = results.filter(r => r.success);
  const failed = results.filter(r => !r.success);
  
  console.log(`\n✅ Working models: ${successful.length}/${newModels.length}`);
  successful.forEach(r => {
    console.log(`   - ${r.name}: OK (${r.responseLength} chars)`);
  });
  
  if (failed.length > 0) {
    console.log(`\n❌ Failed models: ${failed.length}/${newModels.length}`);
    failed.forEach(r => {
      console.log(`   - ${r.name}: ${r.error}`);
    });
  }
  
  console.log('\n💡 Note: If Anthropic models fail, check if the API key supports the new Claude 4 models.');
}

testAllNewModels();