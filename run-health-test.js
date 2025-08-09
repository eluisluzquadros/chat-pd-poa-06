#!/usr/bin/env node

import fetch from 'node-fetch';

console.log('🔍 Testando agentic-rag diretamente...\n');

const supabaseUrl = 'https://ngrqwmvuhvjkeohesbxs.supabase.co';
const testQuery = 'Quantos bairros tem Porto Alegre?';

async function testRAG() {
  try {
    console.log('📡 Testando query:', testQuery);
    
    const response = await fetch(`${supabaseUrl}/functions/v1/agentic-rag`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Im5ncnF3bXZ1aHZqa2VvaGVzYnhzIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTM2MDkwMTcsImV4cCI6MjA2OTE4NTAxN30.K3uyyzjyAQ17ohQGCUFx_RiMufblLyQzvxEZHakqKrg`,
      },
      body: JSON.stringify({
        query: testQuery,
        sessionId: `test-${Date.now()}`,
        userRole: 'citizen'
      }),
    });

    console.log(`📊 Status: ${response.status}`);
    
    if (!response.ok) {
      const errorText = await response.text();
      console.error('❌ Erro:', errorText);
      return;
    }

    const data = await response.json();
    
    console.log('✅ Resposta:', data.response?.substring(0, 200) + '...');
    console.log('🎯 Confidence:', data.confidence);
    console.log('⏱️ Time:', data.executionTime + 'ms');
    
    // Testar palavras-chave esperadas com sistema melhorado
    const expectedKeywords = ['94', 'bairros'];
    const response_lower = data.response?.toLowerCase() || '';
    
    const matches = expectedKeywords.filter(keyword => {
      const keywordLower = keyword.toLowerCase();
      
      // Direct match
      if (response_lower.includes(keywordLower)) return true;
      
      // Number variations
      if (keyword === '94') {
        return ['noventa e quatro', 'noventa e 4', '94'].some(variant => 
          response_lower.includes(variant)
        );
      }
      
      return false;
    });
    
    console.log(`📈 Keywords encontradas: ${matches.length}/${expectedKeywords.length}`);
    console.log('🔍 Matches:', matches);
    console.log('📊 Accuracy:', matches.length / expectedKeywords.length);
    
    if (data.agentTrace) {
      console.log('\n📋 Trace:');
      data.agentTrace.forEach((step, i) => {
        console.log(`  ${i + 1}. ${step.step} (${step.executionTime || 0}ms)`);
      });
    }

  } catch (error) {
    console.error('❌ Erro:', error.message);
  }
}

testRAG();