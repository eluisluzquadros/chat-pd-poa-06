import { createClient } from '@supabase/supabase-js';

const supabaseUrl = 'https://ngrqwmvuhvjkeohesbxs.supabase.co';
const supabaseAnonKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Im5ncnF3bXZ1aHZqa2VvaGVzYnhzIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTM2MDkwMTcsImV4cCI6MjA2OTE4NTAxN30.K3uyyzjyAQ17ohQGCUFx_RiMufblLyQzvxEZHakqKrg';

const supabase = createClient(supabaseUrl, supabaseAnonKey);

const testMessage = "qual é a altura máxima do bairro petrópolis?";

// Testar apenas modelos que funcionaram
const workingModels = [
  'openai/gpt-3.5-turbo',
  'openai/gpt-4o-mini',
  'openai/gpt-4o',
  'openai/gpt-4.1',
  'anthropic/claude-3-5-sonnet-20241022',
  'deepseek/deepseek-chat',
  'zhipuai/glm-4.5'
];

function analyzeResponse(response) {
  const hasTable = response.includes('|');
  const hasFooter = response.includes('Explore mais:');
  const hasZOT07 = response.includes('ZOT 07');
  const hasZOT083 = response.includes('ZOT 08.3');
  const has60m = response.includes('60m') || response.includes('60 m');
  const has90m = response.includes('90m') || response.includes('90 m');
  
  return {
    hasTable,
    hasFooter,
    hasZOT07,
    hasZOT083,
    has60m,
    has90m,
    length: response.length
  };
}

async function testConsistency() {
  console.log('🔍 Testing response consistency for:', testMessage);
  console.log('=' . repeat(80));

  const results = [];
  
  for (const model of workingModels) {
    console.log(`\n📝 Testing ${model}...`);
    
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
        console.error(`❌ ${model}: ${error.message}`);
        continue;
      }

      if (!data || !data.response) {
        console.error(`❌ ${model}: No response`);
        continue;
      }

      const analysis = analyzeResponse(data.response);
      results.push({
        model,
        ...analysis,
        response: data.response.substring(0, 300) + '...'
      });

      console.log(`✅ Success - ${data.response.length} chars`);
      console.log(`   Table: ${analysis.hasTable ? 'YES' : 'NO'}`);
      console.log(`   Footer: ${analysis.hasFooter ? 'YES' : 'NO'}`);
      console.log(`   ZOT 07 (60m): ${analysis.hasZOT07 && analysis.has60m ? 'YES' : 'NO'}`);
      console.log(`   ZOT 08.3 (90m): ${analysis.hasZOT083 && analysis.has90m ? 'YES' : 'NO'}`);
      
    } catch (err) {
      console.error(`❌ ${model}: ${err.message}`);
    }
    
    // Wait between requests
    await new Promise(resolve => setTimeout(resolve, 1500));
  }

  console.log('\n' + '=' . repeat(80));
  console.log('📊 CONSISTENCY ANALYSIS:');
  console.log('=' . repeat(80));
  
  // Analyze consistency
  const allHaveTable = results.every(r => r.hasTable);
  const allHaveFooter = results.every(r => r.hasFooter);
  const allHaveZOT07 = results.every(r => r.hasZOT07);
  const allHaveZOT083 = results.every(r => r.hasZOT083);
  const allHave60m = results.every(r => r.has60m);
  const allHave90m = results.every(r => r.has90m);
  
  console.log(`\n📋 Feature Consistency:`);
  console.log(`   Table format: ${allHaveTable ? '✅ CONSISTENT' : '❌ INCONSISTENT'}`);
  console.log(`   Footer template: ${allHaveFooter ? '✅ CONSISTENT' : '❌ INCONSISTENT'}`);
  console.log(`   ZOT 07 (60m): ${allHaveZOT07 && allHave60m ? '✅ CONSISTENT' : '❌ INCONSISTENT'}`);
  console.log(`   ZOT 08.3 (90m): ${allHaveZOT083 && allHave90m ? '✅ CONSISTENT' : '❌ INCONSISTENT'}`);
  
  console.log(`\n📏 Response Length Variation:`);
  const lengths = results.map(r => r.length);
  const avgLength = lengths.reduce((a, b) => a + b, 0) / lengths.length;
  const minLength = Math.min(...lengths);
  const maxLength = Math.max(...lengths);
  
  console.log(`   Average: ${Math.round(avgLength)} chars`);
  console.log(`   Min: ${minLength} chars`);
  console.log(`   Max: ${maxLength} chars`);
  console.log(`   Variation: ${Math.round((maxLength - minLength) / avgLength * 100)}%`);
}

testConsistency();