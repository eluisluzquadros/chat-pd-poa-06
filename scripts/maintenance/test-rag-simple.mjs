#!/usr/bin/env node

import { createClient } from '@supabase/supabase-js';

const supabaseUrl = 'https://ngrqwmvuhvjkeohesbxs.supabase.co';
const supabaseAnonKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Im5ncnF3bXZ1aHZqa2VvaGVzYnhzIiwicm9sZSI6ImFub24iLCJpYXQiOjE3MzEwNjEwMzEsImV4cCI6MjA0NjYzNzAzMX0.5bxfZu1203cHOxlUaOiX0fy70gyStsoU-0jEglcfL9w';

const supabase = createClient(supabaseUrl, supabaseAnonKey);

async function testQuery(query) {
  console.log(`\n🔍 Testing: "${query}"`);
  
  const startTime = Date.now();
  
  try {
    const { data, error } = await supabase.functions.invoke('agentic-rag-v2', {
      body: {
        message: query,
        query: query,
        userRole: 'user',
        sessionId: `test-${Date.now()}`,
        userId: 'test-user',
        model: 'gpt-3.5-turbo',
        bypassCache: true,
        options: {
          useAgenticRAG: true
        }
      }
    });

    const responseTime = Date.now() - startTime;

    if (error) {
      console.error(`❌ Error: ${error.message}`);
      return false;
    }

    if (!data || !data.response) {
      console.error(`❌ Empty response`);
      return false;
    }

    console.log(`✅ Success in ${responseTime}ms`);
    console.log(`📝 Response preview: ${data.response.substring(0, 200)}...`);
    return true;

  } catch (err) {
    console.error(`❌ Exception: ${err.message}`);
    return false;
  }
}

console.log('🚀 Testing RAG System');
console.log('='.repeat(50));

const queries = [
  "Qual a altura máxima no centro histórico?",
  "O que é outorga onerosa?",
  "Quais os usos permitidos na zona residencial?"
];

let passed = 0;
let failed = 0;

for (const query of queries) {
  const result = await testQuery(query);
  if (result) passed++;
  else failed++;
  
  // Small delay
  await new Promise(resolve => setTimeout(resolve, 1000));
}

console.log('\n' + '='.repeat(50));
console.log(`📊 Results: ${passed} passed, ${failed} failed`);
console.log(passed === queries.length ? '✅ ALL TESTS PASSED!' : '⚠️ SOME TESTS FAILED');